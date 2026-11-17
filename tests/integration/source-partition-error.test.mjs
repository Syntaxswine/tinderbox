import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMapSources} from '../../src/content/map-source-data.js';
import {createMapSourceGeometry} from '../../src/content/map-source-geometry.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url)));
const model=decodeMapSources(read('assets/runtime/map-sources/new-york/index.json'),read('assets/runtime/map-sources/new-york/library.json'));
const ids=['east','west'].map(side=>'new-york::carrier/ny-well-guard-'+side+'/top');
const data={version:1,runtimeAdapterVersion:1,prefabId:'numeric-partition-control',implicitGround:false,sourceBounds:model.index.sourceBounds,gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],surfaces:[],openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'new-york'}],doors:[]}};

test('the two real well-guard tops retain canonical stock and report their bounded native epsilon partition deltas',()=>{
  const sources=createMapSourceGeometry(model),trial=createTrial(data),records=ids.map(id=>model.carrierById.get(id)),ledger=createSourceCarrierLedger(records);
  try{
    const plan=trial.prepareSources({surfaces:ids.flatMap(id=>sources.sourcesForCarrier(id).surfaces)}),stock=ledger.prepareActivations(plan.quantities,{nativeBirthQuantity:plan.quantity});
    for(const r of plan.quantities){assert.equal(r.sourceQuantity,.408333);assert.ok(Math.abs(r.nativeQuantity-.4083343109294491)<1e-13);assert.equal(r.partitionError.epsilon,1e-7);assert.ok(r.nativeQuantity-r.sourceQuantity>1e-6);assert.ok(r.nativeQuantity-r.sourceQuantity<r.partitionError.positive);}
    assert.equal(trial.scene.cells.size,0);plan.commit();stock.commit();const measured=ledger.metrics(trial.metrics().fuel);
    assert.equal(measured.staticInitial,.816666);assert.equal(measured.activeInitial,.816666);assert.equal(measured.coldReserve,0);assert.equal(measured.world.added,0);
    assert.ok(Math.abs(measured.nativePartitionError.signedDelta-2*.0000013109294491053802)<1e-13);assert.equal(measured.world.error,-measured.nativeClippingDelta);
  }finally{ledger.dispose();trial.dispose();sources.dispose();}
});

test('an over-bound mismatch or wrong assigned source stock is rejected independently of distant reserves, before physical commit',()=>{
  const source=createMapSourceGeometry(model),trial=createTrial(data);try{
    const plan=trial.prepareSources({surfaces:source.sourcesForCarrier(ids[0]).surfaces}),row=plan.quantities[0],before=trial.snapshot();
    for(const far of [[],[{id:'distant-inactive',fuelClass:'frame',fuelAmount:1e12}]]){
      const ledger=createSourceCarrierLedger([model.carrierById.get(ids[0]),...far]);try{
        const stock=ledger.snapshot();assert.throws(()=>ledger.prepareActivations([{...row,nativeQuantity:row.sourceQuantity+row.partitionError.positive*2}]),/canonical stock/);assert.deepEqual(ledger.snapshot(),stock);
        assert.throws(()=>ledger.prepareActivations([{...row,sourceQuantity:row.sourceQuantity+.001}]),/Assigned native input/);assert.deepEqual(ledger.snapshot(),stock);
        assert.throws(()=>ledger.prepareActivations([{...row,partitionError:{...row.partitionError,epsilon:1e-6}}]),/Invalid local/);assert.deepEqual(ledger.snapshot(),stock);
      }finally{ledger.dispose();}
    }assert.deepEqual(trial.snapshot(),before);
  }finally{trial.dispose();source.dispose();}
});
