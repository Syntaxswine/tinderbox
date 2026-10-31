import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../../src/runtime/three.js';import {createBearRig,BEAR_SOURCE_COMMIT} from '../../src/reuse/bear.js';
import {worldToStick} from '../../src/simulation/index.js';import {createFireReviewSimulation} from '../../tools/fire-realism/scenarios.js';import {placeFireReviewCamera} from '../../tools/fire-realism/camera.js';
const data=JSON.parse(fs.readFileSync(`vendor/animal-factory-tactics-3d/${BEAR_SOURCE_COMMIT}/dist/tactics/bear-10k-data.json`));
function collect(scenario,previewTorch=false){
  const sim=createFireReviewSimulation({scenario}),rig=createBearRig(data),records=[];
  try{for(let frame=0;frame<=120;frame++){
    if(frame){const commandIndex=frame-1;if(previewTorch&&commandIndex===90)sim.dispatch({type:'move',...worldToStick({x:1,y:0},{cameraRelative:true,cameraX:10,cameraY:12})});if(previewTorch&&commandIndex===108)sim.dispatch({type:'move',x:0,y:0});sim.advance();}
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
test('camera-only child already fits the accepted future torch walk using real movement commands without changing the fixture',()=>{
  const records=collect('carried-torch',true);assert.ok(Math.abs(records[120].player.x-6.95)<1e-8);
  for(const viewport of viewports)for(const view of ['isometric','oblique']){
    const camera=new T.OrthographicCamera(-10,10,10,-10,.1,300);placeFireReviewCamera(T,camera,{scenario:'carried-torch',view,viewport});
    for(const record of records)for(const point of record.points)inside(camera,point,'Accepted torch walk '+view+' frame'+record.frame);
    for(const record of records)for(const [x,z]of record.smokeSources)for(const xx of [x-1.5,x+1.5])for(const zz of [z-1.5,z+1.5])inside(camera,[xx,5.5,zz],'Torch ground smoke clearance');
  }
});
