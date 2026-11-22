import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createShadowProbe} from '../../tools/review/visual-shadow-probe-collector.mjs';
import {instrumentShadowModule,stripShadowInstrumentation,SHADOW_THREE_PATH,SHADOW_THREE_SHA256,SHADOW_REASONS,shadowSha,prepareShadowProbeCopy} from '../../tools/review/visual-shadow-probe.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),original=fs.readFileSync(path.join(root,SHADOW_THREE_PATH),'utf8');
const patched=instrumentShadowModule(original);
const between=(source,first,last)=>{if(source.includes('\r\n')){first=first.replaceAll('\n','\r\n');last=last.replaceAll('\n','\r\n');}const a=source.indexOf(first);assert.ok(a>=0,first);const b=source.indexOf(last,a+first.length);assert.ok(b>a,last);return source.slice(a,b);};
const plain=value=>JSON.parse(JSON.stringify(value));
const expression=(source,first,last,context)=>vm.runInContext('('+between(source,first,last).trim()+')',context);

test('QA patch is pinned, insertion-only, parseable, deterministic, and cannot target production output',()=>{
  assert.equal(shadowSha(original),SHADOW_THREE_SHA256);assert.equal(patched.metadata.seams.length,39);
  assert.equal(patched.metadata.reasonSites,25);assert.equal(stripShadowInstrumentation(patched.source),original);
  assert.equal(instrumentShadowModule(original).source,patched.source);assert.equal(new Set(patched.metadata.seams.map(p=>p.id)).size,39);
  assert.throws(()=>instrumentShadowModule(original+'\n'),/HASH_MISMATCH/);assert.throws(()=>instrumentShadowModule(patched.source),/HASH_MISMATCH/);
  const module=new vm.SourceTextModule(patched.source);assert.ok(module.dependencySpecifiers.includes('./tinderbox-m30-shadow-probe.js'));
  assert.equal(module.dependencySpecifiers.length,new vm.SourceTextModule(original).dependencySpecifiers.length+1);
  assert.throws(()=>prepareShadowProbeCopy({referenceDirectory:root,workspace:root,outputDirectory:path.join(root,'vendor','forbidden-shadow-output')}),/OUTPUT_NOT_PRIVATE_QA/);
  assert.equal(fs.existsSync(path.join(root,'vendor','forbidden-shadow-output')),false);
});

function baseDecision(){
  return {material:{version:1,fog:true},materialProperties:{__version:1,needsLights:true,lightsStateVersion:1,outputColorSpace:0,batching:false,batchingColor:false,instancing:false,instancingColor:false,instancingMorph:false,skinning:false,envMap:null,fog:null,numClippingPlanes:0,numIntersection:0,vertexAlphas:false,vertexTangents:false,morphTargets:false,morphNormals:false,morphColors:false,toneMapping:0,morphTargetsCount:0},
    lights:{state:{version:1}},colorSpace:0,object:{isBatchedMesh:false,isInstancedMesh:false,isSkinnedMesh:false,colorTexture:null,instanceColor:null,morphTexture:null},
    envMap:null,fog:null,clipping:{numPlanes:0,numIntersection:0},vertexAlphas:false,vertexTangents:false,morphTargets:false,morphNormals:false,morphColors:false,toneMapping:0,morphTargetsCount:0};
}
const changes=[
  c=>c.lights.state.version++,c=>c.colorSpace++,c=>c.object.isBatchedMesh=true,c=>c.materialProperties.batching=true,
  c=>{c.object.isBatchedMesh=true;c.materialProperties.batching=true;c.materialProperties.batchingColor=true;},
  c=>{c.object.isBatchedMesh=true;c.materialProperties.batching=true;c.object.colorTexture={};},
  c=>c.object.isInstancedMesh=true,c=>c.materialProperties.instancing=true,c=>c.object.isSkinnedMesh=true,c=>c.materialProperties.skinning=true,
  c=>{c.object.isInstancedMesh=true;c.materialProperties.instancing=true;c.materialProperties.instancingColor=true;},
  c=>{c.object.isInstancedMesh=true;c.materialProperties.instancing=true;c.object.instanceColor={};},
  c=>{c.object.isInstancedMesh=true;c.materialProperties.instancing=true;c.materialProperties.instancingMorph=true;},
  c=>{c.object.isInstancedMesh=true;c.materialProperties.instancing=true;c.object.morphTexture={};},
  c=>c.envMap={},c=>c.fog={},c=>c.clipping.numPlanes++,c=>c.vertexAlphas=true,c=>c.vertexTangents=true,
  c=>c.morphTargets=true,c=>c.morphNormals=true,c=>c.morphColors=true,c=>c.toneMapping++,c=>c.morphTargetsCount++,c=>c.material.version++
];
test('all 25 actual reason branches preserve decisions and original version writes',()=>{
  const probe=createShadowProbe(),keys=Object.keys(baseDecision());
  const compile=source=>vm.compileFunction(between(source,'let needsProgramChange = false;','let program = materialProperties.currentProgram;')+'return {needsProgramChange,version:materialProperties.__version};',keys,{parsingContext:vm.createContext({__m30ShadowProbe:probe})});
  const a=compile(original),b=compile(patched.source);assert.equal(changes.length,SHADOW_REASONS.length);
  for(let i=-1;i<changes.length;i++){
    const input=baseDecision();if(i>=0)changes[i](input);const old=structuredClone(input),next=structuredClone(input);
    probe.begin('reason-'+i);const shadow=probe.enterShadow(true),direct=probe.enterDirect(next.object.isSkinnedMesh,8);
    assert.deepEqual(plain(b(...keys.map(k=>next[k]))),plain(a(...keys.map(k=>old[k]))));assert.deepEqual(next,old);
    probe.leaveDirect(direct);probe.leaveShadow(shadow);const result=probe.end();
    const reasons=Object.keys(result.totals).filter(k=>k.startsWith('program-reason:'));
    assert.deepEqual(reasons,i<0?[]:['program-reason:'+SHADOW_REASONS[i]]);
    if(i>=0)assert.equal(result.totals[reasons[0]],1);assert.equal(result.balanced,true);
  }
});
function mockRun(source,{probe,fail=false,active=true}={}){
  const events=[],context=vm.createContext({__m30ShadowProbe:probe,console}),T=4;
  const gl={TRIANGLES:T,LINES:1,LINE_STRIP:3,LINE_LOOP:2,POINTS:0,UNSIGNED_SHORT:5123};
  const info=expression(source,'function WebGLInfo( gl ) {','\nfunction WebGLMorphtargets',context)(gl);
  let lastProgram=null;
  const state={setMaterial:(m,cw)=>events.push(['material',m.id,m.side,cw]),setLineWidth:n=>events.push(['line',n]),
    useProgram:p=>{events.push(['useProgram',p.id]);const changed=p.id!==lastProgram;lastProgram=p.id;return changed;}};
  const refresh=between(source,'let refreshProgram = false;','if ( refreshProgram || _currentCamera !== camera ) {');
  Object.assign(context,{_gl:gl,_emptyScene:{},state,_currentMaterialId:-1,info,extensions:{get:()=>null},
    getTargetPixelRatio:()=>1,warnOnce:()=>{},bindingStates:{setup:(o,m,p,g,index)=>events.push(['bindings',o.id,m.id,p.id,!!index])},
    attributes:{get:()=>({type:gl.UNSIGNED_SHORT,bytesPerElement:2})},geometries:{getWireframeAttribute:g=>g.index}});
  const refreshFn=vm.compileFunction(refresh,['program','material','materialProperties'],{parsingContext:context});
  context.setProgram=(camera,scene,geometry,material,object)=>{
    events.push(['setProgram',object.id,material.id]);const id=object.isSkinnedMesh?2:1,program={id,program:{id},getUniforms:()=>({})};
    refreshFn(program,material,{uniforms:{}});return program;
  };
  const buffers=(indexed)=>({setIndex:a=>events.push(['index',a.type]),setMode:m=>events.push(['mode',m]),
    render:(start,count)=>draw(indexed,start,count,1),renderInstances:(start,count,instances)=>{if(instances)draw(indexed,start,count,instances);}});
  function draw(indexed,start,count,instances){events.push(['draw',indexed,start,count,instances]);if(fail)throw Error('DRAW_FAILURE');info.update(count,T,instances);}
  context.bufferRenderer=buffers(false);context.indexedBufferRenderer=buffers(true);
  let direct=between(source,'this.renderBufferDirect = function ( camera, scene, geometry, material, object, group ) {','\n\n\t\t// Compile').trim();
  direct=direct.slice('this.renderBufferDirect = '.length,-1);
  const renderer={renderBufferDirect:vm.runInContext('('+direct+')',context)};
  const geom=(indexed=true)=>({index:indexed?{count:6}:null,attributes:{position:{count:6}},groups:[],drawRange:{start:0,count:6}});
  const material=id=>({id,side:2,visible:true,wireframe:false});
  const make=(id,skinned,materials)=>({id,visible:true,isMesh:true,isSkinnedMesh:skinned,castShadow:true,frustumCulled:false,children:[],layers:{test:()=>true},material:materials,geometry:geom(),
    matrixWorld:{determinant:()=>1},modelViewMatrix:{multiplyMatrices:()=>events.push(['matrix',id])},
    onBeforeShadow:()=>events.push(['before',id]),onAfterShadow:()=>events.push(['after',id])});
  const one=make('ordinary',false,material(10)),two=make('skinned',true,[material(20),material(21)]);
  two.geometry.groups=[{start:0,count:3,materialIndex:0},{start:3,count:3,materialIndex:1}];
  const nested=make('nested-main',false,material(30));nested.geometry=geom(false);
  one.onBeforeShadow=()=>{events.push(['before',one.id]);renderer.renderBufferDirect({},null,nested.geometry,nested.material,nested,null);};
  const rootObject={visible:true,layers:{test:()=>true},children:[one,two]};
  Object.assign(context,{renderer,objects:{update:o=>{events.push(['update',o.id]);return o.geometry;}},
    getDepthMaterial:(_o,m)=>m,_frustum:{intersectsObject:()=>true},VSMShadowMap:3});
  const shadow=expression(source,'function renderObject( object, camera, shadowCamera, light, type ) {','\n\tfunction onMaterialDispose( event ) {',context);
  if(active)probe.begin('mock-submissions');
  let error=null;try{shadow(rootObject,{},{matrixWorldInverse:{}},{isPointLight:true},1);}catch(e){error=e.message;}
  const early=make('empty-range',false,material(40));early.geometry.drawRange.count=Infinity;early.geometry.index=null;early.geometry.attributes.position=null;
  renderer.renderBufferDirect({},null,early.geometry,early.material,early,null);
  const result=active?probe.end():probe.snapshot();
  return {events,info:plain(info.render),lastMaterial:context._currentMaterialId,error,result};
}
test('original and patched source issue the same ordered mock draws, callbacks, state switches and early returns',()=>{
  const old=mockRun(original,{probe:createShadowProbe()}),next=mockRun(patched.source,{probe:createShadowProbe()});
  assert.deepEqual(next.events,old.events);assert.deepEqual(next.info,old.info);assert.equal(next.lastMaterial,old.lastMaterial);assert.equal(next.error,null);
  const r=next.result;assert.equal(r.balanced,true);assert.equal(r.totals.submissions,5);assert.equal(r.totals.draws,4);assert.equal(r.totals['submitted-elements'],18);
  assert.equal(r.byScope['point-shadow/ordinary'].submissions,1);assert.equal(r.byScope['point-shadow/skinned'].submissions,2);
  assert.equal(r.byScope['other/ordinary'].submissions,2);assert.ok(r.totals['program-switches']>0);assert.ok(r.totals['material-switches']>0);
});
test('exceptions restore passive attribution without changing the original failure trace; disabled counters remain inert',()=>{
  const old=mockRun(original,{probe:createShadowProbe(),fail:true}),next=mockRun(patched.source,{probe:createShadowProbe(),fail:true});
  assert.deepEqual(next.events,old.events);assert.equal(next.error,'DRAW_FAILURE');assert.equal(next.result.balanced,true);
  const off=mockRun(patched.source,{probe:createShadowProbe(),active:false});assert.deepEqual(off.result.totals,{});
});
test('binding compatibility results are unchanged for cached, replaced and missing attributes',()=>{
  const probe=createShadowProbe();for(const mode of ['same','replaced','missing']){
    const evaluate=source=>{
      const attribute={},geometry={attributes:{position:attribute}},index={},cache={position:{attribute,data:undefined}};
      if(mode==='replaced')cache.position.attribute={};if(mode==='missing')delete cache.position;
      const context=vm.createContext({__m30ShadowProbe:probe,currentState:{attributes:cache,attributesNum:1,index}});
      const fn=expression(source,'function needsUpdate( object, geometry, program, index ) {','\n\tfunction saveCache( object, geometry, program, index ) {',context);
      return fn({},geometry,{getAttributes:()=>({position:{location:0}})},index);
    };
    probe.begin(mode);assert.equal(evaluate(patched.source),evaluate(original));assert.equal(probe.end().totals['binding-checks'],1);
  }
});
test('collector snapshots detach, scopes nest and bounded material overflow never interrupts a draw',()=>{
  const p=createShadowProbe({maxMaterials:1});p.begin('bounded');
  const shadow=p.enterShadow(true),a=p.enterDirect(true,1);p.hit('binding-checks');const b=p.enterDirect(false,2);p.draw(3,1);p.leaveDirect(b);
  p.reason('skinning-on');p.leaveDirect(a);p.leaveShadow(shadow);const result=p.end();
  assert.equal(result.balanced,true);assert.ok(result.overflow>0);assert.equal(result.totals.draws,1);assert.equal(Object.keys(result.byMaterial).length,1);
  result.totals.draws=999;assert.equal(p.snapshot().totals.draws,1);p.hit('draws');assert.equal(p.snapshot().totals.draws,1);
});
