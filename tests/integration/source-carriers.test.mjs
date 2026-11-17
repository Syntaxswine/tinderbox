import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
test('canonical static stock transfers once from cold reserve and visual reload cannot mint fuel',()=>{
  const ledger=createSourceCarrierLedger([{id:'wall',fuelClass:'clapboard',fuelAmount:2,finish:{fuelClass:'lacquer',amount:.1}},{id:'floor',fuelClass:'frame',fuelAmount:3},{id:'glass',fuelClass:null,fuelAmount:0}]);let births=0;
  assert.equal(ledger.metrics().coldReserve,5.1);ledger.activate('wall',()=>births++,{initialInTrial:true});
  assert.equal(ledger.activate('wall',()=>births++),false);assert.equal(births,1);
  const native={initial:2.1,added:0,remaining:1.1,airborne:0,burned:1,escaped:0},before=ledger.metrics(native);assert.equal(before.coldReserve,3);assert.ok(Math.abs(before.world.error)<1e-7);
  ledger.activate('floor',()=>{native.added+=3;native.remaining+=3;});assert.equal(ledger.metrics(native).world.added,0,'Activation is not a world fuel birth');
  assert.equal(ledger.activate('floor',()=>{native.added+=3;native.remaining+=3;}),false);assert.ok(Math.abs(ledger.metrics(native).world.error)<1e-7);
  native.added+=.25;native.remaining+=.25;assert.equal(ledger.metrics(native).world.added,.25,'Poured/spilled oil remains a real finite birth');ledger.dispose();
});
test('unrelated reserved carriers do not alter active native fuel and failed activation keeps ownership cold',()=>{
  const ledger=createSourceCarrierLedger([{id:'near',fuelAmount:1,fuelClass:'frame'},{id:'far',fuelAmount:100,fuelClass:'roof'}]);
  assert.throws(()=>ledger.activate('near',()=>{throw Error('Geometry not ready');}),/not ready/);assert.equal(ledger.metrics().activeCarriers,0);
  ledger.activate('near',null,{initialInTrial:true});const m=ledger.metrics({initial:1,added:0,remaining:.75,airborne:.1,burned:.15,escaped:0});assert.equal(m.coldReserve,100);assert.equal(m.activeInitial,1);assert.ok(Math.abs(m.world.error)<1e-7);ledger.dispose();
});

test('a distant reserve cannot hide an invalid local fuel transfer',()=>{
  for(const far of [0,1000000]){
    const ledger=createSourceCarrierLedger([{id:'near',fuelAmount:1,fuelClass:'frame'},{id:'far',fuelAmount:far,fuelClass:'roof'}]);
    try{ledger.activate('near',null,{initialInTrial:true});assert.throws(()=>ledger.metrics({initial:1.001,added:0,remaining:1.001}),/canonical transfer/);}finally{ledger.dispose();}
  }
});
