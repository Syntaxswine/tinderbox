// Original bounded FZP2 bootstrap and two-slot RGBA owner. No fetch or renderer.
import {PAYLOAD_LIMITS,decodeZeroLiteral} from './codec.js';
import {decodeZeroLiteralRGBA} from './rgba-decode.js';
const NAMES=['density','temperature','flame'],FRAME_COUNT=193,PREPARE_MS=120000;
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const clone=v=>structuredClone(v);
function fields(value,expected){if(!value||Array.isArray(value)||Object.keys(value).length!==expected.length||expected.some(k=>!Object.hasOwn(value,k)))throw Error('Invalid metadata fields');}
function snapshot(value){
 let nodes=0,text=0;const active=new WeakSet();
 function copy(v,depth){
  if(++nodes>30000||depth>12)throw Error('Metadata exceeds structural bound');
  if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return v;
  if(typeof v==='string'){text+=v.length;if(v.length>8192||text>2*1024**2)throw Error('Metadata text exceeds bound');return v;}
  if(!v||typeof v!=='object'||active.has(v))throw Error('Metadata must be acyclic JSON');
  const array=Array.isArray(v);if(!array&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)throw Error('Metadata must contain plain JSON');
  const descriptors=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(descriptors);if(keys.some(k=>typeof k!=='string'))throw Error('Metadata symbol fields are unsupported');
  active.add(v);let out;
  if(array){
   const size=descriptors.length.value;if(!integer(size,0,4096)||keys.length!==size+1)throw Error('Invalid bounded metadata array');out=[];
   for(let i=0;i<size;i++){const d=descriptors[i];if(!d||!Object.hasOwn(d,'value'))throw Error('Metadata holes/accessors are unsupported');out.push(copy(d.value,depth+1));}
  }else{
   out=Object.create(null);
   for(const key of keys){const d=descriptors[key];if(!d.enumerable||!Object.hasOwn(d,'value')||key.length>128)throw Error('Metadata accessors/non-JSON fields are unsupported');text+=key.length;out[key]=copy(d.value,depth+1);}
  }
  active.delete(v);return Object.freeze(out);
 }
 const out=copy(value,0);if(JSON.stringify(out).length>2*1024**2)throw Error('Metadata JSON exceeds bound');return out;
}
function resourcePath(path){return typeof path==='string'&&path.startsWith('assets/art/fire-realism/')&&path.endsWith('.fzp.gz')&&path.split('/').every(p=>/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(p));}
function validate(metadata){
 const m=snapshot(metadata);fields(m,['version','source','frames','records','chunks','sparseBytes']);
 if(m.version!==2||!Array.isArray(m.frames)||m.frames.length!==FRAME_COUNT||!Array.isArray(m.records)||m.records.length!==FRAME_COUNT*3||!Array.isArray(m.chunks)||m.chunks.length!==FRAME_COUNT||!integer(m.sparseBytes,1,PAYLOAD_LIMITS.sparseBytes))throw Error('Invalid bounded metadata version2');
 if(!m.source||Array.isArray(m.source)||['rawManifestSha256','settingsSha256','prepareReportSha256','sourceBlendSha256'].some(k=>!hex(m.source[k])))throw Error('Required immutable original source hashes');
 let voxelCount=null,shape=null,offset=0,compressed=0;const frames=new Map(),paths=new Set();
 for(let i=0;i<FRAME_COUNT;i++){
  const f=m.frames[i];fields(f,['frame','timeSeconds','resolution']);
  if(f.frame!==i+1||f.timeSeconds!==i/30||!Array.isArray(f.resolution)||f.resolution.length!==3||f.resolution.some(n=>!integer(n,1,96)))throw Error('Invalid finite frame clock/resolution');
  const count=f.resolution.reduce((a,b)=>a*b,1),key=f.resolution.join(',');if(!integer(count*16,16,PAYLOAD_LIMITS.frameRawBytes)||shape!==null&&shape!==key)throw Error('Inconsistent or oversized RGBA frame');
  shape=key;voxelCount=count;frames.set(f.frame,{metadata:f,records:[]});
 }
 for(let i=0;i<m.records.length;i++){
  const r=m.records[i];fields(r,['id','frame','channel','offset','packetBytes','packetSha256','rawBytes','rawSha256']);
  if(r.id!==i||r.frame!==Math.floor(i/3)+1||r.channel!==NAMES[i%3]||r.offset!==offset||r.rawBytes!==voxelCount*4||!integer(r.packetBytes,20,PAYLOAD_LIMITS.chunkSparseBytes)||!hex(r.packetSha256)||!hex(r.rawSha256))throw Error('Invalid ordered scalar record');
  offset+=r.packetBytes;if(offset>PAYLOAD_LIMITS.sparseBytes)throw Error('Retained packet ceiling exceeded');frames.get(r.frame).records.push(r);
 }
 if(offset!==m.sparseBytes)throw Error('Incomplete retained packet extent');offset=0;
 for(let i=0;i<m.chunks.length;i++){
  const c=m.chunks[i];fields(c,['id','kind','offset','sparseBytes','gzipBytes','gzipSha256','resourcePath','recordIds']);
  if(c.id!==i||c.kind!=='fzp2-gzip'||c.offset!==offset||!integer(c.sparseBytes,1,PAYLOAD_LIMITS.chunkSparseBytes)||!integer(c.gzipBytes,1,PAYLOAD_LIMITS.chunkSourceBytes)||!hex(c.gzipSha256)||!resourcePath(c.resourcePath)||paths.has(c.resourcePath.toLowerCase())||!Array.isArray(c.recordIds)||c.recordIds.length!==3||c.recordIds.some((id,lane)=>id!==i*3+lane))throw Error('Invalid whole-frame FZP2 resource');
  const size=c.recordIds.reduce((sum,id)=>sum+m.records[id].packetBytes,0);if(size!==c.sparseBytes||m.records[i*3].offset!==c.offset)throw Error('Invalid whole-frame resource extent');
  paths.add(c.resourcePath.toLowerCase());offset+=size;compressed+=c.gzipBytes;if(compressed>PAYLOAD_LIMITS.compressedBytes)throw Error('Compressed aggregate ceiling exceeded');
 }
 if(offset!==m.sparseBytes)throw Error('Incomplete whole-frame coverage');return{m,frames,voxelCount,compressed};
}
async function hash(bytes){
 if(!globalThis.crypto?.subtle)throw Error('Web Crypto required');
 const result=await globalThis.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(result),n=>n.toString(16).padStart(2,'0')).join('');
}
function cancelled(signal){return signal?.reason instanceof Error?signal.reason:new DOMException('FZP2 preparation aborted','AbortError');}
function retireReader(reader){if(!reader)return;try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}

export function createBinaryFieldStore(metadata){
 const {m,frames,voxelCount,compressed}=validate(metadata),rgbaBytes=voxelCount*16;
 let begun=false,ready=false,epoch=0,shared=null,activeCache=null,verified=[];
 const metrics={preparations:0,inflations:0,verifiedScalars:0,sharedSparseBytes:0,stagedSparseBytes:0,denseBuffers:0,denseBytes:0,peakDenseBytes:0,frameDecodes:0,declaredCompressedBytes:compressed,peakTransferredCompressedBytes:0,peakStreamOutputBytes:0,peakVerificationScratchBytes:0,peakCombinedExplicitLoadBytes:0,loadMilliseconds:null};
 function diagnostics(){return{version:2,format:'FZP2',ready,frames:FRAME_COUNT,scalarRecords:m.records.length,chunks:m.chunks.length,metrics:{...metrics},factoryGpuOwnedBytes:0,bufferOwnership:'Shared packets last until explicit bootstrap cleanup/document retirement. Only TWO RGBA CPU slots belong to the live cache; the consuming factory owns its GPU textures. Compiled source/JS objects/native gzip/crypto/GC residency are unmeasured.',finiteAsset:true,referenceAccepted:false};}
 async function prepare({resources,signal,registerCleanup}={}){
  if(begun)throw Error('Field preparation already began; cold store required');begun=true;
  const mine=++epoch,started=performance.now();let staged=null,reader=null,transferred=null,remaining=compressed,rolled=false,timer=null,rejectAbort,abortReason=null;
  const aborted=new Promise((_,reject)=>{rejectAbort=reject;});aborted.catch(()=>{});
  function rollback(reason=cancelled(signal)){
   if(rolled)return;rolled=true;abortReason=reason;epoch++;ready=false;shared=null;staged=null;transferred=null;verified=[];activeCache?.dispose();metrics.sharedSparseBytes=metrics.stagedSparseBytes=0;
   retireReader(reader);reader=null;rejectAbort(reason);
  }
  const check=()=>{if(rolled||mine!==epoch||signal?.aborted)throw abortReason||cancelled(signal);};
  const step=async promise=>{const result=await Promise.race([promise,aborted]);check();return result;};
  const peak=(stream=0,scratch=0)=>{metrics.peakStreamOutputBytes=Math.max(metrics.peakStreamOutputBytes,stream);metrics.peakVerificationScratchBytes=Math.max(metrics.peakVerificationScratchBytes,scratch);metrics.peakCombinedExplicitLoadBytes=Math.max(metrics.peakCombinedExplicitLoadBytes,remaining+(transferred?.byteLength||0)+m.sparseBytes+stream+scratch);};
  const onAbort=()=>rollback();
  try{
   if(!resources||!Array.isArray(resources.records)||resources.records.length!==m.chunks.length||typeof resources.take!=='function'||typeof registerCleanup!=='function'||signal&&typeof signal.addEventListener!=='function')throw Error('Loader-verified resources/signal/cleanup required');
   const supplied=new Map();for(const r of resources.records){fields(r,['path','kind','bytes','sha256','uncompressedBytes']);if(supplied.has(r.path))throw Error('Duplicate verified resource');supplied.set(r.path,r);}
   for(const c of m.chunks){const r=supplied.get(c.resourcePath);if(!r||r.kind!=='fzp2-gzip'||r.bytes!==c.gzipBytes||r.sha256!==c.gzipSha256||r.uncompressedBytes!==c.sparseBytes)throw Error('Verified resources differ from immutable FZP2 metadata');}
   const take=resources.take.bind(resources);registerCleanup(rollback); // Exactly once, before first transfer/allocation.
   signal?.addEventListener('abort',onAbort,{once:true});timer=setTimeout(()=>rollback(new DOMException('FZP2 preparation deadline exceeded','TimeoutError')),PREPARE_MS);check();
   if(typeof DecompressionStream!=='function'||!globalThis.crypto?.subtle)throw Error('Native gzip/Web Crypto required');
   staged=new Uint8Array(m.sparseBytes);metrics.stagedSparseBytes=staged.byteLength;metrics.preparations++;peak();
   for(const c of m.chunks){
    check();transferred=take(c.resourcePath);if(!(transferred instanceof Uint8Array)||transferred.byteLength!==c.gzipBytes)throw Error('Transferred gzip extent mismatch');remaining-=transferred.byteLength;metrics.peakTransferredCompressedBytes=Math.max(metrics.peakTransferredCompressedBytes,transferred.byteLength);peak();
    if(await step(hash(transferred))!==c.gzipSha256)throw Error('Transferred gzip hash mismatch');
    const ownedReader=new Blob([transferred]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();reader=ownedReader;let written=0,complete=false;
    try{
     for(;;){const next=await step(ownedReader.read());if(next.done){complete=true;break;}if(!(next.value instanceof Uint8Array)||written+next.value.byteLength>c.sparseBytes)throw Error('Gzip expansion exceeds declared chunk');staged.set(next.value,c.offset+written);written+=next.value.byteLength;peak(next.value.byteLength);}
     if(written!==c.sparseBytes)throw Error('Incomplete gzip output');
    }finally{if(!complete)retireReader(ownedReader);else{try{ownedReader.releaseLock();}catch{}}if(reader===ownedReader)reader=null;}
    metrics.inflations++;transferred=null;
    for(const id of c.recordIds){
     check();const r=m.records[id],packet=staged.subarray(r.offset,r.offset+r.packetBytes);if(await step(hash(packet))!==r.packetSha256)throw Error('Scalar packet hash mismatch');
     let scratch=new Uint8Array(r.rawBytes);peak(0,scratch.byteLength);decodeZeroLiteral(packet,scratch);const actual=await step(hash(scratch));if(actual!==r.rawSha256)throw Error('Original scalar hash mismatch');scratch=null;
     verified.push({id:r.id,frame:r.frame,channel:r.channel,bytes:r.rawBytes,sha256:actual});metrics.verifiedScalars++;
    }
   }
   check();if(remaining!==0||verified.length!==m.records.length)throw Error('Incomplete original field verification');
   shared=staged;staged=null;ready=true;metrics.sharedSparseBytes=shared.byteLength;metrics.stagedSparseBytes=0;metrics.loadMilliseconds=performance.now()-started;return diagnostics();
  }catch(error){rollback();throw error;}
  finally{if(timer!==null)clearTimeout(timer);signal?.removeEventListener?.('abort',onAbort);transferred=null;}
 }
 function createFrameCache(){
  if(!ready||!shared)throw Error('Synchronous field factory requires completed preparation');if(activeCache)throw Error('Dispose the existing field cache before another');
  if(new Uint8Array(new Uint32Array([0x12345678]).buffer)[0]!==0x78)throw Error('RGBA uploads require a little-endian host');
  const cacheEpoch=epoch,pair=[null,null],pairView=[];let closed=false,clock=0;
  Object.defineProperties(pairView,{0:{enumerable:true,get(){return pair[0];}},1:{enumerable:true,get(){return pair[1];}}});Object.freeze(pairView);
  const slots=[0,1].map(id=>{const bytes=new Uint8Array(rgbaBytes),slot={bytes,floats:new Float32Array(bytes.buffer),frame:null,version:0,last:0,view:null};slot.view=Object.freeze({id,get bytes(){return slot.bytes;},get floats(){return slot.floats;},get frame(){return slot.frame;},get version(){return slot.version;},get last(){return slot.last;}});return slot;});
  metrics.denseBuffers=2;metrics.denseBytes=rgbaBytes*2;metrics.peakDenseBytes=Math.max(metrics.peakDenseBytes,metrics.denseBytes);
  function frame(number){
   if(closed||cacheEpoch!==epoch||!ready)throw Error('Field cache disposed/invalid');const data=frames.get(number);if(!data)throw RangeError('Frame outside finite source');
   let slot=slots.find(s=>s.frame===number);
   if(!slot){slot=slots.find(s=>s.frame===null)||slots.reduce((a,b)=>a.last<=b.last?a:b);slot.bytes.fill(0);
    for(let lane=0;lane<3;lane++){const r=data.records[lane];decodeZeroLiteralRGBA(shared.subarray(r.offset,r.offset+r.packetBytes),slot.bytes,{voxelCount,channelOffset:lane*4,stride:16});}
    slot.frame=number;slot.version++;metrics.frameDecodes++;
   }
   slot.last=++clock;return slot.view;
  }
  const cache={frame,framePair(a,b){pair[0]=frame(a);pair[1]=frame(b);return pairView;},reset(){if(closed)return;clock=0;for(const s of slots){s.frame=null;s.last=0;}},diagnostics,dispose(){if(closed)return;closed=true;for(const s of slots){s.bytes=s.floats=null;s.frame=null;}pair[0]=pair[1]=null;metrics.denseBuffers=metrics.denseBytes=0;if(activeCache===cache)activeCache=null;}};
  Object.freeze(cache);activeCache=cache;return cache;
 }
 async function auditFrames(callback,{signal}={}){
  if(typeof callback!=='function')throw TypeError('Host-owned independent RGBA audit callback required');if(signal?.aborted)throw cancelled(signal);
  const cache=createFrameCache();let completed=0;
  try{for(const f of m.frames){if(signal?.aborted)throw cancelled(signal);const pair=cache.framePair(f.frame,Math.min(FRAME_COUNT,f.frame+1));await callback({frame:f.frame,timeSeconds:f.timeSeconds,resolution:[...f.resolution],rgba:pair[0].bytes,ownership:'Borrowed slot; do not mutate or retain after eviction/disposal'});completed++;if(signal?.aborted)throw cancelled(signal);}return{frames:completed,scope:'Independent host cold audit, not per-frame rendering/quality evidence'};}finally{cache.dispose();}
 }
 return Object.freeze({prepare,createFrameCache,auditFrames,diagnostics,evidence(){return{...diagnostics(),verifiedScalars:clone(verified),source:clone(m.source),resourceHashes:m.chunks.map(c=>({path:c.resourcePath,kind:c.kind,sha256:c.gzipSha256,bytes:c.gzipBytes,uncompressedBytes:c.sparseBytes}))};}});
}
