import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {reviewedCohortFixture} from '../fixtures/reviewed-cohort-data.mjs';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {inspectSharedMapInputs} from '../../src/content/shared-map-admission.js';
import {sharedMapInputInventory} from '../../src/content/shared-map-inputs.js';
import {loadReviewedNewYorkInputs,REVIEWED_NEW_YORK_INPUTS} from '../../src/content/new-york-reviewed-inputs.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import {createTrial,calmWind,trialDiagnostics,limitDiagnosticTrialSteps} from '../../workbenches/furnished-house/simulation.js';
import {sceneCompileDiagnostics,limitDiagnosticSceneCompiles,compileScene} from '../../workbenches/furnished-house/scene.js';
const evidence=[],resources=[];limitDiagnosticTrialSteps(64);
const compile=(f,signal)=>compileSharedMap(f.index,f.library,f.navigation,{inputFactory:f.factory(),signal});
function world(c){const query=c.createQuerySource(),ledger=createSourceCarrierLedger(c.sourceCarriers,{modes:c.sourceOwnerModes});let trial,activation;try{trial=createTrial(c.data,{querySource:query,supportGraphFactory:c.supportGraphFactory,wind:calmWind});activation=c.createActivation({trial,querySource:query,ledger});return {query,ledger,trial,activation,dispose(){activation.dispose();trial.dispose();query.dispose();ledger.dispose();resources.push({query:query.metrics(),inputs:c.metrics().inputs,geometry:c.sources.metrics()});}};}catch(error){activation?.dispose();trial?.dispose();query.dispose();ledger.dispose();throw error;}}
after(()=>console.log('REVIEWED_COHORT_RESOURCES '+JSON.stringify({evidence,resources,compiler:sceneCompileDiagnostics(),trial:trialDiagnostics(),actualReviewedPilotRuns:0,actualSourceTransforms:0})));
test('explicit reviewed cohort preserves all alternatives; strict admission/default remains strict',()=>{const f=reviewedCohortFixture(),c=compileSharedMap(f.index,f.library,f.navigation);try{const inv=sharedMapInputInventory(c.model),scoped=inspectSharedMapInputs(f.descriptor,inv,f.policy),strict=structuredClone(f.descriptor);delete strict.cohort;assert.equal(scoped.status,'READY');assert.deepEqual(scoped.supportScope,{kind:'reviewed-positive-cohort-v1',owners:4,parts:4,bonds:3,anchors:2,ordinaryParentReferences:2,outsideCohortUnresolved:1,excludedAlternatives:'RECORDED_NOT_SUPPORTING',fullMapComplete:false});assert.ok(inspectSharedMapInputs(strict,inv,f.policy).findings.some(f=>f.code==='ORDINARY_BINDINGS_NOT_READY'));assert.equal(c.data.internalHybrid,undefined);assert.throws(()=>c.inputRegions('roof'),/Explicit reviewed/);assert.equal(c.sources.metrics().transformedQueries,0);}finally{c.dispose();}});
test('cohort omission, membership/reference edits and unreviewed witnesses cannot gain scope authority',()=>{for(const mutate of [f=>f.descriptor.support.ordinaryAlternatives[0].parentIds.pop(),f=>f.descriptor.cohort.reviewRef.sha256='0'.repeat(64),f=>f.descriptor.support.anchors.push({...f.descriptor.support.anchors[0],id:'extra'}),f=>f.descriptor.support.bonds[0].parent.point[0]+=.01]){const f=reviewedCohortFixture();mutate(f);assert.throws(()=>compile(f),e=>e.code==='MAP_INPUT_NOT_READY');assert.equal(f.loads.length,0);}});
test('owned receipts, staged stock/support inspection, independent ALL losses, adjacent publication and reset share one host',async()=>{const f=reviewedCohortFixture(),controller=new AbortController(),c=compile(f,controller.signal);let w,reset,r0,r1;try{await c.prepareInputs();w=world(c);const before=c.sources.metrics().transformedQueries,initial=w.activation.state();assert.throws(()=>w.activation.ensure(['fixture::outside']),/Out-of-cohort/);assert.equal(c.sources.metrics().transformedQueries,before);const regions=c.inputRegions('roof');assert.equal(regions.length,2);r0=c.compileInputRegion(regions[0]);const stage=w.activation.prepare({whole:['fixture::floor','fixture::fit','fixture::upper'],receipts:[r0]}),view=stage.inspect();assert.equal(view.wholeQuantities.length,3);assert.ok(view.wholeQuantities.every(r=>r.partitionError?.surfaces.length));assert.ok(view.support.ports.every(p=>p.live));view.quantity=-10;view.support.ports[0].live=false;assert.ok(stage.inspect().quantity>0);assert.ok(stage.inspect().support.ports.every(p=>p.live));assert.equal(w.ledger.metrics().activeInitial,0);assert.equal(w.query.isClaimedCarrier('fixture::fit'),false);stage.publish();assert.throws(()=>stage.inspect(),/Stale/);assert.equal(w.activation.state().revision,1);assert.ok(w.trial.supportGraph.snapshot().ports.every(p=>p.live));assert.equal(w.query.isClaimedCarrier('fixture::outside'),false);assert.throws(()=>w.activation.prepare({expected:initial}),/Stale/);const snapshot=JSON.stringify(w.activation.metrics());assert.throws(()=>w.activation.prepare({receipts:[r0]}),/Duplicate|overlap|already|changed/i);assert.equal(JSON.stringify(w.activation.metrics()),snapshot);
    const ports=w.trial.supportGraph.snapshot().ports;for(const id of ['floor-port','roof-port']){const fixed=ports.find(p=>p.id===id).parent,pending=w.activation.prepare({retireRecords:[fixed]});assert.equal(pending.inspect().support.ports.find(p=>p.id===id).live,false);assert.ok(pending.inspect().support.unrootedIds.some(id=>w.trial.scene.index.surfaces.get(id)?.nativePartId==='fit'));pending.dispose();assert.equal(w.trial.supportGraph.snapshot().ports.find(p=>p.id===id).live,true);}
    const fixed=ports.find(p=>p.id==='floor-port').parent;w.activation.prepare({retireRecords:[fixed]}).publish();r1=c.compileInputRegion(regions[1]);w.activation.prepare({receipts:[r1]}).publish();assert.equal(w.trial.supportGraph.snapshot().ports.find(p=>p.id==='floor-port').live,false);assert.equal(w.trial.tick,0);r0.dispose();r1.dispose();w.dispose();w=null;reset=world(c);assert.equal(c.sources.metrics().transformedQueries,8);assert.equal(c.metrics().inputs.binds,2);assert.throws(()=>c.compileInputRegion(regions[0]),/Unknown|stale/);assert.throws(()=>reset.activation.prepare({receipts:[r0]}),/Unknown|stale/);controller.abort();assert.throws(()=>c.compileInputRegion(regions[1]),/abort/i);assert.equal(reset.trial.tick,0);evidence.push({committedGenerations:3,sourceTransforms:8,projectionLoads:f.loads.length,resetRegistryEpoch:c.registration().generation,clockSteps:0});
  }finally{r0?.dispose();r1?.dispose();w?.dispose();reset?.dispose();c.dispose();}});
test('an unborn regional boundary port remains fixed to its authored cold cell',async()=>{const f=reviewedCohortFixture({boundaryRoofPort:true}),c=compile(f);let w,r;try{await c.prepareInputs();w=world(c);const regions=c.inputRegions('roof');r=c.compileInputRegion(regions.find(r=>r.cellMin[0]===4));const p=w.activation.prepare({whole:['fixture::floor','fixture::fit','fixture::upper'],receipts:[r]});const preview=p.inspect();evidence.push({coldBoundaryPreview:preview.support});assert.equal(preview.support.ports.find(p=>p.id==='roof-port').live,true);p.publish();assert.equal(w.trial.supportGraph.snapshot().ports.find(p=>p.id==='roof-port').live,true);}finally{r?.dispose();w?.dispose();c.dispose();}});
test('runtime loader consumes only pinned in-repository assets and numerical evidence stays non-authoritative',async()=>{const loaded=[],result=await loadReviewedNewYorkInputs({load:async ref=>{assert.ok(ref.path.startsWith('assets/runtime/'));const bytes=fs.readFileSync(ref.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),ref.sha256);loaded.push(ref.path);return JSON.parse(bytes);}});assert.equal(loaded.length,3);assert.equal(result.descriptor.parts.length,38);assert.equal(result.policy.approvedBonds.length,37);assert.equal(result.numericalEvidence.nativeReceiptAuthority,null);assert.equal(result.numericalEvidence.freshNativePreparation,'MUST_DERIVE_OWN_CERTIFICATES_AND_RECEIPTS');assert.equal(REVIEWED_NEW_YORK_INPUTS.length,3);const signal=AbortSignal.abort();await assert.rejects(loadReviewedNewYorkInputs({signal}),/abort/i);});
test('whole then regional publication exposes complete stock/query/support after commit',async()=>{
  const f=reviewedCohortFixture(),c=compile(f);let w,r,off,expected;const observed=[];
  try{
    await c.prepareInputs();w=world(c);
    const observe=()=>{
      const state=w.activation.state();if(observed.includes(state.revision))return;
      assert.equal(state.revision,expected.revision);
      assert.equal(w.activation.metrics().nativeRecords,expected.nativeRecords);
      assert.equal(w.query.metrics().claimedCarriers,3);
      assert.equal(w.ledger.metrics().activeCarriers,expected.activeCarriers);
      assert.deepEqual(w.trial.supportGraph.snapshot(),expected.support);
      observed.push(state.revision);
    };
    off=w.trial.scene.index.observeMutation(observe);
    const whole=w.activation.prepare({whole:['fixture::floor','fixture::fit','fixture::upper']}),preview=whole.inspect();
    assert.ok(preview.nativeRecordCount>0);assert.equal(w.ledger.metrics().activeInitial,0);
    expected={revision:1,nativeRecords:preview.nativeRecordCount,activeCarriers:3,support:preview.support};whole.publish();
    r=c.compileInputRegion(c.inputRegions('roof')[0]);const regional=w.activation.prepare({receipts:[r]}),next=regional.inspect();
    expected={revision:2,nativeRecords:expected.nativeRecords+next.nativeRecordCount,activeCarriers:4,support:next.support};regional.publish();observe();
    assert.deepEqual(observed,[1,2]);evidence.push({atomicWholeThenRegional:observed});
  }finally{off?.();r?.dispose();w?.dispose();c.dispose();}
});
test('two complete cold cells keep the unchanged unborn boundary port in its authored cell',async()=>{
  const f=reviewedCohortFixture({boundaryRoofPort:true,wideColdRoof:true}),c=compile(f);let w,r,birth;
  try{
    await c.prepareInputs();w=world(c);r=c.compileInputRegion(c.inputRegions('roof').find(r=>r.cellMin[0]===4));
    const pending=w.activation.prepare({whole:['fixture::floor','fixture::fit','fixture::upper'],receipts:[r]}),view=pending.inspect();
    evidence.push({wideColdBoundary:view.support});
    assert.equal(view.support.ports.find(p=>p.id==='roof-port').live,true);
    assert.equal(view.support.unresolvedBindings.length,0);assert.ok(view.support.ports.find(p=>p.id==='roof-port').parent.includes('/3,0,0/'));pending.publish();
    birth=c.compileInputRegion(c.inputRegions('roof').find(r=>r.cellMin[0]===0));w.activation.prepare({receipts:[birth]}).publish();
    const port=w.trial.supportGraph.snapshot().ports.find(p=>p.id==='roof-port');assert.equal(port.live,true);assert.equal(w.trial.scene.index.surfaces.get(port.parent).queryOnly,undefined);assert.deepEqual(w.trial.scene.index.surfaces.get(port.parent).sourceCell,[3,0,0]);
    w.activation.prepare({retireRecords:[port.parent]}).publish();assert.equal(w.trial.supportGraph.snapshot().ports.find(p=>p.id==='roof-port').parent,null);evidence.push({wideColdBecameNative:port.parent,fixedRetirementLostPort:true,logicalCells:f.logicalCells});
  }finally{r?.dispose();birth?.dispose();w?.dispose();c.dispose();}
});
test('diagnostic compiler ceiling rejects before another native invocation',()=>{const before=sceneCompileDiagnostics().calls;limitDiagnosticSceneCompiles(before);try{assert.throws(()=>compileScene({version:1,surfaces:[]}),/compiler ceiling/);assert.equal(sceneCompileDiagnostics().calls,before);}finally{limitDiagnosticSceneCompiles(Number.MAX_SAFE_INTEGER);}});
