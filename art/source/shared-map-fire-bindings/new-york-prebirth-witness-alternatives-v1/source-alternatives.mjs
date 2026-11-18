// Two pre-birth source proposals from immutable diagnostic arrays; no producer/graph/transform.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const pins=JSON.parse(fs.readFileSync(path.join(HERE,'input-pins.json')));
function local(n){const b=fs.readFileSync(path.join(HERE,n));assert.equal(sha(b),pins.local.find(p=>p.path===n).sha256);return b;}
const plan=JSON.parse(local('plan.json')),api=JSON.parse(local('api-context.json')),read=n=>JSON.parse(local(n)),originals=read('inputs/selected-originals.json'),blueprints=read('inputs/selected-blueprints.json'),snapshot=read('inputs/bond-snapshot.json');
const started=process.hrtime.bigint(),cpu=process.cpuUsage(),guard=()=>{if(Number(process.hrtime.bigint()-started)/1e9>25)throw Error('Source-numeric deadline reached');};
for(const [k,c] of Object.entries(api))if(c.moduleText)assert.equal(sha(c.moduleText),c.sha256);
const G=await import('data:text/javascript;base64,'+Buffer.from(api.geometry.moduleText).toString('base64'));assert.equal(G.EPS,1e-7);
const touching=Function('G','const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+api.support.closure+'\nreturn touching;')(G);
const components=Function('triangleArea',api.component.declaration+'\n'+api.component.function.replace(/^export /,'')+'\nreturn originalMaterialComponents;')(G.triangleArea);
const normal=Function('cross','sub',api.component.normal+'\nreturn normal;')(G.cross,G.sub);
const patches=Function('G','const {EPS,bounds,triangleArea,cross,sub,dot,unit,clipPolygon,clipTriangle,segmentTriangle}=G;\n'+api.lineage.function.replace(/^export /,'')+'\nreturn originalContactPatches;')(G);
const fixedCell=Function('G','const {bounds,clipTriangle,triangleArea,segmentTriangle,EPS}=G;\n'+api.fixedCell.moduleText.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')+'\nreturn {sourceSurfaceSpan,selectFixedSourceCell};')(G);
const deriveEndpoint=Function('G','selectFixedSourceCell','const {segmentTriangle,dot,sub,EPS}=G;\n'+api.projection.declaration+'\n'+api.projection.boundaryClass.replace(/^export /,'')+'\n'+api.projection.function.replace(/^export /,'')+'\nreturn deriveSharedSourceEndpoint;')(G,fixedCell.selectFixedSourceCell);
const tolerance=Function(api.tolerance.declaration.replace(/^export /,'')+'\nreturn SOURCE_SUPPORT_TOLERANCE;')();assert.equal(tolerance,2e-5);
assert.equal(sha(api.overlap.function),api.overlap.functionSha256);const overlapPolygon=Function('G',api.overlap.function+'\nreturn overlapPolygon;')(G);
const tb=fs.readFileSync(path.join(ROOT,pins.threeCore.path));assert.equal(sha(tb),pins.threeCore.sha256);const T=await import(pathToFileURL(path.join(ROOT,pins.threeCore.path)).href);
const closest=(p,t)=>new T.Triangle(...t.map(v=>new T.Vector3(...v))).closestPointToPoint(new T.Vector3(...p),new T.Vector3()).toArray(),distance=(a,b)=>Math.hypot(...G.sub(a,b)),on=(p,t)=>G.segmentTriangle(p,p,t)!==null,
 within=(p,b)=>p.every((v,i)=>v>=b.min[i]&&v<=b.max[i]),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),
 shape=ts=>({triangles:ts,solidTriangles:ts,bounds:G.bounds(ts.flat()),normal:normal(ts[0]),kind:'wall',thickness:0}),
 area=poly=>poly.length<3?0:poly.slice(1,-1).reduce((s,p,i)=>s+G.triangleArea([poly[0],p,poly[i+2]]),0),
 hex=v=>{const b=Buffer.alloc(v.length*8);v.forEach((n,i)=>b.writeDoubleLE(n,i*8));return b.toString('hex');};
const byId=new Map(originals.parts.map(p=>[p.id,p]));for(const p of originals.parts)assert.deepEqual(components(p.triangles),p.components);
const nativeByBond=new Map(),lineages=new Map(),nativeComponents=new Map();let maxPatchTriangles=0,maxMappedTriangles=0,facetPairs=0;
for(const spec of plan.cases){
 const data=read(spec.nativePath),surface=blueprints.surfaces.find(s=>s.nativePartId===spec.oldBond.child.partId);assert.deepEqual(data.sourceSurface,surface);data.sourceSurface=surface;
 assert.equal(data.records.length,6);nativeByBond.set(spec.id,data);const child=byId.get(spec.oldBond.child.partId),prior=read(spec.oldResultPath);
 for(const r of data.records){
  guard();const body=r.solidTriangles||r.triangles;nativeComponents.set(r.id,components(body));
  const matched=child.components.map(c=>({component:c.id,primitives:c.primitives.filter(i=>{const p=patches(body,child.triangles[i]);maxPatchTriangles=Math.max(maxPatchTriangles,p.length);assert.ok(p.length<=252);return p.length>0;})})).filter(c=>c.primitives.length);
  assert.deepEqual(matched,prior.native.find(n=>n.recordId===r.id).lineage);lineages.set(r.id,matched);
 }
}
const baseShapes=originals.parts.length+blueprints.surfaces.length+[...nativeByBond.values()].reduce((n,d)=>n+d.records.length*2,0),baseTriangles=originals.parts.reduce((n,p)=>n+p.triangles.length,0)+blueprints.surfaces.reduce((n,s)=>n+s.triangles.length,0)+[...nativeByBond.values()].reduce((n,d)=>n+d.records.reduce((m,r)=>m+r.triangles.length+(r.solidTriangles||r.triangles).length,0),0);
assert.equal(baseShapes,30);assert.equal(baseTriangles,260);assert.ok(baseShapes+2<=32&&baseTriangles+252<=512);
function nativeCheck(spec,endpoint){
 const part=byId.get(endpoint.partId),data=nativeByBond.get(spec.id),surface=data.sourceSurface;let mapping;
 try{mapping=deriveEndpoint({endpoint,part,components:part.components,surfaces:[surface],grid:plan.grid});}
 catch(error){return {valid:false,reason:'THERMAL_SHARED_MAPPING_'+(error.code??error.message)};}
 maxMappedTriangles=Math.max(maxMappedTriangles,...mapping.cellOwnership.candidates.map(c=>c.clippedTriangleCount));
 const hits=[];
 for(const r of data.records){
  guard();if(r.sourceSurfaceId!==mapping.sourceSurfaceId||!same(r.sourceCell,mapping.bindingPlan.cell))continue;
  const lineage=lineages.get(r.id);if(lineage.length!==1||lineage[0].component!==endpoint.component||!lineage[0].primitives.includes(endpoint.primitive))continue;
  const body=r.solidTriangles||r.triangles,allHits=body.map((t,i)=>on(endpoint.point,t)?i:null).filter(i=>i!==null);if(!allHits.length)continue;
  const originalPatches=patches(body,part.triangles[endpoint.primitive]);maxPatchTriangles=Math.max(maxPatchTriangles,originalPatches.length);assert.ok(originalPatches.length<=252);
  const patchHits=originalPatches.filter(p=>on(endpoint.point,p.triangle)&&allHits.includes(p.nativePrimitive));if(!patchHits.length)continue;
  const thermalHits=r.triangles.map((t,i)=>on(mapping.bindingPlan.surfacePoint,t)?i:null).filter(i=>i!==null);if(!thermalHits.length)continue;
  const initialized=closest(endpoint.point,part.triangles[endpoint.primitive]),initializedHits=body.map((t,i)=>on(initialized,t)?i:null).filter(i=>i!==null);if(!initializedHits.length)continue;
  const physicalPrimitives=[...new Set(patchHits.map(p=>p.nativePrimitive))],physicalComponentIds=[...new Set(physicalPrimitives.map(i=>nativeComponents.get(r.id).find(c=>c.primitives.includes(i)).id))];
  hits.push({diagnosticRecordId:r.id,diagnosticIdStatus:'SAVED_EVIDENCE_ONLY_NOT_A_FUTURE_BINDING',sourceSurfaceId:r.sourceSurfaceId,sourceCell:r.sourceCell,
   originalComponent:lineage[0].component,originalPrimitive:endpoint.primitive,retainedOriginalPrimitiveSet:lineage[0].primitives,
   nativePhysicalPrimitives:physicalPrimitives,nativePhysicalComponents:physicalComponentIds,pointInActualPhysical:true,pointInActualOriginalLineagePatch:true,
   originalContactPatchCount:originalPatches.length,originalContactPatchArea:originalPatches.reduce((n,p)=>n+G.triangleArea(p.triangle),0),
   currentThermalProjection:mapping,projectedPointInActualRetainedThermal:true,nativeThermalPrimitives:thermalHits,
   initialOwnPortProjection:{point:initialized,delta:initialized.map((v,i)=>v-endpoint.point[i]),distanceMetres:distance(initialized,endpoint.point),actualNativePhysicalPrimitives:initializedHits},
   futureNativeRecordId:null,futureNativeCellId:null});
 }
 return hits.length===1?{valid:true,...hits[0]}:{valid:false,reason:hits.length?'AMBIGUOUS_SAVED_NATIVE_OWNER':'NO_MATCHING_PHYSICAL_LINEAGE_POINT_AND_THERMAL_CELL',mapping};
}
function footprint(parentTriangle,childTriangle){
 const n=normal(parentTriangle),projected=childTriangle.map(p=>G.sub(p,G.mul(n,G.dot(G.sub(p,parentTriangle[0]),n)))),poly=overlapPolygon(projected,parentTriangle),a=area(poly);
 return {poly,area:a};
}
function sourceWitness(old,parent,child,ip,ic,points,foot){
 const ts=[parent.triangles[ip],child.triangles[ic]];
 if(!(foot.area>0)||!touching(...ts.map(t=>shape([t])))||!touching(...ts.map(t=>shape([t])).reverse()))return null;
 if(!points.every((p,i)=>on(p,ts[i])&&within(p,old[i===0?'parent':'child'].selector))||distance(...points)>tolerance)return null;
 return {primitives:[ip,ic],points,components:[old.parent.component,old.child.component],normals:ts.map(normal),normalBinary64LittleEndian:ts.map(t=>hex(normal(t))),
  positiveOriginalContactFootprintArea:foot.area,footprintVertexCoordinatesFlat:foot.poly.flat(),sourceOriginalNativeContact:[true,true],
  ownOriginalMembership:[true,true],ownSelectorMembership:[true,true],gapVectorChildMinusParent:G.sub(points[1],points[0]),gapMetres:distance(...points),
  existingDistanceToleranceMetres:tolerance,membershipToleranceMetres:G.EPS,sourceTriangles:{parentPrimitive:ip,childPrimitive:ic}};
}
function endpoints(old,witness,mapping,unchangedParent){
 const p=structuredClone(old.parent),c=structuredClone(old.child);
 if(!unchangedParent){p.primitive=witness.primitives[0];p.point=[...witness.points[0]];p.originalWitness=[...p.point];p.distance=0;p.bindingPlan=null;}
 c.primitive=witness.primitives[1];c.point=[...witness.points[1]];c.originalWitness=[...c.point];c.distance=0;c.bindingPlan=structuredClone(mapping.currentThermalProjection.bindingPlan);
 p.nativeRecordId=null;c.nativeRecordId=null;return {parent:p,child:c};
}
const outcomes=[];
for(const spec of plan.cases){
 const old=spec.oldBond,parent=byId.get(old.parent.partId),child=byId.get(old.child.partId),pairs=new Set(),failures={},phaseCounts={unchangedParent:0,changedParent:0};let selected=null;
 const count=reason=>failures[reason]=(failures[reason]||0)+1;
 const visit=(ip,ic,keep)=>{
  guard();const key=ip+'/'+ic;assert.ok(!pairs.has(key));pairs.add(key);facetPairs++;assert.ok(facetPairs<=288);phaseCounts[keep?'unchangedParent':'changedParent']++;
  const ts=[parent.triangles[ip],child.triangles[ic]],foot=footprint(...ts);if(!(foot.area>0)){count('NO_POSITIVE_ORIGINAL_PROJECTED_FOOTPRINT');return;}
  const center=G.centre(foot.poly),seeds=keep?[old.parent.point]:[center,...foot.poly.map(v=>center.map((x,i)=>(x+v[i])/2))].slice(0,8);
  for(const seed of seeds){
   const pp=keep?[...old.parent.point]:closest(seed,ts[0]),cp=closest(pp,ts[1]),w=sourceWitness(old,parent,child,ip,ic,[pp,cp],foot);if(!w){count('SOURCE_MEMBERSHIP_SELECTOR_CONTACT_OR_DISTANCE_REFUSED');continue;}
   const candidate={...old.child,primitive:ic,point:cp,originalWitness:cp,nativeRecordId:null},match=nativeCheck(spec,candidate);
   if(!match.valid){count(match.reason);continue;}
   selected={witness:w,native:match,unchangedParent:keep,proposed:endpoints(old,w,match,keep)};break;
  }
 };
 const childOrder=[old.child.primitive,...child.components.find(c=>c.id===old.child.component).primitives.filter(i=>i!==old.child.primitive)];
 for(const ic of childOrder){visit(old.parent.primitive,ic,true);if(selected)break;}
 const unchangedParentRefusals=structuredClone(failures);
 if(!selected)for(const ip of parent.components.find(c=>c.id===old.parent.component).primitives.filter(i=>i!==old.parent.primitive)){
  for(const ic of childOrder){visit(ip,ic,false);if(selected)break;}if(selected)break;
 }
 let proposal;
 if(selected){
  const w=selected.witness,newEnds=selected.proposed,chosenRecord=nativeByBond.get(spec.id).records.find(r=>r.id===selected.native.diagnosticRecordId),body=chosenRecord.solidTriangles||chosenRecord.triangles;
  const wrongOriginal=child.components[old.child.component].primitives.find(i=>i!==w.primitives[1]&&!on(w.points[1],child.triangles[i]));assert.notEqual(wrongOriginal,undefined);
  const wrongNative=body.findIndex(t=>!on(w.points[1],t));assert.ok(wrongNative>=0);
  const wrongRecord=nativeByBond.get(spec.id).records.find(r=>!same(r.sourceCell,selected.native.sourceCell)&&!(r.solidTriangles||r.triangles).some(t=>on(w.points[1],t)));assert.ok(wrongRecord);
  let far=null;for(const v of child.triangles[w.primitives[1]]){const q=w.points[1].map((x,i)=>(x+v[i])/2);if(on(q,child.triangles[w.primitives[1]])&&within(q,old.child.selector)&&distance(w.points[0],q)>tolerance){far={parentPoint:w.points[0],childPoint:q,distanceMetres:distance(w.points[0],q),distanceRuleAccepted:false,ownOriginalChildMembership:true,geometryChanged:false};break;}}assert.ok(far);
  const oldChecks=nativeByBond.get(spec.id).records.map(r=>({diagnosticRecordId:r.id,oldPhysicalPointMember:(r.solidTriangles||r.triangles).some(t=>on(old.child.point,t))}));assert.ok(oldChecks.every(r=>!r.oldPhysicalPointMember));
  const diff=side=>Object.keys({...old[side],...newEnds[side]}).filter(k=>!same(old[side][k],newEnds[side][k])).map(field=>({field,old:old[side][field]??null,proposed:newEnds[side][field]??null}));
  proposal={version:1,id:spec.id+'/prebirth-source-alternative-v1',baseBondId:spec.id,status:'PRE_BIRTH_SOURCE_ALTERNATIVE_UNREVIEWED',approvalRequired:true,
   kind:old.kind,direction:old.direction,oldBondRef:{path:'inputs/bond-snapshot.json',pointer:spec.oldBondPointer},oldCertificateRef:old.proofRef,oldCertificatePointer:old.proofPointer,
   proposedBond:{id:old.id,kind:old.kind,direction:old.direction,proofKind:'PRE_BIRTH_ALTERNATIVE_UNREVIEWED',proofRef:null,proofPointer:null,...newEnds},
   tupleDiff:{parent:diff('parent'),child:diff('child')},unchangedParentPreferred:selected.unchangedParent,
   parentChangeJustification:selected.unchangedParent?null:{reason:'All unchanged-parent candidates failed the required source/native/thermal conditions; changed only the named original parent tuple on the same interface.',
    unchangedParentCandidates:phaseCounts.unchangedParent,unchangedParentRefusals,parentRemainsOriginalAndCold:true,parentBindingPlan:'UNBOUND_FOR_NEW_PARENT_TUPLE; old mapping cleared, no absent parent blueprint fabricated.'},
   sourceWitness:w,nativePhysicalAndThermalEvidence:selected.native,
   negativeControls:{oldChildPointStillUnowned:oldChecks,wrongOriginalChildPrimitive:{primitive:wrongOriginal,pointMember:false},wrongNativePhysicalPrimitive:{diagnosticPrimitive:wrongNative,pointMember:false},
    wrongSavedCell:{diagnosticRecordId:wrongRecord.id,sourceCell:wrongRecord.sourceCell,pointMember:false,sameSelectedCell:false},beyondDistanceRule:far},
   quantity:spec.quantity,preBirthOnly:true,afterBirthRetargeting:false,prospectiveSourceRevision:null,prospectiveNativeIds:{parent:null,child:null},runtimePolicyIntake:false,
   unchangedInvariants:['original parts/owners/components','bond kind and direction','own selector bounds','all original/native buffers','Float32/source frames','quantities/finishes','API tolerances','all other 35 tuples','old certificates/null mappings'],
   search:{originalFacetPairs:pairs.size,phaseCounts,failures}};
 }else proposal={version:1,id:spec.id+'/prebirth-source-alternative-v1',baseBondId:spec.id,status:'UNPROVED',reason:'NO_QUALIFIED_ALTERNATIVE_WITHIN_FROZEN_CANDIDATE_BOUNDS',oldBondRef:{path:'inputs/bond-snapshot.json',pointer:spec.oldBondPointer},oldBondUnchanged:true,quantity:spec.quantity,
  search:{originalFacetPairs:pairs.size,phaseCounts,failures},preBirthOnly:true,prospectiveNativeIds:{parent:null,child:null},runtimePolicyIntake:false};
 proposal.planSha256=sha(local('plan.json'));proposal.inputPinsSha256=sha(fs.readFileSync(path.join(HERE,'input-pins.json')));
 const name='proposal-'+spec.id+'.json';fs.writeFileSync(path.join(HERE,name),JSON.stringify(proposal)+'\n',{flag:'wx'});outcomes.push({id:spec.id,path:name,status:proposal.status,sha256:sha(fs.readFileSync(path.join(HERE,name))),originalFacetPairs:pairs.size,unchangedParent:proposal.unchangedParentPreferred??null});
}
assert.ok(maxPatchTriangles+maxMappedTriangles+8<=252);
const summary={version:1,result:outcomes.every(r=>r.status==='PRE_BIRTH_SOURCE_ALTERNATIVE_UNREVIEWED')?'TWO_PRE_BIRTH_SOURCE_PROPOSALS':'BOUNDED_ALTERNATIVE_ATTEMPT_WITH_REFUSALS',outcomes,
 counts:{originalParts:4,originalPhysicalTriangles:48,savedNativeRecords:12,savedNativePhysicalTriangles:176,savedNativeThermalTriangles:32,blueprintTriangles:4,
  originalFacetPairsExamined:facetPairs,originalFacetPairLimit:288,borrowedShapes:baseShapes,borrowedTriangles:baseTriangles,scratchShapeReservation:2,scratchTriangleReservation:252,
  boundedWorkingShapes:32,boundedWorkingTriangles:512,maxObservedOriginalContactPatchTriangles:maxPatchTriangles,maxObservedCellClipTriangles:maxMappedTriangles,
  sourceTransforms:0,geometryFactories:0,nativeCompiles:0,supportSolves:0,trials:0,clockSteps:0,renderers:0,builds:0,oldNativeAllowancesReplayed:0},
 protected:{oldBondTuples:37,otherBondTuplesUnchanged:35,oldCertificatesAndNullMappingsUnchanged:true,stockUnchanged:true,runtimePolicyUnchanged:true},
 productionReadiness:'NOT_ADMITTED_INDEPENDENT_REVIEW_AND_NEW_BEFORE_BIRTH_REVISION_REQUIRED',prospectiveNativeIds:null,
 cost:{workerCpu:process.cpuUsage(cpu),workerElapsedMs:Number(process.hrtime.bigint()-started)/1e6}};
fs.writeFileSync(path.join(HERE,'summary.json'),JSON.stringify(summary)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:summary.result,outcomes,counts:summary.counts,workerElapsedMs:summary.cost.workerElapsedMs}));
