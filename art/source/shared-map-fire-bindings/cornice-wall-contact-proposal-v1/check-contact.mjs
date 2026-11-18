// Source facets only. No support graph, native compile, world or runtime installation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
const context=JSON.parse(fs.readFileSync(new URL('./predicate-context.json',import.meta.url)));
const input=JSON.parse(fs.readFileSync(0,'utf8'));
assert.equal(input.parts.length,2);
assert.equal(input.parts.reduce((n,p)=>n+p.triangles.length,0),24);
assert.equal(sha(context.geometry.moduleText),context.geometry.sourceSha256);
assert.equal(sha(context.support.closureText),context.support.closureSha256);
assert.ok(!/^\s*import /m.test(context.geometry.moduleText));
const G=await import('data:text/javascript;base64,'+Buffer.from(context.geometry.moduleText).toString('base64'));
const supportSurfacesTouch=Function('G',
 'const {overlaps,pointOnTriangle,segmentTriangle,dot,sub,add,mul,EPS}=G;\n'+
 context.support.closureText+'\nreturn touching;')(G);
const shape=ts=>{
 assert.ok(ts.length);
 const n=G.cross(G.sub(ts[0][1],ts[0][0]),G.sub(ts[0][2],ts[0][0])),l=Math.hypot(...n);
 assert.ok(l>0);
 return {triangles:ts,solidTriangles:ts,bounds:G.bounds(ts.flat()),normal:n.map(v=>v/l),kind:'wall',thickness:0};
};
const within=(p,b)=>p.every((v,i)=>v>=b.min[i]&&v<=b.max[i]);
const hashTriangles=ts=>{
 const b=Buffer.alloc(ts.length*9*8);let i=0;
 for(const t of ts)for(const p of t)for(const v of p)b.writeDoubleLE(v,i++*8);
 return sha(b);
};
const point=input.point,[parent,child]=input.parts;
assert.deepEqual(point,[33.5,8.330000001490117,25.92000000178814]);
const parts=input.parts.map(p=>{
 const matches=p.triangles.flatMap((t,i)=>G.segmentTriangle(point,point,t)!==null?[i]:[]);
 assert.deepEqual(matches,[p.selectedPrimitive]);
 assert.ok(within(point,input.selector)&&within(point,p.endpointBounds));
 const selected=p.triangles[p.selectedPrimitive],normal=shape([selected]).normal;
 const clip=box=>{
  const records=p.triangles.flatMap((t,i)=>G.clipTriangle(t,box).map(triangle=>({primitive:i,triangle})));
  return {records,triangles:records.map(r=>r.triangle)};
 };
 const shared=clip(input.selector),endpoint=clip(p.endpointBounds);
 for(const clipped of [shared,endpoint])assert.ok(clipped.records.some(r=>r.primitive===p.selectedPrimitive&&G.segmentTriangle(point,point,r.triangle)!==null));
 return {...p,matches,normal,selected,shared,endpoint};
});
for(const [i,p] of parts.entries())assert.ok(p.normal.every((v,a)=>v===[[0,0,-1],[0,1,0]][i][a]));
const selectedContact=supportSurfacesTouch(...parts.map(p=>shape([p.selected])));
const sharedContact=supportSurfacesTouch(...parts.map(p=>shape(p.shared.triangles)));
const endpointContact=supportSurfacesTouch(...parts.map(p=>shape(p.endpoint.triangles)));
assert.equal(selectedContact,true);
assert.equal(sharedContact,true);
assert.equal(endpointContact,true);
const negatives=[];
for(const p of parts){
 const hit=G.segmentTriangle(input.oldVolumeWitness,input.oldVolumeWitness,p.selected);
 assert.equal(hit,null);
 negatives.push({id:p.partId+'::old-volume-witness-is-not-selected-contact-face',rejected:true});
 const wrong=p===parts[0]?0:1;
 assert.equal(G.segmentTriangle(point,point,p.triangles[wrong]),null);
 negatives.push({id:p.partId+'::wrong-original-primitive',primitive:wrong,rejected:true});
 const actualVertex=p.selected[0];
 assert.equal(within(actualVertex,input.selector),false);
 assert.equal(within(actualVertex,p.endpointBounds),false);
 negatives.push({id:p.partId+'::actual-original-vertex-outside-selector',point:actualVertex,rejected:true});
}
assert.equal(supportSurfacesTouch(shape([parent.triangles[4]]),shape([child.triangles[0]])),false);
negatives.push({id:'actual-separated-top-faces',parentPrimitive:4,childPrimitive:0,rejected:true});
assert.equal(G.clipTriangle(parent.triangles[8],input.selector).length,0);
negatives.push({id:'opposite-wall-face-excluded-by-original-selector',parentPrimitive:8,rejected:true});
const report={
 scope:'one-source-contact-alternative-only',point,
 parts:parts.map(p=>({
  partId:p.partId,originalPrimitive:p.selectedPrimitive,matchingOriginalPrimitives:p.matches,
  exactPointWithinSharedSelector:true,exactPointWithinEndpointBounds:true,pointOnSelectedPrimitiveAfterBothClips:true,originalUnitNormal:p.normal,
  sharedSelectorFacets:{triangleCount:p.shared.triangles.length,
   originalPrimitives:[...new Set(p.shared.records.map(r=>r.primitive))],
   orderedFloat64LittleEndianSha256:hashTriangles(p.shared.triangles)},
  endpointBoundFacets:{triangleCount:p.endpoint.triangles.length,
   originalPrimitives:[...new Set(p.endpoint.records.map(r=>r.primitive))],
   orderedFloat64LittleEndianSha256:hashTriangles(p.endpoint.triangles)}
 })),
 contact:{selectedOriginalTriangles:selectedContact,sharedSelectorClippedOriginalFacets:sharedContact,
  endpointBoundClippedOriginalFacets:endpointContact},
 negativeControls:negatives,
 helperContext:{sourceCommit:context.sourceCommit,geometrySha256:context.geometry.sourceSha256,
  supportModuleSha256:context.support.sourceSha256,supportClosureSha256:context.support.closureSha256,
  geometryEPS:G.EPS,nativeContactToleranceMetres:1e-5,
  shapeConvention:'Unchanged original facet arrays; solidTriangles aliases them; kind wall, thickness 0; normal from first actual facet.'},
 clippedFacetsExported:false,supportFactoryOrGraphCalls:0,nativeCompilerCalls:0,
 nativePairAllowanceConsumed:false,worldRendererOrRetainedHelper:false
};
process.stdout.write(JSON.stringify(report)+'\n');
