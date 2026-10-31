/** Tiny source/closed-form witnesses only; never import the full effect namespace. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {deriveFactory,recoverFactory,deriveManifest,sha,EDITS,FACTORY_PIN,MANIFEST_PIN,ENTRY,SOURCE_ROOT,SOURCE_COMMIT} from './source.mjs';
import {makeFluidShaders} from '../../../../assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/shaders.js';
import {emissionAbsorptionFragment,emissionVariantUniform,displaySourceReference,emissionKernelGLSL} from '../../../../assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/emission-transfer.js';
import {normalizedEmissionFragment} from '../../../../assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/normalization-transfer.js';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),read=p=>fs.readFileSync(path.join(root,p),'utf8'),results=[];
const check=(name,fn)=>{fn();results.push(name);console.log('PASS '+name);};
const old=read(SOURCE_ROOT+'index.js'),candidate=read(ENTRY),oldManifestText=read(SOURCE_ROOT+'manifest.json'),oldManifest=JSON.parse(oldManifestText),manifestText=read(ENTRY.replace(/\.js$/,'.manifest.json')),manifest=JSON.parse(manifestText);
check('exact frozen factory/manifest and reversible allowed source delta',()=>{
 assert.equal(Buffer.byteLength(old),FACTORY_PIN.bytes);assert.equal(sha(old),FACTORY_PIN.sha256);assert.equal(sha(oldManifestText),MANIFEST_PIN.sha256);
 assert.equal(candidate,deriveFactory(old));assert.equal(recoverFactory(candidate),old);assert.equal(manifestText,deriveManifest(oldManifestText,candidate));
 assert.throws(()=>recoverFactory(candidate.replace('0xff8d35','0xff8d36')),/recover original/);
 assert.throws(()=>deriveFactory(old+'\n'),/pin mismatch/);assert.throws(()=>deriveManifest(oldManifestText+'\n',candidate),/pin mismatch/);
 assert.equal(EDITS.length,10);
});
check('one module-level store shared by four distinct source exports',()=>{
 assert.equal((candidate.match(/createBinaryFieldStore\(FIELD_METADATA\)/g)||[]).length,1);
 assert.match(candidate,/export async function prepareHalfRateMatchedOpacityData\(context\)\{return store.prepare\(context\);\}/);
 assert.match(candidate,/export function halfRateMatchedOpacityPayloadEvidence\(\)\{return store.evidence\(\);\}/);
 assert.match(candidate,/export async function auditHalfRateMatchedOpacityRGBA\(callback,options\)\{return store.auditFrames\(callback,options\);\}/);
 assert.match(candidate,/export function createHalfRateMatchedOpacityControl\(T,options=\{\}\)/);
 assert.equal((candidate.match(/^export (?:async )?function /gm)||[]).length,4);
 assert.ok(!candidate.includes(SOURCE_ROOT+'index.js'));assert.ok(!/export\s+.*\bfrom\b/.test(candidate));
 assert.equal((candidate.match(/'matched-opacity'/g)||[]).length,2);
});
const declared=new Map(manifest.runtimeFiles.map(r=>[r.path,r])),visited=new Map(),strictImports=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g;
function visit(relative){
 if(visited.has(relative))return;
 assert.ok(relative.startsWith('assets/art/fire-realism/'));const source=read(relative),r=declared.get(relative);
 assert.ok(r,'Every reachable source is declared');assert.equal(Buffer.byteLength(source),r.bytes);assert.equal(sha(source),r.sha256);visited.set(relative,source);
 assert.ok(!/\bimport\s*\(/.test(source),'No dynamic runtime imports');
 for(const m of source.matchAll(strictImports)){assert.ok(m[1].startsWith('./'),'Strict descendant import');const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(relative),m[1]));visit(resolved);}
}
check('exact reachable61 source closure with immutable60 dependencies',()=>{
 assert.equal(declared.size,61);visit(ENTRY);assert.deepEqual([...visited.keys()].sort(),[...declared.keys()].sort());
 const frozen=oldManifest.runtimeFiles.filter(r=>r.path!==SOURCE_ROOT+'index.js');
 assert.equal(frozen.length,60);for(const r of frozen)assert.deepEqual(declared.get(r.path),r);
 assert.equal([...declared.values()].reduce((n,r)=>n+r.bytes,0),11529583);
 const tree=execFileSync('git',['ls-tree','-r','--full-tree',SOURCE_COMMIT,'--',SOURCE_ROOT],{cwd:root,encoding:'utf8'}),frozenObjects=new Map(tree.trim().split('\n').map(line=>{const m=line.match(/^100644 blob ([a-f0-9]{40})\t(.+)$/);assert.ok(m);return[m[2],m[1]];}));
 const hashes=execFileSync('git',['hash-object','--no-filters','--stdin-paths'],{cwd:root,input:frozen.map(r=>r.path).join('\n')+'\n',encoding:'utf8'}).trim().split('\n');
 frozen.forEach((r,i)=>assert.equal(hashes[i],frozenObjects.get(r.path)));
 const currentTree=execFileSync('git',['rev-parse','HEAD:'+SOURCE_ROOT.slice(0,-1)],{cwd:root,encoding:'utf8'}).trim(),frozenTree=execFileSync('git',['rev-parse',SOURCE_COMMIT+':'+SOURCE_ROOT.slice(0,-1)],{cwd:root,encoding:'utf8'}).trim();assert.equal(currentTree,frozenTree);
});
check('193 original binary declarations and all nonoptical records unchanged',()=>{
 assert.deepEqual(manifest.runtimeResources,oldManifest.runtimeResources);assert.equal(manifest.runtimeResources.length,193);
 assert.equal(manifest.runtimeResources.reduce((n,r)=>n+r.bytes,0),96602765);
 for(const key of ['study','sourcePins','sourceRawManifestSha256','sourceQualification','geometry','nativeComparisonUnderlay'])assert.deepEqual(manifest[key],oldManifest[key]);
 const {esmBytes:oldEsm,...oldOtherLimits}=oldManifest.limits,{esmBytes:newEsm,...newOtherLimits}=manifest.limits;
 assert.equal(newEsm,manifest.runtimeFiles.reduce((bytes,record)=>bytes+record.bytes,0));assert.equal(newEsm-oldEsm,493);
 assert.deepEqual(newOtherLimits,oldOtherLimits);assert.ok(newEsm<64*1024**2,'Measured usage is below the unchanged64MiB source ceiling');
 assert.equal(manifest.rawGatesPassed,false);assert.equal(manifest.admitted,false);assert.equal(manifest.referenceFrozen,false);assert.equal(manifest.optimizedAvailable,false);
 assert.equal(manifest.opticalControl.fixedFlameEmissivity,6);assert.equal(manifest.opticalControl.fixedFlameExtinctionCoefficient,6);
});
let fragment;
check('byte-identical generated GLSL, unchanged6r emission, fixed uniform0 to6',()=>{
 const original=makeFluidShaders(28),a=emissionAbsorptionFragment(original.fragmentShader,'smoke-only'),b=emissionAbsorptionFragment(original.fragmentShader,'matched-opacity');
 assert.equal(a,b);assert.equal(emissionKernelGLSL('smoke-only'),emissionKernelGLSL('matched-opacity'));
 fragment=normalizedEmissionFragment(b,28);assert.equal(fragment,normalizedEmissionFragment(a,28));
 assert.equal((fragment.match(/\(6\.\*r\/1\.\)\*eaDisplaySource\(fire\)/g)||[]).length,1);
 assert.ok(fragment.includes('ks*eaDisplaySource(soot)'));assert.ok(fragment.includes('ks+eaFlameExtinctionCoefficient*r'));
 assert.deepEqual(emissionVariantUniform('smoke-only'),{value:0});assert.deepEqual(emissionVariantUniform('matched-opacity'),{value:6});assert.throws(()=>emissionVariantUniform('tuned'),/Unknown/);
 assert.ok(fragment.includes('if(associated.a==0.&&all(equal(associated.rgb,vec3(0.))))discard;'));
 assert.ok(!fragment.includes('#include <colorspace_fragment>'));
});
// Independent double closed form for THIS fixed6r/6r control; normalization's
// existing smoke-only oracle has k=ks and is deliberately not used here.
function closed({r,ks,fire,soot,length,legibility=1}){
 const f=displaySourceReference(fire),s=displaySourceReference(soot),j=f.map((v,i)=>6*r*v+ks*s[i]),k=ks+6*r,tau=k*length,T=Math.exp(-tau),q=k===0?length:-Math.expm1(-tau)/k;
 return{C:j.map(v=>legibility*v*q),A:legibility*-Math.expm1(-tau),j,k,T};
}
function segments(input,steps){
 const exact=closed(input),ds=input.length/steps,tau=exact.k*ds,t=Math.exp(-tau),q=tau<1e-3?ds*(1-tau*.5+tau*tau/6-tau*tau*tau/24):-Math.expm1(-tau)/exact.k;
 const C=[0,0,0];let T=1;for(let i=0;i<steps;i++){for(let c=0;c<3;c++)C[c]+=T*q*exact.j[c];T*=t;}
 const l=input.legibility??1;return{C:C.map(v=>v*l),A:(1-T)*l};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<=2e-10*Math.max(1,Math.abs(a),Math.abs(b)),String(a)+' vs '+b);
const fire=[1.65,.25,.01],soot=[.08,.04,.02],vectors=[
 {r:0,ks:0,length:2},{r:.5,ks:.1,length:0},{r:.2,ks:0,length:.8},
 {r:1,ks:0,length:4},{r:.6,ks:2,length:.4},{r:1e-12,ks:0,length:.2},
 {r:.3,ks:8,length:3},{r:.4,ks:.5,length:1,legibility:0},{r:0,ks:.35,length:1,legibility:.4}
].map(v=>({...v,fire,soot}));
check('fixed j6r and kks+6r finite zero/length and homogeneous bounds',()=>{
 const zero=closed(vectors[0]);assert.deepEqual(zero.C,[0,0,0]);assert.equal(zero.A,0);
 const p=closed(vectors[2]),f=displaySourceReference(fire);near(p.k,1.2);p.j.forEach((v,i)=>near(v,1.2*f[i]));p.C.forEach((v,i)=>{near(v,f[i]*-Math.expm1(-1.2*.8));assert.ok(v<=f[i]);});
 const smoke=closed(vectors.at(-1)),s=displaySourceReference(soot);smoke.j.forEach((v,i)=>near(v,.35*s[i]));near(smoke.k,.35);
 for(const input of vectors){const out=closed(input);assert.ok([...out.C,out.A,out.k,out.T].every(Number.isFinite));assert.ok(out.C.every(v=>v>=0));assert.ok(out.A>=0&&out.A<=1);}
});
check('nine tiny fixed cases,1/2/17/120 segment subdivision invariance',()=>{
 for(const input of vectors){const expected=closed(input);for(const steps of [1,2,17,120]){const actual=segments(input,steps);actual.C.forEach((v,i)=>near(v,expected.C[i]));near(actual.A,expected.A);}}
});
check('only required parent LF rules added, own tool scanner imports resolve',()=>{
 const rawAttrs=read('assets/art/fire-realism/.gitattributes'),tail='fluid-half-rate-matched-opacity.js text eol=lf\nfluid-half-rate-matched-opacity.manifest.json text eol=lf\n';
 // Canonicalize only this nonruntime Git metadata. Runtime JS/JSON hashes above remain raw.
 const verifyAttrs=text=>{const attrs=text.replace(/\r\n/g,'\n');assert.ok(attrs.endsWith(tail));assert.equal(sha(attrs.slice(0,-tail.length)),'8f8db004c3fc6169978225b8f2992a11b390939afa186d57f8272d01d3be3e91');};
 verifyAttrs(rawAttrs);verifyAttrs(rawAttrs.replace(/\r\n/g,'\n').replace(/\n/g,'\r\n'));
 assert.throws(()=>verifyAttrs(rawAttrs.replace('eol=lf','eol=crlf')));
 assert.throws(()=>recoverFactory(candidate.replace(/\n/g,'\r\n')));
 assert.notEqual(sha(manifestText),sha(manifestText.replace(/\n/g,'\r\n')));
 for(const name of ['source.mjs','check.mjs']){const rel='workbenches/art/fire-realism/half-rate-matched-opacity/'+name;for(const m of read(rel).matchAll(strictImports))assert.ok(fs.existsSync(path.resolve(root,path.dirname(rel),m[1])));}
});
console.log(JSON.stringify({status:'PASS',checks:results.length,entry:{bytes:Buffer.byteLength(candidate),sha256:sha(candidate)},manifest:{bytes:Buffer.byteLength(manifestText),sha256:sha(manifestText)},closure:61,immutableDependencies:60,binaryDeclarations:193,binaryBytesRead:0,namespaceOrGeometryEvaluated:false,sharedFragmentSha256:sha(fragment),fixedEmission:6,fixedExtinction:6,sourceOnly:true,rawGatesPassed:false,admitted:false}));
