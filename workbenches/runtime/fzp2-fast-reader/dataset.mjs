import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {PAYLOAD_LIMITS,validatePacket} from '../../../assets/art/fire-realism/field-payload-v2/codec.js';
export const ORIGINAL_PINS=Object.freeze({
 commit:'df0fd0ddafb37fd4fa729989a6064d8a1436665a',
 manifest:{path:'assets/art/fire-realism/fluid-contact-surface/manifest.json',bytes:68098,sha256:'1cbe16364217f7ce0d576749166be556d8e54c95c028cb27e378bcb9be225759'},
 metadata:{path:'assets/art/fire-realism/fluid-contact-surface/metadata.js',bytes:216968,sha256:'b7012ce47e66f3a1eb6d58ba84acdebf14526ebd8a9424b189c63e9fc91d4010'},
 dossier:{bytes:96953,sha256:'8b54b57824cb43d216015f85c2a454b482509d5241a6d221a8f6680d535e4c8e'},
 source:{rawManifestSha256:'dc257c0200ea12dcea9c48fdf711cb33e6de62ab989732c731cdd7099f16a4ce',settingsSha256:'b83c2266cd9458ac33ffc53692a8af946c576d07ab90e74073ff633c7bb14e52',prepareReportSha256:'b8c902c637447ccada9377b30dedfe2711b1c578a4613b0731cc9767c3bf86df',sourceBlendSha256:'86fd4f8f5e5c00857fa9f812b78a311c26b20318c06fcc58518890f7bec43da6'}
});
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const integer=(n,max)=>Number.isSafeInteger(n)&&n>0&&n<=max,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function inside(root,value){const resolved=path.resolve(root,value),relative=path.relative(path.resolve(root),resolved);if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Path outside declared project root');return resolved;}
/** Allocation is capped before reading; exact EOF/hash rechecks catch growth or
 * replacement. Caller owns the returned buffer; no unbounded arrayBuffer read. */
export async function readExact(file,expected,{maxBytes,check=()=>{}}={}){
 if(!integer(expected?.bytes,maxBytes)||!/^[a-f0-9]{64}$/.test(expected?.sha256||''))throw Error('Bounded exact raw identity required');
 check();const handle=await fs.open(file,'r');
 try{
  const stat=await handle.stat();check();if(!stat.isFile()||stat.size!==expected.bytes)throw Error('Exact raw file byte count mismatch');
  const bytes=new Uint8Array(expected.bytes);let at=0;
  while(at<bytes.length){check();const read=await handle.read(bytes,at,bytes.length-at,at);check();if(!read.bytesRead)throw Error('Truncated exact raw file');at+=read.bytesRead;}
  const extra=new Uint8Array(1),tail=await handle.read(extra,0,1,at);check();if(tail.bytesRead||sha256(bytes)!==expected.sha256)throw Error('Exact raw file hash/EOF mismatch');return bytes;
 }finally{await handle.close();}
}
export function parseMetadata(raw){
 const text=new TextDecoder('utf-8',{fatal:true}).decode(raw),prefix='export const FIELD_METADATA=',marker=';\nexport const PRESENTATION=',end=text.indexOf(marker);
 if(!text.startsWith(prefix)||end<0||!text.endsWith(';\n'))throw Error('Unexpected immutable metadata source envelope');return JSON.parse(text.slice(prefix.length,end));
}
/** Counts only validated packet tags for fixed, declared sparsity bins. This is
 * setup/reporting, outside both timed groups; it never decodes/retains a plane. */
export function packetWorkload(packet){
 const header=validatePacket(packet),view=new DataView(packet.buffer,packet.byteOffset,packet.byteLength);let at=16,nonPositiveZeroWords=0;
 for(let i=0;i<header.runs;i++){const tag=view.getUint32(at,true),count=tag&0x7fffffff;at+=4;if(tag&0x80000000){nonPositiveZeroWords+=count;at+=Math.ceil(count*(23+header.width)/8);}}
 return {words:header.words,nonPositiveZeroWords,positiveZeroWords:header.words-nonPositiveZeroWords,rawBytes:header.rawBytes,packetBytes:packet.length};
}
export function validateOriginalInventory(manifest,m,dossier){
 if(manifest.runtimeFiles?.length!==59||manifest.runtimeResources?.length!==193||m.version!==2||m.frames?.length!==193||m.records?.length!==579||m.chunks?.length!==193||dossier.hashes?.length!==579)throw Error('Original193/579 inventory required');
 if(dossier.rawManifestSha256!==ORIGINAL_PINS.source.rawManifestSha256||manifest.sourceRawManifestSha256!==dossier.rawManifestSha256)throw Error('Original raw manifest pin mismatch');
 for(const [key,value]of Object.entries(ORIGINAL_PINS.source))if(m.source?.[key]!==value||manifest.sourcePins?.[key]!==value)throw Error('Original source snapshot pin mismatch');
 const sourceBytes=manifest.runtimeFiles.reduce((n,r)=>n+r.bytes,0);if(!integer(sourceBytes,PAYLOAD_LIMITS.sourceBytes))throw Error('Original declared ESM aggregate exceeds ceiling');
 const seen=new Set();let packetBytes=0,compressedBytes=0;
 for(let i=0;i<193;i++){
  const frame=m.frames[i],c=m.chunks[i],resource=manifest.runtimeResources[i],ids=[i*3,i*3+1,i*3+2],resourcePath='assets/art/fire-realism/fluid-contact-surface/data/frame-'+String(i).padStart(3,'0')+'.fzp.gz';
  if(frame.frame!==i+1||frame.timeSeconds!==i/30||!same(frame.resolution,[48,48,96]))throw Error('Original finite frame clock/shape mismatch');
  if(c.id!==i||c.offset!==packetBytes||c.resourcePath!==resourcePath||c.kind!=='fzp2-gzip'||!same(c.recordIds,ids)||!integer(c.sparseBytes,PAYLOAD_LIMITS.chunkSparseBytes)||!integer(c.gzipBytes,PAYLOAD_LIMITS.chunkSourceBytes))throw Error('Original whole-frame chunk mismatch');
  if(resource.path!==resourcePath||resource.kind!==c.kind||resource.bytes!==c.gzipBytes||resource.sha256!==c.gzipSha256||resource.uncompressedBytes!==c.sparseBytes)throw Error('Manifest/resource identity mismatch');
  let within=0;for(let lane=0;lane<3;lane++){
   const id=ids[lane],r=m.records[id],expected=dossier.hashes[id],channel=['density','temperature','flame'][lane],key=(i+1)+':'+channel;
   if(seen.has(key)||r.id!==id||r.frame!==i+1||r.channel!==channel||r.offset!==packetBytes+within||!integer(r.packetBytes,PAYLOAD_LIMITS.chunkSparseBytes)||r.packetBytes<20||r.rawBytes!==884736||!/^[a-f0-9]{64}$/.test(r.packetSha256||''))throw Error('Ordered original scalar record mismatch');
   if(expected.frame!==r.frame||expected.channel!==channel||expected.bytes!==r.rawBytes||expected.sha256!==r.rawSha256||!/^[a-f0-9]{64}$/.test(r.rawSha256))throw Error('Independent579 original scalar dossier mismatch');seen.add(key);within+=r.packetBytes;
  }
  if(within!==c.sparseBytes)throw Error('Whole-frame packet extent mismatch');packetBytes+=c.sparseBytes;compressedBytes+=c.gzipBytes;
 }
 if(packetBytes!==m.sparseBytes||packetBytes!==98362125||compressedBytes!==93875221||packetBytes>PAYLOAD_LIMITS.sparseBytes||compressedBytes>PAYLOAD_LIMITS.compressedBytes||m.chunks.length>PAYLOAD_LIMITS.chunks)throw Error('Original aggregate budget/byte mismatch');
 return {sourceBytes,packetBytes,compressedBytes,frames:193,scalarRecords:579,resources:193};
}
export async function loadOriginalV5({projectRoot,dossierPath,sourceOverheadBytes=0,check=()=>{},onProgress=()=>{}}={}){
 const started=performance.now(),root=await fs.realpath(projectRoot);check();
 const manifestRaw=await readExact(inside(root,ORIGINAL_PINS.manifest.path),ORIGINAL_PINS.manifest,{maxBytes:PAYLOAD_LIMITS.sourceBytes,check});
 const metadataRaw=await readExact(inside(root,ORIGINAL_PINS.metadata.path),ORIGINAL_PINS.metadata,{maxBytes:PAYLOAD_LIMITS.sourceBytes,check});
 const dossierRaw=await readExact(inside(root,dossierPath),ORIGINAL_PINS.dossier,{maxBytes:ORIGINAL_PINS.dossier.bytes,check});
 const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestRaw)),metadata=parseMetadata(metadataRaw),dossier=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(dossierRaw));
 const inventory=validateOriginalInventory(manifest,metadata,dossier),metrics={...inventory,resourcesRead:0,packetHashes:0,peakCompressedChunkBytes:0,peakInflatedChunkBytes:0,rawMetadataBytes:manifestRaw.length+metadataRaw.length+dossierRaw.length,frameWorkloads:[],loadMs:null};
 if(!Number.isSafeInteger(sourceOverheadBytes)||sourceOverheadBytes<0||inventory.sourceBytes+sourceOverheadBytes>PAYLOAD_LIMITS.sourceBytes)throw Error('Declared original closure plus QA source exceeds unchanged aggregate source ceiling');
 let packetStore=new Uint8Array(metadata.sparseBytes);
 try{
  for(let i=0;i<metadata.chunks.length;i++){
   check();const chunk=metadata.chunks[i],record=manifest.runtimeResources[i];let gzip=await readExact(inside(root,record.path),record,{maxBytes:PAYLOAD_LIMITS.chunkSourceBytes,check});metrics.resourcesRead++;metrics.peakCompressedChunkBytes=Math.max(metrics.peakCompressedChunkBytes,gzip.length);
   let decoded=gunzipSync(gzip,{maxOutputLength:chunk.sparseBytes});check();if(decoded.length!==chunk.sparseBytes)throw Error('Exact gzip expansion mismatch');metrics.peakInflatedChunkBytes=Math.max(metrics.peakInflatedChunkBytes,decoded.length);packetStore.set(decoded,chunk.offset);gzip=decoded=null;
   let words=0,nonPositiveZeroWords=0;
   for(const id of chunk.recordIds){const r=metadata.records[id],packet=packetStore.subarray(r.offset,r.offset+r.packetBytes);if(sha256(packet)!==r.packetSha256)throw Error('Original packet hash mismatch');const work=packetWorkload(packet);if(work.rawBytes!==r.rawBytes)throw Error('Original packet raw extent mismatch');words+=work.words;nonPositiveZeroWords+=work.nonPositiveZeroWords;metrics.packetHashes++;check();}
   metrics.frameWorkloads.push({frame:i+1,packetBytes:chunk.sparseBytes,words,nonPositiveZeroWords,nonPositiveZeroFraction:nonPositiveZeroWords/words});
   onProgress({stage:'staging',frame:i+1,resourcesRead:metrics.resourcesRead});
  }
  metrics.loadMs=performance.now()-started;return {metadata,packetStore,inventory,metrics,inputPins:ORIGINAL_PINS,scope:'Artist metadata read as pinned JSON only; no factory/geometry/shader import. One gzip read/inflation per original resource. Native gzip/GC residency is not explicit-buffer accounting.'};
 }catch(error){packetStore=null;error.stageMetrics={...metrics,explicitPacketStoreBytesAfter:0};throw error;}
}
