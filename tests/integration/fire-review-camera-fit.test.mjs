import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../../src/runtime/three.js';import {createBearRig,BEAR_SOURCE_COMMIT} from '../../src/reuse/bear.js';
import {createNeighborhood} from '../../src/art/neighborhood.js';import {burningBuildingVisuals} from '../../src/art/fire-frame.js';
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
function visibleNativeVertices(root){
  root.updateWorldMatrix(true,true);const points=[];
  root.traverseVisible(mesh=>{if(!mesh.isMesh||!mesh.geometry?.attributes.position||[mesh.material].flat().every(material=>material?.visible===false))return;
    for(let i=0;i<mesh.geometry.attributes.position.count;i++)points.push(mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld).toArray());
  });return points;
}
test('street portrait/desktop fit contains complete native body/tool, Ashland structure/sites and bounded source smoke at equal mode cameras',()=>{
  const sim=createFireReviewSimulation({scenario:'street-fire'}),rig=createBearRig(data),catalogue={houses:['gross','hopkins'].flatMap(name=>JSON.parse(fs.readFileSync(`assets/art/${name}-housing-v1/houses.json`)).houses)},housing=createNeighborhood(T,{catalogue,textures:{}},{facadeSites:true});
  try{for(let i=0;i<30;i++)sim.advanceReceiptStep();const snapshot=sim.snapshot(),original=JSON.stringify(snapshot);rig.update(snapshot.player,snapshot.clocks.player);housing.update(snapshot.world);
    const source=housing.diagnostics(),group=burningBuildingVisuals(snapshot,source).find(g=>g.id==='ashland-cottage'),root=housing.root.children[snapshot.world.buildings.findIndex(b=>b.id===group.id)],body=visibleNativeVertices(rig.root),structure=visibleNativeVertices(root),anchors=Object.values(rig.anchors).map(node=>node.getWorldPosition(new T.Vector3()).toArray()),model=source.models.find(m=>m.instanceId===group.id),walls=model.nativeFacade.audit.flatMap(a=>a.sourceFaceVertices);
    assert.ok(body.length>5000&&structure.length>19000);assert.equal(group.fireSites.length,15);const members=new Set(group.footprintCellIds),fuel=snapshot.cells.filter(c=>members.has(c.id));assert.equal(fuel.length,253);
    const smoke=[];for(const cell of fuel)for(const x of [cell.x-cell.size/2,cell.x+cell.size/2])for(const z of [cell.y-cell.size/2,cell.y+cell.size/2])for(const dx of [-2,2])for(const dz of [-2,2])for(const y of [0,6.5])smoke.push([x+dx,y,z+dz]);
    for(const viewport of [...viewports].reverse())for(const view of ['isometric','oblique']){let baseline;
      for(const mode of ['current','reference','optimized','no-fire']){
        const camera=new T.OrthographicCamera(-10,10,10,-10,.1,300),policy=placeFireReviewCamera(T,camera,{scenario:'street-fire',view,viewport,mode});
        for(const point of body)inside(camera,point,'Complete native bear/tool '+view);for(const point of anchors)inside(camera,point,'Native attachment '+view);for(const point of structure)inside(camera,point,'Actual Ashland structure '+view);for(const point of walls)inside(camera,point,'Proven exterior wall triangle '+view);for(const site of group.fireSites)inside(camera,site.position,'Native facade attachment '+view);for(const point of smoke)inside(camera,point,'Declared Ashland source-smoke support '+view);
        const projected=body.map(point=>new T.Vector3(...point).project(camera)),bodyHeightCss=(Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y)))*viewport.height/2;
        assert.ok(bodyHeightCss>=(viewport.width===390?30:65),'Bounded action view retains a useful actual native body/tool size');assert.ok(policy.span<(viewport.width===390?45:20),'Camera must not widen to the whole51x47m map');assert.deepEqual(policy.offset,[10,view==='oblique'?5:14,12]);
        const signature={world:camera.matrixWorld.toArray(),projection:camera.projectionMatrix.toArray(),policy};if(baseline)assert.deepEqual(signature,baseline);else baseline=signature;
      }
    }
    assert.equal(JSON.stringify(snapshot),original);assert.deepEqual(rig.diagnostics().nativeScale,[1,1,1]);
  }finally{housing.dispose();rig.dispose();sim.dispose();}
});
