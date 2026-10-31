import {createHash} from 'node:crypto';
import * as baseline from '../../../assets/art/fire-realism/field-payload-v2/codec.js';
import * as candidate from './candidate.js';
export const VALIDATION_ORDER=Object.freeze(['baseline','candidate','candidate','baseline']);
export const FULL_ORDER=Object.freeze(['candidate','baseline','baseline','candidate']);
export const WARMUP_FRAME=128;
const NAMES=['density','temperature','flame'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Core has no file/artist access. Small explicit fixtures test the protocol;
 * the CLI separately requires the exact native193-frame/dossier inventory. */
export async function executeFixedProtocol({frames,records,packetStore,warmupFrame=WARMUP_FRAME,now=()=>performance.now(),check=()=>{},onFrame=()=>{}}={}){
 if(!Array.isArray(frames)||!frames.length||frames.length>193||records?.length!==frames.length*3||!(packetStore instanceof Uint8Array))throw TypeError('Bounded frame/packet records required');
 const voxelCount=records[0].rawBytes/4,rgbaBytes=voxelCount*16;
 if(!Number.isSafeInteger(voxelCount)||voxelCount<1||rgbaBytes>baseline.PAYLOAD_LIMITS.frameRawBytes||packetStore.length>baseline.PAYLOAD_LIMITS.sparseBytes)throw RangeError('Protocol frame/store ceiling');
 const implementations={baseline,candidate},slots={baseline:new Uint8Array(rgbaBytes),candidate:new Uint8Array(rgbaBytes)};
 let scratch=new Uint8Array(voxelCount*4),views={baseline:new DataView(slots.baseline.buffer),candidate:new DataView(slots.candidate.buffer)},scratchView=new DataView(scratch.buffer);
 const warmups=[],results=[],owned={peakRGBABytes:rgbaBytes*2,verificationScratchBytes:scratch.length,packetStoreBytes:packetStore.length};
 let status='complete',error=null,verifiedHashes={baseline:0,candidate:0};
 const packetRecords=frame=>{
  const r=records.filter(r=>r.frame===frame.frame);if(r.length!==3)throw Error('Exactly D/T/F packets per frame');
  return r.map((record,lane)=>{if(record.channel!==NAMES[lane]||record.rawBytes!==voxelCount*4||!Number.isSafeInteger(record.offset)||!Number.isSafeInteger(record.packetBytes)||record.offset<0||record.packetBytes<20||record.offset+record.packetBytes>packetStore.length)throw Error('Invalid bounded protocol packet record');return {record,packet:packetStore.subarray(record.offset,record.offset+record.packetBytes)};});
 };
 function timed(name,stage,packets){
  check();const started=now(),impl=implementations[name];
  if(stage==='validation'){for(const {packet}of packets)if(impl.validatePacket(packet).words!==voxelCount)throw Error('Validation voxel count mismatch');}
  else{slots[name].fill(0);packets.forEach(({packet},lane)=>impl.decodePacketLayout(packet,slots[name],{wordCount:voxelCount,stride:16,channelOffset:lane*4}));}
  const ms=now()-started;check();return {implementation:name,stage,ms};
 }
 try{
  const warm=frames.find(frame=>frame.frame===warmupFrame);if(!warm)throw Error('Declared warmup frame absent');
  const warmPackets=packetRecords(warm);for(const name of ['baseline','candidate'])warmups.push({frame:warmupFrame,validation:timed(name,'validation',warmPackets),full:timed(name,'full',warmPackets)});
  for(const frame of frames){
   check();const packets=packetRecords(frame),row={frame:frame.frame,timeSeconds:frame.timeSeconds,resolution:[...frame.resolution],validation:[],full:[],hashes:{baseline:[],candidate:[]},allWordsEqual:false,alphaZero:false};results.push(row);
   for(const name of VALIDATION_ORDER)row.validation.push(timed(name,'validation',packets));
   for(const name of FULL_ORDER)row.full.push(timed(name,'full',packets));
   // Independent word comparison and hashes are outside both timing groups.
   for(let i=0;i<voxelCount;i++)for(let lane=0;lane<4;lane++){const a=views.baseline.getUint32(i*16+lane*4,true),b=views.candidate.getUint32(i*16+lane*4,true);if(a!==b||lane===3&&a!==0)throw Error('RGBA lane/reserved-word mismatch at frame '+frame.frame);}
   row.allWordsEqual=row.alphaZero=true;
   for(const name of ['baseline','candidate'])for(let lane=0;lane<3;lane++){
    for(let i=0;i<voxelCount;i++)scratchView.setUint32(i*4,views[name].getUint32(i*16+lane*4,true),true);
    const sha256=digest(scratch),expected=packets[lane].record.rawSha256;if(sha256!==expected)throw Error('Independent original hash mismatch at frame '+frame.frame+' '+name+' '+NAMES[lane]);
    row.hashes[name].push({frame:frame.frame,channel:NAMES[lane],bytes:scratch.length,sha256});verifiedHashes[name]++;
   }
   await onFrame(row);check();
  }
 }catch(cause){status='failed';error={name:cause.name,message:cause.message};}
 finally{slots.baseline=slots.candidate=null;views=scratchView=scratch=null;}
 return {version:1,kind:'fixed-FZP2-reader-CPU-protocol',status,error,warmupFrame,warmups,validationOrder:[...VALIDATION_ORDER],fullOrder:[...FULL_ORDER],frames:results,verifiedHashes,ownership:{...owned,ownedRGBABytesAfter:0,ownedScratchBytesAfter:0,packetStoreOwnership:'Caller-owned single immutable store; not copied by protocol'},scope:'Fixed CPU validation and full validation+zero-fill+write timings. No GPU/quality/browser or production acceptance; warmup/hash/comparison not timed.'};
}

export function summarizeProtocol(report){
 const stat=v=>{const a=v.slice().sort((x,y)=>x-y),n=a.length;return {count:n,median:n?a[Math.floor((n-1)/2)]:null,p95:n?a[Math.ceil(n*.95)-1]:null,min:n?a[0]:null,max:n?a.at(-1):null};};
 const bins={all:report.frames,'frames1..30':report.frames.filter(r=>r.frame<=30),'frames31..60':report.frames.filter(r=>r.frame>30&&r.frame<=60),'frames61..96':report.frames.filter(r=>r.frame>60&&r.frame<=96),'frames97..192':report.frames.filter(r=>r.frame>96&&r.frame<=192),frame193:report.frames.filter(r=>r.frame===193)};
 return {status:report.status,statistics:'Lower-middle median; nearest-rank p95. Fixed2 samples/implementation/frame/stage, no adaptive repeats.',bins:Object.fromEntries(Object.entries(bins).map(([bin,rows])=>[bin,Object.fromEntries(['validation','full'].map(stage=>[stage,Object.fromEntries(['baseline','candidate'].map(name=>[name,stat(rows.flatMap(row=>row[stage].filter(s=>s.implementation===name).map(s=>s.ms)))]))]))])),scope:'Raw CPU diagnostic distributions only; not a GPU rendering-cost ratio or repeatability/acceptance claim.'};
}
