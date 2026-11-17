const BOX_FIELDS=['min','max'];
const copyBox=b=>b?Object.fromEntries(BOX_FIELDS.map(k=>[k,[...b[k]]])):null;
const qualify=(place,id)=>{if(typeof id!=='string'||!id||id.includes('::'))throw Error('Expected a local map source identity');return place+'::'+id;};
const boxArray=b=>b?[...b.min,...b.max]:null;
const arrayBox=b=>b?{min:b.slice(0,3),max:b.slice(3,6)}:null;
const compactMatrix=m=>m&&m.every((v,i)=>i>=12&&i<=14||v===([0,5,10,15].includes(i)?1:0))?m.slice(12,15):m;
const fullMatrix=m=>m?.length===3?[1,0,0,0,0,1,0,0,0,0,1,0,...m,1]:m;

// Tuple packing is an offline serialization step only. It interns repeated
// geometry/material/section identities and exact translation matrices; values
// and native precision survive the round trip unchanged.
export function packMapSourceIndex(index){
  const geometries=[...new Set(index.parts.map(p=>p.geometry))],appearances=[...new Set(index.parts.map(p=>p.appearance))],sections=[...new Set(index.parts.map(p=>p.sectionId))],number=list=>new Map(list.map((v,i)=>[v,i])),g=number(geometries),a=number(appearances),s=number(sections);
  return {...index,encoding:'tuples-v1',tables:{geometries,appearances,sections},
    carriers:index.carriers.map(c=>[c.id,c.material,c.fuelClass,c.fuelAmount,c.area,c.thickness,c.quantityRule,c.role,c.layer,c.level,boxArray(c.bounds),c.parts,c.supports,c.adjacency,
      c.supportEvidence.map(e=>[e.parent,e.kind,e.area??null,e.poseInvariant??false,e.portalId??null]),c.attachments.map(r=>[r.parent,r.kind,boxArray(r.childRegion.bounds),r.childRegion.point,boxArray(r.parentRegion.bounds),r.parentRegion.point,...(r.direction?[r.direction]:[])]),c.anchors.map(r=>r.elevation),c.finish?[c.finish.fuelClass,c.finish.amount]:null,c.portalId??null]),
    parts:index.parts.map(p=>[p.id,p.renderPartId===p.id?null:p.renderPartId,p.carrier,g.get(p.geometry),a.get(p.appearance),compactMatrix(p.matrix),boxArray(p.bounds),s.get(p.sectionId),(p.physical?1:0)|(p.closed?2:0),p.portalId??null,compactMatrix(p.openMatrix)??null,boxArray(p.openBounds),p.originalRange?[p.originalRange.start,p.originalRange.count]:null]),
    follows:index.follows.map(f=>[f.part,f.parents,f.semantics,f.projection,boxArray(f.bounds)])};
}
function unpackMapSourceIndex(index){
  const t=index.tables;
  return {...index,carriers:index.carriers.map(c=>({id:c[0],material:c[1],fuelClass:c[2],fuelAmount:c[3],area:c[4],thickness:c[5],quantityRule:c[6],role:c[7],layer:c[8],level:c[9],bounds:arrayBox(c[10]),parts:c[11],supports:c[12],adjacency:c[13],supportEvidence:c[14].map(e=>({parent:e[0],kind:e[1],...(e[2]!==null?{area:e[2]}:{}),...(e[3]?{poseInvariant:true,...(e[4]?{portalId:e[4]}:{})}:{})})),attachments:c[15].map(r=>({parent:r[0],kind:r[1],...(r[6]?{direction:r[6]}:{}),childRegion:{bounds:arrayBox(r[2]),point:r[3]||null},parentRegion:{bounds:arrayBox(r[4]),point:r[5]||null}})),anchors:c[16].map(elevation=>({kind:'native-ground-contact',elevation})),...(c[17]?{finish:{fuelClass:c[17][0],amount:c[17][1]}}:{}),...(c[18]?{portalId:c[18]}:{})})),
    parts:index.parts.map(p=>({id:p[0],renderPartId:p[1]??p[0],carrier:p[2],geometry:t.geometries[p[3]],appearance:t.appearances[p[4]],matrix:fullMatrix(p[5]),bounds:arrayBox(p[6]),sectionId:t.sections[p[7]],physical:!!(p[8]&1),closed:!!(p[8]&2),...(p[9]?{portalId:p[9],openMatrix:fullMatrix(p[10]),openBounds:arrayBox(p[11])}:{}),...(p[12]?{originalRange:{start:p[12][0],count:p[12][1]}}:{})})),
    follows:index.follows.map(f=>({part:f[0],parents:f[1],semantics:f[2],projection:f[3],bounds:arrayBox(f[4])}))};
}

// Offline projection of authoring evidence into bounded runtime records. Raw
// geometry/UV/normal arrays stay deduplicated and no world triangles are made.
export function encodeMapSources({bindings,manifest,navigation,geometries}){
  if(bindings?.version!==1||bindings.placeId!==manifest?.placeId||navigation?.placeId!==bindings.placeId||bindings.coordinateFrame?.frame!=='emitted-world'||bindings.coordinateFrame.sourceOffsetAlreadyApplied!==true)throw Error('Mismatched native map sources');
  const placeId=bindings.placeId,carrierNumbers=new Map(bindings.carriers.map((c,i)=>[c.id,i])),parts=[],partNumbers=new Map(),library={version:1,placeId,geometries:{},materials:structuredClone(manifest.materials)},navParts=new Map(navigation.blockers.map(b=>[b.id,b]));
  const carrierNumber=id=>{const n=carrierNumbers.get(id);if(n===undefined)throw Error('Unknown carrier reference '+id);return n;};
  function geometry(binding){
    const raw=geometries[binding.geometryId];if(!raw?.attributes?.position)throw Error('Missing effective geometry '+binding.geometryId);
    let key=binding.geometryId;
    if(binding.sourceRange){
      const {start,count}=binding.sourceRange,indices=raw.index?.array??Array.from({length:raw.attributes.position.array.length/3},(_,i)=>i);
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(count)||start<0||count<=0||start%3||count%3||start+count>indices.length)throw Error('Invalid effective source range');
      key+='/range/'+start+'/'+count;
      if(!library.geometries[key]){const selected=indices.slice(start,start+count);library.geometries[key]={attributes:Object.fromEntries(Object.entries(raw.attributes).map(([name,a])=>[name,{...a,array:selected.flatMap(i=>a.array.slice(i*a.itemSize,(i+1)*a.itemSize))}])),index:null};}
    }else if(!library.geometries[key])library.geometries[key]=structuredClone(raw);
    return key;
  }
  function part(binding,carrier,physical){
    if(partNumbers.has(binding.sourcePartId))throw Error('Duplicate logical render source '+binding.sourcePartId);
    const native=navParts.get(binding.sourcePartId),portalId=carrier?.portalId??native?.portalId;
    if(binding.openMatrix&&!portalId)throw Error('A moving native part needs its actual portal ID');
    const record={id:binding.sourcePartId,renderPartId:binding.partId,carrier:carrier?carrierNumber(carrier.id):null,geometry:geometry(binding),appearance:binding.appearanceMaterialId,matrix:[...binding.matrix],bounds:copyBox(binding.bounds),sectionId:binding.sectionId,physical,
      closed:physical?carrier.quantityBasis.closedSourceSolids===true:native?.shapeId?navigation.collisionShapes[native.shapeId]?.closed!==false:true,
      ...(portalId?{portalId,openMatrix:binding.openMatrix&&[...binding.openMatrix],openBounds:copyBox(binding.openBounds)}:{}),
      ...(binding.sourceRange?{originalRange:{...binding.sourceRange}}:{})};
    if(!library.materials[record.appearance])throw Error('Missing source appearance '+record.id);
    partNumbers.set(record.id,parts.length);parts.push(record);return parts.length-1;
  }
  const carriers=bindings.carriers.map(c=>({id:c.id,material:c.physicalMaterial,fuelClass:c.fuelClass,fuelAmount:c.fuelAmount,area:c.area,thickness:c.thickness,quantityRule:c.quantityBasis.rule,role:c.role,layer:c.layer,level:c.nativeLevel??null,bounds:copyBox(c.physicalBounds||c.bounds),
    parts:c.renderBindings.map(b=>part(b,c,b.physicalContribution==='carrier-solid')),
    supports:c.supportCarrierIds.map(carrierNumber),adjacency:c.adjacencyCarrierIds.map(carrierNumber),
    supportEvidence:c.supportEvidence.map(e=>({parent:carrierNumber(e.carrierId),kind:e.kind,...(e.area!==undefined?{area:e.area}:{}),...(e.poseInvariant?{poseInvariant:true,portalId:e.portalId}:{})})),
    attachments:(c.attachmentRecords||[]).map(a=>{if(a.childCarrierId&&a.childCarrierId!==c.id||a.groundAnchor!==false)throw Error('Invalid local attachment ownership');return {parent:carrierNumber(a.parentCarrierId),kind:a.kind,childRegion:{bounds:copyBox(a.childRegion.bounds),point:a.childRegion.witnessPoint&&[...a.childRegion.witnessPoint]},parentRegion:{bounds:copyBox(a.parentRegion.bounds),point:a.parentRegion.witnessPoint&&[...a.parentRegion.witnessPoint]}};}),
    anchors:c.anchors.map(a=>{if(a.kind!=='native-ground-contact'||!Number.isFinite(a.elevation))throw Error('Unreconciled source anchor');return {kind:a.kind,elevation:a.elevation};}),
    ...(c.portalId?{portalId:c.portalId}:{}),...(c.finish?{finish:{fuelClass:c.finish.fuelClass,amount:c.finish.fuelAmount}}:{})}));
  for(const visual of bindings.visualOnlyBindings)part(visual.renderBinding,null,false);
  const follows=(bindings.followOwnership||[]).map(f=>{
    const number=partNumbers.get(f.sourcePartId);if(number===undefined)throw Error('Unknown cosmetic source '+f.sourcePartId);
    if(!['any-live-local-parent','all-live-local-parents'].includes(f.localParentSemantics))throw Error('Explicit local cosmetic ownership required');
    const parents=f.parentCarrierIds.map(carrierNumber);if(!parents.length)throw Error('Unowned cosmetic source');
    return {part:number,parents,semantics:f.localParentSemantics,projection:f.localProjection.mode,bounds:copyBox(f.localProjection.sourceBounds)};
  });
  for(const p of parts)if(p.carrier===null){const follow=follows.find(f=>f.part===partNumbers.get(p.id));if(!follow)throw Error('A visual source needs explicit follow ownership');p.carrier=follow.parents[0];}
  return {index:{version:1,placeId,sourceOffsetApplied:true,sourceBounds:copyBox(navigation.sourceBounds),carriers,parts,follows,sourcePins:{scene:bindings.sourceScene,overlay:bindings.effectiveGeometryOverlay},limitations:{declaredSupportUnresolved:[...(bindings.coverage.supportUnresolvedCarrierIds||[])],unassignedParts:bindings.unassignedBindings.length}},library};
}

// Decoding expands compact identity references only. Exact source arrays remain
// in their local buffer frame until a query, activation or resident render view.
export function decodeMapSources(index,library){
  if(index?.version!==1||library?.version!==1||index.placeId!==library.placeId||index.sourceOffsetApplied!==true)throw Error('Invalid compact source library');
  if(index.encoding){if(index.encoding!=='tuples-v1')throw Error('Unknown compact source encoding');index=unpackMapSourceIndex(index);}
  const ids=index.carriers.map(c=>qualify(index.placeId,c.id)),carriers=index.carriers.map((c,i)=>({...c,id:ids[i],supports:c.supports.map(n=>ids[n]),adjacency:c.adjacency.map(n=>ids[n]),supportEvidence:c.supportEvidence.map(e=>({...e,parent:ids[e.parent]})),attachments:c.attachments.map(a=>({...a,parent:ids[a.parent]}))}));
  const parts=index.parts.map(p=>({...p,carrierId:ids[p.carrier],material:p.physical?carriers[p.carrier]?.material:'query-cosmetic'})),partById=new Map(parts.map(p=>[p.id,p])),carrierById=new Map(carriers.map(c=>[c.id,c]));
  for(const p of parts)if(!p.carrierId||!library.geometries[p.geometry]||!library.materials[p.appearance])throw Error('Incomplete compact source '+p.id);
  return {version:1,placeId:index.placeId,index,library,carriers,parts,partById,carrierById,follows:index.follows.map(f=>({...f,partId:parts[f.part].id,parents:f.parents.map(n=>ids[n])})),
    metrics:()=>({canonicalCarriers:carriers.length,sourceParts:parts.length,decodedUniqueGeometries:Object.keys(library.geometries).length,appearanceMaterials:Object.keys(library.materials).length,startupWorldShapesExpanded:0,startupThermalCellsAllocated:0})};
}
