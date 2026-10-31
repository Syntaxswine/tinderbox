/** Tiny source/interpolation/transport witnesses. No effect or data namespace. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {deriveFactory,recoverFactory,deriveManifest,sha,ENTRY,ADAPTER,SOURCE_ROOT,SOURCE_COMMIT,FACTORY_PIN,MANIFEST_PIN} from './source.mjs';
import {makeFluidShaders} from '../../../../assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/shaders.js';
import {emissionAbsorptionFragment,emissionVariantUniform,displaySourceReference} from '../../../../assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/emission-transfer.js';
import {normalizedEmissionFragment,homogeneousEmissionReference} from '../../../../assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/normalization-transfer.js';
import {cornerSquareEmissionFragment,recoverCornerSquareFragment,FROZEN_R31_FRAGMENT} from '../../../../assets/art/fire-realism/fluid-half-rate-corner-square-transfer.js';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),read=p=>fs.readFileSync(path.join(root,p),'utf8'),checks=[];
const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
const near=(a,b)=>assert.ok(Math.abs(a-b)<=2e-10*Math.max(1,Math.abs(a),Math.abs(b)),a+' vs '+b);
const source=read(SOURCE_ROOT+'index.js'),oldManifestText=read(SOURCE_ROOT+'manifest.json'),oldManifest=JSON.parse(oldManifestText),candidate=read(ENTRY),adapterSource=read(ADAPTER),manifestText=read(ENTRY.replace(/\.js$/,'.manifest.json')),manifest=JSON.parse(manifestText);
const base=normalizedEmissionFragment(emissionAbsorptionFragment(makeFluidShaders(28).fragmentShader,'smoke-only'),28),adapted=cornerSquareEmissionFragment(base,28);
check('unchanged complete R31 guard, six reversible private replacement units',()=>{
 assert.equal(base.length,5929);assert.equal(sha(base),FROZEN_R31_FRAGMENT.sha256);assert.equal(recoverCornerSquareFragment(adapted,28),base);
 assert.throws(()=>cornerSquareEmissionFragment(base+' ',28),/exact complete/);assert.throws(()=>cornerSquareEmissionFragment(base,27),/28-plane/);
 assert.throws(()=>recoverCornerSquareFragment(adapted.replace('eaExtinction(smokeSigma,reacting)','eaExtinction(smokeSigma,emittedReaction)'),28),/complete R31/);
 const units=adapterSource.slice(adapterSource.indexOf(' return [\n'),adapterSource.indexOf('\n ];')).split('\n').filter(s=>/^\s+\[/.test(s)).length;
 assert.equal(units,6);assert.equal(manifest.provenance.cornerSquareControl.privateAdapter.reversibleReplacementUnits,units);
});
check('same eight sample sites/two temporal calls and intact raw RGB/F uses',()=>{
 for(const s of [base,adapted]){assert.equal((s.match(/\bvoxel\(data,/g)||[]).length,8);assert.equal((s.match(/texelFetch\(/g)||[]).length,1);assert.equal((s.match(/tri\(field[01],p\)/g)||[]).length,2);}
 for(const term of [
  'if(any(lessThan(cell,ivec3(0)))||any(greaterThanEqual(cell,ivec3(fieldResolution))))return vec4(0.);',
  'float reacting=value.z*reactionGain*sourceA;','reacting*=mix(baseAllowed,1.,contactRelease);',
  'eaExtinction(smokeSigma,reacting)','mix(1.,.18,clamp(value.z*heat,0.,1.))',
  'float heat=clamp(value.y/3.,0.,1.);','smoothstep(.70,.97,value.z)'
 ])assert.ok(adapted.includes(term),term);
 assert.ok(adapted.includes('vec3 value=sampledMoment.rgb;'));
 assert.ok(adapted.includes('vec4 sampledMoment=max(vec4(0.),mix(tri(field0,p),tri(field1,p),temporalMix));'));
 assert.ok(adapted.includes('vec3 fetchedRgb=texelFetch(data,cell,0).rgb;return vec4(fetchedRgb,fetchedRgb.z*fetchedRgb.z);'));
 assert.ok(adapted.includes('eaEmission(emittedReaction,smokeSigma,warm,soot)'));
 assert.ok(adapted.includes('emittedReaction*=mix(baseAllowed,1.,contactRelease);'));
 assert.deepEqual(emissionVariantUniform('smoke-only'),{value:0});
});
const mix=(a,b,t)=>a.map((v,i)=>(1-t)*v+t*b[i]);
function tree(c,f){const [x,y,z]=f;return mix(mix(mix(c[0],c[1],x),mix(c[2],c[3],x),y),mix(mix(c[4],c[5],x),mix(c[6],c[7],x),y),z);}
const rgb=c=>c?c.slice(0,3):[0,0,0],local=c=>c?[c[0],c[1],c[2],c[2]*c[2]]:[0,0,0,0];
const originalSample=(a,b,f,t)=>mix(tree(a.map(rgb),f),tree(b.map(rgb),f),t).map(v=>Math.max(0,v));
const momentSample=(a,b,f,t)=>mix(tree(a.map(local),f),tree(b.map(local),f),t).map(v=>Math.max(0,v));
const corners=(F,alpha=77)=>Array.from({length:8},()=>[.2,.8,F,alpha]);
check('tiny RGB equivalence, original mix/clamp, endpoints/outside and stored alpha isolation',()=>{
 const a=Array.from({length:8},(_,i)=>[i*.1-.4,.2+i*.03,(i%3)*.4,1000+i]),b=Array.from({length:8},(_,i)=>[.3-i*.12,.8-i*.02,1.2-i*.1,-1000-i]),before=JSON.stringify([a,b]);
 for(const f of [[0,0,0],[1,1,1],[.2,.3,.7]])for(const t of [0,.35,1])assert.deepEqual(momentSample(a,b,f,t).slice(0,3),originalSample(a,b,f,t));
 assert.deepEqual(momentSample(Array(8).fill(null),Array(8).fill(null),[.4,.5,.6],.3),[0,0,0,0]);
 assert.equal(JSON.stringify([a,b]),before);
 assert.deepEqual(momentSample(corners(.6,999),corners(.6,-999),[.1,.4,.7],.3),momentSample(corners(.6,0),corners(.6,0),[.1,.4,.7],.3));
});
check('filter corner squares, mixed0/1 counterexample, temporal/spatial weights and Fgreater1',()=>{
 const split=Array.from({length:8},(_,i)=>[.2,.8,i&1,9]),s=momentSample(split,split,[.5,.2,.7],.4);
 near(s[2],.5);near(s[3],.5);assert.notEqual(s[3],s[2]*s[2]);
 const temporal=momentSample(corners(0),corners(1),[.3,.4,.8],.5);near(temporal[2],.5);near(temporal[3],.5);
 const a=Array.from({length:8},(_,i)=>[0,0,.1+i*.15,0]),b=Array.from({length:8},(_,i)=>[0,0,1.3-i*.12,0]),f=[.2,.4,.7],t=.35;
 const weight=i=>(i&1?f[0]:1-f[0])*(i&2?f[1]:1-f[1])*(i&4?f[2]:1-f[2]);
 const expanded=a.reduce((n,c,i)=>n+weight(i)*((1-t)*c[2]**2+t*b[i][2]**2),0);near(momentSample(a,b,f,t)[3],expanded);
 near(momentSample(corners(1.5),corners(1.5),[.2,.4,.7],.3)[3],2.25);
});
const emissionMoment=(R,gain,A,taper)=>R*gain*A*taper;
check('zeroF/zeroG and fractional eligibility remains linear once',()=>{
 assert.equal(momentSample(corners(0),corners(0),[.2,.3,.4],.5)[3],0);
 for(const g of [[0,1,1],[1,0,1],[1,1,0]])assert.equal(emissionMoment(.5,...g),0);
 near(emissionMoment(.5,.5,.4,.25),.025);assert.notEqual(emissionMoment(.5,.5,.4,.25),.5*(.5*.4*.25)**2);
 near(emissionMoment(.36,.2,.6,.8),2*emissionMoment(.36,.1,.6,.8));
 assert.ok(adapted.includes('float emittedReaction=sampledMoment.w*reactionGain*sourceA;'));
 assert.ok(!adapted.includes('reacting*reacting'));
});
const fire=[1.65,.25,.01],soot=[.08,.04,.02];
function segmented(input,n){
 const F=displaySourceReference(input.fire),S=displaySourceReference(input.soot),j=F.map((v,i)=>6*input.r*v+input.ks*S[i]),ds=input.length/n,tau=input.ks*ds,Tseg=Math.exp(-tau),q=tau<1e-3?ds*(1-tau*.5+tau*tau/6-tau*tau*tau/24):-Math.expm1(-tau)/input.ks;
 const C=[0,0,0];let T=1;for(let s=0;s<n;s++){for(let i=0;i<3;i++)C[i]+=T*q*j[i];T*=Tseg;}return{C,A:1-T,j,k:input.ks};
}
check('correct j6RG/kks, pure emission A0 and homogeneous subdivision',()=>{
 const vectors=[{R:0,G:1,ks:0,length:1},{R:.5,G:.05,ks:.2,length:.8},{R:2.25,G:1,ks:0,length:.2},{R:.36,G:0,ks:2,length:1},{R:1e-12,G:.3,ks:1e-10,length:.5}];
 for(const v of vectors){const input={kind:'derived-six',r:v.R*v.G,ks:v.ks,length:v.length,fire,soot},expected=homogeneousEmissionReference(input);
  expected.j.forEach((value,i)=>near(value,6*v.R*v.G*displaySourceReference(fire)[i]+v.ks*displaySourceReference(soot)[i]));near(expected.k,v.ks);
  for(const steps of [1,2,17,120]){const actual=segmented(input,steps);actual.C.forEach((c,i)=>near(c,expected.C[i]));near(actual.A,expected.A);}
 }
 const pure=homogeneousEmissionReference({kind:'derived-six',r:.5,ks:0,length:1,fire,soot});assert.equal(pure.A,0);assert.ok(pure.C.every(v=>v>0));
});
check('factory derives from stronger13701-byte R31 with one store and four distinct exports',()=>{
 assert.equal(Buffer.byteLength(source),FACTORY_PIN.bytes);assert.equal(sha(source),FACTORY_PIN.sha256);assert.equal(sha(oldManifestText),MANIFEST_PIN.sha256);
 assert.equal(candidate,deriveFactory(source));assert.equal(recoverFactory(candidate),source);assert.equal(manifestText,deriveManifest(oldManifestText,candidate,adapterSource));
 assert.equal((candidate.match(/createBinaryFieldStore\(FIELD_METADATA\)/g)||[]).length,1);assert.equal((candidate.match(/^export (?:async )?function /gm)||[]).length,4);
 for(const term of ['prepareHalfRateCornerSquareData(context){return store.prepare(context);}','halfRateCornerSquarePayloadEvidence(){return store.evidence();}','auditHalfRateCornerSquareRGBA(callback,options){return store.auditFrames(callback,options);}','createHalfRateCornerSquareControl(T,options={})'])assert.ok(candidate.includes(term));
 assert.equal((candidate.match(/'smoke-only'/g)||[]).length,2);assert.ok(!candidate.includes('matched-opacity'));assert.ok(!candidate.includes(SOURCE_ROOT+'index.js'));
 assert.throws(()=>recoverFactory(candidate.replace('0xff8d35','0xff8d36')),/complete R31/);
});
const imports=s=>[...s.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)].map(m=>m[1]);
check('actual62-source closure/usage, unchanged60 Git identities and193 binary declarations',()=>{
 const declared=new Map(manifest.runtimeFiles.map(r=>[r.path,r])),frozen=oldManifest.runtimeFiles.filter(r=>r.path!==SOURCE_ROOT+'index.js');
 assert.equal(frozen.length,60);for(const r of frozen)assert.deepEqual(declared.get(r.path),r);
 assert.equal(declared.size,62);
 const originalRoots=imports(source).map(s=>path.posix.normalize(path.posix.join(SOURCE_ROOT,s))),newRoots=imports(candidate).map(s=>path.posix.normalize(path.posix.join(path.posix.dirname(ENTRY),s)));
 assert.equal(originalRoots.length,10);assert.deepEqual(newRoots.filter(p=>p!==ADAPTER),originalRoots);assert.ok(newRoots.includes(ADAPTER));
 for(const specifier of imports(adapterSource)){assert.ok(specifier.startsWith('./'));assert.ok(frozen.some(r=>r.path===path.posix.normalize(path.posix.join(path.posix.dirname(ADAPTER),specifier))));}
 for(const [p,text]of [[ENTRY,candidate],[ADAPTER,adapterSource]]){assert.equal(declared.get(p).bytes,Buffer.byteLength(text));assert.equal(declared.get(p).sha256,sha(text));}
 const frozenTree=execFileSync('git',['rev-parse',SOURCE_COMMIT+':'+SOURCE_ROOT.slice(0,-1)],{cwd:root,encoding:'utf8'}).trim(),currentTree=execFileSync('git',['rev-parse','HEAD:'+SOURCE_ROOT.slice(0,-1)],{cwd:root,encoding:'utf8'}).trim();assert.equal(currentTree,frozenTree);
 // Reuse the accepted original60 closure and immutable Git tree; no geometry leaf/body reread.
 const sum=manifest.runtimeFiles.reduce((n,r)=>n+r.bytes,0);assert.equal(sum,11532822);assert.equal(manifest.limits.esmBytes,sum);assert.ok(sum<64*1024**2);
 const {esmBytes:oldUsage,...oldLimits}=oldManifest.limits,{esmBytes:newUsage,...newLimits}=manifest.limits;assert.deepEqual(newLimits,oldLimits);
 assert.deepEqual(manifest.runtimeResources,oldManifest.runtimeResources);assert.equal(manifest.runtimeResources.length,193);
 for(const key of ['study','sourcePins','sourceQualification','geometry','nativeComparisonUnderlay'])assert.deepEqual(manifest[key],oldManifest[key]);
 assert.equal(manifest.rawGatesPassed,false);assert.equal(manifest.admitted,false);assert.equal(manifest.optimizedAvailable,false);
});
check('only required LF rules and portable metadata comparison, old controls intact',()=>{
 const attrs=read('assets/art/fire-realism/.gitattributes'),tail='fluid-half-rate-corner-square.js text eol=lf\nfluid-half-rate-corner-square-transfer.js text eol=lf\nfluid-half-rate-corner-square.manifest.json text eol=lf\n';
 const verify=text=>{const c=text.replace(/\r\n/g,'\n');assert.ok(c.endsWith(tail));assert.equal(sha(c.slice(0,-tail.length)),'21d08236d18a630a838269d58a4f139923602d35ff6cc79305e000bc0b570946');};verify(attrs);verify(attrs.replace(/\r\n/g,'\n').replace(/\n/g,'\r\n'));assert.throws(()=>verify(attrs.replace('eol=lf','eol=crlf')));
 assert.equal(sha(read('assets/art/fire-realism/fluid-half-rate-matched-opacity.js')),'9722fe1e207000fe6763f631b6229373abdeb9813a059efb4264fc458412cae2');
 assert.equal(sha(read('assets/art/fire-realism/fluid-half-rate-matched-opacity.manifest.json')),'9eabfda4ab4a04405e9c504553b13439bb79dbbaffa914e54d7d2005930361a9');
 for(const file of ['source.mjs','check.mjs'])for(const spec of imports(read('workbenches/art/fire-realism/half-rate-corner-square/'+file)))assert.ok(fs.existsSync(path.resolve(root,'workbenches/art/fire-realism/half-rate-corner-square',spec)));
});
console.log(JSON.stringify({status:'PASS',checks:checks.length,entry:{bytes:Buffer.byteLength(candidate),sha256:sha(candidate)},adapter:{bytes:Buffer.byteLength(adapterSource),sha256:sha(adapterSource)},manifest:{bytes:Buffer.byteLength(manifestText),sha256:sha(manifestText)},fragment:{before:{bytes:base.length,sha256:sha(base)},after:{bytes:adapted.length,sha256:sha(adapted)}},inverseExact:true,replacementUnits:6,reachableModules:62,immutableDependencies:60,esmBytes:manifest.limits.esmBytes,binaryDeclarations:193,binaryBytesRead:0,geometryLeafBodiesRead:0,fullNamespaceEvaluated:false,sourceOnly:true,rawGatesPassed:false,admitted:false}));
