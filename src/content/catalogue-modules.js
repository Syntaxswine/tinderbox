import {preparePhysicalInstance,qualify} from '../../workbenches/bell-and-alder-sandbox/compose.js';
import {BELL_AND_ALDER} from './bell-and-alder-layout.js';

const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const arrays=['levels','surfaces','openings','furnitureParts','items','stores','sourceMeshes','sourceHashes','runtimeAdaptations'];
const unique=(rows,label)=>{const ids=new Set();for(const row of rows||[]){if(typeof row.id!=='string'||!row.id||ids.has(row.id))throw Error('Duplicate/missing '+label+' '+row.id);ids.add(row.id);}return ids;};

export function compileCatalogueModules(manifest,sources,host){
  if(manifest?.version!==1||manifest.prefabId!=='catalogue-modular-v1'||host.id!=='neighborhood')throw Error('Catalogue Street module manifest required');
  unique(manifest.instances,'module');
  const shop=manifest.instances.find(i=>i.id===BELL_AND_ALDER.id),house=manifest.instances.find(i=>i.id==='hopkins-fifteen'),lot=host.buildings.find(b=>b.id==='hopkins-fifteen');
  if(!shop||!house||manifest.instances.length!==2||!lot)throw Error('Upgrade exactly the existing Bell and Hopkins 15 slots');
  if(JSON.stringify(shop.translation)!=='[36,0,9]'||shop.quarterTurns!==0||JSON.stringify(house.translation)!==JSON.stringify([lot.x,0,lot.y])||house.quarterTurns!==(4-lot.quarterTurns)%4)throw Error('Module placement must match the original host lots');
  const instances=manifest.instances.map(spec=>{
    if(!point(spec.translation)||spec.id.includes('::')||'scale' in spec||!Number.isInteger(spec.quarterTurns)||spec.quarterTurns<0||spec.quarterTurns>3)throw Error('Native rigid placement required '+spec.id);
    const raw=sources instanceof Map?sources.get(spec.source):sources[spec.source];if(raw?.version!==1)throw Error('Missing module physical source '+spec.source);
    return {...preparePhysicalInstance(raw,spec),...(spec.componentBounds?{componentBounds:structuredClone(spec.componentBounds)}:{}),omittedSourceIds:[...(spec.omittedSourceIds||[])],recomposedSourceIds:[...(spec.recomposedSourceIds||[])]};
  });
  const data={version:1,prefabId:manifest.prefabId,runtimeAdapterVersion:1,thermalCell:[.5,1.06,.5],gridOrigin:[0,0,0],groundY:0,stairFlights:[],render:{materials:[],geometry:[]}};
  for(const key of arrays)data[key]=instances.flatMap(i=>i.data[key]||[]);
  for(const key of ['materials','geometry'])data.render[key]=instances.flatMap(i=>i.data.render?.[key]||[]);
  const doors=[];
  for(const instance of instances){
    const spec=manifest.instances.find(i=>i.id===instance.id),surfaces=new Map(instance.data.surfaces.map(s=>[s.id,s])),assigned=new Set();unique(spec.stairFlights,'flight');
    for(const flight of spec.stairFlights||[]){
      const id=qualify(instance.id,flight.id);if(!flight.treadSourceIds?.length)throw Error('Explicit stair treads required '+id);
      const treadSourceIds=flight.treadSourceIds.map(raw=>qualify(instance.id,raw));
      for(const sid of treadSourceIds){const s=surfaces.get(sid);if(s?.supportType!=='stair-tread'||assigned.has(sid))throw Error('Missing/duplicate own-instance tread '+sid);s.stairFlightId=id;assigned.add(sid);}
      const ends={};for(const end of ['lower','upper']){const e=flight[end];if(!Number.isFinite(e?.elevation)||!e.surfaceIds?.length)throw Error('Measured stair landing required '+id);const surfaceIds=e.surfaceIds.map(raw=>qualify(instance.id,raw));if(surfaceIds.some(sid=>!surfaces.has(sid)))throw Error('Missing own-instance stair landing '+id);ends[end]={elevation:e.elevation+instance.translation[1],surfaceIds};}
      if(ends.upper.elevation<=ends.lower.elevation)throw Error('Ordered stair elevations required '+id);
      data.stairFlights.push({id,instanceId:instance.id,treadSourceIds,...ends});
    }
    if([...surfaces.values()].some(s=>s.supportType==='stair-tread'&&!assigned.has(s.id)))throw Error('Unbound module stair flight '+instance.id);
    if(instance.kind==='closing')for(const door of instance.data.closingTime?.doors||[]){const anchor=instance.data.closingTime.anchors[door.anchor];doors.push({...door,id:door.nativeId||door.id.slice(instance.id.length+2),physicalId:door.id,position:[...anchor.position],label:door.label||'Shop doors',instanceId:instance.id});}
    else for(const opening of instance.data.openings||[])if(opening.kind==='door'){
      const override=(manifest.doors||[]).find(d=>d.id===opening.id),b=opening.bounds||surfaces.get(opening.surfaceId)?.bounds,position=override?.position||b?.min.map((v,i)=>(v+b.max[i])/2)||opening.pivot;
      if(!point(position))throw Error('Measured door interaction required '+opening.id);
      doors.push({id:opening.id,openingIds:override?.openingIds||[opening.id],position,label:override?.label||'House door',instanceId:instance.id});
    }
  }
  const closing=instances.find(i=>i.id===BELL_AND_ALDER.id).data.closingTime;
  const lantern=closing?.lantern?{...structuredClone(closing.lantern),id:closing.lantern.nativeId||closing.lantern.id.slice(BELL_AND_ALDER.id.length+2),physicalId:closing.lantern.id,position:[...closing.anchors[closing.lantern.anchor].position]}:null;
  const resident=closing?.resident||closing?.actors?.find(a=>a.role==='resident');
  data.closingTime={smokeVents:structuredClone(closing?.smokeVents||[])};
  data.catalogueModules={version:1,instances:instances.map(({data,...identity})=>identity),doors,lantern,...(resident?{resident:{...structuredClone(resident),id:'bell-and-alder:resident',position:[...closing.anchors[resident.anchor].position],anchors:structuredClone(closing.anchors)}}:{}),provenance:structuredClone(manifest.provenance||{})};
  const masks={buildingIds:['hopkins-fifteen'],shopIds:[BELL_AND_ALDER.id],moduleIds:host.modules.filter(m=>m.id.startsWith(BELL_AND_ALDER.id+':')).map(m=>m.id)};
  return {data,instances,masks};
}

export function legacyModuleOwner(object,masks){return masks.buildingIds.includes(object.buildingId)||masks.shopIds.includes(object.shopId)||masks.moduleIds.includes(object.moduleId);}
