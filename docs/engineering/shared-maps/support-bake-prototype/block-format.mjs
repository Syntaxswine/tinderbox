import {createHash} from 'node:crypto';

export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value,(_key,item)=>typeof item==='number'&&Object.is(item,-0)?{negativeZero:true}:item)).digest('hex');
const geometryFields=['id','sourceCarrierId','sourceSurfaceId','kind','normal','closedNormal','thickness','bounds','triangles','solidTriangles','closedTriangles','closedSolidTriangles','position','intact','openFraction','queryOnly','supportType','stairFlightId','supportSurfaceIds','attachmentHostSurfaceIds','supportBinding','connectionTolerance'];
const select=(value,fields)=>Object.fromEntries(fields.map(k=>[k,value[k]===undefined?null:value[k]]));
export const encodeResult=value=>value===undefined?{type:'undefined'}:typeof value==='boolean'?{type:'boolean',value}:(()=>{throw Error('Unapproved result type');})();
export const decodeResult=r=>r.type==='undefined'?undefined:r.value;
export function makeIdentity(context,base) {
  const {key,owners,active,model}=context;
  const ownerStates=owners.map(id=>{
    const list=active.get(id);
    const carrier=model.carrierById.get(id);
    return {id,state:list?'active':'cold',
      orderedIds:list?list.map(b=>b.id):['cold:'+id],
      geometryPoseHash:hash({carrier,parts:carrier.parts.map(n=>model.parts[n]),
        activeGeometry:list?list.map(b=>select(b,geometryFields)):null})};
  });
  // Cold shape arrays are never expanded or stored by this identity function.
  const descriptor={format:1,base,key,owners:[...owners],ownerStates,
    grid:{origin:[...context.scene.origin],pitch:[...context.scene.pitch]},
    portalStates:context.querySource.portalStates?.()??null};
  return {descriptor,signature:hash(descriptor)};
}
export function validateEntry(entry,identity) {
  if(!entry||!entry.descriptor||entry.signature!==identity.signature||hash(entry.descriptor)!==identity.signature)return null;
  if(JSON.stringify(entry.descriptor)!==JSON.stringify(identity.descriptor))return null;
  if(!entry.result||!['undefined','boolean'].includes(entry.result.type)||
    entry.result.type==='boolean'&&typeof entry.result.value!=='boolean'||
    entry.result.type==='undefined'&&Object.keys(entry.result).length!==1)return null;
  const allowed=new Set(identity.descriptor.ownerStates.flatMap(s=>s.orderedIds)),seen=new Set();
  if(!Array.isArray(entry.edges))return null;
  for(const edge of entry.edges){
    if(!Array.isArray(edge)||edge.length!==2||!edge.every(id=>typeof id==='string'&&allowed.has(id)))return null;
    const key=JSON.stringify(edge);if(seen.has(key))return null;seen.add(key);
  }
  if(entry.blockSha256!==hash({signature:entry.signature,edges:entry.edges,result:entry.result}))return null;
  return {edges:entry.edges,result:decodeResult(entry.result)};
}
export function makeHooks({base,keys,mode,entries=[],onContext=()=>{}}) {
  const table=new Map(entries.map(e=>[e.signature,e])),recorded=new Map(),stats={hits:0,misses:0,rejected:0,builds:0,identityMs:0,lookupMs:0};
  const identities=new Map();
  function identity(context){const at=performance.now(),value=makeIdentity(context,base);stats.identityMs+=performance.now()-at;identities.set(value.signature,value);onContext(context,value);return value;}
  return {stats,identities,recorded,
    read(context){
      if(!keys.has(context.key))return null;
      const id=identity(context);if(mode==='record')return null;
      const at=performance.now(),entry=table.get(id.signature),valid=validateEntry(entry,id);stats.lookupMs+=performance.now()-at;
      if(!valid){stats.misses++;if(entry)stats.rejected++;return null;}
      if(!valid.edges.every(edge=>edge.every(node=>context.links.has(node)))){stats.rejected++;return null;}
      stats.hits++;return valid;
    },
    record(context,{edges,result}){
      if(!keys.has(context.key))return;
      stats.builds++;
      if(mode!=='record')return;
      const id=makeIdentity(context,base),encoded=encodeResult(result);
      const entry={...id,edges:edges.map(e=>[...e]),result:encoded,
        blockSha256:hash({signature:id.signature,edges,result:encoded})};
      recorded.set(id.signature,entry);
    }
  };
}
