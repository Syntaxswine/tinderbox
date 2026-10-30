import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../../src/runtime/three.js';
import {createBearRig,BEAR_SOURCE_COMMIT} from '../../src/reuse/bear.js';
import {createWorld} from '../../src/art/world.js';
import {createNeighborhood} from '../../src/art/neighborhood.js';
import {burningBuildingVisuals} from '../../src/art/fire-frame.js';
import {createFireReviewEffect} from '../../src/art/fire-review-effect.js';
import {createFireReviewSimulation} from '../../tools/fire-realism/scenarios.js';
import {placeFireReviewCamera} from '../../tools/fire-realism/camera.js';
const catalogue={houses:['gross','hopkins'].flatMap(name=>JSON.parse(fs.readFileSync(`assets/art/${name}-housing-v1/houses.json`)).houses)};
const bearData=JSON.parse(fs.readFileSync(`vendor/animal-factory-tactics-3d/${BEAR_SOURCE_COMMIT}/dist/tactics/bear-10k-data.json`));
function visibleBeforeWall(camera,point,wall){
  const ndc=point.clone().project(camera);assert.ok(Math.abs(ndc.x)<1&&Math.abs(ndc.y)<1&&Math.abs(ndc.z)<1,'Native attachment/contact must be inside the view');
  const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(ndc.x,ndc.y),camera);
  const hit=ray.ray.intersectBox(wall,new T.Vector3());
  const distance=point.clone().sub(ray.ray.origin).dot(ray.ray.direction);
  return !hit||hit.clone().sub(ray.ray.origin).dot(ray.ray.direction)>=distance-1e-5;
}
test('review wall camera shows the actual native muzzle and resolved beam from the opaque wall source side in both views',()=>{
  const sim=createFireReviewSimulation({scenario:'wall-clipped-jet'}),rig=createBearRig(bearData),material=new T.MeshBasicMaterial(),world=createWorld(T,new Proxy({},{get:()=>material}));
  try{
    let snapshot;for(let i=0;i<60;i++)snapshot=sim.advance();const before=JSON.stringify(snapshot);
    rig.update(snapshot.player,snapshot.clocks.player);world.update(snapshot.world);world.root.updateMatrixWorld(true);
    const wall=world.root.children.find(node=>node.name==='obstacle:real-masonry-wall');assert.ok(wall,'Actual world obstacle is present');
    const bounds=new T.Box3().setFromObject(wall),muzzle=rig.anchors.muzzle.getWorldPosition(new T.Vector3());
    const endpoint=snapshot.discharge.rays.reduce((best,ray)=>ray.distance>best.distance?ray:best,snapshot.discharge.rays[0]);
    const beam=muzzle.clone().lerp(new T.Vector3(endpoint.x,endpoint.h,endpoint.y),.5);
    assert.ok(snapshot.discharge.rays.some(ray=>ray.obstacleId==='real-masonry-wall'));assert.ok(Math.max(...snapshot.discharge.rays.map(ray=>ray.x))<8-.08);
    for(const viewport of [{width:1280,height:800,pixelRatio:1},{width:390,height:844,pixelRatio:1.75}])for(const view of ['isometric','oblique']){
      const cameras=[];
      for(const mode of ['current','reference','no-fire']){
        const camera=new T.OrthographicCamera(-10,10,10,-10,.1,300),policy=placeFireReviewCamera(T,camera,{scenario:'wall-clipped-jet',view,viewport,mode});
        assert.equal(policy.side,'muzzle-side');assert.ok(camera.position.x<bounds.min.x);
        assert.ok(visibleBeforeWall(camera,new T.Vector3(snapshot.player.x,1,snapshot.player.y),bounds),'Bear must not be hidden by the wall');
        assert.ok(visibleBeforeWall(camera,muzzle,bounds),'Native muzzle must not be hidden by the wall');
        assert.ok(visibleBeforeWall(camera,beam,bounds),'Visible resolved beam must not be hidden by the wall');
        cameras.push({world:camera.matrixWorld.toArray(),projection:camera.projectionMatrix.toArray()});
      }
      assert.deepEqual(cameras[0],cameras[1]);assert.deepEqual(cameras[1],cameras[2]);
    }
    wall.traverse(node=>{if(node.isMesh)for(const m of [node.material].flat()){assert.equal(m.opacity,1);assert.equal(m.transparent,false);assert.equal(m.depthWrite,true);}});
    assert.equal(JSON.stringify(snapshot),before);assert.deepEqual(rig.diagnostics().nativeScale,[1,1,1]);
  }finally{world.dispose();material.dispose();rig.dispose();sim.dispose();}
});
function depthRenderer(){let target=null;return {autoClear:true,shadowMap:{autoUpdate:true},getDrawingBufferSize:v=>v.set(1280,800),getRenderTarget:()=>target,setRenderTarget:value=>{target=value;},getViewport:v=>v.set(0,0,1280,800),getScissor:v=>v.set(0,0,1280,800),getScissorTest:()=>false,setViewport(){},setScissor(){},setScissorTest(){},clear(){},render(){}};}
test('real street fuel memberships and native source bounds reach reference presentation and identical mode diagnostics from frame30',()=>{
  const sim=createFireReviewSimulation({scenario:'street-fire'}),housing=createNeighborhood(T,{catalogue,textures:{}}),texture=new T.Texture();
  const field={field:{value:texture},grid:{value:new T.Vector2(102,94)},cellSize:{value:.5}};
  let snapshot=sim.snapshot(),frame30,frame240;
  try{
    for(let frame=0;frame<=240;frame++){
      if(frame)snapshot=sim.advance();
      if(![0,30,120,240].includes(frame))continue;
      housing.update(snapshot.world);const source=housing.diagnostics(),groups=burningBuildingVisuals(snapshot,source);
      if(frame===0){assert.deepEqual(groups,[]);continue;}
      assert.ok(groups.some(group=>group.id==='ashland-cottage'));
      for(const group of groups){
        const model=source.models.find(model=>model.instanceId===group.id);assert.ok(model);assert.deepEqual(group.sourceBounds,model.sourceBounds);
        const boxes=snapshot.world.obstacles.filter(box=>box.buildingId===group.id);
        for(const id of group.burningCellIds){const cell=snapshot.cells.find(cell=>cell.id===id);assert.equal(cell.phase,'burning');assert.equal(cell.material,'wood');assert.ok(boxes.some(box=>Math.abs(cell.x-box.x)<(box.width+cell.size)/2&&Math.abs(cell.y-box.y)<(box.depth+cell.size)/2));}
      }
      if(frame===30){assert.equal(snapshot.diagnostics.burningCells,128);assert.equal(groups[0].burningCellIds.length,128);frame30={snapshot:structuredClone(snapshot),source};}
      if(frame===240){assert.deepEqual(groups.map(group=>group.id),['hopkins-fifteen','ashland-cottage']);frame240=structuredClone(snapshot);}
    }
    const original=JSON.stringify(frame30.snapshot),modeGroups=[];
    for(const mode of ['current','reference','no-fire']){
      let delivered=null;const factory=(_T,{quality})=>({root:new T.Group(),update(frame){delivered=frame;},reset(){},dispose(){},diagnostics:()=>({quality,buildingGroups:1})});
      const scene=new T.Scene(),camera=new T.OrthographicCamera(-10,10,10,-10,.1,300);placeFireReviewCamera(T,camera,{scenario:'street-fire',view:'isometric',viewport:{width:1280,height:800,pixelRatio:1}});
      const effect=createFireReviewEffect(T,{flame:texture,smoke:texture,burst:texture},field,{renderer:depthRenderer(),scene,artistFactories:{reference:factory},initialMode:mode});
      try{
        effect.update(frame30.snapshot,frame30.snapshot.clocks.world,{housing:frame30.source,camera,viewport:{width:1280,height:800,pixelRatio:1}});effect.beforeRender(camera);
        const diagnostics=effect.diagnostics();assert.deepEqual(diagnostics.burningBuildingIds,['ashland-cottage']);modeGroups.push(diagnostics.buildingVisuals);
        if(mode==='reference'){assert.ok(delivered);assert.deepEqual(delivered.buildingVisuals,diagnostics.buildingVisuals);assert.equal(delivered.buildingVisuals[0].burningCellIds.length,128);}
        else assert.equal(delivered,null);
      }finally{effect.dispose();}
    }
    assert.deepEqual(modeGroups[0],modeGroups[1]);assert.deepEqual(modeGroups[1],modeGroups[2]);assert.equal(JSON.stringify(frame30.snapshot),original);
    housing.update(frame240.world);const grassOnly={...frame240,cells:frame240.cells.filter(cell=>cell.material!=='wood')};assert.ok(grassOnly.cells.some(cell=>cell.phase==='burning'));assert.deepEqual(burningBuildingVisuals(grassOnly,housing.diagnostics()),[]);
  }finally{housing.dispose();texture.dispose();sim.dispose();}
});
