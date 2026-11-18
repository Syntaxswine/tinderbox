// Metadata only. READY is permission to prepare checked inputs, never a native
// receipt or proof that a proposed source contact is rooted in a live world.
export const HOST_INPUT_LIMITS=Object.freeze({regionalParts:2,descriptors:320,cellsPerPart:4096,shapes:192,triangles:65536,fallbackShapes:24,fallbackTriangles:8192});
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s),vector=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
export function freezeInput(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const v of Object.values(value))freezeInput(v);Object.freeze(value);}return value;}
export function qualifyInputOwner(place,id){if(typeof id!=='string'||!id)throw Error('Owner identity required');if(id.includes('::')){if(!id.startsWith(place+'::')||id.split('::').length!==2)throw Error('Owner must be qualified exactly once');return id;}return place+'::'+id;}
export class MapInputNotReadyError extends Error{constructor(report){super('Shared map inputs are NOT_READY: '+report.findings.map(f=>f.code).join(', '));this.name='MapInputNotReadyError';this.code='MAP_INPUT_NOT_READY';this.report=report;}}
export const sameInput=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const same=sameInput,refKey=r=>r&&[r.commit,r.path,r.sha256].join('|');
export function inspectSharedMapInputs(descriptor,inventory,{reviewedRefs=[],approvedProjections=[],approvedMounts=[],requiredModes={},sourceRevision,proofKinds=['bearing-face-v1','fixed-embed-v1','fixed-assembly-mount-v1']}={}){
  const p=structuredClone(descriptor||{}),findings=[],add=(code,id,detail)=>findings.push({code,id,detail}),partById=new Map(inventory.parts.map(v=>[v.id,v])),ownerById=new Map(inventory.owners.map(v=>[v.id,v]));
  const qualify=id=>{try{return qualifyInputOwner(p.placeId,id);}catch{return null;}},list=(object,key)=>{if(object[key]===undefined)object[key]=[];if(!Array.isArray(object[key])){add('MALFORMED_COLLECTION',key,'Expected an array.');object[key]=[];}return object[key];};
  for(const key of ['owners','parts','projections'])list(p,key);
  if(!p.support||typeof p.support!=='object'||Array.isArray(p.support))p.support={};for(const key of ['bonds','anchors','requirements','rootTraces','ordinaryAlternatives'])list(p.support,key);
  // Malformed/incomplete authoring packets are an admission result, not an
  // exception which could accidentally continue into a default host path.
  if([...p.owners,...p.parts,...p.projections,...p.support.bonds,...p.support.anchors,...p.support.requirements,...p.support.rootTraces,...p.support.ordinaryAlternatives].some(v=>!v||typeof v!=='object'))return freezeInput({version:1,phase:'METADATA_ADMISSION',status:'NOT_READY',findings:[{code:'MALFORMED_RECORD',id:p.placeId}],plan:p});
  const trusted=new Set(reviewedRefs.map(refKey)),approved=r=>!!r&&sha(r.sha256)&&trusted.has(refKey(r));
  if(p.version!==1||p.placeId!==inventory.placeId||!sha(p.sourceRevision))add('SOURCE_REVISION_OR_PLACE',p.placeId,'Pinned version-1 source metadata is required.');
  if(!sha(sourceRevision)||p.sourceRevision!==sourceRevision)add('SOURCE_REVISION_NOT_REVIEWED',p.placeId,'Capture the exact reviewed input revision before birth.');
  if(!same(p.grid,{origin:[0,0,0],pitch:[.5,1.06,.5]}))add('GRID_IDENTITY',p.placeId,'Preserve the existing native grid.');
  const limits={...HOST_INPUT_LIMITS,...p.limits};for(const[k,v]of Object.entries(limits))if(!(k in HOST_INPUT_LIMITS)||!Number.isSafeInteger(v)||v<0||v>HOST_INPUT_LIMITS[k]||k.startsWith('fallback')&&v!==HOST_INPUT_LIMITS[k])add('LIMIT_POLICY',k,'Preserve the combined cache and its fallback reserve; no cap increase.');
  const owners=new Map(),parts=new Map();
  for(const o of p.owners||[]){
    try{o.id=qualifyInputOwner(p.placeId,o.id);}catch(e){add('OWNER_ID',o.id,e.message);continue;}
    if(owners.has(o.id))add('DUPLICATE_OWNER',o.id,'One canonical owner only.');owners.set(o.id,o);
    const existing=ownerById.get(o.id),projection=p.projections.find(v=>qualify(v.owner?.id)===o.id);
    if(!existing&&!projection)add('UNKNOWN_OWNER',o.id,'Owner is absent from this catalogue.');
    const expected=existing||projection?.owner;
    if(!Number.isFinite(o.fuelAmount)||o.fuelAmount<0||!Number.isFinite(o.finish?.amount??0)||(o.finish?.amount??0)<0)add('CANONICAL_QUANTITY',o.id,'Finite canonical accounts required.');
    if(expected&&(!Object.is(o.fuelAmount,expected.fuelAmount)||!same(o.finish??null,expected.finish??null)||o.fuelClass!==expected.fuelClass))add('CANONICAL_QUANTITY',o.id,'Full original fuel/profile/finish must match before birth.');
    if(!['whole','regional'].includes(o.mode))add('OWNER_MODE_UNBOUND',o.id,'Select and capture a mode before birth.');
    if(!requiredModes[o.id])add('OWNER_MODE_NOT_REVIEWED',o.id,'Unknown/out-of-cohort owner mode is not admitted.');
    if(requiredModes[o.id]&&o.mode!==requiredModes[o.id])add('OWNER_MODE_POLICY',o.id,'Mode differs from the captured architect selection.');
    if(!Array.isArray(o.parts)||!o.parts.length)add('OWNER_PARTS_UNBOUND',o.id,'Complete physical part ownership is required.');
    if(expected&&!same([...(Array.isArray(o.parts)?o.parts:[])].sort(),[...expected.parts||[]].sort()))add('TRUNCATED_OWNER',o.id,'A local pilot cannot truncate its canonical owner.');
  }
  const added=new Map(),geometryIds=new Set(inventory.geometryIds||[]);let nextPart=inventory.partCount,nextOwner=inventory.ownerCount;
  for(const projection of p.projections||[]){
    const id=projection.owner?.id;
    if(!approvedProjections.some(a=>same(a,projection)))add('PROJECTION_NOT_APPROVED',id,'Exact approved final projection, including matrix/quantity/IDs/pins, is required.');
    if(projection.canonicalOwnerCount!==1||projection.newAnchor!==false||projection.owner?.finish) add('PROJECTION_OWNERSHIP',id,'One owner/quantity and no new grounding or finish.');
    if(!projection.part||!projection.owner){add('PROJECTION_RECORD_UNBOUND',id,'Owner and part records required.');continue;}
    if(projection.part.globalIndex!==nextPart++||projection.owner.globalIndex!==nextOwner++||partById.has(projection.part.id)||ownerById.has(qualify(id))||added.has(projection.part.id))add('PROJECTION_APPEND_IDENTITY',id,'Append stable new identities without reindexing originals.');
    if(!sha(projection.physical?.sha256)||!sha(projection.render?.sha256)||!sha(projection.mapping?.sha256)||projection.physical?.triangles!==projection.render?.triangles||projection.part.physicalGeometry===projection.part.geometry)add('PROJECTION_MAPPING',id,'Separate pinned final physical and mapped render buffers are required.');
    for(const key of [projection.part.geometry,projection.part.physicalGeometry]){if(!key||geometryIds.has(key))add('PROJECTION_GEOMETRY_COLLISION',id,'Never replace a base or another appended geometry identity.');geometryIds.add(key);}
    added.set(projection.part.id,{...projection.part,ownerId:qualify(id),physicalTriangles:projection.physical?.triangles});
  }
  let sourceShapes=0,sourceTriangles=0,temporaryShapes=0,temporaryTriangles=0,regionalParts=0,descriptors=0;
  for(const part of p.parts||[]){
    try{part.ownerId=qualifyInputOwner(p.placeId,part.ownerId);}catch(e){add('PART_OWNER_ID',part.id,e.message);continue;}
    const original=partById.get(part.id)||added.get(part.id),owner=owners.get(part.ownerId);if(parts.has(part.id))add('DUPLICATE_PART',part.id,'One original part only.');parts.set(part.id,part);
    if(!original||!owner||!Array.isArray(owner.parts)||!owner.parts.includes(part.id))add('PART_OWNERSHIP',part.id,'Exact original or appended part/owner membership is required.');
    else if(part.globalIndex!==original.globalIndex||part.ownerId!==original.ownerId||part.geometry!==original.geometry||part.physicalTriangles!==original.physicalTriangles||!same(part.bounds,original.bounds))add('PART_CATALOGUE_IDENTITY',part.id,'Original ordinal, effective geometry, count and bounds must match.');
    if(!original?.static||part.static!==true)add('STATIC_INPUT_REQUIRED',part.id,'Moving/unknown input is not this static cohort.');
    if(part.sourceRange!==null||original?.sourceRange!=null)add('SOURCE_RANGE_NOT_READY',part.id,'No implicit source-range normalization.');
    if(!['original-v1','approved-projection-v1','effective-overlay-v1'].includes(part.lineage?.kind)||part.lineage?.originalPrimitiveMap!=='identity'||!Array.isArray(part.lineage?.generatedCaps))add('LINEAGE_PLAN_NOT_READY',part.id,'Original/effective primitive and cap lineage must be explicit.');
    if(part.lineage?.kind==='effective-overlay-v1'&&!approved(part.lineage.proofRef))add('OVERLAY_PROOF_NOT_REVIEWED',part.id,'Reviewed subdivision/range mapping is required.');
    const plan=part.surfacePlan;
    if(plan?.kind!=='existing-blueprint-v1'||plan.allocation!=='full-canonical-owner'||!approved(plan.proofRef)||!Number.isSafeInteger(plan.definitions)||plan.definitions<1||!Number.isSafeInteger(plan.triangles)||plan.triangles<1)add('SURFACE_PLAN_UNBOUND',part.id,'Reviewed existing blueprint derivation/allocation is required.');
    if(!Number.isSafeInteger(part.physicalTriangles)||part.physicalTriangles<1)add('TRIANGLE_COUNT_UNBOUND',part.id,'Known positive original primitive count required.');
    if(!vector(part.bounds?.min)||!vector(part.bounds?.max)||part.bounds.max.some((v,i)=>v<part.bounds.min[i]))add('BOUNDS_UNBOUND',part.id,'Finite ordered original bounds required.');
    else{
      const lo=part.bounds.min.map((v,i)=>Math.floor(v/[.5,1.06,.5][i]+1e-7)),hi=part.bounds.max.map((v,i)=>v-part.bounds.min[i]<1e-7?lo[i]:Math.ceil(v/[.5,1.06,.5][i]-1e-7)-1),cells=hi.reduce((n,v,i)=>n*(v-lo[i]+1),1);
      if(owner?.mode==='regional'){
        regionalParts++;temporaryShapes++;temporaryTriangles+=cells*part.physicalTriangles*7;
        if(cells>limits.cellsPerPart)add('REGIONAL_CELL_LIMIT',part.id,{cells,limit:limits.cellsPerPart});
        descriptors+=hi.reduce((n,v,i)=>n*(Math.floor(v/[4,1,4][i])-Math.floor(lo[i]/[4,1,4][i])+1),1);
        sourceShapes+=plan?.definitions||0;sourceTriangles+=plan?.triangles||0;
      }
    }
    sourceShapes+=1+(plan?.definitions||0);sourceTriangles+=part.physicalTriangles+(plan?.triangles||0);
  }
  for(const o of owners.values())for(const id of Array.isArray(o.parts)?o.parts:[])if(!parts.has(id))add('MISSING_CANONICAL_PART',id,'Every owned physical part must have an admitted derivation.');
  if(!owners.size||!parts.size)add('COHORT_UNBOUND',p.placeId,'Explicit bounded owners and parts are required.');
  if(regionalParts>limits.regionalParts)add('REGIONAL_PART_LIMIT',p.placeId,{regionalParts,limit:limits.regionalParts});
  if(descriptors>limits.descriptors)add('DESCRIPTOR_LIMIT',p.placeId,{descriptors,limit:limits.descriptors});
  if(sourceShapes+temporaryShapes+limits.fallbackShapes>limits.shapes||sourceTriangles+temporaryTriangles+limits.fallbackTriangles>limits.triangles)add('COMBINED_CACHE_LIMIT',p.placeId,{sourceShapes,sourceTriangles,temporaryShapes,temporaryTriangles,fallbackShapes:limits.fallbackShapes,fallbackTriangles:limits.fallbackTriangles});
  const support=p.support||{},bonds=new Map(),anchors=new Map();
  for(const o of owners.values()){
    const existing=ownerById.get(o.id),parents=existing?.supports||[],row=(support.ordinaryAlternatives||[]).find(v=>qualify(v.ownerId)===o.id);
    if(parents.length&&(!row||!Array.isArray(row.parentIds)||!same([...row.parentIds].sort(),[...parents].sort())||!approved(row.proofRef)))add('ORDINARY_ALTERNATIVES_NOT_READY',o.id,'Preserve every original ordinary alternative and its reviewed lineage; never rewrite alternatives as ALL.');
    if(row?.parentIds?.length&&(!Array.isArray(row.bondIds)||row.bondIds.length!==row.parentIds.length||row.bondIds.some((id,i)=>!support.bonds.some(b=>b.id===id&&parts.get(b.parent?.partId)?.ownerId===row.parentIds[i]&&parts.get(b.child?.partId)?.ownerId===o.id))))add('ORDINARY_BINDINGS_NOT_READY',o.id,'Exact original alternative bindings remain unproved.');
  }
  for(const b of support.bonds||[]){
    if(typeof b.id!=='string'||!b.id)add('BOND_ID_UNBOUND',b.id,'Exact original relationship identity required.');
    if(bonds.has(b.id))add('DUPLICATE_BOND',b.id,'Preserve unique source relationships.');bonds.set(b.id,b);if(!approved(b.proofRef))add('CONTACT_PROOF_NOT_REVIEWED',b.id,'Source proposals are not approved live bindings.');
    if(!['bearing-face','fixed-embed','fixed-assembly-mount'].includes(b.kind)||!['parent-to-child','symmetric-structural'].includes(b.direction))add('BOND_SEMANTICS_UNBOUND',b.id,'Keep explicit original contact kind/direction.');
    if(!proofKinds.includes(b.proofKind))add('PROOF_KIND_NOT_READY',b.id,b.proofKind);
    if(b.kind==='fixed-assembly-mount'&&!approvedMounts.some(m=>same(m,b)))add('MOUNT_TUPLE_NOT_APPROVED',b.id,'A provenance reference alone cannot approve a changed mechanical mount.');
    for(const side of ['parent','child']){const e=b[side],part=parts.get(e?.partId);if(!part||!vector(e.point)||!Number.isSafeInteger(e.primitive)||e.primitive<0||e.primitive>=part.physicalTriangles||!Number.isSafeInteger(e.component)||e.component<0)add('SOURCE_ENDPOINT_UNBOUND',b.id+'/'+side,'Own original face/component/point is required.');
      if(b.proofKind==='dual-endpoint-bearing-source-proposal'&&(!vector(e?.selector?.min)||!vector(e?.selector?.max)||!vector(e?.point)||e.point.some((v,i)=>v<e.selector.min[i]-1e-7||v>e.selector.max[i]+1e-7)))add('OWN_SOURCE_SELECTOR_UNBOUND',b.id+'/'+side,'Preserve each reviewed endpoint selector separately.');
      if(part?.lineage?.generatedCaps?.includes(e?.primitive))add('GENERATED_CAP_ENDPOINT',b.id+'/'+side,'A cap cannot identify an original surface.');
      if(e?.bindingPlan?.kind!=='source-blueprint-original-face-v1'||!approved(e.bindingPlan.proofRef)||!['surface','solid'].includes(e.bindingPlan.channel)||!(/^(plane|face\/\d+)$/.test(e.bindingPlan.suffix))||!vector(e.bindingPlan.surfacePoint)||!Array.isArray(e.bindingPlan.cell)||e.bindingPlan.cell.length!==3||!e.bindingPlan.cell.every(Number.isSafeInteger))add('BIRTH_DERIVATION_PLAN_UNBOUND',b.id+'/'+side,'Reviewed own source face/projection/cell derivation is required.');
      if(e?.nativeRecordId!=null||e?.nativeCellId!=null||e?.bindingPlan?.nativeRecordId!=null||e?.bindingPlan?.nativeCellId!=null)add('PREMATURE_NATIVE_ID',b.id+'/'+side,'Unborn IDs stay null; only genuine receipts may bind them.');
    }
  }
  for(const a of support.anchors||[]){if(typeof a.id!=='string'||!a.id||anchors.has(a.id))add('ANCHOR_ID_UNBOUND',a.id,'Unique reviewed original anchor identity required.');anchors.set(a.id,a);if(!parts.has(a.partId)||!Number.isSafeInteger(a.component)||a.component<0||!Number.isFinite(a.elevation)||!approved(a.proofRef))add('ANCHOR_MATERIAL_PROOF_UNBOUND',a.id,'Use reviewed existing original-material/component evidence, never bounds.');}
  for(const g of support.requirements||[]){
    const lower=Array.isArray(g.portIds)?g.portIds.map(id=>bonds.get(id)):null,upper=bonds.get(g.upperBondId);if(lower?.length!==2||lower.some(v=>!v)||!upper){add('ALL_FIXED_PORTS_UNBOUND',g.id,'Both fixed lowers and directed upper are required.');continue;}
    const fitting=parts.get(lower[0].child?.partId)?.ownerId,excluded=new Set([fitting,parts.get(upper.child?.partId)?.ownerId,...(Array.isArray(g.excludedDescendantOwners)?g.excludedDescendantOwners.map(qualify):[])]);
    if(qualify(g.ownerId)!==fitting)add('ALL_CANONICAL_OWNER',g.id,'The fitting requirement must name its actual canonical owner.');
    if(new Set(g.portIds).size!==2||lower.some(b=>b.direction!=='parent-to-child'||parts.get(b.child?.partId)?.ownerId!==fitting)||upper.direction!=='parent-to-child'||parts.get(upper.parent?.partId)?.ownerId!==fitting)add('ALL_DIRECTION_OR_OWNER',g.id,'Keep the original directed fitting dependencies.');
    for(const b of lower){const ownerId=parts.get(b.parent?.partId)?.ownerId,t=(support.rootTraces||[]).find(t=>qualify(t.lowerOwnerId)===ownerId);
      if(!t||t.status!=='reviewed-source-root-trace-v1'||!approved(t.proofRef)||t.complete!==true){add('LOWER_ROOT_NOT_READY',ownerId,'Independent reviewed source trace is missing.');continue;}
      const forbidden=new Set([...excluded,...(Array.isArray(t.excludedOwners)?t.excludedOwners.map(qualify):[])]),anchor=anchors.get(t.anchorId);let previous=anchor?.partId;for(const id of Array.isArray(t.bondIds)?t.bondIds:[]){const edge=bonds.get(id);if(!edge||edge.parent?.partId!==previous||forbidden.has(parts.get(edge.child?.partId)?.ownerId))add('ROOT_TRACE_INCOMPLETE_OR_DEPENDENT',ownerId,id);previous=edge?.child?.partId;}
      if(!anchor||previous!==b.parent?.partId||excluded.has(parts.get(anchor.partId)?.ownerId))add('ROOT_TRACE_INCOMPLETE_OR_DEPENDENT',ownerId,'Trace must end at this lower parent without fitting/upper/descendants.');
    }
  }
  if(!(support.requirements||[]).length)add('ALL_ASSEMBLY_UNBOUND',p.placeId,'This cohort needs its explicit fitting assembly.');
  const unique=[...new Map(findings.map(f=>[[f.code,f.id].join('|'),f])).values()];
  return freezeInput({version:1,phase:'METADATA_ADMISSION',status:unique.length?'NOT_READY':'READY',sourceValidation:'NOT_RUN',nativeInstallation:'NOT_RUN',sourceRevision:p.sourceRevision,findings:unique,limits,estimate:{incomplete:p.parts.some(p=>!p.surfacePlan),regionalParts,descriptors,sourceShapes,sourceTriangles,temporaryShapes,temporaryTriangles},lateNativeAuthority:'Genuine compiler receipts only; unborn IDs remain null.',pendingAdditions:p.pendingAdditions||[],context:p.context||{},plan:p});
}
