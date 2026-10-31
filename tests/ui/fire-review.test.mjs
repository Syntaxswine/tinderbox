import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {MODES,SCENARIOS,RUBRIC,evidenceLabel,metricText,measurementRows,safeUrl,localAsset,reviewRecord,photoReferences,bindReviewDriver,createCanvasMotionRecorder,createMotionClipReader,MAX_RETAINED_MOTION_BYTES,createTimingReportEvidence,MAX_TIMING_REPORT_BYTES} from '../../workbenches/fire-realism/review.js';
const base='http://localhost:4552/nested/fire-ui/workbenches/fire-realism/index.html';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function state(){return {version:1,phase:'ready',configuration:{mode:'current',scenario:'match-contact',view:'isometric',lighting:'bright',population:null,seed:1893,characterId:'bear',viewport:{width:1280,height:800,pixelRatio:1}},frameIndex:45,tick:45,worldTime:.75,playerTime:.75,
  availability:Object.fromEntries(MODES.map(m=>[m.id,{available:m.id!=='optimized',reason:m.id==='optimized'?'Not delivered':null,sourceCommit:'test-fixture'}])),capabilities:{gpuTimer:{available:true},populations:[]},referenceAcceptance:'missing',workload:{actualBurningCells:4},diagnostics:{sourceFingerprints:{publishedControl:'test-fixture'}},results:null};}
async function fixture(options={}){
  let current={...state(),...options.initialState},observer;let reportClears=0;const calls=[],updates=[],downloads=[],shell={renderRoot:{id:'canvas-slot',...options.renderRoot},uiRoot:{id:'hud-slot'},clearMotionEvidence:()=>calls.push(['clear-motion-evidence']),clearReportEvidence:()=>{reportClears++;},update:s=>updates.push(structuredClone(s))};
  const driver={state:()=>structuredClone(current),configure:async patch=>{calls.push(['configure',patch]);current={...current,configuration:{...current.configuration,...patch,viewport:{...current.configuration.viewport,...patch.viewport}},frameIndex:0};return driver.state();},
    play:()=>{calls.push(['play']);current.phase='playing';},pause:()=>{calls.push(['pause']);current.phase='ready';},reset:async()=>{calls.push(['reset']);current.frameIndex=0;},step:async n=>{calls.push(['step',n]);current.frameIndex+=n;},seek:async n=>{calls.push(['seek',n]);current.frameIndex=n;},
    measure:async options=>{calls.push(['measure',options]);return current.results;},cancelMeasurement:async()=>{calls.push(['cancel']);},captureFrame:()=>({mimeType:'image/jpeg',dataUrl:'data:image/jpeg;base64,dGVzdA==',frameIndex:current.frameIndex,tick:current.tick,configuration:structuredClone(current.configuration),sourceFingerprints:current.diagnostics.sourceFingerprints,hardware:{renderer:'DOM test fixture only'}}),dispose:async()=>calls.push(['dispose'])};
  Object.assign(driver,options.methods||{});
  const mountUI=()=>{},delivery={byMode:{reference:{sourceCommit:'R'}}},receipt={kind:'fixture-only'};
  const binding=await bindReviewDriver({shell,createDriver:async config=>{calls.push(['create',config.root.id,config.uiRoot.id]);assert.equal(config.mountUI,mountUI);assert.equal(config.artistDelivery,delivery);assert.equal(config.referenceAcceptance,receipt);observer=config.onChange;return driver;},mountUI,artistDelivery:delivery,referenceAcceptance:receipt,onDownload:(...args)=>downloads.push(args),references:[{id:'fixture',label:'Fixture'}],...(options.createMotionRecorder?{createMotionRecorder:options.createMotionRecorder}:{}),...(options.FileReaderCtor?{FileReaderCtor:options.FileReaderCtor}:{}),...(options.signal?{signal:options.signal}:{}),...(options.cryptoApi?{cryptoApi:options.cryptoApi}:{}),...(options.createReportEvidence?{createReportEvidence:options.createReportEvidence}:{})});
  return {binding,calls,updates,downloads,driver,reportClears:()=>reportClears,emit:patch=>{current={...current,...patch};observer(driver.state());}};
}
test('Review includes the driver modes, real powder scenario and six critique categories',()=>{
  assert.deepEqual(MODES.map(m=>m.id),['current','reference','optimized','no-fire']);assert.ok(SCENARIOS.some(s=>s.id==='gasoline-front-powder'));assert.equal(RUBRIC.length,6);
});
test('Missing, cancelled and inconclusive evidence never becomes zero or accepted timing',()=>{
  assert.equal(evidenceLabel('cancelled'),'Cancelled');assert.equal(evidenceLabel('inconclusive'),'Inconclusive');
  for(const value of [undefined,null,'unknown'])assert.equal(evidenceLabel(value),'Unavailable');
  for(const value of [null,NaN,Infinity,-1])assert.equal(metricText({state:'measured',value}),'Inconclusive');
  assert.equal(metricText({state:'measured',value:0,unit:'ms'}),'0 ms');assert.equal(metricText({state:'inconclusive',value:1,unit:'ms'}),'Inconclusive');
});
test('Report presentation forwards supplied medians, p95, variance and ratio without deriving acceptance',()=>{
  const report={status:'complete',gpu:{absoluteSceneMs:{reference:{median:10,p95:12,variance:3}},incrementalFireMs:{reference:{median:4}}},comparison:{optimizedReferenceRatio:.28,targetMet:null}};
  const rows=measurementRows(report);assert.equal(rows.find(r=>r.label.includes('incremental')).value,4);assert.equal(rows.find(r=>r.label.includes('p95')).value,12);assert.equal(rows.find(r=>r.label.includes('variance')).value,3);assert.equal(rows.at(-1).value,.28);
  assert.equal(report.comparison.targetMet,null);report.status='inconclusive';assert.ok(measurementRows(report).every(r=>metricText(r)==='Inconclusive'));
});
test('Executable links and remote evidence assets are rejected',()=>{
  for(const value of ['javascript:alert(1)','data:text/html,hi','file:///C:/private','',null])assert.equal(safeUrl(value,base),null);
  assert.equal(localAsset('https://example.org/photo.jpg',base),null);assert.equal(localAsset('../../art/source/a.jpg',base),'http://localhost:4552/nested/fire-ui/art/source/a.jpg');
});
test('Reviewed reference dossier retains original plates and verifies every listed source',()=>{
  const dossier=JSON.parse(fs.readFileSync('art/source/fire-realism/references.json','utf8')),refs=photoReferences(dossier);
  const originals=[['nara-6349328','nara-6349328-original.jpeg'],['dvids-8746603','dvids-8746603-color.jpg'],['dvids-9535915','dvids-building-9535915.jpg'],['dvids-9219073','dvids-room-fire-2000w.jpg']];
  assert.equal(refs.length,dossier.references.length);assert.equal(new Set(refs.map(r=>r.id)).size,refs.length,'Reference IDs must be unique');
  for(const [id,file]of originals){const ref=refs.find(r=>r.id===id);assert.ok(ref,'Original reference missing: '+id);assert.equal(ref.metadata.path,'art/source/fire-realism/references/'+file);assert.equal(ref.asset,'../../'+ref.metadata.path);}
  for(const [i,ref]of refs.entries()){assert.equal(ref.verified,true);assert.ok(ref.rightsBasis);assert.ok(ref.rights);assert.ok(localAsset(ref.asset,base),'Reference must use a local verified asset');assert.deepEqual(ref.metadata,{...dossier.references[i],rightsPolicy:dossier.policyURL??null});const bytes=fs.readFileSync(dossier.references[i].path);assert.equal(bytes.length,ref.metadata.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),ref.metadata.sha256);}
  assert.ok(refs.find(r=>r.id==='nara-6349328').limitations.some(s=>s.includes('exact day precision not established')));
  assert.ok(refs.find(r=>r.id==='dvids-9535915').limitations.some(s=>s.includes('Conflict retained')));
  assert.ok(refs.find(r=>r.id==='dvids-9219073').limitations.some(s=>s.includes('not flame-shape evidence')));
  assert.ok(refs.find(r=>r.id==='dvids-8746603').limitations.some(s=>s.includes('Largest original not acquired')));
});
test('The actual local fire source bytes satisfy the strict driver manifest, including Windows delivery',()=>{
  const manifest=JSON.parse(fs.readFileSync('assets/art/fire-realism/manifest.json','utf8'));
  for(const record of manifest.runtimeFiles){const bytes=fs.readFileSync(record.path);assert.equal(bytes.length,record.bytes,record.path+' byte count');assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,record.path+' raw SHA-256');}
});
test('Critique captures detached authoritative context and grants no acceptance',()=>{
  const original=state();original.recording={lastResult:{status:'complete',start:{tick:45},end:{tick:90}}};const notes={shape:'Observed contact gaps'},record=reviewRecord(original,notes,'2026-10-30T00:00:00Z');original.configuration.seed=99;original.recording.lastResult.end.tick=100;notes.shape='Changed';
  assert.equal(record.context.configuration.seed,1893);assert.equal(record.context.motionEvidence.end.tick,90);assert.equal(record.notes.shape,'Observed contact gaps');assert.equal(record.context.workload.actualBurningCells,4);assert.match(record.acceptance,/do not approve/);
});
test('Binding passes actual render/HUD roots, delivery and receipt to the driver',async()=>{
  const f=await fixture();assert.deepEqual(f.calls[0],['create','canvas-slot','hud-slot']);assert.equal(f.updates.at(-1).connected,true);assert.equal(f.updates.at(-1).references[0].id,'fixture');await f.binding.dispose();
});
test('Play, pause, step, seek and reset call public methods without UI clock updates',async()=>{
  const f=await fixture();for(const command of [{type:'play'},{type:'pause'},{type:'step'},{type:'seek',frame:120},{type:'reset'}])await f.binding.intent(command);
  assert.deepEqual(f.calls.slice(1),[['play'],['pause'],['step',1],['seek',120],['clear-motion-evidence'],['reset']]);assert.equal(f.updates.at(-1).worldTime,.75);await f.binding.dispose();
});
test('Mode, view and lighting changes replay the same authoritative frame',async()=>{
  const f=await fixture();await f.binding.intent({type:'configure',patch:{mode:'reference'}});assert.deepEqual(f.calls.slice(1),[['configure',{mode:'reference'}],['seek',45]]);await f.binding.dispose();
});
test('Powder forwards a real scenario and clears unsupported population, without UI multipliers',async()=>{
  const f=await fixture();await f.binding.intent({type:'configure-choice',key:'scenario',value:'gasoline-front-powder'});
  assert.deepEqual(f.calls.slice(1),[['configure',{scenario:'gasoline-front-powder',population:null}]]);assert.equal(f.updates.at(-1).worldTime,.75);await f.binding.dispose();
});
test('Canvas preset and DPR are driver configuration, not renderer changes in the shell',async()=>{
  const f=await fixture();await f.binding.intent({type:'configure-choice',key:'viewport',value:'phone'});await f.binding.intent({type:'configure-number',key:'pixelRatio',value:1.5});
  assert.deepEqual(f.calls[1],['configure',{viewport:{width:390,height:844}}]);assert.deepEqual(f.calls[3],['configure',{viewport:{pixelRatio:1.5}}]);await f.binding.dispose();
});
test('Cancellation reaches the driver before its unresolved measurement completes',async()=>{
  const pending=deferred(),f=await fixture({methods:{measure:()=>pending.promise,cancelMeasurement:async()=>{f.calls.push(['cancel-before-resolution']);pending.resolve({status:'cancelled'});}}});
  const measuring=f.binding.intent({type:'measure',modes:['current','reference']});await Promise.resolve();await f.binding.intent({type:'cancel'});const report=await measuring;
  assert.equal(report.status,'cancelled');assert.deepEqual(f.calls.at(-1),['cancel-before-resolution']);await f.binding.dispose();
});
test('Each explicit capture download exports one file, with exact paired source/hardware metadata',async()=>{
  const f=await fixture(),capture=await f.binding.intent({type:'capture'});await f.binding.intent({type:'save-capture',id:capture.id});
  assert.equal(f.downloads.length,1);assert.equal(f.downloads[0][2],'image/jpeg');await f.binding.intent({type:'save-capture-metadata',id:capture.id});assert.equal(f.downloads.length,2);assert.equal(f.downloads[1][2],'application/json');assert.equal(f.downloads[1][0].sourceFingerprints.publishedControl,'test-fixture');assert.equal(f.downloads[1][0].hardware.renderer,'DOM test fixture only');assert.equal(f.downloads[1][0].dataUrl,undefined);
  f.driver.captureFrame=()=>({mimeType:'image/jpeg',dataUrl:'https://example.org/fake.jpg'});await assert.rejects(f.binding.intent({type:'capture'}),/actual JPEG/);await f.binding.dispose();
});
test('WebGL failure leaves an explicit unavailable shell and the references usable',async()=>{
  const updates=[],binding=await bindReviewDriver({shell:{renderRoot:{},uiRoot:{},update:s=>updates.push(s)},references:[{id:'verified'}],createDriver:async()=>{throw Error('WebGL disabled');}});
  assert.equal(updates.at(-1).connected,false);assert.match(updates.at(-1).reason,/WebGL disabled/);assert.equal(updates.at(-1).references[0].id,'verified');await assert.rejects(binding.intent({type:'play'}),/unavailable/);await binding.dispose();
});
test('Disposal retires the driver once and ignores late state notifications',async()=>{
  const f=await fixture();await f.binding.dispose();const count=f.updates.length;f.emit({phase:'playing'});await f.binding.dispose();assert.equal(f.updates.length,count);assert.equal(f.calls.filter(c=>c[0]==='dispose').length,1);await assert.rejects(f.binding.intent({type:'play'}),/unavailable/);
});
test('Review code contains no renderer, query, simulated clock or approval implementation',()=>{
  const source=fs.readFileSync('workbenches/fire-realism/review.js','utf8');assert.doesNotMatch(source,/new (?:THREE\.)?WebGLRenderer|createQuery|beginQuery|requestAnimationFrame|worldTime\s*[+*]=|targetMet\s*=(?!=)/);
  assert.match(source,/import\('\.\/driver\.js'\)/);assert.doesNotMatch(source,/Private review workbench/);
});

// Encoder fixtures verify owned-stream lifecycle only; these are not real motion or GPU evidence.
function encoderFixture({silentStop=false,startFailure=false,constructorFailure=false}={}){
  const tracks=[{stops:0,stop(){this.stops++;}},{stops:0,stop(){this.stops++;}}],timers=new Map(),listeners=new Map();let nextId=0,clock=0,instance;
  class Recorder extends EventTarget{
    static isTypeSupported(type){return type==='video/webm;codecs=vp8';}
    constructor(stream,options){super();if(constructorFailure)throw Error('Encoder constructor failed');instance=this;this.stream=stream;this.mimeType=options?.mimeType||'video/webm';this.state='inactive';}
    addEventListener(type,handler){super.addEventListener(type,handler);listeners.set(type,handler);}
    removeEventListener(type,handler){super.removeEventListener(type,handler);listeners.delete(type);}
    start(){if(startFailure)throw Error('Encoder start failed');this.state='recording';}
    data(value=new Blob(['encoded fixture bytes'])){const event=new Event('dataavailable');Object.defineProperty(event,'data',{value});this.dispatchEvent(event);}
    stop(){this.state='inactive';if(!silentStop){this.data();this.dispatchEvent(new Event('stop'));}}
  }
  const canvas={width:1280,height:800,captureStream:fps=>{assert.equal(fps,60);return {getTracks:()=>tracks};}};
  const options={canvas,MediaRecorderCtor:Recorder,schedule:(fn,ms)=>{const id=++nextId;timers.set(id,{fn,ms});return id;},cancelSchedule:id=>timers.delete(id),now:()=>clock};
  return {options,tracks,timers,listeners,get recorder(){return instance;},advance(ms){clock+=ms;},run(ms,actualElapsed=ms){const entry=[...timers.entries()].find(([,t])=>t.ms===ms);assert.ok(entry,'Missing timer '+ms);clock+=actualElapsed;timers.delete(entry[0]);entry[1].fn();}};
}
test('Actual-canvas nominal timer requests stop and retires tracks, timers and listeners',async()=>{
  const f=encoderFixture(),capture=createCanvasMotionRecorder(f.options);f.run(10000);const result=await capture.finished;
  assert.equal(result.status,'complete');assert.equal(result.wallDurationMs,10000);assert.equal(result.canvas.width,1280);assert.ok(result.blob.size>0);assert.equal(result.mimeType,'video/webm;codecs=vp8');
  assert.ok(f.tracks.every(t=>t.stops===1));assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);await capture.dispose();assert.ok(f.tracks.every(t=>t.stops===1));
});
test('Discard and disposal produce no video and always stop owned tracks once',async()=>{
  for(const reason of ['cancelled','disposed']){const f=encoderFixture(),capture=createCanvasMotionRecorder(f.options);const result=await capture.stop(reason);assert.equal(result.status,'cancelled');assert.equal(result.blob,null);assert.ok(f.tracks.every(t=>t.stops===1));assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);}
});
test('Encoder constructor/start errors clean all acquired tracks and listeners',()=>{
  for(const settings of [{constructorFailure:true},{startFailure:true}]){const f=encoderFixture(settings);assert.throws(()=>createCanvasMotionRecorder(f.options),/failed/);assert.ok(f.tracks.every(t=>t.stops===1));assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);}
});
test('A missing stop event times out honestly while tracks stop immediately',async()=>{
  const f=encoderFixture({silentStop:true}),capture=createCanvasMotionRecorder(f.options),pending=capture.stop();assert.ok(f.tracks.every(t=>t.stops===1));f.run(5000);const result=await pending;assert.equal(result.status,'unavailable');assert.match(result.reason,/did not finish/);assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);
});
test('Encoder failure or oversized data cannot export a seemingly valid video',async()=>{
  for(const oversized of [false,true]){const f=encoderFixture(),capture=createCanvasMotionRecorder(f.options);if(oversized)f.recorder.data({size:65*1024*1024});else{const event=new Event('error');Object.defineProperty(event,'error',{value:Error('Encoder lost')});f.recorder.dispatchEvent(event);}const result=await capture.finished;assert.equal(result.status,'unavailable');assert.equal(result.blob,null);assert.ok(f.tracks.every(t=>t.stops===1));assert.equal(f.listeners.size,0);}
});
test('Unavailable capture features and excessive durations fail before acquiring a stream',()=>{
  assert.throws(()=>createCanvasMotionRecorder({}),/unavailable/);let acquired=false;assert.throws(()=>createCanvasMotionRecorder({canvas:{captureStream(){acquired=true;}},MediaRecorderCtor:class{},maxDurationMs:11000}),/ten seconds/);assert.equal(acquired,false);
});
function clipReaderFixture({deferredRead=false}={}){
  const readers=[];
  class Reader extends EventTarget{
    constructor(){super();this.listeners=new Map();this.aborts=0;this.readyState=0;readers.push(this);}
    addEventListener(type,handler){super.addEventListener(type,handler);this.listeners.set(type,handler);}
    removeEventListener(type,handler){super.removeEventListener(type,handler);this.listeners.delete(type);}
    readAsDataURL(blob){this.blob=blob;this.readyState=1;if(!deferredRead)void this.complete();}
    async complete(){const bytes=await this.blob.arrayBuffer();if(this.readyState!==1)return;this.result='data:'+this.blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.readyState=2;this.dispatchEvent(new Event('load'));}
    abort(){this.aborts++;this.readyState=2;this.dispatchEvent(new Event('abort'));}
  }
  return {FileReaderCtor:Reader,readers};
}
async function motionBindingFixture(initialState,options={}){
  const doc=new EventTarget();doc.defaultView={MediaRecorder:class{}};doc.hidden=false;const canvas={captureStream(){},width:1280,height:800},reader=clipReaderFixture(options);let controls;
  const f=await fixture({initialState,signal:options.signal,methods:options.methods,FileReaderCtor:reader.FileReaderCtor,renderRoot:{ownerDocument:doc,querySelector:selector=>selector==='canvas'?canvas:null},createMotionRecorder:settings=>{const pending=deferred();controls=settings;return {finished:pending.promise,stop:async reason=>{settings.onStopping(reason);pending.resolve({status:reason==='cancelled'?'cancelled':'complete',reason,mimeType:'video/webm',blob:new Blob(['fixture'],{type:'video/webm'}),bytes:7,wallDurationMs:10153,maximumDurationMs:10000,nominalStopAfterMs:10000,stopRequestedAfterMs:10028,schedulingOverrunMs:28,encoderDrainMs:125,wallOverrunMs:153,requestedCaptureFps:60,canvas:{width:1280,height:800}});return pending.promise;},dispose:async()=>{settings.onStopping('disposed');pending.resolve({status:'cancelled',reason:'disposed'});return pending.promise;}};}});
  return {...f,doc,readers:reader.readers,controls:()=>controls};
}

test('Live motion uses public play/pause, reports source/start/end clocks and blocks GPU measurement',async()=>{
  const f=await motionBindingFixture();await f.binding.intent({type:'record'});assert.equal(f.updates.at(-1).recording.active,true);await assert.rejects(f.binding.intent({type:'measure',modes:['current','reference']}),/Stop or discard/);
  f.emit({frameIndex:90,tick:90,worldTime:1.5,playerTime:1.5});const metadata=await f.binding.intent({type:'stop-record'});assert.equal(metadata.status,'complete');assert.equal(metadata.start.frameIndex,45);assert.equal(metadata.end.frameIndex,90);assert.equal(metadata.start.worldTime,.75);assert.equal(metadata.end.worldTime,1.5);assert.equal(metadata.sourceFingerprints.publishedControl,'test-fixture');assert.equal(f.downloads.length,0,'Completion must not download');const clip=f.updates.at(-1).recording.clip;assert.deepEqual(Buffer.from(clip.href.split(',')[1],'base64'),Buffer.from('fixture'));assert.equal(clip.bytes,7);assert.equal(clip.name,'tinderbox-current-match-contact-motion-45-90.webm');assert.equal(metadata.recording.wallDurationMs,10153);assert.equal(metadata.recording.schedulingOverrunMs,28);assert.equal(metadata.recording.encoderDrainMs,125);assert.equal(metadata.recording.wallOverrunMs,153);assert.equal(f.updates.at(-1).recording.active,false);assert.equal(f.readers[0].listeners.size,0);await f.binding.intent({type:'motion-metadata'});assert.equal(f.downloads.length,1);assert.equal(f.downloads[0][2],'application/json');assert.equal(f.downloads[0][0].end.tick,90);await f.binding.dispose();
});
test('A paused still, measurement run, discard or hidden tab cannot claim valid motion',async()=>{
  const still=await motionBindingFixture();await still.binding.intent({type:'record'});const result=await still.binding.intent({type:'stop-record'});assert.equal(result.status,'inconclusive');assert.match(result.reason,/No authoritative live time/);assert.equal(still.downloads.length,0);await still.binding.dispose();
  const measuring=await motionBindingFixture({phase:'measuring'});await assert.rejects(measuring.binding.intent({type:'record'}),/outside measurement/);assert.equal(measuring.controls(),undefined);await measuring.binding.dispose();
  const hidden=await motionBindingFixture();await hidden.binding.intent({type:'record'});hidden.doc.hidden=true;hidden.doc.dispatchEvent(new Event('visibilitychange'));for(let i=0;i<8;i++)await Promise.resolve();assert.equal(hidden.updates.at(-1).recording.lastResult.status,'cancelled');assert.equal(hidden.downloads.length,0);await hidden.binding.dispose();
});
test('Concurrent disposal calls await the same owned recording cleanup and suppress downloads',async()=>{
  const f=await motionBindingFixture();await f.binding.intent({type:'record'});const a=f.binding.dispose(),b=f.binding.dispose();assert.equal(a,b);await Promise.all([a,b]);assert.equal(f.downloads.length,0);assert.equal(f.calls.filter(c=>c[0]==='dispose').length,1);
});


test('Actual recorder reports timer scheduling overrun separately from encoder drain',async()=>{
  const f=encoderFixture({silentStop:true}),capture=createCanvasMotionRecorder(f.options);f.run(10000,10028);f.advance(125);f.recorder.data();f.recorder.dispatchEvent(new Event('stop'));const result=await capture.finished;
  assert.equal(result.nominalStopAfterMs,10000);assert.equal(result.stopRequestedAfterMs,10028);assert.equal(result.schedulingOverrunMs,28);assert.equal(result.encoderDrainMs,125);assert.equal(result.wallDurationMs,10153);assert.equal(result.wallOverrunMs,153);assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);
});
test('Retained video data URL encodes exact actual Blob bytes and cleans the owned reader',async()=>{
  const f=clipReaderFixture(),bytes=Buffer.from([0,255,17,4,8]),reader=createMotionClipReader({blob:new Blob([bytes],{type:'video/webm'}),FileReaderCtor:f.FileReaderCtor}),clip=await reader.finished;
  assert.equal(clip.bytes,bytes.length);assert.equal(clip.mimeType,'video/webm');assert.deepEqual(Buffer.from(clip.href.split(',')[1],'base64'),bytes);assert.equal(f.readers[0].listeners.size,0);reader.dispose();assert.equal(f.readers[0].aborts,0);
  assert.throws(()=>createMotionClipReader({blob:new Blob([new Uint8Array(MAX_RETAINED_MOTION_BYTES+1)],{type:'video/webm'}),FileReaderCtor:f.FileReaderCtor}),/16 MiB/);assert.equal(f.readers.length,1,'Oversized bytes acquired a reader');
  const wrong=createMotionClipReader({blob:new Blob(['not video'],{type:'text/plain'}),FileReaderCtor:f.FileReaderCtor});await assert.rejects(wrong.finished,/bounded video/);assert.equal(f.readers[1].listeners.size,0);
});
test('Cancelling a pending clip reader aborts once and removes every reader listener',async()=>{
  const f=clipReaderFixture({deferredRead:true}),reader=createMotionClipReader({blob:new Blob(['bytes'],{type:'video/webm'}),FileReaderCtor:f.FileReaderCtor});reader.dispose();reader.dispose();await assert.rejects(reader.finished,{name:'AbortError'});await f.readers[0].complete();assert.equal(f.readers[0].aborts,1);assert.equal(f.readers[0].listeners.size,0);
});
test('Replacement and reset retire the prior retained video without automatic downloads',async()=>{
  const f=await motionBindingFixture();await f.binding.intent({type:'record'});f.emit({frameIndex:90,tick:90,worldTime:1.5});await f.binding.intent({type:'stop-record'});const first=f.updates.at(-1).recording.clip;
  await f.binding.intent({type:'record'});assert.equal(f.updates.at(-1).recording.clip,null);f.emit({frameIndex:135,tick:135,worldTime:2.25});await f.binding.intent({type:'stop-record'});const second=f.updates.at(-1).recording.clip;assert.notEqual(second.id,first.id);assert.equal(f.downloads.length,0);
  await f.binding.intent({type:'reset'});assert.equal(f.updates.at(-1).recording.clip,null);assert.equal(f.updates.at(-1).recording.lastResult,null);assert.ok(f.calls.filter(c=>c[0]==='clear-motion-evidence').length>=3);await f.binding.dispose();
});
test('Measurement publishes preview lock before entering the driver and restores it afterward',async()=>{
  const f=await motionBindingFixture(),pending=deferred();f.driver.measure=()=>{assert.equal(f.updates.at(-1).reviewEvidenceLocked,true);return pending.promise;};const work=f.binding.intent({type:'measure',modes:['current','reference']});assert.equal(f.updates.at(-1).reviewEvidenceLocked,true);pending.resolve({status:'unavailable'});await work;assert.equal(f.updates.at(-1).reviewEvidenceLocked,false);await f.binding.dispose();
});
test('Abort during encoded-byte reading prevents a retained link and cleans the reader',async()=>{
  const lifetime=new AbortController(),f=await motionBindingFixture(null,{deferredRead:true,signal:lifetime.signal});await f.binding.intent({type:'record'});f.emit({frameIndex:90,tick:90,worldTime:1.5});const stopping=f.binding.intent({type:'stop-record'});for(let i=0;i<8;i++)await Promise.resolve();assert.equal(f.readers.length,1);lifetime.abort();await stopping;await f.binding.dispose();await f.readers[0].complete();assert.equal(f.readers[0].aborts,1);assert.equal(f.readers[0].listeners.size,0);assert.ok(f.updates.every(s=>!s.recording?.clip));assert.equal(f.downloads.length,0);
});
test('Disposal during the initial actual capture cannot start a late recorder',async()=>{
  const pending=deferred(),f=await motionBindingFixture(null,{methods:{captureFrame:()=>pending.promise}}),starting=f.binding.intent({type:'record'});await Promise.resolve();await f.binding.dispose();pending.resolve({sourceFingerprints:{},hardware:{}});await starting;assert.equal(f.controls(),undefined);assert.equal(f.downloads.length,0);
});


// Full-shaped synthetic timing reports test evidence bytes only, never GPU acceptance.
function largeTimingReport(){
  const trials=Array.from({length:12},(_,trialIndex)=>({trialIndex,mode:trialIndex%2?'no-fire':'reference',forMode:'reference',
    gpu:Array.from({length:600},(_,index)=>({index,gpuMs:1.125+index/10000})),
    updateCpuMs:Array(600).fill(.125),renderCpuMs:Array(600).fill(.25),simulationCpuMs:Array(600).fill(0),
    workload:Array.from({length:600},(_,index)=>({index,activeCells:128,fingerprint:'synthetic-'.padEnd(64,'f')})),
    draws:Array.from({length:600},()=>({calls:80,triangles:10000})),resources:Array.from({length:600},()=>({geometries:40,textures:12})),rejected:[]}));
  return {version:1,status:'inconclusive',reason:'Large synthetic report; no hardware evidence',hardware:{renderer:'Synthetic fixture only',note:'fumée 🔥'},protocol:{warmupFrames:120,sampleFrames:600,trials:3},gpu:{trials},comparison:{targetMet:null,optimizedReferenceRatio:null}};
}
test('Realistically large raw timing evidence preserves every UTF-8 byte, LF, hash and driver status',async()=>{
  const report=largeTimingReport(),expected=JSON.stringify(report,null,2)+'\n',reader=clipReaderFixture();assert.ok(Buffer.byteLength(expected)>2*1024*1024);
  const task=createTimingReportEvidence({report,FileReaderCtor:reader.FileReaderCtor,cryptoApi:webcrypto}),evidence=await task.finished;
  assert.equal(evidence.status,'available');assert.equal(evidence.driverStatus,'inconclusive');assert.equal(evidence.text,expected);assert.equal(evidence.bytes,Buffer.byteLength(expected));assert.equal(evidence.sha256,createHash('sha256').update(expected).digest('hex'));
  assert.deepEqual(Buffer.from(evidence.href.split(',')[1],'base64'),Buffer.from(expected));assert.deepEqual(JSON.parse(evidence.text),report);assert.equal(reader.readers[0].listeners.size,0);task.dispose();
});
test('Oversized or undigestible reports are explicit and never publish a partial JSON link',async()=>{
  const reader=clipReaderFixture(),report={status:'complete',raw:'x'.repeat(MAX_TIMING_REPORT_BYTES)},expectedBytes=Buffer.byteLength(JSON.stringify(report,null,2)+'\n');let digests=0;
  const oversized=await createTimingReportEvidence({report,FileReaderCtor:reader.FileReaderCtor,cryptoApi:{subtle:{digest(){digests++;}}}}).finished;
  assert.equal(oversized.status,'oversized');assert.equal(oversized.bytes,expectedBytes);assert.equal(oversized.href,undefined);assert.equal(oversized.text,undefined);assert.equal(digests,0);assert.equal(reader.readers.length,0);
  const unavailable=await createTimingReportEvidence({report:{status:'complete'},FileReaderCtor:reader.FileReaderCtor,cryptoApi:{}}).finished;assert.equal(unavailable.status,'unavailable');assert.match(unavailable.reason,/SHA-256/);assert.equal(unavailable.href,undefined);
});
test('A cancelled digest cannot acquire a reader or publish late report bytes',async()=>{
  const begun=deferred(),digest=deferred(),reader=clipReaderFixture(),task=createTimingReportEvidence({report:{status:'complete'},FileReaderCtor:reader.FileReaderCtor,cryptoApi:{subtle:{digest(){begun.resolve();return digest.promise;}}}});
  await begun.promise;task.dispose();digest.resolve(new Uint8Array(32).buffer);const result=await task.finished;assert.equal(result.status,'cancelled');assert.equal(result.href,undefined);assert.equal(reader.readers.length,0);
});
test('Notifications never prepare prior reports; sampling retires before one exact report preparation',async()=>{
  const report={status:'inconclusive',reason:'Synthetic result',gpu:{trials:[{gpu:[{index:0,gpuMs:2.5}]}]},comparison:{targetMet:null}},reader=clipReaderFixture(),entered=deferred(),pending=deferred();let sampling=false,preparations=0;
  const f=await fixture({initialState:{results:report},FileReaderCtor:reader.FileReaderCtor,cryptoApi:webcrypto,createReportEvidence:options=>{assert.equal(sampling,false,'JSON preparation entered active sampling');preparations++;return createTimingReportEvidence(options);},methods:{measure:()=>{sampling=true;entered.resolve();return pending.promise;}}});
  await f.binding.intent({type:'report'});assert.equal(preparations,1);assert.equal(f.downloads.length,0);assert.equal(f.updates.at(-1).reportEvidence.status,'available');const measuring=f.binding.intent({type:'measure',modes:['current','reference']});await entered.promise;
  assert.equal(f.updates.at(-1).reportEvidence.status,'unavailable');assert.equal(f.updates.at(-1).reviewEvidenceLocked,true);for(let i=0;i<5;i++)f.emit({phase:'measuring'});assert.equal(preparations,1);
  await assert.rejects(f.binding.intent({type:'report'}),/retired GPU/);sampling=false;f.emit({phase:'ready',results:report});pending.resolve(report);assert.deepEqual(await measuring,report);assert.equal(preparations,2);
  const evidence=f.updates.at(-1).reportEvidence;assert.equal(evidence.status,'available');assert.deepEqual(JSON.parse(evidence.text),report);for(let i=0;i<3;i++)f.emit({phase:'ready'});assert.equal(preparations,2);assert.equal(f.downloads.length,0);await f.binding.dispose();
});
test('Cancel retires pending report work; idle retry preserves the actual cancelled report',async()=>{
  const report={status:'complete',gpu:{trials:[]}},cancelledReport={status:'cancelled',reason:'Actual fixture cancellation',gpu:{trials:[]}},reader=clipReaderFixture(),begun=deferred(),pending=deferred();let first=true;
  const f=await fixture({initialState:{results:report},FileReaderCtor:reader.FileReaderCtor,cryptoApi:{subtle:{digest(...args){if(first){first=false;begun.resolve();return pending.promise;}return webcrypto.subtle.digest(...args);}}},methods:{cancelMeasurement:()=>{f.emit({phase:'ready',results:cancelledReport});return cancelledReport;}}});
  const preparing=f.binding.intent({type:'report'});await begun.promise;assert.equal(f.updates.at(-1).reportEvidence.status,'preparing');const cancelling=f.binding.intent({type:'cancel'});pending.resolve(new Uint8Array(32).buffer);await preparing;await cancelling;
  assert.equal(f.updates.at(-1).reportEvidence.status,'unavailable');assert.equal(reader.readers.length,0);await f.binding.intent({type:'report'});assert.equal(f.updates.at(-1).reportEvidence.driverStatus,'cancelled');assert.deepEqual(JSON.parse(f.updates.at(-1).reportEvidence.text),cancelledReport);assert.equal(f.downloads.length,0);await f.binding.dispose();
});
test('Report replacement, reset and disposal clear old resources without affecting JPEG capture',async()=>{
  const reader=clipReaderFixture(),f=await fixture({initialState:{results:{status:'complete',trials:[1]}},FileReaderCtor:reader.FileReaderCtor,cryptoApi:webcrypto});
  await f.binding.intent({type:'report'});const first=f.updates.at(-1).reportEvidence;f.emit({results:{status:'inconclusive',trials:[2]}});await f.binding.intent({type:'report'});assert.notEqual(f.updates.at(-1).reportEvidence.href,first.href);
  const capture=await f.binding.intent({type:'capture'});await f.binding.intent({type:'reset'});assert.equal(f.updates.at(-1).reportEvidence.status,'unavailable');assert.ok(f.updates.at(-1).captures.some(c=>c.id===capture.id));assert.ok(f.reportClears()>=3);await f.binding.dispose();assert.equal(f.downloads.length,0);
});
test('Disposal aborts a pending report FileReader and suppresses every late publication',async()=>{
  const began=deferred();class Reader extends EventTarget{constructor(){super();this.aborts=0;this.listeners=new Map();}addEventListener(t,h){super.addEventListener(t,h);this.listeners.set(t,h);}removeEventListener(t,h){super.removeEventListener(t,h);this.listeners.delete(t);}readAsDataURL(){began.resolve(this);}abort(){this.aborts++;this.dispatchEvent(new Event('abort'));}}
  const f=await fixture({initialState:{results:{status:'complete'}},FileReaderCtor:Reader,cryptoApi:webcrypto}),preparing=f.binding.intent({type:'report'}),reader=await began.promise,count=f.updates.length;
  await f.binding.dispose();await preparing;assert.equal(reader.aborts,1);assert.equal(reader.listeners.size,0);assert.equal(f.updates.length,count);assert.equal(f.downloads.length,0);
});


test('New sampling waits for prior report hashing to retire instead of overlapping its work',{timeout:5000},async()=>{
  const begun=deferred(),digest=deferred(),reader=clipReaderFixture();let entered=0;const f=await fixture({initialState:{results:{status:'complete'}},FileReaderCtor:reader.FileReaderCtor,cryptoApi:{subtle:{digest(){begun.resolve();return digest.promise;}}},methods:{measure:()=>{entered++;return null;}}});
  const preparing=f.binding.intent({type:'report'});await begun.promise;const measuring=f.binding.intent({type:'measure',modes:['current','reference']});await Promise.resolve();assert.equal(entered,0);digest.resolve(new Uint8Array(32).buffer);await preparing;await measuring;assert.equal(entered,1);assert.equal(f.updates.at(-1).reportEvidence.status,'unavailable');await f.binding.dispose();
});
