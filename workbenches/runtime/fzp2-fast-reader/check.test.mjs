import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as baseline from '../../../assets/art/fire-realism/field-payload-v2/codec.js';
import {decodeZeroLiteralRGBA as baselineRGBA} from '../../../assets/art/fire-realism/field-payload-v2/rgba-decode.js';
import * as candidate from './candidate.js';
import {executeFixedProtocol,summarizeProtocol,VALIDATION_ORDER,FULL_ORDER} from './protocol.mjs';

// Independent BigInt packer, not the canonical encoder or either literal reader.
function pack(base,width,runs){
 const bits=23+width,parts=[],words=[];
 for(const run of runs){
  const count=typeof run==='number'?run:run.length,tag=new Uint8Array(4);new DataView(tag.buffer).setUint32(0,count+(typeof run==='number'?0:0x80000000),true);parts.push(tag);
  if(typeof run==='number'){words.push(...Array(count).fill(0));continue;}
  let stream=0n,at=0n;
  for(const word of run){const high=BigInt(word>>>23),delta=(high-BigInt(base)+512n)%512n;if(delta>=1n<<BigInt(width))throw Error('Oracle high delta does not fit');const packed=(delta<<23n)|BigInt(word&0x7fffff);stream|=packed<<at;at+=BigInt(bits);words.push(word>>>0);}
  const bytes=new Uint8Array(Math.ceil(count*bits/8));for(let i=0;i<bytes.length;i++)bytes[i]=Number((stream>>BigInt(i*8))&255n);parts.push(bytes);
 }
 const packet=new Uint8Array(16+parts.reduce((n,p)=>n+p.length,0)),h=new DataView(packet.buffer);h.setUint32(0,0x32505a46,true);h.setUint32(4,words.length,true);h.setUint32(8,runs.length,true);h.setUint16(12,base,true);h.setUint8(14,width);let offset=16;for(const p of parts){packet.set(p,offset);offset+=p.length;}return {packet,words};
}
// Independent bit-by-bit BigInt unpacking oracle for successful generated cases.
function oracle(packet){
 const h=new DataView(packet.buffer,packet.byteOffset,packet.length),out=[],bits=23+h.getUint8(14),base=BigInt(h.getUint16(12,true));let at=16;
 for(let r=0;r<h.getUint32(8,true);r++){const tag=h.getUint32(at,true),count=tag&0x7fffffff;at+=4;if(!(tag&0x80000000)){out.push(...Array(count).fill(0));continue;}
  for(let i=0;i<count;i++){let packed=0n;for(let k=0;k<bits;k++){const bit=i*bits+k;packed|=BigInt((packet[at+Math.floor(bit/8)]>>bit%8)&1)<<BigInt(k);}out.push(Number((((base+(packed>>23n))&511n)<<23n)|(packed&0x7fffffn)));}at+=Math.ceil(count*bits/8);
 }return out;
}
function wordsOf(bytes){const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);return Array.from({length:bytes.length/4},(_,i)=>d.getUint32(i*4,true));}
function checked(packet,words){for(const impl of [baseline,candidate]){const out=new Uint8Array(words.length*4);impl.decodeZeroLiteral(packet,out);assert.deepEqual(wordsOf(out),words);assert.equal(impl.packetRawBytes(packet),out.length);}assert.deepEqual(oracle(packet),words);assert.deepEqual(candidate.validatePacket(packet),baseline.validatePacket(packet));}
function rejected(packet,wordCount){
 let expected;try{baseline.validatePacket(packet);}catch(e){expected=e;}assert.ok(expected,'Malformed oracle case must fail canonical validation');
 assert.throws(()=>candidate.validatePacket(packet),e=>e.constructor===expected.constructor&&e.message===expected.message);
 for(const impl of [baseline,candidate])for(const stride of [4,16]){const backing=new Uint8Array(13+wordCount*stride+11).fill(0xa5),out=backing.subarray(13,13+wordCount*stride),before=backing.slice();assert.throws(()=>impl.decodePacketLayout(packet,out,{wordCount,stride,channelOffset:stride===16?8:0}));assert.deepEqual(backing,before,'No early write or canary change on late-invalid input');}
}

test('all widths, base wrap and every reachable word bit offset match independent BigInt words across odd/un-aligned views',()=>{
 let seed=0x75a21b09;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 for(let width=0;width<=9;width++)for(const base of [0,127,256,511])for(const count of [1,2,3,7,8,9,17]){
  const words=Array.from({length:count},()=>{const delta=width?next()%2**width:0,high=(base+delta)&511;let low=next()&0x7fffff;if(!high&&!low)low=1;return ((high<<23)|low)>>>0;});const built=pack(base,width,[words,2,words.slice(0,1)]);
  for(let offset=0;offset<8;offset++){const backing=new Uint8Array(offset+built.packet.length+9).fill(0xdb),view=backing.subarray(offset,offset+built.packet.length);view.set(built.packet);checked(view,built.words);assert.ok(backing.subarray(offset+built.packet.length).every(x=>x===0xdb));}
 }
});
test('raw signed zero, subnormals, infinities and noncanonical NaN payloads preserve every uint32 bit',()=>{
 const raw=[0x80000000,1,0x007fffff,0x00800000,0x7f800000,0xff800000,0x7fc00001,0x7fa12345,0xffc54321,0x3f800000,0xffffffff],b=pack(0,9,[3,raw,2]);checked(b.packet,b.words);
 const literalZero=pack(0,9,[[1,0x7fc00001,0]]);rejected(literalZero.packet,literalZero.words.length);
});
test('all four RGBA lanes and unaligned output views preserve all other bytes and canaries',()=>{
 const b=pack(511,9,[[0x80000000,0xffc00001,1],2,[0x7f800000]]);
 for(const offset of [0,1,3,7])for(const lane of [0,4,8,12]){
  const backing=new Uint8Array(offset+b.words.length*16+5).fill(0x59),out=backing.subarray(offset,offset+b.words.length*16);candidate.decodeZeroLiteralRGBA(b.packet,out,{voxelCount:b.words.length,channelOffset:lane,stride:16});const d=new DataView(out.buffer,out.byteOffset,out.length);
  for(let i=0;i<b.words.length;i++)for(let j=0;j<16;j++)if(j>=lane&&j<lane+4)assert.equal(out[i*16+j],(b.words[i]>>>(8*(j-lane)))&255);else assert.equal(out[i*16+j],0x59);
  assert.ok(backing.subarray(0,offset).every(x=>x===0x59));assert.ok(backing.subarray(offset+out.length).every(x=>x===0x59));assert.equal(d.getUint32(lane,true),b.words[0]);
 }
});
test('late padding, final truncation/tag overflow/trailing data and all header checks reject atomically like baseline',()=>{
 const valid=pack(128,0,[[0x40000001],2,[0x40000003]]),variants=[];
 const mutate=fn=>{const p=valid.packet.slice();fn(p,new DataView(p.buffer));variants.push(p);};
 mutate(p=>p[p.length-1]|=128);mutate((p,d)=>d.setUint32(p.length-7,0,true));mutate((p,d)=>d.setUint32(p.length-7,0x80000006,true));
 mutate((p,d)=>d.setUint32(0,0,true));mutate(p=>p[15]=1);mutate((p,d)=>d.setUint32(4,0,true));mutate((p,d)=>d.setUint32(8,0,true));mutate((p,d)=>d.setUint32(8,100,true));mutate((p,d)=>d.setUint16(12,512,true));mutate(p=>p[14]=10);
 variants.push(valid.packet.subarray(0,-1),new Uint8Array([...valid.packet,0]));for(const p of variants)rejected(p,valid.words.length);
 for(const width of [0,1,2,3,4,5,6,7,8,9]){const b=pack(128,width,[[0x40000001]]);for(let n=0;n<b.packet.length;n++)rejected(b.packet.subarray(0,n),1);}
});
test('layout, overlap, shared buffers and invalid options keep canonical failure classes before writes',()=>{
 const b=pack(128,0,[[0x40000001]]),out=new Uint8Array(16).fill(0x91);
 for(const options of [{wordCount:0,stride:16},{wordCount:1,stride:8},{wordCount:1,stride:16,channelOffset:2},{wordCount:2,stride:16}]){assert.throws(()=>candidate.decodePacketLayout(b.packet,out,options),RangeError);assert.ok(out.every(x=>x===0x91));}
 const backing=new Uint8Array(64);backing.set(b.packet,3);assert.throws(()=>candidate.decodePacketLayout(backing.subarray(3,3+b.packet.length),backing.subarray(8,24),{wordCount:1,stride:16}),/overlap/);
 for(const options of [undefined,null,[],1]){assert.throws(()=>candidate.decodeZeroLiteralRGBA(b.packet,out,options),TypeError);assert.throws(()=>baselineRGBA(b.packet,out,options),TypeError);}
 if(typeof SharedArrayBuffer==='function'){assert.throws(()=>candidate.validatePacket(new Uint8Array(new SharedArrayBuffer(32))),TypeError);assert.throws(()=>candidate.decodeZeroLiteral(b.packet,new Uint8Array(new SharedArrayBuffer(4))),TypeError);}
});
test('fixed reader allocates no explicit typed/backing scratch and canonical production bytes remain pinned',()=>{
 const built=pack(128,0,[[0x40000001,0x40000002]]),out=new Uint8Array(8),oldU8=globalThis.Uint8Array,oldAB=globalThis.ArrayBuffer;
 try{globalThis.Uint8Array=new Proxy(oldU8,{construct(){throw Error('Unexpected typed scratch');}});globalThis.ArrayBuffer=new Proxy(oldAB,{construct(){throw Error('Unexpected backing scratch');}});candidate.decodeZeroLiteral(built.packet,out);}finally{globalThis.Uint8Array=oldU8;globalThis.ArrayBuffer=oldAB;}
 assert.deepEqual(wordsOf(out),built.words);const raw=fs.readFileSync(new URL('../../../assets/art/fire-realism/field-payload-v2/codec.js',import.meta.url));assert.equal(createHash('sha256').update(raw).digest('hex'),'5a3fa557caa064097405e55f0fe6b56af1a034520be4aaf5cdc8bf75fd5793d0');
});

function tinyProtocol(){
 const frames=[1,2,3].map((frame,i)=>({frame,timeSeconds:i/30,resolution:[2,2,1]})),records=[],packets=[];let offset=0;
 for(const frame of frames)for(const channel of ['density','temperature','flame']){const built=pack(0,9,[[frame.frame,0x80000000,0x7fa12345,0xffffffff]]),raw=new Uint8Array(16),d=new DataView(raw.buffer);built.words.forEach((w,i)=>d.setUint32(i*4,w,true));records.push({frame:frame.frame,channel,rawBytes:16,rawSha256:createHash('sha256').update(raw).digest('hex'),offset,packetBytes:built.packet.length});offset+=built.packet.length;packets.push(built.packet);}
 const packetStore=new Uint8Array(offset);let at=0;for(const packet of packets){packetStore.set(packet,at);at+=packet.length;}return {frames,records,packetStore,warmupFrame:1};
}
test('small synthetic protocol fixes warmup/order, hashes every lane outside timers and owns only two reusable RGBA outputs',async()=>{
 const fixture=tinyProtocol(),before=fixture.packetStore.slice(),frames=[];const result=await executeFixedProtocol({...fixture,onFrame:row=>{frames.push(row.frame);}});
 assert.equal(result.status,'complete');assert.deepEqual(frames,[1,2,3]);assert.deepEqual(result.warmups.map(w=>w.frame),[1,1]);
 for(const row of result.frames){assert.deepEqual(row.validation.map(t=>t.implementation),VALIDATION_ORDER);assert.deepEqual(row.full.map(t=>t.implementation),FULL_ORDER);assert.equal(row.allWordsEqual,true);assert.equal(row.alphaZero,true);assert.ok(row.full.every(t=>t.ms>=0));}
 assert.deepEqual(result.verifiedHashes,{baseline:9,candidate:9});assert.equal(result.ownership.peakRGBABytes,128);assert.equal(result.ownership.verificationScratchBytes,16);assert.equal(result.ownership.ownedRGBABytesAfter,0);assert.deepEqual(fixture.packetStore,before);assert.equal(summarizeProtocol(result).bins.all.full.baseline.count,6);
});
test('original-hash mismatch and finite cancellation preserve partial records and clean explicit dense ownership',async()=>{
 const bad=tinyProtocol();bad.records[0].rawSha256='f'.repeat(64);const mismatch=await executeFixedProtocol(bad);assert.equal(mismatch.status,'failed');assert.match(mismatch.error.message,/original hash/);assert.equal(mismatch.frames.length,1);assert.equal(mismatch.ownership.ownedRGBABytesAfter,0);
 let calls=0;const cancelled=await executeFixedProtocol({...tinyProtocol(),check(){if(++calls===6)throw Error('Synthetic finite deadline');}});assert.equal(cancelled.status,'failed');assert.match(cancelled.error.message,/deadline/);assert.equal(cancelled.ownership.ownedScratchBytesAfter,0);
});
