import {measurementTrial,measurementQualityFixture} from '../fixtures/fire-profile.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createFireReviewEffect} from '../../src/art/fire-review-effect.js';
import {summarizeFireMeasurements} from '../../tools/fire-realism/profiling.js';
function burstFixture(){
  const texture=new T.Texture(),field={field:{value:texture},grid:{value:new T.Vector2(24,24)},cellSize:{value:.5}},scene=new T.Scene();
  const artist=(_T,{quality})=>({root:new T.Group(),update(){},reset(){},dispose(){},diagnostics:()=>({quality})});
  const effect=createFireReviewEffect(T,{flame:texture,smoke:texture,burst:texture},field,{renderer:{},scene,artistFactories:{reference:artist},initialMode:'reference'});
  const update=(tick,time,generation,events)=>effect.update({version:1,tick,cells:[],player:{x:2,y:5,tool:'matches',torch:{phase:'unlit',remainingSeconds:0}},world:{width:12,height:12,fireCellSize:.5,buildings:[],obstacles:[]},discharge:{active:false,rays:[]},clocks:{world:time,player:time},diagnostics:{generation},paused:false,events},time);
  return {effect,update,dispose(){effect.dispose();texture.dispose();}};
}
test('hostile round2: dated startup history stays suppressed; generation permits a genuinely fresh lower-ID burst once',()=>{
  const f=burstFixture();try{
    f.update(1,1,0,[{id:7,type:'barrel-explosion',worldTime:1,x:2,y:5}]);assert.equal(f.effect.diagnostics().legacyTransients.burstCards,0);
    f.update(2,3,1,[]);f.update(3,3.1,1,[{id:1,type:'molotov-impact',worldTime:3.1,x:2,y:5}]);
    assert.equal(f.effect.diagnostics().legacyTransients.burstCards,4);const count=f.effect.diagnostics().legacyTransients.eventCount;
    f.update(4,3.2,1,[{id:1,type:'molotov-impact',worldTime:3.1,x:2,y:5}]);assert.equal(f.effect.diagnostics().legacyTransients.burstCards,4);assert.equal(f.effect.diagnostics().legacyTransients.eventCount,count);
    f.update(5,4.7,1,[{id:1,type:'molotov-impact',worldTime:3.1,x:2,y:5}]);assert.equal(f.effect.diagnostics().legacyTransients.burstCards,0);
  }finally{f.dispose();}
});
const probeTrial=(mode,ms,burning,pose,forMode=mode)=>({mode,forMode,trialIndex:0,sampleFrames:3,rejected:[],gpu:[0,1,2].map(index=>({index,gpuMs:ms})),workloadTrace:[{poseFingerprint:pose,burning}]});
const {sourceFingerprints,referenceAcceptance,optimizedAcceptance}=measurementQualityFixture();

test('hostile round2: internally paired R128 and O1 cannot earn a lower-cost target',()=>{
  const trials=[probeTrial('reference',11,128,'large'),probeTrial('no-fire',1,128,'large','reference'),probeTrial('optimized',3,1,'small'),probeTrial('no-fire',1,1,'small','optimized')];
  const result=summarizeFireMeasurements({trials,modes:['reference','optimized'],sourceFingerprints,referenceAcceptance,optimizedAcceptance});
  assert.equal(result.comparison.targetMet,null);assert.ok(result.reasons.some(reason=>/cross.mode|cross-mode/i.test(reason)));
});

test('hostile round2: a fresh old-generation ID7 cannot suppress fresh ID1 after reset or replay on rewind',()=>{
  const f=burstFixture();try{
    f.update(1,1,0,[]);f.update(2,1.1,0,[{id:7,type:'barrel-explosion',worldTime:1.1,x:2,y:5}]);assert.equal(f.effect.diagnostics().legacyTransients.burstCards,4);
    f.update(3,3,1,[]);assert.equal(f.effect.diagnostics().legacyTransients.burstCards,0);
    f.update(4,3.1,1,[{id:1,type:'molotov-impact',worldTime:3.1,x:2,y:5}]);assert.equal(f.effect.diagnostics().legacyTransients.burstCards,4);
    f.update(1,.5,1,[{id:1,type:'molotov-impact',worldTime:.5,x:2,y:5}]);assert.equal(f.effect.diagnostics().legacyTransients.burstCards,0);
    f.update(2,.6,1,[{id:1,type:'molotov-impact',worldTime:.5,x:2,y:5},{id:2,type:'molotov-impact',x:2,y:5}]);assert.equal(f.effect.diagnostics().legacyTransients.burstCards,4);
  }finally{f.dispose();}
});
function equalTrials(){return [measurementTrial('reference',11),measurementTrial('no-fire',1,'reference'),measurementTrial('optimized',3),measurementTrial('no-fire',1,'optimized')];}
function summarize(trials,extra={}){return summarizeFireMeasurements({trials,modes:['reference','optimized'],sourceFingerprints,referenceAcceptance,optimizedAcceptance,...extra});}
test('hostile round2: complete equal inputs pass arithmetic while optimized geometry may differ',()=>{
  const trials=equalTrials();trials[0].effectOccupancyTrace=[{artistLayers:[{triangles:20000,instances:100}]}];trials[2].effectOccupancyTrace=[{artistLayers:[{triangles:1000,instances:10}]}];
  const result=summarize(trials);assert.deepEqual(result.reasons,[]);assert.equal(result.comparison.optimizedReferenceRatio,.2);assert.equal(result.comparison.targetMet,true);
});
test('hostile round2: cancellation or one complete set of a declared three-trial run cannot pass',()=>{
  const trials=equalTrials(),before=structuredClone(trials),cancelled=summarize(trials,{status:'cancelled'});
  assert.equal(cancelled.comparison.targetMet,null);assert.equal(cancelled.comparison.optimizedReferenceRatio,null);assert.deepEqual(trials,before);
  for(const trial of trials)trial.protocol.trials=3;
  const partial=summarize(trials);assert.equal(partial.comparison.targetMet,null);assert.match(partial.reasons.join(' '),/Incomplete|Missing/);
});
test('hostile round2: mismatched, malformed, empty and incomplete workload evidence is inconclusive',()=>{
  const mutations=[
    ['population',trials=>{for(const t of trials.slice(2)){t.pose.initialBurning=1;for(const s of t.workloadTrace)s.burning=1;}}],
    ['configuration',trials=>{for(const t of trials.slice(2))t.configuration.seed=9;}],
    ['camera',trials=>{for(const t of trials.slice(2))t.renderInputs.camera.matrixWorld[12]=3;}],
    ['mask',trials=>{for(const t of trials.slice(2))t.pose.sourceAppearance.field.data[0]=.8;}],
    ['source appearance',trials=>{for(const t of trials.slice(2))t.pose.sourceAppearance.housing.active=7;}],
    ['sample count',trials=>{trials[2].gpu.pop();}],
    ['duplicate GPU index',trials=>{trials[2].gpu[1].index=0;}],
    ['duplicate trial',trials=>{trials.push(structuredClone(trials[2]));}],
    ['missing trial',trials=>{trials.pop();}],
    ['mostly empty',trials=>{for(const t of trials){t.pose.initialBurning=0;for(const s of t.workloadTrace)s.burning=0;}}],
    ['missing configuration',trials=>{for(const t of trials)delete t.configuration;}],
    ['missing pose',trials=>{for(const t of trials)delete t.pose;}],
    ['missing workload sequence',trials=>{for(const t of trials)t.workloadTrace=[];}],
    ['invalid GPU shape',trials=>{trials[2].gpu={};}],
    ['zero GPU result',trials=>{trials[2].gpu[1].gpuMs=0;}],
    ['different clock',trials=>{for(const t of trials.slice(2)){t.pose.worldScale=.35;for(let i=0;i<t.workloadTrace.length;i++)t.workloadTrace[i].worldTime=1+(121+i)/60*.35;}}],
    ['different trial protocol',trials=>{trials[2].protocol.warmupFrames=121;}]
  ];
  for(const [name,mutate]of mutations){const trials=equalTrials();mutate(trials);const result=summarize(trials);assert.equal(result.evidenceStatus,'inconclusive',name);assert.equal(result.comparison.targetMet,null,name);assert.equal(result.comparison.optimizedReferenceRatio,null,name);assert.ok(result.reasons.length,name);}
});