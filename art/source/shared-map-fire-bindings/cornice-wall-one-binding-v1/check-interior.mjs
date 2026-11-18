// Finite source-only calls into unchanged, pinned component/interior helpers.
// No support factory, regional kernel, native compiler, world or graph is created.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
const context=JSON.parse(fs.readFileSync(new URL('./predicate-context.json',import.meta.url)));
const input=JSON.parse(fs.readFileSync(0,'utf8'));
assert.equal(input.parts.length,2);
assert.equal(input.parts.reduce((n,p)=>n+p.triangles.length,0),24);
for(const module of ['support','collision','query','geometry'])for(const block of Object.values(context[module].blocks))assert.equal(sha(block.text),block.sha256);
const collisionText=context.collision.blocks.module.text;
assert.equal(sha(collisionText),context.collision.sourceSha256);
assert.ok(!/^\s*import /m.test(collisionText));
const collision=await import('data:text/javascript;base64,'+Buffer.from(collisionText).toString('base64'));
const withoutExport=s=>s.replace(/^export /gm,'');
const source=[
 withoutExport(context.geometry.blocks.mathDeclarations.text),
 context.support.blocks.vectorKeyDeclaration.text,
 withoutExport(context.support.blocks.componentFunction.text),
 context.support.blocks.insideDeclaration.text,
 context.query.blocks.checkedClosedFunction.text,
 'return {originalMaterialComponents,inside,checkedClosed};'
].join('\n');
const helpers=Function('sweptCylinderClear',source)(collision.sweptCylinderClear);
const report=[];
for(const part of input.parts){
  assert.ok(['main/0/cell-3-1/1','edge-0/cornice-1'].includes(part.partId));
  const ts=part.triangles;
  const components=helpers.originalMaterialComponents(ts);
  assert.deepEqual(components,[{id:0,primitives:Array.from({length:12},(_,i)=>i),closed:true}]);
  helpers.checkedClosed(ts);
  const inside=helpers.inside(input.witness,ts);
  const outside=[part.bounds.max[0]+1,input.witness[1],input.witness[2]];
  const doubleOffset=input.witness.map((v,i)=>v+input.sourceOffset[i]);
  assert.equal(inside,true);
  assert.equal(helpers.inside(outside,ts),false);
  assert.equal(helpers.inside(doubleOffset,ts),false);
  report.push({partId:part.partId,components,checkedWatertightGuard:'pass',
    checkedInteriorPredicateReturnsInside:inside,
    outsidePoint:{point:outside,inside:false},
    doubleOffsetWitness:{point:doubleOffset,inside:false}});
}
process.stdout.write(JSON.stringify({scope:'two-original-parts-only',parts:report,
  unchangedHelpers:['originalMaterialComponents','checkedClosed','inside','sweptCylinderClear'],
  supportFactoryOrKernelCreated:false,nativeWorldGraphOrCompilerExecuted:false})+'\n');
