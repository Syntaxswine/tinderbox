import {createFixedFirePose} from '../../tools/fire-realism/fixed-pose.js';
import {createFireReviewEffect} from '../../src/art/fire-review-effect.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createFireFrameAdapter,burningBuildingVisuals,dischargePresentation} from '../../src/art/fire-frame.js';
import {createOpaqueSceneDepth} from '../../src/art/scene-depth.js';
import {createGpuTimer,statistics,summarizeFireMeasurements,validateQualityReceipt,renderTimedFireFrame} from '../../tools/fire-realism/profiling.js';
import {createFireReviewSimulation,createReviewPlaybackClock,fireReviewScenario} from '../../tools/fire-realism/scenarios.js';
const snapshot=(tick=1,time=1)=>({version:1,tick,paused:false,clocks:{world:time,player:time},player:{x:1,y:1,tool:'torch',torch:{phase:'lit',remainingSeconds:10}},world:{buildings:[],obstacles:[]},cells:[{id:'c',x:1,y:1,size:.5,phase:'burning',intensity:1}],events:[],discharge:{active:false,rays:[]},diagnostics:{generation:0}});
test('detached frames prime history, receipt new events once and reset on generation/rewind without replay',()=>{
  const adapter=createFireFrameAdapter(),s=snapshot();s.events=[{id:1,type:'molotov-impact',x:1,y:1}];
  const frame=adapter.update(s);assert.equal(frame.eventReceipts.events.length,0);frame.cells[0].intensity=0;assert.equal(s.cells[0].intensity,1);
  const next=snapshot(2,2);next.events=[...s.events,{id:2,type:'barrel-explosion',x:2,y:2}];
  const received=adapter.update(next);assert.equal(received.eventReceipts.events[0].id,2);assert.equal(received.eventReceipts.events[0].receivedWorldTime,2);assert.equal(received.worldDelta,1);
  assert.equal(adapter.update(next).eventReceipts.events.length,0);
  const reset=snapshot(3,0);reset.diagnostics.generation=1;reset.events=[{id:3,type:'molotov-impact'}];const primed=adapter.update(reset);
  assert.equal(primed.eventReceipts.reset,true);assert.equal(primed.eventReceipts.events.length,0);assert.equal(primed.playerDelta,0);
});
test('native muzzle/camera/texture wrappers are detached while the explicit GPU texture remains borrowed',()=>{
  const adapter=createFireFrameAdapter(),camera=new T.OrthographicCamera(-2,2,2,-2,.1,100);camera.position.set(2,4,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const texture=new T.DataTexture(new Float32Array(16),2,2,T.RGBAFormat,T.FloatType),uniforms={field:{value:texture},grid:{value:new T.Vector2(2,2)},cellSize:{value:.5}};
  const muzzle=new T.Vector3(1,2,3),frame=adapter.update(snapshot(),{camera,fieldUniforms:uniforms,anchors:{muzzle,muzzleQuaternion:new T.Quaternion()}});
  frame.fieldUniforms.grid.value.x=8;frame.anchors.muzzle.x=9;frame.camera.matrixWorld[12]=100;
  assert.equal(uniforms.grid.value.x,2);assert.equal(muzzle.x,1);assert.equal(camera.matrixWorld.elements[12],2);assert.equal(frame.fieldUniforms.field.value,texture);assert.equal(frame.anchors.torchTip.y,2);
  const s=snapshot();s.player.tool='matches';assert.equal(adapter.update(s,{anchors:{muzzle}}).anchors.torchTip,null);texture.dispose();
});
test('only actual burning fuel groups produce source-backed building records, including edge-overlap cells',()=>{
  const s=snapshot();s.world.buildings=[{id:'house',prefabId:'ashland-worker',burnedFraction:.2}];s.world.obstacles=[{buildingId:'house',x:2,y:2,width:1,depth:1}];
  s.cells=[{id:'grass',x:1,y:1,size:.5,phase:'burning',intensity:1},{id:'wood-edge',x:1.4,y:2,size:.5,phase:'cold',intensity:0}];
  const housing={models:[{instanceId:'house',sourceBounds:{min:[1,0,1],max:[3,5,3]}}]};assert.equal(burningBuildingVisuals(s,housing).length,0);
  s.cells[1].phase='burning';s.cells[1].intensity=.7;const b=burningBuildingVisuals(s,housing)[0];assert.deepEqual(b.burningCellIds,['wood-edge']);assert.deepEqual(b.sourceBounds.max,[3,5,3]);
  s.world.buildings[0].destroyed=true;assert.equal(burningBuildingVisuals(s,housing).length,0);
});
test('depth preparation preserves ghost transparency and original alpha-tested materials and restores even after failure',()=>{
  const scene=new T.Scene(),opaque=new T.MeshBasicMaterial(),cutout=new T.MeshBasicMaterial({alphaTest:.5}),ghost=new T.MeshBasicMaterial({transparent:true,opacity:.18,depthWrite:false});
  const geo=new T.BoxGeometry(),solid=new T.Mesh(geo,opaque),hole=new T.Mesh(geo,cutout),fade=new T.Mesh(geo,ghost),fire=new T.Group();scene.add(solid,hole,fade,fire);
  const camera=new T.OrthographicCamera(-2,2,2,-2,.1,100);camera.updateMatrixWorld();const view=new T.Vector4(2,3,4,5),scissor=new T.Vector4(1,2,3,4);let currentTarget=null,renders=0,throwRender=false;
  const renderer={autoClear:false,shadowMap:{autoUpdate:true},getDrawingBufferSize:v=>v.set(640,480),getRenderTarget:()=>currentTarget,setRenderTarget:v=>{currentTarget=v;},getViewport:v=>v.copy(view),getScissor:v=>v.copy(scissor),getScissorTest:()=>true,setViewport(){},setScissor(){},setScissorTest(){},clear(){},render(){renders++;assert.equal(ghost.visible,false);assert.equal(opaque.visible,true);assert.equal(hole.material,cutout);assert.equal(cutout.alphaTest,.5);assert.equal(fire.visible,false);if(throwRender)throw Error('Driver failure');}};
  const pass=createOpaqueSceneDepth(T,renderer,scene,[fire]);const result=pass.prepare(camera);assert.equal(result.width,640);assert.equal(result.height,480);assert.equal(result.texture.isDepthTexture,true);assert.equal(ghost.visible,true);assert.equal(fire.visible,true);assert.equal(currentTarget,null);assert.equal(renderer.shadowMap.autoUpdate,true);
  throwRender=true;assert.throws(()=>pass.prepare(camera),/Driver failure/);assert.equal(ghost.visible,true);assert.equal(fire.visible,true);assert.equal(renderer.autoClear,false);pass.dispose();pass.dispose();assert.equal(renders,2);geo.dispose();opaque.dispose();cutout.dispose();ghost.dispose();
});
function fakeGL(){let id=0,disjoint=false;const results=new Map(),deleted=[];const ext={GPU_DISJOINT_EXT:1,TIME_ELAPSED_EXT:2};return {QUERY_RESULT_AVAILABLE:3,QUERY_RESULT:4,deleted,setDisjoint:v=>{disjoint=v;},getExtension:()=>ext,getParameter:()=>disjoint,createQuery:()=>({id:++id}),beginQuery(_type,q){results.set(q,{available:false,ns:2e6});},endQuery(){for(const value of results.values())value.available=true;},getQueryParameter(q,type){return type===3?results.get(q).available:results.get(q).ns;},deleteQuery(q){deleted.push(q.id);}};}
test('GPU queries report actual elapsed result units and retire/reject disjoint or cancelled samples',()=>{
  const gl=fakeGL(),timer=createGpuTimer(gl);assert.equal(timer.begin(0),true);timer.end();timer.poll();assert.deepEqual(timer.samples,[{index:0,gpuMs:2}]);
  timer.begin(1);timer.end();gl.setDisjoint(true);timer.poll();assert.equal(timer.samples.length,1);assert.match(timer.rejected[0].reason,/disjoint/);timer.dispose();assert.equal(gl.deleted.length,2);
  const cancel=createGpuTimer(fakeGL());cancel.begin(0);cancel.dispose();assert.equal(cancel.pending,0);
});
test('GPU absence and quality flags never become rendering-cost or quality acceptance',()=>{
  assert.equal(createGpuTimer({getExtension:()=>null}).available,false);
  assert.equal(validateQualityReceipt({status:'accepted',sourceCommit:'abc'},{kind:'architect-fire-reference-acceptance-v1',sourceCommit:'abc',runtimeFiles:{a:{sha256:'x',verified:true}}}),false);
  const valid={kind:'architect-fire-reference-acceptance-v1',status:'accepted',receiptId:'review',sourceCommit:'abc',runtimeFiles:{a:'x'}};
  assert.equal(validateQualityReceipt(valid,{kind:valid.kind,sourceCommit:'abc',runtimeFiles:{a:{sha256:'x',verified:true}}}),true);
  assert.equal(validateQualityReceipt(valid,{kind:valid.kind,sourceCommit:'abc',runtimeFiles:{a:{sha256:'changed',verified:true}}}),false);
});
const trial=(mode,ms,forMode=mode)=>({mode,forMode,trialIndex:0,sampleFrames:3,gpu:[0,1,2].map(index=>({index,gpuMs:ms})),rejected:[],workloadTrace:[{burning:4}]});
test('paired no-fire subtraction rejects negative/noisy/mismatched work and separates GPU ratio from quality',()=>{
  const trials=[trial('reference',5),trial('no-fire',1,'reference'),trial('optimized',2),trial('no-fire',1,'optimized')];
  const result=summarizeFireMeasurements({trials,modes:['reference','optimized'],referenceAcceptance:null});assert.equal(result.comparison.optimizedReferenceRatio,.25);assert.equal(result.comparison.targetMet,null);assert.deepEqual(result.reasons,[]);
  trials[3].gpu=trials[3].gpu.map(s=>({...s,gpuMs:3}));const invalid=summarizeFireMeasurements({trials,modes:['reference','optimized']});assert.equal(invalid.comparison.optimizedReferenceRatio,null);assert.ok(invalid.reasons.length);
  assert.equal(statistics([1,2,3,4]).median,2);
});
test('actual review fixtures preserve tile ignition, normal/powder movement and a real full-size street field',()=>{
  const run=(scenario,frames=120)=>{const sim=createFireReviewSimulation({scenario});let s;for(let i=0;i<frames;i++)s=sim.advance();sim.dispose();return s;};
  const match=run('match-contact');assert.equal(match.cells.filter(c=>c.phase==='burning').length,4);
  const normal=run('gasoline-front'),powder=run('gasoline-front-powder');assert.ok(powder.player.x>normal.player.x);assert.ok(powder.clocks.world<normal.clocks.world);assert.ok(normal.cells.some(c=>c.depositedFuel>0));
  const wall=run('wall-clipped-jet');assert.equal(wall.discharge.active,true);assert.ok(wall.discharge.rays.some(r=>r.obstacleId==='real-masonry-wall'));
  const street=run('street-fire',1);assert.equal(street.cells.length,9588);assert.equal(street.world.buildings.length,8);assert.equal(street.diagnostics.burningCells,128);
  assert.throws(()=>fireReviewScenario('match-contact',32),/Population/);
});

test('only the selected mode renders; its real depth pass and retained transient submission stay within the outer GPU query',()=>{
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-2,2,2,-2,.1,100);camera.updateMatrixWorld();
  const log=[],tex=new T.Texture(),field={field:{value:tex},grid:{value:new T.Vector2(4,4)},cellSize:{value:.5}};
  let currentTarget=null,query=false,artistUpdates=0;
  const renderer={info:{reset(){}},autoClear:true,shadowMap:{autoUpdate:true},getDrawingBufferSize:v=>v.set(640,480),getRenderTarget:()=>currentTarget,setRenderTarget:v=>{currentTarget=v;},getViewport:v=>v.set(0,0,640,480),getScissor:v=>v.set(0,0,640,480),getScissorTest:()=>false,setViewport(){},setScissor(){},setScissorTest(){},clear(){},render(){assert.equal(query,true);log.push(currentTarget?'depth':'scene');}};
  const factory=(_T,{quality})=>({root:new T.Group(),update(frame){artistUpdates++;assert.equal(frame.opaqueDepth.valid,true);assert.ok(query);},reset(){},dispose(){},diagnostics:()=>({quality})});
  const effect=createFireReviewEffect(T,{flame:tex,smoke:tex,burst:tex},field,{renderer,scene,artistFactories:{reference:factory},initialMode:'reference'});scene.add(effect.root);
  const timer={begin(){query=true;log.push('begin');return true;},end(){log.push('end');query=false;}};
  const s=snapshot();s.world={width:2,height:2,fireCellSize:.5,buildings:[],obstacles:[]};s.player.radius=.3;s.player.torch={phase:'unlit',remainingSeconds:0};
  effect.update(s,1,{camera,muzzle:new T.Vector3(1,1,1),viewport:{width:640,height:480}});
  renderTimedFireFrame({renderer,scene,camera,art:{beforeRender:c=>effect.beforeRender(c)},timer});
  assert.deepEqual(log,['begin','depth','scene','end']);assert.equal(artistUpdates,1);
  s.tick=2;s.clocks.world=1.1;s.events=[{id:1,type:'molotov-impact',x:1,y:1}];effect.update(s,1.1,{camera,muzzle:new T.Vector3(1,1,1)});
  const transients=effect.diagnostics().legacyTransients;assert.equal(transients.flameCards,0);assert.equal(transients.discharge.active,false);assert.equal(transients.burstCards,4);
  log.length=0;renderTimedFireFrame({renderer,scene,camera,art:{beforeRender:c=>effect.beforeRender(c)},timer});assert.deepEqual(log,['begin','depth','scene','end']);
  effect.setMode('no-fire');effect.update(s,1.1,{camera});log.length=0;renderTimedFireFrame({renderer,scene,camera,art:{beforeRender:c=>effect.beforeRender(c)},timer});assert.deepEqual(log,['begin','scene','end']);assert.ok(effect.root.children.every(child=>child.visible===false));
  effect.setMode('optimized');effect.update(s,1.1,{camera});log.length=0;renderTimedFireFrame({renderer,scene,camera,art:{beforeRender:c=>effect.beforeRender(c)},timer});assert.equal(effect.diagnostics().artist,null);assert.deepEqual(log,['begin','scene','end']);assert.equal(artistUpdates,2);
  effect.dispose();effect.dispose();tex.dispose();
});

test('a current/reference factory cannot substitute itself as an optimized export',()=>{
  const tex=new T.Texture(),field={field:{value:tex},grid:{value:new T.Vector2(1,1)},cellSize:{value:.5}},scene=new T.Scene();
  assert.throws(()=>createFireReviewEffect(T,{flame:tex,smoke:tex,burst:tex},field,{renderer:{},scene,initialMode:'optimized',artistFactories:{optimized:()=>({root:new T.Group(),reset(){},dispose(){},diagnostics:()=>({quality:'reference'})})}}),/requested optimized/);tex.dispose();
});
test('fixed authoritative benchmark preserves fuel/masks/native pose, advances declared powder clocks and expires finite transient receipts',async()=>{
  const sim=createFireReviewSimulation({scenario:'gasoline-front-powder'});let source;for(let i=0;i<60;i++)source=sim.advance();
  const before=structuredClone(source),options={frameIndex:60,anchors:{muzzle:[1,2,3]},sourceAppearance:{field:{data:[0,1,0,1]}},eventTimes:[{id:4,type:'molotov-impact',receivedWorldTime:source.clocks.world}]};
  const a=await createFixedFirePose(source,options),b=await createFixedFirePose(source,options),first=await a.frame(1),later=await a.frame(240);
  assert.equal(a.record.poseFingerprint,b.record.poseFingerprint);assert.equal((await a.frame(30)).workload.fingerprint,(await b.frame(30)).workload.fingerprint);
  assert.ok(Math.abs(later.worldTime-source.clocks.world-4*.35)<1e-9);assert.ok(Math.abs(later.playerTime-source.clocks.player-4*1.5)<1e-9);
  assert.deepEqual(first.snapshot.cells,before.cells);assert.deepEqual(later.snapshot.cells,before.cells);assert.deepEqual(source,before);assert.equal(first.workload.activeTransientIds.length,1);assert.equal((await a.frame(300)).workload.activeTransientIds.length,0);
  const changed=await createFixedFirePose(source,{...options,sourceAppearance:{field:{data:[1,1,0,1]}}});assert.notEqual(a.record.poseFingerprint,changed.record.poseFingerprint);
  sim.dispose();const empty=snapshot();empty.cells=[];empty.player.torch.phase='unlit';await assert.rejects(createFixedFirePose(empty,{frameIndex:1}),/no active/);
});

test('quaternion arrays supplied by callers are detached alongside other prepared records',()=>{
  const q=[0,0,0,1],frame=createFireFrameAdapter().update(snapshot(),{anchors:{muzzleQuaternion:q}});frame.anchors.muzzleQuaternion[0]=99;assert.equal(q[0],0);
});
test('different frozen R and optimized O receipts validate independently, and stale or self-approved quality cannot pass',()=>{
  const trials=[trial('reference',5),trial('no-fire',1,'reference'),trial('optimized',2),trial('no-fire',1,'optimized')];
  const sourceFingerprints={reference:{sourceCommit:'R',runtimeFiles:{reference:{sha256:'old',verified:true}}},optimized:{sourceCommit:'O',runtimeFiles:{optimized:{sha256:'new',verified:true}}}};
  const referenceAcceptance={kind:'architect-fire-reference-acceptance-v1',receiptId:'review-R',status:'accepted',sourceCommit:'R',runtimeFiles:{reference:'old'}};
  const optimizedAcceptance={kind:'architect-fire-optimized-acceptance-v1',receiptId:'review-O',status:'accepted',sourceCommit:'O',referenceCommit:'R',runtimeFiles:{optimized:'new'}};
  const args={trials,modes:['reference','optimized'],sourceFingerprints,referenceAcceptance,optimizedAcceptance};assert.equal(summarizeFireMeasurements(args).comparison.targetMet,true);
  assert.equal(summarizeFireMeasurements({...args,optimizedAcceptance:{...optimizedAcceptance,referenceCommit:'unreviewed'}}).comparison.targetMet,null);
  assert.equal(summarizeFireMeasurements({...args,referenceAcceptance:{status:'accepted'},optimizedAcceptance:{status:'accepted'}}).comparison.targetMet,null);
  assert.equal(summarizeFireMeasurements({...args,sourceFingerprints:{...sourceFingerprints,reference:{...sourceFingerprints.reference,runtimeFiles:{reference:{sha256:'changed',verified:true}}}}}).comparison.targetMet,null);
});
test('live review advances exactly the same simulation time at30/60/120/144Hz and bounds hitches',()=>{
  for(const hz of [30,60,120,144]){const clock=createReviewPlaybackClock();let frames=0;for(let i=0;i<hz*10;i++)frames+=clock.advance(1/hz);assert.equal(frames,600);}
  const clock=createReviewPlaybackClock();assert.equal(clock.advance(2),15);assert.equal(clock.diagnostics().droppedRealSeconds,1.75);clock.reset();assert.equal(clock.advance(0),0);
});