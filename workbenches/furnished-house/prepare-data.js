import {bounds,centre,clipTriangle,triangleArea} from './geometry.js';

// Scene adapter for the two actual native chimney meshes. The authored shaft
// begins above the floor: it is an inert roof ornament, not an earth anchor.
// Both physics and art receive this same prepared manifest; raw art is intact.
export function prepareFurnishedData(data) {
  if(data.runtimeAdapterVersion===1)return data;
  const shaft=data.sourceMeshes?.find(m=>m.name==='New Hopkins brick chimney'),cap=data.sourceMeshes?.find(m=>m.name==='Chimney cap');if(!shaft||!cap)return data;
  const meshes=[shaft,cap],ids=new Set(meshes.map(m=>m.id)),box=bounds(meshes.flatMap(m=>[m.bounds.min,m.bounds.max])),position=[(shaft.bounds.min[0]+shaft.bounds.max[0])/2,shaft.bounds.min[1],(shaft.bounds.min[2]+shaft.bounds.max[2])/2];
  const footprint={min:[shaft.bounds.min[0],shaft.bounds.min[1]-.35,shaft.bounds.min[2]],max:[shaft.bounds.max[0],box.max[1],shaft.bounds.max[2]]};
  const hosts=data.surfaces.filter(s=>s.kind==='roof'&&s.triangles.some(t=>clipTriangle(t,footprint).reduce((n,t)=>n+triangleArea(t),0)>1e-7)).map(s=>s.id);
  if(!hosts.length)throw Error('The native inert roof ornament needs actual roof bearing');
  const id='inert-ornament/native-chimney',polygon=[[shaft.bounds.min[0],position[1],shaft.bounds.min[2]],[shaft.bounds.max[0],position[1],shaft.bounds.min[2]],[shaft.bounds.max[0],position[1],shaft.bounds.max[2]],[shaft.bounds.min[0],position[1],shaft.bounds.max[2]]],parts=meshes.map((m,i)=>({id:`${id}/part/${i}`,itemId:id,level:1,sourceMeshBinding:m.id,matrix:m.matrix,bounds:m.bounds,material:'brick',fuelClass:null,fuelAmount:0,finish:null,supportSurfaceIds:hosts,inert:true}));
  return {...data,runtimeAdapterVersion:1,surfaces:data.surfaces.filter(s=>!s.sourceMeshBindings?.some(binding=>ids.has(binding))),furnitureParts:[...data.furnitureParts,...parts],items:[...data.items,{id,type:'inert-roof-ornament',level:1,position,quaternion:[0,0,0,1],bounds:box,partIds:parts.map(p=>p.id),supportSurfaceIds:hosts,supportContacts:[{id:`${id}/foot`,polygon,contactY:position[1],supportSurfaceIds:hosts}],sourceMeshBindings:[...ids],prototypeBinding:'Native shaft/cap on an explicitly inferred local roof collar; no lower chimney stack is invented.'}],runtimeAdaptations:[...(data.runtimeAdaptations||[]),{id:'inert-roof-ornament-binding',itemId:id,sourceMeshBindings:[...ids],sourceBounds:box,sourcePosition:position,supportSurfaceIds:hosts,material:'brick',fuelAmount:0,shape:'Original native shaft and cap, rigid translation in gravity; no lower continuation or earth anchor.'}]};
}
