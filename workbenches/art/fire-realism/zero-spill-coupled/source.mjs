// JSON/source strings only: no data namespace import or resource read.
import {createHash} from 'node:crypto';
export const CONTROL_COMMIT='34af2a3f091f05054387602291cf1876cd741606',ENTRY='assets/art/fire-realism/zero-spill-coupled.js',HELPER='assets/art/fire-realism/zero-spill-coupled-transfer.js';
export const MANIFEST_PIN=Object.freeze({bytes:82964,sha256:'f19a492547520893b7dad9fb658d15847481a8fab8f6b9ff49a6a4bff7de7934'});
const sha=x=>createHash('sha256').update(x).digest('hex');
export function deriveManifest(baseText,entryText,helperText){
 if(Buffer.byteLength(baseText)!==MANIFEST_PIN.bytes||sha(baseText)!==MANIFEST_PIN.sha256)throw Error('Exact unadmitted R40 manifest required');
 const old=JSON.parse(baseText),m=structuredClone(old);if(old.runtimeFiles.length!==66||old.runtimeResources.length!==193||old.rawGatesPassed!==false||old.admitted!==false||old.presentationContract!=='common-linear-hdr-neutral-v1')throw Error('Exact R40 closure required');
 m.id='tinderbox-zero-spill-coupled';m.artistVersion='0.1.0-zero-local-spill-causal-control';m.status='unaccepted-local-spill-causal-ablation';m.referenceAccepted=m.referenceFrozen=m.optimizedAvailable=m.actualInputGridProof=false;m.factoryExport='createZeroSpillCoupledDiagnostic';m.prepareExport='prepareZeroSpillCoupledData';
 m.runtimeFiles=[...old.runtimeFiles,{path:ENTRY,bytes:Buffer.byteLength(entryText),sha256:sha(entryText)},{path:HELPER,bytes:Buffer.byteLength(helperText),sha256:sha(helperText)}].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);m.limits.esmBytes=m.runtimeFiles.reduce((n,r)=>n+r.bytes,0);if(m.limits.esmBytes>64*1024**2)throw Error('Existing source ceiling exceeded');
 m.lightingControl={delegateCommit:CONTROL_COMMIT,originalManifestSha256:MANIFEST_PIN.sha256,sourcePointLight:{color:'0xff8d35',position:[5.5,.3,8.5],distance:4.5,decay:2,initialIntensity:0},ablation:'Only owned intensity forced zero after delegated updates; requested and applied intensities disclosed.',retainedOwnedLights:1,zeroGpuWorkClaim:false,finalUnlitProduct:false,usefulR:false};
 m.provenance={previousControl:old.provenance,zeroSpillExperiment:{authority:'344202f12ea2756508f60e14de393cce0b83c737',delegate:CONTROL_COMMIT,source:'workbenches/art/fire-realism/zero-spill-coupled',scope:'Causal component removal, no fitted replacement light or optical/data changes.'}};
 m.reviewLimitations=[...old.reviewLimitations,'Zero local spill is a causal ablation, not a final unlit product, useful R, cost optimization or accepted morphology. Original raw97/50positive and98zero remain. Native comparison requires separate authorization.'];return JSON.stringify(m,null,2)+'\n';
}
