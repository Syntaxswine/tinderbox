import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {world,inputs} from '../fixtures/hybrid-world-data.mjs';
import {sceneCompileDiagnostics} from '../../workbenches/furnished-house/scene.js';
import {trialDiagnostics,limitDiagnosticTrialSteps} from '../../workbenches/furnished-house/simulation.js';
import {sweptCylinderClear} from '../../src/runtime/collision.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import {coldIslandWorld} from '../fixtures/hybrid-cold-islands.mjs';
import {createSourceFollow} from '../../src/simulation/source-follow.js';

limitDiagnosticTrialSteps(64);
const resources=[];
function finish(f){f.dispose();resources.push({logicalCells:f.logicalCells,sourceTriangles:f.sourceTriangles,regionalCompiles:f.producer.diagnostics().nativeCalls,retainedReceipts:f.producer.diagnostics().retainedReceipts,queries:f.queries.metrics()});f.producer.dispose();}
function balanced(f){const m=f.ledger.metrics(f.trial.metrics().fuel);assert.ok(Math.abs(m.world.error+m.nativeClippingDelta)<1e-10);return m;}
function committedFloor(f,before){
  const next=f.activation.state();assert.equal(next.revision,before.revision+1);assert.equal(f.queries.isClaimedPart('floor'),true);assert.equal(f.queries.shape('floor').triangles.length,0);
  assert.equal(f.ledger.metrics().coldReserve,.3+.9);assert.ok(f.trial.metrics().fuel.added>.5);
  const records=[...f.trial.scene.index.surfaces.values()].filter(b=>!b.queryOnly);assert.equal(records.length,2);
  for(const b of records)assert.equal(f.trial.supportGraph.nodes.get(b.id),b);
  balanced(f);return next;
}
after(()=>{
  const trial=trialDiagnostics();console.log('HYBRID_CORRECTION_RESOURCES '+JSON.stringify({compiler:sceneCompileDiagnostics(),trial,fixtures:resources,actualNewYorkCalls:0,fullNewYorkDiagnostics:0,rendererCalls:0,builds:0}));
  assert.ok(trial.steps<=64);assert.equal(trial.created,trial.disposed);
  for(const f of resources){assert.ok(f.logicalCells<=64&&f.sourceTriangles<=256);assert.equal(f.retainedReceipts,0);assert.equal(f.queries.cachedShapes,0);assert.equal(f.queries.cachedTriangles,0);assert.equal(f.queries.workingTriangles,0);assert.equal(f.queries.workingShapes,0);assert.equal(f.queries.workingLeases,0);}
});

test('owner mode selection is captured and cannot be changed through the caller input object',()=>{
  const modes={owner:'regional'},ledger=createSourceCarrierLedger([{id:'owner',fuelClass:'roof',fuelAmount:1}],{modes});
  try{modes.owner='whole';assert.equal(ledger.isRegional('owner'),true);assert.throws(()=>ledger.prepareActivations([{id:'owner',nativeQuantity:1}]),/Regional owner/);delete modes.owner;assert.equal(ledger.isRegional('owner'),true);assert.equal(ledger.metrics().coldReserve,1);}finally{ledger.dispose();}
});

function radiatingWorld(){
  let calls=0;const selector={select(){calls++;return [];}},f=world({radiationSelection:selector});
  try{
    f.activation.prepare({whole:['floor-owner']}).publish();
    f.trial.command({type:'deposit',position:[.4,.01,.2],amount:.05});f.trial.command({type:'match',position:[.4,.03,.2],energy:10});
    for(let i=0;i<4&&calls===0;i++)f.trial.step(1);
    assert.ok(calls>0,'actual oil combustion must create an existing radiation cache');
    return {f,selector,calls:()=>calls};
  }catch(error){finish(f);throw error;}
}

test('radiation selection faults occur during preparation and sealed registration invokes no later selector',()=>{
  const {f,selector}=radiatingWorld();try{
    const before=f.activation.state(),fuel=f.trial.metrics().fuel.added,stock=f.ledger.metrics().coldReserve,records=f.trial.scene.index.surfaces.size,fault=Error('Injected radiation selection failure');let stagedCalls=0;
    selector.select=()=>{stagedCalls++;assert.equal(f.activation.state(),before);assert.equal(f.queries.isClaimedPart('fit'),false);throw fault;};
    assert.throws(()=>f.activation.prepare({whole:['fit-owner']}),e=>e===fault);assert.ok(stagedCalls>0);
    assert.equal(f.activation.state(),before);assert.equal(f.trial.metrics().fuel.added,fuel);assert.equal(f.ledger.metrics().coldReserve,stock);assert.equal(f.trial.scene.index.surfaces.size,records);assert.equal(f.queries.isClaimedPart('fit'),false);
    const selectedIds=new Set(),rays=[];
    selector.select=({position})=>{stagedCalls++;const target=[...f.trial.scene.cells.values()].find(c=>Math.hypot(...c.position.map((v,i)=>v-position[i]))>.85);assert.ok(target);selectedIds.add(target.id);return [{id:target.id,position:[...target.position]}];};
    const plan=f.activation.prepare({whole:['fit-owner']}),preparedCalls=stagedCalls;
    selector.select=()=>{throw Error('Selector must not run inside registration');};selector.observeRay=ray=>rays.push(ray);
    const next=plan.publish();assert.equal(next.revision,before.revision+1);assert.equal(stagedCalls,preparedCalls);assert.equal(f.queries.isClaimedPart('fit'),true);assert.ok(f.trial.metrics().fuel.added>fuel);
    f.trial.step(1);assert.ok(rays.length>0);assert.ok(rays.every(ray=>selectedIds.has(ray.targetId)));assert.equal(stagedCalls,preparedCalls);balanced(f);
  }finally{finish(f);}
});

test('a reentrant radiation selector advances only the old world and invalidates its source stage',()=>{
  const {f,selector}=radiatingWorld();try{
    const before=f.activation.state(),fuel=f.trial.metrics().fuel.added,stock=f.ledger.metrics().coldReserve,tick=f.trial.tick;let reentered=0;
    selector.select=()=>{selector.select=()=>[];reentered++;f.trial.step(1);return [];};
    assert.throws(()=>f.activation.prepare({whole:['fit-owner']}),/Stale native source registration/);assert.equal(reentered,1);assert.equal(f.trial.tick,tick+1);
    assert.equal(f.activation.state(),before);assert.equal(f.trial.metrics().fuel.added,fuel);assert.equal(f.ledger.metrics().coldReserve,stock);assert.equal(f.queries.isClaimedPart('fit'),false);assert.equal(f.activation.metrics().pendingStages,0);balanced(f);
  }finally{finish(f);}
});

test('genuine cold U islands in one original component and cell cannot bridge a retired native bridge',()=>{
  const f=coldIslandWorld();try{
    assert.equal(f.originalComponents,1);const r=f.receipt();f.activation.prepare({whole:['left-owner','right-owner'],receipts:[r]}).publish();
    assert.deepEqual(f.trial.supportGraph.unsupported(),[]);
    const bridges=[...f.trial.scene.index.surfaces.values()].filter(b=>!b.queryOnly&&b.nativePartId==='u');assert.ok(bridges.length>0);assert.ok(bridges.every(b=>b.sourceCell[2]===4));
    f.activation.prepare({retireRecords:bridges.map(b=>b.id)}).publish();const unsupported=f.trial.supportGraph.unsupported();
    const observation={originalComponents:f.originalComponents,nativeBridgeRecords:bridges.map(b=>b.id),rightUnrooted:unsupported.some(b=>b.nativePartId==='right'),leftUnrooted:unsupported.some(b=>b.nativePartId==='left'),worldSteps:f.trial.tick,logicalCells:f.logicalCells,sourceTriangles:f.sourceTriangles};
    console.log('COLD_ISLANDS_OBSERVATION '+JSON.stringify(observation));assert.equal(observation.rightUnrooted,true);assert.equal(observation.leftUnrooted,false);assert.equal(f.trial.tick,0);balanced(f);
  }finally{finish(f);}
});

test('the architect support-notification fault is reported only after all consumers commit',()=>{
  let activated=0,watched=0;const f=world({onActivated(){activated++;committedFloor(f,before);}}),before=f.activation.state();
  try{
    const plan=f.activation.prepare({whole:['floor-owner']}),fault=Error('Injected support notification failure');
    f.trial.supportGraph.sourcesAdded=()=>{committedFloor(f,before);throw fault;};
    f.trial.scene.index.watch([f.queries.queryId('floor')],()=>{watched++;committedFloor(f,before);});
    let caught;assert.throws(()=>plan.publish(),error=>{caught=error;return error instanceof AggregateError&&error.committed===true&&error.errors.includes(fault);});
    assert.equal(caught.publication,committedFloor(f,before));assert.equal(activated,1);assert.equal(watched,1);
    const fuel=f.trial.metrics().fuel.added;assert.throws(()=>plan.publish(),/Stale|committed/);plan.dispose();assert.equal(f.trial.metrics().fuel.added,fuel);
    assert.equal(f.activation.metrics().pendingStages,0);
  }finally{finish(f);}
});

test('post-commit notifications permit consistent reads and reject reentrant publication, steps and mutation',()=>{
  const f=world(),before=f.activation.state();let called=0,other,raw;
  try{
    const plan=f.activation.prepare({whole:['floor-owner']});other=f.activation.prepare({whole:['fit-owner']});
    const fitting={surfaces:inputs().surfaces.filter(s=>s.sourceCarrierId==='fit-owner')};raw=f.trial.prepareSources(fitting);
    f.trial.supportGraph.sourcesAdded=()=>{
      called++;committedFloor(f,before);
      assert.throws(()=>f.activation.prepare({whole:['fit-owner']}),/notifications/);
      assert.throws(()=>other.publish(),/notifications/);assert.throws(()=>f.trial.step(1),/notifications/);
      assert.throws(()=>raw.commit(),/notifications/);assert.throws(()=>f.trial.prepareSources(fitting),/notifications/);
      assert.throws(()=>f.trial.scene.prepareSources(fitting),/notifications/);
      assert.throws(()=>f.trial.scene.index.change(f.queries.queryId('fit'),{intact:false}),/notifications/);
      assert.throws(()=>f.activation.dispose(),/notifications/);assert.equal(f.trial.tick,0);
    };
    assert.equal(plan.publish(),committedFloor(f,before));assert.equal(called,1);other.dispose();other=null;raw.dispose();raw=null;
    assert.equal(f.trial.scene.index.surfaces.get(f.queries.queryId('fit')).intact,true);
    f.trial.step(1);assert.equal(f.trial.tick,1);balanced(f);
  }finally{raw?.dispose();other?.dispose();finish(f);}
});

test('activation and index observer failures are drained and reported without skipping other observers',()=>{
  const activationFault=Error('Injected activation observer failure'),watchFault=Error('Injected index observer failure');let activated=0,watched=0;
  const f=world({onActivated(){activated++;committedFloor(f,before);throw activationFault;}}),before=f.activation.state();
  try{
    const id=f.queries.queryId('floor');
    f.trial.scene.index.watch([id],()=>{watched++;committedFloor(f,before);throw watchFault;});
    f.trial.scene.index.watch([id],()=>{watched++;committedFloor(f,before);});
    assert.throws(()=>f.activation.prepare({whole:['floor-owner']}).publish(),e=>e.committed===true&&e.errors.length===2&&e.errors.includes(activationFault)&&e.errors.includes(watchFault));
    assert.equal(activated,1);assert.equal(watched,2);committedFloor(f,before);assert.equal(f.activation.metrics().pendingStages,0);
  }finally{finish(f);}
});

test('support projects both touched regional parts once per solve and releases the complete projection',()=>{
  const f=world();try{
    const r=f.receipt([0,0,0]);f.activation.prepare({whole:['floor-owner','fit-owner'],receipts:[r]}).publish();
    const regional=f.queries.regional(),before=regional.diagnostics();assert.equal(regional.touched('roof-a'),true);assert.equal(regional.touched('roof-b'),true);
    assert.deepEqual(f.trial.supportGraph.unsupported(),[]);
    const next=regional.diagnostics();assert.equal(next.projectionCalls-before.projectionCalls,1);assert.equal(next.projectedParts-before.projectedParts,2);
    assert.equal(next.liveProjectionLoans,0);assert.equal(f.queries.metrics().workingTriangles,0);assert.equal(f.queries.metrics().workingLeases,0);
    assert.throws(()=>regional.withPieces(()=>{assert.ok(f.queries.metrics().workingTriangles>0);throw Error('Injected projection consumer failure');}),/Injected projection consumer/);
    assert.equal(f.queries.metrics().workingTriangles,0);assert.equal(regional.diagnostics().liveProjectionLoans,0);balanced(f);
  }finally{finish(f);}
});

test('two-part projections use cumulative shared cache budget, including nested failure and new cache admission',()=>{
  const probe=world();let cached,a,b;
  try{
    const regional=probe.queries.regional();cached=probe.queries.metrics().cachedTriangles;
    regional.withPieces(()=>{a=probe.queries.metrics().workingTriangles;},{partId:'roof-a'});
    regional.withPieces(()=>{b=probe.queries.metrics().workingTriangles;},{partId:'roof-b'});
    assert.ok(a>0&&b>0);
  }finally{finish(probe);}
  // The registry reserves 8192 fallback triangles. This lowers the existing
  // total ceiling for a meaningful tiny control; no large synthetic mesh.
  const low=world({queryLimits:{triangles:8192+cached+Math.max(a,b)}});
  try{
    const regional=low.queries.regional();
    regional.withPieces(()=>{}, {partId:'roof-a'});regional.withPieces(()=>{}, {partId:'roof-b'});
    assert.throws(()=>regional.withPieces(()=>{}),/exceeds combined cache/);assert.equal(low.queries.metrics().workingTriangles,0);
    regional.withPieces(()=>{
      assert.equal(low.queries.metrics().workingTriangles,a);
      assert.throws(()=>regional.withPieces(()=>{}, {partId:'roof-b'}),/exceeds combined cache/);
      assert.equal(low.queries.metrics().workingTriangles,a);assert.equal(low.queries.metrics().workingLeases,1);
    },{partId:'roof-a'});
    assert.equal(low.queries.metrics().workingTriangles,0);assert.equal(low.queries.metrics().workingLeases,0);
  }finally{finish(low);}
  const exact=world({queryLimits:{triangles:8192+cached+a+b}});
  try{
    const regional=exact.queries.regional();
    regional.withPieces(()=>regional.withPieces(()=>{
      const q=exact.queries.metrics();assert.equal(q.workingTriangles,a+b);assert.equal(q.workingLeases,2);
      assert.throws(()=>exact.queries.reserveSourceGeometry('injected-extra',[[[0,0,0],[.1,0,0],[0,0,.1]]]),/exceeds combined query cache/);
      assert.equal(exact.queries.metrics().workingTriangles,a+b);assert.equal(exact.queries.metrics().cachedTriangles,cached);
    },{partId:'roof-b'}),{partId:'roof-a'});
    assert.equal(exact.queries.metrics().workingTriangles,0);assert.equal(regional.diagnostics().liveProjectionLoans,0);
  }finally{finish(exact);}
});

test('lazy shape loans stay counted, block publication while borrowed, and clear on release or disposal',()=>{
  const f=world();let disposed=false;
  try{
    const a=f.queries.shape('roof-a'),b=f.queries.shape('roof-b'),regional=f.queries.regional(),before=regional.diagnostics().projectionCalls;
    assert.equal(sweptCylinderClear({x:1.3,y:.2},{x:1.3,y:.2},.05,-.01,.01,a),false);
    assert.equal(regional.diagnostics().projectionCalls,before);assert.equal(f.queries.metrics().workingTriangles,0);
    const ta=a.triangles,tb=b.triangles;assert.ok(ta.length>0&&tb.length>0);assert.equal(f.queries.metrics().workingLeases,2);
    assert.throws(()=>f.activation.prepare(),/Release borrowed physical query geometry/);assert.equal(f.activation.state().revision,0);
    a.release();a.release();assert.equal(ta.length,0);b.release();assert.equal(tb.length,0);assert.equal(f.queries.metrics().workingTriangles,0);
    f.activation.prepare({whole:['floor-owner']}).publish();assert.equal(f.activation.state().revision,1);
    const held=f.queries.shape('roof-a'),ts=held.triangles;assert.ok(ts.length>0);assert.equal(f.queries.metrics().workingLeases,1);
    const floor=[...f.trial.scene.index.surfaces.values()].find(b=>!b.queryOnly&&b.nativePartId==='floor');
    assert.throws(()=>f.trial.scene.index.change(floor.id,{intact:false}),/Release borrowed physical query geometry/);assert.equal(floor.intact,true);assert.equal(f.activation.state().revision,1);
    assert.throws(()=>f.trial.step(1),/Release borrowed physical query geometry/);assert.equal(f.trial.tick,0);
    finish(f);disposed=true;assert.equal(ts.length,0);held.release();assert.throws(()=>held.triangles,/disposed/);
    assert.equal(f.queries.metrics().workingLeases,0);assert.equal(f.queries.metrics().workingTriangles,0);
  }finally{if(!disposed)finish(f);}
});

test('native landing footprints release borrowed cold geometry before the next source publication',()=>{
  const f=world();try{
    const boundary=f.trial.scene.index.surfaces.get(f.queries.queryId('roof-a'));
    assert.throws(()=>boundary.withSourceGeometry(()=>{throw Error('Injected footprint consumer failure');}),/Injected footprint consumer/);assert.equal(f.queries.metrics().workingTriangles,0);
    f.trial.command({type:'lantern',from:[3.2,.8,.2],velocity:[0,0,0]});f.trial.step(15);
    assert.ok(f.trial.events.some(e=>e.type==='landing'&&e.supportBoundaryId===boundary.id));assert.equal(f.queries.metrics().workingTriangles,0);assert.equal(f.queries.metrics().workingLeases,0);
    f.activation.prepare({receipts:[f.receipt([4,0,0])]}).publish();assert.equal(f.activation.state().revision,1);balanced(f);
  }finally{finish(f);}
});

test('existing cosmetic follow partition releases all borrowed regional parent geometry',()=>{
  const f=world();try{
    const model={parts:[{id:'roof-a',physical:true},{id:'roof-b',physical:true}],carrierById:new Map([['roof-owner',{parts:[0,1]}]]),follows:[{partId:'paint',parents:['roof-owner'],semantics:'all-live-local-parents'}]},follow=createSourceFollow({model,trial:f.trial,querySource:f.queries,activation:f.activation});
    const chunks=follow.partition({id:'paint'},{triangles:[[[1.2,.02,.12],[1.3,.02,.12],[1.3,.02,.22]]]});assert.ok(chunks.length>0);assert.ok(chunks.every(c=>c.present));assert.equal(f.queries.metrics().workingTriangles,0);assert.equal(f.queries.metrics().workingLeases,0);
    f.activation.prepare({whole:['floor-owner']}).publish();balanced(f);
  }finally{finish(f);}
});
