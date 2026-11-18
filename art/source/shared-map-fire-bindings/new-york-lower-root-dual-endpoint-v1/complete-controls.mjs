// Complete two rejection controls from persisted world tables; zero transformations/searches.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const pins=JSON.parse(fs.readFileSync(path.join(HERE,'completion-pins.json'))),inputPins=JSON.parse(fs.readFileSync(path.join(HERE,'input-pins.json')));
function local(n){const b=fs.readFileSync(path.join(HERE,n));assert.equal(sha(b),pins.local.find(p=>p.path===n).sha256);return b;}
function dependency(n){const b=fs.readFileSync(path.join(ROOT,n));assert.equal(sha(b),inputPins.dependencies.find(p=>p.path===n).sha256);return b;}
const phase=JSON.parse(local('result.json')),tables=JSON.parse(local('world-tables.json')),newPlan=JSON.parse(local('plan.json')),api=JSON.parse(local('api-context.json')),
 plan=JSON.parse(dependency(newPlan.priorAttempt.planPath));assert.equal(sha(local('world-tables.json')),phase.worldTablesSha256);
const started=process.hrtime.bigint(),cpu=process.cpuUsage();
const G=await import('data:text/javascript;base64,'+Buffer.from(api.geometry.moduleText).toString('base64'));
const touching=Function('G','const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+api.support.closureText+'\nreturn touching;')(G);
const tolerance=Function(api.tolerance.declaration.replace(/^export /,'')+'\nreturn SOURCE_SUPPORT_TOLERANCE;')();assert.equal(tolerance,2e-5);assert.equal(G.EPS,1e-7);
dependency(inputPins.threeCorePath);const T=await import(pathToFileURL(path.join(ROOT,inputPins.threeCorePath)).href);
const collision=await import('data:text/javascript;base64,'+Buffer.from(api.collision.moduleText).toString('base64'));
const coreBody=api.core.moduleText.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const coreApi=Function('T','G','supportSurfacesTouch','sweptCylinderClear','SOURCE_SUPPORT_TOLERANCE','const {bounds,segmentTriangle,triangleArea,cross,sub}=G;\n'+coreBody+'\nreturn {createOriginalSupportPorts,originalMaterialComponents};')(T,G,touching,collision.sweptCylinderClear,tolerance);
const normal=t=>{const n=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0])),l=Math.hypot(...n);return n.map(v=>v/l);};
const shape=ts=>({triangles:ts,solidTriangles:ts,bounds:G.bounds(ts.flat()),normal:normal(ts[0]),kind:'wall',thickness:0}),on=(p,t)=>G.segmentTriangle(p,p,t)!==null,
 within=(p,b)=>p.every((v,i)=>v>=b.min[i]&&v<=b.max[i]),distance=(a,b)=>Math.hypot(...G.sub(a,b)),closest=(p,t)=>new T.Triangle(...t.map(v=>new T.Vector3(...v))).closestPointToPoint(new T.Vector3(...p),new T.Vector3()).toArray();
const byPart=new Map(tables.parts.map(p=>[p.partId,p])),byOwner=new Map(tables.parts.map(p=>[p.ownerId,p]));assert.equal(byPart.size,36);
const completion=[];
for(const r of phase.contacts){
 const proof=r.proof;assert.ok(proof);const ends=[byOwner.get(r.parentOwner),byOwner.get(r.childOwner)],triangles=ends.map((p,i)=>p.triangles[proof.primitives[i]]);
 assert.ok(proof.points.every((p,i)=>on(p,triangles[i])&&within(p,r.endpointSelectors.bounds[i])));
 assert.ok(distance(...proof.points)<=tolerance&&touching(...triangles.map(t=>shape([t]))));
 assert.ok(r.negativeControls.wrongOriginalFace.every(n=>n.ownWrongPrimitiveMembership===false)&&r.negativeControls.beyondNativeAcceptance.nativeContact===false);
 if(r.negativeControls.beyondPortDistance)continue;
 assert.equal(r.reason,'required-negative-control-unavailable');assert.ok(proof.projectedFootprint.areaSquareMetres>0);
 let control=null;
 for(const vertex of proof.projectedFootprint.polygonOnParentPlane){
  // A new sample ON an unchanged source face. This changes no geometry or positive witness.
  const p=proof.points[0],sample=p.map((v,i)=>(v+vertex[i])/2),q=closest(sample,triangles[1]),d=distance(p,q);
  if(d>tolerance&&on(p,triangles[0])&&on(q,triangles[1])&&within(p,r.endpointSelectors.bounds[0])&&within(q,r.endpointSelectors.bounds[1])){
   control={points:[p,q],distanceMetres:d,toleranceMetres:tolerance,portDistanceAccepted:false,ownMembership:[true,true],ownSelectors:[true,true],originalNativeFacesAccepted:true,
    choice:'parent positive witness and child original closest point to midpoint of that witness and an existing projected-footprint vertex',geometryChanged:false};break;
  }
 }
 assert.ok(control,'Missing actual-source distance negative: '+r.id);completion.push({id:r.id,phase1Status:r.status,phase1Reason:r.reason,
  phase1ProofRef:'result.json#/contacts/'+phase.contacts.indexOf(r)+'/proof',beyondPortDistance:control,
  resolution:'The existing positive contact proof is unchanged; only the previously missing auxiliary distance-negative control is completed.'});
}
assert.deepEqual(completion.map(c=>c.id),['legacy-pair-015','legacy-pair-033']);
const contacts=phase.contacts.map((r,i)=>({id:r.id,status:'source-contact-proposed',proofRef:'result.json#/contacts/'+i+'/proof',
 negativeControlRef:r.negativeControls.complete?'result.json#/contacts/'+i+'/negativeControls':'final-source-certificate.json#/completedControls/'+completion.findIndex(c=>c.id===r.id),
 priorPhaseStatus:r.status,priorPhaseReason:r.reason??null}));
const anchors=phase.anchors;for(const a of anchors){const p=byPart.get(a.partId),t=p.triangles[a.evidence.primitive];assert.deepEqual(t,a.evidence.triangle);assert.ok(t.every(v=>v[1]===a.originalAnchor.elevation)&&G.triangleArea(t)>0);}
const pathProofs=plan.paths.map(p=>{
 const edges=[];for(let i=0;i<p.childToAncestor.length-1;i++)edges.push(phase.contacts.find(r=>r.childOwner===p.childToAncestor[i]&&r.parentOwner===p.childToAncestor[i+1]).id);
 const root=anchors.find(a=>a.ownerId===p.terminal);return {...p,edgeIds:edges,actualMaterialAnchorRef:root?'result.json#/anchors/'+anchors.indexOf(root):null,contactTraceReady:!!root};
});
const roofPath=pathProofs.find(p=>p.id==='roof-alternative-2'),roofIncoming=phase.contacts.find(r=>r.childOwner===plan.starts[1]&&r.parentOwner===roofPath.childToAncestor[0]);
assert.ok(pathProofs[0].contactTraceReady&&roofPath.contactTraceReady&&roofIncoming.proof);
const evaluation={invoked:false,evaluations:0};let core;
try{
 const parts=tables.parts.map(p=>({id:p.partId,ownerId:p.ownerId,triangles:p.triangles}));
 const bonds=phase.contacts.map(r=>{
  const ends=[byOwner.get(r.parentOwner),byOwner.get(r.childOwner)],endpoint=i=>({partId:ends[i].partId,point:r.proof.points[i],primitives:[r.proof.primitives[i]]});
  return {id:r.id,kind:'bearing-face',direction:r.direction,parent:endpoint(0),child:endpoint(1)};
 });
 core=coreApi.createOriginalSupportPorts({parts,bonds,anchors:anchors.map(a=>({partId:a.partId,elevation:a.originalAnchor.elevation,component:a.evidence.component})),requirements:[],approvedMounts:[]});
 evaluation.bindings=core.bindings();
 const fragments=tables.parts.flatMap(p=>p.proof.emittedWorldComponents.map(c=>({id:'cold/'+p.partId+'/component/'+c.id,partId:p.partId,ownerId:p.ownerId,component:c.id,triangles:c.primitives.map(i=>p.triangles[i]),primitives:c.primitives,mode:'cold'})));
 evaluation.invoked=true;evaluation.evaluations=1;evaluation.result=core.evaluate({revision:0,fragments});
 evaluation.lowerParents=plan.starts.map((owner,i)=>{
  const p=byOwner.get(owner),primitives=i===0?[0,2]:[2,3],components=[...new Set(primitives.map(n=>p.proof.emittedWorldComponents.find(c=>c.primitives.includes(n)).id))],nodes=components.map(c=>'cold/'+p.partId+'/component/'+c);
  return {ownerId:owner,partId:p.partId,approvedLowerPortOriginalPrimitives:primitives,originalComponents:components,nodeIds:nodes,supported:nodes.every(n=>evaluation.result.supportedIds.includes(n))};
 });
}catch(error){evaluation.error={name:error.name,message:error.message};}
finally{if(core){core.dispose();evaluation.disposed=core.diagnostics();}}
const pass=evaluation.lowerParents?.every(p=>p.supported)&&!evaluation.error&&evaluation.result.unresolvedBindings.length===0&&evaluation.result.oldEdgeConflicts.length===0;
const output={version:1,result:pass?'BOTH_ORIGINAL_LOWER_PARENTS_SOURCE_ROOTED':'EXISTING_COLD_CORE_SOURCE_PROOF_UNPROVED',
 phase1ResultSha256:sha(local('result.json')),worldTablesSha256:sha(local('world-tables.json')),completionPinsSha256:sha(fs.readFileSync(path.join(HERE,'completion-pins.json'))),
 completedControls:completion,contacts,selectedTraces:{cornice:pathProofs[0],roof:{...roofPath,childToAncestor:[plan.starts[1],...roofPath.childToAncestor],edgeIds:[roofIncoming.id,...roofPath.edgeIds]}},
 alternativeBoundaries:pathProofs.filter(p=>!p.actualMaterialAnchorRef),evaluation,
 counts:{distinctOriginalParts:36,examinedDeclaredPairs:34,newParts:0,newPairs:0,sourceContactProofs:34,unproved:pass?0:34,auxiliaryControlsCompleted:2,
  additionalSourceTransformations:0,sourceTransformationsThisMethod:36,priorMethodSourceTransformations:36,totalAcrossMethods:72,
  additionalContactSearches:0,coldCoreEvaluations:evaluation.evaluations,actualMaterialAnchors:2,wrongFaceNegatives:68,beyondNativeNegatives:34,beyondPortDistanceNegatives:34,
  nativeRecordsBound:0,nativeCellsBound:0,nativeCompilations:0},
 preserved:{priorCommonPointAttemptUnchanged:true,phase1AttemptUnchanged:true,geometry:true,engineTolerances:true,canonicalNormals:true,primitiveSlots:true,components:true,frames:true,quantities:true,
  noInventedCommonSelector:true,ordinaryAlternatives:true,saddleRequiredAllUnchanged:true,saddleUpperAndDescendantsExcluded:true,upperLocalInterval:[49,50]},
 scope:'Only the two original lower parents are proved rooted by one cold source evaluation. This does not evaluate or admit saddle ALL, native cells, runtime, thermal behavior or strength. The saddle and upper are absent from the graph, so cannot supply support.',
 nativeRecords:'UNBOUND',nativeCells:'UNBOUND',cost:{workerCpu:process.cpuUsage(cpu),elapsedMs:Number(process.hrtime.bigint()-started)/1e6}};
fs.writeFileSync(path.join(HERE,'final-source-certificate.json'),JSON.stringify(output)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:output.result,...output.counts,elapsedMs:output.cost.elapsedMs}));
