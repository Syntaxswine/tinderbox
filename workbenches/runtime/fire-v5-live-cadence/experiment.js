import {createFireReviewDeliveryLoader,verifiedFireDeliveryFingerprint} from '../../../tools/fire-realism/delivery.js';
import {summarizeLiveTrace} from '../../../tools/fire-realism/live-trace.js';

export const CADENCE_CASES=Object.freeze([{id:'RefOff',mode:'reference',record:false},{id:'NoFireOn',mode:'no-fire',record:true},{id:'RefOn',mode:'reference',record:true},{id:'NoFireOff',mode:'no-fire',record:false}].map(Object.freeze));
export const CADENCE_CONFIG=Object.freeze({scenario:'match-contact',view:'oblique',lighting:'bright',characterId:'bear',seed:1893,population:null,viewport:Object.freeze({width:1280,height:800,pixelRatio:1})});
const errorRecord=e=>({name:e?.name||'Error',message:String(e?.message||e).slice(0,4096),...(e?.code?{code:e.code}:{})}),check=signal=>{if(signal?.aborted)throw signal.reason;};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function wait(ms,signal){return new Promise((resolve,reject)=>{let timer;const stop=()=>{clearTimeout(timer);signal?.removeEventListener('abort',stop);reject(signal.reason);};if(signal?.aborted)return stop();timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},ms);signal?.addEventListener('abort',stop,{once:true});});}
function abortable(promise,signal){return new Promise((resolve,reject)=>{const stop=()=>reject(signal.reason);if(signal?.aborted)return stop();signal?.addEventListener('abort',stop,{once:true});Promise.resolve(promise).then(resolve,reject).finally(()=>signal?.removeEventListener('abort',stop));});}
function captureMetadata(driver){const {dataUrl,...record}=driver.captureFrame();return record;}
function stopFailure(message){const error=Error('Diagnostic intended stop not proved: '+message);error.code='CADENCE_STOP_INVALID';throw error;}
function requireNominalStop(testCase,trace,traceStart,recording,offStop){
 if(!trace||!traceStart)stopFailure('missing trace or start identity');
 if(!Number.isFinite(trace.startedMs)||!Number.isFinite(trace.endedMs)||trace.startedMs!==traceStart.startedMs||trace.endedMs-trace.startedMs<10000)stopFailure('full10000ms traced interval required');
 if(testCase.record){
  const r=recording?.recording,p=recording?.diagnosticTiming?.stopProvenance,before=p?.traceBeforePause;
  if(recording?.reason!=='ten-second-limit'||r?.nominalStopAfterMs!==10000||r.maximumDurationMs!==10000||!Number.isFinite(r.stopRequestedAfterMs)||r.stopRequestedAfterMs<10000)stopFailure('recorder must stop at its nominal ten-second limit, not manual Stop');
  if(p?.kind!=='diagnostic-recorder-stop-v1'||p.reason!=='ten-second-limit'||p.error||p.phaseBeforePause!=='playing'||before?.active!==true||before.status!=='collecting'||before.startedMs!==trace.startedMs||before.endedMs!==null)stopFailure('same trace must stay active until the nominal recorder stop');
  if(!Number.isFinite(p.observedAtMs)||p.observedAtMs<trace.startedMs+10000||p.observedAtMs>trace.endedMs)stopFailure('recorder stop timestamp must bound the full live interval');
 }else if(offStop?.kind!=='owned-nominal-timer-v1'||offStop.phaseBeforePause!=='playing'||offStop.activeBeforePause!==true||offStop.traceStartedMs!==trace.startedMs||offStop.actualRequestMs<10000)stopFailure('owned off-timer must stop the same still-active trace');
}

/** Public-method protocol shared by the real page and explicit API test doubles. */
export async function runFiniteCadenceCases({driver,binding,signal,onStatus=()=>{},now=()=>performance.now(),waitDuration=wait,capture=captureMetadata}={}){
 const runs=[];
 for(const testCase of CADENCE_CASES){
  let trace=null,traceStart=null,started=false,start=null,finish=null,recording=null,offController=null,offForward=null,offStop=null;
  try{
   check(signal);onStatus('Preparing '+testCase.id+' with normal shell/HUD');const setupStart=now();
   await binding.intent({type:'configure',patch:{...CADENCE_CONFIG,viewport:{...CADENCE_CONFIG.viewport},mode:testCase.mode}});await binding.intent({type:'reset'});check(signal);
   const configured=driver.state();if(configured.frameIndex!==0||configured.phase!=='ready'||!same(configured.configuration,{...CADENCE_CONFIG,viewport:{...CADENCE_CONFIG.viewport},mode:testCase.mode}))throw Error('Case did not start from exact fixed configuration/F0');
   const first=capture(driver),setupMs=now()-setupStart;
   if(first.hardware.canvas.drawingBufferWidth!==1280||first.hardware.canvas.drawingBufferHeight!==800)throw Error('Actual drawing buffer changed');
   traceStart=driver.startLiveTrace({durationMs:10000,maxRows:4096});started=true;start=driver.state();const wallStarted=now();onStatus('Running '+testCase.id+' for nominal10 seconds');
   if(testCase.record){await binding.intent({type:'record'});recording=await abortable(binding.motionEvidence(),signal);if(recording?.status!=='complete')throw Error('Actual recording did not complete: '+(recording?.reason||recording?.status));}
   else{offController=new AbortController();offForward=()=>offController.abort(signal.reason);if(signal?.aborted)offForward();else signal?.addEventListener('abort',offForward,{once:true});const scheduled=now(),stopping=waitDuration(10000,offController.signal);stopping.catch(()=>{});await binding.intent({type:'play'});await stopping;check(signal);const before=driver.state();offStop={kind:'owned-nominal-timer-v1',nominalMs:10000,actualRequestMs:now()-scheduled,overrunMs:Math.max(0,now()-scheduled-10000),phaseBeforePause:before.phase,activeBeforePause:before.liveTrace?.active===true,traceStartedMs:before.liveTrace?.startedMs??null};if(before.phase!=='playing'||before.liveTrace?.active!==true||before.liveTrace.startedMs!==traceStart.startedMs)stopFailure('trace was already paused/ended when the owned timer arrived');await binding.intent({type:'pause'});}
   check(signal);finish=driver.state();trace=driver.finishLiveTrace();
   requireNominalStop(testCase,trace,traceStart,recording,offStop);const after=capture(driver);
   if(trace?.status!=='complete'||!trace.frames.length||finish.frameIndex<=start.frameIndex||!same(finish.configuration,start.configuration)||!same(first.camera,after.camera))throw Error('Incomplete, altered or non-live trace');
   if(after.hardware.canvas.drawingBufferWidth!==1280||after.hardware.canvas.drawingBufferHeight!==800)throw Error('Ending drawing buffer changed');
   runs.push({case:testCase,status:'complete',configuration:start.configuration,start:{frameIndex:start.frameIndex,tick:start.tick,worldTime:start.worldTime,playerTime:start.playerTime},end:trace.endpoint,setupWallMs:setupMs,liveAndDrainWallMs:now()-wallStarted,offStop,sourceFingerprints:first.sourceFingerprints,hardware:first.hardware,camera:first.camera,trace,summary:summarizeLiveTrace(trace),recording,recorderDataEventCount:null,postWindow:'Pause closes trace before its existing redraw. Final JPEG and JSON/export occur after the live window.'});
  }catch(error){
   if(started)try{trace=driver.finishLiveTrace({status:signal?.aborted?'cancelled':'error',reason:error.message});}catch{}
   if(testCase.record)try{await binding.intent({type:'cancel-record'});}catch{}
   try{await binding.intent({type:'pause'});}catch{}
   runs.push({case:testCase,status:signal?.aborted?'cancelled':'failed',start,end:finish,error:errorRecord(error),trace,recording,offStop});
   return {status:signal?.aborted?'cancelled':'failed',runs,error:errorRecord(error)};
  }finally{offController?.abort();if(offForward)signal?.removeEventListener('abort',offForward);}
 }
 return {status:'complete',runs};
}

/** No renderer, geometry, raw hash checks or per-sample evidence clones. */
export async function collectFiniteCacheAudit(namespace,{signal,now=()=>performance.now()}={}){
 const evidence=()=>namespace.fluidSurfaceContactPayloadEvidence(),before=evidence();
 if(!before.ready||before.frames!==193||before.metrics.denseBytes!==0)throw Error('Dispose the driver/factory before the standalone cache audit');
 const rows=new Float64Array(193*8);let count=0;const started=now();
 try{
  await namespace.auditFluidSurfaceContactRGBA(frame=>{
   const entered=now(),i=count;
   if(i>=193||frame.frame!==i+1||frame.timeSeconds!==i/30||!same(frame.resolution,[48,48,96])||!(frame.rgba instanceof Uint8Array)||frame.rgba.byteLength!==3538944)throw Error('Unexpected finite cache callback');
   rows.set([frame.frame,frame.timeSeconds,...frame.resolution,frame.rgba.byteLength,entered,0],i*8);rows[i*8+7]=now();count++;
  },{signal});
 }catch(error){const after=evidence();return {status:signal?.aborted?'cancelled':'failed',error:errorRecord(error),callbacks:count,columns:['frame','sourceTime','nx','ny','nz','rgbaBytes','entryMs','leaveMs'],rows:Array.from(rows.subarray(0,Math.min(count,193)*8)),before:before.metrics,after:after.metrics,elapsedMs:now()-started};}
 const ended=now(),after=evidence(),decodeDelta=after.metrics.frameDecodes-before.metrics.frameDecodes;
 if(count!==193||decodeDelta!==193||after.metrics.peakDenseBytes!==7077888||after.metrics.denseBuffers!==0||after.metrics.denseBytes!==0)throw Error('Finite cache count/two-slot cleanup proof failed');
 return {status:'complete',callbacks:count,decodeDelta,columns:['frame','sourceTime','nx','ny','nz','rgbaBytes','entryMs','leaveMs'],rows:Array.from(rows),startedMs:started,endedMs:ended,elapsedMs:ended-started,before:before.metrics,after:after.metrics,source:after.source,ownership:'Only two CPU RGBA slots, disposed by original audit finally; shared packets remain document-lived. No borrowed array retained.',interpretation:'Entry minus prior leave includes cache work plus loop/microtask overhead. First entry includes allocation/two decodes; middle entries one miss; final pair no new decode. This is warm standalone CPU, not live submission attribution.'};
}

export async function runCadenceExperiment({root,signal,onStatus=()=>{}}={},dependencies={}){
 const load=dependencies.load||createFireReviewDeliveryLoader(),nativeImport=dependencies.nativeImport||(url=>import(url)),now=dependencies.now||(()=>performance.now());
 const controller=new AbortController(),forward=()=>controller.abort(signal.reason instanceof Error?signal.reason:new DOMException('Diagnostic cancelled','AbortError'));
 if(signal?.aborted)forward();else signal?.addEventListener('abort',forward,{once:true});
 const doc=root.ownerDocument,hidden=()=>{if(doc.hidden)controller.abort(Error('Diagnostic document became hidden'));};doc.addEventListener('visibilitychange',hidden);if(doc.hidden)hidden();
 let namespace=null,review=null,driver=null,timer=null,result=null,caseReport=null,cache=null,sourceFingerprint=null,descriptor=null,coldLoadWallMs=null,cleanupErrors=[],loadStarted=now();
 const imports=[];
 try{
  onStatus('Cold verifying/preparing the configured original V5 delivery');
  const base=new URL('../../../',import.meta.url),delivery=await load({projectUrl:base,descriptorUrl:new URL('workbenches/fire-realism/delivery.json',base),signal:controller.signal,importModule:async url=>{const actual=await nativeImport(url);imports.push(url);if(namespace)throw Error('One reference delivery only for this diagnostic');namespace=actual;return actual;}});
  check(controller.signal);const selected=delivery.artistDelivery?.byMode?.reference,fp=verifiedFireDeliveryFingerprint(selected);sourceFingerprint=fp;descriptor=delivery.descriptor;
  if(delivery.status!=='configured'||!fp||!namespace?.auditFluidSurfaceContactRGBA||!namespace.fluidSurfaceContactPayloadEvidence)throw Error('Configured verified finite V5 reference exports are required');
  coldLoadWallMs=now()-loadStarted;timer=setTimeout(()=>controller.abort(new DOMException('Four-run/cache diagnostic180s deadline exceeded','TimeoutError')),180000);
  const [{createFireReviewDriver},{mountUI},{startFireReview}]=await Promise.all([nativeImport(new URL('workbenches/fire-realism/driver.js',base).href),nativeImport(new URL('src/ui/index.js',base).href),nativeImport(new URL('workbenches/fire-realism/review.js',base).href)]);
  review=await startFireReview(root,{artistDelivery:delivery.artistDelivery,referenceAcceptance:delivery.referenceAcceptance,mountUI,signal:controller.signal,diagnosticTiming:true,
   createDriver:async options=>{driver=await createFireReviewDriver({...options,onChange:state=>{options.onChange(state);if(state.liveTrace&&['error','overflow'].includes(state.liveTrace.status))controller.abort(Error('Live trace failed: '+state.liveTrace.reason));}});return driver;}});
  check(controller.signal);if(!driver)throw Error('Normal review driver unavailable');
  caseReport=await runFiniteCadenceCases({driver,binding:review.binding,signal:controller.signal,onStatus,now});
  await review.dispose();review=null;
  if(caseReport.status==='complete'){onStatus('Driver disposed; timing one finite193-sample cache audit');cache=await collectFiniteCacheAudit(namespace,{signal:controller.signal,now});}
  result={version:1,kind:'actual-browser-finite-live-cadence-diagnostic',status:caseReport.status==='complete'?(cache?.status||'failed'):caseReport.status,proposalCommit:'388d6e65b79c1d47612933fab573f7dab59a079c',coldLoadWallMs,imports,sourceFingerprint:fp,descriptor:delivery.descriptor,caseReport,cache,scope:'CPU/cadence diagnostic only. No GPU query, raw hash re-audit, rendered-FPS, cost or visual acceptance. Actual clocks/catch-up/finite fields and aggregate limits unchanged.'};
 }catch(error){
  let partialTrace=null;try{partialTrace=driver?.finishLiveTrace({status:'error',reason:error.message})||null;}catch(cleanup){cleanupErrors.push(errorRecord(cleanup));}
  result={version:1,kind:'actual-browser-finite-live-cadence-diagnostic',status:controller.signal.aborted?'cancelled':'failed',error:errorRecord(error),coldLoadWallMs,sourceFingerprint,descriptor,imports,caseReport,cache,partialTrace};
 }finally{
  if(timer!==null)clearTimeout(timer);try{await review?.dispose();}catch(error){cleanupErrors.push(errorRecord(error));}
  signal?.removeEventListener('abort',forward);doc.removeEventListener('visibilitychange',hidden);
  if(result){result.cleanupErrors=cleanupErrors;result.documentOwnership='Close this document after export to retire its verified shared packet store; this is not a measured GC/RSS claim.';}
 }
 return result;
}
