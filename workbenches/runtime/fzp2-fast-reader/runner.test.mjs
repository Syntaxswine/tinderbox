import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {encodeZeroLiteral,PAYLOAD_LIMITS} from '../../../assets/art/fire-realism/field-payload-v2/codec.js';
import {ORIGINAL_PINS,inside,readExact,sha256,parseMetadata,packetWorkload,validateOriginalInventory} from './dataset.mjs';
import {SOURCE_FILES,validateSpec,sparsitySummary,main} from './run.mjs';

const hash='a'.repeat(64),copy=value=>structuredClone(value);
function spec(){return {version:1,sourceCommit:'b'.repeat(40),projectRoot:os.tmpdir(),outputDirectory:'artifacts/qa/new-probe',dossierPath:'artifacts/qa/dossier.json',stopPath:'artifacts/qa/STOP',expectedSources:Object.fromEntries(SOURCE_FILES.map(name=>[name,{bytes:1024,sha256:hash}]))};}
function syntheticInventory(){
 const manifest={runtimeFiles:Array.from({length:59},()=>({bytes:1024})),runtimeResources:[],sourceRawManifestSha256:ORIGINAL_PINS.source.rawManifestSha256,sourcePins:{...ORIGINAL_PINS.source}},metadata={version:2,source:{...ORIGINAL_PINS.source},frames:[],records:[],chunks:[],sparseBytes:98362125},dossier={rawManifestSha256:ORIGINAL_PINS.source.rawManifestSha256,hashes:[]};let offset=0;
 const share=(n,i)=>Math.floor(n/193)+(i<n%193?1:0);
 for(let i=0;i<193;i++){
  const bytes=share(98362125,i),gzip=share(93875221,i),resourcePath='assets/art/fire-realism/fluid-contact-surface/data/frame-'+String(i).padStart(3,'0')+'.fzp.gz';
  metadata.frames.push({frame:i+1,timeSeconds:i/30,resolution:[48,48,96]});metadata.chunks.push({id:i,offset,sparseBytes:bytes,gzipBytes:gzip,gzipSha256:hash,resourcePath,recordIds:[i*3,i*3+1,i*3+2],kind:'fzp2-gzip'});manifest.runtimeResources.push({path:resourcePath,kind:'fzp2-gzip',bytes:gzip,sha256:hash,uncompressedBytes:bytes});
  let within=0;for(let lane=0;lane<3;lane++){const packetBytes=Math.floor(bytes/3)+(lane<bytes%3?1:0),channel=['density','temperature','flame'][lane],record={id:i*3+lane,frame:i+1,channel,offset:offset+within,packetBytes,packetSha256:hash,rawBytes:884736,rawSha256:hash};metadata.records.push(record);dossier.hashes.push({frame:i+1,channel,bytes:884736,sha256:hash});within+=packetBytes;}offset+=bytes;
 }
 return {manifest,metadata,dossier};
}
test('gated runner imports without executing; malformed CLI never reaches files or changes exit status',async()=>{const before=process.exitCode;await assert.rejects(main([]),/Usage after separate root approval/);assert.equal(process.exitCode,before);});
test('launch spec requires every exact source identity and the unchanged aggregate source ceiling',()=>{
 assert.equal(validateSpec(spec()).version,1);
 for(const mutate of [s=>s.version=2,s=>s.sourceCommit='wrong',s=>s.extra=true,s=>delete s.expectedSources['run.mjs'],s=>s.expectedSources['run.mjs'].extra=1,s=>s.expectedSources['run.mjs'].sha256='wrong',s=>s.expectedSources['run.mjs'].bytes=0,s=>s.outputDirectory='',s=>{for(const v of Object.values(s.expectedSources))v.bytes=20*1024**2;}]){const s=spec();mutate(s);assert.throws(()=>validateSpec(s));}
});
test('declared paths use components rather than sibling prefix matches',()=>{const root=path.join(os.tmpdir(),'fzp2-root');assert.equal(inside(root,'qa/result'),path.join(root,'qa/result'));for(const p of ['..',path.join('..','fzp2-root-sibling','x'),root])assert.throws(()=>inside(root,p),/outside/);});
test('exact bounded reads reject caps, length/hash changes and release the handle on cancellation',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fzp2-reader-source-test-')),file=path.join(dir,'tiny.bin'),bytes=Uint8Array.of(1,2,3,4,5,6,7,8),identity={bytes:bytes.length,sha256:sha256(bytes)};
 try{
  await fs.writeFile(file,bytes);assert.deepEqual(await readExact(file,identity,{maxBytes:8}),bytes);await assert.rejects(readExact(file,identity,{maxBytes:7}),/Bounded/);await assert.rejects(readExact(file,{...identity,bytes:7},{maxBytes:8}),/byte count/);await assert.rejects(readExact(file,{...identity,sha256:'0'.repeat(64)},{maxBytes:8}),/hash\/EOF/);
  const open=fs.open;let closes=0,reads=0,checks=0;
  fs.open=async(...args)=>{const handle=await open(...args);return {stat:()=>handle.stat(),read:async(...r)=>{reads++;return handle.read(...r);},close:async()=>{closes++;return handle.close();}};};
  try{await assert.rejects(readExact(file,identity,{maxBytes:8,check(){if(++checks===4)throw Error('synthetic STOP');}}),/synthetic STOP/);assert.equal(closes,1);assert.equal(reads,1);}finally{fs.open=open;}
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('metadata is parsed as a pinned JSON literal, never evaluated as an artist module',()=>{
 const raw=new TextEncoder().encode('export const FIELD_METADATA={"version":2};\nexport const PRESENTATION=globalThis.neverEvaluated();\n');assert.deepEqual(parseMetadata(raw),{version:2});
 for(const text of ['export const FIELD_METADATA=({version:2});\nexport const PRESENTATION={};\n','export const OTHER={};\n','export const FIELD_METADATA={};\nexport const PRESENTATION={}'])assert.throws(()=>parseMetadata(new TextEncoder().encode(text)));
});
test('synthetic complete inventory pins all193 clocks/shapes,579 ordered source hashes and whole-frame resource bounds',()=>{
 const f=syntheticInventory(),validate=({manifest,metadata,dossier})=>validateOriginalInventory(manifest,metadata,dossier);assert.deepEqual(validate(f),{sourceBytes:60416,packetBytes:98362125,compressedBytes:93875221,frames:193,scalarRecords:579,resources:193});
 const mutations=[x=>x.metadata.source.settingsSha256='0'.repeat(64),x=>x.dossier.rawManifestSha256='0'.repeat(64),x=>x.metadata.frames[192].timeSeconds=6.3,x=>x.metadata.frames[1].resolution=[48,96,48],x=>x.metadata.records[5].rawSha256='0'.repeat(64),x=>x.dossier.hashes[5].channel='density',x=>x.metadata.records[2].offset++,x=>x.metadata.chunks[3].recordIds.reverse(),x=>x.manifest.runtimeResources[3].sha256='0'.repeat(64),x=>x.metadata.chunks[1].sparseBytes=PAYLOAD_LIMITS.chunkSparseBytes+1,x=>x.metadata.chunks[1].gzipBytes=PAYLOAD_LIMITS.chunkSourceBytes+1,x=>x.metadata.sparseBytes--,x=>x.manifest.runtimeFiles[0].bytes=PAYLOAD_LIMITS.sourceBytes];
 for(const mutate of mutations){const fixture=copy(f);mutate(fixture);assert.throws(()=>validate(fixture));}
});
test('report-only sparsity includes negative-zero and special uint32 words without decoding a plane',()=>{
 const raw=new Uint8Array(24),view=new DataView(raw.buffer);[0,0x80000000,0x7fc12345,0,1,0].forEach((word,i)=>view.setUint32(i*4,word,true));const packet=encodeZeroLiteral(raw);assert.deepEqual(packetWorkload(packet),{words:6,nonPositiveZeroWords:3,positiveZeroWords:3,rawBytes:24,packetBytes:packet.length});const bad=new Uint8Array([...packet,0]);assert.throws(()=>packetWorkload(bad),/trailing/);
});
test('fixed sparsity bins keep all raw timed samples without adaptive thresholds',()=>{
 const workloads=[0,.1,.25,.5,.75,1].map((fraction,i)=>({frame:i+1,nonPositiveZeroWords:fraction*100,nonPositiveZeroFraction:fraction})),frames=workloads.map(w=>({frame:w.frame,validation:[{implementation:'baseline',ms:w.frame},{implementation:'candidate',ms:w.frame/2}],full:[{implementation:'baseline',ms:w.frame*2},{implementation:'candidate',ms:w.frame}]})),s=sparsitySummary({status:'complete',frames},workloads);
 assert.deepEqual(Object.values(s.bins).map(b=>b.frames),[[1],[2,3],[4,5],[6]]);assert.equal(Object.values(s.bins).reduce((n,b)=>n+b.timings.full.baseline.count,0),6);assert.equal(s.bins['(0,25%]'].timings.full.baseline.p95,6);
});
