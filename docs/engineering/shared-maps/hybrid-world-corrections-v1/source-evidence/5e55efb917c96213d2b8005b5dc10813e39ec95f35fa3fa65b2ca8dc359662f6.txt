import assert from 'node:assert/strict';
import {boxTriangles} from './regional-query-data.mjs';
import {fixture,plane} from './regional-source-data.mjs';
import {createRegionalSourcePilot} from '../../src/simulation/regional-source-pilot.js';
import {createSourceQueryRegistry} from '../../src/runtime/source-query-registry.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import {createSourceSupportGraph} from '../../src/simulation/source-support.js';
import {createSourceActivation} from '../../src/simulation/source-activation.js';
import {createTrial,calmWind} from '../../workbenches/furnished-house/simulation.js';
import {originalMaterialComponents} from '../../src/simulation/original-support-ports.js';
import {bounds} from '../../workbenches/furnished-house/geometry.js';

// One original planar U component. Its two arms occupy the same X cell;
// three bridge rectangles share complete original arm edges at z=2.
export function coldIslandWorld(){
  const rectangle=(id,x0,x1,z0,z1)=>plane(id,[x0,0,z0],[x1,0,z1]).triangles;
  const u=[...rectangle('left',.1,.2,.1,2),...rectangle('right',.3,.4,.1,2),...rectangle('bridge-left',.1,.2,2,2.2),...rectangle('bridge-middle',.2,.3,2,2.2),...rectangle('bridge-right',.3,.4,2,2.2)];
  const components=originalMaterialComponents(u);assert.equal(components.length,1);assert.equal(components[0].primitives.length,10);
  const parts=[{id:'left',ownerId:'left-owner',triangles:boxTriangles([.1,-.12,.1],[.2,0,.3])},{id:'right',ownerId:'right-owner',triangles:boxTriangles([.3,0,.1],[.4,.1,.3])},{id:'u',ownerId:'u-owner',triangles:u}];
  const owners=[{id:'left-owner',fuelClass:'frame',fuelAmount:.2},{id:'right-owner',fuelClass:'frame',fuelAmount:.2},{id:'u-owner',fuelClass:'roof',fuelAmount:1}];
  const surfaces=[plane('left-top',[.1,0,.1],[.2,0,.3],.2,{kind:'floor',thickness:.12,sourceCarrierId:'left-owner',nativePartId:'left',sourceMeshBindings:['left'],fuelClass:'frame'}),
    {id:'right-body',sourceCarrierId:'right-owner',nativePartId:'right',sourceMeshBindings:['right'],instanceId:'islands',kind:'attachment',normal:[0,1,0],triangles:parts[1].triangles,physicalShape:'source-closed-mesh',material:'timber',fuelClass:'frame',fuelAmount:.2,supports:true},
    {id:'u-face',sourceCarrierId:'u-owner',nativePartId:'u',sourceMeshBindings:['u'],instanceId:'islands',kind:'roof',normal:[0,1,0],triangles:u,material:'timber',fuelClass:'roof',fuelAmount:1,closedShape:false,supports:true}];
  const logicalCells=7,sourceTriangles=24;assert.equal(surfaces.reduce((n,s)=>n+s.triangles.length,0),sourceTriangles);assert.ok(logicalCells<=64&&sourceTriangles<=256);
  const input=fixture([surfaces[2]],{quantity:1});input.owners=[owners[2]];const producer=createRegionalSourcePilot(input);
  const endpoint=(partId,point,primitives,sourceSurfaceId)=>({partId,point,primitives,sourceSurfaceId,cell:[0,0,0]});
  const support={parts:parts.map(({id,ownerId})=>({id,ownerId})),anchors:[{partId:'left',elevation:0}],bonds:[
    {id:'left-bearing',kind:'bearing-face',direction:'parent-to-child',parent:endpoint('left',[.15,0,.2],[6,7],'left-top'),child:endpoint('u',[.15,0,.2],[0,1],'u-face')},
    {id:'right-bearing',kind:'bearing-face',direction:'parent-to-child',parent:endpoint('u',[.35,0,.2],[2,3],'u-face'),child:endpoint('right',[.35,0,.2],[4,5],'right-body')}],requirements:[]};
  const nav={placeId:'islands',surfaces:[{id:'terrain',terrain:true,height:-.2,polygons:[[[0,0],[1,0],[1,3],[0,3]]],holes:[]}],ceilings:[],portals:[],blockers:[]};
  const queries=createSourceQueryRegistry({navigation:nav,parts:parts.map(p=>({id:p.id,carrierId:p.ownerId,material:'timber',physical:true,bounds:bounds(p.triangles.flat())})),shapeForPart:id=>({triangles:parts.find(p=>p.id===id).triangles,closed:id!=='u'})}),ledger=createSourceCarrierLedger(owners,{modes:{'u-owner':'regional'}});
  const data={...fixture([]).data,internalHybrid:true,hybridSourceRevision:input.sourceRevision,sourceBounds:{min:[0,-.2,0],max:[1,1,3]}};
  let trial,activation;
  try{
    trial=createTrial(data,{executionCache:true,querySource:queries,wind:calmWind,supportGraphFactory:scene=>createSourceSupportGraph({scene,model:{},querySource:queries,internalHybrid:support})});
    activation=createSourceActivation({trial,querySource:queries,ledger,sources:{sourcesForCarrier:id=>({surfaces:surfaces.filter(s=>s.sourceCarrierId===id),openings:[]}),near:()=>owners.map(o=>o.id),portalCarriers:()=>[]},internalHybrid:{mode:'hybrid-world-v1',producer,querySources(){const p=parts[2],box=bounds(u.flat()),partRef={id:'u',carrierId:'u-owner',closed:false,bounds:box};return [{partRef,surfaceTriangles:u,solidTriangles:u,closed:false,rayRecord:{id:'islands::cold/u',sourceSurfaceId:'u-face',sourceCarrierId:'u-owner',nativePartId:'u',triangles:u,solidTriangles:u,bounds:box,intact:true,openFraction:0,transmission:.02}}];}}});
    return {trial,activation,queries,ledger,producer,logicalCells,sourceTriangles,originalComponents:components.length,receipt:()=>producer.compile(producer.region('u-owner',[0,0,4])),dispose(){activation.dispose();trial.dispose();queries.dispose();ledger.dispose();}};
  }catch(error){activation?.dispose();trial?.dispose();queries.dispose();ledger.dispose();producer.dispose();throw error;}
}
