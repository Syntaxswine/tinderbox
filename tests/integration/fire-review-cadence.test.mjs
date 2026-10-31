import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../../src/runtime/three.js';
import {createFire} from '../../src/art/fire.js';
import {createFireReviewEffect} from '../../src/art/fire-review-effect.js';import {createFireFrameAdapter} from '../../src/art/fire-frame.js';
import {createFireReviewSimulation,FIRE_REVIEW_SCENARIOS} from '../../tools/fire-realism/scenarios.js';import {presentFireReviewCallback} from '../../tools/fire-realism/live-cadence.js';
import {createBearRig,BEAR_SOURCE_COMMIT} from '../../src/reuse/bear.js';import {createNeighborhood} from '../../src/art/neighborhood.js';import {placeFireReviewCamera} from '../../tools/fire-realism/camera.js';
const data=JSON.parse(fs.readFileSync(`vendor/animal-factory-tactics-3d/${BEAR_SOURCE_COMMIT}/dist/tactics/bear-10k-data.json`)),catalogue={houses:['gross','hopkins'].flatMap(name=>JSON.parse(fs.readFileSync(`assets/art/${name}-housing-v1/houses.json`)).houses)};
const s=(tick,time,generation=0,events=[])=>({version:1,tick,paused:false,cells:[],clocks:{world:time,player:time},player:{x:2,y:5,radius:.3,height:1.7,tool:'matches',torch:{phase:'unlit',remainingSeconds:0}},world:{width:12,height:12,fireCellSize:.5,buildings:[],obstacles:[]},discharge:{active:false,rays:[]},diagnostics:{generation},events});
// This API-only renderer/factory fixture proves receipt/lifecycle behavior, not
// pixels, shader compilation, GPU time or fire quality.
function fixture(mode){
 const texture=new T.Texture(),field={field:{value:texture},grid:{value:new T.Vector2(24,24)},cellSize:{value:.5}},scene=new T.Scene(),camera=new T.OrthographicCamera(-10,10,10,-10,.1,300),seen=[];let target=null,depthRenders=0,artistUpdates=0;
 camera.updateMatrixWorld();const renderer={autoClear:true,shadowMap:{autoUpdate:true},getDrawingBufferSize:v=>v.set(1280,800),getRenderTarget:()=>target,setRenderTarget:v=>{target=v;},getViewport:v=>v.set(0,0,1280,800),getScissor:v=>v.set(0,0,1280,800),getScissorTest:()=>false,setViewport(){},setScissor(){},setScissorTest(){},clear(){},render(){depthRenders++;}};
 const factory=(_T,{quality})=>({root:new T.Group(),update(frame){artistUpdates++;seen.push(structuredClone(frame.eventReceipts));},reset(){},dispose(){},diagnostics:()=>({quality})});
 const effect=createFireReviewEffect(T,{flame:texture,smoke:texture,burst:texture},field,{renderer,scene,artistFactories:{reference:factory},initialMode:mode});scene.add(effect.root);
 const update=next=>effect.update(next,next.clocks.world,{camera,viewport:{width:1280,height:800,pixelRatio:1},muzzle:new T.Vector3(2,1,5)});
 const burst=()=>{const component=effect.root.children[mode==='current'?0:1],mesh=component.children.find(node=>node.material?.uniforms?.kind?.value===2),g=mesh.geometry;return {count:g.instanceCount,...Object.fromEntries(['iOffset','iShape','iInfo'].map(name=>[name,Array.from(g.attributes[name].array.slice(0,g.instanceCount*g.attributes[name].itemSize))]))};};
 return {effect,scene,camera,texture,field,seen,update,burst,get depthRenders(){return depthRenders;},get artistUpdates(){return artistUpdates;},dispose(){effect.dispose();texture.dispose();}};
}
test('batched live callbacks retain actual simulation/native endpoints in current/reference/no-fire with one presentation and draw',()=>{
 const batches=[0,6,15,3,0,9,1,15,6,15,15,15,15,5];assert.equal(batches.reduce((n,v)=>n+v,0),120);
 for(const scenario of FIRE_REVIEW_SCENARIOS){
  const direct=createFireReviewSimulation({scenario});let endpoint;try{for(let i=0;i<120;i++)endpoint=direct.advance();}finally{direct.dispose();}
  let baseline;
  for(const mode of ['current','reference','no-fire']){
   const sim=createFireReviewSimulation({scenario}),rig=createBearRig(data),housing=createNeighborhood(T,{catalogue,textures:{}},{facadeSites:true}),f=fixture(mode),counts={steps:0,observed:0,snapshots:0,presented:0,drawn:0};let snapshot=sim.snapshot();placeFireReviewCamera(T,f.camera,{scenario,view:'isometric',viewport:{width:1280,height:800,pixelRatio:1}});
   function present(){rig.update(snapshot.player,snapshot.clocks.player);housing.update(snapshot.world,{camera:f.camera,player:snapshot.player});f.effect.update(snapshot,snapshot.clocks.world,{camera:f.camera,viewport:{width:1280,height:800,pixelRatio:1},muzzle:rig.anchors.muzzle.getWorldPosition(new T.Vector3()),muzzleQuaternion:rig.anchors.muzzle.getWorldQuaternion(new T.Quaternion()),housing:housing.diagnostics()});}
   try{present();f.effect.beforeRender(f.camera);
    for(const frames of batches){const measured=presentFireReviewCallback({frames,advance(){counts.steps++;return sim.advanceReceiptStep();},observe(next){counts.observed++;assert.equal(next.kind,'simulation-event-receipt');f.effect.observeSnapshot(next);},snapshot(){counts.snapshots++;snapshot=sim.snapshot();},present(){counts.presented++;present();},draw(){counts.drawn++;f.effect.beforeRender(f.camera);}});assert.equal(measured.fixedSteps,frames);assert.equal(measured.presentations,frames?1:0);assert.equal(measured.draws,1);assert.equal(measured.fullSnapshots,frames?1:0);assert.ok(measured.simulationMs>=measured.snapshotMs);assert.ok(measured.receiptObservationMs>=0);}
    assert.deepEqual(snapshot,endpoint);assert.deepEqual(counts,{steps:120,observed:120,snapshots:batches.filter(Boolean).length,presented:batches.filter(Boolean).length,drawn:batches.length});
    const state={snapshot,anchors:Object.fromEntries(Object.entries(rig.anchors).map(([name,node])=>[name,{position:node.getWorldPosition(new T.Vector3()).toArray(),quaternion:node.getWorldQuaternion(new T.Quaternion()).toArray()}])),body:rig.sampleBodyBounds(),camera:{world:f.camera.matrixWorld.toArray(),projection:f.camera.projectionMatrix.toArray()},groups:f.effect.diagnostics().buildingVisuals};
    assert.deepEqual(rig.diagnostics().nativeScale,[1,1,1]);assert.equal(f.effect.diagnostics().receiptQueue.pendingEvents,0);if(baseline)assert.deepEqual(state,baseline);else baseline=state;
    if(mode==='reference')assert.equal(f.artistUpdates,1+batches.length);else assert.equal(f.depthRenders,0);
   }finally{f.dispose();rig.dispose();housing.dispose();sim.dispose();}
  }
 }
});
test('reference queues fresh Molotov/barrel receipts at their observed time even after raw history disappears',()=>{
 const batched=fixture('reference'),perStep=fixture('reference'),steps=[s(2,1.1,0,[{id:1,type:'molotov-impact',x:2,y:5}]),s(3,1.2,0,[{id:2,type:'barrel-explosion',x:3,y:5}]),s(4,1.3)];
 try{for(const f of [batched,perStep])f.update(s(1,1));
  for(const next of steps){const before=JSON.stringify(next);batched.effect.observeSnapshot(next);perStep.update(next);assert.equal(JSON.stringify(next),before);}
  batched.update(steps.at(-1));batched.effect.beforeRender(batched.camera);assert.equal(batched.burst().count,8);assert.deepEqual(batched.burst(),perStep.burst());
  assert.deepEqual(batched.seen.at(-1).events.map(e=>[e.id,e.receivedWorldTime,e.receivedGeneration]),[[1,1.1,0],[2,1.2,0]]);
  const events=batched.effect.diagnostics().legacyTransients.eventCount;batched.update(s(5,1.4));assert.equal(batched.effect.diagnostics().legacyTransients.eventCount,events);batched.update(s(6,2.8));assert.equal(batched.burst().count,0);
 }finally{batched.dispose();perStep.dispose();}
});
test('reference queued generations reset without replaying dated startup, suppressing fresh low IDs or renewing expired bursts',()=>{
 const f=fixture('reference');try{
  f.update(s(1,1,0,[{id:8,type:'barrel-explosion',worldTime:1,x:2,y:5}]));assert.equal(f.burst().count,0);
  f.effect.observeSnapshot(s(2,1.1,0,[{id:9,type:'molotov-impact',x:2,y:5}]));
  f.effect.observeSnapshot(s(3,3,1,[{id:0,type:'barrel-explosion',worldTime:3,x:2,y:5}]));
  f.effect.observeSnapshot(s(4,3.1,1,[{id:1,type:'molotov-impact',x:2,y:5}]));f.update(s(5,3.2,1));f.effect.beforeRender(f.camera);
  assert.equal(f.burst().count,4);assert.deepEqual(f.seen.at(-1).events.map(e=>[e.id,e.receivedWorldTime,e.receivedGeneration]),[[1,3.1,1]]);assert.equal(f.seen.at(-1).reset,true);
  f.effect.observeSnapshot(s(6,3.3,1,[{id:2,type:'barrel-explosion',x:2,y:5}]));f.update(s(7,5,1));assert.equal(f.burst().count,0,'An event observed1.7seconds earlier must already have expired');
  f.effect.observeSnapshot(s(1,.5,1,[{id:1,type:'molotov-impact',worldTime:.5,x:2,y:5}]));f.update(s(1,.5,1));assert.equal(f.burst().count,0);
  f.effect.reset();f.update(s(1,1,0,[{id:4,type:'barrel-explosion',worldTime:1,x:2,y:5}]));assert.equal(f.burst().count,0);
 }finally{f.dispose();}
});
test('current retains frozen dated-startup and ID/generation semantics while merging originally aged fresh receipts',()=>{
 const current=fixture('current'),reference=fixture('reference'),batched=fixture('current'),perStep=fixture('current');try{
  const dated=s(1,1,0,[{id:7,type:'barrel-explosion',worldTime:1,x:2,y:5}]);current.update(dated);reference.update(dated);assert.equal(current.burst().count,4);assert.equal(reference.burst().count,0);
  const reset=s(2,3,1);current.effect.observeSnapshot(reset);reference.effect.observeSnapshot(reset);current.update(reset);reference.update(reset);
  const low=s(3,3.1,1,[{id:1,type:'molotov-impact',worldTime:3.1,x:2,y:5}]);current.effect.observeSnapshot(low);reference.effect.observeSnapshot(low);current.update(low);reference.update(low);assert.equal(current.burst().count,0,'Frozen current high-ID semantics remain unchanged');assert.equal(reference.burst().count,4);
  for(const f of [batched,perStep])f.update(s(1,1));const fresh=s(2,1.1,0,[{id:1,type:'molotov-impact',x:2,y:5}]),final=s(3,1.3);batched.effect.observeSnapshot(fresh);batched.effect.observeSnapshot(final);batched.update(final);perStep.update(fresh);perStep.update(final);assert.deepEqual(batched.burst(),perStep.burst());assert.equal(batched.burst().count,4);
  batched.effect.observeSnapshot(s(4,1.4,0,[{id:2,type:'barrel-explosion',x:2,y:5}]));batched.update(s(5,3.1));assert.equal(batched.burst().count,0);
 }finally{for(const f of [current,reference,batched,perStep])f.dispose();}
});
test('current initial raw ordering and duplicate winner match the unchanged published source component',()=>{
 const f=fixture('current'),published=createFire(T,{flame:f.texture,smoke:f.texture,burst:f.texture},f.field);
 const next=s(1,1,0,[{id:2,type:'molotov-impact',worldTime:1,x:3,y:5},{id:1,type:'barrel-explosion',worldTime:1,x:7,y:5},{id:2,type:'barrel-explosion',worldTime:1,x:9,y:5}]);
 try{f.update(next);published.update(next,1);const mesh=published.root.children.find(node=>node.material?.uniforms?.kind?.value===2),g=mesh.geometry,expected={count:g.instanceCount,...Object.fromEntries(['iOffset','iShape','iInfo'].map(name=>[name,Array.from(g.attributes[name].array.slice(0,g.instanceCount*g.attributes[name].itemSize))]))};assert.deepEqual(f.burst(),expected);assert.equal(f.burst().count,8);assert.equal(f.burst().iOffset[0],7);assert.equal(f.burst().iOffset[12],3);
 }finally{published.dispose();f.dispose();}
});
test('paused and zero-step callbacks do not replay receipts; no-fire drains and disposal clears bounded queue/resources',()=>{
 for(const mode of ['current','reference','no-fire']){
  const f=fixture(mode);let borrowedDisposals=0;f.texture.addEventListener('dispose',()=>borrowedDisposals++);
  try{f.update(s(1,1));f.effect.observeSnapshot(s(2,1.1,0,[{id:1,type:'molotov-impact',x:2,y:5}]));assert.equal(f.effect.diagnostics().receiptQueue.pendingEvents,1);
   let presentations=0,draws=0;presentFireReviewCallback({frames:0,advance(){assert.fail();},observe(){assert.fail();},present(){presentations++;},draw(){draws++;}});assert.equal(presentations,0);assert.equal(draws,1);assert.equal(f.effect.diagnostics().receiptQueue.pendingEvents,1);
   const paused={...s(2,1.1),paused:true};f.update(paused);f.update(paused);assert.equal(f.effect.diagnostics().receiptQueue.pendingEvents,0);if(mode==='no-fire')assert.ok(f.effect.root.children.every(node=>!node.visible));
   f.effect.observeSnapshot(s(3,1.2,0,[{id:2,type:'barrel-explosion',x:2,y:5}]));f.effect.dispose();f.effect.dispose();assert.equal(f.effect.root.children.length,0);assert.equal(f.effect.root.parent,null);assert.equal(f.effect.diagnostics().receiptQueue.pendingEvents,0);assert.equal(f.effect.diagnostics().opaqueDepth.disposed,true);assert.equal(borrowedDisposals,0);
   f.effect.observeSnapshot(s(4,1.3,0,[{id:3,type:'molotov-impact',x:2,y:5}]));assert.equal(f.effect.diagnostics().receiptQueue.pendingEvents,0);
  }finally{f.dispose();}
 }
 const a=createFireFrameAdapter();a.observe(s(1,1));assert.throws(()=>a.observe(s(2,2,0,Array.from({length:4097},(_,id)=>({id,type:'molotov-impact'})))),/capacity/);a.reset();assert.equal(a.diagnostics().pendingEvents,0);assert.equal(a.diagnostics().primed,false);
 assert.throws(()=>presentFireReviewCallback({frames:16}),/0..15/);
});
