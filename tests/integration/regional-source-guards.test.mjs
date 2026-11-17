import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createRegionalSourcePilot,createRegionalClaimLedger,REGIONAL_SOURCE_PILOT_LIMITS} from '../../src/simulation/regional-source-pilot.js';
import {createRegionalCompileDomain} from '../../workbenches/furnished-house/regional-domain.js';
import {DEFAULT_PROFILES} from '../../workbenches/furnished-house/scene.js';
import {fixture,plane,closedFixture} from '../fixtures/regional-source-data.mjs';
const pilots=[];
function pilotFor(input){const pilot=createRegionalSourcePilot(input);pilots.push(pilot);return pilot;}
const tinyClosed=()=>{const input=closedFixture();input.data.surfaces[0].triangles=input.data.surfaces[0].triangles.map(t=>t.map(p=>p.map(v=>.05+v/20)));return input;};
after(()=>console.log(JSON.stringify({guardFixtures:{regionalNativeCalls:pilots.reduce((n,p)=>n+p.diagnostics().nativeCalls,0),retainedReceipts:pilots.reduce((n,p)=>n+p.diagnostics().retainedReceipts,0),actualRoofReruns:0,worldTrials:0,worldSteps:0}})));

test('physical replacements reject at prepare and commit without changing any staging stock',()=>{
  const profileFrozen=Object.isFrozen(DEFAULT_PROFILES.roof);
  const pilot=pilotFor(tinyClosed()),ledger=createRegionalClaimLedger(pilot),r=pilot.compile(pilot.regions('fixture::owner')[0]);
  try{
    assert.equal(Object.isFrozen(DEFAULT_PROFILES.roof),profileFrozen,'Default profile ownership/mutability stays unchanged');
    const b=r.scene.index.surfaces.values().next().value,f=r.scene.fuels.values().next().value,c=r.scene.cells.values().next().value,plan=ledger.prepare(r),cold=ledger.snapshot();
    assert.ok(!Object.isFrozen(b));assert.ok(Object.isFrozen(b.triangles)&&Object.isFrozen(b.triangles[0])&&Object.isFrozen(b.triangles[0][0]));assert.ok(Object.isFrozen(b.solidTriangles)&&Object.isFrozen(b.normal)&&Object.isFrozen(b.bounds.min));
    assert.throws(()=>{b.triangles[0][0][0]+=100;},TypeError);assert.throws(()=>{b.solidTriangles[0][0][1]+=100;},TypeError);
    const cases=[
      [b,'triangles',b.triangles.map(t=>t.map(p=>[p[0]+100,p[1],p[2]]))],
      [b,'solidTriangles',b.solidTriangles.map(t=>t.map(p=>[p[0],p[1]+100,p[2]]))],
      [b,'normal',[1,0,0]],[b,'bounds',{min:[100,100,100],max:[101,101,101]}],[b,'position',[100,100,100]],
      [b,'closedShape',false],[b,'physicalShape','changed-shape'],[b,'id','renamed-boundary'],[b,'sourceCarrierId','other-owner'],[b,'sourceSurfaceId','other-source'],[b,'instanceId','other-instance'],
      [f,'id','renamed-fuel'],[f,'boundaryId','other-boundary'],[f,'sourceSurfaceId','other-source'],[f,'cells',[]],
      [c,'id','other-cell'],[c,'c',[100,100,100]],[c,'position',[100,100,100]],
      [r.scene,'origin',[1,0,0]],[r.scene,'profile',{...r.scene.profile,roof:{seconds:1}}],
      [r.scene,'cells',new Map(r.scene.cells)],[r.scene.index,'surfaces',new Map(r.scene.index.surfaces)]
    ];
    for(const [record,key,changed]of cases){
      const original=record[key];record[key]=changed;
      try{assert.throws(()=>ledger.prepare(r),/physical receipt/,'prepare '+key);assert.throws(()=>plan.commit(),/physical receipt/,'commit '+key);assert.deepEqual(ledger.snapshot(),cold,'unchanged stock after '+key);}
      finally{record[key]=original;}
      plan.validate();
    }
    for(const [table,key,changed]of [[r.scene.index.surfaces,b.id,{...b}],[r.scene.fuels,f.id,{...f}],[r.scene.sourceDefinitions,b.sourceSurfaceId,{...r.scene.sourceDefinitions.get(b.sourceSurfaceId),closedShape:false}]]){
      const original=table.get(key);table.set(key,changed);
      try{assert.throws(()=>ledger.prepare(r),/physical receipt/);assert.throws(()=>plan.commit(),/physical receipt/);assert.deepEqual(ledger.snapshot(),cold);}finally{table.set(key,original);}
    }
    const bin=r.scene.index.bins.values().next().value;bin.delete(b);try{assert.throws(()=>plan.commit(),/physical receipt/);assert.deepEqual(ledger.snapshot(),cold);}finally{bin.add(b);}
    assert.equal(f.amount,r.nativeQuantity);plan.commit();assert.equal(ledger.snapshot().owners[0].state,'full');assert.equal(f.amount,r.nativeQuantity);
  }finally{ledger.dispose();pilot.dispose();}
});

test('disposing a changed public scene clears only its captured owned maps',()=>{
  const pilot=pilotFor(fixture([plane('one',[.1,.2,.1],[.3,.2,.3])])),ledger=createRegionalClaimLedger(pilot),r=pilot.compile(pilot.regions('fixture::owner')[0]),ownedCells=r.scene.cells,foreign=new Map([['preserve',{id:'preserve'}]]);
  try{const plan=ledger.prepare(r),before=ledger.snapshot();r.scene.cells=foreign;assert.throws(()=>ledger.prepare(r),/physical receipt/);assert.throws(()=>plan.commit(),/physical receipt/);assert.deepEqual(ledger.snapshot(),before);r.dispose();assert.equal(ownedCells.size,0);assert.equal(foreign.size,1);assert.equal(pilot.diagnostics().retainedReceipts,0);}finally{ledger.dispose();pilot.dispose();}
});

test('unsafe spans/exclusive ends and catalogues over the static 320 ceiling reject before enumeration',()=>{
  assert.deepEqual(REGIONAL_SOURCE_PILOT_LIMITS,{descriptors:320});
  const unsafe=fixture([plane('unsafe',[1e20,0,0],[1e20,0,0])]);assert.throws(()=>createRegionalSourcePilot(unsafe),/Unsafe native source span/);
  const edge=(Number.MAX_SAFE_INTEGER-2)/2;assert.throws(()=>createRegionalSourcePilot(fixture([plane('edge',[edge,0,0],[edge,0,0])])),/exclusive end/);
  const negative=-Number.MAX_SAFE_INTEGER/2;assert.throws(()=>createRegionalSourcePilot(fixture([plane('negative',[negative,0,0],[negative,0,0])])),/origin/);
  for(const min of [[0,Number.MAX_SAFE_INTEGER,0],[Number.MAX_SAFE_INTEGER-3,0,0]])assert.throws(()=>createRegionalCompileDomain({},min,{}),/exclusive end/);
  for(const [x,z]of [[642,.25],[40,40],[1e12,.25]])assert.throws(()=>createRegionalSourcePilot(fixture([plane('oversized',[0,0,0],[x,0,z])])),/catalogue exceeds 320/);
  const owners=fixture([plane('a',[0,0,0],[322,0,.25]),plane('b',[0,0,0],[322,0,.25])]);owners.data.surfaces.forEach((s,i)=>{s.sourceCarrierId='fixture::'+i;});owners.owners=owners.data.surfaces.map(s=>({id:s.sourceCarrierId,fuelAmount:1}));assert.throws(()=>createRegionalSourcePilot(owners),/catalogue exceeds 320/);
  const atLimit=pilotFor(fixture([plane('limit',[0,0,0],[640,0,.25])])),negativeGrid=pilotFor(fixture([plane('negative-grid',[-2.1,-.2,-2.1],[-1.9,-.2,-1.9])]));
  try{assert.equal(atLimit.regions('fixture::owner').length,320);assert.equal(atLimit.diagnostics().nativeCalls,0);assert.equal(negativeGrid.regions('fixture::owner').length,4);assert.equal(negativeGrid.diagnostics().nativeCalls,0);}finally{atLimit.dispose();negativeGrid.dispose();}
});

test('partial arithmetic overshoot is an explicit bounded parent carry and never changes native fuel',()=>{
  const quantity=1-Number.EPSILON,input=fixture([plane('stock',[.1,.2,.1],[.3,.2,.3],1),plane('zero-extension',[4.1,.2,.1],[4.3,.2,.3],0)],{quantity}),pilot=pilotFor(input),ledger=createRegionalClaimLedger(pilot);let native;
  try{
    const descriptors=pilot.regions('fixture::owner');assert.equal(descriptors.length,3);
    for(const [i,d]of descriptors.entries()){
      const r=pilot.compile(d);try{if(!i){native=r.scene.fuels.values().next().value;assert.equal(native.amount,1);}const before=ledger.snapshot(),plan=ledger.prepare(r);assert.deepEqual(ledger.snapshot(),before);plan.commit();const row=ledger.snapshot().owners[0];assert.equal(row.canonicalMeasured,1);assert.equal(row.canonicalTransferred,quantity);assert.equal(row.parentArithmeticCarry,-Number.EPSILON);assert.ok(Math.abs(row.parentArithmeticCarry)<=row.provedRemainderBound);assert.equal(row.nativeBorn,1);assert.equal(row.coldReserve,0);assert.equal(native.amount,1);assert.equal(row.state,i===2?'full':'partial');assert.equal(row.remainderClosed,i===2);}finally{r.dispose();}
    }
    assert.equal(ledger.snapshot().owners[0].canonicalRemainder,-Number.EPSILON);assert.equal(native.amount,1);
  }finally{ledger.dispose();pilot.dispose();}
});
