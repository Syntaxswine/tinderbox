// Isolated source/receipt contact mapper. No compilation, stock or world owner.
import {createOriginalSupportPorts,originalMaterialComponents} from '../simulation/original-support-ports.js';
import {originalContactPatches} from './cornice-wall-contact-pilot.js';
import {EPS,bounds,clipTriangle,cross,sub,dot,segmentTriangle} from '../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../workbenches/furnished-house/support.js';
const issued=new WeakMap(),freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite),within=(p,b)=>b&&vector(b.min)&&vector(b.max)&&p.every((v,i)=>v>=b.min[i]&&v<=b.max[i]),on=(p,t)=>segmentTriangle(p,p,t)!==null;
// Same original-normal operation order as the core and independent source proof.
const normal=t=>{const n=cross(sub(t[1],t[0]),sub(t[2],t[0])),l=Math.hypot(...n);return n.map(v=>v/l);},shape=ts=>({triangles:ts,solidTriangles:ts,bounds:bounds(ts.flat()),normal:normal(ts[0]),kind:'wall',thickness:0});
function reject(id,stage,reason,detail={}){const e=Error('Original contact '+id+': '+reason);e.diagnostic=freeze({selectorId:id,stage,reason,...detail});throw e;}

export function prepareOriginalContacts(input){
  const captured=freeze(structuredClone(input)),{sourceRevision,grid,parts,surfaces,contacts}=captured;
  if(!/^[a-f0-9]{64}$/.test(sourceRevision)||!vector(grid?.origin)||!vector(grid?.pitch)||grid.pitch.some(v=>v<=0)||!Array.isArray(parts)||!Array.isArray(surfaces)||!Array.isArray(contacts))throw Error('Pinned original contact sources/grid required');
  const data={closed:false,sourceRevision,grid,parts:new Map(),components:new Map(),proofs:new Map(),bindings:new Set()},ids=new Set(),rejected=[];
  for(const p of parts){if(!p.id||!p.ownerId||data.parts.has(p.id)||!Number.isSafeInteger(p.globalPartIndex)||p.globalPartIndex<0||!p.role)throw Error('Unique original part/index/role required');data.parts.set(p.id,p);data.components.set(p.id,originalMaterialComponents(p.triangles));}
  const sourceIds=new Set();for(const s of surfaces){const p=data.parts.get(s.nativePartId);if(!p||s.sourceCarrierId!==p.ownerId||!s.id?.startsWith(p.ownerId+'/part/'+p.globalPartIndex+'/')||sourceIds.has(s.id)||!s.sourceMeshBindings?.includes(p.id))throw Error('Original source definition/part/index ownership required');sourceIds.add(s.id);}
  for(const record of contacts){
    if(!record.id||ids.has(record.id))throw Error('Unique original selector IDs required');ids.add(record.id);
    try{
      const id=record.id,p=record.point;if(!record.selector)reject(id,'source','shared-selector-required');if(!vector(p)||record.direction!=='parent-to-child'||!within(p,record.selector)||!record.parent||!record.child||record.parent.partId===record.child.partId)reject(id,'source','invalid-original-contact');
      const ends={};
      for(const side of ['parent','child']){const end=record[side],part=data.parts.get(end.partId),t=part?.triangles[end.primitive];
        if(!part||part.ownerId!==end.ownerId||part.globalPartIndex!==end.globalPartIndex||part.role!==end.role||!data.components.get(part.id)[end.component]?.primitives.includes(end.primitive))reject(id,'source','original-endpoint-identity',{side});
        if(part.sourceRange||part.originalRange||end.sourceRange||part.originalPrimitiveOffset||end.originalPrimitiveOffset)reject(id,'source','source-range-not-supported',{side});
        if(!t||!on(p,t)||!within(p,end.selector)||!vector(end.normal)||!normal(t).every((v,i)=>v===end.normal[i]))reject(id,'source','original-face-point-normal-selector',{side});
        const candidates=[];
        for(const s of surfaces.filter(s=>s.nativePartId===part.id&&s.sourceCarrierId===part.ownerId)){
          if(s.triangles.some(q=>same(q,t))&&s.triangles.some(q=>on(p,q)))candidates.push({source:s,channel:'surface',projection:[...p]});
          else if(['wall','roof','window'].includes(s.kind)&&s.thickness>0&&!s.solidTriangles?.length&&Math.abs(dot(normal(t),s.normal))===1){
            const d=dot(sub(p,s.triangles[0][0]),s.normal),projection=p.map((v,i)=>v-d*s.normal[i]);
            if(Math.abs(Math.abs(d)-s.thickness/2)<=EPS&&s.triangles.some(q=>on(projection,q)))candidates.push({source:s,channel:'solid',projection});
          }
        }
        if(candidates.length!==1)reject(id,'source','unrepresentable-original-source-face',{side,candidates:candidates.map(c=>c.source.id)});
        const {source:s,channel,projection}=candidates[0],b=bounds(s.triangles.flat()),lo=b.min.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS)),hi=b.max.map((v,i)=>v-b.min[i]<EPS?lo[i]:Math.ceil((v-grid.origin[i])/grid.pitch[i]-EPS)-1),cell=projection.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS));
        if(cell.some((v,i)=>v<lo[i]||v>hi[i]))reject(id,'source','source-projection-outside-original-loop',{side});
        ends[side]={...end,sourceId:s.id,channel,projection,sourceCell:cell,sourceSpan:{min:lo,max:hi}};
      }
      const originals=['parent','child'].map(side=>data.parts.get(ends[side].partId).triangles[ends[side].primitive]),patches=originals.map((t,i)=>clipTriangle(t,ends[i===0?'parent':'child'].selector).flatMap(t=>clipTriangle(t,record.selector)));
      if(patches.some(ts=>!ts.length)||!supportSurfacesTouch(...originals.map(t=>shape([t])))||!supportSurfacesTouch(...patches.map(shape)))reject(id,'source','original-contact-predicate-rejected');
      const proof=freeze({version:1,id,relationshipId:record.relationshipId,kind:'proposed-original-contact',point:[...p],direction:record.direction,selector:record.selector,historicalVolume:record.historicalVolume??null,sourceRevision,grid,ends});
      issued.set(proof,{data,proof});data.proofs.set(id,proof);
    }catch(e){if(!e.diagnostic)throw e;rejected.push(e.diagnostic);}
  }
  const report=freeze({sourceRevision,prepared:[...data.proofs.values()],rejected,nativeRecordsBound:0,counts:{uniqueParts:data.parts.size,uniqueSourceDefinitions:surfaces.length,selectorProofs:data.proofs.size,fixedPorts:data.proofs.size*2,ownedDictionaryCopies:1,perProofGeometryCopies:0,originalTriangles:parts.reduce((n,p)=>n+p.triangles.length,0)}});
  return Object.freeze({proof(id){if(data.closed)reject(id,'source','source-preparation-disposed');const proof=data.proofs.get(id);if(!proof)reject(id,'source','selector-unsupported',{rejection:rejected.find(r=>r.selectorId===id)??null});return proof;},report:()=>report,dispose(){if(data.closed)return;data.closed=true;for(const b of [...data.bindings])b.dispose();data.bindings.clear();data.parts.clear();data.components.clear();data.proofs.clear();}});
}

export function bindOriginalContact({proof,reader,slices}){
  const issuedProof=issued.get(proof);if(!issuedProof||issuedProof.data.closed)reject(proof?.id??null,'binding','validated-original-proof-required');
  const {data}=issuedProof,captured=[...slices],context=freeze(structuredClone(reader.context()));
  if(context.sourceRevision!==proof.sourceRevision||!same(context.grid,proof.grid)||!Number.isSafeInteger(context.generation)||context.generation<0)reject(proof.id,'binding','source-revision-grid-generation-mismatch');
  let closed=false,api,core;const fragments=[];
  function dispose(){if(closed)return;closed=true;core?.dispose();captured.length=0;fragments.length=0;data.bindings.delete(api);}
  function inventory(){
    if(closed||data.closed){dispose();reject(proof.id,'lifecycle','binding-disposed');}
    let now;try{now=reader.context();}catch(e){dispose();reject(proof.id,'lifecycle','receipt-context-unavailable',{message:e.message});}if(now.generation!==context.generation||now.sourceRevision!==context.sourceRevision||!same(now.grid,context.grid)){dispose();reject(proof.id,'lifecycle','stale-source-generation');}
    let payloads;try{payloads=captured.map(s=>reader.inspect(s));}catch(e){dispose();reject(proof.id,'receipt','receipt-authentication-failed',{message:e.message});}const entries=new Map();
    for(const p of payloads){if(p.epoch!==context.generation||p.sourceRevision!==context.sourceRevision){dispose();reject(proof.id,'receipt','foreign-source-generation');}for(const e of p.entries){if(e.record.sourceCarrierId!==p.ownerId||entries.has(e.record.id)){dispose();reject(proof.id,'receipt','duplicate-or-foreign-native-record');}entries.set(e.record.id,{...e,ownerId:p.ownerId});}}
    return entries;
  }
  const entries=inventory(),ends={};
  for(const side of ['parent','child']){const end=proof.ends[side],matches=[...entries.values()].filter(e=>e.ownerId===end.ownerId&&e.record.sourceCarrierId===end.ownerId&&e.record.nativePartId===end.partId&&e.record.sourceSurfaceId===end.sourceId&&same(e.cell,end.sourceCell));
    if(matches.length!==1)reject(proof.id,'binding','exact-original-record-missing-or-ambiguous',{side,ownerId:end.ownerId,partId:end.partId,sourceSurfaceId:end.sourceId,sourceCell:end.sourceCell});
    const entry=matches[0],ts=end.channel==='solid'?entry.record.solidTriangles:entry.record.triangles,original=data.parts.get(end.partId).triangles[end.primitive];if(!ts?.length)reject(proof.id,'binding','original-physical-channel-missing',{side});
    const mapped=originalContactPatches(ts,original).flatMap(p=>clipTriangle(p.triangle,end.selector).flatMap(t=>clipTriangle(t,proof.selector)).map(triangle=>({nativePrimitive:p.nativePrimitive,triangle}))),triangles=mapped.map(p=>p.triangle);
    if(!triangles.length||!triangles.some(t=>on(proof.point,t)))reject(proof.id,'binding','original-contact-face-missing',{side});
    ends[side]={...end,nativeRecordId:entry.record.id,cell:[...entry.cell],nativePrimitives:[...new Set(mapped.map(p=>p.nativePrimitive))]};
    fragments.push({id:entry.record.id+'/'+proof.id+'/'+side,recordId:entry.record.id,partId:end.partId,ownerId:end.ownerId,component:end.component,mode:'native',cell:[...entry.cell],primitives:[end.primitive],triangles});
  }
  if(!supportSurfacesTouch(...fragments.map(f=>shape(f.triangles))))reject(proof.id,'binding','mapped-native-contact-rejected');
  const endpoint=side=>({partId:ends[side].partId,point:proof.point,primitives:[ends[side].primitive],nativeRecordId:ends[side].nativeRecordId,cell:ends[side].cell});
  core=createOriginalSupportPorts({parts:[data.parts.get(ends.parent.partId),data.parts.get(ends.child.partId)],bonds:[{id:proof.id,kind:'bearing-face',direction:proof.direction,parent:endpoint('parent'),child:endpoint('child')}],anchors:[]});
  const binding=freeze({selectorId:proof.id,relationshipId:proof.relationshipId,generation:context.generation,sourceRevision:context.sourceRevision,point:proof.point,direction:proof.direction,anchors:[],ends});
  api=Object.freeze({binding(){inventory();return binding;},evaluate({revision,retireRecords=[]}){const all=inventory();if(!Array.isArray(retireRecords)||new Set(retireRecords).size!==retireRecords.length||retireRecords.some(id=>!all.has(id)))reject(proof.id,'retirement','unknown-or-duplicate-native-record');const retired=new Set(retireRecords),result=core.evaluate({revision,fragments:fragments.filter(f=>!retired.has(f.recordId))});return freeze({selectorId:proof.id,generation:context.generation,revision,live:result.ports[0].live,retireRecords:[...retireRecords],supportedIds:result.supportedIds});},reset:dispose,dispose,diagnostics:()=>({selectorId:proof.id,closed,generation:context.generation,retainedFragments:fragments.length,retainedSlices:captured.length})});data.bindings.add(api);return api;
}
