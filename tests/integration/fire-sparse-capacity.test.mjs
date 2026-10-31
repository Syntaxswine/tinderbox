import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {FIRE_BINARY_LIMITS,resourceRecords,reserveFireBudget,readBoundedFireResponse} from '../../tools/fire-realism/resources.js';
import {createFireReviewDeliveryLoader,FIRE_DELIVERY_PATH,verifiedFireDeliveryMetadata} from '../../tools/fire-realism/delivery.js';
import {PAYLOAD_LIMITS} from '../../assets/art/fire-realism/field-payload-v2/codec.js';

const MiB=1024**2,base='https://capacity-fixture.invalid/tinderbox/',root='assets/art/fire-realism/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const text=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value));
const record=(path,uncompressedBytes)=>({path,kind:'fzp2-gzip',bytes:1,sha256:sha(new Uint8Array([7])),uncompressedBytes});
function resources(prefix,total){
 const records=[];
 while(total){const bytes=Math.min(total,4*MiB);records.push(record(prefix+'data/chunk-'+records.length+'.fzp.gz',bytes));total-=bytes;}
 return records;
}
function syntheticDelivery(referenceBytes,optimizedBytes=0){
 const files=new Map(),descriptor={version:1,byMode:{}};
 for(const [mode,prefix,total]of [['reference',root,referenceBytes],...(optimizedBytes?[['optimized',root+'optimized/',optimizedBytes]]:[])]){
  const factoryModule=prefix+'index.js',manifestUrl=prefix+'manifest.json',runtimeResources=resources(prefix,total);
  files.set(factoryModule,text('export function createFireRealism(){} export async function preparePayload(){}'));
  for(const r of runtimeResources)files.set(r.path,new Uint8Array([7]));
  const manifest=text({version:1,optimizedAvailable:mode==='optimized',runtimeFiles:[{path:factoryModule,bytes:files.get(factoryModule).length,sha256:sha(files.get(factoryModule))}],runtimeResources});
  files.set(manifestUrl,manifest);
  descriptor.byMode[mode]={sourceCommit:(mode==='reference'?'a':'b').repeat(40),factoryModule,factoryExport:'createFireRealism',prepareExport:'preparePayload',manifestUrl,manifestBytes:manifest.length,manifestSha256:sha(manifest)};
 }
 files.set(FIRE_DELIVERY_PATH,text(descriptor));return{files,descriptor};
}
function transportHarness(f){
 const fetches=[],imports=[],prepared=[];
 const load=createFireReviewDeliveryLoader();
 return{fetches,imports,prepared,run:()=>load({projectUrl:base,descriptorUrl:base+FIRE_DELIVERY_PATH,
  fetchImpl:async url=>{const path=url.slice(base.length);fetches.push(path);const bytes=f.files.get(path);const response=new Response(bytes||null,{status:bytes?200:404});Object.defineProperty(response,'url',{value:url});return response;},
  importModule:async url=>{
   imports.push(url);assert.equal(fetches.length,f.files.size,'all configured JS and binary bytes precede the first import');
   return{createFireRealism(){return{synthetic:true};},async preparePayload(c){
    c.registerCleanup(()=>{});for(const r of c.resources.records)assert.equal(c.resources.take(r.path).length,1);
    prepared.push(c.resources.records.length);return{scope:'synthetic declared-size transport only; no gzip/field decoding or sparse allocation'};
   }};
  }} )};
}

test('only the aggregate decoded allowance grows; all other capacities and deadlines remain fixed',()=>{
 assert.deepEqual(FIRE_BINARY_LIMITS,{sourceBytes:64*MiB,compressedBytes:96*MiB,sparseBytes:98*MiB,chunks:256,chunkCompressedBytes:2*MiB,chunkSparseBytes:4*MiB,prepareMs:120000,transactionMs:180000});
 assert.equal(Object.isFrozen(FIRE_BINARY_LIMITS),true);
});

test('98MiB is inclusive, 98MiB+1 rejects atomically, and the old96MiB boundary is no longer the aggregate limit',()=>{
 const stage={};const records=resources(root,98*MiB);
 assert.equal(reserveFireBudget(stage,[],records).sparseBytes,102760448);
 const before=structuredClone(stage);
 assert.throws(()=>reserveFireBudget(stage,[],[record(root+'extra.fzp.gz',1)]),/Aggregate fire sparseBytes/);
 assert.deepEqual(stage,before,'a refused reservation cannot publish a partial next budget');
 const oldBoundary={sparseBytes:96*MiB};
 assert.equal(reserveFireBudget(oldBoundary,[],[record(root+'one.fzp.gz',1)]).sparseBytes,96*MiB+1);
});

test('the actual loader shares98MiB across configured modes and verifies bytes before import without allocating the declared fields',async()=>{
 for(const [referenceBytes,optimizedBytes]of [[98*MiB,0],[52*MiB,46*MiB]]){
  const f=syntheticDelivery(referenceBytes,optimizedBytes),h=transportHarness(f),loaded=await h.run();
  assert.equal(h.imports.length,optimizedBytes?2:1);assert.equal(h.prepared.reduce((a,b)=>a+b,0),25);
  for(const mode of ['reference',...(optimizedBytes?['optimized']:[])]){
   const metadata=verifiedFireDeliveryMetadata(loaded.artistDelivery.byMode[mode]);
   assert.equal(metadata.coldLoad.declaredSparseBytesTotal,102760448);
   assert.equal(metadata.preparation.remainingLoaderBytes,0);
   assert.equal(metadata.preparation.assetDiagnostics.scope,'synthetic declared-size transport only; no gzip/field decoding or sparse allocation');
  }
 }
});

test('two individually valid modes exceeding their shared98MiB budget reject before any binary fetch or import',async()=>{
 const f=syntheticDelivery(52*MiB,46*MiB+1),h=transportHarness(f);
 await assert.rejects(h.run(),/Aggregate fire sparseBytes/);
 assert.equal(h.fetches.filter(path=>path.endsWith('.fzp.gz')).length,0);
 assert.equal(h.imports.length,0);assert.equal(h.prepared.length,0);
});

test('source64MiB, compressed96MiB and256 chunks still reject their own excess without changing the shared stage',()=>{
 const cases=[
  {stage:{sourceBytes:64*MiB},files:[{bytes:1}],records:[],name:'sourceBytes'},
  {stage:{compressedBytes:96*MiB},files:[],records:[record(root+'one.fzp.gz',1)],name:'compressedBytes'},
  {stage:{chunks:256},files:[],records:[record(root+'one.fzp.gz',1)],name:'chunks'}
 ];
 for(const c of cases){const before=structuredClone(c.stage);assert.throws(()=>reserveFireBudget(c.stage,c.files,c.records),new RegExp('Aggregate fire '+c.name));assert.deepEqual(c.stage,before);}
});

test('per-chunk and format/identity/stream guards do not inherit the larger decoded aggregate',async()=>{
 const validate=r=>resourceRecords({runtimeResources:[r]},{withinMode:path=>path,jsPaths:[]});
 for(const kind of ['fzp1-gzip','fzp2-gzip'])assert.equal(validate({...record(root+'bounded.fzp.gz',4*MiB),kind,bytes:2*MiB}).length,1);
 for(const r of [{...record(root+'large.fzp.gz',4*MiB),bytes:2*MiB+1},record(root+'large.fzp.gz',4*MiB+1),{...record(root+'other.fzp.gz',1),kind:'fzp3-gzip'}])assert.throws(()=>validate(r),/runtime resource/);
 const f=syntheticDelivery(98*MiB),first=[...f.files.keys()].find(path=>path.endsWith('.fzp.gz'));f.files.set(first,new Uint8Array([8]));const h=transportHarness(f);
 await assert.rejects(h.run(),/hash mismatch/);assert.equal(h.imports.length,0);
 await assert.rejects(readBoundedFireResponse(new Response(new Uint8Array(1)),{expectedBytes:1,maxBytes:98*MiB}),/Invalid response cap/,'decoded98MiB must not become a raw network cap');
 let cancelled=0;const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(3));},cancel(){cancelled++;}});
 await assert.rejects(readBoundedFireResponse(new Response(stream),{expectedBytes:2,maxBytes:2,requireStream:true}),/overflow/);assert.equal(cancelled,1);
});

test('the immutable canonical FZP2 consumer retains96MiB and all three original raw source hashes',()=>{
 assert.equal(PAYLOAD_LIMITS.sparseBytes,96*MiB);
 const pins={
  'codec.js':'5a3fa557caa064097405e55f0fe6b56af1a034520be4aaf5cdc8bf75fd5793d0',
  'rgba-decode.js':'5c74c945791b06b280c7847af34e5bd5a9ea7d371dad091ceddb5efa5ae82962',
  'payload.js':'675c8bf8c75502e5f6696b026bbfcc021c8c922b69320f5f82e89868612713e2'
 };
 for(const [name,expected]of Object.entries(pins))assert.equal(sha(readFileSync(new URL('../../assets/art/fire-realism/field-payload-v2/'+name,import.meta.url))),expected);
});
