/** Source-only derivation of one fixed control; no field/geometry evaluation. */
import {createHash} from 'node:crypto';
export const PROPOSAL='cbcaa51c99880974c409f837765929d5c32e7bf5';
export const SOURCE_COMMIT='f63711f1e0ffe2316ebc993fe04013ab152956ee';
export const SOURCE_ROOT='assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/';
export const ENTRY='assets/art/fire-realism/fluid-half-rate-matched-opacity.js';
export const FACTORY_PIN=Object.freeze({bytes:13701,sha256:'df2fd1c2db58b72c96f59d20d3a15ce583d982ac0d34028af53bb94b62866a43'});
export const MANIFEST_PIN=Object.freeze({bytes:77153,sha256:'38847490e2a348f92964e717c6e7da2604b952950e95fcb3a7a71cc1726a8ace'});
export const sha=source=>createHash('sha256').update(source).digest('hex');
export const EDITS=Object.freeze([
 ["'0.1.0-half-rate-failed-terminal-diagnostic'","'0.1.0-half-rate-matched-opacity-control'"],
 ['function prepareHalfRateDiagnosticData(','function prepareHalfRateMatchedOpacityData('],
 ['function halfRateDiagnosticPayloadEvidence(','function halfRateMatchedOpacityPayloadEvidence('],
 ['function auditHalfRateDiagnosticRGBA(','function auditHalfRateMatchedOpacityRGBA('],
 ['function createHalfRateContactDiagnostic(','function createHalfRateMatchedOpacityControl('],
 ["'Unaccepted exact cfe01 half-rate diagnostic'","'Unaccepted exact cfe01 half-rate matched-opacity control'"],
 ["emissionAbsorptionFragment(original.fragmentShader,'smoke-only')","emissionAbsorptionFragment(original.fragmentShader,'matched-opacity')"],
 ["emissionVariantUniform('smoke-only')","emissionVariantUniform('matched-opacity')"],
 ["variant:'exact-half-rate-failed-terminal-fixed6r'","variant:'exact-half-rate-failed-terminal-fixed6r-matched-opacity6'"],
 ["fixedFlameEmissivity:6,scope:'Same fixed6r smoke-only optical generators, actual source clock/A/depth and two slots; distinct measured half-rate support. Unaccepted diagnostic only; no native quality/cost credit.'",
  "fixedFlameEmissivity:6,fixedFlameExtinctionCoefficient:6,scope:'Same fixed6r emission; existing matched-opacity6 extinction control, actual source clock/A/depth and two slots; identical measured half-rate support. Unaccepted diagnostic only; no native quality/cost credit.'"]
].map(Object.freeze));
const need=(value,message)=>{if(!value)throw Error(message);};
const once=(source,before,after)=>{need(source.split(before).length===2,'Expected exactly one frozen source term');return source.replace(before,after);};
function imports(source,forward){
 let count=0;
 const out=source.replace(/^import (.+?) from (['"])\.\/([^'"]+)\2;$/gm,(line,bindings,q,file)=>{
  count++;
  if(!forward){need(file.startsWith('fluid-contact-half-rate-diagnostic-02/'),'Unexpected rebased import');file=file.slice('fluid-contact-half-rate-diagnostic-02/'.length);}
  else file='fluid-contact-half-rate-diagnostic-02/'+file;
  return 'import '+bindings+' from '+q+'./'+file+q+';';
 });
 need(count===10,'Exact ten static imports required');return out;
}
export function deriveFactory(frozen){
 need(Buffer.byteLength(frozen)===FACTORY_PIN.bytes&&sha(frozen)===FACTORY_PIN.sha256,'Frozen factory pin mismatch');
 let out=imports(frozen,true);for(const [before,after]of EDITS)out=once(out,before,after);return out;
}
export function recoverFactory(candidate){
 let out=candidate;for(const [before,after]of [...EDITS].reverse())out=once(out,after,before);out=imports(out,false);
 need(Buffer.byteLength(out)===FACTORY_PIN.bytes&&sha(out)===FACTORY_PIN.sha256,'Inverse source delta does not recover original');return out;
}
export function deriveManifest(frozenManifest,candidate){
 need(Buffer.byteLength(frozenManifest)===MANIFEST_PIN.bytes&&sha(frozenManifest)===MANIFEST_PIN.sha256,'Frozen manifest pin mismatch');recoverFactory(candidate);
 const m=JSON.parse(frozenManifest),oldIndex=SOURCE_ROOT+'index.js',original=m.runtimeFiles.find(r=>r.path===oldIndex);
 need(original?.bytes===FACTORY_PIN.bytes&&original.sha256===FACTORY_PIN.sha256&&m.runtimeFiles.length===61&&m.runtimeResources.length===193&&m.rawGatesPassed===false&&m.admitted===false,'Exact unadmitted frozen closure required');
 m.id='tinderbox-half-rate-matched-opacity-control';m.artistVersion='0.1.0-half-rate-matched-opacity-control';m.status='unaccepted-exact-failed-terminal-matched-opacity-control';
 m.factoryExport='createHalfRateMatchedOpacityControl';m.prepareExport='prepareHalfRateMatchedOpacityData';
 m.runtimeFiles=m.runtimeFiles.filter(r=>r.path!==oldIndex).concat({path:ENTRY,bytes:Buffer.byteLength(candidate),sha256:sha(candidate)}).sort((a,b)=>a.path.localeCompare(b.path,'en'));
 m.limits.esmBytes=m.runtimeFiles.reduce((bytes,record)=>bytes+record.bytes,0);
 m.opticalControl={commit:'930553024d54297e4aeefb1cb33273de595a8eeb',variant:'fixed6r-matched-opacity6',fixedFlameEmissivity:6,fixedFlameExtinctionCoefficient:6,unchangedGenerators:true,sharedKernelGLSL:true,normalization:'Existing diagnostic coefficient; not calibrated physics or radiometry'};
 m.provenance.matchedOpacityControl={proposalCommit:PROPOSAL,sourceCommit:SOURCE_COMMIT,sourceFactory:{path:oldIndex,...FACTORY_PIN},sourceManifest:{path:SOURCE_ROOT+'manifest.json',...MANIFEST_PIN},staticImportsRebased:10,immutableDependencies:60,unchangedBinaryRecords:193,sourceDelta:'Only rebased static imports, four export names, diagnostic identity and two existing mode selections. One module-level store serves factory/prepare/audit/evidence.',priorCPUDataAudit:{reportBytes:368236,reportSha256:'41a1c74f85987a7dc831a6bf7e6531de7c23e61e5ab289fdc1aaeae728bb37f7',scope:'Inherited exact immutable data proof, not an execution or visual approval of this new control'}};
 m.reviewLimitations+=' Fixed matched-opacity control only: j=6r*displayFire+ks*displaySoot, k=ks+6r; no gain/palette/source change. Source-only checks do not establish native morphology, pixel equality, raw qualification/admission or GPU cost.';
 return JSON.stringify(m,null,2)+'\n';
}
