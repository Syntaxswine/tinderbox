import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createBoundaryIndex} from '../../workbenches/furnished-house/geometry.js';
const floor=(id,x,amount=.1)=>({id,instanceId:'fixture',kind:'floor',normal:[0,1,0],material:'timber',fuelClass:'oil',fuelAmount:amount,thickness:.12,triangles:[[[x,0,0],[x+1,0,1],[x+1,0,0]],[[x,0,0],[x,0,1],[x+1,0,1]]]});
const data=surfaces=>({version:1,runtimeAdapterVersion:1,prefabId:'registration-control',gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],sourceBounds:{min:[0,0,0],max:[8,4,8]},groundY:0,levels:[],surfaces,openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'fixture'}],doors:[]}});

test('a staged native source matches eager geometry and combustion without creating initial world stock twice',()=>{
  const source=floor('fixture::fuel',2),eager=createTrial(data([source]),{executionCache:true}),sparse=createTrial(data([]),{executionCache:true});
  try{
    const before=sparse.scene.cells.size,plan=sparse.prepareSources({surfaces:[source]});assert.equal(sparse.scene.cells.size,before);assert.equal(sparse.scene.fuels.size,0);
    const installed=plan.commit();assert.ok(installed.quantity>0);assert.equal(sparse.metrics().fuel.initial,0);assert.equal(sparse.metrics().fuel.added,installed.quantity);
    for(const trial of [eager,sparse]){trial.command({type:'match',position:[2.25,.015,.25]});trial.step(30);}
    const a=eager.snapshot(),b=sparse.snapshot();assert.deepEqual(b.cells,a.cells);assert.deepEqual(b.fuels,a.fuels);assert.deepEqual(b.metrics.heat,a.metrics.heat);
    assert.equal(b.metrics.fuel.remaining,a.metrics.fuel.remaining);assert.equal(b.metrics.fuel.burned,a.metrics.fuel.burned);assert.ok(Math.abs(b.metrics.fuel.error)<1e-7);
    assert.throws(()=>plan.commit(),/already committed/);assert.equal(sparse.scene.fuels.size,eager.scene.fuels.size);
  }finally{eager.dispose();sparse.dispose();}
});

test('failed or stale source staging changes no live geometry, fuel, heat or native clock',()=>{
  const trial=createTrial(data([]),{executionCache:true});
  try{
    const before=trial.snapshot();assert.throws(()=>trial.prepareSources({surfaces:[{...floor('bad',2),fuelClass:'invented-profile'}]}),/Unknown physical fuel/);assert.deepEqual(trial.snapshot(),before);
    const first=trial.prepareSources({surfaces:[floor('shared',2)]}),stale=trial.prepareSources({surfaces:[floor('shared',2)]});first.commit();const installed=trial.snapshot();
    assert.throws(()=>stale.commit(),/appeared during staging/);assert.deepEqual(trial.snapshot(),installed);assert.equal(trial.tick,0);
  }finally{trial.dispose();}
});

test('registration preserves existing heat and fuel while adding a real radiation receiver',()=>{
  const trial=createTrial(data([floor('source',2)]),{executionCache:true});
  try{
    trial.command({type:'match',position:[2.25,.015,.25]});trial.step(5);const before=trial.snapshot(),source=before.fuels.map(f=>({...f}));
    trial.prepareSources({surfaces:[floor('receiver',4)]}).commit();const after=trial.snapshot();assert.deepEqual(after.cells,before.cells);assert.deepEqual(after.fuels.filter(f=>f.sourceSurfaceId==='source'),source);assert.equal(after.tick,before.tick);assert.deepEqual(after.metrics.heat,before.metrics.heat);
    trial.step(90);const receivers=[...trial.scene.fuels.values()].filter(f=>f.sourceSurfaceId==='receiver');assert.ok(receivers.some(f=>f.cells.some(c=>c.heat>0)));assert.ok(Math.abs(trial.metrics().heat.relativeError)<1e-7);
  }finally{trial.dispose();}
});

test('new native boundaries invalidate a previously clear cached path in one publication',()=>{
  const index=createBoundaryIndex([]),from=[0,1,0],to=[3,1,0];let invalidations=0;index.watchPath(from,to,()=>invalidations++);
  const wall={id:'added-wall',sourceSurfaceId:'added-wall',normal:[1,0,0],transmission:0,triangles:[[[1,0,-1],[1,2,-1],[1,2,1]],[[1,0,-1],[1,2,1],[1,0,1]]]};
  index.addBatch([wall]);assert.equal(invalidations,1);assert.equal(index.trace(from,to).transmission,0);const size=index.surfaces.size,revision=index.revision;
  assert.throws(()=>index.addBatch([{...wall,id:'new'},wall]),/Duplicate/);assert.equal(index.surfaces.size,size);assert.equal(index.revision,revision);
});
