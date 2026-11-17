import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {compileScene as currentCompiler} from '../../workbenches/furnished-house/scene.js';
import {sourcePartitionAllowance} from '../../workbenches/furnished-house/partition-error.js';
import {createRegionalSourcePilot as makePilot,createRegionalClaimLedger} from '../../src/simulation/regional-source-pilot.js';
import {plane,fixture,closedFixture,disposeScene,boundaryRecord,fuelRecord,signature} from '../fixtures/regional-source-data.mjs';
const base='1a88cf4748bf62c1456285ff43412c929d311199',git=p=>execFileSync('git',['show',base+':'+p],{encoding:'utf8',windowsHide:true}).replace(/\r\n/g,'\n');
const relocate=(code,p)=>code.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_,q,s)=>'from '+JSON.stringify(new URL(s,new URL('../../'+p,import.meta.url)).href));
const original=async p=>import('data:text/javascript;base64,'+Buffer.from(relocate(git(p),p)).toString('base64'));
const originalCompiler=(await original('workbenches/furnished-house/scene.js')).compileScene,oldAllowance=(await original('workbenches/furnished-house/partition-error.js')).sourcePartitionAllowance;
const counted={original:0,current:0,rejectedBeforeNative:0},allPilots=[];
const oldScene=data=>{counted.original++;return originalCompiler(data);},compileScene=data=>{try{const result=currentCompiler(data);counted.current++;return result;}catch(error){counted.rejectedBeforeNative++;throw error;}};
function createRegionalSourcePilot(input){const p=makePilot(input);allPilots.push(p);return p;}
after(()=>{const regional=allPilots.reduce((n,p)=>n+p.diagnostics().nativeCalls,0);console.log(JSON.stringify({syntheticNativeCompilerCalls:{original:counted.original,current:counted.current,regional,total:counted.original+counted.current+regional},rejectedBeforeNative:counted.rejectedBeforeNative,retainedReceipts:allPilots.reduce((n,p)=>n+p.diagnostics().retainedReceipts,0),worldTrials:0,worldSteps:0}));});

test('default native compiler and strict allowance remain exact against the pinned original',()=>{
  for(const input of [fixture([plane('single',[.1,.2,.1],[.3,.2,.3])]),fixture([plane('border',[1.5,0,0],[2.5,0,1],2,{finish:{fuelClass:'lacquer',amount:.3}})]),closedFixture()]){
    const before=oldScene(input.data),after=compileScene(input.data);
    try{assert.deepEqual(signature(after),signature(before));for(const s of input.data.surfaces)assert.deepEqual(sourcePartitionAllowance(s,{origin:before.origin,pitch:before.pitch}),oldAllowance(s,{origin:before.origin,pitch:before.pitch}));}
    finally{disposeScene(before);disposeScene(after);}
  }
});
test('one-cell IDs survive regional restriction and partial outputs cannot install in a whole world',()=>{
  const input=fixture([plane('single',[.1,.2,.1],[.3,.2,.3])]),pilot=createRegionalSourcePilot(input),ledger=createRegionalClaimLedger(pilot),whole=compileScene(input.data),receipt=pilot.compile(pilot.regions('fixture::owner')[0]);
  try{assert.deepEqual([...receipt.scene.index.surfaces.keys()],['single']);assert.equal(receipt.trace.visitedCells,1);assert.equal(receipt.partialCompilation,true);assert.equal(receipt.scene.partialCompilation,true);assert.throws(()=>whole.prepareSources(receipt),/Partial/);assert.throws(()=>receipt.scene.prepareSources({surfaces:input.data.surfaces}),/Partial/);assert.throws(()=>compileScene(receipt.scene.data),/partial/i);ledger.prepare(receipt).commit();assert.equal(ledger.snapshot().owners[0].state,'full');assert.equal(ledger.snapshot().owners[0].coldReserve,0);}finally{ledger.dispose();pilot.dispose();disposeScene(whole);}
});
test('boundary regions preserve every original geometry/fuel and close canonical stock in either order',()=>{
  const input=fixture([plane('border',[1.5,0,0],[2.5,0,1],2,{finish:{fuelClass:'lacquer',amount:.3}})]),reference=oldScene(input.data),pilot=createRegionalSourcePilot(input),ledger=createRegionalClaimLedger(pilot);
  try{for(const reverse of [false,true]){
    const ids=new Set(),fuels=new Set(),cells=new Set(),regions=pilot.regions('fixture::owner');if(reverse)regions.reverse();
    for(const descriptor of regions){const r=pilot.compile(descriptor);try{for(const [id,b]of r.scene.index.surfaces){assert.deepEqual(boundaryRecord(b),boundaryRecord(reference.index.surfaces.get(id)));assert.ok(!ids.has(id));ids.add(id);}for(const [id,f]of r.scene.fuels){assert.deepEqual(fuelRecord(f),fuelRecord(reference.fuels.get(id)));fuels.add(id);}for(const id of r.scene.cells.keys())cells.add(id);const before=ledger.snapshot();const plan=ledger.prepare(r);assert.deepEqual(ledger.snapshot(),before);plan.commit();}finally{r.dispose();}}
    assert.deepEqual([...ids].sort(),[...reference.index.surfaces.keys()].sort());assert.deepEqual([...fuels].sort(),[...reference.fuels.keys()].sort());assert.deepEqual([...cells].sort(),[...reference.cells.keys()].sort());const q=ledger.snapshot().owners[0];assert.equal(q.quantity,2.3);assert.equal(q.canonicalTransferred,2.3);assert.equal(q.coldReserve,0);assert.ok(Math.abs(q.canonicalRemainder)<=q.provedRemainderBound);assert.ok(Math.abs(q.nativeBorn-reference.initialFuel)<1e-12);ledger.reset();
  }}finally{ledger.dispose();pilot.dispose();disposeScene(reference);}
});
test('two disconnected patches retain separate IDs and empty regions never receive native fuel',()=>{
  const input=fixture([plane('left',[.1,.2,.1],[.3,.2,.3]),plane('right',[6.1,.2,.1],[6.3,.2,.3])]),pilot=createRegionalSourcePilot(input),ledger=createRegionalClaimLedger(pilot);let empty=0;const ids=[];
  try{for(const d of pilot.regions('fixture::owner')){const r=pilot.compile(d);try{if(!r.scene.index.surfaces.size){empty++;assert.equal(r.nativeQuantity,0);assert.equal(r.certificate.canonicalQuantity,0);}ids.push(...r.scene.index.surfaces.keys());ledger.prepare(r).commit();}finally{r.dispose();}}assert.ok(empty>0);assert.deepEqual(ids,['left','right']);assert.equal(ledger.snapshot().owners[0].canonicalTransferred,2);}finally{ledger.dispose();pilot.dispose();}
});
test('a closed interior region visits only its restricted cells and creates no caps or stock',()=>{
  const pilot=createRegionalSourcePilot(closedFixture()),r=pilot.compile(pilot.region('fixture::owner',[4,1,4]));
  try{assert.equal(r.trace.visitedCells,16);assert.equal(r.scene.index.surfaces.size,0);assert.equal(r.scene.fuels.size,0);assert.equal(r.scene.cells.size,0);assert.equal(r.certificate.canonicalQuantity,0);assert.equal(r.scene.sourceDefinitions.get('fixture/cube').closedShape,true);}finally{r.dispose();pilot.dispose();}
});
test('a certifiable discarded sliver exposes its loss without creating or normalizing fuel',()=>{
  const input=fixture([plane('sliver',[1.9999995,0,.1],[2.0000005,0,.10001],1e-6)]),pilot=createRegionalSourcePilot(input),ledger=createRegionalClaimLedger(pilot);
  try{for(const d of pilot.regions('fixture::owner')){const r=pilot.compile(d);try{assert.equal(r.nativeQuantity,0);assert.ok(r.certificate.canonicalQuantity>0);ledger.prepare(r).commit();}finally{r.dispose();}}const q=ledger.snapshot().owners[0];assert.equal(q.state,'full');assert.equal(q.quantity,1e-6);assert.equal(q.nativeBorn,0);assert.equal(q.clippingDelta,-1e-6);assert.equal(q.coldReserve,0);}finally{ledger.dispose();pilot.dispose();}
});
test('overlap, corrupt receipt and stale generation reject before changing staging stock',()=>{
  const input=fixture([plane('border',[1.5,0,0],[2.5,0,1],2)]),pilot=createRegionalSourcePilot(input),ledger=createRegionalClaimLedger(pilot),descriptors=pilot.regions('fixture::owner'),r=pilot.compile(descriptors[0]);
  try{
    assert.throws(()=>pilot.region('fixture::owner',[2,0,0]),/off-grid/);assert.throws(()=>pilot.compile({...descriptors[0],sourceRevision:'b'.repeat(64)}),/stale/);assert.throws(()=>createRegionalClaimLedger(pilot),/already/);
    const cold=ledger.snapshot();assert.throws(()=>ledger.prepare({...r,certificate:{...r.certificate,canonicalQuantity:0}}),/stale/);assert.deepEqual(ledger.snapshot(),cold);assert.ok(Object.isFrozen(r.certificate)&&Object.isFrozen(r.descriptor));
    const plan=ledger.prepare(r),before=ledger.snapshot(),fuel=r.scene.fuels.values().next().value,amount=fuel.amount;fuel.amount+=1;assert.throws(()=>plan.commit(),/quantity/);assert.deepEqual(ledger.snapshot(),before);fuel.amount=amount;
    plan.commit();const committed=ledger.snapshot();assert.throws(()=>ledger.prepare(r),/overlapping/);assert.deepEqual(ledger.snapshot(),committed);
    ledger.reset();assert.equal(ledger.snapshot().owners[0].state,'cold');assert.throws(()=>pilot.compile(descriptors[1]),/stale/);assert.throws(()=>ledger.prepare(r),/stale/);
    const current=pilot.compile(pilot.regions('fixture::owner')[0]);ledger.dispose();const next=createRegionalClaimLedger(pilot);try{assert.throws(()=>next.prepare(current),/stale/);}finally{next.dispose();}
  }finally{ledger.dispose();pilot.dispose();}
});
test('unprovable source measure and incorrect original allocation fail closed before native compilation',()=>{
  assert.throws(()=>createRegionalSourcePilot(fixture([plane('a',[0,0,0],[1,0,1])],{quantity:2})),/allocation/);
  const wrongGrid=fixture([plane('a',[0,0,0],[1,0,1])]);wrongGrid.data.thermalCell=[1,2.12,1];assert.throws(()=>createRegionalSourcePilot(wrongGrid),/native grid/);
  assert.throws(()=>createRegionalSourcePilot({...fixture([plane('a',[0,0,0],[1,0,1])]),sourceRevision:'stale'}),/pinned/);
  assert.throws(()=>createRegionalSourcePilot(fixture([plane('bad-finish',[0,0,0],[1,0,1],2,{finish:{amount:-1}})])),/surface/);
  for(const [surface,reason]of [[plane('tiny',[.1,0,.1],[.1000000001,0,.1000000001]),/denominator/],[plane('degenerate',[.1,0,.1],[.1,0,.1]),/measure/]]){
    const pilot=createRegionalSourcePilot(fixture([surface])),ledger=createRegionalClaimLedger(pilot),before=ledger.snapshot();
    try{assert.throws(()=>pilot.compile(pilot.regions('fixture::owner')[0]),reason);assert.equal(pilot.diagnostics().nativeCalls,0);assert.deepEqual(ledger.snapshot(),before);}finally{ledger.dispose();pilot.dispose();}
  }
});
