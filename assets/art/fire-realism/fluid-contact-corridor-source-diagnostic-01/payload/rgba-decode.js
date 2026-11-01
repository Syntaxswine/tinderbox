// FZP2 directly into one caller-owned RGBA32F byte lane. No scalar plane.
import {decodePacketLayout} from './codec.js';
export function decodeZeroLiteralRGBA(packet,rgba,options){
 if(!options||typeof options!=='object'||Array.isArray(options))throw TypeError('Declare voxelCount and RGBA byte lane');
 const {voxelCount,channelOffset,stride=16}=options;
 if(stride!==16||!Number.isSafeInteger(channelOffset)||channelOffset<0||channelOffset>12||channelOffset%4)throw RangeError('Expected RGBA stride16 and byte lane0/4/8/12');
 return decodePacketLayout(packet,rgba,{wordCount:voxelCount,channelOffset,stride});
}
