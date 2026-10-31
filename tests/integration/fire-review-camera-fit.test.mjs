import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../../src/runtime/three.js';import {createBearRig,BEAR_SOURCE_COMMIT} from '../../src/reuse/bear.js';
import {createFireReviewSimulation} from '../../tools/fire-realism/scenarios.js';import {placeFireReviewCamera} from '../../tools/fire-realism/camera.js';
const data=JSON.parse(fs.readFileSync(`vendor/animal-factory-tactics-3d/${BEAR_SOURCE_COMMIT}/dist/tactics/bear-10k-data.json`));
function collect(scenario){
  const sim=createFireReviewSimulation({scenario}),rig=createBearRig(data),records=[];
  try{for(let frame=0;frame<=120;frame++){
    if(frame)sim.advance();
    const s=sim.snapshot(),before=JSON.stringify(s);rig.update(s.player,s.clocks.player);const b=rig.sampleBodyBounds(),points=[];
    for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]])points.push([x+s.player.x,y+(s.player.elevation||0),z+s.player.y]);
    for(const node of Object.values(rig.anchors))points.push(node.getWorldPosition(new T.Vector3()).toArray());
    for(const point of s.diagnostics.acceptedPath||[])points.push([point.x,0,point.y]);
    const fuel=s.cells.filter(c=>c.depositedFuel>0||c.phase==='burning');
    for(const cell of fuel){for(const x of [cell.x-cell.size/2,cell.x+cell.size/2])for(const z of [cell.y-cell.size/2,cell.y+cell.size/2])points.push([x,.018,z]);}
    records.push({frame,player:{x:s.player.x,y:s.player.y},points,smokeSources:fuel.map(c=>[c.x,c.y])});assert.equal(JSON.stringify(s),before);assert.deepEqual(rig.diagnostics().nativeScale,[1,1,1]);
  }}finally{rig.dispose();sim.dispose();}return records;
}
function inside(camera,point,label){const p=new T.Vector3(...point).project(camera);assert.ok(Math.abs(p.x)<.999&&Math.abs(p.y)<.999&&Math.abs(p.z)<1,`${label}: ${point} projects outside ${p.toArray()}`);}
const viewports=[{width:1280,height:800,pixelRatio:1},{width:390,height:844,pixelRatio:1.75}];
test('normal and powder camera fit covers every actual native body/path/fuel sample with the same framing at desktop and phone aspects',()=>{
  const normal=collect('gasoline-front'),powder=collect('gasoline-front-powder');assert.ok(Math.abs(normal[120].player.x-11.85)<1e-8);assert.ok(Math.abs(powder[120].player.x-15.15)<1e-8);
  for(const viewport of viewports)for(const view of ['isometric','oblique']){
    let baseline;
    for(const [scenario,records]of [['gasoline-front',normal],['gasoline-front-powder',powder]])for(const mode of ['current','reference','optimized','no-fire']){
      const camera=new T.OrthographicCamera(-10,10,10,-10,.1,300);placeFireReviewCamera(T,camera,{scenario,view,viewport,mode});const signature={world:camera.matrixWorld.toArray(),projection:camera.projectionMatrix.toArray()};
      if(baseline)assert.deepEqual(signature,baseline);else baseline=signature;
      for(const record of records)for(const point of record.points)inside(camera,point,scenario+' '+view+' frame'+record.frame);
      for(const record of records)for(const [x,z]of record.smokeSources)for(const xx of [x-1.5,x+1.5])for(const zz of [z-1.5,z+1.5])inside(camera,[xx,5.5,zz],'Declared smoke clearance');
    }
  }
});
test('actual carried-torch fixture walk keeps native body and flame anchors inside the shared camera fit',()=>{
  const records=collect('carried-torch');assert.ok(Math.abs(records[120].player.x-6.95)<1e-8);
  for(const viewport of viewports)for(const view of ['isometric','oblique']){
    const camera=new T.OrthographicCamera(-10,10,10,-10,.1,300);placeFireReviewCamera(T,camera,{scenario:'carried-torch',view,viewport});
    for(const record of records)for(const point of record.points)inside(camera,point,'Accepted torch walk '+view+' frame'+record.frame);
    for(const record of records)for(const [x,z]of record.smokeSources)for(const xx of [x-1.5,x+1.5])for(const zz of [z-1.5,z+1.5])inside(camera,[xx,5.5,zz],'Torch ground smoke clearance');
  }
});

test('carried-torch review walk uses exactly18 accepted9m/s steps after ignition and keeps the original finite world clock',()=>{
  const sim=createFireReviewSimulation({scenario:'carried-torch'}),trace=[];let prior=sim.snapshot(),moved=0,distance=0;
  try{for(let frame=1;frame<=121;frame++){
    const s=sim.advance(),step=Math.hypot(s.player.x-prior.player.x,s.player.y-prior.player.y);
    if(step>1e-9){moved++;distance+=step;assert.ok(frame>=91&&frame<=108);assert.ok(Math.abs(step-.15)<1e-9);}
    if([1,30,60,61,62,90,91,108,109,120,121].includes(frame))trace.push({frame,x:s.player.x,y:s.player.y,phase:s.player.torch.phase,remaining:s.player.torch.remainingSeconds,world:s.clocks.world,moving:s.player.moving});
    assert.equal(s.player.tool,'torch');assert.equal(s.player.torch.phase,'lit');assert.ok(s.player.hp>0);assert.equal(s.player.pouring,false);assert.ok(Math.abs(s.player.torch.remainingSeconds-(s.player.torch.durationSeconds-s.clocks.world))<1e-8);prior=s;
  }
  assert.equal(moved,18);assert.ok(Math.abs(distance-2.7)<1e-9);assert.ok(Math.abs(prior.player.x-6.95)<1e-9);assert.ok(Math.abs(prior.player.y-8.25)<1e-9);assert.equal(prior.player.moving,false);
  const used=sim.snapshot().events.filter(event=>event.type==='tool-use'&&event.tool==='torch');assert.equal(used.length,2,'Only the original light and ignition presses may use the torch');assert.deepEqual(used.map(event=>event.tick),[1,61]);
  const replay=createFireReviewSimulation({scenario:'carried-torch'});try{let s;for(let i=0;i<121;i++)s=replay.advance();assert.deepEqual(s,prior);}finally{replay.dispose();}
  }finally{sim.dispose();}
});