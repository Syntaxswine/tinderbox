import {createNativeQueryRegistry} from './native-query-registry.js';
import {materialTransmission} from '../../workbenches/furnished-house/scene.js';

// Compact part records are resident; exact world triangles are expanded only
// on a query. Source ownership, not render residency, controls proxy retirement.
export function createSourceQueryRegistry({navigation,parts,shapeForPart,limits={}}){
  const policy={shapes:192,triangles:65536,...limits};
  if(![policy.shapes,policy.triangles].every(n=>Number.isSafeInteger(n)&&n>=2))throw Error('Invalid source query cache');
  const byPart=new Map(),byCarrier=new Map(),claimed=new Set(),cache=new Map();
  for(const part of parts){if(!part.id||byPart.has(part.id)||!part.carrierId)throw Error('Duplicate/unowned source part');byPart.set(part.id,part);if(!byCarrier.has(part.carrierId))byCarrier.set(part.carrierId,[]);byCarrier.get(part.carrierId).push(part);}
  const baseShapes=Math.min(24,policy.shapes-1),baseTriangles=Math.min(8192,policy.triangles-1),knownShapes=policy.shapes-baseShapes,knownTriangles=policy.triangles-baseTriangles;
  const base=createNativeQueryRegistry({navigation:{...navigation,surfaces:navigation.surfaces.filter(s=>s.terrain),ceilings:[]},claimedPartIds:[...byPart.keys()],limits:{shapes:baseShapes,triangles:baseTriangles}});
  let index,closed=false,triangles=0,builds=0,peakShapes=0,peakTriangles=0,maxSingleQueryTriangles=0,followResolver;
  const idOf=id=>navigation.placeId+'::cold/'+id;
  const empty=Object.freeze({triangles:Object.freeze([]),closed:false});
  function shape(part,open=base.portalOpen(part.portalId)){
    if(closed)throw Error('Source query registry disposed');if(part.physical!==false&&claimed.has(part.carrierId))return empty;
    const key=part.id+(open?'/open':'/closed'),hit=cache.get(key),revision=part.physical===false?index?.revision:0;if(hit&&hit.queryRevision===revision){cache.delete(key);cache.set(key,hit);return hit;}
    if(hit){triangles-=hit.triangles.length;cache.delete(key);}
    let result=shapeForPart(part.id,open);if(!result||!Array.isArray(result.triangles))throw Error('Missing effective source geometry '+part.id);
    if(part.physical===false&&followResolver)result=followResolver(part,result);result={...result,queryRevision:revision};
    builds++;const count=result.triangles.length;maxSingleQueryTriangles=Math.max(maxSingleQueryTriangles,count);
    if(count<=knownTriangles){while(cache.size&&(cache.size>=knownShapes||triangles+count>knownTriangles)){const first=cache.keys().next().value;triangles-=cache.get(first).triangles.length;cache.delete(first);}cache.set(key,result);triangles+=count;peakShapes=Math.max(peakShapes,cache.size);peakTriangles=Math.max(peakTriangles,triangles);}
    return result;
  }
  function install(target){
    if(closed)throw Error('Source query registry disposed');if(index){if(index!==target)throw Error('Source queries belong to one physical world');return;}index=target;base.install(index);
    for(const part of parts){const open=base.portalOpen(part.portalId),box=open&&part.openBounds?part.openBounds:part.bounds;
      const b=index.put({id:idOf(part.id),sourceSurfaceId:part.carrierId,sourceCarrierId:part.carrierId,nativePartId:part.id,instanceId:navigation.placeId,kind:'query-solid',material:part.material,queryOnly:true,supports:true,supportFromMesh:true,normal:[0,1,0],bounds:box,triangles:[],transmission:materialTransmission(part.material),actualDoorPose:!!part.portalId,openFraction:open?1:0,position:box.min.map((v,i)=>(v+box.max[i])/2)});
      Object.defineProperties(b,{triangles:{get:()=>shape(part).triangles},solidTriangles:{get:()=>shape(part).triangles},closedShape:{get:()=>shape(part).closed}});
    }
  }
  function prepareClaim(carrierIds){
    const ids=[...new Set(carrierIds)],proxyIds=ids.flatMap(id=>{if(!byCarrier.has(id))throw Error('Unknown source claim '+id);return byCarrier.get(id).filter(p=>p.physical!==false).map(p=>idOf(p.id));});let committed=false;
    function validate(){if(closed||!index)throw Error('Source queries are unavailable');if(committed)throw Error('Source claim already committed');for(const id of ids)if(claimed.has(id))throw Error('Source already claimed '+id);}
    validate();return {proxyIds,validate,commit(){validate();for(const id of ids){claimed.add(id);for(const part of byCarrier.get(id)){for(const suffix of ['/open','/closed']){const key=part.id+suffix,old=cache.get(key);if(old){triangles-=old.triangles.length;cache.delete(key);}}if(part.physical!==false)index.change(idOf(part.id),{intact:false,openFraction:1});}}committed=true;}};
  }
  function setPortalOpen(id,open){base.setPortalOpen(id,open);if(index)for(const part of parts)if(part.portalId===id&&!claimed.has(part.carrierId))index.change(idOf(part.id),{openFraction:open?1:0,bounds:open&&part.openBounds?part.openBounds:part.bounds});}
  return {install,prepareClaim,setPortalOpen,setFollowResolver(fn){followResolver=fn;},portalOpen:base.portalOpen,portalStates:base.portalStates,isClaimedCarrier:id=>claimed.has(id),isClaimedPart:id=>byPart.get(id)?.physical!==false&&claimed.has(byPart.get(id)?.carrierId),
    shape(id,open){const part=byPart.get(id);return part?shape(part,open):base.shape(id,open);},queryId:idOf,
    metrics(){const fallback=base.metrics();return {querySurfaces:parts.length+fallback.querySurfaces,sourceParts:parts.length,sourceCarriers:byCarrier.size,claimedCarriers:claimed.size,cachedShapes:cache.size+fallback.cachedShapes,cachedTriangles:triangles+fallback.cachedTriangles,peakShapes:peakShapes+fallback.peakShapes,peakTriangles:peakTriangles+fallback.peakTriangles,shapeBuilds:builds+fallback.shapeBuilds,maxSingleQueryTriangles,maxShapes:policy.shapes,maxTriangles:policy.triangles,thermalCellsAllocated:0,fuelAllocated:0};},
    dispose(){if(closed)return;closed=true;base.dispose();cache.clear();triangles=0;index=null;}};
}
