import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import * as T from '../../src/runtime/three.js';
import {createCameraSweep,captureCameraSweepSupport,validateCameraSweep,cameraSweepYaw,reviewCameraRecord} from '../../tools/fire-realism/camera-sweep.js';
import {placeFireReviewCamera} from '../../tools/fire-realism/camera.js';import {createFireReviewSimulation} from '../../tools/fire-realism/scenarios.js';
import {createBearRig,BEAR_SOURCE_COMMIT} from '../../src/reuse/bear.js';import {createNeighborhood} from '../../src/art/neighborhood.js';
const data=JSON.parse(fs.readFileSync(`vendor/animal-factory-tactics-3d/${BEAR_SOURCE_COMMIT}/dist/tactics/bear-10k-data.json`));
const catalogue={houses:['gross','hopkins'].flatMap(name=>JSON.parse(fs.readFileSync(`assets/art/${name}-housing-v1/houses.json`)).houses)};
const world={frameIndex:60,tick:60,worldTime:1,playerTime:1,worldPaused:true};
function nativeCase(scenario,frame=60){
 const sim=createFireReviewSimulation({scenario}),rig=createBearRig(data),scene=new T.Scene(),parent=new T.Group(),housing=scenario==='street-fire'?createNeighborhood(T,{catalogue,textures:{}},{facadeSites:true}):null;scene.add(parent);parent.add(rig.root);if(housing)scene.add(housing.root);
 let snapshot=sim.snapshot();for(let i=0;i<frame;i++)snapshot=sim.advance();rig.update(snapshot.player,snapshot.clocks.player);housing?.update(snapshot.world);
 return {scene,parent,sim,rig,snapshot,housing,support(mode='current'){return captureCameraSweepSupport(T,{scene,snapshot,anchors:rig.anchors,configuration:{scenario,mode},fireDiagnostics:{artist:{settings:{smokeBillowsPerInstance:4}}}});},dispose(){rig.dispose();housing?.dispose();sim.dispose();scene.clear();}};
}
function configured(scenario='match-contact',viewport={width:1280,height:800,pixelRatio:1},view='isometric',points,mode='current'){
 const camera=new T.OrthographicCamera(-10,10,10,-10,.1,300),configuration={scenario,view,viewport,mode,characterId:'bear'},policy=placeFireReviewCamera(T,camera,configuration),controller=createCameraSweep(T);controller.bind(camera,policy,configuration);
 controller.support({points:points||[[5,.1,8],[6,3,9],[4,1,8]],descriptor:{guard:'fixture',kind:'source-contract-test'}});return {camera,controller,policy,configuration};
}
test('unchanged static camera bytes/matrices and analytic entire-yaw native/source containment use fixed framing across modes',t=>{
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../../tools/fire-realism/camera.js',import.meta.url),'utf8').replaceAll('\r','')).digest('hex'),'f6e1fe0d79e7de293628f457dd6890714689d5bcd81629eae29754014d89e5c4');
 const rows=[];
 for(const scenario of ['match-contact','street-fire']){const native=nativeCase(scenario,scenario==='street-fire'?30:60);try{
  const support=native.support();assert.ok(support.descriptor.groups[0].points>5000);if(scenario==='street-fire'){assert.ok(support.descriptor.groups[1].points>19000);assert.equal(support.descriptor.groups[2].sourceCells,253);}
  for(const viewport of [{width:1280,height:800,pixelRatio:1},{width:390,height:844,pixelRatio:1.75}])for(const view of ['isometric','oblique']){
   let baseline;
   for(const mode of ['current','reference','optimized','no-fire']){
    const f=configured(scenario,viewport,view,support.points,mode),before=reviewCameraRecord(f.camera),proof=validateCameraSweep(T,f.camera,f.policy.focus,support.points);rows.push({scenario,view,width:viewport.width,supported:proof.supported,max:proof.maxAbsNdc});
    if(viewport.width===1280)assert.equal(proof.supported,true,JSON.stringify(rows.at(-1)));
    f.controller.support(support);assert.deepEqual(reviewCameraRecord(f.camera),before,'Validation must not move/refit the camera');if(baseline)assert.deepEqual(before,baseline);else baseline=before;
    if(proof.supported){
     // Independent dense projection sanity check supplements the analytic
     // bound, including every actual vertex and all declared source points.
     const probe=f.camera.clone(),offset=new T.Vector3(...before.position).sub(new T.Vector3(...f.policy.focus));
     for(let degrees=-8;degrees<=8;degrees+=2){probe.position.copy(offset.clone().applyAxisAngle(new T.Vector3(0,1,0),degrees*Math.PI/180)).add(new T.Vector3(...f.policy.focus));probe.lookAt(new T.Vector3(...f.policy.focus));probe.updateMatrixWorld();for(const point of support.points){const projected=new T.Vector3(...point).project(probe);assert.ok(Math.abs(projected.x)<.999&&Math.abs(projected.y)<.999&&Math.abs(projected.z)<.999);}}
    }else assert.match(proof.reason,/does not fit/);
    f.controller.dispose();
   }
  }
 }finally{native.dispose();}}
 t.diagnostic(JSON.stringify(rows.filter((row,index)=>index%4===0)));
});
test('finite path preserves distance/elevation/frustum, exact endpoint restoration and bounded one-time evidence after interrupted hold',async()=>{
 const f=configured(),base=reviewCameraRecord(f.camera),distance=f.camera.position.distanceTo(new T.Vector3(...f.policy.focus));
 try{
  await f.controller.start({now:()=>100,getWorld:()=>world,sourceFingerprints:{synthetic:true}});assert.throws(()=>f.controller.evidence(),/Retire/);
  for(const milliseconds of [100,600,2100]){f.controller.advance(milliseconds);f.controller.recordDraw({callbackTimeMs:milliseconds,drawTimeMs:milliseconds+1,world});assert.ok(Math.abs(f.camera.position.distanceTo(new T.Vector3(...f.policy.focus))-distance)<1e-12);assert.equal(f.camera.position.y,base.position[1]);assert.deepEqual(f.camera.projectionMatrix.toArray(),base.projectionMatrix);}
  assert.equal(f.controller.state().progress,.25);assert.equal(cameraSweepYaw(.25),8);const held=reviewCameraRecord(f.camera);assert.notDeepEqual(held.matrixWorld,base.matrixWorld);
  f.controller.stop({restoreStatic:false,monotonicMs:2102,world});assert.equal(f.controller.state().status,'interrupted');assert.equal(f.controller.state().active,false);assert.equal(f.controller.state().restored,false);assert.equal(f.controller.advance(4000),false);assert.deepEqual(reviewCameraRecord(f.camera),held);
  f.controller.stop({restoreStatic:true,monotonicMs:2200,world});f.controller.recordDraw({drawTimeMs:2201,world});assert.deepEqual(reviewCameraRecord(f.camera),base);assert.equal(f.controller.state().status,'interrupted');assert.equal(f.controller.state().sampledDraws,3);
  const interrupted=f.controller.evidence();assert.equal(interrupted.status,'interrupted');assert.deepEqual(interrupted.end.camera,held);assert.deepEqual(interrupted.restoration.camera,base);assert.equal(interrupted.restoration.drawn,true);assert.equal(interrupted.samples.length,3);assert.equal(f.controller.evidence(),null);assert.equal(f.controller.state().sampledDraws,3);assert.ok(!Object.hasOwn(f.controller.state(),'samples'));
  // A new valid preparation owns its ledger scope even if aborted before activation.
  await f.controller.start({now:()=>3000,getWorld:()=>world});f.controller.advance(11000);f.controller.recordDraw({drawTimeMs:11001,world});assert.equal(f.controller.state().status,'complete');const retry=f.controller.start({now:()=>12000,getWorld:()=>world});f.controller.stop({restoreStatic:true,world});await assert.rejects(retry,{name:'AbortError'});assert.equal(f.controller.evidence(),null,'Cancelled new preparation cannot export an older unexported run');
  await f.controller.start({now:()=>5000,getWorld:()=>world,sourceFingerprints:{synthetic:true}});
  for(const milliseconds of [5000,7000,9000,11000,13000]){f.controller.advance(milliseconds);f.controller.recordDraw({callbackTimeMs:milliseconds,drawTimeMs:milliseconds+1,world});}
  assert.equal(f.controller.state().status,'complete');assert.equal(f.controller.state().progress,1);assert.equal(f.controller.state().restored,true);assert.deepEqual(reviewCameraRecord(f.camera),base);const complete=f.controller.evidence();assert.deepEqual(complete.samples.map(s=>s.yawDegrees),[0,8,0,-8,0]);assert.deepEqual(complete.end.camera,base);assert.equal(complete.sampledDraws,5);
 }finally{f.controller.dispose();}
});
test('native support proof respects hidden ancestors/canonical source limits, and smoke bounds conservatively include source formulas',()=>{
 const native=nativeCase('match-contact');try{
  const original=JSON.stringify(native.snapshot),support=native.support();native.parent.visible=false;assert.throws(()=>native.support(),/hidden/);native.parent.visible=true;native.parent.userData.destroyed=true;assert.throws(()=>native.support(),/destroyed/);native.parent.userData.destroyed=false;assert.deepEqual(native.support(),support);assert.equal(JSON.stringify(native.snapshot),original);
  const c=structuredClone(native.snapshot);c.cells.find(cell=>cell.material==='grass').depositedFuel=.01;assert.throws(()=>captureCameraSweepSupport(T,{scene:native.scene,snapshot:c,anchors:native.rig.anchors,configuration:{scenario:'match-contact',mode:'current'}}),/no added fuel/);
  const projectile=structuredClone(native.snapshot);projectile.projectiles=[{id:123}];assert.throws(()=>captureCameraSweepSupport(T,{scene:native.scene,snapshot:projectile,anchors:native.rig.anchors,configuration:{scenario:'match-contact',mode:'current'}}),/projectile/);
  const radius=.4+.3+.43*Math.sqrt(.125),height=2.28,radial=(.23+1.22*(.24+.64)*1.14)*radius,lean=.22/Math.sqrt(1+.22**2),up=1/Math.sqrt(1+.22**2),box=support.descriptor.groups[1];assert.ok(radial+height*lean<box.horizontalRadiusMetres);assert.ok(.18-radial*lean>box.minY);assert.ok(.18+3.2*.36+height*up+radial*lean<box.maxY);
 }finally{native.dispose();}
});
test('pending validation cancellation/disposal cannot start late; unsupported framing stays fixed and ledger overflow retires safely',async()=>{
 const f=configured(),base=reviewCameraRecord(f.camera);try{
  const pending=f.controller.start({now:()=>100,getWorld:()=>world});f.controller.stop({restoreStatic:true,world});await assert.rejects(pending,{name:'AbortError'});assert.equal(f.controller.state().active,false);assert.deepEqual(reviewCameraRecord(f.camera),base);
  await f.controller.start({now:()=>100,getWorld:()=>world});f.controller.advance(1100);for(let i=0;i<4096;i++)f.controller.recordDraw({drawTimeMs:1101+i/100,world});assert.throws(()=>f.controller.recordDraw({drawTimeMs:1200,world}),/capacity/);assert.equal(f.controller.state().status,'cancelled');assert.equal(f.controller.state().restored,true);assert.equal(f.controller.evidence().samples.length,4096);
  const tiny=configured('match-contact',{width:128,height:4096,pixelRatio:1});try{const before=reviewCameraRecord(tiny.camera);await assert.rejects(tiny.controller.start({now:()=>0,getWorld:()=>world}),/does not fit/);assert.deepEqual(reviewCameraRecord(tiny.camera),before);}finally{tiny.controller.dispose();}
  const pendingDispose=f.controller.start({now:()=>100,getWorld:()=>world});f.controller.dispose();await assert.rejects(pendingDispose,{name:'AbortError'});
 }finally{f.controller.dispose();}
});
