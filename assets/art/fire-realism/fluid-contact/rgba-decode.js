// Original FZP1 -> caller-owned interleaved RGBA32F byte layout adapter.
// No scalar plane or backing-buffer scratch. Three constant DataView wrappers
// include packetRawBytes' header view; wrapper heap cost is engine-managed.
import {packetRawBytes} from './codec.js';
const HEADER=12,LITERAL=0x80000000,COUNT=0x7fffffff;
export function decodeZeroLiteralRGBA(packet,rgba,options){
 if(!options||typeof options!=='object'||Array.isArray(options))throw TypeError('Declare voxelCount, channelOffset and RGBA stride');const {voxelCount,channelOffset,stride=16}=options;
 if(!Number.isSafeInteger(voxelCount)||voxelCount<0||!Number.isSafeInteger(channelOffset)||channelOffset<0||channelOffset>12||channelOffset%4||stride!==16)throw RangeError('Expected nonnegative voxelCount, byte lane0/4/8/12 and stride16');
 const rawBytes=packetRawBytes(packet);if(rawBytes!==voxelCount*4)throw Error('Packet voxel count mismatch');if(!(rgba instanceof Uint8Array)||rgba.byteLength!==voxelCount*16)throw TypeError('Expected exact caller-owned RGBA byte view');
 if(rgba.byteLength&&packet.buffer===rgba.buffer&&packet.byteOffset<rgba.byteOffset+rgba.byteLength&&rgba.byteOffset<packet.byteOffset+packet.byteLength)throw Error('Packet and RGBA byte views must not overlap');
 const src=new DataView(packet.buffer,packet.byteOffset,packet.byteLength),dst=new DataView(rgba.buffer,rgba.byteOffset,rgba.byteLength),packets=src.getUint32(8,true);let at=HEADER,written=0;
 // Validate the complete stream first: malformed input cannot partially change
 // an existing current/next upload buffer. This pass allocates no run table.
 if(packets>voxelCount)throw Error('Too many scalar packets');for(let i=0;i<packets;i++){
  if(at+4>packet.byteLength)throw Error('Truncated packet tag');const tag=src.getUint32(at,true),count=tag&COUNT;at+=4;if(!count||count>voxelCount-written)throw Error('Invalid scalar packet run');
  if(tag&LITERAL){if(at+count*4>packet.byteLength)throw Error('Truncated scalar literal');at+=count*4;}written+=count;
 }
 if(written!==voxelCount||at!==packet.byteLength)throw Error('Incomplete scalar packet or trailing bytes');
 at=HEADER;let position=channelOffset;for(let i=0;i<packets;i++){
  const tag=src.getUint32(at,true),count=tag&COUNT;at+=4;
  if(tag&LITERAL){for(let j=0;j<count;j++,position+=16,at+=4)dst.setUint32(position,src.getUint32(at,true),true);}
  else for(let j=0;j<count;j++,position+=16)dst.setUint32(position,0,true);
 }
 return rgba;
}
