import {Matrix4,Quaternion,Vector3} from '../../src/runtime/three.js';
import {prepareFurnishedData} from '../furnished-house/prepare-data.js';
import {DEFAULT_PROFILES} from '../furnished-house/scene.js';

const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const arrays=['levels','surfaces','openings','furnitureParts','items','stores','sourceMeshes','sourceHashes','runtimeAdaptations'];
const referenceKeys=new Set(['surfaceId','sourceSurfaceId','itemId','partId','fuelPartId','sourceMeshBinding','sourceWallBinding','supportSourceId','coreFuelId','openingId','stairFlightId','anchor','viewAnchor','actorId','ownerId','targetId','strike']);
const referenceArrays=new Set(['supportSurfaceIds','attachmentHostSurfaceIds','hostSurfaceIds','sourceMeshBindings','partIds','openingIds','materialIds','exitRoute','prototypeRouteIds','approach','toLantern','toSighting','toStrike','escape','toCover']);
const positions=new Set(['position','pivot','centre','center','sourcePosition','initialPosition','target','base','outside']);
const elevations=new Set(['floorY','wallTop','contactY','bottomY','topY','groundY']);
export const qualify=(instance,id)=>instance+'::'+id;

function unique(rows,label){const ids=new Set();for(const r of rows||[]){if(typeof r.id!=='string'||!r.id||ids.has(r.id))throw Error('Duplicate/missing '+label+' '+r.id);ids.add(r.id);}return ids;}
function identifiers(value,result=new Set()){
  if(Array.isArray(value)){for(const v of value)identifiers(v,result);return result;}
  if(!value||typeof value!=='object')return result;
  if(typeof value.id==='string')result.add(value.id);
  if(value.anchors)for(const id of Object.keys(value.anchors))result.add(id);
  for(const v of Object.values(value))identifiers(v,result);return result;
}
function placedSource(raw,spec){
  const source=prepareFurnishedData(structuredClone(raw)),ids=identifiers(source),prefix=id=>qualify(spec.id,id);
  for(const id of ids)if(id.includes('::'))throw Error('Source ID already qualified '+id);
  const matrix=new Matrix4().makeRotationY(spec.quarterTurns*Math.PI/2),rotation=new Quaternion().setFromRotationMatrix(matrix);matrix.setPosition(...spec.translation);
  const p=v=>{const out=new Vector3(...v).applyMatrix4(matrix).toArray();return out.map(n=>Math.abs(n)<1e-12?0:n);};
  const n=v=>new Vector3(...v).applyQuaternion(rotation).toArray().map(n=>Math.abs(n)<1e-12?0:n);
  const box=b=>{const corners=[];for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]])corners.push(p([x,y,z]));return {...b,min:[0,1,2].map(i=>Math.min(...corners.map(c=>c[i]))),max:[0,1,2].map(i=>Math.max(...corners.map(c=>c[i])))};};
  function walk(value,key=''){
    if(typeof value==='string'){const canonical=key==='id'||referenceKeys.has(key)||referenceArrays.has(key)||/(?:Id|Ids)$/.test(key)&&!/(?:asset|character|prefab|native)Ids?$/i.test(key);return canonical&&ids.has(value)?prefix(value):value;}
    if(typeof value==='number')return elevations.has(key)?value+spec.translation[1]:value;
    if(Array.isArray(value)){
      if(positions.has(key)&&point(value))return p(value);
      if(['normal','outward','direction','offset'].includes(key)&&point(value))return n(value);
      if(key==='quaternion'&&value.length===4)return rotation.clone().multiply(new Quaternion(...value)).toArray();
      if(['matrix','closedTransform'].includes(key)&&value.length===16)return matrix.clone().multiply(new Matrix4().fromArray(value)).toArray();
      if(key==='vertices')return value.map(v=>[...p(v.slice(0,3)),...n(v.slice(3,6)),...v.slice(6)]);
      if(['triangles','floorTriangles'].includes(key))return value.map(t=>Array.isArray(t)?t.map(v=>p(v)):walk(t));
      if(key==='polygon')return value.map(v=>v.length===2?(()=>{const q=p([v[0],0,v[1]]);return [q[0],q[2]];})():p(v));
      if(key==='prototypeRoute')return value.map(p);
      return value.map(v=>walk(v,key));
    }
    if(!value||typeof value!=='object')return value;
    if(point(value.min)&&point(value.max))return box(value);
    const result={};for(const [k,v]of Object.entries(value))result[key==='anchors'?prefix(k):k]=walk(v,k);
    if(typeof value.id==='string'){result.nativeId=value.id;result.instanceId=spec.id;}
    return result;
  }
  const data=walk(source);
  for(const collection of ['levels','surfaces','openings','furnitureParts','items','stores','sourceMeshes'])for(const row of data[collection]||[]){row.instanceId=spec.id;row.nativeId=row.id.slice(spec.id.length+2);}
  data.buildingId=spec.id;
  return {id:spec.id,kind:spec.kind,prefabId:source.prefabId,translation:[...spec.translation],quarterTurns:spec.quarterTurns,data};
}
function validateSource(data,sourcePath){
  const surfaces=unique(data.surfaces,'surface'),items=unique(data.items,'item'),parts=unique(data.furnitureParts,'part'),meshes=unique(data.sourceMeshes,'mesh');unique(data.openings,'opening');
  for(const s of data.surfaces)for(const id of [...(s.supportSurfaceIds||[]),...(s.attachmentHostSurfaceIds||[]),...(s.supportBinding?.hostSurfaceIds||[])])if(!surfaces.has(id))throw Error('Dangling surface support '+id);
  for(const o of data.openings||[])if(!surfaces.has(o.surfaceId))throw Error('Dangling opening '+o.surfaceId);
  for(const p of data.furnitureParts||[]){if(!items.has(p.itemId))throw Error('Dangling part owner '+p.itemId);if(p.fuelAmount>0&&!DEFAULT_PROFILES[p.fuelClass]||p.finish?.amount>0&&!DEFAULT_PROFILES[p.finish.fuelClass==='varnish'?'lacquer':p.finish.fuelClass])throw Error('Finite fuel/finish needs declared fuelClass: '+p.id+' ('+sourcePath+')');if(p.sourceMeshBinding&&!meshes.has(p.sourceMeshBinding))throw Error('Dangling mesh '+p.sourceMeshBinding);for(const id of p.supportSurfaceIds||[])if(!surfaces.has(id))throw Error('Dangling part support '+id);}
  for(const i of data.items||[]){for(const id of i.partIds||[])if(!parts.has(id))throw Error('Dangling item part '+id);for(const id of [...(i.supportSurfaceIds||[]),...(i.supportContacts||[]).flatMap(c=>c.supportSurfaceIds||[])])if(!surfaces.has(id))throw Error('Dangling item support '+id);}
}
export function composeSandbox(manifest,sources){
  if(manifest?.version!==1||manifest.prefabId!=='bell-and-alder-sandbox-v1')throw Error('Expected sandbox placement manifest v1');
  unique(manifest.instances,'instance');if(manifest.instances.length!==3||manifest.instances.filter(i=>i.kind==='closing').length!==1||manifest.instances.filter(i=>i.kind==='furnished').length!==1||manifest.instances.filter(i=>i.kind==='yard').length!==1)throw Error('First slice requires one shop, one furnished house and one yard');
  if(!point(manifest.bounds?.min)||!point(manifest.bounds?.max)||manifest.bounds.min.some((v,i)=>v>=manifest.bounds.max[i]))throw Error('Ordered sandbox bounds required');
  if(manifest.groundY!==undefined&&!Number.isFinite(manifest.groundY))throw Error('Finite terrain elevation required');
  const instances=manifest.instances.map(spec=>{
    if(spec.id.includes('::')||'scale' in spec||!point(spec.translation)||!Number.isInteger(spec.quarterTurns)||spec.quarterTurns<0||spec.quarterTurns>3)throw Error('One rigid quarter-turn placement required '+spec.id);
    const raw=sources instanceof Map?sources.get(spec.source):sources[spec.source];if(raw?.version!==1||!Array.isArray(raw.surfaces))throw Error('Missing physical source '+spec.source);
    const instance=placedSource(raw,spec);instance.data.gridOrigin=[0,0,0];instance.data.thermalCell=[.5,1.06,.5];validateSource(instance.data,spec.source);return instance;
  });
  const control=instances.find(i=>i.id===manifest.controlInstance);if(control?.kind!=='closing')throw Error('Closing control instance required');
  const data={version:1,prefabId:manifest.prefabId,runtimeAdapterVersion:1,thermalCell:[.5,1.06,.5],gridOrigin:[0,0,0],groundY:manifest.groundY??-.12,stairFlights:[],render:{materials:[],geometry:[]}};
  for(const key of arrays)data[key]=instances.flatMap(i=>i.data[key]||[]);
  for(const key of ['materials','geometry'])data.render[key]=instances.flatMap(i=>i.data.render?.[key]||[]);
  for(const instance of instances){
    const spec=manifest.instances.find(s=>s.id===instance.id),surfaces=new Map(instance.data.surfaces.map(s=>[s.id,s])),assigned=new Set();
    unique(spec.stairFlights,'flight');for(const flight of spec.stairFlights||[]){
      if(flight.id.includes('::')||!flight.treadSourceIds?.length)throw Error('Explicit local flight required '+instance.id);
      const id=qualify(instance.id,flight.id),treadSourceIds=flight.treadSourceIds.map(raw=>qualify(instance.id,raw));
      for(const sourceId of treadSourceIds){const s=surfaces.get(sourceId);if(s?.supportType!=='stair-tread'||assigned.has(sourceId))throw Error('Unassigned/duplicate stair source '+sourceId);assigned.add(sourceId);s.stairFlightId=id;}
      const ends={};for(const key of ['lower','upper']){const e=flight[key];if(!Number.isFinite(e?.elevation)||!e.surfaceIds?.length)throw Error('Measured landing required '+id);const surfaceIds=e.surfaceIds.map(raw=>qualify(instance.id,raw));for(const sourceId of surfaceIds)if(!surfaces.has(sourceId))throw Error('Missing own-instance landing '+sourceId);ends[key]={elevation:e.elevation+instance.translation[1],surfaceIds};}
      if(ends.upper.elevation<=ends.lower.elevation)throw Error('Ordered flight elevations required '+id);
      data.stairFlights.push({id,instanceId:instance.id,treadSourceIds,...ends});
    }
    for(const s of surfaces.values())if(s.supportType==='stair-tread'&&!assigned.has(s.id))throw Error('Sandbox tread has no explicit flight '+s.id);
  }
  data.closingTime=structuredClone(control.data.closingTime);if(!data.closingTime)throw Error('Closing scene control metadata required');
  const c=data.closingTime;c.bounds=structuredClone(manifest.bounds);c.camera=structuredClone(manifest.camera||c.camera);c.replays={};
  for(const [id,a]of Object.entries(manifest.anchors||{})){if(c.anchors[id])throw Error('Duplicate world anchor '+id);c.anchors[id]=structuredClone(a);}
  const overrides=new Map((manifest.doors||[]).map(d=>[d.id,d]));unique(manifest.doors,'door override');
  for(const instance of instances.filter(i=>i!==control))for(const o of instance.data.openings||[])if(o.kind==='door'){
    const override=overrides.get(o.id),b=o.bounds||instance.data.surfaces.find(s=>s.id===o.surfaceId)?.bounds;
    const position=override?.position||(b?b.min.map((v,i)=>(v+b.max[i])/2):o.pivot);if(!point(position))throw Error('Measured door anchor required '+o.id);
    const anchor=o.id+'::interaction';c.anchors[anchor]={position};c.doors.push({id:o.id,anchor,openingIds:override?.openingIds||[o.id],label:override?.label||'House door'});overrides.delete(o.id);
  }
  if(overrides.size)throw Error('Door override must identify a physical door opening '+[...overrides.keys()]);
  c.pickups=[...(c.pickups||[]),...structuredClone(manifest.pickups||[])];
  data.sandbox={version:1,controlInstance:control.id,instances:instances.map(({data,...identity})=>identity),provenance:structuredClone(manifest.provenance||{})};
  return {data,instances};
}
