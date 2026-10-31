/** Only the generated local aggregate sparse allowance changes; format and algorithms do not. */
import {createHash} from 'node:crypto';
export const CAPACITY_ADAPTATION=Object.freeze({canonicalBytes:6418,canonicalSha256:'5a3fa557caa064097405e55f0fe6b56af1a034520be4aaf5cdc8bf75fd5793d0',adaptedBytes:6418,adaptedSha256:'63a7123c6baba70b3c217f92b27be46f609ef43a186ef0245efd098ca1f27bd9',oldSparseBytes:100663296,sparseBytes:102760448,scope:'Local generated codec capacity literal only; FZP2 format and all arithmetic unchanged',architectProposalCommit:'3a5b681228af4c0989c50cba41c85b93f6cb1791'});
const BEFORE='sparseBytes:96*1024**2',AFTER='sparseBytes:98*1024**2',sha=b=>createHash('sha256').update(b).digest('hex');
export function adaptLocalCodec(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength!==CAPACITY_ADAPTATION.canonicalBytes||sha(bytes)!==CAPACITY_ADAPTATION.canonicalSha256)throw Error('Exact canonical codec required');
 const source=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength).toString('utf8');
 if(source.split(BEFORE).length!==2||source.includes(AFTER))throw Error('Exactly one sparse capacity literal required');
 const result=Buffer.from(source.replace(BEFORE,AFTER)),inverse=Buffer.from(result.toString('utf8').replace(AFTER,BEFORE));
 if(result.length!==CAPACITY_ADAPTATION.adaptedBytes||sha(result)!==CAPACITY_ADAPTATION.adaptedSha256||!inverse.equals(Buffer.from(bytes))||sha(inverse)!==CAPACITY_ADAPTATION.canonicalSha256)throw Error('Local capacity/inverse proof failed');
 return result;
}

export function verifyCapacityPlan(plan){
 const expected={sourceBytes:67108864,sparseBytes:102760448,compressedBytes:100663296,chunks:256,chunkCompressedBytes:2097152,chunkSparseBytes:4194304,seconds:180,qaBytes:67108864,generationOldSpaceMiB:512,polledRssBytes:536870912};
 if(JSON.stringify(Object.keys(plan.limits).sort())!==JSON.stringify(Object.keys(expected).sort())||Object.keys(expected).some(k=>plan.limits[k]!==expected[k]))throw Error('Only the exact sparse98 capacity plan is supported');
 for(const k of ['canonicalBytes','canonicalSha256','adaptedBytes','adaptedSha256','oldSparseBytes','sparseBytes'])if(plan.localCapacityAdaptation?.[k]!==CAPACITY_ADAPTATION[k])throw Error('Exact local codec capacity provenance required');
 return plan;
}
