// Pure shader/source/CPU expectations and VM mock effects only. No data namespace.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {COUPLED_CONTROL,frozenCoupledControl,coupledCornerFragment,recoverCoupledCornerFragment,coupledOpticalState,recoverCoupledOpticalState,installCoupledCornerEmission} from '../../../../assets/art/fire-realism/coupled-corner-emission-transfer.js';
import {deriveManifest,CONTROL_COMMIT,ENTRY,HELPER,MANIFEST_PIN} from './source.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),sha=b=>createHash('sha256').update(b).digest('hex'),checks=[];let refusals=0;
const test=(n,f)=>{f();checks.push(n);},near=(a,b)=>assert(Math.abs(a-b)<=1e-11*Math.max(1,Math.abs(a),Math.abs(b)),a+' != '+b),refuse=f=>{assert.throws(f);refusals++;};
const base=frozenCoupledControl(),adapted=coupledCornerFragment(base.fragment),entry=read(ENTRY),helper=read(HELPER),baseManifestText=read('assets/art/fire-realism/corridor-emission-vector.manifest.json'),old=JSON.parse(baseManifestText),manifestText=read('assets/art/fire-realism/coupled-corner-emission.manifest.json'),manifest=JSON.parse(manifestText);
test('complete C90 fragment/vertex and exact one-term source plus uniform-object inverse',()=>{
 assert.equal(Buffer.byteLength(base.fragment),COUPLED_CONTROL.bytes);assert.equal(sha(base.fragment),COUPLED_CONTROL.sha256);assert.equal(Buffer.byteLength(base.vertex),166);assert.equal(sha(base.vertex),'eae6cf07c42792006b85a9f52320589b371c6b768592d28bd041f9e7535f4a35');
 assert.equal(adapted,base.fragment.replace('return (F*F)*palette;','return F*palette;'));assert.equal(recoverCoupledCornerFragment(adapted),base.fragment);
 const before={fragment:base.fragment,vertex:base.vertex,uniform:Object.freeze({value:0})},after=coupledOpticalState(before),recovered=recoverCoupledOpticalState(after,before);assert.deepEqual(recovered,before);assert.equal(recovered.uniform,before.uniform);assert.equal(after.uniform.value,6);assert(Object.isFrozen(after.uniform));
 for(const s of [base.fragment+' ',base.fragment.replace('smoke*1.8','smoke*1.9'),adapted])refuse(()=>coupledCornerFragment(s));
 for(const s of [adapted+' ',adapted.replace('(6.*r/1.)','(7.*r/1.)'),adapted+'return F*palette;'])refuse(()=>recoverCoupledCornerFragment(s));
 for(const changed of [{fragment:base.fragment+' '},{vertex:base.vertex+' '},{uniform:{value:1}},{uniform:null}])refuse(()=>coupledOpticalState({...before,...changed}));
 refuse(()=>recoverCoupledOpticalState({...after,uniform:{value:0}},before));refuse(()=>recoverCoupledOpticalState({...after,vertex:base.vertex+' '},before));
});
test('same shared16 reads/filtering, raw smoke/clocks/associated output and G once',()=>{
 const tri=s=>s.slice(s.indexOf('    vec3 tri('),s.indexOf('\n    float nativeA'));
 assert.equal(tri(adapted),tri(base.fragment));assert.equal((tri(adapted).match(/voxel\(data,/g)||[]).length,8);assert.equal((adapted.match(/texelFetch\(/g)||[]).length,1);
 const terms=['vec3 value=max(vec3(0.),mix(raw0,raw1,temporalMix));','vec3 localEmissionVector=mix(vector0,vector1,temporalMix);','float reacting=value.z*reactionGain*sourceA;','reacting*=mix(baseAllowed,1.,contactRelease);','float emissionGate=reactionGain*sourceA;','emissionGate*=mix(baseAllowed,1.,contactRelease);','float heat=clamp(value.y/3.,0.,1.);','mix(1.,.18,clamp(value.z*heat,0.,1.))','eaExtinction(smokeSigma,reacting)','eaAssociated(emission,transmittance,legibility)','vec3 eaDisplaySource(vec3 c){return c;}','ks+eaFlameExtinctionCoefficient*r'];
 for(const term of terms)assert(adapted.includes(term),term);
 assert.equal((adapted.match(/tri\(field0,p,vector0\)/g)||[]).length,1);assert.equal((adapted.match(/tri\(field1,p,vector1\)/g)||[]).length,1);assert(adapted.includes('return F*palette;'));assert(!adapted.includes('reacting*reacting'));
 assert.equal((adapted.match(/clamp\(F,/g)||[]).length,0);
});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);},mix=(a,b,t)=>a.map((x,i)=>x*(1-t)+b[i]*t);
function P(T,F){const h=Math.max(0,Math.min(1,(T-1.5)/1.5)),warm=mix([1.30,.19,.018],[1.65,.78,.19],smooth(.20,.82,h));return mix(warm,[1.65,1.45,.95],h**8*smooth(.70,.97,F)*.18);}
const corner=c=>P(c[1],c[2]).map(x=>x*c[2]);
function tri(c,f){return mix(mix(mix(c[0],c[1],f[0]),mix(c[2],c[3],f[0]),f[1]),mix(mix(c[4],c[5],f[0]),mix(c[6],c[7],f[0]),f[1]),f[2]);}
function sample(a,b,f,t){return {raw:mix(tri(a.map(c=>c.slice(0,3)),f),tri(b.map(c=>c.slice(0,3)),f),t).map(x=>Math.max(0,x)),vector:mix(tri(a.map(corner),f),tri(b.map(corner),f),t)};}
const constant=F=>Array.from({length:8},()=>[.3,F>.01?1.5+1.5*F:0,F,999]);
let heterogeneous;
test('independent expanded spatial/temporal FP weights; F0, Fgreater1 and stored-alpha independence',()=>{
 assert.deepEqual(corner([0,0,0]),[0,0,0]);corner([0,3,1]).forEach((x,i)=>near(x,P(3,1)[i]));corner([0,3.375,1.25]).forEach((x,i)=>near(x,1.25*P(3.375,1.25)[i]));
 const a=constant(0),b=constant(1),s=sample(a,b,[.2,.4,.7],.5);s.vector.forEach((x,i)=>near(x,.5*P(3,1)[i]));assert.notDeepEqual(s.vector,P(1.5,.5).map(x=>.5*x));
 const aa=Array.from({length:8},(_,i)=>[.1*i,1.5+1.5*(.1+i*.12),.1+i*.12,40+i]),bb=Array.from({length:8},(_,i)=>[.3-i*.1,1.5+1.5*(1.2-i*.13),1.2-i*.13,-40-i]),f=[.23,.41,.67],t=.37,out=sample(aa,bb,f,t),weight=i=>(i&1?f[0]:1-f[0])*(i&2?f[1]:1-f[1])*(i&4?f[2]:1-f[2]);
 for(let c=0;c<3;c++){near(out.vector[c],aa.reduce((n,v,i)=>n+weight(i)*((1-t)*corner(v)[c]+t*corner(bb[i])[c]),0));near(out.raw[c],Math.max(0,aa.reduce((n,v,i)=>n+weight(i)*((1-t)*v[c]+t*bb[i][c]),0)));}
 const copy=structuredClone(aa);aa.forEach(v=>v[3]*=-100);assert.deepEqual(sample(aa,bb,f,t),sample(copy,bb,f,t));heterogeneous=out;
});
function law(f,J,G,ks,S){return {k:ks+6*G*f,j:J.map((x,i)=>6*G*x+ks*S[i])};}
function closed(j,k,L){const q=k===0?L:-Math.expm1(-k*L)/k;return {C:j.map(x=>x*q),A:-Math.expm1(-k*L)};}
test('coupled homogeneous/F-weighted source functions, smoke/F0/G0 and associated subdivision',()=>{
 const S=[.08,.04,.02];
 for(const F of [.2,1,1.25]){const p=P(1.5+1.5*F,F),J=p.map(x=>F*x),v=law(F,J,.3,0,S);v.j.forEach((x,i)=>near(x/v.k,p[i]));}
 const f=heterogeneous.raw[2],J=heterogeneous.vector,v=law(f,J,.37,0,S);v.j.forEach((x,i)=>near(x/v.k,J[i]/f));
 for(const G of [0,.12,1])for(const ks of [0,.2,1e-10])for(const F of [0,.4,1.25]){const J=corner([.2,1.5+1.5*F,F]),{j,k}=law(F,J,G,ks,S),L=.8,expected=closed(j,k,L),legibility=.47;
  for(const count of [1,2,17,120]){const ds=L/count,tau=k*ds,t=Math.exp(-tau),q=tau<1e-3?ds*(1-tau*.5+tau*tau/6-tau**3/24):-Math.expm1(-tau)/k,C=[0,0,0];let trans=1;
   for(let n=0;n<count;n++){C.forEach((x,i)=>C[i]+=trans*q*j[i]);trans*=t;}C.forEach((x,i)=>near(x*legibility,expected.C[i]*legibility));near((1-trans)*legibility,expected.A*legibility);
  }
  if(G===0||F===0){near(k,ks);j.forEach((x,i)=>near(x,ks*S[i]));}
 }
 const full=law(f,J,1,.2,S),part=law(f,J,.12,.2,S);near(part.k-.2,.12*(full.k-.2));part.j.forEach((x,i)=>{near(x-.2*S[i],.12*(full.j[i]-.2*S[i]));assert.notEqual(x-.2*S[i],.12*.12*(full.j[i]-.2*S[i]));});
 assert.deepEqual(closed([0,0,0],0,1),{C:[0,0,0],A:0});
});
let mode='ok',latest,passedT,passedOptions,calls=0;
function fakeEffect(){
 const state={disposed:0,study:{rawGatesPassed:false,admitted:false}},children=Array.from({length:92},(_,i)=>{const uniform=Object.freeze({value:0}),m={isShaderMaterial:true,vertexShader:base.vertex,fragmentShader:base.fragment,uniforms:{eaFlameExtinctionCoefficient:uniform,token:{}},version:0};Object.defineProperty(m,'needsUpdate',{set(v){if(mode==='update-throws'&&i===91)throw Error('update fixture');if(v)m.version++;}});return {isMesh:true,material:m,geometry:{identity:i},originalUniform:uniform};});
 children.push({isMesh:false,isPointLight:true,intensity:4});
 if(mode==='last-fragment'||mode==='cleanup-throws')children[91].material.fragmentShader+='x';if(mode==='last-vertex')children[91].material.vertexShader+='x';if(mode==='last-uniform')children[91].material.uniforms.eaFlameExtinctionCoefficient={value:1};
 if(mode==='duplicate')children[1].material=children[0].material;if(mode==='missing')children.splice(91,1);if(mode==='array')children[91].material=[children[91].material];
 if(mode==='fragment-throws')Object.defineProperty(children[91].material,'fragmentShader',{get(){return base.fragment;},set(){throw Error('fragment fixture');}});
 if(mode==='uniform-throws')Object.defineProperty(children[91].material.uniforms,'eaFlameExtinctionCoefficient',{get(){return children[91].originalUniform;},set(){throw Error('uniform fixture');}});
 const effect={root:{children,traverse(fn){children.forEach(fn);}},update(){},reset(){},dispose(){state.disposed++;if(mode==='cleanup-throws')throw Error('cleanup fixture');},diagnostics(){return {version:'old',diagnostic:{scope:'misleading F squared scope',study:state.study},resources:{same:true},source:{age:1}};},state};latest=effect;return effect;
}
const context=createContext({structuredClone,AggregateError}),prep=()=>{},evidence=()=>{},audit=()=>{};
const oldModule=new SyntheticModule(['createCorridorEmissionVectorDiagnostic','prepareCorridorEmissionVectorData','corridorEmissionVectorPayloadEvidence','auditCorridorEmissionVectorRGBA'],function(){this.setExport('createCorridorEmissionVectorDiagnostic',(T,o)=>{calls++;passedT=T;passedOptions=o;return fakeEffect();});this.setExport('prepareCorridorEmissionVectorData',prep);this.setExport('corridorEmissionVectorPayloadEvidence',evidence);this.setExport('auditCorridorEmissionVectorRGBA',audit);},{context});
const helperModule=new SyntheticModule(['installCoupledCornerEmission'],function(){this.setExport('installCoupledCornerEmission',installCoupledCornerEmission);},{context});
const wrapper=new SourceTextModule(entry,{context});await wrapper.link(spec=>{if(spec==='./corridor-emission-vector.js')return oldModule;if(spec==='./coupled-corner-emission-transfer.js')return helperModule;throw Error('Foreign test import');});await wrapper.evaluate();const ns=wrapper.namespace;
test('exact three aliases, one delegated mock factory, root/lifecycle/options and honest diagnostics',()=>{
 assert.equal(ns.prepareCoupledCornerEmissionData,prep);assert.equal(ns.coupledCornerEmissionPayloadEvidence,evidence);assert.equal(ns.auditCoupledCornerEmissionRGBA,audit);assert.equal(Object.keys(ns).length,4);
 const T={},options={presentationContract:'common-linear-hdr-neutral-v1'},beforeCalls=calls,effect=ns.createCoupledCornerEmissionDiagnostic(T,options);assert.equal(calls-beforeCalls,1);assert.equal(passedT,T);assert.equal(passedOptions,options);assert.equal(effect.root,latest.root);for(const k of ['update','reset','dispose'])assert.equal(effect[k],latest[k]);
 for(const node of effect.root.children.filter(x=>x.isMesh)){const m=node.material;assert.equal(m.fragmentShader,adapted);assert.equal(m.vertexShader,base.vertex);assert.equal(m.uniforms.eaFlameExtinctionCoefficient.value,6);assert.equal(m.version,1);const inv=recoverCoupledOpticalState({fragment:m.fragmentShader,vertex:m.vertexShader,uniform:m.uniforms.eaFlameExtinctionCoefficient},{fragment:base.fragment,vertex:base.vertex,uniform:node.originalUniform});assert.equal(inv.uniform,node.originalUniform);}
 const d=effect.diagnostics();assert(!JSON.stringify(d).includes('misleading F squared scope'));assert.equal(d.diagnostic.normalization,6);assert.equal(d.diagnostic.flameExtinctionCoefficient,6);for(const k of ['rawGatesPassed','admitted','actualInputGridProof'])assert.equal(d.diagnostic[k],false);assert.equal(d.referenceAccepted,false);assert.equal(d.resources.same,true);assert.equal(d.source.age,1);d.diagnostic.study.rawGatesPassed=true;assert.equal(latest.state.study.rawGatesPassed,false);effect.dispose();assert.equal(latest.state.disposed,1);
});
test('every material guard precedes writes; mismatch/count/ownership disposal',()=>{
 for(const m of ['last-fragment','last-vertex','last-uniform','duplicate','missing','array']){mode=m;refuse(()=>ns.createCoupledCornerEmissionDiagnostic({},{}));assert.equal(latest.state.disposed,1);for(const x of latest.root.children.filter(x=>x.isMesh&&!Array.isArray(x.material))){assert.equal(x.material.version,0);assert.equal(x.material.fragmentShader,x===latest.root.children[91]&&m==='last-fragment'?base.fragment+'x':base.fragment);}}
 mode='ok';
});
test('fragment/uniform/invalidation setter failure cannot escape; both cleanup errors retained',()=>{
 for(const m of ['fragment-throws','uniform-throws','update-throws']){mode=m;refuse(()=>ns.createCoupledCornerEmissionDiagnostic({},{}));assert.equal(latest.state.disposed,1);}
 mode='cleanup-throws';try{ns.createCoupledCornerEmissionDiagnostic({},{});assert.fail('Refusal required');}catch(e){assert.equal(e.errors.length,2);assert.match(e.errors[0].message,/C90/);assert.match(e.errors[1].message,/cleanup fixture/);refusals++;}mode='ok';
});
test('66-module closure and correct usage, immutable64/193 declarations and one original store',()=>{
 assert.equal(Buffer.byteLength(baseManifestText),MANIFEST_PIN.bytes);assert.equal(sha(baseManifestText),MANIFEST_PIN.sha256);assert.equal(manifestText,deriveManifest(baseManifestText,entry,helper));refuse(()=>deriveManifest(baseManifestText+' ',entry,helper));
 const declared=new Map(manifest.runtimeFiles.map(x=>[x.path,x]));assert.equal(declared.size,66);for(const row of old.runtimeFiles)assert.deepEqual(declared.get(row.path),row);
 for(const [p,t]of [[ENTRY,entry],[HELPER,helper]]){assert.equal(declared.get(p).bytes,Buffer.byteLength(t));assert.equal(declared.get(p).sha256,sha(t));for(const spec of new SourceTextModule(t).dependencySpecifiers){assert(spec.startsWith('./'));assert(declared.has(path.posix.join(path.posix.dirname(p),spec)));}}
 assert.equal(manifest.limits.esmBytes,11196348+Buffer.byteLength(entry)+Buffer.byteLength(helper));const {esmBytes:a,...oldLimits}=old.limits,{esmBytes:b,...newLimits}=manifest.limits;assert.deepEqual(newLimits,oldLimits);assert.deepEqual(manifest.runtimeResources,old.runtimeResources);assert.equal(manifest.runtimeResources.length,193);
 for(const key of ['study','sourceRawManifestSha256','sourcePins','sourceQualification','geometry','nativeComparisonUnderlay','presentationContract'])assert.deepEqual(manifest[key],old[key]);for(const k of ['rawGatesPassed','admitted','referenceAccepted','actualInputGridProof'])assert.equal(manifest[k],false);assert.equal(manifest.opticalControl.normalization,6);assert.equal(manifest.opticalControl.flameExtinctionCoefficient,6);assert.equal(manifest.costWorkload,undefined);
 assert(!entry.includes('createBinaryFieldStore'));assert(!helper.includes('createBinaryFieldStore'));const index=read('assets/art/fire-realism/fluid-contact-corridor-source-diagnostic-01/index.js');assert.equal((index.match(/createBinaryFieldStore\(FIELD_METADATA\)/g)||[]).length,1);
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),asset='assets/art/fire-realism/fluid-contact-corridor-source-diagnostic-01';assert.equal(git('rev-parse','HEAD:'+asset),'a1be9735d01617b19acde8bd6c1f2c1c3cf998df');assert.equal(git('diff',CONTROL_COMMIT,'--',asset,'assets/art/fire-realism/corridor-emission-vector.js','assets/art/fire-realism/corridor-emission-vector-transfer.js','assets/art/fire-realism/corridor-emission-vector.manifest.json'),'');
});
test('only three literal LF rules appended; original prefix preserved and note links present',()=>{
 const prov=JSON.parse(read('workbenches/art/fire-realism/coupled-corner-emission/provenance.json')),attrs=fs.readFileSync(path.join(root,'assets/art/fire-realism/.gitattributes')),tail=Buffer.from(prov.parentAttributesAppended),prefix=attrs.subarray(0,attrs.length-tail.length);assert(attrs.subarray(attrs.length-tail.length).equals(tail));assert.equal(prefix.length,prov.parentAttributesBeforeRaw.bytes);assert.equal(sha(prefix),prov.parentAttributesBeforeRaw.sha256);
 const oldGit=execFileSync('git',['show',CONTROL_COMMIT+':assets/art/fire-realism/.gitattributes'],{cwd:root});assert(Buffer.from(prefix.toString().replace(/\r\n/g,'\n')).equals(oldGit));
 for(const p of ['workbenches/art/fire-realism/coupled-corner-emission/README.md','workbenches/art/fire-realism/coupled-corner-emission/provenance.json'])assert(fs.existsSync(path.join(root,p)));assert.equal(prov.parent,CONTROL_COMMIT);assert.equal(prov.sourceOnly,true);
});
console.log(JSON.stringify({status:'PASS',groups:checks.length,refusals,checks,fragment:{before:{bytes:Buffer.byteLength(base.fragment),sha256:sha(base.fragment)},after:{bytes:Buffer.byteLength(adapted),sha256:sha(adapted)}},sourceSubstitutions:1,uniform:{before:0,after:6,originalObjectIdentityInverse:true},inverseExact:true,modules:66,immutableOriginalModules:64,resources:193,esmBytes:manifest.limits.esmBytes,aliasesExact:true,storesAdded:0,actualFactoryOrRenderer:false,dataNamespaceEvaluated:false,binaryOrGeometryLeafReads:0,sourceOnly:true},null,2));
