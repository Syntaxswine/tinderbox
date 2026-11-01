/** Source text and tiny math only: never import the effect/geometry/data namespace. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {SourceTextModule} from 'node:vm';
import {deriveFactory,recoverFactory,deriveManifest,sha,EDITS,FACTORY_PIN,MANIFEST_PIN,HELPER_PIN,ENTRY,HELPER,DATA_ROOT,SOURCE_COMMIT,CONTRACT} from './source.mjs';
import {linearHdrEmissionFragment,requireLinearHdrPresentation,PRESENTATION_CONTRACT} from '../../../../assets/art/fire-realism/fluid-weighted-linear-hdr-transfer.js';
import {makeFluidShaders} from '../../../../assets/art/fire-realism/fluid-contact-weighted-source-diagnostic-01/shaders.js';
import {emissionAbsorptionFragment,emissionVariantUniform} from '../../../../assets/art/fire-realism/fluid-contact-weighted-source-diagnostic-01/emission-transfer.js';
import {normalizedEmissionFragment} from '../../../../assets/art/fire-realism/fluid-contact-weighted-source-diagnostic-01/normalization-transfer.js';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),read=p=>fs.readFileSync(path.join(root,p),'utf8'),results=[],check=(name,fn)=>{fn();results.push(name);};
const before=read(DATA_ROOT+'index.js'),oldManifestText=read(DATA_ROOT+'manifest.json'),old=JSON.parse(oldManifestText),entry=read(ENTRY),helper=read(HELPER),manifestText=read(ENTRY.replace(/\.js$/,'.manifest.json')),manifest=JSON.parse(manifestText);
check('complete5ad factory/helper/manifest pins and reversible allowed source delta',()=>{
 assert.equal(Buffer.byteLength(before),FACTORY_PIN.bytes);assert.equal(sha(before),FACTORY_PIN.sha256);assert.equal(sha(oldManifestText),MANIFEST_PIN.sha256);assert.equal(Buffer.byteLength(helper),HELPER_PIN.bytes);assert.equal(sha(helper),HELPER_PIN.sha256);
 assert.equal(deriveFactory(before),entry);assert.equal(recoverFactory(entry),before);assert.equal(deriveManifest(oldManifestText,entry,helper),manifestText);assert.equal(EDITS.length,11);
 assert.throws(()=>recoverFactory(entry.replace('0xff8d35','0xff8d36')),/recover complete/);assert.throws(()=>deriveFactory(before+'\n'),/factory required/);assert.throws(()=>deriveManifest(oldManifestText+'\n',entry,helper),/manifest required/);assert.throws(()=>deriveManifest(oldManifestText,entry,helper+'\n'),/helper required/);
 new SourceTextModule(entry);
});
let refused=0;
check('exact own presentation contract refuses absent unknown inherited and nonstring values',()=>{
 for(const value of [undefined,null,{},[],{presentationContract:''},{presentationContract:'direct'},{presentationContract:CONTRACT+' '},{presentationContract:new String(CONTRACT)},Object.create({presentationContract:CONTRACT})]){assert.throws(()=>requireLinearHdrPresentation(value),/Exact common/);refused++;}
 const options=Object.freeze({presentationContract:CONTRACT,quality:'reference'});assert.equal(requireLinearHdrPresentation(options),CONTRACT);assert.equal(PRESENTATION_CONTRACT,CONTRACT);assert.deepEqual(options,{presentationContract:CONTRACT,quality:'reference'});
 const signature='export function createWeightedLinearHdrDiagnostic(T,options={}){\n  requireLinearHdrPresentation(options);';assert.ok(entry.includes(signature));assert.ok(entry.indexOf(signature)<entry.indexOf('store.createFrameCache()'));
});
check('one module store serves exactly four distinct exports with unchanged lifecycle',()=>{
 assert.equal((entry.match(/createBinaryFieldStore\(FIELD_METADATA\)/g)||[]).length,1);assert.equal((entry.match(/^export (?:async )?function /gm)||[]).length,4);
 for(const [name,body]of [['prepareWeightedLinearHdrData','store.prepare(context)'],['weightedLinearHdrPayloadEvidence','store.evidence()'],['auditWeightedLinearHdrRGBA','store.auditFrames(callback,options)']])assert.ok(entry.includes(name)&&entry.includes(body));
 assert.ok(!entry.includes(DATA_ROOT+'index.js'));assert.ok(!/export\s+.*\bfrom\b/.test(entry));assert.equal((entry.match(/eaFlameExtinctionCoefficient:emissionVariantUniform\('smoke-only'\)/g)||[]).length,1);
 assert.ok(entry.includes("quality:'reference',presentationContract:PRESENTATION_CONTRACT"));assert.ok(entry.includes('referenceAccepted:false,optimizedAvailable:false'));
});
const imported=new Map(),declared=new Map(manifest.runtimeFiles.map(p=>[p.path,p])),lex=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g;
function visit(rel){
 if(imported.has(rel))return;const source=read(rel),pin=declared.get(rel);assert.ok(pin,'Every reachable source is declared:'+rel);assert.equal(Buffer.byteLength(source),pin.bytes);assert.equal(sha(source),pin.sha256);assert.ok(!/\bimport\s*\(/.test(source),'No runtime dynamic import');imported.set(rel,source);
 for(const match of source.matchAll(lex)){assert.ok(match[1].startsWith('./'),'Canonical strict descendant import');visit(path.posix.normalize(path.posix.join(path.posix.dirname(rel),match[1])));}
}
check('exact reachable62-source closure replaces old index with entry plus helper',()=>{
 assert.equal(declared.size,62);visit(ENTRY);assert.deepEqual([...imported.keys()].sort(),[...declared.keys()].sort());assert.ok(!declared.has(DATA_ROOT+'index.js'));
 const unchanged=old.runtimeFiles.filter(p=>p.path!==DATA_ROOT+'index.js');assert.equal(unchanged.length,60);for(const p of unchanged)assert.deepEqual(declared.get(p.path),p);
 const usage=manifest.runtimeFiles.reduce((n,p)=>n+p.bytes,0);assert.equal(usage,10842221);assert.equal(manifest.limits.esmBytes,usage);assert.equal(usage-old.limits.esmBytes,Buffer.byteLength(entry)+Buffer.byteLength(helper)-FACTORY_PIN.bytes);
 const previous=execFileSync('git',['rev-parse',SOURCE_COMMIT+':'+DATA_ROOT.slice(0,-1)],{cwd:root,encoding:'utf8'}).trim(),current=execFileSync('git',['rev-parse','HEAD:'+DATA_ROOT.slice(0,-1)],{cwd:root,encoding:'utf8'}).trim();assert.equal(current,previous,'All256 frozen old objects unchanged, no binary reads');
});
check('same193 resource records and all field/support/clock/ownership limits unchanged',()=>{
 assert.deepEqual(manifest.runtimeResources,old.runtimeResources);assert.equal(manifest.runtimeResources.length,193);assert.equal(manifest.runtimeResources.reduce((n,p)=>n+p.bytes,0),94008180);assert.equal(manifest.runtimeResources.reduce((n,p)=>n+p.uncompressedBytes,0),98662423);
 for(const key of ['study','sourceRawManifestSha256','sourcePins','sourceQualification','geometry','nativeComparisonUnderlay'])assert.deepEqual(manifest[key],old[key]);
 const {esmBytes:a,...rest}=manifest.limits,{esmBytes:b,...oldRest}=old.limits;assert.deepEqual(rest,oldRest);assert.ok(a<64*1024**2);
 assert.equal(manifest.presentationContract,CONTRACT);for(const key of ['rawGatesPassed','admitted','referenceAccepted','referenceFrozen','optimizedAvailable'])assert.equal(manifest[key],false);assert.equal(manifest.factoryExport,'createWeightedLinearHdrDiagnostic');assert.equal(manifest.prepareExport,'prepareWeightedLinearHdrData');assert.ok(!Object.keys(manifest).some(k=>/receipt/i.test(k)));
});
const ENCODED='vec3 eaDisplaySource(vec3 c){return sRGBTransferOETF(vec4(c,1.)).rgb;}',LINEAR='vec3 eaDisplaySource(vec3 c){return c;}';
check('full original shader guards precede the sole OETF-to-identity change',()=>{
 for(const planes of [3,27,128]){const original=makeFluidShaders(planes),frozen=normalizedEmissionFragment(emissionAbsorptionFragment(original.fragmentShader,'smoke-only'),planes),linear=linearHdrEmissionFragment(frozen,planes);assert.equal(linear,frozen.replace(ENCODED,LINEAR));assert.equal(linear.replace(LINEAR,ENCODED),frozen);assert.equal((linear.match(/sRGBTransferOETF/g)||[]).length,0);assert.equal((linear.match(/\(6\.\*r\/1\.\)\*eaDisplaySource\(fire\)/g)||[]).length,1);assert.ok(linear.includes('ks*eaDisplaySource(soot)'));assert.ok(linear.includes('ks+eaFlameExtinctionCoefficient*r'));assert.deepEqual(emissionVariantUniform('smoke-only'),{value:0});
  assert.ok(linear.includes('return vec4(legibility*C,legibility*(1.-T))'));assert.ok(linear.includes('if(associated.a==0.&&all(equal(associated.rgb,vec3(0.))))discard;'));assert.ok(linear.includes('gl_FragColor=associated;'));assert.ok(!linear.includes('#include <colorspace_fragment>'));assert.ok(!linear.includes('emission/max(alpha'));
  for(const bad of [frozen+'\n',linear,frozen.replace('smoke*1.8','smoke*1.9'),frozen.replace('return sRGBTransferOETF(vec4(c,1.)).rgb;','return c*c;')]){assert.throws(()=>linearHdrEmissionFragment(bad,planes));refused++;}
 }
 for(const n of [2,129,NaN]){assert.throws(()=>linearHdrEmissionFragment('',n));refused++;}
});
// Independent homogeneous LINEAR-working double oracle. No tone mapper or GPU;
// final Neutral/exposure1/sRGB is runtime-owned, not duplicated here.
const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-10*Math.max(1,Math.abs(a),Math.abs(b)),a+' != '+b);
function closed({F,G,ks,fire,soot,L,legibility=1}){const j=fire.map((v,i)=>6*F*G*v+ks*soot[i]),T=Math.exp(-ks*L),q=ks===0?L:-Math.expm1(-ks*L)/ks;return{C:j.map(v=>v*q*legibility),A:-Math.expm1(-ks*L)*legibility,j,k:ks};}
function segmented(v,steps){const p=closed(v),ds=v.L/steps,t=Math.exp(-v.ks*ds),q=v.ks===0?ds:-Math.expm1(-v.ks*ds)/v.ks,C=[0,0,0];let T=1;for(let i=0;i<steps;i++){for(let c=0;c<3;c++)C[c]+=T*q*p.j[c];T*=t;}return{C:C.map(c=>c*(v.legibility??1)),A:(1-T)*(v.legibility??1)};}
const fire=[1.65,.78,.19],soot=[.045,.037,.030],base={F:.25,G:1,ks:0,fire,soot,L:1};
check('linear over-one and alpha0 emission remain finite and associated without a second alpha',()=>{
 const v=closed(base);assert.equal(v.A,0);v.C.forEach((c,i)=>near(c,[2.475,1.17,.285][i]));assert.ok(v.C[0]>1);assert.ok(v.C.every(Number.isFinite));
 const zero=closed({...base,F:0});assert.deepEqual(zero.C,[0,0,0]);assert.equal(zero.A,0);const leg=closed({...base,legibility:.48});v.C.forEach((c,i)=>near(leg.C[i],.48*c));assert.equal(leg.A,0);
 const half=closed({...base,L:.5});half.C.forEach((c,i)=>near(c+half.C[i],v.C[i]));const overF=closed({...base,F:1.5});v.C.forEach((c,i)=>near(overF.C[i],6*c));
});
check('eligibility G enters once and smoke RGB is linear without changing smoke extinction',()=>{
 const full=closed({...base,F:1}),fraction=closed({...base,F:1,G:.25}),none=closed({...base,G:0});full.C.forEach((c,i)=>near(fraction.C[i],c*.25));assert.deepEqual(none.C,[0,0,0]);
 const smoke=closed({...base,F:0,ks:.7,L:2});assert.equal(smoke.k,.7);smoke.C.forEach((c,i)=>near(c,soot[i]*-Math.expm1(-1.4)));near(smoke.A,-Math.expm1(-1.4));
});
check('fixed-color linear transport is invariant to step subdivision',()=>{
 for(const v of [base,{...base,F:1.3,G:.375,ks:.8,L:.7},{...base,F:0,ks:2,L:1.2,legibility:.48},{...base,F:0,G:0,ks:0,L:0}])for(const steps of [1,2,17,128]){const a=closed(v),b=segmented(v,steps);a.C.forEach((x,i)=>near(x,b.C[i]));near(a.A,b.A);}
});
console.log(JSON.stringify({status:'linear-hdr-artist-source-and-tiny-math-pass',groups:results.length,refusals:refused,passed:results,reachableModules:declared.size,unchangedDependencies:60,unchangedResourceDeclarations:193,sourceBytes:manifest.limits.esmBytes,onlyGeneratedShaderDelta:'one local palette OETF body to linear identity',noEffectGeometryDataNamespaceImported:true,noPrepareFactoryRendererOrGPU:true},null,2));
