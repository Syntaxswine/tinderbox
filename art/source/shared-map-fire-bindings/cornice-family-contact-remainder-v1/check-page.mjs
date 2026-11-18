// Remaining source pages only: unchanged pure geometry/contact context, no compiler or factory.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
const start=process.hrtime.bigint(),sha=b=>createHash('sha256').update(b).digest('hex');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
assert.ok(input.regions.length>0&&input.regions.length<=64);
const context=JSON.parse(fs.readFileSync(new URL('../cornice-wall-contact-proposal-v1/predicate-context.json',import.meta.url)));
const cc=JSON.parse(fs.readFileSync(new URL('../cornice-wall-one-binding-v1/predicate-context.json',import.meta.url)));
const producer=JSON.parse(fs.readFileSync(new URL('../cornice-family-contact-page-01-v1/source-producer-context.json',import.meta.url)));
assert.equal(sha(context.geometry.moduleText),context.geometry.sourceSha256);
assert.equal(sha(context.support.closureText),context.support.closureSha256);
assert.equal(sha(producer.functionText),producer.functionSha256);
const sourceTriangles=Function(producer.functionText+'\nreturn sourceTriangles;')();
const G=await import('data:text/javascript;base64,'+Buffer.from(context.geometry.moduleText).toString('base64'));
const touching=Function('G','const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+context.support.closureText+'\nreturn touching;')(G);
const cb=cc.support.blocks;
const components=Function('triangleArea',cb.vectorKeyDeclaration.text+'\n'+cb.componentFunction.text.replace(/^export /,'')+'\nreturn originalMaterialComponents;')(G.triangleArea);
const within=(p,b)=>p.every((v,i)=>v>=b.min[i]&&v<=b.max[i]);
const normal=t=>{const n=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0])),l=Math.hypot(...n);assert.ok(l>0);return n.map(v=>v/l);};
const same=(a,b)=>a.every((v,i)=>v===b[i]);
const shape=ts=>{assert.ok(ts.length);return {triangles:ts,solidTriangles:ts,bounds:G.bounds(ts.flat()),normal:normal(ts[0]),kind:'wall',thickness:0};};
const geometryCache=new Map(),partById=new Map(),componentById=new Map();
for(const p of input.parts){
 const def=input.geometries[p.geometry];
 if(!geometryCache.has(def.sha256)){
  const b=fs.readFileSync(path.resolve(input.root,def.path));assert.equal(sha(b),def.sha256);geometryCache.set(def.sha256,JSON.parse(b));
 }
 assert.deepEqual(sourceTriangles(p,geometryCache.get(def.sha256)),p.triangles);
 let result;
 try{result={components:components(p.triangles)};}
 catch(error){if(error.message!=='Finite original physical triangles required')throw error;result={reason:'PINNED_COMPONENT_METHOD_REJECTS_SOURCE_TRIANGLES'};}
 assert.ok(!partById.has(p.id));partById.set(p.id,p);componentById.set(p.id,result);
}
const reports=[];let attemptedContactChecks=0;
for(const c of input.regions){
 if(Number(process.hrtime.bigint()-start)/1e9>24)throw Error('Remaining source-page deadline guard; preserve page, no retry');
 if(!c.contact){reports.push({id:c.id,status:'UNPROVED',reason:c.reason});continue;}
 let stage='ORIGINAL_COMPONENT_MEMBERSHIP';
 try{
  const parts=[partById.get(c.parent),partById.get(c.child)],prims=c.contact.primitives,points=c.contact.points;
  const material=parts.map((p,i)=>{
   const result=componentById.get(p.id);assert.ok(!result.reason,result.reason);
   const hits=result.components.filter(comp=>comp.primitives.includes(prims[i]));assert.equal(hits.length,1);assert.equal(hits[0].closed,true);
   return hits[0].id;
  });
  stage='ORIGINAL_FACE_MEMBERSHIP';
  const selected=parts.map((p,i)=>{
   assert.deepEqual(p.triangles.flatMap((t,j)=>G.segmentTriangle(points[i],points[i],t)!==null?[j]:[]),[prims[i]]);
   assert.ok(within(points[i],c.selector)&&within(points[i],c.endpointBounds[i]));
   assert.ok(same(normal(p.triangles[prims[i]]),c.contact.normals[i]));
   return p.triangles[prims[i]];
  });
  stage='CLIPPED_ORIGINAL_FACETS';
  const clip=(p,b)=>p.triangles.flatMap((t,i)=>G.clipTriangle(t,b).map(triangle=>({primitive:i,triangle})));
  const shared=parts.map(p=>clip(p,c.selector)),end=parts.map((p,i)=>clip(p,c.endpointBounds[i]));
  for(const clipped of [shared,end])for(let i=0;i<2;i++)assert.ok(clipped[i].some(r=>r.primitive===prims[i]&&G.segmentTriangle(points[i],points[i],r.triangle)!==null));
  stage='EXISTING_CONTACT_PREDICATE';
  const contact=[touching(...selected.map(t=>shape([t]))),touching(...shared.map(a=>shape(a.map(r=>r.triangle)))),touching(...end.map(a=>shape(a.map(r=>r.triangle))))];
  attemptedContactChecks+=3;assert.deepEqual(contact,[true,true,true]);
  stage='ORIGINAL_GEOMETRY_NEGATIVE_CONTROLS';
  const negatives={wrongPrimitive:0,historicalInteriorPointNotOnFace:0,outsideLocalOriginalVertex:0,separatedExistingTopFace:0,oppositeOriginalFaceClipsEmpty:0,siblingSelector:0};
  for(let i=0;i<2;i++){
   // A deterministic different original face; no manufactured control geometry.
   const wrong=parts[i].triangles.findIndex((t,j)=>j!==prims[i]&&G.triangleArea(t)>0);assert.ok(wrong>=0);
   assert.equal(G.segmentTriangle(points[i],points[i],parts[i].triangles[wrong]),null);negatives.wrongPrimitive++;
   if(c.historicalKind==='fixed-embed'&&G.segmentTriangle(c.historicalWitness,c.historicalWitness,selected[i])===null)negatives.historicalInteriorPointNotOnFace++;
   if(selected[i].some(v=>!within(v,c.selector)&&!within(v,c.endpointBounds[i])))negatives.outsideLocalOriginalVertex++;
  }
  const top=parts[0].triangles.findIndex(t=>G.triangleArea(t)>0&&same(normal(t),[0,1,0]));
  if(top>=0&&top!==prims[0]&&!touching(shape([parts[0].triangles[top]]),shape([selected[1]])))negatives.separatedExistingTopFace++;
  const opposite=parts[0].triangles.findIndex(t=>G.triangleArea(t)>0&&same(normal(t),c.contact.normals[0].map(v=>-v)));
  if(opposite>=0&&G.clipTriangle(parts[0].triangles[opposite],c.selector).length===0)negatives.oppositeOriginalFaceClipsEmpty++;
  if(c.siblingSelector&&!within(points[0],c.siblingSelector)&&!within(points[1],c.siblingSelector))negatives.siblingSelector++;
  const pilotPoint=[33.5,8.330000001490117,25.92000000178814];
  const pilotCopyRejected=!within(pilotPoint,c.selector)?1:0;
  reports.push({id:c.id,status:'SOURCE_CONTACT_PROPOSED',components:material,checks:{contact,negativeCounts:negatives,
   negativeChecks:Object.values(negatives).reduce((a,b)=>a+b,0),pilotCopyRejected,
   sharedFacetCounts:shared.map(a=>a.length),endpointFacetCounts:end.map(a=>a.length)}});
 }catch(error){
  if(!(error instanceof assert.AssertionError))throw error;
  reports.push({id:c.id,status:'UNPROVED',stage,reason:stage+'_UNPROVED',detail:error.message.slice(0,160)});
 }
}
const proved=reports.filter(r=>r.status==='SOURCE_CONTACT_PROPOSED');
const negatives={};for(const r of proved)for(const [key,n] of Object.entries(r.checks.negativeCounts))negatives[key]=(negatives[key]??0)+n;
process.stdout.write(JSON.stringify({regions:reports,summary:{regions:input.regions.length,proved:proved.length,unproved:reports.length-proved.length,
 contactChecks:proved.length*3,attemptedContactChecks,negativeChecks:proved.reduce((n,r)=>n+r.checks.negativeChecks,0),negativeCounts:negatives,
 pilotCopyRejected:proved.reduce((n,r)=>n+r.checks.pilotCopyRejected,0),sourceParts:input.parts.length,
 sourceInstanceTriangles:input.parts.reduce((n,p)=>n+p.triangles.length,0),geometryBuffers:geometryCache.size,nativeCompilations:0},
 cost:{cpu:process.cpuUsage(),elapsedMs:Number(process.hrtime.bigint()-start)/1e6},
 context:{nativeContactSource:context.sourceCommit,sourceProducer:producer.sourceCommit,sourceProducerFunctionSha256:producer.functionSha256}
})+'\n');
