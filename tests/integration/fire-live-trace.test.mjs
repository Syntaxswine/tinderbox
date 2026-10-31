import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveTrace,LIVE_FRAME_COLUMNS,LIVE_NOTIFY_COLUMNS,summarizeLiveTrace} from '../../tools/fire-realism/live-trace.js';
import {CADENCE_CASES,CADENCE_CONFIG,runFiniteCadenceCases,collectFiniteCacheAudit,runCadenceExperiment} from '../../workbenches/runtime/fire-v5-live-cadence/experiment.js';
import {bindReviewDriver,createCanvasMotionRecorder} from '../../workbenches/fire-realism/review.js';

const values=(columns,overrides={})=>columns.slice(0,-1).map(key=>overrides[key]??0);
test('numeric ledger is bounded, detached, timed and explicit about overflow without owning a loop',()=>{
 let t=0;const meta={pin:'original'},trace=createLiveTrace({maxRows:2,metadata:meta,now:()=>++t});meta.pin='changed';
 trace.frame(values(LIVE_FRAME_COLUMNS,{worldAfter:1,draws:1}),t);trace.notify(values(LIVE_NOTIFY_COLUMNS,{phaseCode:trace.phaseCode('active'),sourceAge:1,cacheDecodes:2}),t);
 assert.equal(trace.active,true);assert.equal(trace.frame(values(LIVE_FRAME_COLUMNS),t),false);assert.equal(trace.summary().status,'overflow');assert.equal(trace.summary().overflowRows,1);
 const saved=trace.evidence();assert.equal(saved.frames.length+saved.notifications.length,2);assert.equal(saved.metadata.pin,'original');assert.ok(saved.observerMs>=0);saved.frames[0][0]=999;assert.notEqual(trace.evidence().frames[0][0],999);
 const summary=summarizeLiveTrace(trace.evidence());assert.equal(summary.callbackCount,1);assert.equal(summary.byObservedSourcePhase.active.samples,1);
 assert.throws(()=>createLiveTrace({maxRows:4097}),RangeError);assert.throws(()=>createLiveTrace({durationMs:10001}),RangeError);
});
test('invalid rows fail explicitly; terminal cancellation and endpoint survive later calls',()=>{
 const a=createLiveTrace();a.frame([NaN],0);assert.equal(a.summary().status,'error');assert.equal(a.evidence().frames.length,0);
 const b=createLiveTrace();b.stop('cancelled','disposed',{droppedRealSeconds:.4});b.stop('complete','later');assert.equal(b.evidence().status,'cancelled');assert.equal(b.evidence().endpoint.droppedRealSeconds,.4);
});

function protocolFixture({failure=null}={}){
 let config={...CADENCE_CONFIG,viewport:{...CADENCE_CONFIG.viewport},mode:'reference'},frame=0,phase='ready',trace=null,pausedDraws=0,ms=0;const calls=[];
 const advance=(tick=599)=>{frame=tick;trace.frame(values(LIVE_FRAME_COLUMNS,{frameAfter:frame,tickAfter:frame,worldAfter:frame/60,playerAfter:frame/60,draws:1}),ms);};
 const state=()=>({configuration:structuredClone(config),frameIndex:frame,tick:frame,worldTime:frame/60,playerTime:frame/60,phase,...(trace?{liveTrace:trace.summary()}:{})});
 const driver={state,startLiveTrace(options){calls.push(['trace',options]);trace=createLiveTrace({...options,now:()=>ms});return trace.summary();},finishLiveTrace(options={}){trace?.stop(options.status||'complete',options.reason||'paused',{frameIndex:frame,worldTime:frame/60,droppedRealSeconds:0});return trace?.evidence();}};
 const pause=()=>{phase='ready';trace?.stop('complete','paused-before-redraw',{frameIndex:frame,worldTime:frame/60,droppedRealSeconds:0});pausedDraws++;};
 const binding={async intent(command){calls.push([command.type,command.patch]);if(command.type==='configure')config=structuredClone(command.patch);if(command.type==='reset'){frame=0;phase='ready';}if(['play','record'].includes(command.type))phase='playing';if(command.type==='record'&&failure==='pause-near-limit')ms+=200;if(command.type==='pause')pause();},async motionEvidence(){
  calls.push(['motionEvidence']);if(failure==='recording')return {status:'unavailable'};
  let reason='ten-second-limit',request=10000;
  if(['pause-then-limit','pause-near-limit'].includes(failure)){const early=failure==='pause-near-limit'?9950:2500;ms+=early;advance(150);pause();ms+=10000-early;}
  else{request=failure==='manual-early'?2500:10000;ms+=request;advance(request===2500?150:599);if(['manual-early','manual-long'].includes(failure))reason='manual';}
  const before=state(),stopProvenance={kind:'diagnostic-recorder-stop-v1',reason,observedAtMs:ms,phaseBeforePause:before.phase,traceBeforePause:{active:before.liveTrace.active,status:before.liveTrace.status,startedMs:before.liveTrace.startedMs,endedMs:before.liveTrace.endedMs}};if(failure==='wrong-trace')stopProvenance.traceBeforePause.startedMs--;pause();
  return {status:'complete',reason,recording:{maximumDurationMs:10000,nominalStopAfterMs:10000,stopRequestedAfterMs:request,wallDurationMs:request+4,requestedCaptureFps:60},...(failure==='missing-proof'?{}:{diagnosticTiming:{stopProvenance}}),scope:'Synthetic protocol only'};
 }};
 const capture=()=>({camera:{matrixWorld:[1],projectionMatrix:[2]},hardware:{canvas:{drawingBufferWidth:failure==='canvas'?1:1280,drawingBufferHeight:800}},sourceFingerprints:{scope:'synthetic'}});
 return {driver,binding,calls,capture,now:()=>ms,waitDuration:async(duration,signal)=>{calls.push(['wait',duration]);assert.equal(signal.aborted,false);await Promise.resolve();if(failure==='early-off'){ms+=2500;advance(150);pause();ms+=7500;}else{ms+=duration;advance();}},get pausedDraws(){return pausedDraws;}};
}
test('public host keeps exact four-case order, oblique native configuration, normal intents and nominal stop protocol',async()=>{
 const h=protocolFixture(),report=await runFiniteCadenceCases(h);assert.equal(report.status,'complete');assert.deepEqual(report.runs.map(r=>r.case.id),['RefOff','NoFireOn','RefOn','NoFireOff']);
 assert.deepEqual(h.calls.filter(c=>c[0]==='record').length,2);assert.equal(h.calls.filter(c=>c[0]==='motionEvidence').length,2);assert.deepEqual(h.calls.filter(c=>c[0]==='wait').map(c=>c[1]),[10000,10000]);
 for(const r of report.runs){assert.equal(r.configuration.view,'oblique');assert.equal(r.configuration.viewport.pixelRatio,1);assert.equal(r.trace.frames.length,1);assert.equal(r.trace.status,'complete');assert.equal(r.recorderDataEventCount,null);assert.equal(r.start.frameIndex,0);}
 assert.equal(h.pausedDraws,4);assert.deepEqual(CADENCE_CASES.map(c=>c.mode),['reference','no-fire','reference','no-fire']);
});
test('host preserves failed/partial evidence and stops on cancellation or changed physical canvas',async()=>{
 const a=protocolFixture({failure:'recording'}),bad=await runFiniteCadenceCases(a);assert.equal(bad.status,'failed');assert.equal(bad.runs.length,2);assert.ok(bad.runs[1].trace);assert.ok(a.calls.some(c=>c[0]==='cancel-record'));
 const b=protocolFixture({failure:'canvas'}),canvas=await runFiniteCadenceCases(b);assert.equal(canvas.status,'failed');assert.equal(canvas.runs[0].trace,null);
 const controller=new AbortController();controller.abort(new DOMException('Synthetic cancellation','AbortError'));const c=protocolFixture(),cancelled=await runFiniteCadenceCases({...c,signal:controller.signal});assert.equal(cancelled.status,'cancelled');assert.equal(c.calls.filter(x=>x[0]==='trace').length,0);
});
test('diagnostic rejects early Pause/manual Stop and a paused canvas continuing to the nominal limit',async()=>{
 for(const failure of ['early-off','manual-early','manual-long','pause-then-limit','pause-near-limit','wrong-trace','missing-proof']){
  const h=protocolFixture({failure}),r=await runFiniteCadenceCases(h);assert.equal(r.status,'failed',failure);const stopped=r.runs.at(-1);assert.equal(stopped.error.code,'CADENCE_STOP_INVALID');assert.equal(stopped.trace.status,'complete','Preserve original ordinary Pause terminal state');
  if(['early-off','manual-early','pause-then-limit'].includes(failure))assert.equal(stopped.trace.endedMs-stopped.trace.startedMs,2500);
  if(failure==='manual-long')assert.match(stopped.error.message,/not manual/);
  if(failure==='pause-near-limit'){assert.ok(stopped.trace.endedMs-stopped.trace.startedMs>=10000);assert.match(stopped.error.message,/stay active/);}
 }
});
test('cold-load rejection preserves unavailable source identity and retires the document listener',async()=>{
 const listeners=new Set(),doc={hidden:false,addEventListener(_name,fn){listeners.add(fn);},removeEventListener(_name,fn){listeners.delete(fn);}};
 const r=await runCadenceExperiment({root:{ownerDocument:doc}},{load:async()=>{throw Error('Synthetic pre-import verification failure');}});
 assert.equal(r.status,'failed');assert.equal(r.sourceFingerprint,null);assert.equal(r.descriptor,null);assert.equal(r.partialTrace,null);assert.deepEqual(r.imports,[]);assert.deepEqual(r.cleanupErrors,[]);assert.equal(listeners.size,0);assert.match(r.error.message,/pre-import/);
});
test('finite cache observer reads evidence only twice and retains no borrowed RGBA views or hashes',async()=>{
 let evidenceCalls=0,decodes=17,dense=0;const rgba=new Uint8Array(3538944),namespace={fluidSurfaceContactPayloadEvidence(){evidenceCalls++;return {ready:true,frames:193,metrics:{frameDecodes:decodes,denseBytes:dense,denseBuffers:dense?2:0,peakDenseBytes:7077888},source:{scope:'Synthetic API only'}};},async auditFluidSurfaceContactRGBA(callback){dense=7077888;try{for(let i=0;i<193;i++){decodes++;await callback({frame:i+1,timeSeconds:i/30,resolution:[48,48,96],rgba});}}finally{dense=0;}}};
 const r=await collectFiniteCacheAudit(namespace);assert.equal(r.status,'complete');assert.equal(evidenceCalls,2);assert.equal(r.callbacks,193);assert.equal(r.decodeDelta,193);assert.equal(r.rows.length,193*8);assert.equal(r.after.denseBytes,0);assert.ok(r.rows.every(Number.isFinite));
});
test('cancelled finite cache pass retains accepted rows and observes original finally cleanup',async()=>{
 const controller=new AbortController();let dense=0,reads=0;const rgba=new Uint8Array(3538944),namespace={fluidSurfaceContactPayloadEvidence(){reads++;return {ready:true,frames:193,metrics:{frameDecodes:3,denseBytes:dense,denseBuffers:dense?2:0,peakDenseBytes:7077888}};},async auditFluidSurfaceContactRGBA(callback,{signal}){dense=7077888;try{for(let i=0;i<3;i++)await callback({frame:i+1,timeSeconds:i/30,resolution:[48,48,96],rgba});controller.abort(new DOMException('Synthetic cache cancellation','AbortError'));throw signal.reason;}finally{dense=0;}}};
 const r=await collectFiniteCacheAudit(namespace,{signal:controller.signal});assert.equal(r.status,'cancelled');assert.equal(r.callbacks,3);assert.equal(r.rows.length,24);assert.equal(r.after.denseBytes,0);assert.equal(reads,2);
});

class Recorder extends EventTarget{static isTypeSupported(type){return type==='video/webm;codecs=vp9';}constructor(stream,options){super();this.stream=stream;this.mimeType=options.mimeType;this.state='inactive';}start(slice){assert.equal(slice,250);this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>{const event=new Event('dataavailable');event.data=new Blob(['abc'],{type:this.mimeType});this.dispatchEvent(event);this.dispatchEvent(new Event('stop'));});}}
class Reader extends EventTarget{readAsDataURL(blob){this.result='data:'+blob.type+';base64,YWJj';queueMicrotask(()=>this.dispatchEvent(new Event('load')));}abort(){this.dispatchEvent(new Event('abort'));}}
test('normal binding awaits existing recorder unchanged; optional wall telemetry is default off and disposal retires tracks',async()=>{
 for(const diagnosticTiming of [false,true]){
  let stopped=0,frame=0,phase='ready',driver,received,armStopError=false,failProbe=false;const states=[],track={stop(){stopped++;}},canvas={captureStream(fps){assert.equal(fps,60);return {getTracks:()=>[track]};}};
  const doc={defaultView:{MediaRecorder:Recorder},addEventListener(){},removeEventListener(){}};
  const shell={renderRoot:{ownerDocument:doc,querySelector:()=>canvas},uiRoot:{},update:s=>states.push(s),clearMotionEvidence(){}};
  const state=()=>{if(failProbe){failProbe=false;throw Error('Synthetic stop-provenance observation failure');}return {phase,configuration:{mode:'reference'},availability:{reference:{available:true}},frameIndex:frame,tick:frame,worldTime:frame/60,playerTime:frame/60,workload:{},cameraSweep:{supported:false}};};
  const binding=await bindReviewDriver({shell,diagnosticTiming,FileReaderCtor:Reader,createMotionRecorder:options=>{const recorder=createCanvasMotionRecorder(options);return {...recorder,stop(reason){if(armStopError)failProbe=true;return recorder.stop(reason);}};},onDownload:value=>{received=value;},createDriver:async options=>{driver={state,captureFrame:()=>({sourceFingerprints:{pin:'synthetic'},hardware:{canvas:{}},dataUrl:'data:image/jpeg;base64,AA=='}),play(){phase='playing';frame++;options.onChange(state());},pause(){phase='ready';frame++;options.onChange(state());},async dispose(){}};return driver;}});
  await assert.rejects(binding.motionEvidence(),/No live recording/);await binding.intent({type:'record'});const pending=binding.motionEvidence();await binding.intent({type:'stop-record'});const result=await pending;assert.equal(result.status,'complete');assert.equal(stopped,1);assert.equal(result.recording.requestedCaptureFps,60);assert.equal(Object.hasOwn(result,'diagnosticTiming'),diagnosticTiming);
  if(diagnosticTiming){assert.ok(result.diagnosticTiming.setupWallMs>=0&&result.diagnosticTiming.retentionWallMs>=0);assert.equal(result.diagnosticTiming.stopProvenance.reason,'manual');assert.equal(result.diagnosticTiming.stopProvenance.phaseBeforePause,'playing');}result.configuration.mode='mutated';await binding.intent({type:'motion-metadata'});assert.equal(received.configuration.mode,'reference');
  if(diagnosticTiming){await binding.intent({type:'record'});armStopError=true;await binding.intent({type:'stop-record'});const failedProbe=await binding.motionEvidence();assert.equal(failedProbe.status,'complete','Provenance failure must not abandon ordinary clip cleanup');assert.match(failedProbe.diagnosticTiming.stopProvenance.error.message,/observation failure/);assert.equal(stopped,2);}
  await binding.dispose();assert.equal(stopped,diagnosticTiming?2:1);assert.ok(states.some(s=>s.recording.active));
 }
});
