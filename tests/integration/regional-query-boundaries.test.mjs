import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegionalQueryKernel as create} from '../../src/runtime/regional-effective-query.js';
import {createBoundaryIndex,bounds,EPS} from '../../workbenches/furnished-house/geometry.js';
import {sweptCylinderClear as ordinarySweep} from '../../src/runtime/collision.js';
import {boxFixture,boxTriangles,planeFixture,activate,hitValues} from '../fixtures/regional-query-data.mjs';
function unit(){const input=boxFixture(1),ts=boxTriangles([0,0,0],[1,1,1]),s=input.sources[0];input.nativeInventory=[];s.surfaceTriangles=ts;s.solidTriangles=ts;s.rayRecord.triangles=ts;s.rayRecord.bounds=bounds(ts.flat());return input;}
const record=(input,id,surface,solid,closed=true)=>({...input.sources[0].rayRecord,id,sourceSurfaceId:id,kind:'floor',triangles:surface,solidTriangles:solid,closedShape:closed,bounds:bounds([...surface.flat(),...solid.flat()])});

test('ordinary ray channel chooses solid underside for cold and native slabs, retaining separate face channels',()=>{
  for(const native of [false,true]){const input=boxFixture(1),ts=boxTriangles([.2,.2,.2],[.8,.8,.8]),top=ts.filter(t=>t.every(p=>p[1]===.8)),r=record(input,native?'native-slab':'cold-slab',top,ts);input.nativeInventory=[];if(native)input.nativeInventory=[{cell:[0,0,0],record:r}];else{input.sources[0].surfaceTriangles=top;input.sources[0].solidTriangles=ts;input.sources[0].rayRecord=r;}
    const k=create(input);try{if(native)activate(k,input);const a=[.5,-1,.5],b=[.5,.5,.5],ordinary=createBoundaryIndex([r]);assert.deepEqual(hitValues(k.segment(k.view(),a,b)),hitValues(ordinary.crossings(a,b)));assert.equal(k.trace(k.view(),a,b).transmission,.02);assert.equal(k.trace(k.view(),a,b).transmission,ordinary.trace(a,b).transmission);assert.equal(k.segment(k.view(),a,b)[0].provenance.channel,'solid');assert.ok(k.faces(k.view(),{channel:'surface'}).every(p=>p.polygon.every(v=>v[1]===.8)));assert.ok(k.faces(k.view(),{channel:'solid'}).some(p=>p.polygon.every(v=>v[1]===.2)));}finally{k.dispose();}
  }
});

test('cold and native closed interiors retain inside and near-outside original body tolerance',()=>{
  for(const native of [false,true])for(const [low,high,expected]of [[1-EPS/2,1-EPS/4,false],[1.0000003,1.0000007,false],[1.0000011,1.0000012,true]]){
    const input=unit(),ts=input.sources[0].solidTriangles,r=record(input,'native-unit',ts,ts);if(native)input.nativeInventory=[{cell:[0,0,0],record:r}];const k=create(input),p={x:.5,y:.5};try{if(native)activate(k,input);assert.equal(ordinarySweep(p,p,.1,low,high,{triangles:ts,closed:true}),expected);assert.equal(k.sweptCylinderClear(k.view(),p,p,.1,low,high),expected);}finally{k.dispose();}
  }
});

test('body-tolerance probes remain domain scoped after mixed activation and retirement',()=>{
  const input=unit(),original=boxTriangles([0,0,0],[2,2,2]),ts=boxTriangles([1,1,1],[2,2,2]),s=input.sources[0];s.surfaceTriangles=original;s.solidTriangles=original;s.rayRecord.triangles=original;s.rayRecord.bounds=bounds(original.flat());input.nativeInventory=[{cell:[1,1,1],record:record(input,'native-corner',ts,ts)}];const k=create(input),p={x:1.5,y:1.5};try{activate(k,input,[[1,1,1]]);for(const [low,high,expected]of [[2-EPS/2,2-EPS/4,false],[2.0000003,2.0000007,false],[2.0000011,2.0000012,true]]){assert.equal(ordinarySweep(p,p,.1,low,high,{triangles:ts,closed:true}),expected);assert.equal(k.sweptCylinderClear(k.view(),p,p,.1,low,high),expected);}const v=k.view();k.prepare({expectedGeneration:v.generation,expectedRevision:v.revision,retireRecords:['native-corner']}).commit();assert.equal(k.sweptCylinderClear(k.view(),p,p,.1,2.0000003,2.0000007),true);assert.equal(k.sweptCylinderClear(k.view(),p,p,.1,2-EPS/2,2-EPS/4),true);}finally{k.dispose();}
});

test('unsupported surface overreach rejects for native ownership and source catalogue without freezing input',()=>{
  const source=planeFixture(),s=source.sources[0];source.nativeInventory=[];s.surfaceTriangles=s.surfaceTriangles.map(t=>t.map(p=>[p[0],1.5,p[2]]));s.rayRecord.triangles=s.surfaceTriangles;s.rayRecord.bounds=bounds([...s.surfaceTriangles.flat(),...s.solidTriangles.flat()]);s.partRef.bounds=s.rayRecord.bounds;assert.throws(()=>create(source),/Source surface.*catalogue halo/);assert.equal(Object.isFrozen(s),false);
  const input=planeFixture(),r=input.nativeInventory[0].record,solid=r.triangles;r.triangles=input.sources[0].surfaceTriangles;r.solidTriangles=solid;r.bounds=bounds([...r.triangles.flat(),...solid.flat()]);input.nativeInventory=[{cell:[0,0,0],record:r}];assert.throws(()=>create(input),/Native surface\/solid.*cell halo/);assert.equal(Object.isFrozen(r),false);
  const unchanged=unit(),over=boxTriangles([.2,-.12,.2],[.8,.8,.8]),top=over.filter(t=>t.every(p=>p[1]===.8));unchanged.nativeInventory=[{cell:[0,0,0],record:record(unchanged,'unsupported-floor',top,over)}];assert.throws(()=>create(unchanged),/cell halo/);
});

test('outer cold and native ray provenance agrees with scoped ownership and retains raw hitCell',()=>{
  for(const native of [false,true]){const input=unit(),ts=input.sources[0].solidTriangles;if(native)input.nativeInventory=[{cell:[0,0,0],record:record(input,'native-unit',ts,ts)}];const k=create(input);try{if(native)activate(k,input);const hit=k.segment(k.view(),[2,.5,.5],[.5,.5,.5])[0];assert.deepEqual(hit.provenance.cell,[0,0,0]);assert.deepEqual(hit.provenance.hitCell,[1,0,0]);assert.equal(hit.provenance.halo,true);assert.equal(hit.provenance.outerHalo,true);const pieces=k.faces(k.view(),{channel:hit.provenance.channel}).filter(p=>p.recordId===hit.surface.id&&p.primitive===hit.provenance.primitive);assert.ok(pieces.length);assert.ok(pieces.every(p=>p.cell.join(',')==='0,0,0'&&p.outerHalo));if(!native)assert.doesNotThrow(()=>k.coverage({partId:'box',cells:[hit.provenance.cell],records:[],complete:true}));}finally{k.dispose();}}
});
