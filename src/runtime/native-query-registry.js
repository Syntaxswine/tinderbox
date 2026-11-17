import * as T from './three.js';
import {transformCollisionShape} from './collision.js';
import {subtractPolygon} from './polygons.js';
const copyBox=b=>({min:[...b.min],max:[...b.max]});
export function boxTriangles(b){
  const a=b.min,c=b.max,v=[[a[0],a[1],a[2]],[c[0],a[1],a[2]],[c[0],c[1],a[2]],[a[0],c[1],a[2]],[a[0],a[1],c[2]],[c[0],a[1],c[2]],[c[0],c[1],c[2]],[a[0],c[1],c[2]]];
  return [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]].flatMap(f=>[[v[f[0]],v[f[1]],v[f[2]]],[v[f[0]],v[f[2]],v[f[3]]]]);
}
function floorShape(surface,reservations){
  let polygons=surface.polygons.map(p=>p.map(v=>[...v]));
  for(const hole of [...surface.holes||[],...reservations])polygons=polygons.flatMap(poly=>subtractPolygon(poly,hole));
  const top=[];for(const p of polygons){const shape=new T.Shape(p.map(([x,z])=>new T.Vector2(x,-z))),g=new T.ShapeGeometry(shape);
    try{const a=g.attributes.position,index=g.index;for(let i=0;i<(index?.count??a.count);i+=3)top.push([0,1,2].map(k=>{const j=index?index.getX(i+k):i+k;return [a.getX(j),surface.height,-a.getY(j)];}));}finally{g.dispose();}
  }
  const thickness=surface.height-(surface.bottom??surface.height-.12);
  const bottom=top.map(t=>[...t].reverse().map(([x,y,z])=>[x,y-thickness,z])),edges=new Map();
  for(const t of top)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],key=[a.join(','),b.join(',')].sort().join('|');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
  const sides=[...edges.values()].flatMap(([a,b])=>{const c=[b[0],b[1]-thickness,b[2]],d=[a[0],a[1]-thickness,a[2]];return [[a,b,c],[a,c,d]];});return {top,triangles:[...top,...bottom,...sides],closed:true};
}
// Lazy, inert geometry participates in the SAME physical boundary index used
// by tools, transport, radiation, sight and falling material. It owns no heat,
// fuel, gameplay clock or render residency, and never defaults to timber.
export function createNativeQueryRegistry({navigation,instanceId=navigation?.placeId,claimedPartIds=[],floorReservations=[],limits={}}={}){
  if(!navigation?.surfaces?.length||!instanceId)throw Error('Native query registry needs a pinned place definition');
  const claimed=new Set(claimedPartIds),records=new Map(),byNativeId=new Map(),cache=new Map(),portalStates=Object.fromEntries((navigation.portals||[]).map(p=>[p.id,!!p.initiallyOpen]));
  const policy={shapes:192,triangles:65536,...limits};if(![policy.shapes,policy.triangles].every(v=>Number.isSafeInteger(v)&&v>0))throw Error('Invalid native query cache limits');
  let closed=false,index,cachedTriangles=0,peakShapes=0,peakTriangles=0,shapeBuilds=0;
  const idOf=id=>instanceId+'::query/'+id;
  function register(nativeId,spec){const id=idOf(nativeId);if(records.has(id))throw Error('Duplicate native query '+nativeId);const r={id,nativeId,...spec};records.set(id,r);byNativeId.set(nativeId,r);}
  for(const [s,ceiling]of [...navigation.surfaces.map(s=>[s,false]),...(navigation.ceilings||[]).map(s=>[s,true])]){
    const points=s.polygons.flat(),bounds={min:[Math.min(...points.map(p=>p[0])),s.bottom??s.height-.12,Math.min(...points.map(p=>p[1]))],max:[Math.max(...points.map(p=>p[0])),s.height,Math.max(...points.map(p=>p[1]))]},reservations=floorReservations.filter(r=>r.height!==undefined?Math.abs(r.height-s.height)<1e-5:r.surfaceId===s.id).map(r=>r.polygon);
    register((ceiling?'ceiling/':'')+s.id,{kind:s.terrain?'ground':'query-floor',supports:true,normal:[0,1,0],bounds,surface:s,reservations});
  }
  for(const b of navigation.blockers||[]){if(claimed.has(b.id))continue;register(b.id,{kind:'query-solid',supports:true,normal:[0,1,0],bounds:copyBox(b.bounds),blocker:b,portalId:b.portalId});}
  function resolve(record,open=!!portalStates[record.portalId]){
    if(closed)throw Error('Native query registry disposed');const key=record.id+(open?'/open':'/closed'),hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return hit;}
    let shape;if(record.surface)shape=floorShape(record.surface,record.reservations);else{const b=record.blocker,matrix=open?b.openMatrix:b.matrix,box=open?b.openBounds:b.bounds;if(!box)return {triangles:[],closed:false};if(b.shapeId){const source=navigation.collisionShapes?.[b.shapeId];if(!source||!matrix)throw Error('Missing native query source '+b.id);shape=transformCollisionShape(source,matrix);}else shape={triangles:boxTriangles(box),closed:true};}
    shapeBuilds++;const count=shape.triangles.length;if(count<=policy.triangles){while(cache.size&&(cache.size>=policy.shapes||cachedTriangles+count>policy.triangles)){const first=cache.keys().next().value;cachedTriangles-=cache.get(first).triangles.length;cache.delete(first);}cache.set(key,shape);cachedTriangles+=count;peakShapes=Math.max(peakShapes,cache.size);peakTriangles=Math.max(peakTriangles,cachedTriangles);}return shape;
  }
  function install(boundaryIndex){
    if(closed)throw Error('Native query registry disposed');if(index&&index!==boundaryIndex)throw Error('A native query registry belongs to one physical index');index=boundaryIndex;
    for(const r of records.values()){
      const open=!!portalStates[r.portalId],bounds=open&&r.blocker?.openBounds?r.blocker.openBounds:r.bounds;
      const s=index.put({id:r.id,sourceSurfaceId:r.id,instanceId,kind:r.kind,material:'unassigned',fuelAmount:0,queryOnly:true,supports:r.supports,normal:r.normal,bounds:copyBox(bounds),triangles:[],solidTriangles:null,transmission:0,thickness:0,actualDoorPose:!!r.portalId,openFraction:open?1:0,position:r.bounds.min.map((v,i)=>(v+r.bounds.max[i])/2)});
      Object.defineProperties(s,{triangles:{configurable:true,get:()=>{const shape=resolve(r);return shape.top||shape.triangles;}},solidTriangles:{configurable:true,get:()=>resolve(r).triangles},closedShape:{configurable:true,get:()=>resolve(r).closed}});
    }
  }
  function setPortalOpen(id,open){
    if(closed||!Object.hasOwn(portalStates,id)||typeof open!=='boolean')throw Error('Invalid native portal state');if(portalStates[id]===open)return;portalStates[id]=open;
    if(index)for(const r of records.values())if(r.portalId===id){const b=open?r.blocker.openBounds:r.blocker.bounds;index.change(r.id,{openFraction:open?1:0,bounds:copyBox(b||r.blocker.bounds)});}
  }
  return {install,setPortalOpen,portalOpen:id=>!!portalStates[id],portalStates:()=>({...portalStates}),has:id=>byNativeId.has(id),shape(id,open){const r=byNativeId.get(id);return r?resolve(r,open):undefined;},queryId:idOf,
    metrics:()=>({querySurfaces:records.size,claimedSourceParts:claimed.size,shapeBuilds,cachedShapes:cache.size,cachedTriangles,peakShapes,peakTriangles,maxShapes:policy.shapes,maxTriangles:policy.triangles,thermalCellsAllocated:0,fuelAllocated:0}),
    dispose(){closed=true;cache.clear();cachedTriangles=0;index=null;}};
}
