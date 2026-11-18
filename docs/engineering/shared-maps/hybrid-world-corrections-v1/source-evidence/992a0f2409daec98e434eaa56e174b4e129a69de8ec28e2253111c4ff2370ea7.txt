import {createNativeQueryRegistry} from './native-query-registry.js';
import {materialTransmission} from '../../workbenches/furnished-house/scene.js';
import {createHybridSourceQueries} from './hybrid-source-queries.js';

// Compact part records are resident; exact world triangles are expanded only
// on a query. Source ownership, not render residency, controls proxy retirement.
export function createSourceQueryRegistry({navigation,parts,shapeForPart,limits={}}){
  const policy={shapes:192,triangles:65536,...limits};
  if(![policy.shapes,policy.triangles].every(n=>Number.isSafeInteger(n)&&n>=2))throw Error('Invalid source query cache');
  const byPart=new Map(),byCarrier=new Map(),claimed=new Set(),cache=new Map();
  for(const part of parts){if(!part.id||byPart.has(part.id)||!part.carrierId)throw Error('Duplicate/unowned source part');byPart.set(part.id,part);if(!byCarrier.has(part.carrierId))byCarrier.set(part.carrierId,[]);byCarrier.get(part.carrierId).push(part);}
  const baseShapes=Math.min(24,policy.shapes-1),baseTriangles=Math.min(8192,policy.triangles-1),knownShapes=policy.shapes-baseShapes,knownTriangles=policy.triangles-baseTriangles;
  const base=createNativeQueryRegistry({navigation:{...navigation,surfaces:navigation.surfaces.filter(s=>s.terrain),ceilings:[]},claimedPartIds:[...byPart.keys()],limits:{shapes:baseShapes,triangles:baseTriangles}});
  let index,closed=false,triangles=0,builds=0,peakShapes=0,peakTriangles=0,maxSingleQueryTriangles=0,followResolver,regional=null,workingTriangles=0,workingShapes=0,peakWorkingTriangles=0,peakWorkingShapes=0;const workingLeases=new Set();
  const idOf=id=>navigation.placeId+'::cold/'+id;
  const empty=Object.freeze({triangles:Object.freeze([]),closed:false});
  function makeRoom(count){while(cache.size+workingShapes>=knownShapes||triangles+workingTriangles+count>knownTriangles){const first=[...cache.keys()].find(k=>!cache.get(k).pins);if(!first)throw Error('Pinned source geometry exceeds combined query cache');triangles-=cache.get(first).triangles.length;cache.delete(first);}}
  function working(shapes){
    if(closed||!Number.isSafeInteger(shapes)||shapes<1||cache.size+workingShapes+shapes>knownShapes)throw Error('Temporary source projection exceeds combined cache');
    const readLease=index?.holdReadLease();let count=0,released=false;workingShapes+=shapes;peakWorkingShapes=Math.max(peakWorkingShapes,workingShapes);
    const lease={grow(n){if(closed||released||!Number.isSafeInteger(n)||n<0||triangles+workingTriangles+n>knownTriangles)throw Error('Temporary source projection exceeds combined cache');count+=n;workingTriangles+=n;peakWorkingTriangles=Math.max(peakWorkingTriangles,workingTriangles);},release(){if(released)return;released=true;workingTriangles-=count;workingShapes-=shapes;readLease?.release();workingLeases.delete(lease);}};workingLeases.add(lease);return lease;
  }
  function reserve(key,ts){const hit=cache.get(key)||[...cache.values()].find(v=>v.triangles===ts);if(hit){hit.pins=(hit.pins||0)+1;return {shape:hit,release(){hit.pins--;}};}makeRoom(ts.length);const value={triangles:ts,pins:1};cache.set(key,value);triangles+=ts.length;peakShapes=Math.max(peakShapes,cache.size);peakTriangles=Math.max(peakTriangles,triangles);return {shape:value,release(){value.pins--;}};}
  function shape(part,open=base.portalOpen(part.portalId),original=false){
    if(closed)throw Error('Source query registry disposed');if(!original&&regional?.has(part.id))return regional.shape(part.id);if(!original&&part.physical!==false&&claimed.has(part.carrierId))return empty;
    const key=part.id+(open?'/open':'/closed'),hit=cache.get(key),revision=part.physical===false?index?.revision:0;if(hit&&hit.queryRevision===revision){cache.delete(key);cache.set(key,hit);return hit;}
    if(hit){triangles-=hit.triangles.length;cache.delete(key);}
    let result=shapeForPart(part.id,open);if(!result||!Array.isArray(result.triangles))throw Error('Missing effective source geometry '+part.id);
    if(part.physical===false&&followResolver)result=followResolver(part,result);result={...result,queryRevision:revision};
    builds++;const count=result.triangles.length;maxSingleQueryTriangles=Math.max(maxSingleQueryTriangles,count);
    if(count<=knownTriangles){makeRoom(count);cache.set(key,result);triangles+=count;peakShapes=Math.max(peakShapes,cache.size);peakTriangles=Math.max(peakTriangles,triangles);}
    return result;
  }
  function install(target){
    if(closed)throw Error('Source query registry disposed');if(index){if(index!==target)throw Error('Source queries belong to one physical world');return;}if(workingLeases.size)throw Error('Release query geometry before world installation');index=target;base.install(index);
    for(const part of parts){const open=base.portalOpen(part.portalId),box=open&&part.openBounds?part.openBounds:part.bounds;
      const b=index.put({id:idOf(part.id),sourceSurfaceId:part.carrierId,sourceCarrierId:part.carrierId,nativePartId:part.id,instanceId:navigation.placeId,kind:'query-solid',material:part.material,queryOnly:true,supports:true,supportFromMesh:true,normal:[0,1,0],bounds:box,triangles:[],transmission:materialTransmission(part.material),actualDoorPose:!!part.portalId,openFraction:open?1:0,position:box.min.map((v,i)=>(v+box.max[i])/2)});
      Object.defineProperties(b,{triangles:{get:()=>shape(part).triangles},solidTriangles:{get:()=>shape(part).triangles},closedShape:{get:()=>shape(part).closed},queryCrossings:{get:()=>regional?.has(part.id)?(a,z,o)=>regional.crossings(part.id,a,z,o):null},sourceSweep:{get:()=>regional?.has(part.id)?regional.sweep:null},withSourceGeometry:{value:consume=>{const borrowed=shape(part);try{return consume(borrowed.triangles);}finally{borrowed.release?.();}}}});
    }
  }
  function prepareClaim(carrierIds){
    const ids=[...new Set(carrierIds)],proxyIds=ids.flatMap(id=>{if(!byCarrier.has(id))throw Error('Unknown source claim '+id);return byCarrier.get(id).filter(p=>p.physical!==false).map(p=>idOf(p.id));});let committed=false;
    function validate(){if(closed||!index)throw Error('Source queries are unavailable');if(committed)throw Error('Source claim already committed');for(const id of ids)if(claimed.has(id))throw Error('Source already claimed '+id);}
    validate();return {proxyIds,validate,commit(){validate();for(const id of ids){claimed.add(id);for(const part of byCarrier.get(id)){for(const suffix of ['/open','/closed']){const key=part.id+suffix,old=cache.get(key);if(old&&!old.pins){triangles-=old.triangles.length;cache.delete(key);}}if(part.physical!==false)index.change(idOf(part.id),{intact:false,openFraction:1});}}committed=true;}};
  }
  function setPortalOpen(id,open){base.setPortalOpen(id,open);if(index)for(const part of parts)if(part.portalId===id&&!claimed.has(part.carrierId))index.change(idOf(part.id),{openFraction:open?1:0,bounds:open&&part.openBounds?part.openBounds:part.bounds});}
  return {install,prepareClaim,setPortalOpen,setFollowResolver(fn){followResolver=fn;},portalOpen:base.portalOpen,portalStates:base.portalStates,isClaimedCarrier:id=>claimed.has(id),isClaimedPart:id=>byPart.get(id)?.physical!==false&&claimed.has(byPart.get(id)?.carrierId),
    pinOriginal(id){const part=byPart.get(id);if(!part||part.portalId)throw Error('Static original source part required');const value=shape(part,false,true),key=part.id+'/closed';if(cache.get(key)!==value)throw Error('Original geometry exceeds source cache');value.pins=(value.pins||0)+1;return {shape:value,release(){value.pins--;}};},
    reserveSourceGeometry:reserve,
    configureRegional(reader,sources){if(regional)throw Error('Regional source queries already configured');const originalParts=new Map(reader.context().surfaces.map(s=>[s.nativePartId,s.sourceCarrierId]));if(sources.length!==originalParts.size||new Set(sources.map(s=>s.partRef.id)).size!==sources.length)throw Error('Complete unique regional source parts required');for(const s of sources){const p=byPart.get(s.partRef.id);if(!p||p.carrierId!==s.partRef.carrierId||p.portalId||originalParts.get(p.id)!==p.carrierId)throw Error('Unknown/moving regional source');const original=shape(p,false,true).triangles;if(original.length!==s.solidTriangles?.length||original.some((t,i)=>t.some((v,j)=>v.some((n,k)=>!Object.is(n,s.solidTriangles[i]?.[j]?.[k])))))throw Error('Regional query differs from original source geometry');}regional=createHybridSourceQueries({reader,sources,reserve,working});return regional;},
    regional:()=>regional,
    shape(id,open){const part=byPart.get(id);return part?shape(part,open):base.shape(id,open);},queryId:idOf,
    metrics(){const fallback=base.metrics();return {querySurfaces:parts.length+fallback.querySurfaces,sourceParts:parts.length,sourceCarriers:byCarrier.size,claimedCarriers:claimed.size,cachedShapes:cache.size+fallback.cachedShapes,cachedTriangles:triangles+fallback.cachedTriangles,peakShapes:peakShapes+fallback.peakShapes,peakTriangles:peakTriangles+fallback.peakTriangles,workingShapes,workingTriangles,workingLeases:workingLeases.size,peakWorkingShapes,peakWorkingTriangles,shapeBuilds:builds+fallback.shapeBuilds,maxSingleQueryTriangles,maxShapes:policy.shapes,maxTriangles:policy.triangles,thermalCellsAllocated:0,fuelAllocated:0};},
    dispose(){if(closed)return;regional?.dispose();for(const lease of workingLeases)lease.release();closed=true;base.dispose();cache.clear();triangles=0;index=null;}};
}
