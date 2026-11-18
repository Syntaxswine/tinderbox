// Offline original-face normalization only. No runtime factories, native compiler or decoder imports.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const HERE=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')),sha=b=>createHash('sha256').update(b).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(HERE,name))),pins=read('input-pins.json'),planRaw=fs.readFileSync(path.join(HERE,'.cache/plan.json'));assert.equal(sha(planRaw),pins.planSha256);const plan=JSON.parse(planRaw);
const mode=process.argv[2],page=Number(process.argv[3]),descriptor=plan.pages[page];assert.ok(['page','verify'].includes(mode)&&Number.isSafeInteger(page)&&descriptor);
const regionById=new Map(plan.regions.map(r=>[r.id,r])),rows=descriptor.regionIds.map(id=>regionById.get(id)),start=plan.pages.slice(0,page).reduce((n,p)=>n+p.regionIds.length,0);assert.ok(rows.length&&rows.length<=256&&rows.every(Boolean));
const cpuStart=process.cpuUsage(),workerStarted=Date.now(),deadline=Date.now()+55000,guard=()=>{if(Date.now()>deadline)throw Error('Finite page reached internal 55-second deadline');};
const cached=pin=>{const b=fs.readFileSync(path.join(HERE,pin.cache));assert.equal(sha(b),pin.sha256||pin.rawSha256);return JSON.parse(b);};
const context=cached(plan.contact),component=cached(plan.component);assert.equal(sha(context.geometry.moduleText),context.geometry.sourceSha256);assert.equal(sha(context.support.closureText),context.support.closureSha256);
assert.equal(sha(component.declaration),component.declarationSha256);assert.equal(sha(component.function),component.functionSha256);assert.equal(component.functionSha256,pins.componentFunctionSha256);
const G=await import('data:text/javascript;base64,'+Buffer.from(context.geometry.moduleText).toString('base64'));assert.equal(G.EPS,1e-7);
const touching=Function('G','const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+context.support.closureText+'\nreturn touching;')(G);
const components=Function('triangleArea',component.declaration+'\n'+component.function.replace(/^export /,'')+'\nreturn originalMaterialComponents;')(G.triangleArea);
assert.equal(sha(plan.normalDeclaration),plan.normalDeclarationSha256);
const canonicalNormal=Function('cross','sub',plan.normalDeclaration+'\nreturn normal;')(G.cross,G.sub);
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),on=(p,t)=>G.segmentTriangle(p,p,t)!==null,key=p=>p.join(','),normal=t=>G.unit(G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]))),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const within=(p,b)=>p.every((v,i)=>v>=b.min[i]&&v<=b.max[i]),shape=ts=>({triangles:ts,solidTriangles:ts,bounds:G.bounds(ts.flat()),normal:normal(ts[0]),kind:'wall',thickness:0});
const binaryHash=ts=>{const values=ts.flat(2),b=Buffer.alloc(values.length*8);values.forEach((v,i)=>b.writeDoubleLE(v,i*8));return sha(b);};
function dictionary(value){
 const data=Buffer.from(JSON.stringify(value)+'\n'),id=sha(data),file=path.join(HERE,'dictionaries',id+'.json');
 if(fs.existsSync(file))assert.ok(fs.readFileSync(file).equals(data));else{assert.equal(mode,'page','Verification cannot manufacture a missing dictionary');fs.writeFileSync(file,data,{flag:'wx'});}return id;
}
const geometryCache=new Map(),worldCache=new Map(),parts=new Map();
function part(id){
 if(parts.has(id))return parts.get(id);guard();const spec=plan.instances[id],geom=plan.geometries[spec.geometry];
 if(!geometryCache.has(spec.geometry)){
  const raw=cached(geom),attr=raw.attributes.position;assert.equal(attr.itemSize,3);
  const pos=attr.array,ind=Array.isArray(raw.index)?raw.index:raw.index?.array||Array.from({length:pos.length/3},(_,i)=>i),rawTriangles=[];assert.equal(ind.length%3,0);
  for(let i=0;i<ind.length;i+=3)rawTriangles.push([0,1,2].map(k=>pos.slice(3*ind[i+k],3*ind[i+k]+3)));
  let topology=[],failure=null;try{topology=components(rawTriangles);}catch(e){failure={code:'original-component-unresolved',stage:'raw-original',message:e.message};}
  geometryCache.set(spec.geometry,{ts:rawTriangles,topology,failure,hash:binaryHash(rawTriangles)});
 }
 const raw=geometryCache.get(spec.geometry),cacheKey=spec.geometry+'@'+spec.emittedWorldMatrix.join(',');let world=worldCache.get(cacheKey);
 if(!world){
  const m=spec.emittedWorldMatrix,ts=raw.ts.map(t=>t.map(v=>[0,1,2].map(axis=>{let n=0;for(let j=0;j<3;j++)n+=m[j*4+axis]*v[j];return n+m[12+axis];})));
  let topology=[],failure=raw.failure,topologyKey=null,nonmaterial=[];
  if(!failure){try{topology=components(ts);}catch(e){failure={code:'original-component-unresolved',stage:'emitted-world',message:e.message};}}
  const rawPositive=new Set(raw.topology.flatMap(c=>c.primitives)),worldPositive=new Set(topology.flatMap(c=>c.primitives));
  const rawEmpty=raw.ts.map((_,i)=>i).filter(i=>!rawPositive.has(i)),worldEmpty=ts.map((_,i)=>i).filter(i=>!worldPositive.has(i));
  const partition=c=>c.map(v=>({id:v.id,primitives:v.primitives})),withoutClosed=c=>c.map(({closed,...rest})=>rest);
  const samePartitions=!failure&&same(partition(raw.topology),partition(topology)),sameNonmaterial=!failure&&same(rawEmpty,worldEmpty);
  const closedFlagsDiffer=!failure&&raw.topology.length===topology.length&&raw.topology.some((c,i)=>c.closed!==topology[i].closed);
  const onlyClosedFlags=!failure&&samePartitions&&sameNonmaterial&&closedFlagsDiffer&&same(withoutClosed(raw.topology),withoutClosed(topology));
  const priorBlocked=plan.blockedInstanceIds.includes(id);
  let admission=failure?'unresolved':same(topology,raw.topology)?'unchanged-frame-classification':onlyClosedFlags&&priorBlocked?'same-partition-closed-flags-only':'closed-flags-only-condition-not-met';
  if(!failure&&admission==='closed-flags-only-condition-not-met')failure={code:'closed-flags-only-condition-not-met',stage:'raw-world-incompatible',message:'Positive partitions/nonmaterial ordinals differ, discrepancy is not solely closed flags, or source instance was not previously blocked'};
  const frameKey=dictionary({rawGeometrySha256:geom.rawSha256,componentFunctionSha256:pins.componentFunctionSha256,raw:{components:raw.topology,nonmaterialPrimitives:rawEmpty},emittedWorld:{components:topology,nonmaterialPrimitives:worldEmpty},samePositivePrimitivePartitions:samePartitions,sameNonmaterialOrdinals:sameNonmaterial,closedFlagsDiffer,soleDiscrepancyClosedFlags:onlyClosedFlags,admission,actualEmittedWorldComponentsUsed:!failure,volumeBearingClosedSolidClaim:false,rawNonmaterialFaces:!raw.failure?rawEmpty.map(primitive=>({primitive,rawFaceFloat64LittleEndianSha256:binaryHash([raw.ts[primitive]])})):[],failure});
  const comp=new Map();if(!failure){
   for(const c of topology)for(const i of c.primitives)comp.set(i,c.id);
   nonmaterial=ts.map((_,i)=>i).filter(i=>!comp.has(i));
   for(const i of nonmaterial){const t=raw.ts[i];assert.ok(t.every(finite)&&G.triangleArea(t)===0&&t.some((a,j)=>t.some((b,k)=>j<k&&a.every((v,n)=>v===b[n]))));}
   topologyKey=dictionary({components:topology,nonmaterialFaces:nonmaterial.map(primitive=>({primitive,rawFaceFloat64LittleEndianSha256:binaryHash([raw.ts[primitive]])})),rawGeometrySha256:geom.rawSha256,componentFunctionSha256:pins.componentFunctionSha256});
  }
  world={ts,topology,comp,failure,topologyKey,nonmaterial,frameKey,admission,rawTopology:raw.topology,samePartitions,sameNonmaterial,closedFlagsDiffer,onlyClosedFlags,hash:binaryHash(ts),rawHash:raw.hash,emptyWorldHash:binaryHash(nonmaterial.map(i=>ts[i]))};worldCache.set(cacheKey,world);
 }
 const first=spec.sourceRange?spec.sourceRange.start/3:0,count=spec.sourceRange?spec.sourceRange.count/3:world.ts.length;assert.ok(Number.isSafeInteger(first)&&Number.isSafeInteger(count)&&first>=0&&first+count<=world.ts.length);
 // Absolute raw ordinals are never compacted. Only the contact-membership view excludes proven empty faces.
 const rawIndices=Array.from({length:count},(_,i)=>i+first),indices=rawIndices.filter(i=>world.comp.has(i)),result={spec,world,indices,triangles:indices.map(i=>world.ts[i]),rawRangeCount:count,selectedHash:binaryHash(rawIndices.map(i=>world.ts[i])),positiveHash:binaryHash(indices.map(i=>world.ts[i]))};parts.set(id,result);return result;
}
function boxes(row){return [...(row.selector?[row.selector]:[]),...row.endpointBounds];}
function intersectBoxes(bs){const min=[0,1,2].map(i=>Math.max(...bs.map(b=>b.min[i]))),max=[0,1,2].map(i=>Math.min(...bs.map(b=>b.max[i])));return {min,max};}
function clipped(p,b){return p.indices.flatMap(i=>G.clipTriangle(p.world.ts[i],b).map(triangle=>({primitive:i,triangle})));}
function overlapPolygon(a,b){
 const o=b[0],u=G.sub(b[1],o),v=G.sub(b[2],o),n=G.unit(G.cross(u,v));if(a.some(p=>Math.abs(G.dot(G.sub(p,o),n))>G.EPS))return [];
 const uu=G.dot(u,u),uv=G.dot(u,v),vv=G.dot(v,v),den=uu*vv-uv*uv;if(!(den>0))return [];
 let poly=a.map(p=>{const s=G.sub(p,o),x=(G.dot(s,u)*vv-G.dot(s,v)*uv)/den,y=(G.dot(s,v)*uu-G.dot(s,u)*uv)/den;return [x,y,x+y,...p];});
 poly=G.clipPolygon(poly,0,0,true);poly=G.clipPolygon(poly,1,0,true);poly=G.clipPolygon(poly,2,1,false);return poly.map(p=>p.slice(3));
}
function pairPoints(a,b){
 const points=[],seen=new Set(),add=p=>{if(finite(p)&&!seen.has(key(p))){seen.add(key(p));points.push(p);}};
 const poly=overlapPolygon(a,b);if(poly.length>=3)add(G.centre(poly));
 const hits=[];for(const [x,y]of [[a,b],[b,a]]){for(const p of x)if(on(p,y))hits.push(p);for(let i=0;i<3;i++){const t=G.segmentTriangle(x[i],x[(i+1)%3],y);if(t!==null)hits.push(x[i].map((v,j)=>v+(x[(i+1)%3][j]-v)*t));}}
 const unique=[...new Map(hits.map(p=>[key(p),p])).values()];if(unique.length){add(G.centre(unique));let pair=null,max=-1;for(let i=0;i<unique.length;i++)for(let j=i+1;j<unique.length;j++){const d=G.sub(unique[i],unique[j]),n=G.dot(d,d);if(n>max){max=n;pair=[unique[i],unique[j]];}}if(pair&&max>0)for(const f of [.5,1/3,2/3])add(pair[0].map((v,i)=>v+(pair[1][i]-v)*f));}for(const p of unique)add(p);return points;
}
function analyzePoint(row,p,ends,stats){
 if(!finite(p)||!boxes(row).every(b=>within(p,b)))return null;const hit=ends.map(part=>part.indices.filter(i=>on(p,part.world.ts[i])));stats.candidates++;
 if(hit.some(a=>a.length!==1)){if(hit.every(a=>a.length))stats.ambiguous++;return null;}
 return {point:p,primitives:hit.map(a=>a[0]),components:hit.map((a,i)=>ends[i].world.comp.get(a[0])),normals:hit.map((a,i)=>normal(ends[i].world.ts[a[0]]))};
}
function validate(row,contact,ends){
 guard();assert.ok(finite(contact.point)&&boxes(row).every(b=>within(contact.point,b)));
 const selected=ends.map((p,side)=>{const hits=p.indices.filter(i=>on(contact.point,p.world.ts[i]));assert.deepEqual(hits,[contact.primitives[side]]);assert.equal(p.world.comp.get(hits[0]),contact.components[side]);assert.ok(same(normal(p.world.ts[hits[0]]),contact.normals[side]));return p.world.ts[hits[0]];});
 const shared=intersectBoxes(boxes(row)),sharedFacets=ends.map(p=>clipped(p,shared)),endpointFacets=ends.map((p,i)=>clipped(p,row.endpointBounds[i]));if(sharedFacets.some(a=>!a.length)||endpointFacets.some(a=>!a.length))return null;
 for(const views of [sharedFacets,endpointFacets])for(let i=0;i<2;i++)if(!views[i].some(t=>t.primitive===contact.primitives[i]&&on(contact.point,t.triangle)))return null;
 const tests=[touching(...selected.map(t=>shape([t]))),touching(...sharedFacets.map(a=>shape(a.map(v=>v.triangle)))),touching(...endpointFacets.map(a=>shape(a.map(v=>v.triangle))))];
 if(plan.relationships.find(r=>r.id===row.relationship).direction==='symmetric-structural')tests.push(touching(...selected.map(t=>shape([t])).reverse()),touching(...sharedFacets.map(a=>shape(a.map(v=>v.triangle))).reverse()),touching(...endpointFacets.map(a=>shape(a.map(v=>v.triangle))).reverse()));
 if(!tests.every(Boolean))return null;
 let wrongPrimitiveNegatives=0,outsideSelectorNegatives=0,legacyWitnessNegatives=0;
 for(let i=0;i<2;i++){
  const wrong=ends[i].indices.find(j=>j!==contact.primitives[i]&&!on(contact.point,ends[i].world.ts[j]));if(wrong!==undefined){assert.equal(G.segmentTriangle(contact.point,contact.point,ends[i].world.ts[wrong]),null);wrongPrimitiveNegatives++;}
  const outside=selected[i].find(v=>!boxes(row).every(b=>within(v,b)));if(outside){assert.equal(boxes(row).every(b=>within(outside,b)),false);outsideSelectorNegatives++;}
  const old=row.historical.worldWitness;if(old&&!on(old,selected[i])){assert.equal(G.segmentTriangle(old,old,selected[i]),null);legacyWitnessNegatives++;}
 }
 return {contact:tests,sharedFacetCounts:sharedFacets.map(a=>a.length),endpointFacetCounts:endpointFacets.map(a=>a.length),wrongPrimitiveNegatives,outsideSelectorNegatives,legacyWitnessNegatives,planeResidualMetres:selected.map(t=>Math.abs(G.dot(G.sub(contact.point,t[0]),normal(t))))};
}
function calculate(row){
 const ends=[part(row.parent),part(row.child)],stats={candidates:0,ambiguous:0,facePairs:0,nativeRejected:0};if(ends.some(p=>p.world.failure))return {id:row.id,status:'unproved',reason:'original-component-unresolved',stats};
 const common=intersectBoxes(boxes(row));if(common.min.some((v,i)=>v>common.max[i]))return {id:row.id,status:'unproved',reason:'empty-selector-intersection',stats};
 const tryPoint=(p,derivation)=>{const contact=analyzePoint(row,p,ends,stats);if(!contact)return null;const checks=validate(row,contact,ends);if(!checks){stats.nativeRejected++;return null;}return {id:row.id,status:'source-contact-proposed',contact:{...contact,derivation,membership:'unchanged-original-segmentTriangle'},checks,stats};};
 const h=row.historical,seeds=[h.sourceFace?.actualSurfacePoint,...h.actualSurfaceWitness||[],h.parentWitness,h.childWitness,h.worldWitness].filter(finite);
 for(const p of seeds){const result=tryPoint(p,'existing-original-witness');if(result)return result;}
 const facets=ends.map(p=>clipped(p,common));if(facets.some(a=>!a.length))return {id:row.id,status:'unproved',reason:'no-original-facets-in-selector',stats};
 for(const a of facets[0])for(const b of facets[1]){guard();if(!G.overlaps(G.bounds(a.triangle),G.bounds(b.triangle)))continue;stats.facePairs++;for(const p of pairPoints(a.triangle,b.triangle)){const result=tryPoint(p,'original-facet-intersection-interior');if(result)return result;}}
 return {id:row.id,status:'unproved',reason:stats.nativeRejected?'native-contact-rejected':stats.ambiguous?'ambiguous-original-point-membership':'no-unambiguous-original-contact',stats};
}
function eligibility(row){
 const ends=[part(row.parent),part(row.child)],blocked=ends.filter(p=>plan.blockedInstanceIds.includes(p.spec.id));
 const allowed=blocked.length>0&&blocked.every(p=>p.world.admission==='same-partition-closed-flags-only'&&p.world.samePartitions&&p.world.sameNonmaterial&&p.world.onlyClosedFlags)&&ends.every(p=>!p.world.failure);
 return {allowed,previouslyBlockedInstances:blocked.map(p=>p.spec.id),endpointAdmissions:ends.map(p=>p.world.admission),frameDictionaries:ends.map(p=>p.world.frameKey),positivePartitionsAndNonmaterialOrdinalsMatch:blocked.every(p=>p.world.samePartitions&&p.world.sameNonmaterial),soleDiscrepancyClosedFlags:blocked.every(p=>p.world.onlyClosedFlags),actualWorldComponentsUsedForSurfaceMembership:allowed,volumeBearingClosedSolidClaim:false};
}
function normalMetadata(row,contact){
 const ends=[part(row.parent),part(row.child)],normals=ends.map((p,i)=>canonicalNormal(p.world.ts[contact.primitives[i]]));
 assert.ok(normals.every(n=>n.every(Number.isFinite)));
 return {convention:'core-componentwise-division',canonicalNormals:normals,historicalSourcePredicateNormals:contact.normals,normalDeclarationSha256:plan.normalDeclarationSha256,selectedOriginalFaceFloat64LittleEndianSha256:ends.map((p,i)=>binaryHash([p.world.ts[contact.primitives[i]]]))};
}
function calculateEligible(row){
 const admitted=eligibility(row);
 if(!admitted.allowed)return {id:row.id,status:'unproved',reason:'closed-flags-only-condition-not-met',eligibility:admitted,stats:{candidates:0,ambiguous:0,facePairs:0,nativeRejected:0}};
 const result=calculate(row);result.eligibility=admitted;
 if(result.status==='source-contact-proposed')result.normalMetadata=normalMetadata(row,result.contact);
 return result;
}
const resultFile=path.join(HERE,'pages',`page-${String(page).padStart(3,'0')}.json`),verifyFile=path.join(HERE,'checks',`page-${String(page).padStart(3,'0')}.json`);let results;
if(mode==='page'){assert.ok(!fs.existsSync(resultFile));results=rows.map(calculateEligible);}else{
 assert.ok(!fs.existsSync(verifyFile));const saved=JSON.parse(fs.readFileSync(resultFile));assert.equal(saved.planSha256,pins.planSha256);assert.deepEqual(saved.regions.map(r=>r.id),rows.map(r=>r.id));let positives=0,eligible=0;
 for(const [i,row]of rows.entries()){
  const report=saved.regions[i],admitted=eligibility(row);assert.deepEqual(admitted,report.eligibility);if(admitted.allowed)eligible++;
  if(report.status==='source-contact-proposed'){
   assert.ok(admitted.allowed);const checks=validate(row,report.contact,[part(row.parent),part(row.child)]);assert.ok(checks);assert.deepEqual(checks,report.checks);
   // JSON comparison follows the accepted component === convention for signed zero.
   assert.equal(JSON.stringify(normalMetadata(row,report.contact)),JSON.stringify(report.normalMetadata));positives++;
  }else{assert.equal(report.status,'unproved');assert.ok(typeof report.reason==='string');if(!admitted.allowed)assert.equal(report.reason,'closed-flags-only-condition-not-met');}
 }
 results=saved.regions;fs.writeFileSync(verifyFile,JSON.stringify({page,regions:rows.length,eligible,positiveProofsRechecked:positives,unprovedRetained:rows.length-positives,pageSha256:sha(fs.readFileSync(resultFile)),planSha256:pins.planSha256,pageCheckerSha256:sha(fs.readFileSync(new URL(import.meta.url))),searchesPerformed:0,nativeCompilerCalls:0,workerCpuUsage:process.cpuUsage(cpuStart),workerElapsedMs:Date.now()-workerStarted})+'\n',{flag:'wx'});
}
if(mode==='page'){
 const instanceProofs=[...parts].sort((a,b)=>a[0]-b[0]).map(([id,p])=>({id,globalSourcePartIndex:p.spec.globalSourcePartIndex,rawOriginalTriangles:p.world.ts.length,positiveMaterialTriangles:p.world.comp.size,rawRangeTriangles:p.rawRangeCount,positiveRangeTriangles:p.indices.length,rawOriginalTrianglesFloat64LittleEndianSha256:p.world.rawHash,orderedWorldTrianglesFloat64LittleEndianSha256:p.selectedHash,originalPartWorldTrianglesFloat64LittleEndianSha256:p.world.hash,positiveRangeWorldTrianglesFloat64LittleEndianSha256:p.positiveHash,nonmaterialPrimitives:p.world.nonmaterial,nonmaterialWorldTrianglesFloat64LittleEndianSha256:p.world.emptyWorldHash,topologyDictionary:p.world.topologyKey,frameDictionary:p.world.frameKey,admission:p.world.admission,rawClosedFlags:p.world.rawTopology.map(c=>c.closed),worldClosedFlags:p.world.topology.map(c=>c.closed),failure:p.world.failure}));
 fs.writeFileSync(resultFile,JSON.stringify({page,kind:descriptor.kind,regions:results,instanceProofs,planSha256:pins.planSha256,pageCheckerSha256:sha(fs.readFileSync(new URL(import.meta.url))),geometryArraysExported:0,nativeCompilerCalls:0,workerCpuUsage:process.cpuUsage(cpuStart),workerElapsedMs:Date.now()-workerStarted})+'\n',{flag:'wx'});
}
console.log(JSON.stringify({mode,page,regions:rows.length,eligible:results.filter(r=>r.eligibility.allowed).length,proved:results.filter(r=>r.status==='source-contact-proposed').length,unproved:results.filter(r=>r.status==='unproved').length,nativeCompilerCalls:0}));
