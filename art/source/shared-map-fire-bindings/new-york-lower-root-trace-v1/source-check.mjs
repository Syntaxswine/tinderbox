// One finite source cohort. No native producer, world, clock, render or compiler.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=n=>fs.readFileSync(path.join(HERE,n));
const pins=JSON.parse(read('input-pins.json'));
function local(n){const b=read(n);assert.equal(sha(b),pins.local.find(p=>p.path===n).sha256);return b;}
function bytes(n){const b=fs.readFileSync(path.join(ROOT,n));assert.equal(sha(b),pins.dependencies.find(p=>p.path===n).sha256);return b;}
const dependency=n=>JSON.parse(bytes(n)),plan=JSON.parse(local('plan.json'));
assert.ok(plan.instances.length<=64&&plan.relationships.length<=128);
for(const g of plan.geometries){const p=pins.dependencies.find(p=>p.path===g.path);assert.ok(p);g.sha256=p.sha256;g.bytes=p.bytes;}
const started=process.hrtime.bigint(),cpu=process.cpuUsage();
const guard=()=>{if(Number(process.hrtime.bigint()-started)/1e9>55)throw Error('Finite source cohort deadline reached');};
const context=dependency('art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/predicate-context.json');
assert.equal(sha(context.geometry.moduleText),context.geometry.sourceSha256);assert.equal(sha(context.support.closureText),context.support.closureSha256);
const G=await import('data:text/javascript;base64,'+Buffer.from(context.geometry.moduleText).toString('base64'));assert.equal(G.EPS,1e-7);
const touching=Function('G','const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+context.support.closureText+'\nreturn touching;')(G);
const cc=dependency('art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/component-context.json');
for(const [key,hash] of [['declaration','declarationSha256'],['function','functionSha256'],['canonicalNormal','canonicalNormalSha256']])assert.equal(sha(cc[key]),cc[hash]);
const components=Function('triangleArea',cc.declaration+'\n'+cc.function.replace(/^export /,'')+'\nreturn originalMaterialComponents;')(G.triangleArea);
const normal=Function('cross','sub',cc.canonicalNormal+'\nreturn normal;')(G.cross,G.sub);
const producer=dependency('art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/source-producer-context.json');
assert.equal(sha(producer.functionText),producer.functionSha256);
const sourceTriangles=Function(producer.functionText+'\nreturn sourceTriangles;')();
const representative=bytes('art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/representative.mjs').toString();
const a=representative.indexOf('const finite=p=>'),b=representative.indexOf('const block=pinned(');assert.ok(a>=0&&b>a);
const helper=representative.slice(a,b);assert.equal(sha(helper),pins.partHelper.sha256);
const h=Function('G','normal','plan','guard','dependency','sourceTriangles','sha','assert','components',helper+'\nreturn {part,parts,rawCache,finite,on,key,same,within,shape,binaryHash};')(G,normal,plan,guard,dependency,sourceTriangles,sha,assert,components);
const methodPath='art/source/shared-map-fire-bindings/cornice-six-source-representatives-v1/donor-facet-method.mjs.txt';
const block=bytes(methodPath).toString();assert.equal(sha(block),'5524fa0bb40139e90d5f8377ee8c3a681d5d95aa45b9b1f05a2b17ca8eb17ae2');
const method=Function('G','touching','assert','plan','part','guard','finite','on','key','normal','same','within','shape',block+'\nreturn {calculate,validate};')(G,touching,assert,plan,h.part,guard,h.finite,h.on,h.key,normal,h.same,h.within,h.shape);
// The only source transformation pass. All later operations reuse these objects.
for(const p of plan.instances){guard();h.part(p.id);}
assert.equal(h.parts.size,plan.instances.length);
const results=[];
for(const rel of plan.relationships){
 guard();const ends=[h.part(rel.parent),h.part(rel.child)],endpointBounds=ends.map(p=>G.bounds(p.world.ts.flat()));
 const selector={min:[0,1,2].map(i=>Math.max(...endpointBounds.map(b=>b.min[i]))),max:[0,1,2].map(i=>Math.min(...endpointBounds.map(b=>b.max[i])))};
 const historical=rel.historicalEvidence.find(e=>e.record.evidence?.worldWitness)?.record.evidence??{};
 const row={id:rel.id,parent:rel.parent,child:rel.child,relationship:rel.id,selector,endpointBounds,historical};
 const result=method.calculate(row);
 if(result.status==='source-contact-proposed'){
  // Verify the saved contact immediately, reusing the same transformed buffers.
  assert.deepEqual(method.validate(row,result.contact,ends),result.checks);
  result.canonicalNormalFloat64LittleEndianSha256=ends.map((p,i)=>h.binaryHash([normal(p.world.ts[result.contact.primitives[i]])]));
 }
 results.push({id:rel.id,candidatePointer:rel.candidatePointer,parentOwner:rel.parentOwner,childOwner:rel.childOwner,direction:rel.direction,
  sourceSelector:{construction:rel.newSelectorRule,originalSelector:null,actualEndpointBounds:endpointBounds,selector,
   empty:selector.min.some((v,i)=>v>selector.max[i]),axisSeparationsMetres:selector.min.map((v,i)=>Math.max(v-selector.max[i],0))},
  originalHistoryRef:{plan:'plan.json',pointer:'/relationships/'+results.length},result});
}
const anchors=[];
for(const spec of plan.instances)for(const [i,anchor] of spec.originalMetadata.anchors.entries()){
 guard();const p=h.part(spec.id),faces=p.indices.filter(n=>p.world.ts[n].every(v=>v[1]===anchor.elevation)&&G.triangleArea(p.world.ts[n])>0);
 const primitive=faces[0],triangle=primitive===undefined?null:p.world.ts[primitive];
 const evidence=triangle?{primitive,component:p.world.comp.get(primitive),triangle,areaSquareMetres:G.triangleArea(triangle),point:G.centre(triangle),
  canonicalNormal:normal(triangle),triangleFloat64LittleEndianSha256:h.binaryHash([triangle]),exactDeclaredElevation:anchor.elevation}:null;
 if(evidence)assert.ok(h.on(evidence.point,triangle));
 anchors.push({ownerId:spec.ownerId,partId:spec.partId,sourcePointer:spec.sourceCarrierPointer+'/anchors/'+i,originalAnchor:anchor,
  status:evidence?'declared-anchor-actual-material-verified':'unproved',reason:evidence?null:'no-positive-original-face-exactly-at-declared-anchor-plane',evidence,
  scope:'Conservative positive original face at existing declared plane; no bbox inference, new anchor or native navigation claim.'});
}
const pathReports=plan.paths.map(p=>{
 const missing=[];for(let i=0;i<p.childToAncestor.length-1;i++){
  const child=p.childToAncestor[i],parent=p.childToAncestor[i+1],r=results.find(x=>x.childOwner===child&&x.parentOwner===parent);assert.ok(r);
  if(r.result.status!=='source-contact-proposed')missing.push({id:r.id,parent,child,reason:r.result.reason});
 }
 const root=anchors.find(a=>a.ownerId===p.terminal&&a.status==='declared-anchor-actual-material-verified');
 return {...p,contactProofsComplete:missing.length===0,missingContacts:missing,actualDeclaredAnchorVerified:!!root,
  status:missing.length===0&&root?'complete-source-contact-trace':'unproved',terminalBoundary:root?null:byTerminal(p.terminal)};
});
function byTerminal(owner){const p=plan.instances.find(p=>p.ownerId===owner);return {ownerId:owner,
 reason:p.originalMetadata.anchors.length?'declared-anchor-material-unproved':'no-declared-original-parent-or-anchor',sourcePointer:p.sourceCarrierPointer,
 supportResolution:p.originalMetadata.supportResolution,notInferred:'No root inferred from zero parent count, minimum bbox, adjacency or descendants.'};}
const roofReports=pathReports.filter(p=>p.id.startsWith('roof-alternative-')).map(p=>{
 const incoming=results.find(r=>r.childOwner===plan.starts[1]&&r.parentOwner===p.childToAncestor[0]);assert.ok(incoming);
 return {...p,incomingContactId:incoming.id,incomingContactStatus:incoming.result.status,
  status:incoming.result.status==='source-contact-proposed'&&p.status==='complete-source-contact-trace'?'complete-source-contact-trace':'unproved'};
});
const bothReady=pathReports[0].status==='complete-source-contact-trace'&&roofReports.some(p=>p.status==='complete-source-contact-trace');
// A newly ready result must stop before an unpinned core can be executed.
assert.equal(bothReady,false,'Unexpected complete routes: preserve evidence and stop for the single pinned existing-core evaluation; never substitute a local solver.');
const counts={distinctOriginalParts:h.parts.size,sourceTransformations:h.parts.size,transformationsPerPart:1,reusedGeometryBuffers:h.rawCache.size,
 examinedDeclaredPairs:results.length,positiveSourceContacts:results.filter(r=>r.result.status==='source-contact-proposed').length,
 unprovedSourceContacts:results.filter(r=>r.result.status==='unproved').length,declaredAnchors:anchors.length,
 actualMaterialAnchors:anchors.filter(a=>a.evidence).length,coldOriginalSupportEvaluations:0,nativeCompilations:0,nativeRecordsBound:0,nativeCellsBound:0,
 sourceTriangles:[...h.parts.values()].reduce((n,p)=>n+p.world.ts.length,0)};
const output={version:1,result:'BOUNDED_SOURCE_ROOT_REFUSAL',planSha256:sha(local('plan.json')),inputPinsSha256:sha(read('input-pins.json')),
 counts,contacts:results,anchors,corniceTrace:pathReports[0],roofAlternatives:roofReports,
 parts:[...h.parts.values()].map(p=>({partId:p.spec.partId,ownerId:p.spec.ownerId,sourceBindingPointer:p.spec.sourceBindingPointer,
  measuredBounds:G.bounds(p.world.ts.flat()),originalMetadataBounds:p.spec.bounds,proof:p.proof})),
 evaluation:{invoked:false,reason:'Both lower original rooted paths are not proved; conditional cold-core allowance unused.',existingCore:'src/simulation/original-support-ports.js',
  noReplacementSolver:true,noGraphReachabilityPretendedAsCoreResult:true},
 preserved:{originalSlots:true,originalRanges:true,effectiveOverlayChecked:true,quantities:true,frames:true,history:true,canonicalNormals:true,
  ordinaryAlternatives:true,saddleRequiredAll:true,upperLocalInterval:[49,50],saddleAndUpperNotTransformed:true},
 unexamined:'plan.json#/unexamined; references retained, no omission is a support rejection',nativeLineage:'UNBOUND',
 scope:'A named refusal for this cohort; it does not prove that no other legitimate source path exists. No stress/capacity or runtime admission claim.',
 cost:{workerCpu:process.cpuUsage(cpu),workerElapsedMs:Number(process.hrtime.bigint()-started)/1e6}};
fs.writeFileSync(path.join(HERE,'result.json'),JSON.stringify(output)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:output.result,...counts,workerElapsedMs:output.cost.workerElapsedMs}));
