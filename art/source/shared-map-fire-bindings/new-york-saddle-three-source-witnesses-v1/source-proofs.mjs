// Exactly three fixed interfaces from approved saved world arrays. No transforms/solver/native producer.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const pins=JSON.parse(fs.readFileSync(path.join(HERE,'input-pins.json')));
function local(n){const b=fs.readFileSync(path.join(HERE,n));assert.equal(sha(b),pins.local.find(p=>p.path===n).sha256);return b;}
function bytes(n){const b=fs.readFileSync(path.join(ROOT,n));assert.equal(sha(b),pins.dependencies.find(p=>p.path===n).sha256);return b;}
const plan=JSON.parse(local('plan.json')),saved=JSON.parse(bytes(plan.savedWorldArchive.path)),manifest=JSON.parse(bytes(plan.manifest.path));
assert.equal(plan.parts.length,4);assert.equal(plan.ports.length,3);assert.equal(plan.limits.sourceTransformsPlanned,0);
const started=process.hrtime.bigint(),cpu=process.cpuUsage(),guard=()=>{if(Number(process.hrtime.bigint()-started)/1e9>25)throw Error('Three fixed source interfaces deadline reached');};
const api=JSON.parse(bytes('art/source/shared-map-fire-bindings/new-york-lower-root-dual-endpoint-v1/api-context.json'));
assert.equal(sha(api.geometry.moduleText),api.geometry.sha256);assert.equal(sha(api.support.closureText),api.support.closureSha256);
const G=await import('data:text/javascript;base64,'+Buffer.from(api.geometry.moduleText).toString('base64'));assert.equal(G.EPS,1e-7);
const nativeTouch=Function('G','const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+api.support.closureText+'\nreturn touching;')(G);
const tolerance=Function(api.tolerance.declaration.replace(/^export /,'')+'\nreturn SOURCE_SUPPORT_TOLERANCE;')();assert.equal(tolerance,2e-5);
bytes(pins.threeCorePath);const T=await import(pathToFileURL(path.join(ROOT,pins.threeCorePath)).href);
const cc=JSON.parse(bytes('art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/component-context.json'));
for(const [name,hash]of [['declaration','declarationSha256'],['function','functionSha256'],['canonicalNormal','canonicalNormalSha256']])assert.equal(sha(cc[name]),cc[hash]);
const components=Function('triangleArea',cc.declaration+'\n'+cc.function.replace(/^export /,'')+'\nreturn originalMaterialComponents;')(G.triangleArea);
const normal=Function('cross','sub',cc.canonicalNormal+'\nreturn normal;')(G.cross,G.sub);
const source=bytes('art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/donor-facet-method.mjs.txt').toString();
const begin=source.indexOf('function overlapPolygon('),end=source.indexOf('function pairPoints('),overlapSource=source.slice(begin,end);assert.equal(sha(overlapSource),pins.overlapHelper.sha256);
const overlapPolygon=Function('G',overlapSource+'\nreturn overlapPolygon;')(G);
const mapping=JSON.parse(bytes(manifest.physicalRenderMapping.path)),body=manifest.members[0].id;
const binaryHash=ts=>{const values=ts.flat(2),b=Buffer.alloc(values.length*8);values.forEach((v,i)=>b.writeDoubleLE(v,i*8));return sha(b);};
const partByOwner=new Map();
for(const spec of plan.parts){
 guard();const triangles=spec.ownerId===body?Array.from({length:16},(_,i)=>saved.actualPhysicalIndex.slice(i*3,i*3+3).map(j=>saved.actualPhysicalWorldVertices[j])):saved.originalParentWorldTriangles[spec.ownerId];
 assert.equal(triangles.length,spec.physicalTriangleCount);const topology=components(triangles),comp=new Map();for(const c of topology)for(const i of c.primitives)comp.set(i,c.id);
 assert.equal(comp.size,triangles.length);partByOwner.set(spec.ownerId,{spec,triangles,topology,comp,worldTrianglesFloat64LittleEndianSha256:binaryHash(triangles)});
}
assert.equal([...partByOwner.values()].reduce((n,p)=>n+p.triangles.length,0),48);
const world={version:1,scope:'Four approved saved physical shapes; source cache only, no transforms or native IDs.',archive:plan.savedWorldArchive,
 parts:[...partByOwner.values()].map(p=>({partId:p.spec.partId,ownerId:p.spec.ownerId,sourceWorldRef:p.spec.sourceWorldRef,triangles:p.triangles,components:p.topology,worldTrianglesFloat64LittleEndianSha256:p.worldTrianglesFloat64LittleEndianSha256})),
 counts:{parts:4,physicalTriangles:48,sourceTransforms:0,rawGeometryBuffersCreated:0,nativeGeometryObjectsCreated:0}};
fs.writeFileSync(path.join(HERE,'world-tables.json'),JSON.stringify(world)+'\n',{flag:'wx'});
const worldHash=sha(fs.readFileSync(path.join(HERE,'world-tables.json')));
const on=(p,t)=>G.segmentTriangle(p,p,t)!==null,within=(p,b)=>p.every((v,i)=>v>=b.min[i]&&v<=b.max[i]),distance=(a,b)=>Math.hypot(...G.sub(a,b)),
 closest=(p,t)=>new T.Triangle(...t.map(v=>new T.Vector3(...v))).closestPointToPoint(new T.Vector3(...p),new T.Vector3()).toArray(),
 bary=(p,t)=>new T.Triangle(...t.map(v=>new T.Vector3(...v))).getBarycoord(new T.Vector3(...p),new T.Vector3()).toArray(),
 shape=ts=>({triangles:ts,solidTriangles:ts,bounds:G.bounds(ts.flat()),normal:normal(ts[0]),kind:'wall',thickness:0}),
 polygonArea=poly=>poly.length<3?0:poly.slice(1,-1).reduce((s,v,i)=>s+G.triangleArea([poly[0],v,poly[i+2]]),0);
let numericNativePredicateCalls=0;
const touching=(a,b)=>{numericNativePredicateCalls++;return nativeTouch(a,b);};
function endpoints(port){
 return [port.parentOwnerId,port.childOwnerId].map(owner=>{
  const part=partByOwner.get(owner),allowed=owner===body?port.declaredPrimitiveSets.saddle:port.declaredPrimitiveSets.original;
  const selector=G.bounds(allowed.flatMap(i=>part.triangles[i]));
  if(port.upperIntervalX&&owner!==body){selector.min[0]=Math.max(selector.min[0],port.upperIntervalX[0]);selector.max[0]=Math.min(selector.max[0],port.upperIntervalX[1]);}
  assert.ok(selector.min.every((v,i)=>v<=selector.max[i]));
  return {part,allowed,selector};
 });
}
function derive(port,ends){
 const stats={fixedOriginalPrimitivePairsExamined:0,nativeRejectedPairs:0,positiveProjectedPolygons:0};
 for(const i of ends[0].allowed)for(const j of ends[1].allowed){
  guard();stats.fixedOriginalPrimitivePairsExamined++;const ts=[ends[0].part.triangles[i],ends[1].part.triangles[j]];
  if(!touching(...ts.map(t=>shape([t])))){stats.nativeRejectedPairs++;continue;}
  const clipped=ts.map((t,k)=>G.clipTriangle(t,ends[k].selector).filter(t=>G.triangleArea(t)>0));
  for(const a of clipped[0])for(const b of clipped[1]){
   const n=normal(ts[0]),projected=b.map(p=>G.sub(p,G.mul(n,G.dot(G.sub(p,ts[0][0]),n)))),poly=overlapPolygon(projected,a),area=polygonArea(poly);
   if(!(area>0))continue;stats.positiveProjectedPolygons++;
   const p=closest(G.centre(poly),ts[0]),q=closest(p,ts[1]),points=[p,q],coords=points.map((p,k)=>bary(p,ts[k]));
   if(!points.every((p,k)=>on(p,ts[k])&&within(p,ends[k].selector))||coords.some(b=>b.some(v=>!(v>0)))||distance(p,q)>tolerance)continue;
   const clippedNative=touching(...clipped.map(shape));if(!clippedNative)continue;
   const primitives=[i,j],gap=G.sub(q,p),d=Math.hypot(...gap);
   return {status:'SOURCE_WITNESS_PROPOSAL',stats,primitives,points,normals:ts.map(normal),components:primitives.map((i,k)=>ends[k].part.comp.get(i)),
    ownBarycentricCoordinates:coords,ownSurfaceMembership:[true,true],ownSelectorMembership:[true,true],nativeOriginalTriangleContact:true,nativeOwnClippedTriangleContact:true,
    projectedFootprint:{areaSquareMetres:area,polygonOnParentPlane:poly,method:'Unchanged overlapPolygon on child projection and parent own clipped facet; selector boxes remain separate.'},
    gapVectorChildMinusParent:gap,gapMetres:d,gapDirection:d?gap.map(v=>v/d):[0,0,0],signedParentNormalGap:G.dot(gap,normal(ts[0])),
    endpointNormalCrossMagnitude:Math.hypot(...G.cross(...ts.map(normal))),ownPlaneResidualMetres:points.map((p,k)=>Math.abs(G.dot(G.sub(p,ts[k][0]),normal(ts[k])))),
    existingPortDistanceRule:{toleranceMetres:tolerance,accepted:true},membershipToleranceMetres:G.EPS,
    selectedOriginalTriangles:ts,selectedTrianglesFloat64LittleEndianSha256:ts.map(t=>binaryHash([t])),canonicalNormalFloat64LittleEndianSha256:ts.map(t=>binaryHash([normal(t)]))};
  }
 }
 return {status:'UNPROVED',reason:stats.nativeRejectedPairs===stats.fixedOriginalPrimitivePairsExamined?'unchanged-native-predicate-rejected-all-fixed-pairs':'no-own-interior-positive-footprint-witness-within-existing-distance-rule',stats};
}
function negatives(ends,proof){
 const wrong=ends.map((end,k)=>{
  const primitive=end.part.triangles.findIndex((t,i)=>!end.allowed.includes(i)&&!on(proof.points[k],t));
  assert.ok(primitive>=0);assert.equal(on(proof.points[k],end.part.triangles[primitive]),false);
  return {partId:end.part.spec.partId,ownerId:end.part.spec.ownerId,wrongOriginalPrimitive:primitive,declaredPrimitiveSet:end.allowed,
   point:proof.points[k],wrongFaceOwnMembership:false,wrongFaceAllowedByPort:false,geometryChanged:false};
 });
 let separated=null;
 for(const v of proof.projectedFootprint.polygonOnParentPlane){
  const p=proof.points[0],sample=p.map((x,i)=>(x+v[i])/2),q=closest(sample,proof.selectedOriginalTriangles[1]),d=distance(p,q);
  if(d>tolerance&&on(p,proof.selectedOriginalTriangles[0])&&on(q,proof.selectedOriginalTriangles[1])&&within(p,ends[0].selector)&&within(q,ends[1].selector)){
   separated={points:[p,q],distanceMetres:d,existingToleranceMetres:tolerance,portDistanceAccepted:false,ownSurfaceMembership:[true,true],ownSelectorMembership:[true,true],
    sameOriginalFaceNativeContactAccepted:true,sampleRule:'Parent positive witness; child original closest point to midpoint with one existing footprint vertex. Geometry/positive witness unchanged.'};break;
  }
 }
 return {wrongOriginalFaces:wrong,beyondPortDistance:separated,complete:!!separated};
}
const results=[];
for(const port of plan.ports){
 const callsBefore=numericNativePredicateCalls,ends=endpoints(port),derived=derive(port,ends);
 let controls=null;if(derived.status==='SOURCE_WITNESS_PROPOSAL'){controls=negatives(ends,derived);if(!controls.complete){derived.status='UNPROVED';derived.reason='distance-negative-control-unavailable';}}
 const names=['parent','child'],ep={};
 for(let k=0;k<2;k++){
  const end=ends[k],selected=derived.primitives?.[k];
  ep[names[k]]={ownerId:end.part.spec.ownerId,qualifiedOwnerId:end.part.spec.declaredPilotPart.ownerId,partId:end.part.spec.partId,
   declaredSourcePartGlobalIndex:end.part.spec.declaredPilotPart.globalIndex,globalIndexStatus:'Existing committed source metadata ordinal; no native ID.',
   sourceRange:end.part.spec.sourceRange,sourceWorldRef:end.part.spec.sourceWorldRef,declaredPrimitiveIds:end.allowed,
   primitive:selected??null,component:derived.components?.[k]??null,point:derived.points?.[k]??null,normal:derived.normals?.[k]??null,
   selector:end.selector,selectorConstruction:port.selectorConstruction,upperOriginalIntervalX:end.part.spec.ownerId!==body?port.upperIntervalX:null,
   approvedSaddleSourceFaceId:end.part.spec.ownerId===body&&selected!==undefined?mapping.sourceFaceTriangles.find(f=>f.physicalTriangleIds.includes(selected)).sourceFaceId:null,
   worldPartFloat64LittleEndianSha256:end.part.worldTrianglesFloat64LittleEndianSha256,nativeRecordId:null,nativeCell:null,nativeSurfaceId:null};
 }
 const proof={version:1,id:port.id+'/source-witness-v1',portId:port.id,status:derived.status,approval:'PROPOSAL_FOR_INDEPENDENT_ARCHITECT_REVIEW',
  direction:port.direction,manifestRef:{...plan.manifest,pointer:port.manifestPointer},approvedSourceCommit:plan.approvedSourceCommit,
  planSha256:sha(local('plan.json')),worldTablesSha256:worldHash,declaredPrimitiveSets:port.declaredPrimitiveSets,
  ...ep,geometryWitness:derived,negativeControls:controls,
  fixedPortSemantics:plan.semantics,canonicalSaddleQuantityRef:plan.canonicalSaddleQuantity,originalOwnerQuantitiesRef:'plan.json#/parts',
  nativeBindings:'UNBOUND',counts:{selectedSourceParts:2,interfaces:1,sourceTransforms:0,supportSolves:0,nativeCompiles:0,clockSteps:0,
   numericNativePredicateCalls:numericNativePredicateCalls-callsBefore,wrongFaceNegatives:controls?.wrongOriginalFaces.length??0,distanceNegatives:controls?.beyondPortDistance?1:0},
  scope:'Independent fixed-interface source proposal. No roots/support/ALL solve, native lineage, compiler, runtime approval or game integration.'};
 const filename='proof-'+port.name+'.json';fs.writeFileSync(path.join(HERE,filename),JSON.stringify(proof)+'\n',{flag:'wx'});
 results.push({portId:port.id,path:filename,status:proof.status,sha256:sha(fs.readFileSync(path.join(HERE,filename))),primitivePair:derived.primitives??null,gapMetres:derived.gapMetres??null,projectedArea:derived.projectedFootprint?.areaSquareMetres??null,stats:derived.stats});
}
const report={version:1,result:results.every(p=>p.status==='SOURCE_WITNESS_PROPOSAL')?'THREE_INDEPENDENT_SOURCE_PROPOSALS':'FIXED_INTERFACE_SOURCE_PROOF_UNPROVED',proofs:results,
 counts:{parts:4,originalPhysicalTriangles:48,interfaces:3,sourceTransforms:0,savedWorldBuffersReused:4,materialComponentCalculations:4,
  fixedOriginalPrimitivePairsExamined:results.reduce((n,r)=>n+r.stats.fixedOriginalPrimitivePairsExamined,0),numericNativePredicateCalls,
  wrongFaceNegatives:results.filter(r=>r.status==='SOURCE_WITNESS_PROPOSAL').length*2,distanceNegatives:results.filter(r=>r.status==='SOURCE_WITNESS_PROPOSAL').length,
  bufferGeometryObjectsCreated:0,historicalNativeExperimentsRerun:0,nativeCompiles:0,supportSolves:0,clockSteps:0,renderers:0,builds:0,registeredRuntimeStock:0},
 canonicalSaddleQuantity:plan.canonicalSaddleQuantity,nativeBindings:'UNBOUND',runtimeApprovalChanged:false,
 cost:{workerCpu:process.cpuUsage(cpu),workerElapsedMs:Number(process.hrtime.bigint()-started)/1e6}};
fs.writeFileSync(path.join(HERE,'summary.json'),JSON.stringify(report)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:report.result,...report.counts,proofs:results.map(r=>({port:r.path,status:r.status,gap:r.gapMetres,area:r.projectedArea})),workerElapsedMs:report.cost.workerElapsedMs}));
