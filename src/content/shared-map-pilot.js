import {bounds,triangleArea,cross,sub,unit,dot,mul} from '../../workbenches/furnished-house/geometry.js';
import {createNativeQueryRegistry} from '../runtime/native-query-registry.js';
import {createMapNavigation} from '../simulation/map-navigation.js';

const EPS=1e-5;
const qualify=(place,id)=>{if(typeof id!=='string'||!id||id.includes('::'))throw Error('Expected a place-local source ID');return place+'::'+id;};
const area=ts=>ts.reduce((sum,t)=>sum+triangleArea(t),0);
function sourceTriangles(binding,geometry){
  const p=geometry?.attributes?.position,m=binding.matrix,index=geometry?.index?.array;
  if(!p||p.itemSize!==3||m?.length!==16||!m.every(Number.isFinite))throw Error('Missing exact emitted source geometry');
  const count=index?.length??p.array.length/3,range=binding.sourceRange;
  const start=range?.start??0,end=range?start+range.count:count;
  if(start%3||end%3||start<0||end>count)throw Error('Invalid source triangle range');
  const out=[];
  for(let i=start;i<end;i+=3)out.push([0,1,2].map(k=>{const j=(index?index[i+k]:i+k)*3,x=p.array[j],y=p.array[j+1],z=p.array[j+2];return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}));
  if(out.length!==binding.triangleCount||out.some(t=>t.flat().some(n=>!Number.isFinite(n))))throw Error('Source triangle count/coordinates changed');
  return out;
}
// The first three accepted sources are proven rectangular native solids.
// Select their actual face, then retain its measured thickness. A general
// pitched/cut solid must use a separate exact extraction, never its AABB.
function panel(carrier,triangles){
  const b=bounds(triangles.flat()),dimensions=b.max.map((n,i)=>n-b.min[i]),axis=dimensions.indexOf(Math.min(...dimensions));
  if(dimensions.some(n=>n<=0)||triangles.length!==12)throw Error('Pilot needs a verified closed native box');
  const edges=new Map();
  for(const t of triangles){if(![0,1,2].some(a=>t.every(p=>Math.abs(p[a]-b.min[a])<EPS)||t.every(p=>Math.abs(p[a]-b.max[a])<EPS)))throw Error('Pilot source is not an exact box');
    for(let i=0;i<3;i++){const key=[t[i],t[(i+1)%3]].map(p=>p.map(n=>Math.round(n/EPS)).join(',')).sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}
  if([...edges.values()].some(n=>n!==2))throw Error('Open pilot source solid');
  const floor=carrier.quantityBasis.rule==='top-area';if(floor&&axis!==1)throw Error('Pilot floor top must be measured');
  const normal=[0,0,0];normal[axis]=1;
  const faces=triangles.filter(t=>t.every(p=>Math.abs(p[axis]-b.max[axis])<EPS));
  if(faces.length!==2)throw Error('Pilot primary source face missing');
  const plane=floor?b.max[1]:(b.min[axis]+b.max[axis])/2;
  const planeTriangles=faces.map(t=>{const vertices=t.map(p=>sub(p,mul(normal,dot(p,normal)-plane)));return dot(unit(cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0]))),normal)<0?[vertices[0],vertices[2],vertices[1]]:vertices;});
  const measuredArea=area(planeTriangles);
  if(carrier.fuelAmount>0&&Math.abs(measuredArea-carrier.area)>EPS)throw Error('Pilot primary area differs from accepted finite recipe');
  return {bounds:b,normal,triangles:planeTriangles,thickness:dimensions[axis],kind:floor?'floor':carrier.physicalMaterial==='glass'?'window':'wall',supports:floor};
}
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
    surfaces.push({id:sourceId,instanceId:placeId,...shape,material:c.physicalMaterial,fuelClass:c.fuelClass,fuelAmount:c.fuelAmount,area:c.area,level:c.nativeLevel??Math.floor(shape.bounds.min[1]/2.12),supportSurfaceIds:c.supportCarrierIds.map(id=>qualify(placeId,id)),sourceMeshBindings:c.sourcePartIds.map(id=>qualify(placeId,id)),...(c.finish?{finish:{fuelClass:c.finish.fuelClass,amount:c.finish.fuelAmount}}:{})});
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
