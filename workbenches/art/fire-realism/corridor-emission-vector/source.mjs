// Manifest metadata only; never imports an asset namespace or reads data bodies.
import {createHash} from 'node:crypto';
export const CONTROL_COMMIT='f93828adf59c96398b1b9c7e623ed5fefaf5de03';
export const CONTROL_ROOT='assets/art/fire-realism/fluid-contact-corridor-source-diagnostic-01/';
export const ENTRY='assets/art/fire-realism/corridor-emission-vector.js';
export const HELPER='assets/art/fire-realism/corridor-emission-vector-transfer.js';
export const MANIFEST_PIN=Object.freeze({bytes:80047,sha256:'b975e2eff7466190a4e528cfdff1a276a5bd17599e59cbe1e1b01d3a7a73490b'});
const sha=s=>createHash('sha256').update(s).digest('hex');
export function deriveManifest(baseText,entryText,helperText){
 if(Buffer.byteLength(baseText)!==MANIFEST_PIN.bytes||sha(baseText)!==MANIFEST_PIN.sha256)throw Error('Exact frozen f938 manifest required');
 if(typeof entryText!=='string'||typeof helperText!=='string')throw Error('Actual new source bytes required');
 const old=JSON.parse(baseText),m=structuredClone(old);if(old.runtimeFiles.length!==62||old.runtimeResources.length!==193||old.rawGatesPassed!==false||old.admitted!==false||old.presentationContract!=='common-linear-hdr-neutral-v1')throw Error('Exact failed common HDR control required');
 m.id='tinderbox-corridor-corner-emission-vector';m.artistVersion='0.1.0-corridor-corner-vector';m.status='unaccepted-fixed-field-corner-emission-vector';m.referenceAccepted=false;m.referenceFrozen=false;m.optimizedAvailable=false;
 m.factoryExport='createCorridorEmissionVectorDiagnostic';m.prepareExport='prepareCorridorEmissionVectorData';
 m.runtimeFiles=[...old.runtimeFiles,{path:ENTRY,bytes:Buffer.byteLength(entryText),sha256:sha(entryText)},{path:HELPER,bytes:Buffer.byteLength(helperText),sha256:sha(helperText)}].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 m.limits.esmBytes=m.runtimeFiles.reduce((n,v)=>n+v.bytes,0);if(m.limits.esmBytes>64*1024**2)throw Error('Existing source ceiling exceeded');
 m.opticalControl={dataCommit:CONTROL_COMMIT,originalManifestSha256:MANIFEST_PIN.sha256,response:'Uncalibrated F squared times excess-proxy palette percorner; fullvector spatial/temporalfilter then existingG once',flameCoefficient:6,flameExtinctionCoefficient:0,paletteEndpoints:'Unchanged',smokeHeat:'Original filteredT/3 unchanged',commonPresentation:'common-linear-hdr-neutral-v1',rendererExposure:1,noAdditionalFetchPassStoreOrData:true};
 m.provenance={dataControl:old.provenance,opticalExperiment:{authorityCommit:'e771defaae95f5493b004d28ba231eee193bf183',layoutAmendment:'1e3d6943b375b68f72f77f1346ae5118226a82de',controlCommit:CONTROL_COMMIT,source:'workbenches/art/fire-realism/corridor-emission-vector',scope:'Only additive wrapper/helper and private fragment transfer; original full257file assettree remains immutable. No physical calibration, native or cost acceptance.'}};
 m.reviewLimitations=[...(Array.isArray(old.reviewLimitations)?old.reviewLimitations:[old.reviewLimitations]),'Uncalibrated optical response only. Weakroots/height or orangefilledbody fails. Arithmetic/nativecost unmeasured; no accepted reference, optimized equivalence or publication.'];
 return JSON.stringify(m,null,2)+'\n';
}
