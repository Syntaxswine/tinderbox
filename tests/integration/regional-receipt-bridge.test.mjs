import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createRegionalSourcePilot as producerFor,createRegionalClaimLedger} from '../../src/simulation/regional-source-pilot.js';
import {createRegionalReceiptBridge} from '../../src/runtime/regional-receipt-bridge.js';
import {bounds} from '../../workbenches/furnished-house/geometry.js';
import {boxTriangles} from '../fixtures/regional-query-data.mjs';
import {fixture,plane} from '../fixtures/regional-source-data.mjs';
import {disconnected,closed,queryInput} from '../fixtures/regional-bridge-data.mjs';
const producers=[];
function setup(input=disconnected()){const producer=producerFor(input);producers.push(producer);const bridge=createRegionalReceiptBridge({producer,...queryInput(input)});return {input,producer,bridge};}
const prepare=(b,receipts=[],retireRecords=[])=>{const s=b.state();return b.prepare({expectedGeneration:s.generation,expectedRevision:s.revision,receipts,retireRecords});};
const publish=(b,r=[],retireRecords=[])=>prepare(b,r,retireRecords).publish();
const compile=(p,min)=>p.compile(p.region('fixture::owner',min));
const ids=(b,s=b.state())=>[...new Set(b.faces(s,{channel:'solid'}).map(p=>p.recordId))].sort();
after(()=>console.log(JSON.stringify({bridgeFixtures:{syntheticCompilerCalls:producers.reduce((n,p)=>n+p.diagnostics().nativeCalls,0),retainedReceipts:producers.reduce((n,p)=>n+p.diagnostics().retainedReceipts,0),actualRoofCompilations:0,worldTrials:0,worldSteps:0}})));

test('bridge starts cold with zero inventory and publishes disjoint original geometry and stock together',()=>{
  const {producer:p,bridge:b}=setup();try{
    const cold=b.state(),r=compile(p,[0,0,0]),native=r.scene.index.surfaces.get('left'),slice=b.slice(r);
    assert.equal(cold.revision,0);assert.equal(b.diagnostics().nativeRecords,0);assert.equal(cold.stockSnapshot.owners[0].state,'cold');assert.ok(!('scene'in slice)&&!('entries'in slice));
    const plan=prepare(b,[r]);plan.validate();assert.equal(b.state(),cold);assert.equal(b.diagnostics().nativeRecords,0);assert.equal(cold.stockSnapshot.claimedNativeIds,0);
    const a=plan.publish(),piece=b.faces(a,{channel:'solid'}).find(q=>q.recordId==='left');
    assert.equal(a.revision,1);assert.equal(a.generation,0);assert.equal(a.stockSnapshot.generation,a.queryView.generation);assert.equal(a.revision,a.queryView.revision);
    assert.equal(piece.record.triangles,native.triangles);assert.equal(piece.record.bounds,native.bounds);assert.equal(piece.record.normal,native.normal);assert.equal(piece.sourceSurfaceId,native.sourceSurfaceId);assert.equal(piece.record.id,native.id);assert.ok(!('heatCells'in piece.record));assert.ok(!Object.isFrozen(native));assert.ok(!Object.isFrozen(native.heatCells[0]));
    assert.equal(a.stockSnapshot.owners[0].canonicalTransferred,r.certificate.canonicalQuantity);assert.equal(a.stockSnapshot.owners[0].nativeBorn,r.nativeQuantity);assert.equal(b.diagnostics().nativeRecords,1);assert.ok(ids(b).includes('cold/fixture/part'));assert.ok(ids(b).includes('left'));assert.deepEqual(ids(b,cold),['cold/fixture/part']);
    const right=compile(p,[8,0,0]);publish(b,[right]);assert.equal(b.diagnostics().nativeRecords,2);assert.equal(b.state().stockSnapshot.owners[0].nativeBorn,2);assert.ok(ids(b).includes('right'));assert.ok(!ids(b,a).includes('right'));
    r.dispose();right.dispose();assert.ok(ids(b,a).includes('left'),'held geometry survives receipt scene disposal');assert.throws(()=>plan.publish(),/Stale/);
  }finally{b.dispose();p.dispose();}
});

test('producer attests complete empty closed-interior coverage independently of zero fuel',()=>{
  const {producer:p,bridge:b}=setup(closed());try{
    const point={x:2.75,y:2.75},cold=b.state();assert.equal(b.sweptCylinderClear(cold,point,point,.2,1.2,1.8),false);
    const r=compile(p,[4,1,4]);assert.equal(r.scene.index.surfaces.size,0);assert.equal(r.trace.visitedCells,16);assert.equal(r.nativeQuantity,0);publish(b,[r]);
    assert.equal(b.diagnostics().nativeRecords,0);assert.equal(b.diagnostics().claimedCells,16);assert.equal(b.state().stockSnapshot.owners[0].claimedRegions,1);
    assert.equal(b.sweptCylinderClear(b.state(),point,point,.2,1.2,1.8),true);assert.equal(b.sweptCylinderClear(b.state(),point,point,1.2,1.2,1.8),false);assert.equal(b.sweptCylinderClear(cold,point,point,.2,1.2,1.8),false);
    assert.throws(()=>prepare(b,[{...r,complete:true}]),/Unknown|stale/);assert.throws(()=>prepare(b,[r]),/overlapping/);
  }finally{b.dispose();p.dispose();}
});

test('forged, foreign, incomplete and changed receipts fail without hidden stock or query claims',()=>{
  const {producer:p,bridge:b}=setup(),foreign=producerFor(disconnected());producers.push(foreign);const r=compile(p,[0,0,0]),other=compile(foreign,[0,0,0]);try{
    const cold=b.state(),baseline=b.diagnostics();
    for(const value of [{...r},other,b.slice(r),{complete:true,nativeQuantity:0,entries:[]}]){assert.throws(()=>prepare(b,[value]),/Unknown|stale/);assert.equal(b.state(),cold);assert.equal(b.diagnostics().nativeRecords,0);}
    assert.throws(()=>b.slice({...r}),/Unknown|stale/);assert.throws(()=>createRegionalClaimLedger(p),/already/);
    const native=r.scene.index.surfaces.get('left');r.scene.index.surfaces.delete('left');assert.throws(()=>prepare(b,[r]),/physical receipt/);r.scene.index.surfaces.set('left',native);
    assert.throws(()=>prepare(b,[r,r]),/overlapping/);assert.deepEqual(b.diagnostics(),baseline);publish(b,[r]);assert.equal(b.state().stockSnapshot.owners[0].claimedRegions,1);
  }finally{b.dispose();p.dispose();foreign.dispose();}
});

test('disposal or physical changes between prepare and publication leave the complete state unchanged',()=>{
  const {producer:p,bridge:b}=setup();try{
    const r=compile(p,[0,0,0]),keep=compile(p,[8,0,0]),cold=b.state(),plan=prepare(b,[r]),native=r.scene.index.surfaces.get('left');
    native.intact=false;assert.throws(()=>plan.publish(),/physical receipt/);assert.equal(b.state(),cold);assert.equal(cold.stockSnapshot.claimedNativeIds,0);native.intact=true;plan.validate();r.dispose();assert.throws(()=>plan.publish(),/stale/);plan.dispose();
    assert.equal(b.diagnostics().pendingStages,0);assert.equal(b.diagnostics().query.retainedViews,1);assert.equal(keep.scene.index.surfaces.size,1);publish(b,[keep]);assert.equal(b.diagnostics().nativeRecords,1);
    const later=prepare(b);p.dispose();assert.throws(()=>later.publish(),/disposed/);later.dispose();
  }finally{b.dispose();p.dispose();}
});

test('competing stages reject stale publication and can retry disjoint receipts with no advanced hidden claims',()=>{
  const {producer:p,bridge:b}=setup();try{
    const left=compile(p,[0,0,0]),right=compile(p,[8,0,0]),a=prepare(b,[left]),z=prepare(b,[right]);z.publish();const current=b.state();
    assert.throws(()=>a.publish(),/Stale/);assert.equal(b.state(),current);assert.ok(!ids(b).includes('left'));a.dispose();publish(b,[left]);assert.equal(b.state().stockSnapshot.owners[0].claimedRegions,2);assert.equal(b.diagnostics().nativeRecords,2);
    const duplicate=compile(p,[0,0,0]);assert.throws(()=>prepare(b,[duplicate]),/overlapping/);assert.equal(duplicate.scene.index.surfaces.size,1,'failed stage retains caller-owned receipt');
  }finally{b.dispose();p.dispose();}
});

test('query admission failure preserves unsupported native floor and caller work without stock publication',()=>{
  const input=fixture([plane('floor',[.1,1.06,.1],[.3,1.06,.3],1,{nativePartId:'fixture/part',kind:'floor',closedShape:true,thickness:.12})]),p=producerFor(input);producers.push(p);
  const q=queryInput(input),s=q.sources[0],solid=boxTriangles([.1,.94,.1],[.3,1.06,.3]);s.solidTriangles=solid;s.rayRecord.solidTriangles=solid;s.rayRecord.bounds=bounds(solid.flat());s.partRef.bounds=s.rayRecord.bounds;
  const b=createRegionalReceiptBridge({producer:p,...q});try{
    const r=compile(p,[0,1,0]),cold=b.state(),baseline=b.diagnostics();assert.ok(r.scene.index.surfaces.get('floor').solidTriangles.some(t=>t.some(v=>v[1]<1.06)));
    assert.throws(()=>prepare(b,[r]),/cell halo|off-grid original query cell/);assert.equal(b.state(),cold);assert.deepEqual(b.diagnostics(),baseline);assert.equal(r.scene.index.surfaces.size,1);assert.equal(r.scene.fuels.size,1);assert.equal(cold.stockSnapshot.owners[0].state,'cold');
  }finally{b.dispose();p.dispose();}
});

test('held views retain same-cell siblings after named retirement; unified reset drops generation inventory and stages',()=>{
  const input=fixture(['a','b'].map(id=>plane(id,[.1,.2,.1],[.3,.2,.3],1,{nativePartId:'fixture/part',closedShape:false}))),{producer:p,bridge:b}=setup(input);try{
    const descriptor=p.regions('fixture::owner')[0],r=p.compile(descriptor),slice=b.slice(r),native=publish(b,[r]),birth=native.stockSnapshot.owners[0].nativeBorn;
    publish(b,[],['a']);assert.deepEqual(ids(b),['b']);assert.deepEqual(ids(b,native),['a','b']);assert.equal(b.state().stockSnapshot.owners[0].nativeBorn,birth);assert.throws(()=>prepare(b,[],['a']),/retirement/);
    const pending=prepare(b),current=b.state();b.release(native);assert.throws(()=>b.faces(native,{channel:'solid'}),/released/);const reset=b.reset();assert.equal(reset.generation,1);assert.equal(reset.queryView.generation,1);assert.equal(reset.revision,0);assert.equal(reset.stockSnapshot.owners[0].state,'cold');assert.equal(b.diagnostics().nativeRecords,0);assert.equal(b.diagnostics().claimedCells,0);assert.equal(b.diagnostics().query.retainedViews,1);assert.equal(b.diagnostics().stock.retainedStockStates,1);assert.equal(p.diagnostics().retainedReceipts,0);
    assert.throws(()=>pending.publish(),/Stale/);assert.throws(()=>b.faces(current,{channel:'solid'}),/stale/);assert.throws(()=>p.compile(descriptor),/stale/);assert.throws(()=>b.slice(r),/stale/);assert.equal(slice.epoch,0);assert.deepEqual(ids(b),['cold/fixture/part']);
  }finally{b.dispose();p.dispose();assert.equal(b.diagnostics().heldStates,0);assert.equal(b.diagnostics().query.nativeRecords,0);assert.equal(b.diagnostics().stock.retainedStockStates,0);}
});

test('held-view ceiling rejects preparation atomically and release permits a new publication',()=>{
  const {producer:p,bridge:b}=setup();try{
    const held=[b.state()];for(let i=0;i<15;i++)held.push(publish(b));const baseline=b.diagnostics(),current=b.state();assert.throws(()=>prepare(b),/Release old/);assert.equal(b.state(),current);assert.deepEqual(b.diagnostics(),baseline);b.release(held[0]);publish(b);assert.equal(b.diagnostics().heldStates,16);assert.equal(b.diagnostics().stock.retainedStockStates,16);
  }finally{b.dispose();p.dispose();}
});

test('constructor binding rejection releases its lock without disposing caller receipts or changing epoch',()=>{
  const input=disconnected(),p=producerFor(input);producers.push(p);const r=compile(p,[0,0,0]);let b;try{
    for(const change of [{sourceRevision:'b'.repeat(64)},{grid:{origin:[1,0,0],pitch:[.5,1.06,.5]}},{sources:[]}])assert.throws(()=>createRegionalReceiptBridge({producer:p,...queryInput(input),...change}),/mismatch/);
    assert.equal(p.diagnostics().epoch,0);assert.equal(r.scene.index.surfaces.size,1);b=createRegionalReceiptBridge({producer:p,...queryInput(input)});publish(b,[r]);assert.equal(b.diagnostics().nativeRecords,1);
  }finally{b?.dispose();p.dispose();}
});

test('zero-fuel receipts still admit original surfaces and both borrowed channels, never imply empty coverage',()=>{
  const input=fixture([plane('inert',[.1,.2,.1],[.3,.2,.3],0,{nativePartId:'fixture/part',closedShape:false,thickness:.01})]),{producer:p,bridge:b}=setup(input);try{
    const r=compile(p,[0,0,0]),original=r.scene.index.surfaces.get('inert');assert.equal(r.nativeQuantity,0);assert.equal(r.scene.fuels.size,0);assert.notEqual(original.triangles,original.solidTriangles);publish(b,[r]);
    for(const channel of ['surface','solid']){const pieces=b.faces(b.state(),{channel});assert.ok(pieces.length);assert.ok(pieces.every(v=>v.recordId==='inert'));assert.equal(pieces[0].record.triangles,original.triangles);assert.equal(pieces[0].record.solidTriangles,original.solidTriangles);assert.equal(pieces[0].record.bounds,original.bounds);}
    assert.equal(b.diagnostics().nativeRecords,1);assert.equal(b.state().stockSnapshot.owners[0].nativeBorn,0);assert.equal(b.trace(b.state(),[.2,0,.2],[.2,.4,.2]).transmission,.02);
  }finally{b.dispose();p.dispose();}
});

test('a competing publication during receipt validation cannot be overwritten by an older stage',()=>{
  const {producer:p,bridge:b}=setup();try{
    const left=compile(p,[0,0,0]),right=compile(p,[8,0,0]),a=prepare(b,[left]),z=prepare(b,[right]),original=Object.getOwnPropertyDescriptor(left.scene,'index');
    // A self-restoring getter leaves the guarded physical data unchanged but
    // performs a genuine competing publication while the old stage validates.
    Object.defineProperty(left.scene,'index',{configurable:true,enumerable:true,get(){Object.defineProperty(left.scene,'index',original);z.publish();return original.value;}});
    assert.throws(()=>a.publish(),/Stale/);assert.equal(b.state().revision,1);assert.equal(b.diagnostics().nativeRecords,1);assert.ok(ids(b).includes('right'));assert.ok(!ids(b).includes('left'));a.dispose();publish(b,[left]);assert.equal(b.state().stockSnapshot.owners[0].claimedRegions,2);
  }finally{b.dispose();p.dispose();}
});
