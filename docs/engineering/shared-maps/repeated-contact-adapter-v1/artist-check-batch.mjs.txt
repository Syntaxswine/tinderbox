// Bounded source-only repeat check: 25 actual parts, 48 original selectors.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
const context=JSON.parse(fs.readFileSync(new URL('../cornice-wall-contact-proposal-v1/predicate-context.json',import.meta.url)));
const componentContext=JSON.parse(fs.readFileSync(new URL('../cornice-wall-one-binding-v1/predicate-context.json',import.meta.url)));
assert.equal(input.parts.length,25);assert.equal(input.regions.length,48);
assert.equal(input.parts.reduce((n,p)=>n+p.triangles.length,0),300);
assert.equal(sha(context.geometry.moduleText),context.geometry.sourceSha256);
assert.equal(sha(context.support.closureText),context.support.closureSha256);
const G=await import('data:text/javascript;base64,'+Buffer.from(context.geometry.moduleText).toString('base64'));
const touching=Function('G','const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+context.support.closureText+'\nreturn touching;')(G);
const cb=componentContext.support.blocks;
for(const name of ['vectorKeyDeclaration','componentFunction'])assert.equal(sha(cb[name].text),cb[name].sha256);
const components=Function('triangleArea',cb.vectorKeyDeclaration.text+'\n'+cb.componentFunction.text.replace(/^export /,'')+'\nreturn originalMaterialComponents;')(G.triangleArea);
const within=(p,b)=>p.every((v,i)=>v>=b.min[i]&&v<=b.max[i]);
const normal=t=>{const n=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0])),l=Math.hypot(...n);assert.ok(l>0);return n.map(v=>v/l);};
const sameNormal=(a,b)=>a.every((v,i)=>v===b[i]);
const shape=ts=>{assert.ok(ts.length);return {triangles:ts,solidTriangles:ts,bounds:G.bounds(ts.flat()),normal:normal(ts[0]),kind:'wall',thickness:0};};
for(const p of input.parts)assert.deepEqual(components(p.triangles),[{id:0,primitives:Array.from({length:12},(_,i)=>i),closed:true}]);
const reports=[];
for(const c of input.regions){
 if(c.precheckFailure){reports.push({id:c.id,status:'unproved',stage:'exact-source-precheck',reason:c.precheckFailure});continue;}
 let stage='original-point-membership';
 try{
  const p=input.parts[c.parent],ch=input.parts[c.child],parts=[p,ch],prims=[c.parentPrimitive,c.childPrimitive],point=c.point;
  const selected=parts.map((part,i)=>{
   const hits=part.triangles.flatMap((t,j)=>G.segmentTriangle(point,point,t)!==null?[j]:[]);
   assert.deepEqual(hits,[prims[i]]);
   assert.ok(within(point,c.selector)&&within(point,c.endpointBounds[i]));
   assert.ok(sameNormal(normal(part.triangles[prims[i]]),c.normals[i]));
   return part.triangles[prims[i]];
  });
  stage='selector-clipped-original-facets';
  const clip=(part,box)=>part.triangles.flatMap((t,i)=>G.clipTriangle(t,box).map(triangle=>({primitive:i,triangle})));
  const shared=parts.map(part=>clip(part,c.selector)),endpoint=parts.map((part,i)=>clip(part,c.endpointBounds[i]));
  for(const clipped of [shared,endpoint])for(let i=0;i<2;i++)assert.ok(clipped[i].some(r=>r.primitive===prims[i]&&G.segmentTriangle(point,point,r.triangle)!==null));
  stage='existing-contact-predicate';
  const contact=[touching(...selected.map(t=>shape([t]))),touching(...shared.map(a=>shape(a.map(r=>r.triangle)))),touching(...endpoint.map(a=>shape(a.map(r=>r.triangle))))];
  assert.deepEqual(contact,[true,true,true]);
  stage='unchanged-geometry-negatives';
  let negatives=0;
  for(let i=0;i<2;i++){
   assert.equal(G.segmentTriangle(c.oldVolumeWitness,c.oldVolumeWitness,selected[i]),null);negatives++;
   const wrong=parts[i].triangles.findIndex((t,j)=>j!==prims[i]&&sameNormal(normal(t),i===0?c.normals[i].map(v=>-v):c.normals[i]));
   assert.ok(wrong>=0);
   assert.equal(G.segmentTriangle(point,point,parts[i].triangles[wrong]),null);negatives++;
   const outside=selected[i].find(v=>!within(v,c.selector)&&!within(v,c.endpointBounds[i]));
   assert.ok(outside);negatives++;
  }
  const top=p.triangles.findIndex(t=>sameNormal(normal(t),[0,1,0]));
  assert.ok(top>=0);assert.equal(touching(shape([p.triangles[top]]),shape([selected[1]])),false);negatives++;
  const opposite=p.triangles.findIndex(t=>sameNormal(normal(t),c.normals[0].map(v=>-v)));
  assert.ok(opposite>=0);assert.equal(G.clipTriangle(p.triangles[opposite],c.selector).length,0);negatives++;
  assert.equal(within(point,c.siblingSelector),false);negatives++;
  assert.equal(negatives,9);
  let pilotCopyRejected=0;
  if(c.id!==input.pilotRegionId){assert.equal(within(input.pilotPoint,c.selector),false);pilotCopyRejected=1;}
  reports.push({id:c.id,status:'source-contact-proposed',pointMembership:true,componentMembership:true,
   contact,sharedFacetCounts:shared.map(a=>a.length),endpointFacetCounts:endpoint.map(a=>a.length),
   negatives,pilotCopyRejected});
 }catch(error){reports.push({id:c.id,status:'unproved',stage,reason:error.message});}
}
const proved=reports.filter(r=>r.status==='source-contact-proposed');
process.stdout.write(JSON.stringify({
 parts:25,originalTriangles:300,regions:reports,
 summary:{regions:48,proved:proved.length,unproved:48-proved.length,
  contactChecks:proved.length*3,regionNegativeChecks:proved.reduce((n,r)=>n+r.negatives,0),
  pilotCopyRejections:proved.reduce((n,r)=>n+r.pilotCopyRejected,0)},
 context:{sourceCommit:context.sourceCommit,geometrySha256:context.geometry.sourceSha256,
  supportModuleSha256:context.support.sourceSha256,supportClosureSha256:context.support.closureSha256,
  componentSourceCommit:componentContext.commit,geometryEPS:G.EPS,nativeContactToleranceMetres:1e-5},
 nativeCompilations:0,supportGraphWorldRendererOrRuntimeExports:false
})+'\n');
