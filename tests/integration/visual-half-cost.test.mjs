import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSimulation} from '../../src/simulation/index.js';
import {currentVisualWorkload,distribution,summarizeVisualRows,summarizeVisualProfile,validateVisualControls,validateMovingBodyRows,validateMatureBodyFrame} from '../../tools/review/visual-half-cost-metrics.mjs';

test('optional publication observation preserves complete tiny-world state through input, pause and reset',()=>{
  const observed=[],plain=createSimulation({scenario:'tiny',seed:1893,characterId:'goat'}),profiled=createSimulation({scenario:'tiny',seed:1893,characterId:'goat',onPublicationProfile:row=>observed.push(row)});
  try{assert.deepEqual(profiled.snapshot(),plain.snapshot());for(const command of [{type:'move',x:.1,y:0},{type:'pause',paused:true},{type:'pause',paused:false},{type:'reset'},{type:'select-tool',tool:'torch'}]){assert.equal(plain.dispatch(command),true);assert.equal(profiled.dispatch(command),true);const a=plain.advance(1/60),b=profiled.advance(1/60);assert.deepEqual(b,a);const row=observed.at(-1);assert.equal(row.tick,b.tick);assert.equal(row.generation,b.diagnostics.generation);assert.equal(row.publicationMs,row.endMs-row.startMs);assert.ok(row.publicationMs>=0);assert.deepEqual(Object.keys(row),['tick','generation','startMs','endMs','publicationMs']);}assert.equal(observed.length,6);}finally{plain.dispose();profiled.dispose();}assert.throws(()=>profiled.snapshot(),/disposed/);assert.equal(observed.length,6);
});
test('M30 takes only compatible commands and windows, excluding historical states, endpoints and budgets',()=>{
  const input=JSON.parse(fs.readFileSync('tools/review/fire-half-cost-inputs.json')),work=currentVisualWorkload(input);assert.equal(work.commands.length,309);assert.equal(work.lastHostTick,1620);assert.equal(work.sourceRecording,undefined);assert.equal(work.primary,undefined);assert.equal(work.meanBudget,undefined);work.commands[0].tool='changed';assert.notEqual(work.commands[0].tool,input.commands[0].tool);input.commands[0].tool='changed';assert.throws(()=>currentVisualWorkload(input),/INPUT_PREFIX_HASH/);
});
function row(frame,{publicationMs=1,artMs=2,renderSubmitMs=3,newNative=true,window='quiet'}={}){return {frame,window,newNative,publicationMs,artMs,renderSubmitMs,physicalNestedMs:999,rasterNestedMs:999,gpuMs:4,fullFrameCpuMs:20,simulationMs:10,drawCalls:100,triangles:1000,sourceCount:10};}
test('all displayed frames and native subsets remain separate; percentiles use framewise sequential sums once',()=>{
  const rows=[row(1,{publicationMs:0,artMs:100,renderSubmitMs:5}),row(2,{publicationMs:100,artMs:0,renderSubmitMs:5,newNative:false})],s=summarizeVisualRows(rows);assert.equal(s.allDisplayed.visualCpu.mean,105);assert.equal(s.allDisplayed.visualCpu.p95,105);assert.equal(s.newNative.frames,1);assert.equal(s.betweenNative.frames,1);assert.equal(s.windows.quiet.allDisplayed.frames,2);assert.equal(s.windows.quiet.newNative.frames,1);assert.equal(distribution([1,2,100]).max,100);assert.throws(()=>summarizeVisualRows([rows[1]]),/MISSING_DISPLAYED_FRAME/);assert.throws(()=>summarizeVisualRows([{...rows[0],gpuMs:null}]),/NONFINITE_TIMING/);
});
test('visual control rejection is named and does not substitute a historic fire trajectory',()=>{
  const rows=Array.from({length:60},(_,i)=>({...row(i+1),newNative:i%2===1,grassCells:1,groundFlames:0,paused:false,dropped:0}));assert.throws(()=>validateVisualControls(rows),/DENSE_NEW_NATIVE_COUNT/);
});
test('mixed body interval reports true overlap and rejects no overlap, no movement or invalid clocks',()=>{
  const rows=Array.from({length:24},(_,i)=>({hostTick:77+i,worldTime:i/60,playerX:1-i*.0225,playerZ:0,playerMoving:true,playerBurning:i<4,paused:false,dropped:0}));
  const result=validateMovingBodyRows(rows);assert.equal(result.movingActiveFrames,4);assert.equal(result.durationSeconds,.05);assert.ok(result.overlapTravelXZ>.06);
  assert.throws(()=>validateMovingBodyRows(rows.map(r=>({...r,playerBurning:false}))),/MOVING_BURNING_BODY_CONTROL/);
  assert.throws(()=>validateMovingBodyRows(rows.map(r=>({...r,playerX:1,playerMoving:false}))),/BODY_MOVEMENT_CONTROL/);
  assert.throws(()=>validateMovingBodyRows(rows.map((r,i)=>({...r,dropped:i===2?.1:0}))),/BODY_CLOCK_CONTROL/);
});
test('mature appearance requires actual contact age, player splats and all binding/legacy controls',()=>{
  const value={player:{id:'hero',characterFire:{active:true,age:.5}},art:{fire:{actorFlameCards:0,characterShroud:{activeIds:['hero'],flameSplats:2,smokeSplats:1,missingBindingIds:[],invalidIds:[],hiddenIds:[],cappedIds:[],unpublishedIds:[]}}}};
  validateMatureBodyFrame(value);assert.throws(()=>validateMatureBodyFrame({...value,player:{...value.player,characterFire:{active:true,age:.1}}}),/MATURE_BODY_CONTACT/);
  const bad=structuredClone(value);bad.art.fire.characterShroud.hiddenIds=['hero'];assert.throws(()=>validateMatureBodyFrame(bad),/MATURE_BODY_hiddenIds/);
});
test('sampling profiles every displayed frame as well as the native subset, including submission and non-fire work',()=>{
  const node=(id,name,children=[])=>({id,callFrame:{functionName:name,url:'http://local/tinderbox/renderer.js',lineNumber:0,columnNumber:0},children}),profile={startTime:1000000,nodes:[node(1,'root',[2]),node(2,'render')],samples:Array(20).fill(2),timeDeltas:Array(20).fill(1000)},ranges=[{newNative:true,startMs:0,endMs:10,publicationRange:[0,2],artRange:[2,5],submissionRange:[5,9]},{newNative:false,startMs:10,endMs:20,publicationRange:[10,12],artRange:[12,15],submissionRange:[15,19]}];
  const all=summarizeVisualProfile(profile,ranges,1),native=summarizeVisualProfile(profile,ranges,1,{newNativeOnly:true});assert.equal(all.intervals,2);assert.equal(all.sampledMs,20);assert.deepEqual(all.categories,{publication:4,art:6,submission:8,otherFrameCpu:2});assert.equal(native.intervals,1);assert.equal(native.sampledMs,10);assert.equal(all.hottestSelf[0].name,'render');assert.equal(all.hottestSelf[0].selfMs,20);
});
