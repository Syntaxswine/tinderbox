import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveTrace,LIVE_FRAME_COLUMNS} from '../../tools/fire-realism/live-trace.js';
import {runFiniteCadenceCases,CADENCE_CONFIG} from '../../workbenches/runtime/fire-v5-live-cadence/experiment.js';

// Public-API witness adapted from the independent UI source342ade50...ef65d.
// Original exact source/output are preserved in QA; no browser or encoding.
function earlyFixture(){
 let ms=0,config={...CADENCE_CONFIG,viewport:{...CADENCE_CONFIG.viewport},mode:'reference'},frame=0,phase='ready',trace=null;
 const state=()=>({configuration:structuredClone(config),frameIndex:frame,tick:frame,worldTime:frame/60,playerTime:frame/60,phase,...(trace?{liveTrace:trace.summary()}:{})});
 function endEarly(){ms+=2500;frame=150;trace.frame(LIVE_FRAME_COLUMNS.slice(0,-1).map(k=>({frameAfter:150,tickAfter:150,worldAfter:2.5,playerAfter:2.5,draws:1}[k]??0)),ms);trace.stop('complete','paused-before-redraw',{frameIndex:frame,tick:frame,worldTime:2.5,playerTime:2.5});phase='ready';}
 const driver={state,startLiveTrace(options){trace=createLiveTrace({...options,now:()=>ms});return trace.summary();},finishLiveTrace(options={}){if(trace.active)trace.stop(options.status||'complete',options.reason||'explicit-finish',state());return trace.evidence();}};
 const binding={async intent(c){if(c.type==='configure')config=structuredClone(c.patch);if(c.type==='reset'){frame=0;phase='ready';}if(c.type==='play'||c.type==='record')phase='playing';if(c.type==='pause'){trace?.stop('complete','paused-before-redraw',state());phase='ready';}},async motionEvidence(){endEarly();return {status:'complete',reason:'manual',recording:{nominalStopAfterMs:10000,stopRequestedAfterMs:2500,wallDurationMs:2504,maximumDurationMs:10000,requestedCaptureFps:60}};}};
 return {driver,binding,now:()=>ms,capture:()=>({camera:{matrixWorld:[1],projectionMatrix:[2]},hardware:{canvas:{drawingBufferWidth:1280,drawingBufferHeight:800}},sourceFingerprints:{scope:'Synthetic witness only'}}),waitDuration:async()=>{await Promise.resolve();endEarly();ms+=7500;}};
}
test('independent2500ms/tick150 witness is rejected even after the off timer finishes10000ms',async()=>{
 const report=await runFiniteCadenceCases(earlyFixture());assert.equal(report.status,'failed');assert.equal(report.runs.length,1);const run=report.runs[0];assert.equal(run.trace.endedMs-run.trace.startedMs,2500);assert.equal(run.trace.endpoint.tick,150);assert.equal(run.trace.status,'complete','ordinary early Pause remains honestly complete');assert.equal(run.error.code,'CADENCE_STOP_INVALID');assert.match(run.error.message,/already paused/);assert.equal(run.offStop.actualRequestMs,10000);
});
