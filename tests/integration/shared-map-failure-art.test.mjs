import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSharedMapFailureArt} from '../../tools/review/shared-map-failure-art.mjs';

test('failure diagnostics wait for input stop and preserve the full read-only result',async()=>{
  const calls=[],diagnostics=Object.freeze({lights:Object.freeze({owned:6}),fire:Object.freeze({active:true})}),artifacts=[];let release;
  const stopped=new Promise(resolve=>{release=resolve;}),pending=captureSharedMapFailureArt({stop:()=>{calls.push('stop');return stopped;},readArt:()=>{calls.push('read');return diagnostics;},save:(name,value)=>{calls.push('save');artifacts.push({name,value});}});
  assert.deepEqual(calls,['stop']);release();await pending;assert.deepEqual(calls,['stop','read','save']);
  assert.equal(artifacts[0].name,'failure-art.json');assert.equal(artifacts[0].value.available,true);assert.equal(artifacts[0].value.diagnostics,diagnostics);
});

test('an absent visit diagnostic is recorded as unavailable without invented art data',async()=>{
  const artifacts=[];await captureSharedMapFailureArt({stop:async()=>{},readArt:()=>undefined,save:(name,value)=>artifacts.push({name,value})});
  assert.deepEqual(JSON.parse(JSON.stringify(artifacts)),[{name:'failure-art.json',value:{available:false}}]);
});

test('a diagnostic read failure is recorded without escaping or replacing the original outcome',async()=>{
  const artifacts=[],failure=Error('closed page');await assert.doesNotReject(captureSharedMapFailureArt({stop:async()=>{},readArt:()=>{throw failure;},save:(name,value)=>artifacts.push({name,value})}));
  assert.equal(artifacts[0].name,'failure-art-error.json');assert.equal(artifacts[0].value.stage,'read-art');assert.equal(artifacts[0].value.error,failure.stack);
});

test('a failed input stop skips the read and leaves cleanup to the caller',async()=>{
  const calls=[],artifacts=[];await captureSharedMapFailureArt({stop:()=>{calls.push('stop');throw Error('stop failed');},readArt:()=>{calls.push('read');},save:(name,value)=>artifacts.push({name,value})});
  assert.deepEqual(calls,['stop']);assert.equal(artifacts[0].value.stage,'stop');assert.equal(artifacts[0].name,'failure-art-error.json');
});

test('even failure of both artifact writes preserves the first error identity and caller finally cleanup',async()=>{
  const original=Error('original held-input failure'),calls=[];
  const run=async()=>{try{throw original;}catch(error){calls.push('first-finding');await captureSharedMapFailureArt({stop:()=>calls.push('stop'),readArt:()=>{calls.push('read');return {lights:6};},save:name=>{calls.push(name);throw Error('output unavailable');}});throw error;}finally{calls.push('dispose');}};
  await assert.rejects(run(),error=>error===original);assert.deepEqual(calls,['first-finding','stop','read','failure-art.json','failure-art-error.json','dispose']);
});
