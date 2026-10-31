// Original Tinderbox FZP2: positive-zero runs and lossless shared-high-bit literals.
// Format: proposal 529203e / 49238ac. FZP1 remains a separate immutable consumer.
export const PAYLOAD_LIMITS=Object.freeze({sourceBytes:64*1024**2,sparseBytes:98*1024**2,compressedBytes:96*1024**2,chunks:256,chunkSourceBytes:2*1024**2,chunkSparseBytes:4*1024**2,targetChunkSparseBytes:256*1024,frameRawBytes:16*1024**2});
const MAGIC=0x32505a46,HEADER=16,LITERAL=0x80000000,COUNT=0x7fffffff,MANTISSA=0x800000;
function requireBytes(value){
 if(!(value instanceof Uint8Array)||typeof SharedArrayBuffer==='function'&&value.buffer instanceof SharedArrayBuffer)throw TypeError('Expected unshared Uint8Array bytes');
 return value;
}
function rawView(raw){
 requireBytes(raw);if(!raw.length||raw.length%4||raw.length>PAYLOAD_LIMITS.frameRawBytes)throw RangeError('Bounded nonempty f32LE bytes required');
 return new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
}
function eachRun(raw,visit){
 const src=rawView(raw),words=raw.length/4;
 for(let first=0;first<words;){const zero=src.getUint32(first*4,true)===0;let end=first+1;while(end<words&&(src.getUint32(end*4,true)===0)===zero)end++;visit(first,end-first,zero,src);first=end;}
}
export function encodeZeroLiteral(raw){
 const src=rawView(raw),words=raw.length/4;let runs=0,literals=0,minHigh=512,maxHigh=-1;
 eachRun(raw,(first,count,zero)=>{runs++;if(!zero){literals+=count;for(let i=first;i<first+count;i++){const high=src.getUint32(i*4,true)>>>23;minHigh=Math.min(minHigh,high);maxHigh=Math.max(maxHigh,high);}}});
 const base=literals?minHigh:0,width=literals?Math.ceil(Math.log2(maxHigh-minHigh+1)):0,bits=23+width;
 let length=HEADER;eachRun(raw,(_,count,zero)=>{length+=4+(zero?0:Math.ceil(count*bits/8));});
 if(!Number.isSafeInteger(length)||length>PAYLOAD_LIMITS.chunkSparseBytes)throw RangeError('FZP2 packet exceeds decoded chunk bound');
 const packet=new Uint8Array(length),dst=new DataView(packet.buffer);dst.setUint32(0,MAGIC,true);dst.setUint32(4,words,true);dst.setUint32(8,runs,true);dst.setUint16(12,base,true);dst.setUint8(14,width);let at=HEADER;
 eachRun(raw,(first,count,zero)=>{
  dst.setUint32(at,count+(zero?0:LITERAL),true);at+=4;if(zero)return;
  let accumulator=0,held=0;
  for(let i=first;i<first+count;i++){
   const word=src.getUint32(i*4,true),packed=((word>>>23)-base)*MANTISSA+(word&0x7fffff);
   // At most 39 integer bits: safely below Number's exact 53-bit range.
   accumulator+=packed*2**held;held+=bits;
   while(held>=8){packet[at++]=accumulator%256;accumulator=Math.floor(accumulator/256);held-=8;}
  }
  if(held)packet[at++]=accumulator;
 });
 if(at!==length)throw Error('FZP2 encoder extent mismatch');return packet;
}
function literals(packet,at,count,bits,base,visit){
 const end=at+Math.ceil(count*bits/8),unit=2**bits;let accumulator=0,held=0;
 for(let i=0;i<count;i++){
  while(held<bits){accumulator+=packet[at++]*2**held;held+=8;}
  const packed=accumulator%unit;accumulator=Math.floor(accumulator/unit);held-=bits;
  const high=(base+Math.floor(packed/MANTISSA))&511;
  visit((high*MANTISSA+packed%MANTISSA)>>>0,i);
 }
 if(at!==end||accumulator!==0)throw Error('Nonzero FZP2 padding or literal boundary');return at;
}
export function validatePacket(packet){
 requireBytes(packet);if(packet.length<HEADER||packet.length>PAYLOAD_LIMITS.chunkSparseBytes)throw RangeError('Truncated or oversized FZP2 header');
 const src=new DataView(packet.buffer,packet.byteOffset,packet.byteLength),words=src.getUint32(4,true),runs=src.getUint32(8,true),base=src.getUint16(12,true),width=src.getUint8(14);
 if(src.getUint32(0,true)!==MAGIC||src.getUint8(15)!==0)throw Error('Wrong FZP2 magic/reserved');
 if(!words||words>PAYLOAD_LIMITS.frameRawBytes/4||!runs||runs>words||runs*4>packet.length-HEADER)throw RangeError('Invalid FZP2 word/run count');
 if(base>511||width>9)throw RangeError('Invalid FZP2 high base/width');
 let at=HEADER,written=0,literalWords=0;
 for(let i=0;i<runs;i++){
  if(at+4>packet.length)throw Error('Truncated FZP2 tag');const tag=src.getUint32(at,true),count=tag&COUNT;at+=4;
  if(!count||count>words-written)throw Error('Zero/overflowing FZP2 run');
  if(tag&LITERAL){const size=Math.ceil(count*(23+width)/8);if(size>packet.length-at)throw Error('Truncated FZP2 literal');at=literals(packet,at,count,23+width,base,word=>{if(word===0)throw Error('Positive zero must use a zero run');});literalWords+=count;}
  written+=count;
 }
 if(written!==words||at!==packet.length)throw Error('Incomplete FZP2 output or trailing bytes');
 if(!literalWords&&(base!==0||width!==0))throw Error('All-zero FZP2 must use base/width zero');
 return Object.freeze({words,runs,base,width,rawBytes:words*4});
}
export function packetRawBytes(packet){return validatePacket(packet).rawBytes;}

// Shared scalar/RGBA writer. No run table or dense scalar scratch is allocated.
// This API validates layout and the COMPLETE stream before its first write.
export function decodePacketLayout(packet,output,{wordCount,channelOffset=0,stride=4}={}){
 if(!Number.isSafeInteger(wordCount)||wordCount<1||!Number.isSafeInteger(channelOffset)||stride!==4&&stride!==16||channelOffset<0||channelOffset>=stride||channelOffset%4||stride===4&&channelOffset!==0)throw RangeError('Invalid scalar/RGBA layout');
 requireBytes(output);if(output.length!==wordCount*stride||output.length>PAYLOAD_LIMITS.frameRawBytes)throw RangeError('Expected exact bounded caller output');
 requireBytes(packet);if(packet.buffer===output.buffer&&packet.byteOffset<output.byteOffset+output.length&&output.byteOffset<packet.byteOffset+packet.length)throw Error('Packet/output views overlap');
 const h=validatePacket(packet);if(h.words!==wordCount)throw Error('FZP2 voxel count mismatch');
 const src=new DataView(packet.buffer,packet.byteOffset,packet.byteLength),dst=new DataView(output.buffer,output.byteOffset,output.byteLength);let at=HEADER,written=0;
 for(let i=0;i<h.runs;i++){
  const tag=src.getUint32(at,true),count=tag&COUNT;at+=4;
  if(tag&LITERAL)at=literals(packet,at,count,23+h.width,h.base,(word,j)=>dst.setUint32((written+j)*stride+channelOffset,word,true));
  else for(let j=0;j<count;j++)dst.setUint32((written+j)*stride+channelOffset,0,true);
  written+=count;
 }
 return output;
}
export function decodeZeroLiteral(packet,output){
 requireBytes(output);return decodePacketLayout(packet,output,{wordCount:output.length/4,stride:4,channelOffset:0});
}
