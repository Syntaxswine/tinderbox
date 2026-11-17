import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createBoundaryIndex,bounds} from '../../workbenches/furnished-house/geometry.js';
import {supportSurfacesTouch} from '../../workbenches/furnished-house/support.js';
import {createSourceQueryRegistry} from '../../src/runtime/source-query-registry.js';
import {boxTriangles} from '../../src/runtime/native-query-registry.js';
import {createSourceCarrierLedger} from '../../src/simulation/source-carriers.js';
import {createSourceActivation} from '../../src/simulation/source-activation.js';
import {createSourceSupportGraph} from '../../src/simulation/source-support.js';

const referenceCommit='cd443ccdd9cbbb38cf4c338ef697d902739726d6';
const referenceText=execFileSync('git',['show',referenceCommit+':src/simulation/source-support.js'],{encoding:'utf8',windowsHide:true}).replace(/\r\n/g,'\n');
const referencePin=JSON.parse(fs.readFileSync(new URL('../../docs/engineering/shared-maps/cpu-stall-v1/runtime-source-declaration.json',import.meta.url))).addedFiles.find(r=>r.path==='src/simulation/source-support.js').lfSha256;
assert.equal(createHash('sha256').update(referenceText).digest('hex'),referencePin,'Preserve the exact accepted graph reference');
const referenceModule=referenceText.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_,quote,relative)=>'from '+JSON.stringify(new URL(relative,new URL('../../src/simulation/source-support.js',import.meta.url)).href));
const referenceFactory=(await import('data:text/javascript;base64,'+Buffer.from(referenceModule).toString('base64'))).createSourceSupportGraph;

function fixture(factory=createSourceSupportGraph,{door=false}={}){
  const box=(min,max)=>({min,max}),floor=box([0,0,0],[4,.12,1]),left=box([.1,1.12,.1],[.3,1.32,.3]),right=box([3.6,1.12,.1],[3.8,1.32,.3]);
  const carriers=[{id:'f::floor',fuelClass:'frame',fuelAmount:4,bounds:floor,anchors:[{kind:'native-ground-contact',elevation:0}],supports:[],supportEvidence:[],attachments:[],adjacency:[],parts:[0]},...[['left',left],['right',right]].map(([name,bounds],i)=>({id:'f::'+name,fuelClass:null,fuelAmount:0,bounds,anchors:[],supports:['f::floor'],supportEvidence:[],attachments:[{parent:'f::floor',kind:'fixed-assembly-mount',childRegion:{bounds},parentRegion:{bounds:box([bounds.min[0],.119,bounds.min[2]],[bounds.max[0],.121,bounds.max[2]])}}],adjacency:[],parts:[i+1]}))];
  const parts=carriers.map(c=>({id:c.id+'/part',carrierId:c.id,bounds:c.bounds,physical:true,material:c.fuelClass?'timber':'metal'})),model={carriers,parts,carrierById:new Map(carriers.map(c=>[c.id,c]))};
  const navigation={version:1,placeId:'f',surfaces:[{id:'terrain',terrain:true,height:0,polygons:[[[-1,-1],[5,-1],[5,2],[-1,2]]],holes:[]}],ceilings:[],blockers:[],portals:[],collisionShapes:{}};
  const querySource=createSourceQueryRegistry({navigation,parts,shapeForPart:id=>({triangles:boxTriangles(parts.find(p=>p.id===id).bounds),closed:true})}),ledger=createSourceCarrierLedger(carriers);
  const data={version:1,runtimeAdapterVersion:1,prefabId:'support-fixture',sourceBounds:box([-1,0,-1],[5,4,2]),implicitGround:false,gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],surfaces:[],openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'f'}],doors:[]}};
  const trial=createTrial(data,{executionCache:true,querySource,supportGraphFactory:scene=>factory({scene,model,querySource})});
  const sources={order:id=>carriers.findIndex(c=>c.id===id),near:()=>[],sourcesForCarrier(id){const c=model.carrierById.get(id),p=parts[c.parts[0]],b=c.bounds;
    if(c.fuelClass)return {surfaces:[{id:id+'/top',sourceCarrierId:id,sourceMeshBindings:[p.id],kind:'floor',normal:[0,1,0],thickness:.12,material:'timber',fuelClass:'frame',fuelAmount:4,triangles:[[[0,.12,0],[4,.12,1],[4,.12,0]],[[0,.12,0],[0,.12,1],[4,.12,1]]]}]};
    if(door&&id==='f::right')return {surfaces:[{id:id+'/leaf',sourceCarrierId:id,sourceMeshBindings:[p.id],kind:'wall',normal:[0,0,1],thickness:.12,material:'metal',fuelAmount:0,nativeInertBody:true,supports:true,triangles:[[[3.6,1.12,.2],[3.8,1.12,.2],[3.8,1.32,.2]],[[3.6,1.12,.2],[3.8,1.32,.2],[3.6,1.32,.2]]]}],openings:[{id:'right-opening',surfaceId:id+'/leaf',kind:'door',pivot:[3.6,1.12,.2],maxOpenAngle:Math.PI/2}]};
    return {surfaces:boxTriangles(b).map((t,i)=>({id:id+'/face/'+i,sourceCarrierId:id,sourceMeshBindings:[p.id],kind:'wall',material:'metal',fuelAmount:0,nativeInertBody:true,supports:true,supportFromMesh:true,triangles:[t],solidTriangles:[t],closedShape:false}))};
  }};
  const activation=createSourceActivation({trial,querySource,ledger,sources});return {trial,activation,ledger,querySource,dispose(){activation.dispose();trial.dispose();querySource.dispose();ledger.dispose();}};
}

test('a declared local mount loses only its damaged parent patch, including a still-cold child, and inert material lands without fuel',()=>{
  const f=fixture();try{
    f.activation.ensure(['f::floor','f::right']);f.trial.step();assert.equal(f.trial.supportGraph.diagnostics().unresolvedInitial,0);
    assert.equal(f.trial.snapshot().falls.length,0);assert.equal(f.ledger.metrics().activeCarriers,2);
    for(const b of f.trial.boundariesForSource('f::floor/top'))if(b.bounds.max[0]<.50001&&b.bounds.max[2]<.50001)f.trial.scene.index.change(b.id,{intact:false});
    assert.deepEqual(f.trial.supportGraph.pendingSources(),['f::left']);f.activation.beforeStep();assert.equal(f.ledger.metrics().activeCarriers,3);f.trial.step();
    assert.ok(f.trial.snapshot().falls.length);assert.ok(f.trial.boundariesForSource('f::right/face/0').every(b=>b.intact));
    for(let i=0;i<35;i++){f.activation.beforeStep();f.trial.step();}
    const s=f.trial.snapshot(),debris=s.rubble.filter(r=>r.inert);assert.ok(debris.length);assert.ok(debris.every(r=>r.kind==='metal'&&r.fuelIds.length===0));assert.equal(s.falls.length,0);
    const body=f.trial.scene.index.surfaces.get(debris[0].bodyBoundaryId);assert.equal(body.intact,true);assert.equal(body.transmission,0);assert.ok(body.bounds.max[1]<.3);
    assert.ok(f.trial.scene.index.trace([0,.1,.2],[.5,.1,.2]).hits.some(h=>h.surface.id===body.id),'Landed metal retains its real opaque geometry');
    assert.equal(f.trial.scene.fuels.size,[...f.trial.scene.fuels.values()].filter(f=>f.sourceSurfaceId==='f::floor/top').length);assert.ok(Math.abs(f.ledger.metrics(s.metrics.fuel).world.added)<1e-7);
    assert.equal(f.activation.ensure(['f::left']),false);assert.ok(f.querySource.isClaimedPart('f::left/part'));
  }finally{f.dispose();}
});

const graphRows=g=>[...g.links].sort(([a],[b])=>a.localeCompare(b)).map(([id,set])=>[id,[...set].sort()]);
function paired(options){return [fixture(referenceFactory,options),fixture(createSourceSupportGraph,options)];}
function equivalent(pair){
  const [reference,candidate]=pair;
  assert.deepEqual(candidate.trial.snapshot(),reference.trial.snapshot(),'Full physical/damage/fuel/heat state agrees with cd443');
  assert.deepEqual(graphRows(candidate.trial.supportGraph),graphRows(reference.trial.supportGraph),'Full directed support graph agrees');
  assert.deepEqual(candidate.ledger.metrics(candidate.trial.metrics().fuel),reference.ledger.metrics(reference.trial.metrics().fuel));
  const {topologyCache,...diagnostics}=candidate.trial.supportGraph.diagnostics();assert.deepEqual(diagnostics,reference.trial.supportGraph.diagnostics());
  assert.ok(topologyCache.entries<=topologyCache.entryLimit);assert.equal(topologyCache.variantsPerCalculation,1);assert.equal(topologyCache.retainedColdMeshes,0);
}

test('all four cold/active endpoint combinations preserve the exact accepted graph and native stock',()=>{
  for(const ids of [[],['f::floor'],['f::right'],['f::floor','f::right']]){const pair=paired();try{for(const f of pair){f.activation.ensure(ids);f.trial.step();}equivalent(pair);}finally{for(const f of pair)f.dispose();}}
});

test('later activation reuses unchanged contact blocks while rebinding either cold endpoint exactly',()=>{
  for(const order of [['f::floor','f::right','f::left'],['f::right','f::floor','f::left']]){const pair=paired();try{
    for(const id of order){for(const f of pair){f.activation.ensure([id]);f.trial.step();}equivalent(pair);}
    assert.ok(pair[1].trial.supportGraph.diagnostics().topologyCache.hits>0);
  }finally{for(const f of pair)f.dispose();}}
});

test('real door poses invalidate local calculations, retain the original rebuild schedule and keep one variant',()=>{
  const pair=paired({door:true});try{
    for(const f of pair){f.activation.ensure(['f::floor','f::right']);f.trial.step();}equivalent(pair);
    const initial=pair[1].trial.supportGraph.diagnostics().topologyCache;
    for(const f of pair){f.trial.command({type:'opening',id:'right-opening',open:true});f.trial.step();}
    equivalent(pair);assert.ok(pair[1].trial.supportGraph.diagnostics().topologyCache.invalidations>initial.invalidations);
    for(const f of pair){f.activation.ensure(['f::left']);f.trial.step();}equivalent(pair);
    for(let i=0;i<8;i++){
      for(const f of pair){f.trial.command({type:'opening',id:'right-opening',open:i%2===1});f.trial.step();f.trial.supportGraph.sourcesAdded({boundaries:[]});f.trial.supportGraph.pendingSources();}
      equivalent(pair);
    }
    assert.ok(pair[1].trial.supportGraph.diagnostics().topologyCache.entries<=initial.entryLimit);
  }finally{for(const f of pair)f.dispose();}
});

test('retired original parent patches never remap to a surviving remote patch during later activation',()=>{
  const pair=paired();try{
    for(const f of pair){f.activation.ensure(['f::floor','f::right']);f.trial.step();for(const b of f.trial.boundariesForSource('f::floor/top'))if(b.bounds.max[0]<.50001&&b.bounds.max[2]<.50001)f.trial.scene.index.change(b.id,{intact:false});}
    assert.deepEqual(pair[1].trial.supportGraph.pendingSources(),['f::left']);
    for(const f of pair){f.activation.beforeStep();f.trial.step();}equivalent(pair);
    for(let i=0;i<35;i++)for(const f of pair){f.activation.beforeStep();f.trial.step();}
    equivalent(pair);assert.ok(pair[1].trial.snapshot().rubble.some(r=>r.inert));
    assert.ok(pair[1].trial.boundariesForSource('f::right/face/0').every(b=>b.intact));
  }finally{for(const f of pair)f.dispose();}
});

function facetGraph(factory,records,contacts){
  const carriers=records.map((r,i)=>({id:r.sourceCarrierId,parts:[],anchors:i?[]:[{elevation:0}],supports:[],supportEvidence:[],attachments:[],bounds:r.bounds})),model={carriers,carrierById:new Map(carriers.map(c=>[c.id,c])),parts:[],index:{contacts}};
  const index=createBoundaryIndex(structuredClone(records));return {index,graph:factory({scene:{index},model,querySource:{shape(){throw Error('Active facet control must not expand cold shapes');}}})};
}
test('ordered asymmetric open-facet contacts retain the original actual predicate arguments',()=>{
  const a={id:'a',sourceCarrierId:'f::a',kind:'attachment',normal:[0,0,1],thickness:0,triangles:[[[-2,-2,0],[2,-2,0],[0,2,0]]]},b={id:'b',sourceCarrierId:'f::b',kind:'attachment',normal:[1,0,0],thickness:0,triangles:[[[0,-.5,-1],[0,-.5,1],[0,.5,1]]]};
  for(const r of [a,b]){r.bounds=bounds(r.triangles.flat());r.solidTriangles=r.triangles;}
  assert.equal(supportSurfacesTouch(a,b),false);assert.equal(supportSurfacesTouch(b,a),true);
  const reference=facetGraph(referenceFactory,[a,b],[[0,1],[1,0]]),candidate=facetGraph(createSourceSupportGraph,[a,b],[[0,1],[1,0]]);
  try{assert.deepEqual(graphRows(candidate.graph),graphRows(reference.graph));assert.ok(candidate.graph.links.get('a').has('b'));candidate.graph.sourcesAdded({boundaries:[]});candidate.graph.pendingSources();assert.deepEqual(graphRows(candidate.graph),graphRows(reference.graph));}finally{candidate.graph.dispose();}
});

test('kind, thickness, normal and exact geometry changes cannot reuse an old prism contact',()=>{
  const a={id:'a',sourceCarrierId:'f::a',kind:'wall',normal:[0,1,0],thickness:.2,bounds:{min:[0,-.1,0],max:[1,.1,1]},triangles:[[[0,0,0],[0,0,1],[1,0,0]]]},b={id:'b',sourceCarrierId:'f::b',kind:'attachment',normal:[0,1,0],thickness:0,bounds:{min:[.2,.05,.2],max:[.3,.05,.3]},triangles:[[[.2,.05,.2],[.3,.05,.2],[.2,.05,.3]]]};
  const reference=facetGraph(referenceFactory,[a,b],[[0,1]]),candidate=facetGraph(createSourceSupportGraph,[a,b],[[0,1]]);
  try{
    assert.ok(candidate.graph.links.get('a').has('b'));
    for(const [patch,connected]of [[{kind:'floor'},false],[{kind:'wall',thickness:.02},false],[{thickness:.2},true],[{kind:'floor',normal:[0,-1,0]},true],[{kind:'attachment'},false]]){
      for(const f of [reference,candidate]){f.index.change('a',patch);f.graph.sourcesAdded({boundaries:[]});f.graph.pendingSources();}
      assert.deepEqual(graphRows(candidate.graph),graphRows(reference.graph));assert.equal(candidate.graph.links.get('a').has('b'),connected);
    }
    for(const f of [reference,candidate]){f.index.change('a',{kind:'wall',normal:[0,1,0],thickness:.2,triangles:[[[4,0,0],[4,0,1],[5,0,0]]],bounds:{min:[4,-.1,0],max:[5,.1,1]}});f.graph.sourcesAdded({boundaries:[]});f.graph.pendingSources();}
    assert.deepEqual(graphRows(candidate.graph),graphRows(reference.graph));assert.equal(candidate.graph.links.get('a').has('b'),false);
  }finally{candidate.graph.dispose();}
});

test('disposal releases cached edge blocks and a fresh source owner starts from the frozen cold graph',()=>{
  const f=fixture();f.activation.ensure(['f::floor','f::right']);f.trial.step();const graph=f.trial.supportGraph;assert.ok(graph.diagnostics().topologyCache.entries>0);const id=[...graph.nodes.keys()][0];
  f.dispose();f.trial.scene.index.change(id,{intact:false});const cache=graph.diagnostics().topologyCache;
  assert.equal(cache.entries,0);assert.equal(cache.directedEdges,0);assert.equal(cache.watchedBoundaries,0);assert.equal(cache.disposed,true);assert.equal(cache.retainedColdMeshes,0);
  assert.throws(()=>graph.sourcesAdded({boundaries:[]}),/disposed/);
  const pair=paired();try{equivalent(pair);}finally{for(const item of pair)item.dispose();}
});

test('boundary unsubscribe preserves duplicate ownership, legacy consumers and idempotent cleanup',()=>{
  const index=createBoundaryIndex([{id:'a',triangles:[[[0,0,0],[0,0,1],[1,0,0]]]}]);let ownedCalls=0,legacyCalls=0;
  const callback=()=>ownedCalls++,first=index.watch(['a','a'],callback),second=index.watch(['a'],callback);
  index.watch(['a'],()=>legacyCalls++);index.change('a',{intact:true});assert.equal(ownedCalls,1);assert.equal(legacyCalls,1);
  first();first();index.change('a',{intact:true});assert.equal(ownedCalls,2);assert.equal(legacyCalls,2);
  second();second();index.change('a',{intact:true});assert.equal(ownedCalls,2);assert.equal(legacyCalls,3);
});

test('graph disposal actually removes its index callbacks while another subscriber still receives changes',()=>{
  const records=[{id:'a',sourceCarrierId:'f::a',kind:'wall',normal:[0,1,0],thickness:.2,bounds:{min:[0,-.1,0],max:[1,.1,1]},triangles:[[[0,0,0],[0,0,1],[1,0,0]]]}];
  const index=createBoundaryIndex(records),nativeWatch=index.watch;let ownNotifications=0,registered=0,released=0,otherNotifications=0;
  index.watch=(ids,callback)=>{registered++;const unsubscribe=nativeWatch(ids,()=>{ownNotifications++;callback();});return ()=>{released++;unsubscribe();};};
  const c={id:'f::a',parts:[],bounds:records[0].bounds,anchors:[{elevation:0}],supports:[],supportEvidence:[],attachments:[]},model={carriers:[c],carrierById:new Map([[c.id,c]]),parts:[]};
  const graph=createSourceSupportGraph({scene:{index},model,querySource:{}});nativeWatch(['a'],()=>otherNotifications++);
  index.change('a',{thickness:.1});assert.equal(ownNotifications,1);assert.equal(otherNotifications,1);
  graph.dispose();graph.dispose();assert.equal(released,registered);assert.equal(released,1);
  index.change('a',{thickness:.2});assert.equal(ownNotifications,1,'The removed graph callback is not delivered, even before its closed guard');assert.equal(otherNotifications,2);
  assert.equal(graph.diagnostics().topologyCache.watchedBoundaries,0);
});
