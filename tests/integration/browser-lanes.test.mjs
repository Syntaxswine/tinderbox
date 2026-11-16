import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {createPageContextOwner,runIsolatedLanes,endpointStateSha256,scalarWorkload,assertScalarWorkload,fireComparisonMode} from '../../tools/review/browser-lanes.mjs';

function fixture({onPage=()=>{},failRoute=false}={}){
  const log=[],contexts=[];
  class Context extends EventEmitter{
    constructor(id){super();this.id=id;this.page={closed:false,isClosed:()=>this.page.closed};}
    async route(pattern,handler){this.routeHandler=handler;log.push('route'+this.id);assert.equal(pattern,'**/*');if(failRoute)throw Error('route failed');}
    async newPage(){log.push('page'+this.id);return this.page;}
    async close(){if(this.page.closed)return;log.push('close'+this.id);this.page.closed=true;this.emit('close');}
  }
  const browser={async newContext(options){assert.deepEqual(options,{viewport:{width:1280,height:800},deviceScaleFactor:1});const context=new Context(contexts.length+1);contexts.push(context);log.push('create'+context.id);return context;}};
  return {log,contexts,browser,Context,owner:createPageContextOwner({browser,origin:'http://127.0.0.1:3000',onPage})};
}

test('isolated lanes close each prior page/context before the next lane and only then permit report collection',async()=>{
  const f=fixture(),first=await f.owner.create(),order=['reference','candidate','candidate','reference'];
  const rows=await runIsolatedLanes(order,{first,create:f.owner.create,run:async({index,lane})=>{f.log.push('timing'+index);return {lane,index};}});f.log.push('report');
  assert.deepEqual(rows.map(r=>r.lane),order);
  assert.deepEqual(f.log,['create1','route1','page1','timing0','close1','create2','route2','page2','timing1','close2','create3','route3','page3','timing2','close3','create4','route4','page4','timing3','close4','report']);
  assert.deepEqual(f.owner.diagnostics(),{created:4,closed:4,remaining:0,pending:0,maxLive:1,stopping:false});await f.owner.closeAll();await assert.rejects(f.owner.create(),/closing/);
});

test('lane failure closes its context, prevents subsequent timing and keeps owned cleanup idempotent',async()=>{
  const f=fixture(),first=await f.owner.create();
  await assert.rejects(runIsolatedLanes(['reference','candidate','candidate'],{first,create:f.owner.create,run:async({index})=>{if(index===1)throw Error('lane failed');}}),/lane failed/);
  assert.equal(f.contexts.length,2);assert.ok(f.contexts.every(c=>c.page.isClosed()));await f.owner.closeAll();await f.owner.closeAll();assert.equal(f.owner.diagnostics().remaining,0);
});

test('next lane creation waits for asynchronous context shutdown, not just a close request',async()=>{
  const f=fixture(),first=await f.owner.create();let closingStarted,allowClose;
  const started=new Promise(resolve=>{closingStarted=resolve;}),gate=new Promise(resolve=>{allowClose=resolve;}),close=first.context.close.bind(first.context);
  first.context.close=async()=>{closingStarted();await gate;await close();};
  const sequence=runIsolatedLanes(['reference','candidate'],{first,create:f.owner.create,run:async()=>{}});await started;
  assert.equal(f.contexts.length,1);assert.equal(first.page.isClosed(),false);allowClose();await sequence;assert.equal(f.contexts.length,2);assert.equal(f.owner.diagnostics().maxLive,1);
});

test('route/page setup failures close newly owned contexts and the origin restriction remains intact',async()=>{
  const failed=fixture({failRoute:true});await assert.rejects(failed.owner.create(),/route failed/);assert.equal(failed.owner.diagnostics().remaining,0);
  const failedPage=fixture({onPage(){throw Error('page observer failed');}});await assert.rejects(failedPage.owner.create(),/page observer failed/);assert.equal(failedPage.owner.diagnostics().remaining,0);
  const f=fixture(),lease=await f.owner.create();let continued=0,aborted=0;
  for(const url of ['http://127.0.0.1:3000/tinderbox/','https://elsewhere.test/'])await f.contexts[0].routeHandler({request:()=>({url:()=>url}),continue:()=>continued++,abort:()=>aborted++});
  assert.deepEqual([continued,aborted],[1,1]);await lease.context.close();assert.equal(f.owner.diagnostics().remaining,0);await f.owner.closeAll();
});

test('shutdown includes a context whose creation was still pending and rejects its late page setup',async()=>{
  const f=fixture();let finishCreation;const pending=new Promise(resolve=>{finishCreation=resolve;}),context=new f.Context(1);
  const owner=createPageContextOwner({browser:{newContext:()=>pending},origin:'http://127.0.0.1:3000'}),creation=owner.create(),rejected=assert.rejects(creation,/closed during creation/),shutdown=owner.closeAll();
  finishCreation(context);await rejected;await shutdown;assert.ok(context.page.isClosed());assert.deepEqual(owner.diagnostics(),{created:1,closed:1,remaining:0,pending:0,maxLive:1,stopping:true});
});

test('cleanup attempts every context even if one close fails, allowing browser finally cleanup to release the rest',async()=>{
  const f=fixture(),one=await f.owner.create();await f.owner.create();one.context.close=async()=>{throw Error('close failed');};
  await assert.rejects(f.owner.closeAll(),/context cleanup failed/);assert.equal(f.contexts[1].page.isClosed(),true);assert.equal(f.owner.diagnostics().remaining,1);
  one.context.emit('close');assert.equal(f.owner.diagnostics().remaining,0);
});

test('endpoint digest matches original canonical JSON and Node SHA without mutating timing or state',async()=>{
  const base='http://127.0.0.1:3000/tinderbox/',snapshot={value:-0,array:[NaN,undefined,Infinity],asset:base+'assets/a.png',diagnostics:{thermal:{timing:{physicalPublicationMs:10},tick:780}}},before=structuredClone(snapshot);
  const copy={...snapshot,diagnostics:{...snapshot.diagnostics,thermal:{...snapshot.diagnostics.thermal}}};delete copy.diagnostics.thermal.timing;
  const expected=createHash('sha256').update(JSON.stringify(copy).split(base).join('<PACKAGE>/')).digest('hex');assert.equal(await endpointStateSha256({base,snapshot}),expected);assert.deepEqual(snapshot,before);
});

test('scalar checks preserve every row and reject clock, upload or workload drift while excluding timing noise',()=>{
  const row={window:'growing-later',generation:1,hostTick:1502,primary:true,nativeTick:721,worldTime:24.03333333333325,paused:false,dropped:0,drawCalls:237,geometries:337,textures:60,uploadCalls:8,uploadBytes:139720,sourceCount:616,positiveFlames:533,positiveRoofFlames:6,groundFlames:0,activeCharacters:[],artMs:9};
  assertScalarWorkload([{...row,artMs:20}],[row]);assert.ok(!Object.hasOwn(scalarWorkload(row),'artMs'));
  for(const key of ['nativeTick','uploadBytes','sourceCount'])assert.throws(()=>assertScalarWorkload([{...row,[key]:row[key]+1}],[row]),/Unchanged scalar/);
  assert.throws(()=>assertScalarWorkload([],[row]),/Unchanged scalar/);
});

test('quality-only selects exactly reference then candidate without a CPU comparison while existing orders stay unchanged',()=>{
  const quality=fireComparisonMode(['--quality-only']);assert.deepEqual(quality.order,['reference','candidate']);assert.equal(quality.qualityOnly,true);assert.equal(quality.compareCpu,false);assert.equal(quality.profileOnly,false);assert.equal(quality.isolatedTiming,false);
  for(const flags of [[],['--isolated-timing']]){const mode=fireComparisonMode(flags);assert.deepEqual(mode.order,['reference','candidate','candidate','reference']);assert.equal(mode.compareCpu,true);}
  const profile=fireComparisonMode(['--cpu-profile']);assert.deepEqual(profile.order,['candidate']);assert.equal(profile.compareCpu,false);
});

test('quality, isolated timing and CPU profile flags cannot be combined',()=>{
  for(const flags of [['--quality-only','--isolated-timing'],['--quality-only','--cpu-profile'],['--isolated-timing','--cpu-profile'],['--quality-only','--isolated-timing','--cpu-profile']])assert.throws(()=>fireComparisonMode(flags),/mutually exclusive/);
});
