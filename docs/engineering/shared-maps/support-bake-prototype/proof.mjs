import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {compileSharedMap} from '../../../../src/content/shared-map.js';
import {createTrial} from '../../../../workbenches/furnished-house/simulation.js';
import {createSourceActivation} from '../../../../src/simulation/source-activation.js';
import {createSourceCarrierLedger} from '../../../../src/simulation/source-carriers.js';
import {createSourceSupportGraph as referenceFactory} from './source/reference-support.mjs';
import {createSourceSupportGraph as prototypeFactory} from './source/prototype-support.mjs';
import {hash,makeIdentity,validateEntry,makeHooks} from './block-format.mjs';

const directory=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(directory,'../../../..');
const write=(name,value)=>fs.writeFileSync(path.join(directory,name),JSON.stringify(value,null,2)+'\n');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'source-manifest.json'),'utf8'));
const started=performance.now(),worlds=new Set(),entries=new Map();
const result={scope:'One existing NY floor-continuity control and one exact ordered contact pair; CPU mechanism illustration only.',
  frozenCommit:manifest.frozenCommit,supportLfSha256:manifest.supportLfSha256,deadlineMs:60000,
  cases:[],negatives:[],comparisons:0,worldsDisposed:0,maximumExpandedCarriers:0,maximumThermalCells:0,
  initialColdThermalCells:[],preparationMs:0,loadMs:0,passed:false};
let stage='source-preflight';
function finite(){assert.ok(performance.now()-started<50000,'Cooperative 50s bound inside parent-enforced 60s lifetime');}
for(const [p,expected]of Object.entries(manifest.moduleLfHashes)){
  assert.equal(hash(fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n')),expected,p);
}
for(const [p,expected]of Object.entries(manifest.assetRawHashes)){
  const bytes=fs.readFileSync(path.join(root,p));assert.equal(hash(bytes.toString()),expected,p);
}
for(const [p,expected]of Object.entries(manifest.copies)){
  assert.equal(hash(fs.readFileSync(path.join(directory,p),'utf8').replace(/\r\n/g,'\n')),expected,p);
}
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const index=read('assets/runtime/map-sources/new-york/index.json');
const library=read('assets/runtime/map-sources/new-york/library.json');
const navigation=read('assets/art/place-scenes/new-york/navigation.json');
const a=manifest.scope.continuityCarrier,b=manifest.scope.orderedContactCarriers[1];
const keys=new Set(['continuity:'+a,'adjacency:'+manifest.scope.orderedContactIndex]);
const base={sourceCommit:manifest.frozenCommit,algorithm:manifest.supportLfSha256,
  dependencySet:hash(manifest.moduleLfHashes),sourceLayout:hash(manifest.assetRawHashes),
  originalIndexPair:manifest.scope.orderedContactIndex,ownershipVersion:1,
  proofFormatHash:hash(fs.readFileSync(path.join(directory,'block-format.mjs'),'utf8'))};
function world(factory,hooks){
  finite();let compiled,querySource,ledger,trial,activation;
  try{
    compiled=compileSharedMap(index,library,navigation);querySource=compiled.createQuerySource();
    const pair=compiled.model.index.contacts[manifest.scope.orderedContactIndex].map(i=>compiled.model.carriers[i].id);
    assert.deepEqual(pair,[a,b],'Keep the original indexed argument order; never reverse or sort it');
    ledger=createSourceCarrierLedger(compiled.model.carriers);
    trial=createTrial(compiled.data,{executionCache:true,querySource,
      supportGraphFactory:scene=>factory({scene,model:compiled.model,querySource,bakeHooks:hooks})});
    activation=createSourceActivation({trial,querySource,ledger,sources:compiled.sources});
    assert.equal(trial.scene.cells.size,0,'No dense thermal world is born at startup');
    result.initialColdThermalCells.push(trial.scene.cells.size);
    const value={compiled,querySource,ledger,trial,activation,hooks,
      dispose(){if(!worlds.delete(value))return;activation.dispose();trial.dispose();querySource.dispose();ledger.dispose();compiled.dispose();
        const cache=trial.supportGraph.diagnostics().topologyCache;assert.equal(cache.entries,0);assert.equal(cache.watchedBoundaries,0);
        result.worldsDisposed++;}};
    worlds.add(value);return value;
  }catch(error){activation?.dispose();trial?.dispose();querySource?.dispose();ledger?.dispose();compiled?.dispose();throw error;}
}
const graphRows=g=>[...g.links].map(([id,set])=>[id,[...set]]);
function compare(pair,label){
  finite();const [original,replay]=pair;
  const originalPending=original.trial.supportGraph.pendingSources(),replayPending=replay.trial.supportGraph.pendingSources();
  assert.deepEqual(replayPending,originalPending,'Cold support outcome '+label);
  const originalLoss=original.trial.supportGraph.unsupported({force:true}).map(b=>b.id);
  const replayLoss=replay.trial.supportGraph.unsupported({force:true}).map(b=>b.id);
  assert.deepEqual(replayLoss,originalLoss,'Active support outcome '+label);
  const originalRows=graphRows(original.trial.supportGraph),replayRows=graphRows(replay.trial.supportGraph);
  assert.deepEqual(replayRows,originalRows,'Exact directed node, neighbor and emission order '+label);
  const originalPhysical=original.trial.snapshot(),replayPhysical=replay.trial.snapshot();
  assert.deepEqual(replayPhysical,originalPhysical,'Full boundaries/fuel/heat/events/clock/falls state '+label);
  assert.deepEqual(replay.ledger.metrics(replay.trial.metrics().fuel),original.ledger.metrics(original.trial.metrics().fuel));
  const withoutCache=g=>{const {topologyCache,...semantic}=g.diagnostics();return semantic;};
  assert.deepEqual(withoutCache(replay.trial.supportGraph),withoutCache(original.trial.supportGraph));
  for(const w of pair){
    result.maximumExpandedCarriers=Math.max(result.maximumExpandedCarriers,w.compiled.sources.metrics().nativeSourceExpansions);
    result.maximumThermalCells=Math.max(result.maximumThermalCells,w.trial.scene.cells.size);
    assert.ok(w.compiled.sources.metrics().nativeSourceExpansions<=2);
    assert.ok(w.trial.scene.cells.size<=128);
  }
  result.comparisons++;
  return {label,graphSha256:hash(originalRows),physicalSha256:hash(originalPhysical),
    pending:originalPending.length,unsupported:originalLoss.length,tick:original.trial.tick,
    sourceNodes:original.trial.supportGraph.nodes.size};
}
function paired(hooks){return [world(referenceFactory),world(prototypeFactory,hooks)];}
function apply(pair,fn){for(const w of pair){finite();fn(w);}}
function dispose(pair){for(const w of pair)w.dispose();}
const ownershipCases=[[],[a],[b],[a,b]];
try{
  const prepareAt=performance.now();
  for(const ids of ownershipCases){
    stage='prepare-'+ids.length+'-'+(ids[0]===a?'A':'B');
    const hooks=makeHooks({base,keys,mode:'record'}),pair=paired(hooks);
    try{
      apply(pair,w=>w.activation.ensure(ids,'bounded-proof'));
      const summary=compare(pair,'prepare '+JSON.stringify(ids));
      apply(pair,w=>w.trial.step());compare(pair,'prepared physical step');
      for(const [signature,entry]of hooks.recorded){
        if(entries.has(signature))assert.deepEqual(entry,entries.get(signature),'A repeated static state emits exactly one identical block');
        entries.set(signature,entry);
      }
      result.cases.push({...summary,phase:'preparation',ownership:ids,stats:{...hooks.stats}});
    }finally{dispose(pair);}
  }
  result.preparationMs=performance.now()-prepareAt;
  assert.equal(entries.size,4,'One floor continuity variant plus three applicable ordered-contact variants; cold/cold bypasses calculate');
  const payload={format:'tinderbox-support-blocks-prototype-v1',sourceCommit:manifest.frozenCommit,base,
    scope:manifest.scope,entries:[...entries.values()]};
  const text=JSON.stringify(payload)+'\n';result.serializedBytes=Buffer.byteLength(text);
  assert.ok(result.serializedBytes<=262144,'Finite 256KiB illustrative shard bound');
  assert.ok(payload.entries.every(e=>e.edges.length<=4096),'Finite edge block bounds');
  fs.writeFileSync(path.join(directory,'blocks.json'),text);
  result.payloadSha256=hash(text);result.blockCount=payload.entries.length;
  result.directedEdgeRecords=payload.entries.reduce((n,e)=>n+e.edges.length,0);
  result.blockSummaries=payload.entries.map(e=>({key:e.descriptor.key,signature:e.signature,
    owners:e.descriptor.ownerStates.map(s=>({id:s.id,state:s.state,originalIds:s.orderedIds})),
    result:e.result,directedEdges:e.edges.length}));
  const loadAt=performance.now(),loaded=JSON.parse(fs.readFileSync(path.join(directory,'blocks.json'),'utf8'));
  assert.equal(hash(fs.readFileSync(path.join(directory,'blocks.json'),'utf8')),result.payloadSha256);
  assert.equal(loaded.format,'tinderbox-support-blocks-prototype-v1');assert.equal(loaded.sourceCommit,manifest.frozenCommit);assert.deepEqual(loaded.base,base);
  result.loadMs=performance.now()-loadAt;
  for(const ids of ownershipCases){
    stage='replay-'+JSON.stringify(ids);
    const hooks=makeHooks({base,keys,mode:'replay',entries:loaded.entries}),pair=paired(hooks);
    try{
      apply(pair,w=>w.activation.ensure(ids,'bounded-proof'));
      const summary=compare(pair,stage);apply(pair,w=>w.trial.step());compare(pair,'replayed physical step');
      if(ids.length)assert.ok(hooks.stats.hits>0);else assert.equal(hooks.stats.hits,0);
      assert.equal(hooks.stats.builds,0,'An applicable recorded block needs no target geometry calculation');
      result.cases.push({...summary,phase:'replay',ownership:ids,stats:{...hooks.stats}});
    }finally{dispose(pair);}
  }
  // Same two carriers: retire one original floor fragment, keep its exact ID,
  // rebuild once, then activate the neighbor. No lookup can rename the parent.
  stage='local-loss-late-activation';
  {
    const hooks=makeHooks({base,keys,mode:'replay',entries:loaded.entries}),pair=paired(hooks);
    try{
      apply(pair,w=>w.activation.ensure([a],'bounded-proof'));
      compare(pair,'before local loss');
      const original=[...pair[0].trial.supportGraph.nodes.values()].find(n=>n.sourceCarrierId===a);
      assert.ok(original);const id=original.id;
      const otherIds=[...pair[0].trial.supportGraph.nodes.values()].filter(n=>n.sourceCarrierId===a&&n.id!==id).map(n=>n.id);
      assert.ok(otherIds.length);
      const beforeBuilds=hooks.stats.builds;
      apply(pair,w=>{w.trial.scene.index.change(id,{intact:false});w.trial.supportGraph.sourcesAdded({boundaries:[]});});
      const summary=compare(pair,'original fragment retired');
      assert.ok(hooks.stats.builds>beforeBuilds,'Loss signature falls back to original target calculation');
      apply(pair,w=>w.activation.ensure([b],'bounded-proof'));compare(pair,'late neighbor activation after loss');
      apply(pair,w=>w.trial.step());compare(pair,'physical step after local loss');
      for(const w of pair){
        assert.equal(w.trial.supportGraph.nodes.get(id),w.trial.scene.index.surfaces.get(id));
        assert.equal(w.trial.supportGraph.nodes.get(id).intact,false);
        assert.ok(otherIds.some(oid=>w.trial.supportGraph.nodes.get(oid).intact));
        assert.ok([...w.trial.supportGraph.nodes.keys()].every(oid=>oid===id||otherIds.includes(oid)||w.trial.supportGraph.nodes.get(oid).sourceCarrierId===b));
      }
      result.negatives.push({...summary,kind:'local-loss/no-ID-remap/late-ownership',retiredOriginalId:id,stats:{...hooks.stats}});
    }finally{dispose(pair);}
  }
  // A changed original boundary pose has no baked variant: calculate it natively.
  stage='unbaked-geometry-pose';
  {
    const hooks=makeHooks({base,keys,mode:'replay',entries:loaded.entries}),pair=paired(hooks);
    try{
      apply(pair,w=>w.activation.ensure([a,b],'bounded-proof'));compare(pair,'before unbaked pose');
      const id=[...pair[0].trial.supportGraph.nodes.values()].find(n=>n.sourceCarrierId===a).id;
      const fields=['triangles','solidTriangles','closedTriangles','closedSolidTriangles'];
      const shift=p=>p.map((v,i)=>v+(i===0?.125:0));
      const before=hooks.stats.builds;
      apply(pair,w=>{const n=w.trial.scene.index.surfaces.get(id),patch={bounds:{min:shift(n.bounds.min),max:shift(n.bounds.max)}};
        for(const field of fields)if(n[field])patch[field]=n[field].map(t=>t.map(shift));
        w.trial.scene.index.change(id,patch);w.trial.supportGraph.sourcesAdded({boundaries:[]});});
      const summary=compare(pair,'unbaked original-ID fragment pose');
      assert.ok(hooks.stats.builds>before);apply(pair,w=>w.trial.step());compare(pair,'unbaked pose physical step');
      result.negatives.push({...summary,kind:'unbaked-geometry-pose/native-fallback',originalId:id,diagnosticTranslationMetres:.125,stats:{...hooks.stats}});
    }finally{dispose(pair);}
  }
  // Key/envelope negatives use the same exact identity and run no second fixture.
  stage='stale-signature-and-data';
  const sample=loaded.entries.find(e=>e.descriptor.key.startsWith('adjacency:'));
  const identity={descriptor:sample.descriptor,signature:sample.signature};
  for(const [name,mutate]of [
    ['algorithm',d=>{d.base.algorithm='changed';}],
    ['source/layout',d=>{d.base.sourceLayout='changed';}],
    ['grid',d=>{d.grid.pitch[0]*=2;}],
    ['cold-active ownership',d=>{d.ownerStates[0].state=d.ownerStates[0].state==='active'?'cold':'active';}],
    ['original-ID order',d=>{d.ownerStates[0].orderedIds.reverse();d.ownerStates[0].orderedIds.push('unbaked');}],
    ['pose',d=>{d.ownerStates[0].geometryPoseHash='changed';}]
  ]){
    const descriptor=structuredClone(sample.descriptor);mutate(descriptor);
    assert.equal(validateEntry(sample,{descriptor,signature:hash(descriptor)}),null);
    result.negatives.push({kind:'stale-key/'+name,rejected:true});
  }
  assert.equal(validateEntry(undefined,identity),null);
  for(const [name,edit]of [
    ['stale edge',e=>{e.edges.push(['stale-original-id','stale-original-id']);}],
    ['result',e=>{e.result={type:'boolean',value:'true'};}],
    ['checksum',e=>{e.blockSha256='changed';}]
  ]){
    const changed=structuredClone(sample);edit(changed);assert.equal(validateEntry(changed,identity),null);
    result.negatives.push({kind:'invalid-data/'+name,rejected:true});
  }
  // The actual graph also takes the native path when all records are absent.
  stage='missing-shard-original-fallback';
  {
    const hooks=makeHooks({base,keys,mode:'replay',entries:[]}),pair=paired(hooks);
    try{apply(pair,w=>w.activation.ensure([a,b],'bounded-proof'));
      const summary=compare(pair,stage);assert.ok(hooks.stats.builds>0);assert.equal(hooks.stats.hits,0);
      apply(pair,w=>w.trial.step());compare(pair,'missing-shard physical step');
      result.negatives.push({...summary,kind:'missing-shard/native-fallback',stats:{...hooks.stats}});
    }finally{dispose(pair);}
  }
  finite();result.passed=true;
}catch(error){result.failure={stage,message:error.message,stack:error.stack};process.exitCode=1;}
finally{
  for(const w of [...worlds]){try{w.dispose();}catch(error){result.cleanupError=String(error);result.passed=false;process.exitCode=1;}}
  result.remainingWorlds=worlds.size;result.elapsedMs=performance.now()-started;
  write('result.json',result);
}
console.log(JSON.stringify({passed:result.passed,stage,elapsedMs:result.elapsedMs,comparisons:result.comparisons,
  blocks:result.blockCount,bytes:result.serializedBytes,maximumThermalCells:result.maximumThermalCells,
  failure:result.failure?.message,remainingWorlds:result.remainingWorlds}));
