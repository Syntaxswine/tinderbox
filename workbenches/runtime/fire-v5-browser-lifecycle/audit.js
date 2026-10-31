import {createFireReviewDeliveryLoader,verifiedFireDeliveryFingerprint,verifiedFireDeliveryMetadata} from '../../../tools/fire-realism/delivery.js';

const ENTRY='assets/art/fire-realism/fluid-contact-surface/index.js';
const RAW_MANIFEST='dc257c0200ea12dcea9c48fdf711cb33e6de62ab989732c731cdd7099f16a4ce';
const EVIDENCE='fluidSurfaceContactPayloadEvidence',AUDIT='auditFluidSurfaceContactRGBA';
const own=(value,key)=>Object.hasOwn(value,key),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const failure=message=>{throw Error(message);};

function errorRecord(error,depth=0){
 if(!error)return null;
 const children=error instanceof AggregateError?[...error.errors]:[],message=String(error.message||error);
 return {name:String(error.name||'Error').slice(0,128),message:message.slice(0,4096),truncated:message.length>4096||children.length>8||depth>=4&&!!(error.cause||children.length),
  ...(depth<4&&error.cause?{cause:errorRecord(error.cause,depth+1)}:{}),
  ...(depth<4&&error instanceof AggregateError?{errors:[...error.errors].slice(0,8).map(e=>errorRecord(e,depth+1))}:{})};
}
function sample(e){
 if(!e||e.version!==2||e.format!=='FZP2'||e.frames!==193||e.scalarRecords!==579||e.chunks!==193||!e.metrics||e.source?.rawManifestSha256!==RAW_MANIFEST)failure('Unexpected V5 payload evidence/source');
 const metrics={};
 for(const key of ['preparations','inflations','verifiedScalars','sharedSparseBytes','stagedSparseBytes','denseBuffers','denseBytes','peakDenseBytes','frameDecodes']){
  const n=e.metrics[key];if(!Number.isSafeInteger(n)||n<0)failure('Invalid payload metric: '+key);metrics[key]=n;
 }
 return {ready:e.ready===true,metrics,verifiedRecordCount:e.verifiedScalars?.length??null};
}
const empty=s=>!s.ready&&s.metrics.sharedSparseBytes===0&&s.metrics.stagedSparseBytes===0&&s.metrics.denseBuffers===0&&s.metrics.denseBytes===0;

/** One instance is one fresh-document attempt. Test dependencies exercise the
 * host lifecycle only; browser.js supplies none and uses native import. */
export function createV5BrowserLifecycleAudit(dependencies={}){
 let begun=false;
 const createLoader=dependencies.createLoader||createFireReviewDeliveryLoader;
 const nativeImport=dependencies.nativeImport||(url=>import(url));
 const fingerprint=dependencies.fingerprint||verifiedFireDeliveryFingerprint;
 const metadata=dependencies.metadata||verifiedFireDeliveryMetadata;
 const now=dependencies.now||(()=>performance.now()),deadlineMs=dependencies.deadlineMs??180000;
 if(!Number.isFinite(deadlineMs)||deadlineMs<=0||deadlineMs>180000)throw RangeError('Host deadline must be at most 180 seconds');
 return async function run({caseName='cancel-staging',projectUrl,signal,onStatus}={}){
  if(begun)throw Error('This audit already began; open a fresh document');begun=true;
  if(!['cancel-staging','success-lease'].includes(caseName))throw TypeError('Unknown lifecycle case');
  const base=new URL(projectUrl),entryUrl=new URL(ENTRY,base).href,descriptorUrl=new URL('workbenches/fire-realism/delivery.json',base).href;
  const controller=new AbortController(),started=now(),imports=[],observations=[];
  let namespace=null,loadPending=true,loaded=null,loadError=null,trigger=null,observerError=null,pollTimer=null,polls=0,finished=false,lease=null;
  const elapsed=()=>Math.max(0,now()-started),status=text=>onStatus?.(text);
  const forward=()=>controller.abort(signal.reason instanceof Error?signal.reason:new DOMException('Host cancelled','AbortError'));
  if(signal?.aborted)forward();else signal?.addEventListener('abort',forward,{once:true});
  const timer=setTimeout(()=>controller.abort(new DOMException('Browser lifecycle host deadline exceeded','TimeoutError')),deadlineMs);
  const observe=()=>{
   if(finished||!loadPending||controller.signal.aborted)return;
   try{
    if(++polls>18000)failure('Bounded staging observation exhausted');
    const observed=sample(namespace[EVIDENCE]());
    if(!observations.length)observations.push({atMs:elapsed(),loadPending,...observed});
    if(!observed.ready&&observed.metrics.stagedSparseBytes>0&&observed.metrics.verifiedScalars>=1){
     trigger={kind:'observed-staging',atMs:elapsed(),loadPending,...observed};observations.push(trigger);
     status('Verified scalar observed in staging; aborting the real loader');
     controller.abort(new DOMException('QA cancellation during observed V5 preparation staging','AbortError'));return;
    }
    pollTimer=setTimeout(observe,10);
   }catch(error){observerError=error;controller.abort(error);}
  };
  const hook=async url=>{
   if(url!==entryUrl||imports.length)failure('Lifecycle fixture supports exactly the configured V5 reference entry');
   const record={url,startedMs:elapsed(),completedMs:null};imports.push(record);
   // The strict loader calls this only after ALL configured bytes verify.
   // Return the actual native namespace unchanged: no fake exports/wrappers.
   const actual=await nativeImport(url);namespace=actual;record.completedMs=elapsed();
   if(!own(actual,EVIDENCE)||!own(actual,AUDIT)||typeof actual[EVIDENCE]!=='function'||typeof actual[AUDIT]!=='function')failure('Actual V5 audit exports unavailable');
   if(caseName==='cancel-staging'&&!controller.signal.aborted)pollTimer=setTimeout(observe,0);
   return actual;
  };
  try{
   status('Verifying configured JS and 193 binary resources before native import');
   try{loaded=await createLoader()({projectUrl:base,descriptorUrl,signal:controller.signal,importModule:hook});}
   catch(error){loadError=error;}
   finally{loadPending=false;if(pollTimer!==null)clearTimeout(pollTimer);pollTimer=null;}
   if(caseName==='cancel-staging'){
    if(observerError)throw observerError;
    if(!trigger||!trigger.loadPending||loaded||loadError?.name!=='AbortError')failure('Required cancellation during verified staging was not proved');
    if(!namespace)failure('No actual namespace observed');
    const immediate=sample(namespace[EVIDENCE]());if(!empty(immediate))failure('Payload retained owned buffers after cancellation');
    const late=[];
    for(let i=0;i<3;i++){if(elapsed()>=deadlineMs)failure('No time left for late-settlement evidence');await pause(25);if(elapsed()>=deadlineMs)failure('Host deadline reached during late-settlement evidence');const s=sample(namespace[EVIDENCE]());late.push({atMs:elapsed(),...s});if(!empty(s))failure('Late preparation resurrected payload ownership');}
    return build('pass',{immediate,late});
   }
   if(loadError)throw loadError;
   if(controller.signal.aborted)throw controller.signal.reason;
   if(loaded?.status!=='configured'||!namespace)failure('Configured successful V5 boot required');
   const selected=loaded.artistDelivery?.byMode?.reference,fp=fingerprint(selected);
   if(!fp||fp.factoryModule!==ENTRY||fp.factoryExport!=='createFluidSurfaceContactReference'||fp.prepareExport!=='prepareFluidSurfaceContactData')failure('Verified V5 factory/preparation selector not issued');
   const before=sample(namespace[EVIDENCE]());if(!before.ready||before.metrics.verifiedScalars!==579||before.metrics.denseBytes!==0)failure('Actual 193/579 preparation not complete');
   const auditController=new AbortController(),complete=new DOMException('QA one-pair RGBA lease complete','AbortError');let callbacks=0,auditError=null,during=null;
   const cancelAudit=()=>auditController.abort(controller.signal.reason);
   controller.signal.addEventListener('abort',cancelAudit,{once:true});
   try{
    await namespace[AUDIT](frame=>{
     if(++callbacks!==1||frame.frame!==1||frame.timeSeconds!==0||JSON.stringify(frame.resolution)!=='[48,48,96]'||!(frame.rgba instanceof Uint8Array)||frame.rgba.byteLength!==3538944)failure('Unexpected first actual RGBA lease');
     during=sample(namespace[EVIDENCE]());if(during.metrics.denseBuffers!==2||during.metrics.denseBytes!==7077888)failure('Lease did not own exactly two RGBA slots');
     // Retain no borrowed arrays; do not repeat the prior 579-channel audit.
     auditController.abort(complete);
    },{signal:auditController.signal});
   }catch(error){auditError=error;}
   finally{controller.signal.removeEventListener('abort',cancelAudit);}
   if(controller.signal.aborted)throw controller.signal.reason;
   if(auditError!==complete||callbacks!==1)throw auditError||Error('One-pair audit did not retire through its finally path');
   const after=sample(namespace[EVIDENCE]());if(!after.ready||after.metrics.denseBuffers!==0||after.metrics.denseBytes!==0||after.metrics.sharedSparseBytes!==98362125)failure('Explicit RGBA lease disposal not proved');
   lease={callbacks,decodedFrames:during.metrics.frameDecodes-before.metrics.frameDecodes,before,during,after,auditError:errorRecord(auditError),borrowedArraysRetained:false};
   return build('pass',{});
  }catch(error){return build(controller.signal.aborted&&!trigger&&controller.signal.reason?.name==='AbortError'?'cancelled':'failed',{failure:errorRecord(error)});}
  finally{finished=true;clearTimeout(timer);if(pollTimer!==null)clearTimeout(pollTimer);signal?.removeEventListener('abort',forward);}

  function build(result,extra){
   let payload=null,evidenceError=null;
   try{if(namespace){const e=namespace[EVIDENCE]();payload={...sample(e),source:e.source,resourceHashes:e.resourceHashes};}}catch(error){evidenceError=errorRecord(error);}
   if(evidenceError&&result==='pass')result='failed';
   const selected=loaded?.artistDelivery?.byMode?.reference;
   return {version:1,kind:'actual-browser-V5-lifecycle',case:caseName,status:result,projectUrl:base.href,descriptorUrl,fixtureModule:import.meta.url,elapsedMs:elapsed(),deadlineMs,
    imports:imports.map(r=>({...r})),pendingNativeImports:imports.filter(r=>r.completedMs===null).length,nativeNamespaceReturnedUnchanged:imports.some(r=>r.completedMs!==null),loadPending,observations,polls,trigger,
    loader:{status:loaded?.status||(loadError?'rejected':'unresolved'),error:errorRecord(loadError),fingerprint:selected?fingerprint(selected):null,metadata:selected?metadata(selected):null,
     failureCleanupScope:'Rejected loads expose no failure buffer counters/fingerprint; preserve the error tree and observable payload state, not invented internal counts.'},
    payload,evidenceError,lease,...extra,
    scope:'One fresh-document real strict-loader lifecycle audit. No renderer, raw hash re-audit, new data, acceptance receipt, quality or GPU/cost claim.',
    ownership:caseName==='success-lease'?'Shared verified packets remain document-owned; explicit audit finally disposes two CPU RGBA leases. Close this document to retire its module store.':'Observed staging cancellation requires zero shared/staged/dense ownership through three bounded late-settlement checks.',
    limits:'Cooperative 180s host deadline; native module loading/JS cannot be synchronously preempted. Explicit counters are not GC/RSS/GPU measurements.'};
  }
 };
}
