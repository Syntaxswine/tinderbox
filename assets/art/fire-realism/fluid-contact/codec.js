// Original probe codec. Positive zero alone is sparse; all other f32LE bits are literals.
export const PAYLOAD_LIMITS=Object.freeze({sourceBytes:64*1024*1024,sparseBytes:96*1024*1024,chunks:256,chunkSourceBytes:2*1024*1024,chunkSparseBytes:4*1024*1024,targetChunkSparseBytes:256*1024,frameRawBytes:16*1024*1024});
const MAGIC=0x31505a46,HEADER=12,LITERAL=0x80000000,COUNT=0x7fffffff;
function bytes(value){if(!(value instanceof Uint8Array)||value.byteLength%4)throw TypeError('Expected aligned f32LE bytes');return value;}
export function encodeZeroLiteral(raw){
 bytes(raw);const words=raw.byteLength/4;if(words>COUNT)throw RangeError('Too many scalar words');
 const output=new Uint8Array(HEADER+raw.byteLength*2),dst=new DataView(output.buffer),src=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);let at=HEADER,packets=0;
 for(let first=0;first<words;){const zero=src.getUint32(first*4,true)===0;let end=first+1;while(end<words&&end-first<COUNT&&(src.getUint32(end*4,true)===0)===zero)end++;
  const count=end-first;dst.setUint32(at,zero?count:(count|LITERAL)>>>0,true);at+=4;if(!zero){output.set(raw.subarray(first*4,end*4),at);at+=count*4;}packets++;first=end;
 }
 dst.setUint32(0,MAGIC,true);dst.setUint32(4,words,true);dst.setUint32(8,packets,true);return output.slice(0,at);
}
export function packetRawBytes(packet){bytes(packet);if(packet.byteLength<HEADER)throw Error('Truncated packet header');const src=new DataView(packet.buffer,packet.byteOffset,packet.byteLength);if(src.getUint32(0,true)!==MAGIC)throw Error('Wrong zero/literal packet version');return src.getUint32(4,true)*4;}
export function decodeZeroLiteral(packet,output){
 const rawBytes=packetRawBytes(packet);bytes(output);if(output.byteLength!==rawBytes)throw Error('Scalar output length mismatch');const src=new DataView(packet.buffer,packet.byteOffset,packet.byteLength),words=rawBytes/4,packets=src.getUint32(8,true);let at=HEADER,written=0;
 if(packets>words)throw Error('Too many scalar packets');for(let i=0;i<packets;i++){if(at+4>packet.byteLength)throw Error('Truncated packet tag');const tag=src.getUint32(at,true),count=tag&COUNT,literal=(tag&LITERAL)!==0;at+=4;if(!count||count>words-written)throw Error('Invalid scalar packet run');
  const end=(written+count)*4;if(literal){if(at+count*4>packet.byteLength)throw Error('Truncated scalar literal');output.set(packet.subarray(at,at+count*4),written*4);at+=count*4;}else output.fill(0,written*4,end);written+=count;
 }
 if(written!==words||at!==packet.byteLength)throw Error('Incomplete scalar packet or trailing bytes');return output;
}
