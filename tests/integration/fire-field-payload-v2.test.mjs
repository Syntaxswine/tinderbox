import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {encodeZeroLiteral,decodeZeroLiteral,validatePacket,packetRawBytes,PAYLOAD_LIMITS} from '../../assets/art/fire-realism/field-payload-v2/codec.js';
import {decodeZeroLiteralRGBA} from '../../assets/art/fire-realism/field-payload-v2/rgba-decode.js';
import {createBinaryFieldStore} from '../../assets/art/fire-realism/field-payload-v2/payload.js';
const sha=b=>createHash('sha256').update(b).digest('hex'),names=['density','temperature','flame'];
function raw(words){const b=new Uint8Array(words.length*4),v=new DataView(b.buffer);words.forEach((w,i)=>v.setUint32(i*4,w>>>0,true));return b;}
// Independent bit-at-a-time format oracle, distinct from the byte accumulator.
function reference(words){
 const highs=words.filter(w=>(w>>>0)!==0).map(w=>w>>>23),base=highs.length?Math.min(...highs):0,width=highs.length?Math.ceil(Math.log2(Math.max(...highs)-base+1)):0,runs=[];
 for(let i=0;i<words.length;){const zero=(words[i]>>>0)===0;let end=i+1;while(end<words.length&&((words[end]>>>0)===0)===zero)end++;runs.push({zero,words:words.slice(i,end)});i=end;}
 const out=new Uint8Array(16+runs.reduce((s,r)=>s+4+(r.zero?0:Math.ceil(r.words.length*(23+width)/8)),0)),v=new DataView(out.buffer);v.setUint32(0,0x32505a46,true);v.setUint32(4,words.length,true);v.setUint32(8,runs.length,true);v.setUint16(12,base,true);v.setUint8(14,width);let at=16;
 for(const r of runs){v.setUint32(at,r.words.length+(r.zero?0:0x80000000),true);at+=4;if(r.zero)continue;let bit=0;for(const word of r.words){const packed=((word>>>23)-base)*0x800000+(word&0x7fffff);for(let k=0;k<23+width;k++,bit++)if(Math.floor(packed/2**k)%2)out[at+Math.floor(bit/8)]|=2**(bit%8);}at+=Math.ceil(bit/8);}
 return out;
}
function variants(packet){
 const result=[];const edit=(label,fn)=>{const b=packet.slice();fn(b,new DataView(b.buffer));result.push([label,b]);};
 edit('magic',(_,v)=>v.setUint32(0,0,true));edit('reserved',b=>b[15]=1);edit('base',(_,v)=>v.setUint16(12,512,true));edit('width',b=>b[14]=10);edit('word0',(_,v)=>v.setUint32(4,0,true));edit('word overflow',(_,v)=>v.setUint32(4,0xffffffff,true));edit('run0',(_,v)=>v.setUint32(8,0,true));edit('run overflow',(_,v)=>v.setUint32(8,0xffffffff,true));edit('tag0',(_,v)=>v.setUint32(16,0,true));edit('tag overflow',(_,v)=>v.setUint32(16,0x7fffffff,true));
 result.push(['header truncation',packet.subarray(0,15)],['tag truncation',packet.subarray(0,18)],['literal truncation',packet.subarray(0,packet.length-1)],['trailing',Uint8Array.from([...packet,0])]);return result;
}
test('FZP2 matches independent golden/bitwise oracle at every width and preserves seeded arbitrary uint32 words',()=>{
 const golden=Uint8Array.from([0x46,0x5a,0x50,0x32,2,0,0,0,1,0,0,0,0,0,0,0,2,0,0,0x80,1,0,0,1,0,0]);assert.deepEqual(encodeZeroLiteral(raw([1,2])),golden);assert.deepEqual(decodeZeroLiteral(golden,new Uint8Array(8)),raw([1,2]));
 const samples=[[0,0],[0x80000000,0x80000000],[0,1,0x007fffff,0x00800000,0x7f7fffff,0xff7fffff,0x7f800000,0xff800000,0x7fc12345,0x7fa54321,0xffc00001,0x80000000,0]];
 for(let width=0;width<=9;width++){const low=width===9?0:64,high=low+(width?2**(width-1):0);const words=[0,low*0x800000+1,high*0x800000+0x765432,0,low*0x800000+3];samples.push(words);assert.equal(validatePacket(encodeZeroLiteral(raw(words))).width,width);}
 let seed=1893;const corpus=[];for(let i=0;i<4096;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;corpus.push(i%5?seed:0);}samples.push(corpus);
 for(const words of samples){const input=raw(words),packet=encodeZeroLiteral(input);assert.deepEqual(packet,reference(words));assert.equal(packetRawBytes(packet),input.length);assert.deepEqual(decodeZeroLiteral(packet,new Uint8Array(input.length)),input);}
 const wrap=new Uint8Array(23),view=new DataView(wrap.buffer);view.setUint32(0,0x32505a46,true);view.setUint32(4,1,true);view.setUint32(8,1,true);view.setUint16(12,511,true);view.setUint8(14,1);view.setUint32(16,0x80000001,true);wrap.set([1,0,128],20);assert.deepEqual(decodeZeroLiteral(wrap,new Uint8Array(4)),raw([1]));
 assert.throws(()=>encodeZeroLiteral(new Uint8Array()),/nonempty/);assert.throws(()=>encodeZeroLiteral(new Uint8Array(3)),/f32/);
});
test('unaligned packet/output offsets, all RGBA lanes and outside canaries preserve exact words without dense scratch',()=>{
 const words=[0,0x80000000,0x7fc01234,1,0xff800000,0],packet=encodeZeroLiteral(raw(words));
 for(const channelOffset of[0,4,8,12]){
  const sourceStorage=new Uint8Array(packet.length+19).fill(0xdd),source=sourceStorage.subarray(7,7+packet.length);source.set(packet);const original=sourceStorage.slice(),targetStorage=new Uint8Array(words.length*16+29).fill(0xa5),target=targetStorage.subarray(13,13+words.length*16),expected=targetStorage.slice(),v=new DataView(expected.buffer);words.forEach((w,i)=>v.setUint32(13+i*16+channelOffset,w>>>0,true));
  assert.equal(decodeZeroLiteralRGBA(source,target,{voxelCount:words.length,channelOffset}),target);assert.deepEqual(targetStorage,expected);assert.deepEqual(sourceStorage,original);
 }
 const storage=new Uint8Array(packet.length+words.length*4+7);storage.set(packet,3);decodeZeroLiteral(storage.subarray(3,3+packet.length),storage.subarray(3+packet.length,3+packet.length+words.length*4));assert.deepEqual(storage.subarray(3+packet.length,3+packet.length+words.length*4),raw(words));
 const saved={Uint8Array:globalThis.Uint8Array,ArrayBuffer:globalThis.ArrayBuffer},counts={Uint8Array:0,ArrayBuffer:0},output=new Uint8Array(words.length*16);
 try{for(const name of Object.keys(saved))globalThis[name]=new Proxy(saved[name],{construct(t,a,n){counts[name]++;return Reflect.construct(t,a,n);}});decodeZeroLiteralRGBA(packet,output,{voxelCount:words.length,channelOffset:8});}finally{Object.assign(globalThis,saved);}assert.deepEqual(counts,{Uint8Array:0,ArrayBuffer:0});
});
test('every malformed stream/layout rejects atomically for scalar and RGBA output including late padding',()=>{
 const words=[0,1,2,0,3],packet=encodeZeroLiteral(raw(words)),bad=variants(packet);const late=packet.slice();late[late.length-1]|=128;bad.push(['late nonzero padding',late]);const incomplete=encodeZeroLiteral(raw([0,0]));new DataView(incomplete.buffer).setUint32(16,1,true);bad.push(['incomplete',incomplete]);const positiveZero=encodeZeroLiteral(raw([1]));positiveZero[20]=0;bad.push(['literal positive zero',positiveZero]);const zeroBase=encodeZeroLiteral(raw([0]));new DataView(zeroBase.buffer).setUint16(12,1,true);bad.push(['zero header',zeroBase]);
 for(const[label,p]of bad){for(const rgba of[false,true]){const target=new Uint8Array(words.length*(rgba?16:4)).fill(0x91),before=target.slice();assert.throws(()=>rgba?decodeZeroLiteralRGBA(p,target,{voxelCount:words.length,channelOffset:4}):decodeZeroLiteral(p,target),undefined,label);assert.deepEqual(target,before,label);}}
 for(const opts of[null,{}, {voxelCount:words.length},{voxelCount:words.length,channelOffset:1},{voxelCount:words.length,channelOffset:16},{voxelCount:-1,channelOffset:0},{voxelCount:words.length,channelOffset:0,stride:4}]){const out=new Uint8Array(words.length*16).fill(0xa6);assert.throws(()=>decodeZeroLiteralRGBA(packet,out,opts));assert.ok(out.every(v=>v===0xa6));}
 const aliases=new Uint8Array(Math.max(packet.length,words.length*16));aliases.set(packet);const before=aliases.slice();assert.throws(()=>decodeZeroLiteralRGBA(aliases.subarray(0,packet.length),aliases.subarray(0,words.length*16),{voxelCount:words.length,channelOffset:0}),/overlap/);assert.deepEqual(aliases,before);
 if(typeof SharedArrayBuffer==='function'){const shared=new Uint8Array(new SharedArrayBuffer(packet.length));shared.set(packet);assert.throws(()=>decodeZeroLiteral(shared,new Uint8Array(words.length*4)),/unshared/);}
});

function fixture({editPacket,editRawHash,editPlain}={}){
 const m={version:2,source:{rawManifestSha256:'a'.repeat(64),settingsSha256:'b'.repeat(64),prepareReportSha256:'c'.repeat(64),sourceBlendSha256:'d'.repeat(64),provenance:{notes:['synthetic test only']}},frames:[],records:[],chunks:[],sparseBytes:0},buffers=new Map(),expected=new Map();
 for(let frame=1;frame<=193;frame++){
  m.frames.push({frame,timeSeconds:(frame-1)/30,resolution:[2,1,1]});const packets=[],ids=[],offset=m.sparseBytes;
  for(let lane=0;lane<3;lane++){
   const original=raw(frame===1?[0,0]:[frame+lane*1000,lane===1?0x7fc01234:0x80000000]);expected.set(frame+':'+names[lane],original);let packet=encodeZeroLiteral(original);if(editPacket)packet=editPacket(packet,frame,lane)||packet;
   const id=m.records.length,r={id,frame,channel:names[lane],offset:m.sparseBytes,packetBytes:packet.length,packetSha256:sha(packet),rawBytes:original.length,rawSha256:sha(original)};editRawHash?.(r);m.records.push(r);m.sparseBytes+=packet.length;packets.push(packet);ids.push(id);
  }
  let plain=Buffer.concat(packets);if(editPlain)plain=editPlain(plain,frame)||plain;const gzip=new Uint8Array(gzipSync(plain)),resourcePath=`assets/art/fire-realism/synthetic-v2/data/frame-${String(frame).padStart(3,'0')}.fzp.gz`;buffers.set(resourcePath,gzip);m.chunks.push({id:frame-1,kind:'fzp2-gzip',offset,sparseBytes:packets.reduce((s,p)=>s+p.length,0),gzipBytes:gzip.length,gzipSha256:sha(gzip),resourcePath,recordIds:ids});
 }
 const records=m.chunks.map(c=>({path:c.resourcePath,kind:c.kind,bytes:c.gzipBytes,sha256:c.gzipSha256,uncompressedBytes:c.sparseBytes}));let cleanup=null,takes=0,registered=0;
 const provider={records,take(p){assert.equal(registered,1,'cleanup registered before first take');takes++;assert.ok(buffers.has(p));const b=buffers.get(p);buffers.delete(p);return b;}};
 return{metadata:m,expected,provider,buffers,registerCleanup(fn){assert.equal(registered++,0);cleanup=fn;},cleanup(){cleanup?.();},stats:()=>({takes,registered})};
}
function prepare(store,f,signal){return store.prepare({resources:f.provider,registerCleanup:f.registerCleanup,signal});}
test('metadata2 deeply snapshots source/shape/records and rejects non-JSON or incomplete/incorrect protocols',async()=>{
 const f=fixture(),store=createBinaryFieldStore(f.metadata);f.metadata.frames[0].resolution[0]=96;f.metadata.records[0].rawSha256='0'.repeat(64);f.metadata.chunks[0].recordIds[0]=17;f.metadata.source.provenance.notes[0]='mutated';await prepare(store,f);
 const proof=store.evidence();assert.equal(proof.source.provenance.notes[0],'synthetic test only');proof.source.provenance.notes[0]='returned evidence mutated';proof.resourceHashes[0].kind='zip';assert.equal(store.evidence().source.provenance.notes[0],'synthetic test only');assert.equal(store.evidence().resourceHashes[0].kind,'fzp2-gzip');f.cleanup();
 const clean=fixture().metadata;
 const edits=[m=>m.version=1,m=>m.frames.pop(),m=>m.frames[1].timeSeconds=1,m=>m.frames[1].resolution=[1,2,1],m=>m.records[0].id='0',m=>m.records[0].channel='flame',m=>m.records[0].offset=1,m=>m.records[0].packetBytes=19,m=>m.records[0].rawSha256='z'.repeat(64),m=>m.chunks[0].kind='fzp1-gzip',m=>m.chunks[0].recordIds.reverse(),m=>m.chunks[1].resourcePath=m.chunks[0].resourcePath,m=>m.chunks[0].resourcePath='assets/art/fire-realism/x/../x.fzp.gz',m=>m.chunks[0].resourcePath='https://fixture.invalid/x.fzp.gz',m=>m.chunks[0].gzipBytes=2*1024**2+1,m=>m.chunks[0].sparseBytes++,m=>m.sparseBytes++,m=>m.source.rawManifestSha256='x',m=>m.source.extra=()=>{},m=>m.source.extra=new Uint8Array(2),m=>m.source.extra=m,m=>m.source.extra=Infinity,m=>Object.defineProperty(m.source,'bad',{get(){throw Error('must never invoke accessor');},enumerable:true})];
 for(const edit of edits){const m=structuredClone(clean);edit(m);assert.throws(()=>createBinaryFieldStore(m));}
 let accessorCalls=0;const getter=structuredClone(clean);Object.defineProperty(getter.source,'bad',{enumerable:true,get(){accessorCalls++;return 1;}});assert.throws(()=>createBinaryFieldStore(getter));assert.equal(accessorCalls,0);
});
test('verified preparation checks579 original hashes, then supplies only two synchronous owned RGBA slots and detached evidence',async()=>{
 const f=fixture(),controller=new AbortController(),store=createBinaryFieldStore(f.metadata);assert.throws(()=>store.createFrameCache(),/completed/);const prepared=await prepare(store,f,controller.signal);assert.equal(prepared.ready,true);assert.equal(prepared.metrics.verifiedScalars,579);assert.equal(f.stats().takes,193);assert.equal(f.buffers.size,0);assert.equal(store.evidence().verifiedScalars.length,579);controller.abort();assert.equal(store.diagnostics().ready,true,'post-success cancellation cannot retire document-owned packets');
 const cache=store.createFrameCache();assert.throws(()=>store.createFrameCache(),/existing/);const first=cache.frame(1);assert.ok(Object.isFrozen(first));assert.throws(()=>{first.frame=50;});const second=cache.frame(2),secondBytes=second.bytes;assert.notEqual(first.id,second.id);assert.equal(cache.frame(2).bytes,secondBytes);assert.equal(typeof cache.framePair(2,3).then,'undefined');assert.equal(store.diagnostics().metrics.denseBuffers,2);assert.equal(store.diagnostics().metrics.denseBytes,64);
 cache.frame(3).bytes.fill(0xff);cache.reset();const restored=cache.frame(3),v=new DataView(restored.bytes.buffer);for(let i=0;i<2;i++){for(let lane=0;lane<3;lane++)assert.equal(v.getUint32(i*16+lane*4,true),new DataView(f.expected.get('3:'+names[lane]).buffer).getUint32(i*4,true));assert.equal(v.getUint32(i*16+12,true),0);}
 cache.dispose();cache.dispose();assert.equal(first.bytes,null);assert.equal(second.bytes,null);assert.equal(store.diagnostics().metrics.denseBytes,0);assert.equal(store.diagnostics().metrics.sharedSparseBytes,f.metadata.sparseBytes);assert.throws(()=>cache.frame(1),/disposed/);
 let audited=0;await store.auditFrames(frame=>{assert.equal(frame.frame,++audited);for(let lane=0;lane<3;lane++){const original=new DataView(f.expected.get(frame.frame+':'+names[lane]).buffer),rgba=new DataView(frame.rgba.buffer,frame.rgba.byteOffset,frame.rgba.byteLength);for(let i=0;i<2;i++)assert.equal(rgba.getUint32(i*16+lane*4,true),original.getUint32(i*4,true));}});assert.equal(audited,193);assert.equal(store.diagnostics().metrics.denseBytes,0);assert.equal(store.diagnostics().factoryGpuOwnedBytes,0);
 f.cleanup();f.cleanup();assert.equal(store.diagnostics().ready,false);assert.equal(store.diagnostics().metrics.sharedSparseBytes,0);assert.deepEqual(store.evidence().verifiedScalars,[]);await assert.rejects(prepare(store,f),/already/);
});
test('metadata kind/gzip/packet/scalar/expansion failures roll back references and never publish readiness',async()=>{
 const cases=[()=>{const f=fixture();f.provider.records[0].kind='fzp1-gzip';return f;},()=>{const f=fixture();f.buffers.get(f.metadata.chunks[0].resourcePath)[0]^=1;return f;},()=>fixture({editPacket(p,frame,lane){if(frame===2&&lane===1){p=p.slice();p[0]^=1;}return p;}}),()=>fixture({editRawHash(r){if(r.id===4)r.rawSha256='0'.repeat(64);}}),()=>fixture({editPlain(p,frame){return frame===2?Buffer.concat([p,Buffer.from([1])]):p;}}),()=>fixture({editPlain(p,frame){return frame===2?p.subarray(0,p.length-1):p;}})];
 for(const build of cases){const f=build(),store=createBinaryFieldStore(f.metadata);await assert.rejects(prepare(store,f));assert.equal(store.diagnostics().ready,false);assert.equal(store.diagnostics().metrics.sharedSparseBytes,0);assert.equal(store.diagnostics().metrics.stagedSparseBytes,0);assert.equal(store.diagnostics().metrics.denseBytes,0);assert.deepEqual(store.evidence().verifiedScalars,[]);assert.throws(()=>store.createFrameCache(),/completed/);f.cleanup();f.cleanup();}
});
test('cancellation and delayed crypto resolution cannot resurrect preparation; explicit cleanup invalidates a live cache',async()=>{
 const f=fixture(),store=createBinaryFieldStore(f.metadata),controller=new AbortController(),original=globalThis.crypto,descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');let release,entered;const gate=new Promise(r=>{release=r;}),started=new Promise(r=>{entered=r;});
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{async digest(...args){entered();await gate;return original.subtle.digest(...args);}}}});
 try{const work=prepare(store,f,controller.signal);await started;controller.abort();await assert.rejects(work,{name:'AbortError'});assert.equal(store.diagnostics().metrics.stagedSparseBytes,0);release();await new Promise(r=>setImmediate(r));assert.equal(store.diagnostics().ready,false);assert.equal(store.diagnostics().metrics.sharedSparseBytes,0);assert.deepEqual(store.evidence().verifiedScalars,[]);f.cleanup();}finally{release();Object.defineProperty(globalThis,'crypto',descriptor);}
 const readyFixture=fixture(),readyStore=createBinaryFieldStore(readyFixture.metadata);await prepare(readyStore,readyFixture);const cache=readyStore.createFrameCache(),slot=cache.frame(2);readyFixture.cleanup();readyFixture.cleanup();assert.equal(slot.bytes,null);assert.throws(()=>cache.frame(3),/disposed/);assert.equal(readyStore.diagnostics().metrics.denseBytes,0);
 const auditFixture=fixture(),auditStore=createBinaryFieldStore(auditFixture.metadata),auditAbort=new AbortController();await prepare(auditStore,auditFixture);await assert.rejects(auditStore.auditFrames(()=>auditAbort.abort(),{signal:auditAbort.signal}),{name:'AbortError'});assert.equal(auditStore.diagnostics().metrics.denseBytes,0);auditFixture.cleanup();
});
test('fixed payload ceilings are unchanged and unsupported kinds never become accepted resources',()=>{
 assert.equal(PAYLOAD_LIMITS.sourceBytes,64*1024**2);assert.equal(PAYLOAD_LIMITS.sparseBytes,96*1024**2);assert.equal(PAYLOAD_LIMITS.compressedBytes,96*1024**2);assert.equal(PAYLOAD_LIMITS.chunks,256);assert.equal(PAYLOAD_LIMITS.chunkSourceBytes,2*1024**2);assert.equal(PAYLOAD_LIMITS.chunkSparseBytes,4*1024**2);
});
test('already-aborted signals and the fixed preparation deadline clear staged ownership before any factory can exist',async()=>{
 const aborted=fixture(),abortedStore=createBinaryFieldStore(aborted.metadata),controller=new AbortController();controller.abort();await assert.rejects(prepare(abortedStore,aborted,controller.signal),{name:'AbortError'});assert.equal(aborted.stats().takes,0);assert.equal(abortedStore.diagnostics().metrics.stagedSparseBytes,0);aborted.cleanup();
 const f=fixture(),store=createBinaryFieldStore(f.metadata),saved=globalThis.setTimeout;let deadlineSeen=false;
 try{globalThis.setTimeout=(fn,ms,...rest)=>{if(ms===120000){deadlineSeen=true;return saved(fn,0,...rest);}return saved(fn,ms,...rest);};await assert.rejects(prepare(store,f),{name:'TimeoutError'});}finally{globalThis.setTimeout=saved;f.cleanup();}
 assert.equal(deadlineSeen,true);assert.equal(store.diagnostics().ready,false);assert.equal(store.diagnostics().metrics.stagedSparseBytes,0);assert.equal(store.diagnostics().metrics.sharedSparseBytes,0);
});
