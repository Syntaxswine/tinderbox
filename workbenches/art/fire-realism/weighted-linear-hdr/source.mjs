/** Exact additive source derivation only; no effect/data/geometry evaluation. */
import {createHash} from 'node:crypto';
export const PROPOSAL='a27014fa26e338b4a8ed144fc23d1280845ec2f3';
export const SOURCE_COMMIT='5ad453e7004a45e7864b07dd3e75a38017cadc47';
export const ROOT='assets/art/fire-realism/',DATA_ROOT=ROOT+'fluid-contact-weighted-source-diagnostic-01/';
export const ENTRY=ROOT+'fluid-weighted-linear-hdr.js',HELPER=ROOT+'fluid-weighted-linear-hdr-transfer.js';
export const CONTRACT='common-linear-hdr-neutral-v1';
export const FACTORY_PIN=Object.freeze({bytes:13747,sha256:'bff803911d5b8d7855fa1cb710ec4a6ca200f9a1220ed218c47359d77108a462'});
export const MANIFEST_PIN=Object.freeze({bytes:80624,sha256:'752dc485ab760c0ffa6121101969c3e114f6867f7825677c84464c7af4398c33'});
export const HELPER_PIN=Object.freeze({bytes:1666,sha256:'e60ac0c207aaeefd4fd873aefd0dab7727b583e8425e1192af2f21ce17f61d48'});
export const sha=value=>createHash('sha256').update(value).digest('hex');
const need=(ok,message)=>{if(!ok)throw Error(message);};
const once=(s,a,b)=>{need(s.split(a).length===2,'Expected one exact frozen source term');return s.replace(a,b);};
const quote=String.fromCharCode(39),HELPER_IMPORT='import {linearHdrEmissionFragment,requireLinearHdrPresentation,PRESENTATION_CONTRACT} from '+quote+'./fluid-weighted-linear-hdr-transfer.js'+quote+';\n';
export const EDITS=Object.freeze([
 ["const FLUID_CONTACT_VERSION=",HELPER_IMPORT+"const FLUID_CONTACT_VERSION="],
 ["'0.1.0-weighted-source-failed-terminal-diagnostic'","'0.1.0-weighted-linear-hdr-neutral-prototype'"],
 ['function prepareWeightedSourceDiagnosticData(','function prepareWeightedLinearHdrData('],
 ['function weightedSourceDiagnosticPayloadEvidence(','function weightedLinearHdrPayloadEvidence('],
 ['function auditWeightedSourceDiagnosticRGBA(','function auditWeightedLinearHdrRGBA('],
 ['function createWeightedSourceContactDiagnostic(T,options={}){','function createWeightedLinearHdrDiagnostic(T,options={}){\n  requireLinearHdrPresentation(options);'],
 ["'Unaccepted exact weighted01 source diagnostic'","'Unaccepted exact weighted01 common-linear-HDR diagnostic'"],
 ["fragmentShader:normalizedEmissionFragment(emissionAbsorptionFragment(original.fragmentShader,'smoke-only'),GEOMETRY_METRICS.maxHullVertices)","fragmentShader:linearHdrEmissionFragment(normalizedEmissionFragment(emissionAbsorptionFragment(original.fragmentShader,'smoke-only'),GEOMETRY_METRICS.maxHullVertices),GEOMETRY_METRICS.maxHullVertices)"],
 ["quality:'reference',diagnostic:","quality:'reference',presentationContract:PRESENTATION_CONTRACT,diagnostic:"],
 ["variant:'exact-weighted-source-failed-terminal-fixed6r'","variant:'exact-weighted-source-linear-hdr-fixed6F',presentationContract:PRESENTATION_CONTRACT,sourcePaletteEncoding:'linear-working-rgb'"],
 ["scope:'Same fixed6r smoke-only optical generators, actual source clock/A/depth and two slots; distinct measured weighted-source support. Unaccepted diagnostic only; no native quality/cost credit.'","scope:'Same5ad fields, fixed6F smoke-only integration/A/depth/clocks/two slots; local palette OETF removed for required common whole-scene linear-HDR Neutral/exposure1/final-sRGB presenter. Uncalibrated prototype; no reference/native/quality/cost acceptance.'"]
].map(Object.freeze));
function rebase(source,forward){
 let count=0;const out=source.replace(/^import (.+?) from (['"])\.\/([^'"]+)\2;$/gm,(line,names,q,file)=>{
  count++;if(forward)file='fluid-contact-weighted-source-diagnostic-01/'+file;else{need(file.startsWith('fluid-contact-weighted-source-diagnostic-01/'),'Unexpected frozen import root');file=file.slice('fluid-contact-weighted-source-diagnostic-01/'.length);}
  return 'import '+names+' from '+q+'./'+file+q+';';
 });need(count===10,'Exact ten original static imports required');return out;
}
export function deriveFactory(source){
 need(Buffer.byteLength(source)===FACTORY_PIN.bytes&&sha(source)===FACTORY_PIN.sha256,'Complete frozen5ad factory required');
 let out=rebase(source,true);for(const [a,b]of EDITS)out=once(out,a,b);return out;
}
export function recoverFactory(candidate){
 let out=candidate;for(const [a,b]of [...EDITS].reverse())out=once(out,b,a);out=rebase(out,false);
 need(Buffer.byteLength(out)===FACTORY_PIN.bytes&&sha(out)===FACTORY_PIN.sha256,'Inverse did not recover complete5ad factory');return out;
}
export function deriveManifest(source,candidate,helper){
 need(Buffer.byteLength(source)===MANIFEST_PIN.bytes&&sha(source)===MANIFEST_PIN.sha256,'Frozen5ad manifest required');recoverFactory(candidate);
 need(typeof helper==='string'&&Buffer.byteLength(helper)===HELPER_PIN.bytes&&sha(helper)===HELPER_PIN.sha256,'Exact complete linear-source helper required');
 const m=JSON.parse(source),oldIndex=DATA_ROOT+'index.js',old=m.runtimeFiles.find(p=>p.path===oldIndex);
 need(m.runtimeFiles.length===61&&m.runtimeResources.length===193&&old?.bytes===FACTORY_PIN.bytes&&old.sha256===FACTORY_PIN.sha256&&m.rawGatesPassed===false&&m.admitted===false,'Exact unadmitted frozen data closure required');
 m.id='tinderbox-weighted-common-linear-hdr-neutral';m.artistVersion='0.1.0-weighted-linear-hdr-neutral-prototype';m.status='unaccepted-common-linear-hdr-optical-prototype';
 m.presentationContract=CONTRACT;m.referenceAccepted=false;m.factoryExport='createWeightedLinearHdrDiagnostic';m.prepareExport='prepareWeightedLinearHdrData';
 m.runtimeFiles=m.runtimeFiles.filter(p=>p.path!==oldIndex).concat({path:ENTRY,bytes:Buffer.byteLength(candidate),sha256:sha(candidate)},{path:HELPER,bytes:Buffer.byteLength(helper),sha256:sha(helper)}).sort((a,b)=>a.path.localeCompare(b.path,'en'));
 m.limits.esmBytes=m.runtimeFiles.reduce((n,p)=>n+p.bytes,0);
 m.opticalControl={upstreamCommit:'930553024d54297e4aeefb1cb33273de595a8eeb',sourceAssetCommit:SOURCE_COMMIT,variant:'fixed6F-linear-working-smoke-only',fixedFlameEmissivity:6,fixedFlameExtinctionCoefficient:0,sourcePaletteOETF:false,commonPresentationContract:CONTRACT,normalization:'Unchanged authored palette/6 per native metre; common Neutral/exposure1 is an uncalibrated display-model prototype, not radiometry or Kelvin'};
 m.provenance.commonLinearHdr={proposalCommit:PROPOSAL,sourceCommit:SOURCE_COMMIT,sourceFactory:{path:oldIndex,...FACTORY_PIN},sourceManifest:{path:DATA_ROOT+'manifest.json',...MANIFEST_PIN},staticImportsRebased:10,immutableDependencies:60,unchangedBinaryRecords:193,sourcePaletteDelta:'Only eaDisplaySource identity replaces its local OETF after complete frozen normalized-fragment equality; associated emission/blend/march/source/opacity/clock/disposal unchanged.',oneModuleStore:true,helper:{path:HELPER,bytes:Buffer.byteLength(helper),sha256:sha(helper)},presentationOwner:'Runtime common RGBA16F whole-scene presenter; one Three r180 Neutral/exposure1/final sRGB, no per-prism tone map or alpha division',priorCPUDataAudit:{reportBytes:371149,reportSha256:'0f40aa568927cc2552704aaf618e13eee1c92ab210f7d014326dd3c65f35238e',scope:'Frozen input word identities only; this new entry was not prepared or rendered'}};
 m.reviewLimitations+=' Common linear-HDR changes the whole display model/world colors; no no-fire pixel equality is claimed. Requires the exact common presentation contract; unsupported HDR must refuse, never silently fall back. No calibrated temperature, native texture/GPU/visual/reference/optimized/cost acceptance or timing report. Raw97 failure, full support/overhang limitations and old controls remain.';
 return JSON.stringify(m,null,2)+'\n';
}
