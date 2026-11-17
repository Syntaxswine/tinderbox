import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {bounds} from '../../workbenches/furnished-house/geometry.js';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {createSourceSupportGraph} from '../../src/simulation/source-support.js';
import {createPreparedSourceProvider,PREPARED_SUPPORT_ALGORITHM} from '../../src/simulation/prepared-source-support.js';
import {prepareSourceSupportBlocks,sourceBlockDigest} from '../../tools/prepare-source-support.mjs';
import {sourceSupportFixture,sourceSupportWorld,worldFromSourceFixture} from '../fixtures/source-support-world.mjs';

const hash=b=>createHash('sha256').update(typeof b==='string'?b:JSON.stringify(b)).digest('hex');
const original=execFileSync('git',['show','55cd9b597744244fbd0168939b13fbc66662d7b3:src/simulation/source-support.js'],{encoding:'utf8',windowsHide:true}).replace(/\r\n/g,'\n');
assert.equal(hash(original),PREPARED_SUPPORT_ALGORITHM);
const relocated=original.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_,quote,p)=>'from '+JSON.stringify(new URL(p,new URL('../../src/simulation/source-support.js',import.meta.url)).href));
const referenceFactory=(await import('data:text/javascript;base64,'+Buffer.from(relocated).toString('base64'))).createSourceSupportGraph;
const identity=fixture=>({version:1,algorithm:PREPARED_SUPPORT_ALGORITHM,sourceModel:hash({carriers:fixture.model.carriers,parts:fixture.model.parts,library:fixture.model.library}),compiler:hash(fs.readFileSync(new URL('../../workbenches/furnished-house/scene.js',import.meta.url),'utf8').replace(/\r\n/g,'\n')),layout:hash(fixture.data)});
function prepared(request,options){const fixture=sourceSupportFixture(options),sourceIdentity=identity(fixture),result=prepareSourceSupportBlocks({...fixture,identity:sourceIdentity,request});return {...result,sourceIdentity};}
function providerFor(preparation,blocks=preparation.blocks,extra={}){const digests=new Set(preparation.blocks.map(b=>b.digest));return createPreparedSourceProvider({identity:preparation.sourceIdentity,blocks,admit:b=>digests.has(b.digest)&&sourceBlockDigest(b)===b.digest,...extra});}
const rows=g=>[...g.links].map(([id,set])=>[id,[...set]]);
function same(reference,candidate){
  assert.deepEqual(candidate.trial.supportGraph.pendingSources(),reference.trial.supportGraph.pendingSources());
  assert.deepEqual(candidate.trial.supportGraph.unsupported({force:true}).map(b=>b.id),reference.trial.supportGraph.unsupported({force:true}).map(b=>b.id));
  assert.deepEqual(rows(candidate.trial.supportGraph),rows(reference.trial.supportGraph),'Complete directed node/neighbor/emission order');
  assert.deepEqual(candidate.trial.snapshot(),reference.trial.snapshot(),'Complete physical/support/fuel/heat/events/clocks/falls');
  assert.deepEqual(candidate.ledger.metrics(candidate.trial.metrics().fuel),reference.ledger.metrics(reference.trial.metrics().fuel));
  const semantic=g=>{const {topologyCache,...value}=g.diagnostics();return value;};assert.deepEqual(semantic(candidate.trial.supportGraph),semantic(reference.trial.supportGraph));
}
function pair(preparation,provider,options){return [sourceSupportWorld(referenceFactory,options),sourceSupportWorld(args=>createSourceSupportGraph({...args,preparedProvider:provider,sourceIdentity:preparation.sourceIdentity}),options)];}

test('generated native undefined/-0 identity admits and replays an actual continuity block',()=>{
  const preparation=prepared({kind:'continuity',carrier:'f::floor'}),block=preparation.blocks[0],encoded=JSON.stringify(block.identity);
  assert.ok(encoded.includes('"$undefined":true'));assert.ok(encoded.includes('"$number":"-0"'));assert.equal(block.result.type,'undefined');
  const provider=providerFor(preparation,JSON.parse(JSON.stringify(preparation.blocks))),worlds=pair(preparation,provider);
  try{for(const w of worlds){w.activation.ensure(['f::floor']);w.trial.step();}same(...worlds);assert.equal(provider.diagnostics().admitted,1);assert.ok(provider.diagnostics().hits>0);assert.equal(preparation.resources.compiledNativeScenes,1);assert.equal(preparation.resources.trials,0);assert.equal(preparation.resources.worldSteps,0);assert.equal(preparation.resources.localCompilerDisposed,true);}finally{for(const w of worlds)w.dispose();}
  assert.equal(provider.diagnostics().disposed,true);assert.equal(provider.diagnostics().identityValues,0);assert.equal(provider.diagnostics().edges,0);
});

test('declared mount blocks preserve all cold/active states while only fully active state replays',()=>{
  const preparation=prepared({kind:'relation',index:0});assert.equal(preparation.blocks.length,3);assert.equal(preparation.skipped.length,1);
  for(const ids of [[],['f::left'],['f::floor'],['f::left','f::floor']]){
    const provider=providerFor(preparation),worlds=pair(preparation,provider);
    try{for(const w of worlds){w.activation.ensure(ids);w.trial.step();}same(...worlds);assert.equal(provider.diagnostics().hits>0,ids.length===2);}finally{for(const w of worlds)w.dispose();}
  }
});

test('raw custom geometry sentinels cannot masquerade as canonical encoded negative zero',()=>{
  const preparation=prepared({kind:'continuity',carrier:'f::floor'}),provider=providerFor(preparation),worlds=pair(preparation,provider);
  try{
    for(const w of worlds){w.activation.ensure(['f::floor']);const b=[...w.trial.supportGraph.nodes.values()][0];w.trial.scene.index.change(b.id,{position:[{$number:'-0'},b.position[1],b.position[2]]});w.trial.supportGraph.sourcesAdded({boundaries:[]});}
    same(...worlds);assert.equal(provider.diagnostics().hits,0);assert.ok(provider.diagnostics().rejected>0);
  }finally{for(const w of worlds)w.dispose();}
});

test('custom or replaced cold shape resolver never replays a block with unchanged IDs/source strings',()=>{
  const options={contact:true},preparation=prepared({kind:'adjacency',index:0},options),provider=providerFor(preparation),worlds=pair(preparation,provider,options);let reads=0;
  try{
    for(const w of worlds){const originalShape=w.querySource.shape;w.querySource.shape=(id,open)=>{reads++;const value=originalShape(id,open);return {...value,triangles:value.triangles.map(t=>t.map(p=>[p[0]+10,p[1],p[2]]))};};w.activation.ensure(['f::floor']);}
    same(...worlds);assert.ok(reads>0);assert.equal(provider.diagnostics().hits,0);assert.ok(provider.diagnostics().rejected>0);
  }finally{for(const w of worlds)w.dispose();}
});

test('mutated cold backing library falls back without hashing or expanding cold meshes for admission',()=>{
  const options={contact:true},preparation=prepared({kind:'adjacency',index:0},options),provider=providerFor(preparation),worlds=pair(preparation,provider,options);
  try{
    for(const w of worlds){const values=w.model.library.geometries['f::left'].attributes.position.array;for(let i=0;i<values.length;i+=3)values[i]+=10;w.activation.ensure(['f::floor']);}
    same(...worlds);assert.equal(provider.diagnostics().hits,0);assert.ok(provider.diagnostics().rejected>0);
  }finally{for(const w of worlds)w.dispose();}
});

test('missing, corrupt, mistyped and nonmatching blocks fall back atomically before any prepared prefix',()=>{
  const preparation=prepared({kind:'continuity',carrier:'f::floor'});
  const mutations=[blocks=>blocks.length=0,blocks=>blocks[0].edges.push(['f::unknown','f::also-unknown']),blocks=>blocks[0].result={type:'boolean',value:false},blocks=>blocks[0].digest='0'.repeat(64),blocks=>blocks[0].edges.reverse(),blocks=>blocks[0].identity.ownerStates[0].orderedIds.push('unknown')];
  for(const mutate of mutations){const blocks=structuredClone(preparation.blocks);mutate(blocks);const provider=providerFor(preparation,blocks),worlds=pair(preparation,provider);try{for(const w of worlds){w.activation.ensure(['f::floor']);w.trial.step();}same(...worlds);assert.equal(provider.diagnostics().hits,0);}finally{for(const w of worlds)w.dispose();}}
});

test('admitted blocks are immutable private copies rather than mutable caller aliases',()=>{
  const preparation=prepared({kind:'continuity',carrier:'f::floor'}),blocks=structuredClone(preparation.blocks),provider=providerFor(preparation,blocks);blocks[0].edges.length=0;blocks[0].result.type='invalid';
  const worlds=pair(preparation,provider);try{for(const w of worlds){w.activation.ensure(['f::floor']);w.trial.step();}same(...worlds);assert.ok(provider.diagnostics().hits>0);}finally{for(const w of worlds)w.dispose();}
});

test('a local original-parent loss rejects the intact block and never remaps to a surviving remote patch',()=>{
  const preparation=prepared({kind:'relation',index:0}),provider=providerFor(preparation),worlds=pair(preparation,provider);
  try{
    for(const w of worlds){w.activation.ensure(['f::floor','f::left']);w.trial.step();}same(...worlds);assert.ok(provider.diagnostics().hits>0);const rejected=provider.diagnostics().rejected;
    for(const w of worlds){for(const b of w.trial.boundariesForSource('f::floor/top'))if(b.bounds.max[0]<.50001&&b.bounds.max[2]<.50001)w.trial.scene.index.change(b.id,{intact:false});w.trial.supportGraph.sourcesAdded({boundaries:[]});}
    same(...worlds);assert.ok(provider.diagnostics().rejected>rejected);
    for(let i=0;i<35;i++)for(const w of worlds){w.activation.beforeStep();w.trial.step();}same(...worlds);assert.ok(worlds[1].trial.snapshot().rubble.some(r=>r.inert));
  }finally{for(const w of worlds)w.dispose();}
});

test('actual native opening poses reject stale geometry while preserving the original rebuild schedule',()=>{
  const options={door:true},preparation=prepared({kind:'relation',index:1},options),provider=providerFor(preparation),worlds=pair(preparation,provider,options);
  try{
    for(const w of worlds){w.activation.ensure(['f::floor','f::right']);w.trial.step();}same(...worlds);assert.ok(provider.diagnostics().hits>0);const rejected=provider.diagnostics().rejected;
    for(const open of [true,false]){for(const w of worlds){w.trial.command({type:'opening',id:'right-opening',open});w.trial.step();w.trial.supportGraph.sourcesAdded({boundaries:[]});}same(...worlds);}
    assert.ok(provider.diagnostics().rejected>rejected);
  }finally{for(const w of worlds)w.dispose();}
});

test('unknown providers and source revisions stay on the original calculation path',()=>{
  const preparation=prepared({kind:'continuity',carrier:'f::floor'});let foreignCalls=0;
  for(const [provider,sourceIdentity]of [[{read(){foreignCalls++;},dispose(){foreignCalls++;}},preparation.sourceIdentity],[providerFor(preparation),{...preparation.sourceIdentity,layout:'0'.repeat(64)}],[providerFor(preparation),null]]){
    const worlds=[sourceSupportWorld(referenceFactory),sourceSupportWorld(args=>createSourceSupportGraph({...args,preparedProvider:provider,sourceIdentity}))];try{for(const w of worlds){w.activation.ensure(['f::floor']);w.trial.step();}same(...worlds);if(provider.diagnostics)assert.equal(provider.diagnostics().hits,0);}finally{for(const w of worlds)w.dispose();}
  }assert.equal(foreignCalls,0);
});

test('replaced native records reject replay and retain the original authoritative-fragment failure',()=>{
  const preparation=prepared({kind:'continuity',carrier:'f::floor'}),provider=providerFor(preparation),worlds=pair(preparation,provider);
  try{
    for(const w of worlds)w.activation.ensure(['f::floor']);same(...worlds);const hits=provider.diagnostics().hits;
    for(const w of worlds){const [id,b]=w.trial.supportGraph.nodes.entries().next().value;w.trial.scene.index.change(id,{normal:[0,1,0]});w.trial.scene.index.surfaces.set(id,{...b});w.trial.supportGraph.sourcesAdded({boundaries:[]});assert.throws(()=>w.trial.supportGraph.pendingSources(),/authoritative registered/);}
    assert.equal(provider.diagnostics().hits,hits);assert.ok(provider.diagnostics().rejected>0);
  }finally{for(const w of worlds)w.dispose();}
});

test('provider bounds reject before admission and one graph owns disposal without closing another owner',()=>{
  const preparation=prepared({kind:'continuity',carrier:'f::floor'});let admissionCalls=0;
  const oversized=providerFor(preparation,Array(17).fill(preparation.blocks[0]),{admit(){admissionCalls++;return true;}});assert.equal(oversized.diagnostics().admitted,0);assert.equal(admissionCalls,0);oversized.dispose();
  const limited=providerFor(preparation,preparation.blocks,{limits:{identityValues:10}});assert.equal(limited.diagnostics().admitted,0);limited.dispose();
  const provider=providerFor(preparation),first=sourceSupportWorld(args=>createSourceSupportGraph({...args,preparedProvider:provider,sourceIdentity:preparation.sourceIdentity})),second=sourceSupportWorld(args=>createSourceSupportGraph({...args,preparedProvider:provider,sourceIdentity:preparation.sourceIdentity}));
  try{for(const w of [first,second]){w.activation.ensure(['f::floor']);w.trial.step();}same(first,second);second.dispose();assert.equal(provider.diagnostics().owned,true);assert.equal(provider.diagnostics().disposed,false);}finally{first.dispose();}
  assert.equal(provider.diagnostics().owned,false);assert.equal(provider.diagnostics().keys,0);assert.equal(provider.diagnostics().identityValues,0);assert.equal(provider.diagnostics().edges,0);
});

function facetFixture({far=false,relation=false}={}){
  const definitions=[{id:'f::a/face',sourceCarrierId:'f::a',normal:[0,0,1],triangles:[[[.05,.1,.25],[.45,.1,.25],[.25,.9,.25]]]},{id:'f::b/face',sourceCarrierId:'f::b',normal:[1,0,0],triangles:[[[.25,.4,.15],[.25,.4,.35],[.25,.6,.35]]]}].map(s=>({...s,instanceId:'f',kind:'attachment',thickness:0,material:'metal',fuelAmount:0,nativeInertBody:true,supports:true,solidTriangles:s.triangles,closedShape:false}));
  if(far)for(const field of ['triangles','solidTriangles'])definitions[1][field]=definitions[1][field].map(t=>t.map(p=>[p[0]+4,p[1],p[2]]));
  const carriers=definitions.map((s,i)=>({id:s.sourceCarrierId,fuelClass:null,fuelAmount:0,bounds:bounds(s.triangles.flat()),parts:[i],anchors:i?[]:[{elevation:.1}],supports:relation&&i?['f::a']:[],supportEvidence:relation&&i?[{parent:'f::a',kind:'coplanar-horizontal-triangle-contact'}]:[],attachments:[],adjacency:[]})),parts=carriers.map(c=>({id:c.id+'/part',carrierId:c.id,geometry:c.id,bounds:c.bounds,physical:true,closed:false})),library={geometries:Object.fromEntries(definitions.map(s=>[s.sourceCarrierId,{attributes:{position:{array:s.triangles.flat(2),itemSize:3,type:'Float64Array'}},index:null}]))},model={carriers,parts,library,carrierById:new Map(carriers.map(c=>[c.id,c])),partById:new Map(parts.map(p=>[p.id,p])),index:{contacts:relation?[]:[[0,1],[1,0]]}};
  const data={version:1,runtimeAdapterVersion:1,prefabId:'ordered-native-facet',sourceBounds:{min:[-1,0,-1],max:[6,2,2]},implicitGround:false,gridOrigin:[0,0,0],thermalCell:[.5,1.06,.5],surfaces:[],openings:[],items:[],furnitureParts:[],stores:[],render:{geometry:[],materials:[]},scene:{version:1,instances:[{id:'f'}],doors:[]}},navigation={version:1,placeId:'f',surfaces:[],ceilings:[],blockers:[],portals:[],collisionShapes:{}},shapeForPart=id=>({triangles:definitions[parts.findIndex(p=>p.id===id)].triangles,closed:false}),sources={order:id=>carriers.findIndex(c=>c.id===id),near:()=>[],shapeForPart,sourcesForCarrier:id=>({surfaces:definitions.filter(s=>s.sourceCarrierId===id)})};
  return {model,data,navigation,shapeForPart,sources};
}

test('native asymmetric argument order and cached typed false results match the pinned graph',()=>{
  for(const [options,request,expected]of [[{}, {kind:'adjacency',index:0},false],[{}, {kind:'adjacency',index:1},true],[{far:true,relation:true},{kind:'relation',index:0},false]]){
    const input=facetFixture(options),sourceIdentity=identity(input),preparation={...prepareSourceSupportBlocks({...input,identity:sourceIdentity,request}),sourceIdentity},block=preparation.blocks.find(b=>b.identity.ownerStates.every(s=>s.state==='active'));
    assert.deepEqual(block.result,{type:'boolean',value:expected});const provider=providerFor(preparation),worlds=[worldFromSourceFixture(facetFixture(options),referenceFactory),worldFromSourceFixture(facetFixture(options),args=>createSourceSupportGraph({...args,preparedProvider:provider,sourceIdentity}))];
    try{for(const w of worlds){w.activation.ensure(['f::a','f::b']);w.trial.step();}same(...worlds);assert.ok(provider.diagnostics().hits>0);if(request.kind==='relation')assert.equal(worlds[1].trial.supportGraph.diagnostics().missingLocalLinks,1);}finally{for(const w of worlds)w.dispose();}
  }
});

test('an existing New York mullion/rail declared mount replays with complete sparse graph/physical parity',()=>{
  const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url))),index=read('assets/runtime/map-sources/new-york/index.json'),library=read('assets/runtime/map-sources/new-york/library.json'),navigation=read('assets/art/place-scenes/new-york/navigation.json');
  function input(){const compiled=compileSharedMap(index,library,navigation);return {model:compiled.model,data:compiled.data,sources:compiled.sources,navigation,shapeForPart:compiled.sources.shapeForPart,extraDispose:()=>compiled.dispose()};}
  const offline=input(),sourceIdentity=identity(offline),queryState=Object.fromEntries(navigation.portals.map(p=>[p.id,false]));let preparation;
  try{preparation={...prepareSourceSupportBlocks({...offline,identity:sourceIdentity,request:{kind:'relation',index:419},portalStates:queryState}),sourceIdentity};}finally{offline.extraDispose();}
  assert.deepEqual(preparation.selected.owners,['new-york::carrier/clerestory/0/window-0/mullion','new-york::carrier/clerestory/0/window-0/rail-0']);assert.equal(preparation.resources.compiledNativeScenes,1);
  const provider=providerFor(preparation),worlds=[worldFromSourceFixture(input(),referenceFactory),worldFromSourceFixture(input(),args=>createSourceSupportGraph({...args,preparedProvider:provider,sourceIdentity}))];
  try{for(const w of worlds){w.activation.ensure(preparation.selected.owners);w.trial.step();}same(...worlds);assert.ok(provider.diagnostics().hits>0);}finally{for(const w of worlds)w.dispose();}
});
