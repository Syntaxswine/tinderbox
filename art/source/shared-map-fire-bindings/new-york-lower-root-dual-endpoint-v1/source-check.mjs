// New source method only. Exact old cohort; one recorded refresh, no common-point retry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const pins=JSON.parse(fs.readFileSync(path.join(HERE,'input-pins.json')));
function local(n){const b=fs.readFileSync(path.join(HERE,n));assert.equal(sha(b),pins.local.find(p=>p.path===n).sha256);return b;}
function bytes(n){const b=fs.readFileSync(path.join(ROOT,n));assert.equal(sha(b),pins.dependencies.find(p=>p.path===n).sha256);return b;}
const dependency=n=>JSON.parse(bytes(n)),newPlan=JSON.parse(local('plan.json')),plan=dependency(newPlan.priorAttempt.planPath),old=dependency(newPlan.priorAttempt.resultPath),api=JSON.parse(local('api-context.json'));
assert.deepEqual(newPlan.partIds,plan.instances.map(p=>p.partId));assert.deepEqual(newPlan.pairIds,plan.relationships.map(r=>r.id));
for(const g of plan.geometries){const p=pins.dependencies.find(p=>p.path===g.path);g.sha256=p.sha256;g.bytes=p.bytes;}
const started=process.hrtime.bigint(),cpu=process.cpuUsage(),guard=()=>{if(Number(process.hrtime.bigint()-started)/1e9>55)throw Error('Dual endpoint source deadline reached');};
for(const c of Object.values(api))assert.equal(sha(c.moduleText),c.sha256);
const G=await import('data:text/javascript;base64,'+Buffer.from(api.geometry.moduleText).toString('base64'));
assert.equal(G.EPS,1e-7);
assert.equal(sha(api.support.closureText),api.support.closureSha256);
const touching=Function('G','const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+api.support.closureText+'\nreturn touching;')(G);
const SOURCE_SUPPORT_TOLERANCE=Function(api.tolerance.declaration.replace(/^export /,'')+'\nreturn SOURCE_SUPPORT_TOLERANCE;')();assert.equal(SOURCE_SUPPORT_TOLERANCE,2e-5);
const threePath=pins.threeCorePath;bytes(threePath);const T=await import(pathToFileURL(path.join(ROOT,threePath)).href);
const collision=await import('data:text/javascript;base64,'+Buffer.from(api.collision.moduleText).toString('base64'));
const coreBody=api.core.moduleText.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const coreApi=Function('T','G','supportSurfacesTouch','sweptCylinderClear','SOURCE_SUPPORT_TOLERANCE','const {bounds,segmentTriangle,triangleArea,cross,sub}=G;\n'+coreBody+'\nreturn {createOriginalSupportPorts,originalMaterialComponents,ORIGINAL_SUPPORT_LIMITS};')(T,G,touching,collision.sweptCylinderClear,SOURCE_SUPPORT_TOLERANCE);
const cc=dependency('art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/component-context.json');
const normal=Function('cross','sub',cc.canonicalNormal+'\nreturn normal;')(G.cross,G.sub);
const producer=dependency('art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/source-producer-context.json');assert.equal(sha(producer.functionText),producer.functionSha256);
const sourceTriangles=Function(producer.functionText+'\nreturn sourceTriangles;')();
const representative=bytes('art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/representative.mjs').toString(),a=representative.indexOf('const finite=p=>'),b=representative.indexOf('const block=pinned('),helper=representative.slice(a,b);assert.equal(sha(helper),pins.partHelper.sha256);
const h=Function('G','normal','plan','guard','dependency','sourceTriangles','sha','assert','components',helper+'\nreturn {part,parts,rawCache,finite,on,key,same,within,shape,binaryHash};')(G,normal,plan,guard,dependency,sourceTriangles,sha,assert,coreApi.originalMaterialComponents);
const block=bytes('art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/donor-facet-method.mjs.txt').toString();
const facet=Function('G','touching','assert','plan','part','guard','finite','on','key','normal','same','within','shape',block+'\nreturn {clipped,overlapPolygon};')(G,touching,assert,plan,h.part,guard,h.finite,h.on,h.key,normal,h.same,h.within,h.shape);
const closest=(p,t)=>new T.Triangle(...t.map(v=>new T.Vector3(...v))).closestPointToPoint(new T.Vector3(...p),new T.Vector3()).toArray();
const bary=(p,t)=>new T.Triangle(...t.map(v=>new T.Vector3(...v))).getBarycoord(new T.Vector3(...p),new T.Vector3()).toArray();
const distance=(a,b)=>Math.hypot(...G.sub(a,b));
const parallel=(a,b)=>Math.hypot(...G.cross(normal(a),normal(b)))<=G.EPS;
const polygonArea=poly=>poly.length<3?0:poly.slice(1,-1).reduce((s,v,i)=>s+G.triangleArea([poly[0],v,poly[i+2]]),0);
// One explicitly authorized refresh. The old exited worker retained no buffers.
for(const spec of plan.instances){guard();const p=h.part(spec.id),prior=old.parts.find(q=>q.partId===spec.partId);assert.deepEqual(p.proof,prior.proof);}
assert.equal(h.parts.size,36);
const worldTables={version:1,refreshReason:newPlan.refresh.reason,priorAttemptUnchanged:true,sourceTransformations:36,
 parts:[...h.parts.values()].map(p=>({instance:p.spec.id,partId:p.spec.partId,ownerId:p.spec.ownerId,triangles:p.world.ts,proof:p.proof}))};
fs.writeFileSync(path.join(HERE,'world-tables.json'),JSON.stringify(worldTables)+'\n',{flag:'wx'});
function selectors(rel,ends){
 const typed=rel.historicalAttachments.filter(a=>a.record.parentRegion||a.record.childRegion);if(typed.length){assert.equal(typed.length,1);return {bounds:[typed[0].record.parentRegion.bounds,typed[0].record.childRegion.bounds],kind:'unchanged-existing-typed-endpoint-selectors',source:typed[0].pointer};}
 return {bounds:ends.map(p=>G.bounds(p.world.ts.flat())),kind:'new-separate-original-endpoint-bounds',source:rel.candidatePointer};
}
function validateWitness(rel,ends,select,primitives,points,footprint,derivation){
 const triangles=ends.map((p,i)=>p.world.ts[primitives[i]]),membership=points.map((p,i)=>h.on(p,triangles[i])),insideSelectors=points.map((p,i)=>h.within(p,select.bounds[i]));
 if(!membership.every(Boolean)||!insideSelectors.every(Boolean))return null;
 const gap=G.sub(points[1],points[0]),length=Math.hypot(...gap);if(length>SOURCE_SUPPORT_TOLERANCE)return null;
 const clipped=triangles.map((t,i)=>G.clipTriangle(t,select.bounds[i]).filter(t=>G.triangleArea(t)>0));if(clipped.some(ts=>!ts.length))return null;
 const native=[touching(...triangles.map(t=>h.shape([t]))),touching(...clipped.map(h.shape))];
 if(rel.direction==='symmetric-structural')native.push(touching(...triangles.map(t=>h.shape([t])).reverse()),touching(...clipped.map(h.shape).reverse()));
 if(!native.every(Boolean))return null;
 const isParallel=parallel(...triangles),coords=points.map((p,i)=>bary(p,triangles[i]));
 if(isParallel&&(!(footprint?.areaSquareMetres>0)||coords.some(c=>c.some(v=>!(v>0)))))return null;
 return {kind:'dual-endpoint-bearing-source-proposal',derivation,points,primitives,components:primitives.map((i,j)=>ends[j].world.comp.get(i)),normals:triangles.map(normal),
  parallel:isParallel,projectedFootprint:footprint,gapVectorChildMinusParent:gap,gapMetres:length,gapDirection:length?gap.map(v=>v/length):[0,0,0],
  parentNormalSignedGap:G.dot(gap,normal(triangles[0])),barycentricCoordinates:coords,ownPrimitiveMembership:membership,ownSelectors:insideSelectors,nativeContactChecks:native,
  existingPortDistanceRule:{toleranceMetres:SOURCE_SUPPORT_TOLERANCE,accepted:true},
  canonicalNormalFloat64LittleEndianSha256:triangles.map(t=>h.binaryHash([normal(t)])),
  ownPlaneResidualMetres:triangles.map((t,i)=>Math.abs(G.dot(G.sub(points[i],t[0]),normal(t)))),trianglesFloat64LittleEndianSha256:triangles.map(t=>h.binaryHash([t]))};
}
function derive(rel,ends,select,prior){
 let candidatePairs=0,nativeRejected=0,positiveFootprints=0;
 const facets=ends.map((p,i)=>facet.clipped(p,select.bounds[i]).filter(f=>G.triangleArea(f.triangle)>0));
 for(const f of facets[0])for(const g of facets[1]){
  guard();candidatePairs++;const originals=[ends[0].world.ts[f.primitive],ends[1].world.ts[g.primitive]];
  if(!parallel(...originals))continue;
  if(!touching(...originals.map(t=>h.shape([t])))){nativeRejected++;continue;}
  const n=normal(originals[0]),projected=g.triangle.map(p=>G.sub(p,G.mul(n,G.dot(G.sub(p,originals[0][0]),n))));
  const polygon=facet.overlapPolygon(projected,f.triangle),area=polygonArea(polygon);if(!(area>0))continue;positiveFootprints++;
  const p=closest(G.centre(polygon),originals[0]),q=closest(p,originals[1]);
  const proof=validateWitness(rel,ends,select,[f.primitive,g.primitive],[p,q],{areaSquareMetres:area,polygonOnParentPlane:polygon,method:'unchanged overlapPolygon on projected original clipped child facet and parent facet'},'separate-interior-surface-points-from-positive-projected-overlap');
  if(proof)return {status:'source-contact-proposed',proof,stats:{candidatePairs,nativeRejected,positiveFootprints}};
 }
 if(prior.result.status==='source-contact-proposed'){
  const primitives=prior.result.contact.primitives,triangles=ends.map((p,i)=>p.world.ts[primitives[i]]);
  if(!parallel(...triangles)){
   const points=triangles.map(t=>closest(prior.result.contact.point,t)),proof=validateWitness(rel,ends,select,primitives,points,null,'prior-saved-transverse-contact; separate original closest-point witnesses; no common-point search replay');
   if(proof)return {status:'source-contact-proposed',proof,stats:{candidatePairs,nativeRejected,positiveFootprints}};
  }
 }
 return {status:'unproved',reason:'no-dual-endpoint-contact-with-required-own-selectors-positive-footprint-and-native-rule',stats:{candidatePairs,nativeRejected,positiveFootprints}};
}
function controls(ends,select,proof){
 const triangles=ends.map((p,i)=>p.world.ts[proof.primitives[i]]),wrong=ends.map((p,i)=>{
  const primitive=p.indices.find(j=>j!==proof.primitives[i]&&!h.on(proof.points[i],p.world.ts[j]));assert.notEqual(primitive,undefined);
  assert.equal(h.on(proof.points[i],p.world.ts[primitive]),false);return {partId:p.spec.partId,primitive,point:proof.points[i],ownWrongPrimitiveMembership:false};});
 let beyondNative=null;
 for(const i of ends[0].indices){if(beyondNative)break;for(const j of ends[1].indices){
  const ts=[ends[0].world.ts[i],ends[1].world.ts[j]],bs=ts.map(t=>G.bounds(t)),separation=Math.hypot(...bs[0].min.map((v,k)=>Math.max(v-bs[1].max[k],bs[1].min[k]-bs[0].max[k],0)));
  if(separation>1e-5&&!touching(...ts.map(t=>h.shape([t])))){beyondNative={primitives:[i,j],minimumBoundsSeparationMetres:separation,nativeContact:false,actualSourceFaces:true};break;}
 }}
 const local=triangles.map((t,i)=>G.clipTriangle(t,select.bounds[i]).filter(t=>G.triangleArea(t)>0));let beyondDistance=null;
 for(const a of local[0]){if(beyondDistance)break;for(const b of local[1]){
  const ps=[G.centre(a),G.centre(b)],d=distance(...ps);
  if(d>SOURCE_SUPPORT_TOLERANCE&&ps.every((p,i)=>h.on(p,triangles[i])&&h.within(p,select.bounds[i]))){beyondDistance={points:ps,distanceMetres:d,toleranceMetres:SOURCE_SUPPORT_TOLERANCE,portDistanceAccepted:false,ownMembership:true,ownSelectors:true,originalNativeFacesAccepted:true};break;}
 }}
 return {wrongOriginalFace:wrong,beyondNativeAcceptance:beyondNative,beyondPortDistance:beyondDistance,complete:!!beyondNative&&!!beyondDistance};
}
const contacts=[];
for(const rel of plan.relationships){
 guard();const ends=[h.part(rel.parent),h.part(rel.child)],select=selectors(rel,ends),prior=old.contacts.find(r=>r.id===rel.id),derived=derive(rel,ends,select,prior);
 if(derived.proof){derived.negativeControls=controls(ends,select,derived.proof);if(!derived.negativeControls.complete){derived.status='unproved';derived.reason='required-negative-control-unavailable';}}
 contacts.push({id:rel.id,parentOwner:rel.parentOwner,childOwner:rel.childOwner,direction:rel.direction,candidatePointer:rel.candidatePointer,
  originalHistoryRef:{path:newPlan.priorAttempt.planPath,pointer:'/relationships/'+contacts.length},priorStatus:prior.result.status,priorReason:prior.result.reason??null,
  endpointSelectors:select,...derived});
}
const anchors=old.anchors.map(a=>{
 const p=[...h.parts.values()].find(p=>p.spec.partId===a.partId),t=p.world.ts[a.evidence.primitive];assert.deepEqual(t,a.evidence.triangle);
 assert.ok(t.every(v=>v[1]===a.originalAnchor.elevation)&&G.triangleArea(t)>0);
 return {...a,refreshedOriginalTriangleVerified:true,priorAnchorUnchanged:true};
});
function trace(path){
 const edges=[];for(let i=0;i<path.childToAncestor.length-1;i++){
  const child=path.childToAncestor[i],parent=path.childToAncestor[i+1],r=contacts.find(r=>r.childOwner===child&&r.parentOwner===parent);assert.ok(r);edges.push(r.id);
 }
 const anchor=anchors.find(a=>a.ownerId===path.terminal&&a.status==='declared-anchor-actual-material-verified');
 return {...path,edgeIds:edges,contactTraceComplete:edges.every(id=>contacts.find(r=>r.id===id).status==='source-contact-proposed'),actualAnchorVerified:!!anchor,
  ready:!!anchor&&edges.every(id=>contacts.find(r=>r.id===id).status==='source-contact-proposed')};
}
const cornice=trace(plan.paths[0]),roofAlternatives=plan.paths.slice(1).map(p=>{
 const t=trace(p),incoming=contacts.find(r=>r.childOwner===plan.starts[1]&&r.parentOwner===p.childToAncestor[0]);assert.ok(incoming);
 return {...t,incomingId:incoming.id,ready:t.ready&&incoming.status==='source-contact-proposed'};
});
const contactsReady=cornice.ready&&roofAlternatives.some(p=>p.ready),evaluation={invoked:false,evaluations:0,reason:contactsReady?null:'Both exact independently rooted contact traces not ready.'};
let supportedLowerParents=false;
if(contactsReady){
 let core;try{
  const parts=[...h.parts.values()].map(p=>({id:p.spec.partId,ownerId:p.spec.ownerId,triangles:p.world.ts}));
  const bonds=contacts.filter(r=>r.status==='source-contact-proposed').map(r=>{
   const rel=plan.relationships.find(s=>s.id===r.id),ends=[h.part(rel.parent),h.part(rel.child)];
   const end=i=>({partId:ends[i].spec.partId,point:r.proof.points[i],primitives:[r.proof.primitives[i]]});
   return {id:r.id,kind:'bearing-face',direction:r.direction,parent:end(0),child:end(1)};
  });
  const roots=anchors.map(a=>({partId:a.partId,elevation:a.originalAnchor.elevation,component:a.evidence.component}));
  core=coreApi.createOriginalSupportPorts({parts,bonds,anchors:roots,requirements:[],approvedMounts:[]});
  evaluation.bindings=core.bindings();
  const fragments=[...h.parts.values()].flatMap(p=>p.proof.emittedWorldComponents.map(c=>({id:'cold/'+p.spec.partId+'/component/'+c.id,partId:p.spec.partId,ownerId:p.spec.ownerId,component:c.id,
   triangles:c.primitives.map(i=>p.world.ts[i]),primitives:c.primitives,mode:'cold'})));
  evaluation.invoked=true;evaluation.evaluations=1;evaluation.result=core.evaluate({revision:0,fragments});
  evaluation.lowerParents=plan.starts.map(owner=>{const p=[...h.parts.values()].find(p=>p.spec.ownerId===owner),components=[...new Set((owner===plan.starts[0]?[0,2]:[2,3]).map(i=>p.world.comp.get(i)))];
   const nodes=components.map(c=>'cold/'+p.spec.partId+'/component/'+c);return {ownerId:owner,partId:p.spec.partId,requiredOriginalComponents:components,nodeIds:nodes,supported:nodes.every(id=>evaluation.result.supportedIds.includes(id))};});
  supportedLowerParents=evaluation.lowerParents.every(p=>p.supported);evaluation.sourceOnly=true;evaluation.saddleUpperAndDescendantsExcluded=true;
 }catch(error){evaluation.error={name:error.name,message:error.message};}
 finally{if(core){core.dispose();evaluation.disposed=core.diagnostics();}}
}
const counts={distinctOriginalParts:h.parts.size,examinedDeclaredPairs:contacts.length,newParts:0,newPairs:0,refreshedSourceTransformations:h.parts.size,
 priorAttemptSourceTransformations:36,totalAcrossTwoMethods:72,transformationsPerPartThisMethod:1,rawGeometryBuffers:h.rawCache.size,sourceTriangles:428,
 proposedSourceContacts:contacts.filter(r=>r.status==='source-contact-proposed').length,unproved:contacts.filter(r=>r.status==='unproved').length,
 actualMaterialAnchors:anchors.length,coldCoreEvaluations:evaluation.evaluations,nativeCompilations:0,nativeRecordsBound:0,nativeCellsBound:0};
const result={version:1,result:supportedLowerParents?'BOTH_ORIGINAL_LOWER_PARENTS_SOURCE_ROOTED':'DUAL_ENDPOINT_SOURCE_TRACE_UNPROVED',counts,
 planSha256:sha(local('plan.json')),inputPinsSha256:sha(fs.readFileSync(path.join(HERE,'input-pins.json'))),
 worldTablesSha256:sha(fs.readFileSync(path.join(HERE,'world-tables.json'))),contacts,anchors,corniceTrace:cornice,roofAlternatives,evaluation,
 preserved:{priorAttemptUnchanged:true,ordinaryAlternatives:true,saddleRequiredAllUnchanged:true,saddleThreePortsAndFloat32MappingReferenceOnly:true,upperLocalInterval:[49,50],
  originalPrimitiveSlots:true,originalComponents:true,sourceFrames:true,sourceRanges:true,quantities:true,geometry:true,engineTolerances:true,engineCaps:true,noNewMountsOrAnchors:true},
 nativeRecords:'UNBOUND',nativeCells:'UNBOUND',scope:'Source-only root preconditions for original lower parents. No runtime admission, saddle evaluation, load capacity or thermal claim.',
 cost:{workerCpu:process.cpuUsage(cpu),workerElapsedMs:Number(process.hrtime.bigint()-started)/1e6}};
fs.writeFileSync(path.join(HERE,'result.json'),JSON.stringify(result)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:result.result,...counts,workerElapsedMs:result.cost.workerElapsedMs}));
