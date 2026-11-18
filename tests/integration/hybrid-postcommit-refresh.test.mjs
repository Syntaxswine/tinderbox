import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {world} from '../fixtures/hybrid-world-data.mjs';
import {sceneCompileDiagnostics} from '../../workbenches/furnished-house/scene.js';
import {trialDiagnostics,limitDiagnosticTrialSteps} from '../../workbenches/furnished-house/simulation.js';

limitDiagnosticTrialSteps(64);
const fixtures=[];
function finish(f){f.dispose();fixtures.push({logicalCells:f.logicalCells,sourceTriangles:f.sourceTriangles,retainedReceipts:f.producer.diagnostics().retainedReceipts,queries:f.queries.metrics()});f.producer.dispose();}
function coherent(f,before){
  const state=f.activation.state();assert.equal(state.revision,before.revision+1);assert.equal(f.queries.isClaimedPart('floor'),true);assert.equal(f.ledger.metrics().coldReserve,1.2);
  const records=[...f.trial.scene.index.surfaces.values()].filter(b=>!b.queryOnly);assert.equal(records.length,2);for(const b of records)assert.equal(f.trial.supportGraph.nodes.get(b.id),b);
  const stock=f.ledger.metrics(f.trial.metrics().fuel);assert.ok(Math.abs(stock.world.error+stock.nativeClippingDelta)<1e-10);return state;
}
after(()=>{
  const trial=trialDiagnostics();console.log('REFRESH_RESOURCES '+JSON.stringify({compiler:sceneCompileDiagnostics(),trial,fixtures,actualNewYorkCalls:0,fullNewYorkDiagnostics:0,rendererCalls:0,builds:0}));
  assert.ok(trial.steps<=64);assert.equal(trial.created,trial.disposed);for(const f of fixtures){assert.ok(f.logicalCells<=64&&f.sourceTriangles<=256);assert.equal(f.retainedReceipts,0);for(const k of ['cachedShapes','cachedTriangles','workingLeases','workingTriangles','workingShapes'])assert.equal(f.queries[k],0);}
});

test('post-commit support-reference fault reports committed state, drains notices and disposes stages first',()=>{
  const order=[],f=world({onActivated(){order.push('activation');coherent(f,before);}}),before=f.activation.state();let physical,registration;
  try{
    const prepare=f.trial.prepareSources,prepareRegistration=f.trial.prepareSourceRegistration;
    f.trial.prepareSources=(...args)=>(physical=prepare(...args));f.trial.prepareSourceRegistration=(...args)=>(registration=prepareRegistration(...args));
    const plan=f.activation.prepare({whole:['floor-owner']}),fault=Error('Injected post-commit support-reference failure');assert.ok(physical.records.length>0);registration.validate();
    // Exact returned path: replace the operation after preparation, rather than
    // replacing a source or passing a forged participant.
    f.trial.replaceSupportReferences=()=>{
      order.push('refresh');coherent(f,before);f.trial.scene.index.assertReadable();
      assert.equal(physical.records.length,0);assert.throws(()=>registration.validate(),/Stale native source registration/);
      assert.throws(()=>f.trial.step(1),/notifications/);throw fault;
    };
    const notify=f.trial.supportGraph.sourcesAdded;f.trial.supportGraph.sourcesAdded=result=>{order.push('support');coherent(f,before);notify(result);};
    f.trial.scene.index.watch([f.queries.queryId('floor')],()=>{order.push('index');coherent(f,before);});
    let failure;assert.throws(()=>plan.publish(),error=>{failure=error;return error instanceof AggregateError&&error.committed===true&&error.errors.length===1&&error.errors[0]===fault;});
    assert.equal(failure.publication,coherent(f,before));assert.deepEqual(order,['refresh','support','activation','index']);assert.equal(f.activation.metrics().pendingStages,0);assert.equal(f.trial.tick,0);
    const added=f.trial.metrics().fuel.added;plan.dispose();assert.throws(()=>plan.publish(),/Stale/);assert.equal(f.trial.metrics().fuel.added,added);assert.equal(physical.records.length,0);
  }finally{finish(f);}
});

test('post-commit support-reference refresh reads the committed world and rebinds actual oil before notices',()=>{
  const order=[],f=world({onActivated(){order.push('activation');coherent(f,before);assert.equal(oil.supportBoundaryId.startsWith('fixture::cold/'),false);}});let before,oil;
  try{
    f.trial.command({type:'deposit',position:[.2,.01,.2],amount:.03});f.trial.step(1);
    oil=[...f.trial.scene.fuels.values()].find(f=>f.id.startsWith('deposit:'));assert.ok(oil);assert.equal(oil.supportBoundaryId,f.queries.queryId('floor'));
    before=f.activation.state();const refresh=f.trial.replaceSupportReferences,plan=f.activation.prepare({whole:['floor-owner']});
    f.trial.replaceSupportReferences=ids=>{
      order.push('refresh');coherent(f,before);f.trial.scene.index.assertReadable();assert.equal(f.queries.metrics().workingLeases,0);
      const rebound=refresh(ids);assert.ok(rebound>0);const actual=f.trial.scene.index.surfaces.get(oil.supportBoundaryId);assert.equal(actual.queryOnly,undefined);assert.equal(actual.nativePartId,'floor');assert.equal(actual.intact,true);return rebound;
    };
    f.trial.scene.index.watch([f.queries.queryId('floor')],()=>{order.push('index');assert.equal(oil.supportBoundaryId.startsWith('fixture::cold/'),false);});
    assert.equal(plan.publish(),coherent(f,before));assert.deepEqual(order,['refresh','activation','index']);assert.equal(f.trial.tick,1);assert.equal(f.activation.metrics().pendingStages,0);
  }finally{finish(f);}
});
