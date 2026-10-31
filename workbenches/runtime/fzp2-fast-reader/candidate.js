// Additive QA experiment authorized by proposal 5bdfea9; no production importer.
// Header/layout checks preserve original Tinderbox FZP2 codec 5a3fa557...5793d0.
// Only the literal reader differs. Both validation and writing remain full passes.
import {PAYLOAD_LIMITS} from '../../../assets/art/fire-realism/field-payload-v2/codec.js';
export {PAYLOAD_LIMITS};
const MAGIC=0x32505a46,HEADER=16,LITERAL=0x80000000,COUNT=0x7fffffff;
function requireBytes(value){
 if(!(value instanceof Uint8Array)||typeof SharedArrayBuffer==='function'&&value.buffer instanceof SharedArrayBuffer)throw TypeError('Expected unshared Uint8Array bytes');
 return value;
}

function literals(packet,at,count,bits,base,visit){
 const end=at+Math.ceil(count*bits/8),mask=bits===32?0xffffffff:0xffffffff>>>(32-bits);
 let byte=at,shift=0;
 for(let i=0;i<count;i++){
  const available=end-byte;if(available<1)throw Error('Nonzero FZP2 padding or literal boundary');
  // Every load stays inside THIS literal segment, including its final1..3 bytes.
  let window=packet[byte];
  if(available>1)window|=packet[byte+1]<<8;
  if(available>2)window|=packet[byte+2]<<16;
  if(available>3)window|=packet[byte+3]<<24;
  let packed=window>>>shift;
  if(shift+bits>32){if(available<5)throw Error('Nonzero FZP2 padding or literal boundary');packed|=packet[byte+4]<<(32-shift);}
  packed=(packed&mask)>>>0;
  const high=(base+(packed>>>23))&511;
  visit(((high<<23)|(packed&0x7fffff))>>>0,i);
  const next=shift+bits;byte+=next>>>3;shift=next&7;
 }
 if(byte+(shift?1:0)!==end||shift&&(packet[byte]>>>shift)!==0)throw Error('Nonzero FZP2 padding or literal boundary');
 return end;
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
export function decodeZeroLiteral(packet,output){requireBytes(output);return decodePacketLayout(packet,output,{wordCount:output.length/4,stride:4,channelOffset:0});}
export function decodeZeroLiteralRGBA(packet,rgba,options){
 if(!options||typeof options!=='object'||Array.isArray(options))throw TypeError('Declare voxelCount and RGBA byte lane');
 const {voxelCount,channelOffset,stride=16}=options;
 if(stride!==16||!Number.isSafeInteger(channelOffset)||channelOffset<0||channelOffset>12||channelOffset%4)throw RangeError('Expected RGBA stride16 and byte lane0/4/8/12');
 return decodePacketLayout(packet,rgba,{wordCount:voxelCount,channelOffset,stride});
}
