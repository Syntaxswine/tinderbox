/** Fixed source derivation only; never load field/geometry modules. */
import {createHash} from 'node:crypto';
export const PROPOSAL='083504206629c7b7c4cc918bf498f36cb72656d5';
export const SOURCE_COMMIT='f63711f1e0ffe2316ebc993fe04013ab152956ee';
export const ROOT='assets/art/fire-realism/',SOURCE_ROOT=ROOT+'fluid-contact-half-rate-diagnostic-02/';
export const ENTRY=ROOT+'fluid-half-rate-corner-square.js',ADAPTER=ROOT+'fluid-half-rate-corner-square-transfer.js';
export const FACTORY_PIN=Object.freeze({bytes:13701,sha256:'df2fd1c2db58b72c96f59d20d3a15ce583d982ac0d34028af53bb94b62866a43'});
export const MANIFEST_PIN=Object.freeze({bytes:77153,sha256:'38847490e2a348f92964e717c6e7da2604b952950e95fcb3a7a71cc1726a8ace'});
export const ADAPTER_PIN=Object.freeze({bytes:3104,sha256:'9b21493e2a003920f1b2b9bc330d546b9c7ac53c1c4c900bafcd77f508431f0e'});
export const sha=value=>createHash('sha256').update(value).digest('hex');
const need=(v,m)=>{if(!v)throw Error(m);};
const once=(s,a,b)=>{need(s.split(a).length===2,'Expected one exact source term');return s.replace(a,b);};
const NORMALIZED="normalizedEmissionFragment(emissionAbsorptionFragment(original.fragmentShader,'smoke-only'),GEOMETRY_METRICS.maxHullVertices)";
const IMPORT_LINE='import {cornerSquareEmissionFragment} '+'from '+JSON.stringify('./fluid-half-rate-corner-square-transfer.js')+';';
export const EDITS=Object.freeze([
 ["'0.1.0-half-rate-failed-terminal-diagnostic'","'0.1.0-half-rate-corner-square-control'"],
 ['function prepareHalfRateDiagnosticData(','function prepareHalfRateCornerSquareData('],
 ['function halfRateDiagnosticPayloadEvidence(','function halfRateCornerSquarePayloadEvidence('],
 ['function auditHalfRateDiagnosticRGBA(','function auditHalfRateCornerSquareRGBA('],
 ['function createHalfRateContactDiagnostic(','function createHalfRateCornerSquareControl('],
 ["'Unaccepted exact cfe01 half-rate diagnostic'","'Unaccepted exact cfe01 half-rate corner-square emission control'"],
 [NORMALIZED,'cornerSquareEmissionFragment('+NORMALIZED+',GEOMETRY_METRICS.maxHullVertices)'],
 ["variant:'exact-half-rate-failed-terminal-fixed6r'","variant:'exact-half-rate-corner-square-fixed6r-thin'"],
 ["fixedFlameEmissivity:6,scope:'Same fixed6r smoke-only optical generators, actual source clock/A/depth and two slots; distinct measured half-rate support. Unaccepted diagnostic only; no native quality/cost credit.'",
  "fixedFlameEmissivity:6,fixedFlameExtinctionCoefficient:0,emissionProxy:'filter(F_corner^2)',localMomentOnly:true,scope:'Same fixed6r smoke-only transport; emission weights filtered corner squares before linear eligibility. Unaccepted diagnostic only; no native quality/cost credit.'"]
].map(Object.freeze));
function rebase(source,forward){
 let count=0;const out=source.replace(/^import (.+?) from (['"])\.\/([^'"]+)\2;$/gm,(line,bindings,q,file)=>{
  count++;if(forward)file='fluid-contact-half-rate-diagnostic-02/'+file;
  else{need(file.startsWith('fluid-contact-half-rate-diagnostic-02/'),'Unexpected source import');file=file.slice('fluid-contact-half-rate-diagnostic-02/'.length);}
  return 'import '+bindings+' from '+q+'./'+file+q+';';
 });need(count===10,'Exact ten original imports required');return out;
}
export function deriveFactory(source){
 need(Buffer.byteLength(source)===FACTORY_PIN.bytes&&sha(source)===FACTORY_PIN.sha256,'Frozen stronger R31 factory required');
 let out=rebase(source,true);for(const [a,b]of EDITS)out=once(out,a,b);
 return once(out,'const FLUID_CONTACT_VERSION=',IMPORT_LINE+'\nconst FLUID_CONTACT_VERSION=');
}
export function recoverFactory(candidate){
 let out=once(candidate,IMPORT_LINE+'\n','');for(const [a,b]of [...EDITS].reverse())out=once(out,b,a);out=rebase(out,false);
 need(Buffer.byteLength(out)===FACTORY_PIN.bytes&&sha(out)===FACTORY_PIN.sha256,'Inverse source delta did not recover complete R31 factory');return out;
}
export function deriveManifest(source,candidate,adapter){
 need(Buffer.byteLength(source)===MANIFEST_PIN.bytes&&sha(source)===MANIFEST_PIN.sha256,'Original manifest pin changed');
 need(Buffer.byteLength(adapter)===ADAPTER_PIN.bytes&&sha(adapter)===ADAPTER_PIN.sha256,'Private adapter source pin changed');recoverFactory(candidate);
 const m=JSON.parse(source);need(m.runtimeFiles.length===61&&m.runtimeResources.length===193&&m.rawGatesPassed===false&&m.admitted===false,'Original failed-study closure required');
 m.id='tinderbox-half-rate-corner-square-emission-control';m.artistVersion='0.1.0-half-rate-corner-square-control';m.status='unaccepted-exact-failed-terminal-corner-square-control';
 m.factoryExport='createHalfRateCornerSquareControl';m.prepareExport='prepareHalfRateCornerSquareData';
 m.runtimeFiles=m.runtimeFiles.filter(r=>r.path!==SOURCE_ROOT+'index.js').concat({path:ENTRY,bytes:Buffer.byteLength(candidate),sha256:sha(candidate)},{path:ADAPTER,...ADAPTER_PIN}).sort((a,b)=>a.path.localeCompare(b.path,'en'));
 m.limits.esmBytes=m.runtimeFiles.reduce((n,r)=>n+r.bytes,0);
 m.opticalControl={commit:'930553024d54297e4aeefb1cb33273de595a8eeb',variant:'fixed6r-corner-square-thin',fixedFlameEmissivity:6,fixedFlameExtinctionCoefficient:0,emissionProxy:'spatial/temporal filter(F_corner^2)',storedFieldsUnchanged:true,normalization:'Floating reaction proxy; not bit-identical react, reaction rate, energy, Kelvin or radiometry'};
 m.provenance.cornerSquareControl={proposalCommit:PROPOSAL,sourceCommit:SOURCE_COMMIT,sourceFactory:{path:SOURCE_ROOT+'index.js',...FACTORY_PIN},sourceManifest:{path:SOURCE_ROOT+'manifest.json',...MANIFEST_PIN},privateAdapter:{path:ADAPTER,...ADAPTER_PIN,reversibleReplacementUnits:6,frozenInputFragment:{maxPlanes:28,bytes:5929,sha256:'e676feb9c86ef4e7dd3f43a24d7f4fc271c2882ad46e5f6f8ba64e23c59fbc02'}},sourceDelta:'Ten rebased original imports, one pure adapter import, four export names/diagnostic identity and adapter wrapper AFTER unchanged complete R31 normalized guard. One private store.',sampling:'Fourth LOCAL sampled moment only. Same eight spatial fetches per temporal texture and original RGB mix/clamp. Stored texture alpha/nativeA unchanged. Moment filtered before eligibility G once; rawF extinction/smoke/palette unchanged.',immutableDependencies:60,unchangedBinaryRecords:193,priorCPUDataAudit:{reportBytes:368236,reportSha256:'41a1c74f85987a7dc831a6bf7e6531de7c23e61e5ab289fdc1aaeae728bb37f7',scope:'Unchanged input proof only; not an execution/GPU/morphology approval of this moment'}};
 m.reviewLimitations+=' One corner-square emission hypothesis. F>1 may amplify;0<F<1 may lose upper height/roots. No gain/exposure/palette compensation, new source/bake, native quality/reference acceptance or cost credit.';
 return JSON.stringify(m,null,2)+'\n';
}
