/** One fixed interaction source derivation; no effect/data/geometry import. */
import {createHash} from 'node:crypto';
export const PROPOSAL='9ef4bc92bc48aac1e3bff06f114fe8e51e868892';
export const SOURCE_COMMIT='d4e1bf63a3a6b9084a5e431b8059691593ef5050';
export const ROOT='assets/art/fire-realism/',DATA_ROOT=ROOT+'fluid-contact-half-rate-diagnostic-02/';
export const SOURCE_ENTRY=ROOT+'fluid-half-rate-corner-square.js',SOURCE_MANIFEST=ROOT+'fluid-half-rate-corner-square.manifest.json';
export const ENTRY=ROOT+'fluid-half-rate-moment-matched.js',ADAPTER=ROOT+'fluid-half-rate-corner-square-transfer.js';
export const FACTORY_PIN=Object.freeze({bytes:14329,sha256:'a3cf1072ce823aa6c800f70a7232f10f86d922c702742c8a08fb201e123cdb06'});
export const MANIFEST_PIN=Object.freeze({bytes:79632,sha256:'7b04387547637f1e490c75b5eafd8fbc885e169990de0fb9248ee2076c035363'});
export const ADAPTER_PIN=Object.freeze({bytes:3104,sha256:'9b21493e2a003920f1b2b9bc330d546b9c7ac53c1c4c900bafcd77f508431f0e'});
export const FRAGMENT_PIN=Object.freeze({bytes:6142,sha256:'022cbd8c8999b8e8361ed5f6313e94877407e116631aaeb3b9e299dd9b7d5833'});
export const sha=value=>createHash('sha256').update(value).digest('hex');
const need=(v,m)=>{if(!v)throw Error(m);};
const once=(source,a,b)=>{need(source.split(a).length===2,'Expected one exact frozen interaction term');return source.replace(a,b);};
export const EDITS=Object.freeze([
 ["'0.1.0-half-rate-corner-square-control'","'0.1.0-half-rate-moment-matched-control'"],
 ['function prepareHalfRateCornerSquareData(','function prepareHalfRateMomentMatchedData('],
 ['function halfRateCornerSquarePayloadEvidence(','function halfRateMomentMatchedPayloadEvidence('],
 ['function auditHalfRateCornerSquareRGBA(','function auditHalfRateMomentMatchedRGBA('],
 ['function createHalfRateCornerSquareControl(','function createHalfRateMomentMatchedControl('],
 ["'Unaccepted exact cfe01 half-rate corner-square emission control'","'Unaccepted exact cfe01 half-rate moment-matched interaction control'"],
 ["eaFlameExtinctionCoefficient:emissionVariantUniform('smoke-only')","eaFlameExtinctionCoefficient:emissionVariantUniform('matched-opacity')"],
 ["variant:'exact-half-rate-corner-square-fixed6r-thin'","variant:'exact-half-rate-corner-square-fixed6r-matched6'"],
 ['fixedFlameExtinctionCoefficient:0','fixedFlameExtinctionCoefficient:6'],
 ["scope:'Same fixed6r smoke-only transport; emission weights filtered corner squares before linear eligibility. Unaccepted diagnostic only; no native quality/cost credit.'",
  "scope:'Same fixed6r corner-square emission; existing matched-opacity6 extinction uses raw filteredF. One eligibility chain per term. Unaccepted diagnostic only; no native quality/cost credit.'"]
].map(Object.freeze));
export function deriveFactory(source){
 need(Buffer.byteLength(source)===FACTORY_PIN.bytes&&sha(source)===FACTORY_PIN.sha256,'Complete frozen R33 factory required');
 let out=source;for(const [a,b]of EDITS)out=once(out,a,b);return out;
}
export function recoverFactory(candidate){
 let out=candidate;for(const [a,b]of [...EDITS].reverse())out=once(out,b,a);
 need(Buffer.byteLength(out)===FACTORY_PIN.bytes&&sha(out)===FACTORY_PIN.sha256,'Interaction inverse did not recover complete R33 source');return out;
}
export function deriveManifest(source,candidate,adapter){
 need(Buffer.byteLength(source)===MANIFEST_PIN.bytes&&sha(source)===MANIFEST_PIN.sha256,'Frozen R33 manifest required');
 need(Buffer.byteLength(adapter)===ADAPTER_PIN.bytes&&sha(adapter)===ADAPTER_PIN.sha256,'Unchanged R33 private adapter required');recoverFactory(candidate);
 const m=JSON.parse(source),original=m.runtimeFiles.find(r=>r.path===SOURCE_ENTRY);
 need(m.runtimeFiles.length===62&&m.runtimeResources.length===193&&original?.bytes===FACTORY_PIN.bytes&&original.sha256===FACTORY_PIN.sha256&&m.rawGatesPassed===false&&m.admitted===false,'Exact failed-study source closure required');
 m.id='tinderbox-half-rate-moment-matched-interaction';m.artistVersion='0.1.0-half-rate-moment-matched-control';m.status='unaccepted-exact-failed-terminal-moment-matched-interaction';
 m.factoryExport='createHalfRateMomentMatchedControl';m.prepareExport='prepareHalfRateMomentMatchedData';
 m.runtimeFiles=m.runtimeFiles.filter(r=>r.path!==SOURCE_ENTRY).concat({path:ENTRY,bytes:Buffer.byteLength(candidate),sha256:sha(candidate)}).sort((a,b)=>a.path.localeCompare(b.path,'en'));
 m.limits.esmBytes=m.runtimeFiles.reduce((n,r)=>n+r.bytes,0);
 m.opticalControl={commit:'930553024d54297e4aeefb1cb33273de595a8eeb',variant:'fixed6r-corner-square-matched6',fixedFlameEmissivity:6,fixedFlameExtinctionCoefficient:6,emissionProxy:'spatial/temporal filter(F_corner^2)',localMomentOnly:true,storedFieldsUnchanged:true,sharedKernelGLSL:true,normalization:'Fixed existing diagnostic coefficients; not calibrated reaction rate, physics, Kelvin, energy or radiometry'};
 m.provenance.momentMatchedInteraction={proposalCommit:PROPOSAL,sourceCommit:SOURCE_COMMIT,sourceFactory:{path:SOURCE_ENTRY,...FACTORY_PIN},sourceManifest:{path:SOURCE_MANIFEST,...MANIFEST_PIN},privateAdapter:{path:ADAPTER,...ADAPTER_PIN,generatedFragment:{maxPlanes:28,...FRAGMENT_PIN}},sourceDelta:'Only complete reversible R33 identity/four-export/diagnostic edits and fixed extinction uniform0 to existing6. All imports and generated GLSL remain byte-identical; one private module store serves four exports.',transport:'j=6*R*G*displayFire+ks*displaySoot; k=ks+6*f*G. R is the corner-square moment; f is raw filteredF. G enters once in each fire term. No shader division or new threshold.',immutableDependencies:60,unchangedAdapter:1,unchangedBinaryRecords:193,priorCPUDataAudit:{reportBytes:368236,reportSha256:'41a1c74f85987a7dc831a6bf7e6531de7c23e61e5ab289fdc1aaeae728bb37f7',scope:'Immutable input word proof only; this source-only interaction was not prepared, rendered or visually accepted'}};
 m.reviewLimitations+=' One fixed corner-square/matched6 interaction. A low-soot homogeneous source function R/f is descriptive, not a shader division; mixed0/1 variance can restore R32 cancellation, soot/heterogeneous paths differ and over-range colors can clip. A dimmer lump or lost roots fails; no compensation, source change or follow-up sweep. No native/reference/admission/cost acceptance.';
 return JSON.stringify(m,null,2)+'\n';
}
