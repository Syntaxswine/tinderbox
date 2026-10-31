/** Original finite binary field bootstrap/cache. No fetch, renderer or frame Promise. */
import {PAYLOAD_LIMITS,decodeZeroLiteral} from './codec.js';
import {decodeZeroLiteralRGBA} from './rgba-decode.js';
const NAMES=['density','temperature','flame'],hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s),integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
async function hash(bytes){if(!globalThis.crypto?.subtle)throw Error('Web Crypto is required');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export function createBinaryFieldStore(metadata){
  const m=metadata;
  if(m.version!==1||!Array.isArray(m.frames)||!m.frames.length||m.frames.length>193||m.records?.length!==m.frames.length*3||!Array.isArray(m.chunks)||!m.chunks.length||m.chunks.length>256||!integer(m.sparseBytes,1,PAYLOAD_LIMITS.sparseBytes))throw Error('Invalid bounded finite field metadata');
  const frames=new Map(),records=new Map();let offset=0,voxelCount=null;
  for(const frame of m.frames){const count=frame.resolution?.reduce((a,b)=>a*b,1);if(!integer(frame.frame,1,193)||frames.has(frame.frame)||!Number.isFinite(frame.timeSeconds)||!Array.isArray(frame.resolution)||frame.resolution.length!==3||frame.resolution.some(n=>!integer(n,1,96))||!integer(count,1,96**3)||voxelCount!==null&&count!==voxelCount)throw Error('Invalid finite field frame');voxelCount=count;frames.set(frame.frame,{...frame,records:new Map()});}
  for(const record of m.records){const frame=frames.get(record.frame);if(!frame||!NAMES.includes(record.channel)||records.has(record.id)||frame.records.has(record.channel)||record.offset!==offset||record.rawBytes!==voxelCount*4||!integer(record.packetBytes,12,4*1024*1024)||!hex(record.packetSha256)||!hex(record.rawSha256))throw Error('Invalid finite scalar packet record');records.set(record.id,record);frame.records.set(record.channel,record);offset+=record.packetBytes;}
  if(offset!==m.sparseBytes||[...frames.values()].some(f=>f.records.size!==3))throw Error('Incomplete finite scalar coverage');
  let compressedTotal=0,chunkOffset=0;const assigned=new Set(),resourcePaths=new Set();
  for(let i=0;i<m.chunks.length;i++){const chunk=m.chunks[i];if(chunk.id!==i||chunk.offset!==chunkOffset||typeof chunk.resourcePath!=='string'||!chunk.resourcePath.endsWith('.fzp.gz')||!integer(chunk.gzipBytes,1,2*1024*1024)||!integer(chunk.sparseBytes,1,4*1024*1024)||!hex(chunk.gzipSha256)||!Array.isArray(chunk.recordIds))throw Error('Invalid binary field chunk');if(resourcePaths.has(chunk.resourcePath))throw Error('Duplicate binary resource path');resourcePaths.add(chunk.resourcePath);let end=chunk.offset;
    for(const id of chunk.recordIds){const record=records.get(id);if(!record||assigned.has(id)||record.offset!==end)throw Error('Invalid binary chunk packet coverage');assigned.add(id);end+=record.packetBytes;}
    if(end-chunk.offset!==chunk.sparseBytes)throw Error('Invalid binary chunk extent');chunkOffset=end;compressedTotal+=chunk.gzipBytes;
  }
  if(chunkOffset!==m.sparseBytes||assigned.size!==records.size||compressedTotal>96*1024*1024)throw Error('Binary field total ceiling/coverage failed');
  const rgbaBytes=voxelCount*16;if(rgbaBytes>PAYLOAD_LIMITS.frameRawBytes)throw Error('RGBA frame exceeds ceiling');
  let begun=false,ready=false,epoch=0,shared=null,activeCache=null,verified=[];
  const metrics={preparations:0,inflations:0,verifiedScalars:0,sharedSparseBytes:0,stagedSparseBytes:0,denseBuffers:0,denseBytes:0,frameDecodes:0,peakDenseBytes:0,declaredCompressedBytes:compressedTotal,peakTransferredCompressedBytes:0,peakStreamOutputBytes:0,peakVerificationScratchBytes:0,peakCombinedExplicitLoadBytes:0,loadMilliseconds:null};
  const report=()=>({ready,frames:frames.size,scalarRecords:records.size,chunks:m.chunks.length,metrics:{...metrics},bufferOwnership:'Shared sparse and static geometry are document-lived; only TWO RGBA upload slots belong to the live factory. Compiled source/JS objects/browser gzip/crypto/GC residency are unmeasured.',finiteAsset:true,referenceAccepted:false});
  async function prepare({resources,signal,registerCleanup}={}){
    if(begun)throw Error('Binary field preparation already began; cold document required');begun=true;
    if(!resources||!Array.isArray(resources.records)||typeof resources.take!=='function'||typeof registerCleanup!=='function')throw Error('Loader-verified resource provider/cleanup required');
    const supplied=new Map(resources.records.map(r=>[r.path,r]));if(supplied.size!==m.chunks.length||resources.records.length!==m.chunks.length)throw Error('Missing/extra declared binary fields');
    for(const c of m.chunks){const r=supplied.get(c.resourcePath);if(!r||r.kind!=='fzp1-gzip'||r.bytes!==c.gzipBytes||r.sha256!==c.gzipSha256||r.uncompressedBytes!==c.sparseBytes)throw Error('Verified resource metadata differs from field source');}
    const mine=++epoch,started=performance.now();let staged=null,reader=null,transferred=null,retainedCompressed=compressedTotal,rolled=false,rejectAbort;
    const aborted=new Promise((_,reject)=>{rejectAbort=reject;});aborted.catch(()=>{});
    function rollback(){if(rolled)return;rolled=true;epoch++;ready=false;shared=null;staged=null;transferred=null;activeCache?.dispose();metrics.sharedSparseBytes=metrics.stagedSparseBytes=0;verified=[];if(reader)reader.cancel().catch(()=>{});rejectAbort(signal?.reason instanceof Error?signal.reason:new Error('Binary field preparation cancelled/rolled back'));}
    registerCleanup(rollback); // Exactly one synchronous/idempotent rollback, before first take.
    const check=()=>{if(rolled||mine!==epoch||signal?.aborted)throw signal?.reason instanceof Error?signal.reason:new Error('Binary field preparation aborted');};
    const onAbort=()=>rollback();signal?.addEventListener('abort',onAbort,{once:true});
    const timer=setTimeout(()=>{rollback();},120000);
    const step=async promise=>{const result=await Promise.race([promise,aborted]);check();return result;};
    const peak=(stream=0,scratch=0)=>{metrics.peakStreamOutputBytes=Math.max(metrics.peakStreamOutputBytes,stream);metrics.peakVerificationScratchBytes=Math.max(metrics.peakVerificationScratchBytes,scratch);metrics.peakCombinedExplicitLoadBytes=Math.max(metrics.peakCombinedExplicitLoadBytes,retainedCompressed+(transferred?.byteLength||0)+m.sparseBytes+stream+scratch);};
    try{
      check();if(typeof DecompressionStream!=='function')throw Error('Native gzip DecompressionStream required');staged=new Uint8Array(m.sparseBytes);metrics.stagedSparseBytes=staged.byteLength;metrics.preparations++;peak();
      for(const c of m.chunks){
        check();transferred=resources.take(c.resourcePath);if(!(transferred instanceof Uint8Array)||transferred.byteLength!==c.gzipBytes)throw Error('Verified resource transfer extent mismatch');retainedCompressed-=transferred.byteLength;metrics.peakTransferredCompressedBytes=Math.max(metrics.peakTransferredCompressedBytes,transferred.byteLength);peak();
        reader=new Blob([transferred]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();let written=0,complete=false;
        try{for(;;){const piece=await step(reader.read());if(piece.done){complete=true;break;}if(written+piece.value.byteLength>c.sparseBytes)throw Error('Gzip expansion exceeds declared field chunk');staged.set(piece.value,c.offset+written);written+=piece.value.byteLength;peak(piece.value.byteLength);}if(written!==c.sparseBytes)throw Error('Incomplete binary field gzip output');}
        finally{if(!complete)await reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}reader=null;}
        metrics.inflations++;transferred=null;
        for(const id of c.recordIds){
          check();const r=records.get(id),packet=staged.subarray(r.offset,r.offset+r.packetBytes);if(await step(hash(packet))!==r.packetSha256)throw Error('Binary scalar packet hash mismatch');
          let scratch=new Uint8Array(r.rawBytes);peak(0,scratch.byteLength);decodeZeroLiteral(packet,scratch);const actual=await step(hash(scratch));if(actual!==r.rawSha256)throw Error('Decoded original scalar hash mismatch:'+r.id);scratch=null;verified.push({id:r.id,frame:r.frame,channel:r.channel,bytes:r.rawBytes,sha256:actual});metrics.verifiedScalars++;
        }
      }
      check();if(verified.length!==records.size||retainedCompressed!==0)throw Error('Incomplete verified finite fields');shared=staged;staged=null;ready=true;metrics.sharedSparseBytes=shared.byteLength;metrics.stagedSparseBytes=0;metrics.loadMilliseconds=performance.now()-started;return report();
    }catch(error){rollback();throw error;}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);transferred=null;}
  }
  function createFrameCache(){
    if(!ready||!shared)throw Error('Synchronous fluid factory requires completed verified preparation');if(activeCache)throw Error('Dispose the existing finite field owner before another');
    const littleEndian=new Uint8Array(new Uint32Array([0x12345678]).buffer)[0]===0x78;if(!littleEndian)throw Error('RGBA raw-float upload requires a little-endian host');
    const cacheEpoch=epoch,slots=[0,1].map(id=>{const bytes=new Uint8Array(rgbaBytes);return{id,bytes,floats:new Float32Array(bytes.buffer),frame:null,version:0,last:0};});let closed=false,clock=0;const pair=[null,null];
    metrics.denseBuffers=2;metrics.denseBytes=rgbaBytes*2;metrics.peakDenseBytes=Math.max(metrics.peakDenseBytes,metrics.denseBytes);
    function frame(number){
      if(closed||cacheEpoch!==epoch||!ready)throw Error('Finite frame cache is disposed/invalid');const data=frames.get(number);if(!data)throw Error('Finite frame outside source');
      let slot=slots.find(s=>s.frame===number);if(!slot){slot=slots.find(s=>s.frame===null)||slots.reduce((a,b)=>a.last<=b.last?a:b);
        for(let lane=0;lane<3;lane++){const r=data.records.get(NAMES[lane]);decodeZeroLiteralRGBA(shared.subarray(r.offset,r.offset+r.packetBytes),slot.bytes,{voxelCount,channelOffset:lane*4,stride:16});}
        slot.frame=number;slot.version++;metrics.frameDecodes++;
      }slot.last=++clock;return slot;
    }
    const cache={frame,framePair(a,b){pair[0]=frame(a);pair[1]=frame(b);return pair;},reset(){if(closed)return;for(const slot of slots){slot.frame=null;slot.last=0;}},diagnostics:report,dispose(){if(closed)return;closed=true;for(const slot of slots){slot.bytes=slot.floats=null;slot.frame=null;}pair[0]=pair[1]=null;metrics.denseBuffers=metrics.denseBytes=0;if(activeCache===cache)activeCache=null;}};
    activeCache=cache;return cache;
  }
  async function auditFrames(callback,{signal}={}){
    if(typeof callback!=='function')throw Error('A host-owned independent RGBA audit callback is required');
    const cache=createFrameCache();let completed=0;
    try{for(const frame of m.frames){
      if(signal?.aborted)throw signal.reason||new Error('RGBA audit cancelled');
      const pair=cache.framePair(frame.frame,Math.min(m.frames.length,frame.frame+1));
      await callback({frame:frame.frame,timeSeconds:frame.timeSeconds,resolution:[...frame.resolution],rgba:pair[0].bytes,ownership:'Borrowed current slot; host must not retain/mutate; validity ends at eviction/disposal'});completed++;
      if(signal?.aborted)throw signal.reason||new Error('RGBA audit cancelled');
    }return{frames:completed,scope:'Cold independent host audit, not per-frame rendering or quality evidence'};}finally{cache.dispose();}
  }
  return {prepare,createFrameCache,auditFrames,diagnostics:report,evidence(){return{...report(),verifiedScalars:verified.map(r=>({...r})),source:m.source,resourceHashes:m.chunks.map(c=>({path:c.resourcePath,sha256:c.gzipSha256,bytes:c.gzipBytes,uncompressedBytes:c.sparseBytes}))};}};
}
