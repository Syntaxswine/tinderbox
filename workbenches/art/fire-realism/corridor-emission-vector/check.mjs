// Pure shader/source/numeric and MOCK-effect checks. No real index/factory/data imports.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {FROZEN_FRAGMENT,frozenCornerVectorControl,cornerVectorEdits,cornerEmissionVectorFragment,recoverCornerEmissionVector,installCornerEmissionVector} from '../../../../assets/art/fire-realism/corridor-emission-vector-transfer.js';
import {deriveManifest,CONTROL_COMMIT,CONTROL_ROOT,ENTRY,HELPER,MANIFEST_PIN} from './source.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),sha=s=>createHash('sha256').update(s).digest('hex'),checks=[];let refusals=0;
const test=(n,f)=>{f();checks.push(n);},near=(a,b)=>assert(Math.abs(a-b)<=1e-11*Math.max(1,Math.abs(a),Math.abs(b)),a+' != '+b);
const base=frozenCornerVectorControl(),adapted=cornerEmissionVectorFragment(base.fragment),entry=read(ENTRY),helper=read(HELPER),oldManifestText=read(CONTROL_ROOT+'manifest.json'),oldManifest=JSON.parse(oldManifestText),manifestText=read('assets/art/fire-realism/corridor-emission-vector.manifest.json'),manifest=JSON.parse(manifestText);
function refusal(f){assert.throws(f);refusals++;}
test('complete frozen fragment and six substitutions/full inverse; unexpected bytes refuse',()=>{
 assert.equal(Buffer.byteLength(base.fragment),5898);assert.equal(sha(base.fragment),FROZEN_FRAGMENT.sha256);assert.equal(cornerVectorEdits().length,6);assert.equal(recoverCornerEmissionVector(adapted),base.fragment);
 for(const s of [base.fragment+' ',base.fragment.replace('smoke*1.8','smoke*1.9'),adapted])refusal(()=>cornerEmissionVectorFragment(s));
 refusal(()=>recoverCornerEmissionVector(adapted+' '));refusal(()=>recoverCornerEmissionVector(adapted.replace('(6.*r/1.)','(7.*r/1.)')));
 for(const [before,after]of cornerVectorEdits()){assert.equal(base.fragment.split(before).length-1,1);assert.equal(adapted.split(after).length-1,1);}
});
test('same16 corner reads, unchanged voxel/bounds/raw RGB mix order; only vector added',()=>{
 const block=s=>s.slice(s.indexOf('    vec3 tri('),s.indexOf('\n    float nativeA'));
 assert.equal((block(base.fragment).match(/voxel\(data,/g)||[]).length,8);assert.equal((block(adapted).match(/voxel\(data,/g)||[]).length,8);assert.equal((adapted.match(/texelFetch\(/g)||[]).length,1);
 const terms=['voxel(data,i).rgb','voxel(data,i+ivec3(1,0,0)).rgb','voxel(data,i+ivec3(0,1,0)).rgb','voxel(data,i+ivec3(1,1,0)).rgb','voxel(data,i+ivec3(0,0,1)).rgb','voxel(data,i+ivec3(1,0,1)).rgb','voxel(data,i+ivec3(0,1,1)).rgb','voxel(data,i+ivec3(1,1,1)).rgb'],names=['c000','c100','c010','c110','c001','c101','c011','c111'];
 const ret=s=>s.match(/return mix\([^\n]+;/)[0];let recovered=ret(block(adapted));names.forEach((n,i)=>{recovered=recovered.replaceAll(n,terms[i]);});assert.equal(recovered,ret(block(base.fragment)));
 assert(adapted.includes('vec3 value=max(vec3(0.),mix(raw0,raw1,temporalMix));'));assert(adapted.includes('vec3 localEmissionVector=mix(vector0,vector1,temporalMix);'));
 for(const term of ['float reacting=value.z*reactionGain*sourceA;','reacting*=mix(baseAllowed,1.,contactRelease);','float heat=clamp(value.y/3.,0.,1.);','mix(1.,.18,clamp(value.z*heat,0.,1.))','eaExtinction(smokeSigma,reacting)','eaAssociated(emission,transmittance,legibility)','vec3 eaDisplaySource(vec3 c){return c;}'])assert(adapted.includes(term),term);
 assert.equal((adapted.match(/tri\(field0,p,vector0\)/g)||[]).length,1);assert.equal((adapted.match(/tri\(field1,p,vector1\)/g)||[]).length,1);assert(adapted.includes('(F*F)*palette'));assert(!adapted.includes('reacting*reacting'));
});
const sm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function P(h,F){let p=[1.30,.19,.018].map((x,i)=>x+([1.65,.78,.19][i]-x)*sm(.20,.82,h));const t=h**8*sm(.70,.97,F)*.18;return p.map((x,i)=>x+([1.65,1.45,.95][i]-x)*t);}
const corner=c=>{const h=Math.max(0,Math.min(1,(c[1]-1.5)/1.5));return P(h,c[2]).map(x=>x*c[2]*c[2]);},mix=(a,b,t)=>a.map((x,i)=>x*(1-t)+b[i]*t);
function tri(c,f){return mix(mix(mix(c[0],c[1],f[0]),mix(c[2],c[3],f[0]),f[1]),mix(mix(c[4],c[5],f[0]),mix(c[6],c[7],f[0]),f[1]),f[2]);}
const constant=F=>Array.from({length:8},()=>[.3,F>.01?1.5+1.5*F:0,F,999]);
function sampled(a,b,f,t){return {raw:mix(tri(a.map(c=>c.slice(0,3)),f),tri(b.map(c=>c.slice(0,3)),f),t).map(x=>Math.max(0,x)),vector:mix(tri(a.map(corner),f),tri(b.map(corner),f),t)};}
test('unit/zero/Fgreater1, full-vector mixed0/1 and temporal/spatial weights expectations',()=>{
 assert.deepEqual(corner([0,0,0]),[0,0,0]);corner([0,3,1]).forEach((x,i)=>near(x,P(1,1)[i]));corner([0,3.375,1.25]).forEach((x,i)=>near(x,1.5625*P(1,1.25)[i]));
 const a=constant(0),b=constant(1),s=sampled(a,b,[.2,.4,.7],.5);s.vector.forEach((x,i)=>near(x,.5*P(1,1)[i]));assert.notDeepEqual(s.vector,P(0,.5).map(x=>.25*x));
 const aa=Array.from({length:8},(_,i)=>[.1*i,1.5+1.5*(.1+i*.12),.1+i*.12,40+i]),bb=Array.from({length:8},(_,i)=>[.3-i*.1,1.5+1.5*(1.2-i*.13),1.2-i*.13,-40-i]),f=[.23,.41,.67],t=.37,out=sampled(aa,bb,f,t),weights=i=>(i&1?f[0]:1-f[0])*(i&2?f[1]:1-f[1])*(i&4?f[2]:1-f[2]);
 for(let c=0;c<3;c++){const expected=aa.reduce((n,v,i)=>n+weights(i)*((1-t)*corner(v)[c]+t*corner(bb[i])[c]),0);near(out.vector[c],expected);const raw=aa.reduce((n,v,i)=>n+weights(i)*((1-t)*v[c]+t*bb[i][c]),0);near(out.raw[c],Math.max(0,raw));}
 const copy=structuredClone(aa);aa.forEach(v=>v[3]*=-100);assert.deepEqual(sampled(aa,bb,f,t),sampled(copy,bb,f,t));
});
test('G0/fractionalG once after response, unchanged smoke/extinction and stable homogeneous subdivision',()=>{
 const J=corner([.2,2.1,.4]),S=[.08,.04,.02];assert(adapted.includes('float emissionGate=reactionGain*sourceA;'));assert(adapted.includes('emissionGate*=mix(baseAllowed,1.,contactRelease);'));assert(adapted.includes('eaEmission(emissionGate,smokeSigma,localEmissionVector,soot)'));assert(adapted.includes('(6.*r/1.)*eaDisplaySource(fire)+ks*eaDisplaySource(soot)'));
 for(const G of [0,.12,1])for(const k of [0,.2,1e-10]){const L=.8,j=J.map((x,i)=>6*G*x+k*S[i]),T=Math.exp(-k*L),q=k===0?L:-Math.expm1(-k*L)/k,C=j.map(x=>x*q),A=1-T;
  for(const count of [1,2,17,120]){const ds=L/count,tau=k*ds,t=Math.exp(-tau),z=tau<1e-3?ds*(1-tau*.5+tau*tau/6-tau**3/24):(1-t)/k,c=[0,0,0];let trans=1;for(let n=0;n<count;n++){c.forEach((x,i)=>c[i]+=trans*z*j[i]);trans*=t;}c.forEach((x,i)=>near(x,C[i]));near(1-trans,A);}
 }
 J.forEach(x=>{near(6*.12*x,2*(6*.06*x));assert.notEqual(6*.12*x,6*.12*.12*x);});
});
let mode='ok',latest=null,passedT=null,passedOptions=null;
function fakeEffect(){
 const state={disposed:0,updates:0,resets:0,study:{rawGatesPassed:false,admitted:false}},children=Array.from({length:92},(_,i)=>{const m={isShaderMaterial:true,vertexShader:base.vertex,fragmentShader:base.fragment,uniforms:{eaFlameExtinctionCoefficient:Object.freeze({value:0}),token:{}},version:0};Object.defineProperty(m,'needsUpdate',{set(v){if(mode==='update-throws'&&i===91)throw Error('update fixture');if(v)m.version++;}});return {isMesh:true,material:m,geometry:{identity:i}};});children.push({isMesh:false,isPointLight:true,intensity:4});
 if(mode==='last-mismatch')children[91].material.fragmentShader+='x';if(mode==='duplicate')children[1].material=children[0].material;if(mode==='missing')children.pop(),children.pop();if(mode==='array')children[91].material=[children[91].material];
 const effect={root:{children,traverse(fn){children.forEach(fn);}},update(){state.updates++;},reset(){state.resets++;},dispose(){state.disposed++;if(mode==='cleanup-throws')throw Error('cleanup fixture');},diagnostics(){return {version:'old',diagnostic:{scope:'misleading fixed6F',study:state.study},resources:{same:true},source:{age:1}};},state};if(mode==='cleanup-throws')children[91].material.fragmentShader+='x';latest=effect;return effect;
}
const context=createContext({structuredClone,AggregateError}),prep=()=>{},evidence=()=>{},audit=()=>{};
const old=new SyntheticModule(['createCorridorSourceLinearHdrDiagnostic','prepareCorridorSourceDiagnosticData','corridorSourceDiagnosticPayloadEvidence','auditCorridorSourceDiagnosticRGBA'],function(){this.setExport('createCorridorSourceLinearHdrDiagnostic',(T,o)=>{passedT=T;passedOptions=o;return fakeEffect();});this.setExport('prepareCorridorSourceDiagnosticData',prep);this.setExport('corridorSourceDiagnosticPayloadEvidence',evidence);this.setExport('auditCorridorSourceDiagnosticRGBA',audit);},{context});
const helperMock=new SyntheticModule(['installCornerEmissionVector'],function(){this.setExport('installCornerEmissionVector',installCornerEmissionVector);},{context});
const wrapper=new SourceTextModule(entry,{context});await wrapper.link(spec=>{if(spec==='./fluid-contact-corridor-source-diagnostic-01/index.js')return old;if(spec==='./corridor-emission-vector-transfer.js')return helperMock;throw Error('Foreign test import');});await wrapper.evaluate();const ns=wrapper.namespace;
test('exact aliases/one existing store seam, same options/root/lifecycle and replacement diagnostics',()=>{
 assert.equal(ns.prepareCorridorEmissionVectorData,prep);assert.equal(ns.corridorEmissionVectorPayloadEvidence,evidence);assert.equal(ns.auditCorridorEmissionVectorRGBA,audit);assert.equal(Object.keys(ns).length,4);
 const T={},options={presentationContract:'common-linear-hdr-neutral-v1'},effect=ns.createCorridorEmissionVectorDiagnostic(T,options);assert.equal(passedT,T);assert.equal(passedOptions,options);assert.equal(effect.root,latest.root);for(const k of ['update','reset','dispose'])assert.equal(effect[k],latest[k]);for(const node of effect.root.children.filter(x=>x.isMesh)){assert.equal(node.material.fragmentShader,adapted);assert.equal(node.material.vertexShader,base.vertex);assert.equal(node.material.uniforms.eaFlameExtinctionCoefficient.value,0);assert.equal(node.material.version,1);}
 const d=effect.diagnostics();assert(!JSON.stringify(d).includes('misleading fixed6F'));assert.equal(d.diagnostic.rawGatesPassed,false);assert.equal(d.diagnostic.admitted,false);assert.equal(d.diagnostic.actualInputGridProof,false);assert.equal(d.referenceAccepted,false);assert.equal(d.diagnostic.flameNormalization,6);d.diagnostic.study.rawGatesPassed=true;assert.equal(latest.state.study.rawGatesPassed,false);effect.dispose();assert.equal(latest.state.disposed,1);
});
test('ALL-material mismatch/count/ownership refusals precede mutation and dispose original',()=>{
 for(const m of ['last-mismatch','duplicate','missing','array']){mode=m;refusal(()=>ns.createCorridorEmissionVectorDiagnostic({},{}));assert.equal(latest.state.disposed,1);for(const x of latest.root.children.filter(x=>x.isMesh&&!Array.isArray(x.material)))assert.equal(x.material.version,0);}
 mode='update-throws';refusal(()=>ns.createCorridorEmissionVectorDiagnostic({},{}));assert.equal(latest.state.disposed,1);mode='cleanup-throws';try{ns.createCorridorEmissionVectorDiagnostic({},{});assert.fail();}catch(e){assert.equal(e.errors.length,2);refusals++;}mode='ok';
});
test('manifest exact64 closure/usage and193 unchanged declarations; no data body/read/namespace eval',()=>{
 assert.equal(manifestText,deriveManifest(oldManifestText,entry,helper));refusal(()=>deriveManifest(oldManifestText+' ',entry,helper));const declared=new Map(manifest.runtimeFiles.map(x=>[x.path,x]));assert.equal(declared.size,64);for(const x of oldManifest.runtimeFiles)assert.deepEqual(declared.get(x.path),x);
 for(const [p,t]of [[ENTRY,entry],[HELPER,helper]]){assert.equal(declared.get(p).bytes,Buffer.byteLength(t));assert.equal(declared.get(p).sha256,sha(t));const parsed=new SourceTextModule(t);for(const spec of parsed.dependencySpecifiers){assert(spec.startsWith('./'));const target=path.posix.join(path.posix.dirname(p),spec);assert(declared.has(target));}}
 assert.equal(manifest.limits.esmBytes,11189282+Buffer.byteLength(entry)+Buffer.byteLength(helper));const {esmBytes:a,...oldLimits}=oldManifest.limits,{esmBytes:b,...newLimits}=manifest.limits;assert.deepEqual(newLimits,oldLimits);assert.deepEqual(manifest.runtimeResources,oldManifest.runtimeResources);assert.equal(manifest.runtimeResources.length,193);
 for(const k of ['study','sourceRawManifestSha256','sourcePins','sourceQualification','geometry','nativeComparisonUnderlay'])assert.deepEqual(manifest[k],oldManifest[k]);assert.equal(manifest.rawGatesPassed,false);assert.equal(manifest.admitted,false);assert.equal(manifest.referenceAccepted,false);
 assert.equal((entry.match(/createBinaryFieldStore/g)||[]).length,0);assert.equal((helper.match(/createBinaryFieldStore/g)||[]).length,0);const index=read(CONTROL_ROOT+'index.js');assert.equal((index.match(/createBinaryFieldStore\(FIELD_METADATA\)/g)||[]).length,1);
 const tree=execFileSync('git',['rev-parse',CONTROL_COMMIT+':'+CONTROL_ROOT.slice(0,-1)],{cwd:root,encoding:'utf8'}).trim(),now=execFileSync('git',['rev-parse','HEAD:'+CONTROL_ROOT.slice(0,-1)],{cwd:root,encoding:'utf8'}).trim();assert.equal(tree,now);
});
test('only literal three LF rules added, original bytes/rules and frozen control tree preserved',()=>{
 const p=JSON.parse(read('workbenches/art/fire-realism/corridor-emission-vector/provenance.json')),attrs=fs.readFileSync(path.join(root,'assets/art/fire-realism/.gitattributes')),tail=Buffer.from(p.parentAttributesAppended);assert(attrs.subarray(attrs.length-tail.length).equals(tail));const prefix=attrs.subarray(0,attrs.length-tail.length);assert.equal(prefix.length,p.parentAttributesBeforeRaw.bytes);assert.equal(sha(prefix),p.parentAttributesBeforeRaw.sha256);
 const oldGit=execFileSync('git',['show',CONTROL_COMMIT+':assets/art/fire-realism/.gitattributes'],{cwd:root});assert(Buffer.from(prefix.toString().replace(/\r\n/g,'\n')).equals(oldGit));assert.equal(p.response,'Explicit uncalibrated artist-selected F squared response; no stronger physical derivation claim.');
});
console.log(JSON.stringify({status:'PASS',groups:checks.length,refusals,checks,fragment:{before:{bytes:Buffer.byteLength(base.fragment),sha256:sha(base.fragment)},after:{bytes:Buffer.byteLength(adapted),sha256:sha(adapted)}},inverseExact:true,substitutions:6,modules:64,immutableOriginalModules:62,resources:193,esmBytes:manifest.limits.esmBytes,aliasesExact:true,storesAdded:0,actualFactoryOrRenderer:false,dataNamespaceEvaluated:false,binaryOrGeometryLeafReads:0,sourceOnly:true},null,2));
