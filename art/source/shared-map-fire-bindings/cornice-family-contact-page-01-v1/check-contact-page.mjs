// One source-only page. No compiler, factory, support graph, world or renderer.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
const start=process.hrtime.bigint(),sha=s=>createHash('sha256').update(s).digest('hex');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
assert.equal(input.parts.length,50);assert.equal(input.regions.length,96);assert.ok(input.regions.length<=256);
const context=JSON.parse(fs.readFileSync(new URL('../cornice-wall-contact-proposal-v1/predicate-context.json',import.meta.url)));
const cc=JSON.parse(fs.readFileSync(new URL('../cornice-wall-one-binding-v1/predicate-context.json',import.meta.url)));
const producer=JSON.parse(fs.readFileSync(new URL('./source-producer-context.json',import.meta.url)));
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
const geometryCache=new Map();
for(const p of input.parts){
 const def=input.geometries[p.geometry];
 if(!geometryCache.has(def.sha256)){
  const b=fs.readFileSync(path.resolve(input.root,def.path));assert.equal(sha(b),def.sha256);
  geometryCache.set(def.sha256,JSON.parse(b));
 }
 assert.deepEqual(sourceTriangles({matrix:p.matrix,triangleCount:12,sourceRange:null},geometryCache.get(def.sha256)),p.triangles);
 assert.deepEqual(components(p.triangles),[{id:0,primitives:Array.from({length:12},(_,i)=>i),closed:true}]);
}
const reports=[];
for(const c of input.regions){
 if(Number(process.hrtime.bigint()-start)/1e9>24)throw Error('Node source-page deadline guard; preserve this page, no retry');
 if(!c.contact){reports.push({id:c.id,status:'UNPROVED',reason:c.reason});continue;}
 let stage='source-facet-membership';
 try{
  const parts=[input.parts[c.parent],input.parts[c.child]],prims=c.contact.primitives,point=c.contact.point;
  const selected=parts.map((p,i)=>{
   assert.deepEqual(p.triangles.flatMap((t,j)=>G.segmentTriangle(point,point,t)!==null?[j]:[]),[prims[i]]);
   assert.ok(within(point,c.selector)&&within(point,c.endpointBounds[i]));
   assert.ok(same(normal(p.triangles[prims[i]]),c.contact.normals[i]));
   return p.triangles[prims[i]];
  });
  stage='clipped-original-facets';
  const clip=(p,b)=>p.triangles.flatMap((t,i)=>G.clipTriangle(t,b).map(triangle=>({primitive:i,triangle})));
  const shared=parts.map(p=>clip(p,c.selector)),end=parts.map((p,i)=>clip(p,c.endpointBounds[i]));
  for(const clipped of [shared,end])for(let i=0;i<2;i++)assert.ok(clipped[i].some(r=>r.primitive===prims[i]&&G.segmentTriangle(point,point,r.triangle)!==null));
  stage='native-contact-predicate';
  const contact=[touching(...selected.map(t=>shape([t]))),touching(...shared.map(a=>shape(a.map(r=>r.triangle)))),touching(...end.map(a=>shape(a.map(r=>r.triangle))))];
  assert.deepEqual(contact,[true,true,true]);
  stage='negative-controls';
  let negatives=0;
  for(let i=0;i<2;i++){
   assert.equal(G.segmentTriangle(c.oldWitness,c.oldWitness,selected[i]),null);negatives++;
   const wrong=parts[i].triangles.findIndex((t,j)=>j!==prims[i]&&same(normal(t),i===0?c.contact.normals[i].map(v=>-v):c.contact.normals[i]));
   assert.ok(wrong>=0);assert.equal(G.segmentTriangle(point,point,parts[i].triangles[wrong]),null);negatives++;
   assert.ok(selected[i].some(v=>!within(v,c.selector)&&!within(v,c.endpointBounds[i])));negatives++;
  }
  const top=parts[0].triangles.findIndex(t=>same(normal(t),[0,1,0]));assert.ok(top>=0);
  assert.equal(touching(shape([parts[0].triangles[top]]),shape([selected[1]])),false);negatives++;
  const opposite=parts[0].triangles.findIndex(t=>same(normal(t),c.contact.normals[0].map(v=>-v)));assert.ok(opposite>=0);
  assert.equal(G.clipTriangle(parts[0].triangles[opposite],c.selector).length,0);negatives++;
  if(c.siblingSelector){assert.equal(within(point,c.siblingSelector),false);negatives++;}
  let copy=0;if(c.id!==input.pilotRegionId){assert.equal(within(input.pilotPoint,c.selector),false);copy=1;}
  if(c.reference){assert.deepEqual(point,c.reference.point);assert.deepEqual(prims,c.reference.primitives);assert.ok(c.contact.normals.every((n,i)=>same(n,c.reference.normals[i])));}
  reports.push({id:c.id,status:'SOURCE_CONTACT_PROPOSED',contact,negativeChecks:negatives,pilotCopyRejected:copy,referenceUnchanged:!!c.reference,
   sharedFacetCounts:shared.map(a=>a.length),endpointFacetCounts:end.map(a=>a.length)});
 }catch(error){reports.push({id:c.id,status:'UNPROVED',stage,reason:error.message});}
}
const proved=reports.filter(r=>r.status==='SOURCE_CONTACT_PROPOSED');
process.stdout.write(JSON.stringify({regions:reports,
 summary:{regions:96,proved:proved.length,unproved:96-proved.length,contactChecks:proved.length*3,
 negativeChecks:proved.reduce((n,r)=>n+r.negativeChecks,0),pilotCopyRejected:proved.reduce((n,r)=>n+r.pilotCopyRejected,0),
 referenceRegions:proved.filter(r=>r.referenceUnchanged).length,sourceParts:50,sourceInstanceTriangles:600,geometryBuffers:geometryCache.size,
 nativeCompilerCalls:0,supportGraphWorldRendererOrRuntimeFactories:0},
 cost:{cpu:process.cpuUsage(),elapsedMs:Number(process.hrtime.bigint()-start)/1e6},
 context:{nativeContactSource:context.sourceCommit,sourceProducer:producer.sourceCommit,sourceProducerFunctionSha256:producer.functionSha256}
})+'\n');
