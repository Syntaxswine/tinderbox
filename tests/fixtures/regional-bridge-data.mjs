import {bounds} from '../../workbenches/furnished-house/geometry.js';
import {fixture,plane,closedFixture} from './regional-source-data.mjs';
export function disconnected(){return fixture([plane('left',[.1,.2,.1],[.3,.2,.3],1,{nativePartId:'fixture/part',closedShape:false}),plane('right',[4.1,.2,.1],[4.3,.2,.3],1,{nativePartId:'fixture/part',closedShape:false})]);}
export function closed(){const input=closedFixture();input.data.surfaces[0].nativePartId='fixture/part';return input;}
export function queryInput(input){
  const parts=new Map();for(const s of input.data.surfaces){if(!parts.has(s.nativePartId))parts.set(s.nativePartId,[]);parts.get(s.nativePartId).push(s);}
  const sources=[...parts].map(([id,list])=>{const ts=list.flatMap(s=>s.triangles),closed=list.every(s=>s.closedShape===true),carrierId=list[0].sourceCarrierId,box=bounds(ts.flat());return {partRef:{id,carrierId,closed,geometry:id+'/original',bounds:box},closed,surfaceTriangles:ts,solidTriangles:ts,rayRecord:{id:'cold/'+id,sourceSurfaceId:carrierId,sourceCarrierId:carrierId,nativePartId:id,intact:true,transmission:.02,openFraction:0,bounds:box,triangles:ts,solidTriangles:ts}};});
  return {grid:{origin:input.data.gridOrigin,pitch:input.data.thermalCell},sources,sourceRevision:input.sourceRevision};
}
