import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../../src/runtime/three.js';
import {createNeighborhood} from '../../src/art/neighborhood.js';import {createGrossHouse} from '../../src/art/gross-housing.js';
import {createNativeFacadeSource} from '../../src/art/fire-sites.js';import {burningBuildingVisuals} from '../../src/art/fire-frame.js';
import {compileBuildings} from '../../src/content/buildings.js';import {createFireReviewSimulation} from '../../tools/fire-realism/scenarios.js';
const catalogue={houses:['gross','hopkins'].flatMap(name=>JSON.parse(fs.readFileSync(`assets/art/${name}-housing-v1/houses.json`)).houses)},library={catalogue,textures:{}};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function ancestors(mesh){let wall=mesh.parent;while(wall&&!wall.name.startsWith('wall:'))wall=wall.parent;let level=wall?.parent;while(level&&!/^Level -?\d+$/.test(level.name))level=level.parent;return {wall,level};}
function nativePart(root,audit){let result;root.traverse(mesh=>{if(!mesh.isMesh||mesh.userData.assetRole!==audit.sourceRole)return;const {wall,level}=ancestors(mesh);if(wall?.userData.edge===audit.sourceEdgeId&&level?.name==='Level '+audit.sourceLevelIndex&&JSON.stringify(mesh.matrix.toArray())===JSON.stringify(audit.sourceLocalMatrix))result=mesh;});assert.ok(result,'Source part audit resolves to a real native mesh');return result;}
function verify(root,source){
  assert.ok(source.candidates.length>0&&source.candidates.length<=32);assert.equal(new Set(source.candidates.map(s=>s.id)).size,source.candidates.length);
  for(const site of source.candidates){
    const audit=source.audit.find(a=>a.id===site.id),mesh=nativePart(root,audit),geometry=mesh.geometry,index=geometry.index,pos=geometry.attributes.position,start=site.sourceFaceIndex*3;
    assert.equal(site.kind,'facade');assert.ok(!site.id.includes(mesh.uuid));assert.ok(site.sourcePartId.includes('/level:'+audit.sourceLevelIndex+'/'));
    const vertices=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,index?index.getX(start+j):start+j).applyMatrix4(mesh.matrixWorld));
    const triangle=new T.Triangle(...vertices),point=new T.Vector3(...site.position),normal=triangle.getNormal(new T.Vector3());
    assert.ok(triangle.containsPoint(point));near(new T.Plane().setFromCoplanarPoints(...vertices).distanceToPoint(point),0);near(normal.dot(new T.Vector3(...site.normal)),1);near(new T.Vector3(...site.normal).length(),1);
    assert.equal(audit.sourceRoomIds.length,1);assert.ok(['Native wall unit','Nautilus cut-end wall panel'].includes(audit.sourceRole));assert.ok(['Painted exterior','Brick basement'].includes(audit.sourceMaterialName));
    const group=geometry.groups.find(g=>start>=g.start&&start<g.start+g.count);assert.equal(group.materialIndex,audit.sourceMaterialIndex);assert.equal([mesh.material].flat()[group.materialIndex].name,audit.sourceMaterialName);
    assert.ok(site.span.width>0&&site.span.height>0);near(site.position[1],site.baseElevation);near(site.baseElevation,audit.sourceLevelY);assert.ok(site.baseElevation>=-1e-5);
  }
}
test('actual selected house meshes provide audited native exterior triangle sites through all quarter turns without modifying assets',()=>{
  const before=JSON.stringify(catalogue);
  for(const prefabId of ['ashland-worker','hopkins-4-12','hopkins-4-09','monroe-row']){
    let ids;
    for(let quarterTurns=0;quarterTurns<4;quarterTurns++){
      const {buildings}=compileBuildings([{id:'native-house',prefabId,x:20,y:20,quarterTurns}]),view=createNeighborhood(T,library,{facadeSites:true});
      try{view.update({buildings});const model=view.diagnostics().models[0],source=model.nativeFacade;verify(view.root.children[0],source);
        if(prefabId==='ashland-worker'){assert.equal(source.diagnostics.sourceLevelIndex,-1);near(source.diagnostics.sourceLevelY,0);}
        const current=source.candidates.map(s=>s.id);if(ids)assert.deepEqual(current,ids);else ids=current;
        assert.ok(!JSON.stringify(source).includes('snapshots'));assert.ok(view.diagnostics().facadeSiteWork[0].setupMs>=0);
      }finally{view.dispose();}
    }
  }
  assert.equal(JSON.stringify(catalogue),before);
});
test('bounded distribution covers real native wall normals and stays stable under reordered mesh traversal',()=>{
  const plan={id:'wide-native-test',width:40,depth:40,plinth:.48,style:{color:'#aabbcc',trim:'#eeeeee',accent:'#333333',wall:'clapboard',roof:'cedar',form:'gable'},floors:[{label:'Ground diagnostic',rooms:[{id:'one',type:'service',polygon:[[0,0],[40,0],[40,40],[0,40]]}],connections:[],windows:[]}]};
  const model=createGrossHouse(T,{catalogue:{houses:[plan]},textures:{}},plan.id,{furnished:false}),instance={id:'bounded',prefabId:plan.id};
  try{const first=createNativeFacadeSource(T,{model,instance}).snapshot();assert.equal(first.candidates.length,32);verify(model.root,first);
    const normals=new Set(first.candidates.map(s=>s.normal.map(n=>Math.round(n)).join('/')));assert.equal(normals.size,4);
    model.root.traverse(node=>node.children.reverse());const next=createNativeFacadeSource(T,{model,instance}).snapshot();assert.deepEqual(next.candidates,first.candidates);assert.deepEqual(next.audit,first.audit);
  }finally{model.dispose();}
});
test('hidden, destroyed, unproved and clipped native parts yield no stale sites; camera ghosting does not select faces',()=>{
  const model=createGrossHouse(T,library,'ashland-worker',{furnished:false}),source=createNativeFacadeSource(T,{model,instance:{id:'visible'}});
  try{const first=source.snapshot();verify(model.root,first);const audit=first.audit[0],mesh=nativePart(model.root,audit),partId=audit.sourcePartId;
    mesh.visible=false;assert.ok(source.snapshot().candidates.every(s=>s.sourcePartId!==partId));mesh.visible=true;
    mesh.userData.destroyed=true;assert.ok(source.snapshot().candidates.every(s=>s.sourcePartId!==partId));delete mesh.userData.destroyed;
    const {wall}=ancestors(mesh),rooms=wall.userData.rooms;wall.userData.rooms=[];assert.ok(source.snapshot().candidates.every(s=>s.sourcePartId!==partId));wall.userData.rooms=rooms;
    const material=[mesh.material].flat()[audit.sourceMaterialIndex];material.opacity=.18;material.transparent=true;material.depthWrite=false;assert.deepEqual(source.snapshot().candidates,first.candidates);
    material.clippingPlanes=[new T.Plane(new T.Vector3(0,-1,0),.66)];assert.equal(source.snapshot().candidates.length,0);material.clippingPlanes=[];
    model.root.visible=false;const hidden=source.snapshot();assert.equal(hidden.candidates.length,0);assert.equal(hidden.diagnostics.available,false);assert.ok(hidden.diagnostics.reason);model.root.visible=true;
    const empty=createNativeFacadeSource(T,{model:{root:new T.Group(),levels:[],house:null},instance:{id:'missing'}}).snapshot();assert.deepEqual(empty.candidates,[]);assert.match(empty.diagnostics.reason,/Missing/);
  }finally{model.dispose();}
});
test('real street sites attach only current same-group burning fuel, detach cleanly and exclude joined Monroe sides',()=>{
  const sim=createFireReviewSimulation({scenario:'street-fire'}),view=createNeighborhood(T,library,{facadeSites:true});let snapshot;
  try{for(let i=0;i<30;i++)snapshot=sim.advance();view.update(snapshot.world);const housing=view.diagnostics(),groups=burningBuildingVisuals(snapshot,housing),ashland=groups.find(g=>g.id==='ashland-cottage');
    assert.equal(ashland.fireSites.length,15);assert.equal(ashland.fireSitesDiagnostic.available,true);
    for(const site of ashland.fireSites){assert.ok(site.sourceCellIds.length>0&&site.sourceCellIds.length<=4);for(const id of site.sourceCellIds)assert.ok(ashland.burningCellIds.includes(id));}
    const reversed=burningBuildingVisuals({...snapshot,cells:[...snapshot.cells].reverse()}, {...housing,models:[...housing.models].reverse()}).find(g=>g.id==='ashland-cottage');assert.deepEqual(reversed.fireSites,ashland.fireSites);
    ashland.fireSites[0].position[0]=999;assert.notEqual(burningBuildingVisuals(snapshot,view.diagnostics())[0].fireSites[0].position[0],999);
    const middle=housing.models.find(m=>m.instanceId==='monroe-row-middle');assert.ok(middle.nativeFacade.candidates.length>0);for(const audit of middle.nativeFacade.audit){const edge=audit.sourceEdgeId.split('|').map(s=>s.split(',').map(Number));assert.ok(!(edge[0][0]===edge[1][0]&&[0,7].includes(edge[0][0])));}
    const spent={...snapshot,cells:snapshot.cells.map(c=>({...c,phase:'spent',intensity:0}))};assert.deepEqual(burningBuildingVisuals(spent,housing),[]);
    const destroyed={...snapshot,world:{...snapshot.world,buildings:snapshot.world.buildings.map(b=>({...b,destroyed:true}))}};assert.deepEqual(burningBuildingVisuals(destroyed,housing),[]);
    const compatibility=burningBuildingVisuals(snapshot,{models:housing.models.map(({nativeFacade,...model})=>model)});assert.deepEqual(compatibility[0].fireSites,[]);assert.match(compatibility[0].fireSitesDiagnostic.reason,/evidence unavailable/);
  }finally{view.dispose();sim.dispose();}
});
