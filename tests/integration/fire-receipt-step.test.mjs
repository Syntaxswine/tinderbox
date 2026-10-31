import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {createSimulation} from '../../src/simulation/index.js';import {HeatField} from '../../src/simulation/field.js';
import {createFireReviewSimulation} from '../../tools/fire-realism/scenarios.js';import {presentFireReviewCallback} from '../../tools/fire-realism/live-cadence.js';import {createFireFrameAdapter} from '../../src/art/fire-frame.js';
const plain={width:12,height:8,player:{x:2.25,y:4.25,tool:'molotov'},obstacles:[],actors:[]};
test('immutable0a732ef engine matches full snapshots excluding only two additive char keys; receipts/bookkeeping/clocks stay exact',context=>{
 const result=JSON.parse(execFileSync(process.execPath,['--experimental-vm-modules','tests/fixtures/fire-receipt-baseline.mjs'],{encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']}));assert.equal(result.status,'pass');assert.equal(result.preChange,'0a732ef91809699d9c33359e22016d5674525356');assert.equal(result.portableFrozenFixture,true);assert.equal(result.scenarios.length,6);assert.ok(result.comparedExactFullSnapshots>=1800);assert.ok(result.comparedExactReceiptProjections>=900);assert.ok(result.sourceHashes['src/simulation/index.js']);context.diagnostic(JSON.stringify({baseline:result.preChange,exactSnapshots:result.comparedExactFullSnapshots,exactReceipts:result.comparedExactReceiptProjections,lifecycleEvents:result.lifecycleEvents}));
});
test('hidden receipt steps take no full field snapshots; live callbacks take one full snapshot and include its CPU work',()=>{
 const original=HeatField.prototype.snapshot;let count=0;HeatField.prototype.snapshot=function(...args){count++;return original.apply(this,args);};
 const sim=createFireReviewSimulation({scenario:'street-fire'}),observer=createFireFrameAdapter();let snapshot=sim.snapshot();observer.update(snapshot);count=0;const observations=[];
 try{const run=frames=>presentFireReviewCallback({frames,advance:()=>sim.advanceReceiptStep(),observe(receipt){assert.equal(receipt.kind,'simulation-event-receipt');assert.ok(!('cells'in receipt)&&!('player'in receipt)&&!('world'in receipt));observer.observe(receipt);observations.push(receipt);},snapshot(){snapshot=sim.snapshot();},present(){observer.update(snapshot);},draw(){}});
  const batch=run(13);assert.equal(count,1);assert.equal(batch.fullSnapshots,1);assert.equal(batch.fixedSteps,13);assert.equal(observations.length,13);assert.equal(snapshot.tick,13);assert.ok(batch.snapshotMs>0);assert.ok(batch.simulationMs>=batch.snapshotMs);assert.ok(batch.totalCpuMs>=batch.simulationMs);assert.equal(observer.diagnostics().pendingEvents,0);
  const before=count,zero=run(0);assert.equal(count,before);assert.equal(zero.fullSnapshots,0);assert.equal(zero.snapshotMs,0);sim.advance();assert.equal(count,before+1,'Canonical advance still eagerly returns its full snapshot');
 }finally{sim.dispose();HeatField.prototype.snapshot=original;}
});
test('receipt data is detached and pause/reset/disposed semantics remain exact',()=>{
 const sim=createSimulation({scenario:plain}),mirror=createSimulation({scenario:plain});try{
  for(const command of [{type:'aim',x:8.25,y:4.25},{type:'primary',pressed:true}])for(const s of [sim,mirror])s.dispatch(command);
  const receipt=sim.advanceReceiptStep(),expected=mirror.advance(1/60);assert.deepEqual(receipt.events,expected.events);receipt.clocks.world=999;receipt.diagnostics.generation=999;receipt.events[0].x=999;assert.deepEqual(sim.snapshot(),expected);
  for(const command of [{type:'pause',paused:true},{type:'reset'},{type:'pause',paused:false}]){for(const s of [sim,mirror])s.dispatch(command);const next=sim.advanceReceiptStep(),full=mirror.advance(1/60);assert.deepEqual(sim.snapshot(),full);assert.deepEqual(next.clocks,full.clocks);assert.equal(next.diagnostics.generation,full.diagnostics.generation);}
 }finally{sim.dispose();mirror.dispose();}assert.throws(()=>sim.advanceReceiptStep(),/disposed/);assert.throws(()=>sim.advance(1/60),/disposed/);assert.throws(()=>sim.snapshot(),/disposed/);assert.equal(sim.dispatch({type:'reset'}),false);sim.dispose();
});
test('actual undated narrow receipts preserve observed times through generation and bounded event-ring rollover',()=>{
 const sim=createSimulation({scenario:plain,config:{events:{capacity:4}}}),adapter=createFireFrameAdapter();adapter.update(sim.snapshot());const seen=[];let generation=0;
 try{for(let i=0;i<20;i++){
  sim.dispatch({type:'pause',paused:i%2===0});const receipt=sim.advanceReceiptStep();adapter.observe(receipt);const frame=adapter.update(sim.snapshot());for(const event of frame.eventReceipts.events){assert.equal(event.worldTime,undefined);assert.equal(event.receivedWorldTime,receipt.clocks.world);assert.equal(event.receivedGeneration,receipt.diagnostics.generation);seen.push(event.id);}assert.ok(receipt.events.length<=4);generation=receipt.diagnostics.generation;
 }
 assert.equal(new Set(seen).size,seen.length);assert.ok(seen.length>4);sim.dispatch({type:'reset'});const reset=sim.advanceReceiptStep();assert.ok(reset.diagnostics.generation>generation);adapter.observe(reset);const primed=adapter.update(sim.snapshot());assert.equal(primed.eventReceipts.reset,true);assert.deepEqual(primed.eventReceipts.events,[]);
 sim.dispatch({type:'pause',paused:true});const fresh=sim.advanceReceiptStep();adapter.observe(fresh);const frame=adapter.update(sim.snapshot());assert.equal(frame.eventReceipts.events.length,1);assert.equal(frame.eventReceipts.events[0].receivedWorldTime,fresh.clocks.world);
 }finally{sim.dispose();adapter.reset();}
});
