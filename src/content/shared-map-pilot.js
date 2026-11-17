import {sourceGeometryTriangles as sourceTriangles,nativePanel as panel} from './map-source-shapes.js';
import {createNativeQueryRegistry} from '../runtime/native-query-registry.js';
import {createMapNavigation} from '../simulation/map-navigation.js';

const EPS=1e-5;
const qualify=(place,id)=>{if(typeof id!=='string'||!id||id.includes('::'))throw Error('Expected a place-local source ID');return place+'::'+id;};
export {sourceGeometryTriangles,nativePanel} from './map-source-shapes.js';
export function extractSharedMapPilot({manifest,navigation,bindings,geometries}){
  if(manifest?.version!==1||bindings?.version!==1||bindings.placeId!==navigation?.placeId||manifest.placeId!==navigation.placeId||bindings.coordinateFrame?.frame!=='emitted-world'||bindings.coordinateFrame.sourceOffsetAlreadyApplied!==true)throw Error('Expected matching emitted-world map sources');
  if(JSON.stringify(navigation.sourceOffset)!==JSON.stringify(bindings.coordinateFrame.sourceOffset))throw Error('Source coordinate frames differ');
  const placeId=navigation.placeId,ids=new Set(),parts=new Set(),surfaces=[],renderBindings=[],floorReservations=[],boundaryBindings={};
  const carriers=bindings.carriers.map(c=>{
    if(ids.has(c.id)||!Array.isArray(c.sourcePartIds)||!Number.isFinite(c.fuelAmount)||c.fuelAmount<0)throw Error('Duplicate/invalid canonical carrier');ids.add(c.id);
    for(const id of c.sourcePartIds){if(parts.has(id))throw Error('Duplicate source fuel ownership');parts.add(id);}
    return {id:qualify(placeId,c.id),fuelClass:c.fuelClass,fuelAmount:c.fuelAmount,...(c.finish?{finish:{fuelClass:c.finish.fuelClass,amount:c.finish.fuelAmount}}:{})};
  });
  const activeCarrierIds=[];
  for(const id of bindings.pilotCarrierIds){
    const c=bindings.carriers.find(c=>c.id===id);if(!c||c.physicalSourcePartIds.length!==1)throw Error('Missing single-solid pilot carrier');
    const binding=c.renderBindings.find(b=>b.sourcePartId===c.physicalSourcePartIds[0]);
    if(!binding||binding.physicalContribution!=='carrier-solid'||c.quantityBasis.closedSourceSolids!==true)throw Error('Pilot closed-solid assignment absent');
    const ts=sourceTriangles(binding,geometries[binding.geometryId]),shape=panel(c,ts),sourceId=qualify(placeId,c.id);
    // Match compile-places' native-level tolerance for Float32 source bounds.
    const level=c.nativeLevel??binding.level??Math.floor(shape.bounds.min[1]/2.12+1e-5);
    surfaces.push({id:sourceId,instanceId:placeId,...shape,material:c.physicalMaterial,fuelClass:c.fuelClass,fuelAmount:c.fuelAmount,area:c.area,level,supportSurfaceIds:c.supportCarrierIds.map(id=>qualify(placeId,id)),sourceMeshBindings:c.sourcePartIds.map(id=>qualify(placeId,id)),...(c.finish?{finish:{fuelClass:c.finish.fuelClass,amount:c.finish.fuelAmount}}:{})});
    for(const part of c.physicalSourcePartIds)boundaryBindings[part]=[sourceId];
    if(shape.kind==='floor')floorReservations.push({height:shape.bounds.max[1],polygon:[[shape.bounds.min[0],shape.bounds.min[2]],[shape.bounds.max[0],shape.bounds.min[2]],[shape.bounds.max[0],shape.bounds.max[2]],[shape.bounds.min[0],shape.bounds.max[2]]],sourceIds:[sourceId]});
    renderBindings.push(...c.renderBindings.map(b=>({...b,carrierId:sourceId,sourceSurfaceIds:[sourceId]})));activeCarrierIds.push(sourceId);
  }
  const total=carriers.reduce((n,c)=>n+c.fuelAmount+(c.finish?.amount||0),0);
  if(Math.abs(total-bindings.finiteLedger.total)>1e-5)throw Error('Canonical finite stock differs from accepted table');
  return {version:1,placeId,stage:'three-source CPU pilot; cold carriers are reserved but activation frontier is pending',sourceScene:bindings.sourceScene,sourceOffsetApplied:true,
    sourceBounds:navigation.sourceBounds,surfaces,carriers,activeCarrierIds,boundaryBindings,floorReservations,renderBindings,
    limitations:{unassignedParts:bindings.unassignedBindings.length,coldCarriersNotYetActivated:carriers.length-activeCarrierIds.length,supportResolution:'Shared graph reports unresolved native supports; no artificial anchors.'}};
}
export function gameplayMapDefinition(navigation){
  if(navigation?.version!==1||!navigation.placeId||![navigation.width,navigation.height].every(n=>Number.isFinite(n)&&n>0&&n<=4096)||![navigation.spawn?.x,navigation.spawn?.y,navigation.spawn?.elevation].every(Number.isFinite))throw Error('Invalid sparse gameplay-map bounds/spawn');
  return {id:navigation.placeId,width:navigation.width,height:navigation.height,tileSize:1,fireCellSize:.5,player:{...navigation.spawn},camera:navigation.camera,patches:[],obstacles:[],buildings:[],modules:[],actors:[],pickups:[]};
}
export function compileSharedMapPilot(pilot,navigation,{isSectionReady=()=>true,streamMetrics=()=>({})}={}){
  if(pilot?.version!==1||pilot.placeId!==navigation?.placeId||pilot.sourceOffsetApplied!==true)throw Error('Mismatched shared map pilot');
  const definition=gameplayMapDefinition(navigation),id=pilot.placeId;
  const data={version:1,prefabId:id+'-shared-pilot',runtimeAdapterVersion:1,thermalCell:[.5,1.06,.5],gridOrigin:[0,0,0],implicitGround:false,sourceBounds:pilot.sourceBounds,
    levels:navigation.occupiedLevels.map(index=>({index,floorY:index*2.12})),surfaces:pilot.surfaces,openings:[],items:[],furnitureParts:[],stores:[],sourceMeshes:[],sourceHashes:[],render:{geometry:[],materials:[]},stairFlights:[],
    scene:{version:1,instances:[{id,bounds:pilot.sourceBounds}],doors:[]}};
  return {data,definition,instances:[{id,data:{}}],representation:'native-map-pilot',sparsePublication:true,sourceCarriers:pilot.carriers,activeCarrierIds:pilot.activeCarrierIds,limitations:pilot.limitations,
    createQuerySource:()=>createNativeQueryRegistry({navigation,claimedPartIds:Object.keys(pilot.boundaryBindings),floorReservations:pilot.floorReservations}),
    createNavigation:options=>createMapNavigation({...options,definition:navigation,boundaryBindings:pilot.boundaryBindings,floorReservations:pilot.floorReservations,isSectionReady,streamMetrics})};
}
