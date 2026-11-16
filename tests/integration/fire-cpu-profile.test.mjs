import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeFireCpuProfile} from '../../tools/review/fire-cpu-profile.mjs';

test('CPU attribution selects sixty actual native intervals, excludes idle/duplicate time and separates self/inclusive P work',()=>{
  const node=(id,functionName,url,children=[])=>({id,callFrame:{functionName,url,lineNumber:0,columnNumber:0},children});
  const profile={startTime:1000000,nodes:[node(1,'root','',[2,3,6]),node(2,'physicalFrame','http://local/tinderbox/src/simulation/catalogue-thermal.js'),node(3,'update','http://local/tinderbox/src/art/index.js',[4]),node(4,'update','http://local/tinderbox/art/source/catalogue-modular/thermal-art.js',[5]),node(5,'connectGroup','http://local/tinderbox/art/source/furnished-house/presentation.js'),node(6,'idle','')],samples:[],timeDeltas:[]};
  const ranges=[];for(let i=0;i<60;i++){profile.samples.push(2,5,6);profile.timeDeltas.push(2000,3000,5000);ranges.push({primary:true,nativeTick:721+i,startMs:i*10,endMs:i*10+5});ranges.push({primary:false,nativeTick:721+i,startMs:i*10+5,endMs:i*10+10});}
  const result=summarizeFireCpuProfile(profile,ranges,1);assert.equal(result.selectedSamples,120);assert.equal(result.selectedAdvanceMs,300);assert.equal(result.sampledMs,300);
  assert.equal(result.categories.publication,120);assert.equal(result.categories.art,180);assert.equal(result.categories.nativeStructures,180);
  assert.equal(result.functions.find(f=>f.name==='connectGroup').PselfMs,180);assert.equal(result.functions.find(f=>f.name==='update'&&f.url==='src/art/index.js').PselfMs,0);assert.equal(result.functions.find(f=>f.name==='update'&&f.url==='src/art/index.js').PtotalMs,180);assert.ok(!result.functions.some(f=>f.name==='idle'));
  assert.throws(()=>summarizeFireCpuProfile(profile,ranges.slice(2),1),/exactly60/);
});
