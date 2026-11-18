// Disabled one-pair contact alternative. No compilation, anchors or publication.
import {createOriginalSupportPorts,originalMaterialComponents} from '../simulation/original-support-ports.js';
import {EPS,bounds,triangleArea,cross,sub,dot,unit,clipPolygon,clipTriangle,segmentTriangle} from '../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../workbenches/furnished-house/support.js';
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;};
export const CORNICE_WALL_CONTACT=freeze({relationshipId:'fa9dc4a25193e94ce7b5793e',regionId:'19428b0ef95337ce4e9f64a6',point:[33.5,8.330000001490117,25.92000000178814],direction:'parent-to-child',parent:{partId:'main/0/cell-3-1/1',ownerId:'new-york::carrier/main/0/cell-3-1/1',globalPartIndex:6304,primitive:10,component:0,channel:'solid',role:'exterior-wall'},child:{partId:'edge-0/cornice-1',ownerId:'new-york::carrier/edge-0/cornice-1',globalPartIndex:2406,primitive:0,component:0,channel:'surface',role:'timber-fitting'}});
const on=(p,t)=>segmentTriangle(p,p,t)!==null,shape=ts=>({triangles:ts,solidTriangles:ts,bounds:bounds(ts.flat()),normal:unit(cross(sub(ts[0][1],ts[0][0]),sub(ts[0][2],ts[0][0]))),kind:'wall',thickness:0}),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validatedProofs=new WeakMap();

// Surface-only intersection with ONE named original triangle. No cut cap or
// unselected exterior face acquires that triangle's original identity.
export function originalContactPatches(triangles,original){
  const a=original[0],u=sub(original[1],a),v=sub(original[2],a),n=unit(cross(u,v)),uu=dot(u,u),uv=dot(u,v),vv=dot(v,v),den=uu*vv-uv*uv,out=[];
  for(const [nativePrimitive,t]of triangles.entries()){
    if(t.some(p=>Math.abs(dot(sub(p,a),n))>EPS))continue;
    let poly=t.map(p=>{const s=sub(p,a),x=(dot(s,u)*vv-dot(s,v)*uv)/den,y=(dot(s,v)*uu-dot(s,u)*uv)/den;return [x,y,x+y,...p];});
    poly=clipPolygon(poly,0,0,true);poly=clipPolygon(poly,1,0,true);poly=clipPolygon(poly,2,1,false);poly=poly.map(p=>p.slice(3));
    for(let i=1;i<poly.length-1;i++){const triangle=[poly[0],poly[i],poly[i+1]];if(triangleArea(triangle)>EPS)out.push({nativePrimitive,triangle});}
  }return out;
}

export function proveCorniceWallContact({parts,surfaces,region,grid}){
  // Capture authoritative original input before validation. Issued proofs and
  // their source definitions cannot be retargeted by later caller mutation.
  const captured=structuredClone({parts,surfaces,region,grid});({parts,surfaces,region,grid}=captured);
  const c=CORNICE_WALL_CONTACT,p=c.point;
  if(region.id!==c.regionId||!same(grid,{origin:[0,0,0],pitch:[.5,1.06,.5]})||parts.length!==2)throw Error('Exact one-pair original input required');
  const ends={};
  for(const side of ['parent','child']){const spec=c[side],part=parts.find(p=>p.id===spec.partId),selector=region[side+'Bounds'];
    if(!part||part.ownerId!==spec.ownerId||part.role!==spec.role||part.globalPartIndex!==spec.globalPartIndex)throw Error('Fixed original owner/part/index/role required');
    const components=originalMaterialComponents(part.triangles),t=part.triangles[spec.primitive];
    if(!components[spec.component]?.closed||!components[spec.component].primitives.includes(spec.primitive)||!on(p,t)||p.some((v,i)=>v<selector.min[i]||v>selector.max[i]))throw Error('Original component/face/selector contact proof failed');
    let candidates,projected;
    if(side==='parent'){
      candidates=surfaces.filter(s=>s.nativePartId===part.id&&s.sourceCarrierId===part.ownerId&&s.kind==='wall'&&s.thickness>0&&!s.solidTriangles?.length).filter(s=>Math.abs(dot(sub(p,s.triangles[0][0]),s.normal)+s.thickness/2)<=EPS);
      if(candidates.length!==1)throw Error('One measured original wall projection required');const s=candidates[0],d=dot(sub(p,s.triangles[0][0]),s.normal);projected=p.map((v,i)=>v-d*s.normal[i]);
    }else{
      candidates=surfaces.filter(s=>s.nativePartId===part.id&&s.sourceCarrierId===part.ownerId&&s.triangles.some(v=>same(v,t))&&s.triangles.some(v=>on(p,v)));projected=[...p];
    }
    if(candidates.length!==1||!candidates[0].triangles.some(t=>on(projected,t)))throw Error('Exact original source facet/projection required');
    const source=candidates[0],b=bounds(source.triangles.flat()),lo=b.min.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS)),hi=b.max.map((v,i)=>v-b.min[i]<EPS?lo[i]:Math.ceil((v-grid.origin[i])/grid.pitch[i]-EPS)-1),cell=projected.map((v,i)=>Math.floor((v-grid.origin[i])/grid.pitch[i]+EPS));
    if(cell.some((v,i)=>v<lo[i]||v>hi[i]))throw Error('Projected contact outside original source loop');
    ends[side]={...spec,sourceId:source.id,projection:projected,sourceCell:cell,regionMin:cell.map((v,i)=>Math.floor(v/[4,1,4][i])*[4,1,4][i]),sourceSpan:{min:lo,max:hi},selector,originalNormal:unit(cross(sub(t[1],t[0]),sub(t[2],t[0])))};
  }
  const a=parts.find(p=>p.id===c.parent.partId).triangles[c.parent.primitive],b=parts.find(p=>p.id===c.child.partId).triangles[c.child.primitive],ca=clipTriangle(a,ends.parent.selector),cb=clipTriangle(b,ends.child.selector);
  if(!supportSurfacesTouch(shape([a]),shape([b]))||!ca.length||!cb.length||!supportSurfacesTouch(shape(ca),shape(cb)))throw Error('Existing native original contact predicate rejected pair');
  const proof=freeze({version:1,interpretation:'proposed-fixed-original-contact',relationshipId:c.relationshipId,regionId:c.regionId,point:[...p],direction:c.direction,kind:'bearing-face',grid:structuredClone(grid),ends,sourceChecks:{originalContact:true,selectorClippedContact:true},historicalVolumeEvidenceChanged:false});
  validatedProofs.set(proof,freeze(captured));return proof;
}

export function bindCorniceWallContact({parts,proof,reader,slices}){
  const validated=validatedProofs.get(proof);
  if(!validated||!same(parts,validated.parts))throw Error('A validated original contact proof with matching original parts is required; revalidate serialized metadata from original source definitions');
  parts=validated.parts;
  const c=CORNICE_WALL_CONTACT,context=reader.context();
  if(proof.interpretation!=='proposed-fixed-original-contact'||!same(proof.point,c.point)||!same(context.grid,proof.grid)||slices.length!==2)throw Error('Fixed original contact and authenticated two-receipt context required');
  const captured=[...slices],read=()=>captured.map(s=>reader.inspect(s)),payloads=read();
  if(payloads.some(p=>p.epoch!==context.generation||p.sourceRevision!==context.sourceRevision)||new Set(payloads.map(p=>p.ownerId)).size!==2)throw Error('Original receipt generation/revision/owners required');
  const bindings={},fragments=[];
  for(const side of ['parent','child']){const end=proof.ends[side],payload=payloads.find(p=>p.ownerId===end.ownerId),matches=payload?.entries.filter(e=>e.record.sourceSurfaceId===end.sourceId&&e.record.nativePartId===end.partId&&e.record.sourceCarrierId===end.ownerId&&same(e.cell,end.sourceCell));
    if(matches?.length!==1)throw Error('Exact producer-owned contact record absent or ambiguous: '+side);
    const entry=matches[0],ts=end.channel==='solid'?entry.record.solidTriangles:entry.record.triangles,part=parts.find(p=>p.id===end.partId);
    if(!ts?.length)throw Error('Required native physical channel absent');
    const patches=originalContactPatches(ts,part.triangles[end.primitive]),triangles=patches.map(p=>p.triangle);
    if(!triangles.length||!triangles.some(t=>on(c.point,t)))throw Error('Native channel does not preserve fixed original contact face: '+side);
    bindings[side]={partId:end.partId,ownerId:end.ownerId,component:end.component,primitive:end.primitive,channel:end.channel,sourceSurfaceId:entry.record.sourceSurfaceId,nativeRecordId:entry.record.id,cell:[...entry.cell],nativePrimitives:[...new Set(patches.map(p=>p.nativePrimitive))]};
    fragments.push({id:entry.record.id+'/original-contact',recordId:entry.record.id,partId:end.partId,ownerId:end.ownerId,component:end.component,mode:'native',cell:[...entry.cell],primitives:[end.primitive],triangles});
  }
  if(!supportSurfacesTouch(shape(fragments[0].triangles),shape(fragments[1].triangles)))throw Error('Actual mapped native contact rejected by existing predicate');
  const endpoint=side=>({partId:bindings[side].partId,point:c.point,primitives:[bindings[side].primitive],nativeRecordId:bindings[side].nativeRecordId,cell:bindings[side].cell}),core=createOriginalSupportPorts({parts,bonds:[{id:c.relationshipId+'/contact-alternative',kind:'bearing-face',direction:c.direction,parent:endpoint('parent'),child:endpoint('child')}],anchors:[]});
  let closed=false;const original=freeze({generation:context.generation,sourceRevision:context.sourceRevision,point:[...c.point],direction:c.direction,anchors:[],...bindings});
  return Object.freeze({binding:()=>original,evaluate({revision,retireRecords=[]}){
    if(closed)throw Error('One-pair contact pilot disposed');const fresh=read(),ids=new Set(fresh.flatMap(p=>p.entries.map(e=>e.record.id)));
    if(!Array.isArray(retireRecords)||new Set(retireRecords).size!==retireRecords.length||retireRecords.some(id=>!ids.has(id)))throw Error('Exact authenticated local retirement IDs required');
    const retired=new Set(retireRecords),active=fragments.filter(f=>!retired.has(f.recordId)),result=core.evaluate({revision,fragments:active});
    return freeze({live:result.ports[0].live,retireRecords:[...retireRecords],core:result});
  },dispose(){if(closed)return;closed=true;core.dispose();captured.length=0;fragments.length=0;}});
}
