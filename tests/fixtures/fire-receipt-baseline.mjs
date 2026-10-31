// Immutable pre-change engine proof, executed in one finite Node test process.
// No source rewriting. Only the two approved additive char keys are excluded. Git blobs remain read-only.
import vm from 'node:vm';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
import {createSimulation} from '../../src/simulation/index.js';import {createFireReviewSimulation,FIRE_REVIEW_SCENARIOS} from '../../tools/fire-realism/scenarios.js';
export const PRE_CHANGE='0a732ef91809699d9c33359e22016d5674525356';
const provenance=JSON.parse(fs.readFileSync('tests/fixtures/fire-receipt-prechange.json','utf8'));assert.equal(provenance.preChange,PRE_CHANGE);
const records=new Map(provenance.sources.map(source=>[source.path,source])),cache=new Map(),sources={},hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(records.size,provenance.sources.length);
const git=(...args)=>execFileSync('git',args,{windowsHide:true,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});
let pinnedGitAvailable=true;try{git('cat-file','-e',PRE_CHANGE+'^{commit}');}catch{pinnedGitAvailable=false;}
function load(file){
 if(cache.has(file))return cache.get(file);const record=records.get(file);assert.ok(record,'Unlisted pre-change dependency: '+file);
 const bytes=record.sourceBase64?Buffer.from(record.sourceBase64,'base64'):git('show','HEAD:'+file);
 assert.equal(bytes.length,record.bytes);assert.equal(hash(bytes),record.sha256,'HEAD dependency no longer matches frozen pre-change bytes: '+file);
 if(pinnedGitAvailable){assert.ok(bytes.equals(git('show',PRE_CHANGE+':'+file)));assert.equal(git('rev-parse',PRE_CHANGE+':'+file).toString().trim(),record.gitBlob);}
 sources[file]=hash(bytes);const module=new vm.SourceTextModule(bytes.toString(),{identifier:file,initializeImportMeta(meta){meta.url=pathToFileURL(path.resolve(file)).href;}});cache.set(file,module);return module;
}
async function namespace(file){const module=load(file);if(module.status==='unlinked')await module.link((specifier,parent)=>{assert.ok(specifier.startsWith('.'));return load(path.posix.normalize(path.posix.join(path.posix.dirname(parent.identifier),specifier)));});if(module.status==='linked')await module.evaluate();return module.namespace;}
const oldReview=await namespace('tools/fire-realism/scenarios.js'),oldEngine=await namespace('src/simulation/index.js'),report={preChange:PRE_CHANGE,status:'running',comparedExactFullSnapshots:0,comparedExactReceiptProjections:0,scenarios:[],lifecycleEvents:[],sourceHashes:sources,pinnedGitAvailable,portableFrozenFixture:true};
const withoutCharEvidence=snapshot=>({...snapshot,cells:snapshot.cells.map(cell=>{assert.ok(Object.hasOwn(cell,'initialSurfaceFuel')&&Object.hasOwn(cell,'consumedDepositedFuel'));const {initialSurfaceFuel,consumedDepositedFuel,...original}=cell;return original;})});
const expectedReceipt=snapshot=>({kind:'simulation-event-receipt',version:1,tick:snapshot.tick,paused:snapshot.paused,clocks:snapshot.clocks,diagnostics:{generation:snapshot.diagnostics.generation},events:snapshot.events});
for(const scenario of FIRE_REVIEW_SCENARIOS){
 const old=oldReview.createFireReviewSimulation({scenario}),full=createFireReviewSimulation({scenario}),narrow=createFireReviewSimulation({scenario});
 try{for(let frame=0;frame<120;frame++){const expected=old.advance(),actual=full.advance(),receipt=narrow.advanceReceiptStep();assert.deepEqual(withoutCharEvidence(actual),expected,scenario+' unchanged advance at '+frame);assert.deepEqual(withoutCharEvidence(narrow.snapshot()),expected,scenario+' receipt endpoint at '+frame);assert.deepEqual(receipt,expectedReceipt(expected),scenario+' exact narrow receipt at '+frame);report.comparedExactFullSnapshots+=2;report.comparedExactReceiptProjections++;}assert.equal(old.frameIndex,full.frameIndex);assert.equal(old.frameIndex,narrow.frameIndex);report.scenarios.push(scenario);}finally{old.dispose();full.dispose();narrow.dispose();}
}
const plain={id:'receipt-lifecycle',width:12,height:8,player:{x:2.25,y:4.25,tool:'torch',inventory:{torchFuel:.012}},patches:[{x:0,y:0,width:12,depth:8,material:'grass'}],obstacles:[],actors:[]};
const config={events:{capacity:32},drugs:{duration:.1},fire:{damagePerSecond:0}},options={scenario:plain,config},old=oldEngine.createSimulation(options),full=createSimulation(options),narrow=createSimulation(options),events=new Map();
function commands(frame){const result=[];if([0,92].includes(frame))result.push({type:'primary',pressed:true});if([1,16,21,91,93].includes(frame))result.push({type:'primary',pressed:false});if([1,100].includes(frame))result.push({type:'drug',drug:'powder'});if(frame===3)result.push({type:'pause',paused:true});if(frame===7)result.push({type:'pause',paused:false});if([15,90].includes(frame))result.push({type:'reset'});if(frame===20)result.push({type:'select-tool',tool:'molotov'},{type:'aim',x:6.25,y:4.25},{type:'primary',pressed:true});if(frame>=40&&frame<80)result.push({type:'pause',paused:frame%2===0});return result;}
try{for(let frame=0;frame<180;frame++){for(const command of commands(frame))for(const sim of [old,full,narrow])assert.equal(sim.dispatch(command),true);const expected=old.advance(1/60),actual=full.advance(1/60),receipt=narrow.advanceReceiptStep();assert.deepEqual(withoutCharEvidence(actual),expected,'old full lifecycle '+frame);assert.deepEqual(withoutCharEvidence(narrow.snapshot()),expected,'old receipt lifecycle '+frame);assert.deepEqual(receipt,expectedReceipt(expected));for(const event of receipt.events)events.set(event.id,event.type);report.comparedExactFullSnapshots+=2;report.comparedExactReceiptProjections++;}report.lifecycleEvents=[...new Set(events.values())];assert.ok(report.lifecycleEvents.includes('torch-spent'));assert.ok(report.lifecycleEvents.includes('drug-expired'));assert.ok(report.lifecycleEvents.includes('reset'));assert.ok(report.lifecycleEvents.includes('molotov-impact'));}finally{old.dispose();full.dispose();narrow.dispose();}
for(const config of [undefined,{step:1/50,maxCatchUp:.16}]){
 const opts={scenario:'chain',config},old=oldEngine.createSimulation(opts),current=createSimulation(opts),narrow=createSimulation(opts);try{
  const scheduled=[{type:'aim',x:6,y:4},{type:'primary',pressed:true}];for(const command of scheduled)for(const sim of [old,current,narrow])sim.dispatch(command);
  for(const delta of [0,1/120,1/120,.017,.5,.001,0,.037,.02]){const expected=old.advance(delta);assert.deepEqual(withoutCharEvidence(current.advance(delta)),expected,'unchanged production advance exact bookkeeping');assert.deepEqual(withoutCharEvidence(narrow.advance(delta)),expected);report.comparedExactFullSnapshots+=2;}
  const step=config?.step??1/60;for(let i=0;i<45;i++){const expected=old.advance(step);assert.deepEqual(withoutCharEvidence(current.advance(step)),expected);assert.deepEqual(narrow.advanceReceiptStep(),expectedReceipt(expected));assert.deepEqual(withoutCharEvidence(narrow.snapshot()),expected);report.comparedExactFullSnapshots+=2;report.comparedExactReceiptProjections++;}
  assert.ok(current.snapshot().events.some(event=>event.type==='barrel-explosion'));
 }finally{old.dispose();current.dispose();narrow.dispose();}
}
// Additional char regression: exact full snapshots through accepted movement,
// pouring, drug clocks, pause, spent-cell re-ignition and a fresh reset.
const charOptions={scenario:{id:'char-full-replay',width:10,height:6,player:{x:1.25,y:2.25,tool:'jerry-can'},obstacles:[],actors:[{id:'walker',x:8,y:4,speed:.4,route:[{x:8,y:4},{x:8,y:2}]}],
 fuelLines:[{from:{x:4.1,y:2.25},to:{x:4.4,y:2.25},litresPerMetre:.08}],ignitions:[{x:4.25,y:2.25,heat:3,radius:.001}]},config:{input:{cameraRelative:false},fire:{damagePerSecond:0}}};
const charOld=oldEngine.createSimulation(charOptions),charNow=createSimulation(charOptions),charEvents=new Map();
function charCommands(frame){const list=[];
 if(frame===0)list.push({type:'primary',pressed:true},{type:'move',x:1,y:0});
 if(frame===1)list.push({type:'primary',pressed:false});
 if(frame===20)list.push({type:'primary',pressed:true},{type:'move',x:-1,y:0});
 if(frame===21)list.push({type:'primary',pressed:false});
 if(frame===40)list.push({type:'move',x:0,y:0});
 if(frame===200)list.push({type:'select-tool',tool:'molotov'},{type:'aim',x:4.25,y:2.25},{type:'primary',pressed:true});
 if(frame===201)list.push({type:'primary',pressed:false});
 if(frame===260)list.push({type:'drug',drug:'powder'});
 if(frame===280)list.push({type:'pause',paused:true});
 if(frame===300)list.push({type:'pause',paused:false});
 if(frame===440)list.push({type:'reset'});
 return list;
}
try{for(let frame=0;frame<500;frame++){
 for(const command of charCommands(frame))for(const sim of [charOld,charNow])assert.equal(sim.dispatch(command),true);
 const expected=charOld.advance(1/60),actual=charNow.advance(1/60);assert.deepEqual(withoutCharEvidence(actual),expected,'char immutable full replay '+frame);report.comparedExactFullSnapshots++;
 for(const event of actual.events)charEvents.set(event.id,event);
 const gas=actual.cells.reduce((sum,c)=>sum+c.consumedDepositedFuel,0);assert.ok(Math.abs(gas-actual.diagnostics.fuel.burnedDepositedFuel)<2e-12);
}
const all=[...charEvents.values()],burnout=all.find(e=>e.type==='burnout'&&e.cellId==='cell:8,4');assert.ok(burnout,'Original target actually burns out');assert.ok(all.some(e=>e.type==='ignition'&&e.cellId===burnout.cellId&&e.tick>burnout.tick),'Actual spent target re-ignites after Molotov');
for(const kind of ['pour','molotov-impact','drug','pause','reset'])assert.ok(all.some(e=>e.type===kind),kind+' must be exercised');report.charReplay={frames:500,events:[...new Set(all.map(e=>e.type))],reignitedCell:burnout.cellId};
}finally{charOld.dispose();charNow.dispose();}
assert.equal(cache.size,records.size,'Frozen source graph must be complete and have no unused records');report.currentEngineSha256=hash(fs.readFileSync('src/simulation/index.js'));report.excludedCellKeys=['initialSurfaceFuel','consumedDepositedFuel'];report.status='pass';console.log(JSON.stringify(report));
