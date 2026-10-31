/** Tiny fixed-interaction source/closed-form witnesses. Never load effect/data. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {deriveFactory,recoverFactory,deriveManifest,sha,EDITS,ENTRY,ADAPTER,DATA_ROOT,SOURCE_ENTRY,SOURCE_MANIFEST,SOURCE_COMMIT,FACTORY_PIN,MANIFEST_PIN,ADAPTER_PIN,FRAGMENT_PIN} from './source.mjs';
import {makeFluidShaders} from '../../../../assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/shaders.js';
import {emissionKernelGLSL,emissionAbsorptionFragment,emissionVariantUniform,displaySourceReference} from '../../../../assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/emission-transfer.js';
import {normalizedEmissionFragment} from '../../../../assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/normalization-transfer.js';
import {cornerSquareEmissionFragment,recoverCornerSquareFragment} from '../../../../assets/art/fire-realism/fluid-half-rate-corner-square-transfer.js';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),read=p=>fs.readFileSync(path.join(root,p),'utf8'),checks=[];
const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
const near=(a,b)=>assert.ok(Math.abs(a-b)<=3e-10*Math.max(1,Math.abs(a),Math.abs(b)),a+' vs '+b);
const source=read(SOURCE_ENTRY),oldManifestText=read(SOURCE_MANIFEST),oldManifest=JSON.parse(oldManifestText),candidate=read(ENTRY),adapter=read(ADAPTER),manifestText=read(ENTRY.replace(/\.js$/,'.manifest.json')),manifest=JSON.parse(manifestText);
check('complete pinned R33 inverse with only fixed uniform and identity/diagnostic edits',()=>{
 assert.equal(Buffer.byteLength(source),FACTORY_PIN.bytes);assert.equal(sha(source),FACTORY_PIN.sha256);
 assert.equal(candidate,deriveFactory(source));assert.equal(recoverFactory(candidate),source);assert.equal(EDITS.length,10);
 assert.throws(()=>deriveFactory(source+' '),/Complete frozen/);
 assert.throws(()=>recoverFactory(candidate.replace('0xff8d35','0xff8d36')),/complete R33/);
 assert.equal((candidate.match(/eaFlameExtinctionCoefficient:emissionVariantUniform\('matched-opacity'\)/g)||[]).length,1);
 assert.equal((candidate.match(/emissionAbsorptionFragment\(original.fragmentShader,'smoke-only'\)/g)||[]).length,1);
 assert.equal(manifestText,deriveManifest(oldManifestText,candidate,adapter));
});
const fragment=cornerSquareEmissionFragment(normalizedEmissionFragment(emissionAbsorptionFragment(makeFluidShaders(28).fragmentShader,'smoke-only'),28),28);
check('unchanged complete normalized guard/adapter6142-byte GLSL with fixed uniform0to6 only',()=>{
 assert.equal(Buffer.byteLength(adapter),ADAPTER_PIN.bytes);assert.equal(sha(adapter),ADAPTER_PIN.sha256);
 assert.equal(fragment.length,FRAGMENT_PIN.bytes);assert.equal(sha(fragment),FRAGMENT_PIN.sha256);
 assert.equal(recoverCornerSquareFragment(fragment,28),normalizedEmissionFragment(emissionAbsorptionFragment(makeFluidShaders(28).fragmentShader,'smoke-only'),28));
 assert.equal(emissionKernelGLSL('smoke-only'),emissionKernelGLSL('matched-opacity'));
 assert.deepEqual(emissionVariantUniform('smoke-only'),{value:0});assert.deepEqual(emissionVariantUniform('matched-opacity'),{value:6});
 assert.ok(fragment.includes('eaAdvance(emission,transmittance,eaEmission(emittedReaction,smokeSigma,warm,soot),eaExtinction(smokeSigma,reacting),distanceStep);'));
 assert.ok(fragment.includes('float emittedReaction=sampledMoment.w*reactionGain*sourceA;'));
 assert.ok(fragment.includes('float reacting=value.z*reactionGain*sourceA;'));
 assert.ok(fragment.includes('emittedReaction*=mix(baseAllowed,1.,contactRelease);'));
 assert.ok(fragment.includes('reacting*=mix(baseAllowed,1.,contactRelease);'));
 assert.ok(fragment.includes('(6.*r/1.)*eaDisplaySource(fire)+ks*eaDisplaySource(soot)'));
});
check('one private module store serves four distinct synchronous/asynchronous API exports',()=>{
 assert.equal((candidate.match(/createBinaryFieldStore\(FIELD_METADATA\)/g)||[]).length,1);
 assert.equal((candidate.match(/^export (?:async )?function /gm)||[]).length,4);
 for(const term of ['prepareHalfRateMomentMatchedData(context){return store.prepare(context);}','halfRateMomentMatchedPayloadEvidence(){return store.evidence();}','auditHalfRateMomentMatchedRGBA(callback,options){return store.auditFrames(callback,options);}','createHalfRateMomentMatchedControl(T,options={})'])assert.ok(candidate.includes(term),term);
 assert.ok(!candidate.includes(SOURCE_ENTRY));assert.ok(!candidate.includes(DATA_ROOT+'index.js'));assert.ok(!/export\s*\{/.test(candidate));
 assert.ok(candidate.includes("variant:'exact-half-rate-corner-square-fixed6r-matched6'"));
 assert.ok(candidate.includes('rawGatesPassed:false,admitted:false'));assert.ok(candidate.includes('referenceAccepted:false,optimizedAvailable:false'));
});
const imports=s=>[...s.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)].map(m=>m[1]);
check('measured62 reachable source declarations/usage and unchanged60plusadapter/193 resources',()=>{
 assert.equal(Buffer.byteLength(oldManifestText),MANIFEST_PIN.bytes);assert.equal(sha(oldManifestText),MANIFEST_PIN.sha256);
 const declared=new Map(manifest.runtimeFiles.map(r=>[r.path,r])),old=oldManifest.runtimeFiles.filter(r=>r.path!==SOURCE_ENTRY);
 assert.equal(old.length,61);assert.equal(declared.size,62);assert.deepEqual(imports(candidate),imports(source));assert.equal(imports(candidate).length,11);
 for(const r of old)assert.deepEqual(declared.get(r.path),r);
 assert.deepEqual(declared.get(ENTRY),{path:ENTRY,bytes:Buffer.byteLength(candidate),sha256:sha(candidate)});
 assert.equal(declared.get(ADAPTER).sha256,ADAPTER_PIN.sha256);
 const sum=manifest.runtimeFiles.reduce((n,r)=>n+r.bytes,0);assert.equal(sum,11532863);assert.equal(manifest.limits.esmBytes,sum);assert.ok(sum<64*1024**2);
 const {esmBytes:a,...oldLimits}=oldManifest.limits,{esmBytes:b,...newLimits}=manifest.limits;assert.deepEqual(newLimits,oldLimits);
 assert.deepEqual(manifest.runtimeResources,oldManifest.runtimeResources);assert.equal(manifest.runtimeResources.length,193);
 for(const key of ['study','sourcePins','sourceQualification','geometry','nativeComparisonUnderlay'])assert.deepEqual(manifest[key],oldManifest[key]);
 const tree=ref=>execFileSync('git',['rev-parse',ref+':'+DATA_ROOT.slice(0,-1)],{cwd:root,encoding:'utf8'}).trim();assert.equal(tree('HEAD'),tree(SOURCE_COMMIT));
 // Closure preservation follows identical11 roots plus immutable61 dependencies. No geometry leaf/data body reads.
 assert.equal(manifest.rawGatesPassed,false);assert.equal(manifest.admitted,false);assert.equal(manifest.optimizedAvailable,false);
});
// Independent homogeneous closed form. Separate f/R/G are never collapsed.
function closed({f,R,G,ks,length,fire,soot,legibility=1}){
 assert.ok([f,R,G,ks,length,legibility].every(v=>Number.isFinite(v)&&v>=0));assert.ok(legibility<=1);
 const F=displaySourceReference(fire),S=displaySourceReference(soot),j=F.map((v,i)=>6*R*G*v+ks*S[i]),k=ks+6*f*G,T=Math.exp(-k*length),q=k===0?length:-Math.expm1(-k*length)/k;
 return{C:j.map(v=>v*q*legibility),A:(1-T)*legibility,j,k,T,q};
}
const fire=[1.65,.25,.01],soot=[.08,.04,.02],input=v=>({fire,soot,...v});
const moments=values=>({f:values.reduce((a,b)=>a+b,0)/values.length,R:values.reduce((a,b)=>a+b*b,0)/values.length});
check('homogeneous versus mixed0/1 source-function distinction including variance and soot',()=>{
 const homogeneous=moments([.5,.5]),mixed=moments([0,1]);near(homogeneous.f,.5);near(homogeneous.R,.25);near(mixed.f,.5);near(mixed.R,.5);
 for(const [v,ratio]of [[homogeneous,.5],[mixed,1]]){
  const r=closed(input({...v,G:.4,ks:0,length:1}));r.j.forEach((j,i)=>near(j/r.k,ratio*displaySourceReference(fire)[i]));
 }
 const r32=closed(input({f:.5,R:.5,G:.4,ks:0,length:1})),fourth=closed(input({...homogeneous,G:.4,ks:0,length:1}));
 fourth.C.forEach((v,i)=>near(v,.5*r32.C[i]));near(fourth.A,r32.A);
 const withSoot=closed(input({...homogeneous,G:.4,ks:.7,length:1}));assert.notEqual(withSoot.j[0]/withSoot.k,.5*displaySourceReference(fire)[0]);
 // These are homogeneous proxy ratios, not a division added to the shader or a heterogeneous-ray prediction.
});
check('zero f/R/G, soot-only, zero length and fractional eligibility exactly once',()=>{
 const empty=closed(input({f:0,R:0,G:1,ks:0,length:1}));assert.deepEqual(empty.C,[0,0,0]);assert.equal(empty.A,0);
 const noG=closed(input({f:.5,R:.25,G:0,ks:.4,length:1})),sootOnly=closed(input({f:0,R:0,G:1,ks:.4,length:1}));assert.deepEqual(noG,sootOnly);
 const zeroLength=closed(input({f:.5,R:.25,G:.3,ks:.4,length:0}));assert.deepEqual(zeroLength.C,[0,0,0]);assert.equal(zeroLength.A,0);
 const quarter=closed(input({f:.5,R:.25,G:.25,ks:0,length:1})),half=closed(input({f:.5,R:.25,G:.5,ks:0,length:1}));
 quarter.j.forEach((j,i)=>near(j,half.j[i]*.5));near(quarter.k,half.k*.5);assert.notEqual(quarter.k,half.k*.25);assert.notEqual(quarter.T,half.T);
 const partial=closed(input({f:.5,R:.25,G:.3,ks:.4,length:1,legibility:.2})),full=closed(input({f:.5,R:.25,G:.3,ks:.4,length:1}));partial.C.forEach((c,i)=>near(c,full.C[i]*.2));near(partial.A,full.A*.2);
});
function segmented(v,n){
 const expected=closed(v),ds=v.length/n,tau=expected.k*ds,t=Math.exp(-tau),q=tau<1e-3?ds*(1-tau*.5+tau*tau/6-tau*tau*tau/24):-Math.expm1(-tau)/expected.k;
 const C=[0,0,0];let T=1;for(let s=0;s<n;s++){for(let i=0;i<3;i++)C[i]+=T*q*expected.j[i];T*=t;}
 return{C:C.map(c=>c*(v.legibility??1)),A:(1-T)*(v.legibility??1)};
}
check('correct j6RG/kksplus6fG homogeneous segment subdivision and valid Fgreater1',()=>{
 const over=moments([1.5]);near(over.f,1.5);near(over.R,2.25);
 const vectors=[{f:0,R:0,G:1,ks:0,length:1},{f:.5,R:.25,G:.05,ks:.2,length:.8},{...over,G:1,ks:0,length:.2},{f:.6,R:.36,G:0,ks:2,length:1},{f:1e-12,R:1e-24,G:.3,ks:1e-10,length:.5},{f:.5,R:.5,G:.3,ks:.4,length:0}];
 for(const v of vectors){const params=input(v),expected=closed(params);near(expected.k,v.ks+6*v.f*v.G);expected.j.forEach((j,i)=>near(j,6*v.R*v.G*displaySourceReference(fire)[i]+v.ks*displaySourceReference(soot)[i]));
  for(const n of [1,2,17,120]){const actual=segmented(params,n);actual.C.forEach((c,i)=>near(c,expected.C[i]));near(actual.A,expected.A);}
 }
 const unclamped=closed(input({...over,G:1,ks:0,length:1}));near(unclamped.k,9);near(unclamped.j[0],13.5*displaySourceReference(fire)[0]);
});
check('portable LF metadata only, raw runtime pins and old controls unchanged',()=>{
 const tail='fluid-half-rate-moment-matched.js text eol=lf\nfluid-half-rate-moment-matched.manifest.json text eol=lf\n';
 const verify=text=>{const c=text.replace(/\r\n/g,'\n');assert.ok(c.endsWith(tail));assert.equal(sha(c.slice(0,-tail.length)),'5be01967162d1cfa26ada53ddd03a1876ecbba53e1c471a6e2768d5f7cc43f9c');};
 const attrs=read('assets/art/fire-realism/.gitattributes');verify(attrs);verify(attrs.replace(/\r\n/g,'\n').replace(/\n/g,'\r\n'));assert.throws(()=>verify(attrs.replace('eol=lf','eol=crlf')));
 for(const [p,pin]of [[SOURCE_ENTRY,FACTORY_PIN],[SOURCE_MANIFEST,MANIFEST_PIN],[ADAPTER,ADAPTER_PIN]]){const git=execFileSync('git',['show',SOURCE_COMMIT+':'+p],{cwd:root});assert.equal(git.length,pin.bytes);assert.equal(sha(git),pin.sha256);assert.equal(sha(read(p)),pin.sha256);}
 for(const p of [ENTRY,ENTRY.replace(/\.js$/,'.manifest.json')])assert.ok(!read(p).includes('\r'));
 for(const spec of imports(read('workbenches/art/fire-realism/half-rate-moment-matched/source.mjs')))assert.ok(fs.existsSync(path.resolve(root,'workbenches/art/fire-realism/half-rate-moment-matched',spec)));
});
console.log(JSON.stringify({status:'PASS',checks:checks.length,entry:{bytes:Buffer.byteLength(candidate),sha256:sha(candidate)},manifest:{bytes:Buffer.byteLength(manifestText),sha256:sha(manifestText)},fragment:FRAGMENT_PIN,inverseExact:true,replacementUnits:EDITS.length,oneOpticalUniformChange:true,reachableModules:62,immutableDependencies:60,unchangedAdapter:1,esmBytes:manifest.limits.esmBytes,binaryDeclarations:193,binaryBytesRead:0,geometryLeafBodiesRead:0,fullNamespaceEvaluated:false,sourceOnly:true,rawGatesPassed:false,admitted:false}));
