import test from 'node:test';
import assert from 'node:assert/strict';
import {createV5BrowserLifecycleAudit} from '../../workbenches/runtime/fire-v5-browser-lifecycle/audit.js';

const projectUrl='https://lifecycle.invalid/game/',entry=projectUrl+'assets/art/fire-realism/fluid-contact-surface/index.js';
const RAW='dc257c0200ea12dcea9c48fdf711cb33e6de62ab989732c731cdd7099f16a4ce';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// Explicitly synthetic host-protocol tests. These do NOT stand in for the
// architect's real browser/strict-loader/193-frame asset lifecycle evidence.
function harness(mode='staging'){
 const state={ready:false,metrics:{preparations:0,inflations:0,verifiedScalars:0,sharedSparseBytes:0,stagedSparseBytes:0,denseBuffers:0,denseBytes:0,peakDenseBytes:0,frameDecodes:0}};
 const calls={imports:0,evidence:0,cleanup:0,audit:0,namespaceSame:false},selected={};
 const reset=()=>{state.ready=false;state.metrics.sharedSparseBytes=state.metrics.stagedSparseBytes=state.metrics.denseBuffers=state.metrics.denseBytes=0;};
 const evidence=()=>{calls.evidence++;return {version:2,format:'FZP2',frames:193,scalarRecords:579,chunks:193,...structuredClone(state),source:{rawManifestSha256:RAW},verifiedScalars:[],resourceHashes:[]};};
 const namespace={fluidSurfaceContactPayloadEvidence:evidence,async auditFluidSurfaceContactRGBA(callback,{signal}){
  calls.audit++;state.metrics.denseBuffers=2;state.metrics.denseBytes=state.metrics.peakDenseBytes=mode==='bad-slots'?3538944:7077888;state.metrics.frameDecodes+=2;
  try{await callback({frame:1,timeSeconds:0,resolution:[48,48,96],rgba:new Uint8Array(3538944)});if(signal.aborted)throw signal.reason;}
  finally{if(mode!=='leak-slots')state.metrics.denseBuffers=state.metrics.denseBytes=0;}
 }};
 const createLoader=()=>async options=>{
  if(options.signal.aborted)throw options.signal.reason;
  if(mode==='preimport-failure')throw Error('Synthetic verification rejection');
  const observed=await options.importModule(entry);calls.namespaceSame=observed===namespace;
  assert.equal(calls.namespaceSame,true,'host returns native-import dependency namespace unchanged');
  state.metrics.preparations=1;
  if(['success','bad-slots','leak-slots','complete-too-soon'].includes(mode)){
   state.ready=true;state.metrics.sharedSparseBytes=98362125;state.metrics.verifiedScalars=579;
   return {status:'configured',artistDelivery:{byMode:{reference:selected}}};
  }
  state.metrics.stagedSparseBytes=98362125;state.metrics.verifiedScalars=mode==='zero-verified'?0:1;
  if(mode==='ready-pending'){state.ready=true;state.metrics.stagedSparseBytes=0;}
  return new Promise((resolve,reject)=>{
   options.signal.addEventListener('abort',()=>{
    calls.cleanup++;reset();
    if(mode==='resurrect')setTimeout(()=>{state.ready=true;state.metrics.sharedSparseBytes=1;},5);
    reject(mode==='cleanup-error'?new AggregateError([options.signal.reason,Error('Synthetic cleanup exception')],'Synthetic load and cleanup failed'):options.signal.reason);
   },{once:true});
  });
 };
 const deps={createLoader,nativeImport:async url=>{assert.equal(url,entry);calls.imports++;return namespace;},fingerprint:r=>r===selected?{mode:'reference',sourceCommit:'d'.repeat(40),factoryModule:'assets/art/fire-realism/fluid-contact-surface/index.js',factoryExport:'createFluidSurfaceContactReference',prepareExport:'prepareFluidSurfaceContactData'}:null,metadata:r=>r===selected?{scope:'synthetic issued metadata'}:null,deadlineMs:['zero-verified','ready-pending'].includes(mode)?35:1000};
 return {state,calls,run:createV5BrowserLifecycleAudit(deps)};
}

test('observed staging aborts pending load; exact namespace and zero ownership persist after retirement',async()=>{
 const h=harness(),r=await h.run({projectUrl});
 assert.equal(r.status,'pass');assert.equal(h.calls.imports,1);assert.equal(h.calls.cleanup,1);assert.equal(h.calls.namespaceSame,true);
 assert.equal(r.trigger.loadPending,true);assert.equal(r.trigger.ready,false);assert.ok(r.trigger.metrics.stagedSparseBytes>0);assert.ok(r.trigger.metrics.verifiedScalars>=1);
 assert.equal(r.loader.error.name,'AbortError');assert.equal(r.loader.fingerprint,null);assert.equal(r.loader.metadata,null);assert.equal(r.late.length,3);
 for(const s of [r.immediate,...r.late,r.payload])assert.deepEqual([s.ready,s.metrics.sharedSparseBytes,s.metrics.stagedSparseBytes,s.metrics.denseBuffers,s.metrics.denseBytes],[false,0,0,0,0]);
 const count=h.calls.evidence;await wait(35);assert.equal(h.calls.evidence,count,'polling is retired');
 await assert.rejects(h.run({projectUrl}),/fresh document/);
});

test('pre-import failure cannot become a staged cancellation proof',async()=>{
 const h=harness('preimport-failure'),r=await h.run({projectUrl});assert.equal(r.status,'failed');assert.equal(h.calls.imports,0);assert.equal(r.trigger,null);assert.equal(r.payload,null);assert.equal(r.nativeNamespaceReturnedUnchanged,false);assert.match(r.loader.error.message,/verification rejection/);
});

test('zero verified scalars and already-ready pending state both fail the staging gate at the finite deadline',async()=>{
 for(const mode of ['zero-verified','ready-pending']){const h=harness(mode),r=await h.run({projectUrl});assert.equal(r.status,'failed');assert.equal(r.trigger,null);assert.equal(r.loader.error.name,'TimeoutError');assert.equal(h.calls.cleanup,1);}
});

test('completed preparation cannot be relabelled as cancellation',async()=>{
 const h=harness('complete-too-soon'),r=await h.run({projectUrl});assert.equal(r.status,'failed');assert.equal(r.trigger,null);assert.equal(r.payload.ready,true);assert.equal(h.calls.cleanup,0);
});

test('cleanup exceptions and late resurrection remain failed evidence',async()=>{
 const a=harness('cleanup-error'),r=await a.run({projectUrl});assert.equal(r.status,'failed');assert.equal(r.loader.error.name,'AggregateError');assert.match(r.loader.error.errors[1].message,/cleanup exception/);
 const b=harness('resurrect'),s=await b.run({projectUrl});assert.equal(s.status,'failed');assert.match(s.failure.message,/resurrected/);assert.equal(s.payload.ready,true);
});

test('success uses one real API-shaped pair callback and explicit finally disposal, retaining no raw view',async()=>{
 const h=harness('success'),r=await h.run({projectUrl,caseName:'success-lease'});
 assert.equal(r.status,'pass');assert.equal(h.calls.audit,1);assert.equal(r.lease.callbacks,1);assert.equal(r.lease.decodedFrames,2);assert.equal(r.lease.during.metrics.denseBuffers,2);assert.equal(r.lease.during.metrics.denseBytes,7077888);
 assert.equal(r.lease.after.metrics.denseBytes,0);assert.equal(r.lease.after.metrics.sharedSparseBytes,98362125);assert.equal(r.lease.borrowedArraysRetained,false);assert.equal(r.loader.fingerprint.factoryExport,'createFluidSurfaceContactReference');
 const visit=value=>{assert.ok(!(value instanceof ArrayBuffer)&&!ArrayBuffer.isView(value));if(value&&typeof value==='object')Object.values(value).forEach(visit);};visit(r);
});

test('one slot or a leaked lease cannot pass the explicit two-slot disposal gate',async()=>{
 for(const mode of ['bad-slots','leak-slots']){const h=harness(mode),r=await h.run({projectUrl,caseName:'success-lease'});assert.equal(r.status,'failed');}
});

test('caller cancellation before import stays cancelled, and invalid case/deadline cannot run',async()=>{
 const h=harness(),controller=new AbortController();controller.abort(new DOMException('Synthetic caller cancelled','AbortError'));const r=await h.run({projectUrl,signal:controller.signal});assert.equal(r.status,'cancelled');assert.equal(h.calls.imports,0);
 await assert.rejects(harness().run({projectUrl,caseName:'unknown'}),/Unknown lifecycle/);assert.throws(()=>createV5BrowserLifecycleAudit({deadlineMs:180001}),/at most 180/);
});
