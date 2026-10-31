import test from 'node:test';
import assert from 'node:assert/strict';
import {bindReviewDriver,createCanvasMotionRecorder} from '../../workbenches/fire-realism/review.js';

// Actual binding/recorder functions; only DOM/encoding/driver are API fixtures.
class Recorder extends EventTarget{static isTypeSupported(t){return t==='video/webm;codecs=vp9';}constructor(_stream,options){super();this.state='inactive';this.mimeType=options.mimeType;}start(){this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>{const e=new Event('dataavailable');e.data=new Blob(['abc'],{type:this.mimeType});this.dispatchEvent(e);this.dispatchEvent(new Event('stop'));});}}
class Reader extends EventTarget{readAsDataURL(blob){this.result='data:'+blob.type+';base64,YWJj';queueMicrotask(()=>this.dispatchEvent(new Event('load')));}abort(){this.dispatchEvent(new Event('abort'));}}
async function exercise(thrown,diagnosticTiming=true){
 let armed=false,pauseCalls=0,trackStops=0,probeReads=0,phase='ready',tick=0;
 const canvas={captureStream(){return {getTracks:()=>[{stop(){trackStops++;}}]};}},doc={defaultView:{MediaRecorder:Recorder},addEventListener(){},removeEventListener(){}},shell={renderRoot:{ownerDocument:doc,querySelector:()=>canvas},uiRoot:{},update(){},clearMotionEvidence(){}};
 const state=()=>{if(armed&&phase==='playing'){armed=false;probeReads++;throw thrown;}return {phase,frameIndex:tick,tick,worldTime:tick/60,playerTime:tick/60,configuration:{mode:'reference'},availability:{reference:{available:true}},cameraSweep:{supported:false},workload:{}};};
 const binding=await bindReviewDriver({shell,diagnosticTiming,FileReaderCtor:Reader,createMotionRecorder:options=>{const actual=createCanvasMotionRecorder(options);return {...actual,stop(reason){armed=true;return actual.stop(reason);}};},createDriver:async options=>({state,captureFrame:()=>({dataUrl:'data:image/jpeg;base64,AA==',hardware:{},sourceFingerprints:{scope:'synthetic'}}),play(){phase='playing';tick++;options.onChange(state());},pause(){phase='ready';pauseCalls++;tick++;options.onChange(state());},async dispose(){}})});
 try{await binding.intent({type:'record'});await binding.intent({type:'stop-record'});const result=await binding.motionEvidence();assert.equal(result.status,'complete');assert.equal(phase,'ready');assert.equal(pauseCalls,1);assert.equal(trackStops,1);assert.equal(probeReads,diagnosticTiming?1:0);return result;}
 finally{await binding.dispose();assert.equal(trackStops,1);}
}
const cases=[['null',()=>null],['undefined',()=>undefined],['string',()=>'thrown text'],['number',()=>17],['bigint',()=>9n],['symbol',()=>Symbol('probe')],['name getter',()=>Object.defineProperty({},'name',{get(){throw Error('name getter');}})],['message getter',()=>Object.defineProperty({},'message',{get(){throw Error('message getter');}})],['toString',()=>({toString(){throw Error('toString');}})],['proxy',()=>new Proxy({},{get(){throw Error('proxy');}})]];
for(const [label,value]of cases)test('stop provenance cannot interrupt Pause/cleanup for thrown '+label,async()=>{
 const result=await exercise(value()),error=result.diagnosticTiming.stopProvenance.error;assert.equal(typeof error.name,'string');assert.equal(typeof error.message,'string');assert.ok(error.name.length<=128&&error.message.length<=4096);assert.equal(result.diagnosticTiming.stopProvenance.reason,'manual');
 if(['name getter','message getter','toString','proxy'].includes(label))assert.equal(error.message,'Stop provenance observation failed; thrown value could not be normalized.');
});
test('default-off recorder performs no stop observation and keeps ordinary manual semantics',async()=>{const result=await exercise(null,false);assert.equal(result.reason,'manual');assert.equal(Object.hasOwn(result,'diagnosticTiming'),false);});
