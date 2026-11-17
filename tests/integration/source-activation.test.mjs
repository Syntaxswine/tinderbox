import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceQueryRegistry} from '../../src/runtime/source-query-registry.js';
import {boxTriangles} from '../../src/runtime/native-query-registry.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import {createSourceActivation} from '../../src/simulation/source-activation.js';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';

const nav={version:1,placeId:'fixture',width:112,height:78,spawn:{x:2,y:2,elevation:0},surfaces:[{id:'grounds',terrain:true,height:0,polygons:[[[0,0],[100,0],[100,12],[0,12]]],holes:[]}],ceilings:[],blockers:[],portals:[],collisionShapes:{}};
function source(id,x,y=2.12,fuelAmount=1){return {id,partId:id+'/part',x,y,fuelAmount,material:'timber',fuelClass:'frame',bounds:{min:[x,y-.12,0],max:[x+1,y,1]}};}
function fixture(records,{installedAmount}={}){
  const parts=records.map(r=>({id:r.partId,carrierId:r.id,bounds:r.bounds,material:r.material}));
  const queries=createSourceQueryRegistry({navigation:nav,parts,shapeForPart:id=>({triangles:boxTriangles(parts.find(p=>p.id===id).bounds),closed:true})});
  const data={version:1,runtimeAdapterVersion:1,prefabId:'activation-control',implicitGround:false,sourceBounds:{min:[0,0,0],max:[100,5,12]},gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],groundY:0,levels:[],surfaces:[],openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'fixture'}],doors:[]}};
  const trial=createTrial(data,{executionCache:true,querySource:queries}),ledger=createSourceCarrierLedger(records);
  const sources={order:id=>records.findIndex(r=>r.id===id),near(point,radius){return records.filter(r=>Math.hypot(...point.map((n,i)=>Math.max(r.bounds.min[i]-n,n-r.bounds.max[i],0)))<=radius).map(r=>r.id);},sourcesForCarrier(id){const r=records.find(r=>r.id===id),x=r.x,y=r.y;return {surfaces:[{id:id+'/floor',sourceCarrierId:id,sourceMeshBindings:[r.partId],instanceId:'fixture',kind:'floor',normal:[0,1,0],thickness:.12,material:r.material,fuelClass:r.fuelClass,fuelAmount:installedAmount??r.fuelAmount,triangles:[[[x,y,0],[x+1,y,1],[x+1,y,0]],[[x,y,0],[x,y,1],[x+1,y,1]]]}],openings:[]};}};
  const activation=createSourceActivation({trial,querySource:queries,ledger,sources});return {trial,queries,ledger,activation,dispose(){activation.dispose();trial.dispose();queries.dispose();ledger.dispose();}};
}

test('atomic floor activation rebinds existing oil support and cannot resurrect a retired patch on reload',()=>{
  const r=source('fixture::upper',2),f=fixture([r]);try{
    assert.equal(f.trial.scene.cells.size,0);assert.equal(f.trial.scene.fuels.size,0);
    f.trial.command({type:'deposit',position:[2.25,2.126,.25],amount:.25});f.trial.step();
    const oil=[...f.trial.scene.fuels.values()].find(f=>f.loose),originalSupport=oil.supportBoundaryId;assert.ok(originalSupport.includes('::cold/'));
    assert.equal(f.activation.ensure([r.id]),true);assert.notEqual(oil.supportBoundaryId,originalSupport);assert.ok(!oil.supportBoundaryId.includes('::cold/'));
    assert.equal(f.queries.isClaimedPart(r.partId),true);assert.equal(f.queries.shape(r.partId).triangles.length,0);assert.equal(f.activation.ensure([r.id]),false);
    const accounting=f.ledger.metrics(f.trial.metrics().fuel);assert.ok(Math.abs(accounting.world.added-.25)<1e-7);assert.equal(accounting.coldReserve,0);
    f.trial.step();assert.equal(oil.falling,false,'Replacing an identical support source must not drop existing oil');
    for(const b of f.trial.boundariesForSource(r.id+'/floor'))if(b.bounds.max[0]<=2.500001)f.trial.scene.index.change(b.id,{intact:false});
    const support=x=>f.trial.scene.index.supportAt(x,.25,2.15,1.9);assert.equal(support(2.25),undefined);assert.ok(support(2.75));
    f.queries.install(f.trial.scene.index);assert.equal(support(2.25),undefined);assert.equal(f.activation.ensure([r.id]),false);f.trial.step();assert.equal(oil.falling,true);
  }finally{f.dispose();}
});

test('a failed canonical transfer leaves the cold source, reserve, cells and clock untouched',()=>{
  const r=source('fixture::invalid',2),f=fixture([r],{installedAmount:2});try{
    const before=f.trial.snapshot(),stock=f.ledger.snapshot();assert.throws(()=>f.activation.ensure([r.id]),/canonical stock/);assert.deepEqual(f.trial.snapshot(),before);assert.deepEqual(f.ledger.snapshot(),stock);assert.equal(f.queries.isClaimedCarrier(r.id),false);assert.equal(f.trial.tick,0);
  }finally{f.dispose();}
});

test('thermal-frontier activation preserves finite clocks and ignores distant unrelated cold stock',()=>{
  const run=far=>{const near=source('fixture::near',2,0,.1),other=source('fixture::receiver',4,0,.1);near.fuelClass=other.fuelClass='oil';const f=fixture([near,other,...far]);try{
    f.activation.ensurePoint([2.25,.015,.25]);f.trial.command({type:'match',position:[2.25,.015,.25]});
    for(let i=0;i<45;i++){f.activation.beforeStep();f.trial.step();}
    const snapshot=f.trial.snapshot();assert.equal(f.trial.tick,45);assert.equal(f.ledger.metrics().activeCarriers,2);assert.ok(Math.abs(f.ledger.metrics(snapshot.metrics.fuel).world.added)<1e-7);
    return {cells:snapshot.cells,fuels:snapshot.fuels,heat:snapshot.metrics.heat};
  }finally{f.dispose();}};
  assert.deepEqual(run([source('fixture::far',80,2.12,100)]),run([]));
});
