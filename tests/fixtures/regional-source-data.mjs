import {boxTriangles} from '../../src/runtime/native-query-registry.js';
export const revision='a'.repeat(64);
export function plane(id,min,max,quantity=1,extra={}){
  const [x,y,z]=min,[a,,b]=max;
  return {id,sourceCarrierId:'fixture::owner',instanceId:'fixture',kind:'roof',normal:[0,1,0],thickness:0,material:'timber',fuelClass:'roof',fuelAmount:quantity,triangles:[[[x,y,z],[a,y,b],[a,y,z]],[[x,y,z],[x,y,b],[a,y,b]]],...extra};
}
export function fixture(surfaces,{quantity=surfaces.reduce((n,s)=>n+s.fuelAmount+(s.finish?.amount||0),0)}={}){
  return {sourceRevision:revision,owners:[{id:'fixture::owner',fuelClass:'roof',fuelAmount:quantity}],data:{version:1,runtimeAdapterVersion:1,implicitGround:false,gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],sourceBounds:{min:[-1,-1,-1],max:[9,5,9]},surfaces,openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'fixture'}],doors:[]}}};
}
export function closedFixture(){
  return fixture([{id:'fixture/cube',sourceCarrierId:'fixture::owner',instanceId:'fixture',kind:'attachment',material:'timber',fuelClass:'roof',fuelAmount:1,triangles:boxTriangles({min:[0,0,0],max:[6,3.18,6]}),normal:[0,1,0],physicalShape:'source-closed-mesh',closedShape:true,thickness:0}]);
}
export function disposeScene(scene){for(const m of [scene.index.surfaces,scene.index.bins,scene.cells,scene.fuels,scene.items,scene.parts,scene.sourceDefinitions])m.clear();}
export function boundaryRecord(b){const {heatCells,...rest}=b;return {...rest,heatCells:heatCells?.map(c=>c.id)};}
export function fuelRecord(f){const {cells,...rest}=f;return {...rest,cells:cells.map(c=>c.id)};}
export function signature(scene){
  return {boundaries:[...scene.index.surfaces].map(([id,b])=>[id,boundaryRecord(b)]),fuels:[...scene.fuels].map(([id,f])=>[id,fuelRecord(f)]),cells:[...scene.cells].map(([id,c])=>[id,{...c,fuels:c.fuels.map(f=>f.id),links:c.links}]),profiles:scene.profile,quantity:scene.initialFuel};
}
