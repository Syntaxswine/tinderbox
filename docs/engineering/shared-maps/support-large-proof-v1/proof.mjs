// One source-local observation. No trial, ticks, renderer, codec or production edit.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import v8 from 'node:v8';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const file=name=>path.join(here,name),hash=b=>createHash('sha256').update(b).digest('hex');
const pairOwners=['new-york::carrier/clerestory-roof-deck/tile--1-10','new-york::carrier/roof/clerestory'],roof=pairOwners[1];
const planned=['pinned-inputs','imports','parse-source-json','map-metadata','select-exact-pair','source-part-preflight','native-blueprint','native-clipping','native-postflight'];
for(const name of ['large-continuity','both-cold-bypass','deck-active-contact','roof-active-contact','both-active-contact']){
  planned.push(name+':original',name+':shared',name+':equivalence');
  if(name!=='both-cold-bypass')planned.push(name+':identity',name+':block');
}
planned.push('reference-json-encode','reference-json-write','reference-json-decode','admission','large-continuity:current-identity-equality','both-active-contact:current-identity-equality','large-continuity:active-replay','both-active-contact:active-replay','deck-active-contact:original-fallback','roof-active-contact:original-fallback');
const state={version:1,authority:'4f57ccd6879b7e8f2086be1ae21e3ff154ea0d22',seam:'989ecd6777f8a77791b0fa8ad32fcc618a2d3438',pid:process.pid,executable:process.execPath,argv:process.argv,execArgv:process.execArgv,entryAt:new Date().toISOString(),processTimeOrigin:performance.timeOrigin,cooperativeLimitMs:50000,nodeHeap:v8.getHeapStatistics(),stages:[],observations:[],observedMaxMemory:{},planned,firstFailure:null,complete:false,cleanup:{native:false,query:false,compiledMetadata:false,provider:false,contexts:false},scope:{nativeCompilationAttempts:0,nativeCompilations:0,trials:0,worldSteps:0,codec:false,productionEnabled:false,retirementShortcut:false,coldReplay:false}};
function memory(label){const values=process.memoryUsage();for(const [key,n]of Object.entries(values))state.observedMaxMemory[key]=Math.max(state.observedMaxMemory[key]||0,n);return {label,elapsedProcessMs:performance.now(),...values};}
function save(){
  const reached=new Set(state.stages.map(s=>s.name));state.unrun=planned.filter(n=>!reached.has(n));
  state.elapsedProcessMs=performance.now();fs.writeFileSync(file('partial.tmp.json'),JSON.stringify(state,null,2)+'\n');fs.renameSync(file('partial.tmp.json'),file('partial.json'));
}
function observe(name,value){state.observations.push({name,at:new Date().toISOString(),value:structuredClone(value),memory:memory(name)});if(name==='native-resources')state.scope.nativeCompilations=value.compiledNativeScenes;if(name==='native-cleanup')state.cleanup.native=value.localCompilerDisposed===true;save();}
function guard(name){if(performance.now()>=50000||fs.existsSync(file('stop.requested'))){const error=new Error('Cooperative 50-second/stop-file boundary before '+name);error.proofBound=true;throw error;}}
function begin(name){guard(name);if(name==='native-clipping')state.scope.nativeCompilationAttempts++;const row={name,status:'running',startedAt:new Date().toISOString(),before:memory(name+':before')};state.stages.push(row);save();return {row,start:performance.now()};}
function finish(token,error){const {row,start}=token;row.elapsedFunctionMs=performance.now()-start;row.after=memory(row.name+':after');row.endedAt=new Date().toISOString();row.status=error?'failed':'passed';if(error){row.error={name:error.name,message:error.message,stack:error.stack};state.firstFailure||={stage:row.name,...row.error};}save();}
function phase(name,fn){const token=begin(name);let result;try{result=fn();}catch(error){finish(token,error);throw error;}finish(token);return result;}
async function phaseAsync(name,fn){const token=begin(name);let result;try{result=await fn();}catch(error){finish(token,error);throw error;}finish(token);return result;}
function canonicalCount(value){if(value===null||typeof value!=='object')return 1;if(!Array.isArray(value)){const keys=Object.keys(value);if(keys.length===1&&(value.$undefined===true||value.$number==='-0'))return 1;}return 1+Object.values(value).reduce((n,v)=>n+canonicalCount(v),0);}
let compiled,query,provider,providerOwner,providerAPI,contexts=[],blocks=[],records,decoded,json;
let encodeResult,blockDigest,calculations,originalCalculation,identity,sourceCalculationIdentity,createProvider,claimProvider,readProvider,releaseProvider;
function writeResult(name,value){fs.mkdirSync(file('calculations'),{recursive:true});fs.writeFileSync(file('calculations/'+name+'.json'),JSON.stringify(value)+'\n');}
function prepareCalculation(name,context,{bypass=false}={}){
  const original=phase(name+':original',()=>originalCalculation(context,context.calculation));
  const math=calculations(context),captured=phase(name+':shared',()=>providerAPI.captureSourceCalculation(add=>math.run(context.calculation,add)));
  phase(name+':equivalence',()=>assert.deepEqual(captured,original,'Complete ordered edges and exact typed return'));
  const reference={edges:original.edges,result:encodeResult(original.result)},candidate={edges:captured.edges,result:encodeResult(captured.result)};
  writeResult(name,{reference,candidateDigest:hash(JSON.stringify(candidate)),referenceDigest:hash(JSON.stringify(reference)),exactOrderedEquality:true,bypass,owners:context.owners,active:[...context.active.keys()]});
  observe(name+':result',{edges:captured.edges.length,result:reference.result,owners:context.owners,active:[...context.active.keys()],originalOrderedDigest:hash(JSON.stringify(reference)),exactOrderedEquality:true,bypass});
  if(bypass)return;
  const blockIdentity=phase(name+':identity',()=>sourceCalculationIdentity(context,identity));
  observe(name+':identity-count',{canonicalIdentityValues:canonicalCount(blockIdentity),countRule:'Encoded undefined/-0 tags are one value, matching the reference admission clone counter.'});
  const block=phase(name+':block',()=>{const value={version:1,identity:blockIdentity,edges:captured.edges,result:encodeResult(captured.result)};value.digest=blockDigest(value);return value;});
  blocks.push(block);contexts.push({name,context,expected:captured});
}
try{
  assert.ok(fs.existsSync(file('launch.once')),'Use the bounded parent launcher');
  const once=fs.openSync(file('proof-started.once'),'wx');fs.closeSync(once);
  save();
  const input=phase('pinned-inputs',()=>{
    assert.deepEqual(process.execArgv,['--max-old-space-size=1024']);
    const pins=JSON.parse(fs.readFileSync(path.join(root,'docs/engineering/shared-maps/support-preparation-v1/source-pins.json')));
    const dependencies=JSON.parse(fs.readFileSync(path.join(root,'docs/engineering/shared-maps/support-preparation-v1/compiler-dependencies.json')));
    assert.equal(dependencies.digest,'ddd03319fd6eacf936cf3afdd0b2ed914d93a8e70e51c14076dc8e4c465ad36d');assert.equal(dependencies.files.length,30);assert.equal(process.version,dependencies.nodeRuntime);
    for(const f of dependencies.files){const bytes=fs.readFileSync(path.join(root,f.path));assert.equal(hash(f.kind==='module'?bytes.toString('utf8').replace(/\r\n/g,'\n'):bytes),f.sha256,f.path);}
    const raw=Object.fromEntries(pins.files.map((f,i)=>{const bytes=fs.readFileSync(path.join(root,f.path));assert.equal(bytes.length,f.bytes);assert.equal(hash(bytes),f.sha256,f.path);return [['index','library','navigation'][i],bytes];}));
    const launchPlan=JSON.parse(fs.readFileSync(file('plan.json')));
    for(const f of launchPlan.harnessPins)assert.equal(hash(fs.readFileSync(file(f.file))),f.sha256,f.file);
    assert.equal(hash(fs.readFileSync(path.join(root,'docs/engineering/shared-maps/support-regions-proposal.md'))),'56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f');
    return {raw,dependencies,pins};
  });
  const modules=await phaseAsync('imports',()=>Promise.all([
    import('../../../../src/content/shared-map.js'),
    import('../../../../src/simulation/source-support-calculations.js'),
    import('../../../../src/simulation/prepared-source-support.js'),
    import('../../../../tools/prepare-source-support.mjs'),
    import('../../../../tools/support-preparation-identity.mjs'),
    import('./original-calculation.mjs'),import('./native-preparation.mjs')
  ]));
  const [content,shared,admission,producer,dependency,reference,native]=modules;
  assert.equal(dependency.verifySupportPreparationDependencies(input.dependencies),true);
  providerAPI={...admission,captureSourceCalculation:shared.captureSourceCalculation};
  calculations=shared.createSourceSupportCalculations;originalCalculation=reference.originalCalculation;encodeResult=admission.encodeSourceCalculationResult;blockDigest=producer.sourceBlockDigest;sourceCalculationIdentity=admission.sourceCalculationIdentity;
  createProvider=admission.createPreparedSourceProvider;claimProvider=admission.claimPreparedSourceProvider;readProvider=admission.readPreparedSourceCalculation;releaseProvider=admission.releasePreparedSourceProvider;
  assert.deepEqual(producer.PREPARATION_LIMITS,{parts:512,sourceTriangles:32768,surfaces:4096,fragments:8192,localCells:65536});
  assert.deepEqual(admission.PREPARED_SUPPORT_LIMITS,{blocks:16,variantsPerKey:4,edgesPerBlock:65536,identityValues:500000,totalIdentityValues:1000000,totalEdges:200000,depth:64,stringLength:1024});
  observe('fixed-limits',{preparation:producer.PREPARATION_LIMITS,provider:admission.PREPARED_SUPPORT_LIMITS,overrides:false});
  const parsed=phase('parse-source-json',()=>Object.fromEntries(Object.entries(input.raw).map(([key,bytes])=>[key,JSON.parse(bytes)])));
  compiled=phase('map-metadata',()=>content.compileSharedMap(parsed.index,parsed.library,parsed.navigation));query=compiled.createQuerySource();
  const selected=phase('select-exact-pair',()=>{const value=producer.selectSourceCalculation(compiled.model,{kind:'adjacency',index:3555});assert.deepEqual(value.owners,pairOwners);assert.equal(compiled.model.carriers[10027].id,roof);return value;});
  const portalStates=query.portalStates();
  identity={version:1,algorithm:admission.PREPARED_SUPPORT_ALGORITHM,sourceModel:hash(JSON.stringify(Object.fromEntries(Object.entries(input.raw).map(([key,bytes])=>[key,hash(bytes)])))),compiler:input.dependencies.digest,layout:hash(JSON.stringify({origin:compiled.data.gridOrigin,pitch:compiled.data.thermalCell,scene:compiled.data.scene,layoutVersion:1}))};
  observe('selected-input',{selected,sourceIdentity:identity,sourcePins:input.pins.files,grid:{origin:compiled.data.gridOrigin,pitch:compiled.data.thermalCell},portalCount:Object.keys(portalStates).length,sourceExpansionBeforeCompile:compiled.sources.metrics()});
  native.withNativePair({...compiled,selected,portalStates},phase,observe,({scene,resources})=>{
    records=[...scene.index.surfaces.values()];
    const byOwner=pairOwners.map(id=>({id,parts:compiled.model.carrierById.get(id).parts.length,fragments:records.filter(b=>b.sourceCarrierId===id).length,nativeTriangles:records.filter(b=>b.sourceCarrierId===id).reduce((n,b)=>n+b.triangles.length,0)}));
    observe('native-counts',{byOwner,resources,sourceExpansion:compiled.sources.metrics()});
    function contextFor(descriptor,ids){
      const active=new Map(),nodes=new Map(),births=new Map();for(const b of records)if(ids.includes(b.sourceCarrierId)){if(!active.has(b.sourceCarrierId))active.set(b.sourceCarrierId,[]);active.get(b.sourceCarrierId).push(b);nodes.set(b.id,b);births.set(b.id,b);}
      const querySource={shape:(id,open)=>compiled.sources.shapeForPart(id,open),portalStates:()=>portalStates},context={...descriptor,scene,model:compiled.model,querySource,index:scene.index,nodes,active,births};
      context.links=new Map(context.owners.flatMap(id=>active.has(id)?active.get(id).map(b=>b.id):['cold:'+id]).map(id=>[id,new Set()]));
      return context;
    }
    const continuity=producer.selectSourceCalculation(compiled.model,{kind:'continuity',carrier:roof});
    prepareCalculation('large-continuity',contextFor(continuity,[roof]));
    prepareCalculation('both-cold-bypass',contextFor(selected,[]),{bypass:true});
    prepareCalculation('deck-active-contact',contextFor(selected,[pairOwners[0]]));
    prepareCalculation('roof-active-contact',contextFor(selected,[roof]));
    prepareCalculation('both-active-contact',contextFor(selected,pairOwners));
    json=phase('reference-json-encode',()=>JSON.stringify({version:1,identity,selected,blocks}));
    observe('reference-json-size',{bytes:Buffer.byteLength(json),utf16CodeUnits:json.length,blocks:blocks.length,decodedIdentityValues:blocks.map(b=>({key:b.identity.key,values:canonicalCount(b.identity),edges:b.edges.length})),format:'Unadapted reference JSON; no portable codec.'});
    phase('reference-json-write',()=>fs.writeFileSync(file('reference-blocks.json'),json+'\n'));
    decoded=phase('reference-json-decode',()=>JSON.parse(json));assert.deepEqual(decoded.blocks,blocks);
    const trusted=new Set(blocks.map(b=>b.digest));
    phase('admission',()=>{provider=createProvider({identity,blocks:decoded.blocks,admit:b=>trusted.has(b.digest)&&blockDigest(b)===b.digest});providerOwner={};assert.equal(claimProvider(provider,providerOwner),provider);const d=provider.diagnostics();observe('provider-admission',d);assert.equal(d.admitted,blocks.length,'First provider rejection/cap stops the proof');});
    for(const name of ['large-continuity','both-active-contact']){
      const entry=contexts.find(c=>c.name===name),block=blocks.find(b=>b.identity.key===entry.context.key&&b.identity.ownerStates.every(s=>s.state==='active'));
      phase(name+':current-identity-equality',()=>assert.deepEqual(sourceCalculationIdentity(entry.context,identity),block.identity));
    }
    for(const name of ['large-continuity','both-active-contact']){
      const entry=contexts.find(c=>c.name===name);
      const replay=phase(name+':active-replay',()=>{const value=readProvider(provider,providerOwner,entry.context,identity);assert.ok(value,'Active replay must actually hit');return shared.captureSourceCalculation(add=>{for(const [a,b]of value.edges)add(a,b);return value.result;});});
      assert.deepEqual(replay,entry.expected,'Exact replay order/result');observe(name+':replay',{diagnostics:provider.diagnostics(),edges:replay.edges.length,result:encodeResult(replay.result)});
    }
    for(const name of ['deck-active-contact','roof-active-contact']){
      const entry=contexts.find(c=>c.name===name),math=calculations(entry.context);
      const fallback=phase(name+':original-fallback',()=>{assert.equal(readProvider(provider,providerOwner,entry.context,identity),null,'Cold ban stays enabled');return shared.captureSourceCalculation(add=>math.run(entry.context.calculation,add));});
      assert.deepEqual(fallback,entry.expected,'Original mixed fallback order/result');observe(name+':fallback',{diagnostics:provider.diagnostics(),edges:fallback.edges.length,result:encodeResult(fallback.result)});
    }
  });
  guard('proof completion');state.complete=true;
}catch(error){
  state.firstFailure||={stage:state.stages.findLast(s=>s.status==='running')?.name||'between-stages',name:error.name,message:error.message,stack:error.stack,cooperativeBound:error.proofBound===true};
  state.outcome='Stopped at first failure/cap/bound; no retry, widening, substitution or skipped comparison.';
  process.exitCode=error.proofBound?3:1;
}finally{
  try{if(provider){if(providerOwner)releaseProvider(provider,providerOwner);provider.dispose();observe('provider-cleanup',provider.diagnostics());}state.cleanup.provider=true;}catch(error){state.cleanup.providerError=error.message;}
  try{if(query)query.dispose();state.cleanup.query=true;}catch(error){state.cleanup.queryError=error.message;}
  try{if(compiled)compiled.dispose();state.cleanup.compiledMetadata=true;}catch(error){state.cleanup.compiledMetadataError=error.message;}
  for(const entry of contexts)for(const key of ['active','nodes','births','links'])entry.context[key].clear();
  contexts=[];blocks=[];records=null;decoded=null;json=null;state.cleanup.contexts=true;
  state.finalMemory=memory('finally');state.endedAt=new Date().toISOString();save();fs.writeFileSync(file('final.json'),JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({complete:state.complete,firstFailure:state.firstFailure,elapsedProcessMs:state.elapsedProcessMs,cleanup:state.cleanup,scope:state.scope,unrun:state.unrun,observedMaxMemory:state.observedMaxMemory}));
}
