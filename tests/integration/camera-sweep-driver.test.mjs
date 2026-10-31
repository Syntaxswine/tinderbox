import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {waitForFireApi} from '../fixtures/fire-api-wait.mjs';
test('actual driver keeps frozen/live native scenes and current-camera packets with one RAF, cost locks and bounded cleanup',()=>{
 const result=spawnSync(process.execPath,['--experimental-vm-modules',fileURLToPath(new URL('../fixtures/fire-camera-sweep.mjs',import.meta.url))],{cwd:process.cwd(),encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:1024*1024});assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr+'\n'+result.stdout);const receipt=JSON.parse(result.stdout);assert.equal(receipt.gpuEvidence,false);assert.equal(receipt.unverifiedReferenceRejected,true);assert.equal(receipt.apiSupportOverride,true);assert.ok(receipt.unverifiedSourceChecks>1);assert.equal(receipt.pausedRawSnapshotExact,true);assert.equal(receipt.pausedContactDraws,80);assert.equal(receipt.pausedStreetDraws,8);assert.ok(receipt.cameraPacketsChecked>80);assert.equal(receipt.noSweepAdvancesInGpuProtocol,true);assert.equal(receipt.artCreated,receipt.artDisposed);assert.deepEqual(receipt.retainedHelpers,[]);
});


test('finite fixture wait permits native asynchronous work while its fake RAF clock advances independently',async()=>{
 const expected=await crypto.subtle.digest('SHA-256',new Uint8Array([2,7,9]));
 let fakeNow=0,frames=0;
 const pending=(async()=>{await delay(40);return crypto.subtle.digest('SHA-256',new Uint8Array([2,7,9]));})();
 const actual=await waitForFireApi(pending,{operation:'delayed real fingerprint',timeoutMs:1000,
  pump(){fakeNow+=10000;frames++;},diagnostics(){return {fakeNow,frames};}});
 assert.deepEqual(new Uint8Array(actual),new Uint8Array(expected));
 assert.ok(frames>0,'The existing frame pump remains active while real asynchronous work is pending');
 assert.ok(fakeNow>1000,'Advancing the fake driver clock must not expire the real wall deadline');
});

test('finite fixture wait rejects a genuine stall with bounded operation and pending-state diagnostics',async()=>{
 const pendingState={phase:'measuring',progress:{mode:'current',phase:'warmup'},callbacks:1,queries:2};
 let pumps=0;
 await assert.rejects(waitForFireApi(new Promise(()=>{}),{operation:'stalled current-mode measurement',timeoutMs:25,
  pump(){pumps++;},diagnostics:()=>pendingState}),error=>{
   assert.equal(error.code,'ERR_FIRE_FIXTURE_TIMEOUT');
   assert.equal(error.diagnostic.operation,'stalled current-mode measurement');
   assert.equal(error.diagnostic.timeoutMs,25);assert.ok(error.diagnostic.elapsedMs>=25);
   assert.equal(error.diagnostic.polls,pumps);assert.deepEqual(error.diagnostic.pending,pendingState);
   assert.match(error.message,/stalled current-mode measurement/);assert.match(error.message,/"queries":2/);
   return true;
  });
});

test('finite fixture wait preserves the actual API rejection without inventing a timeout',async()=>{
 const failure=new Error('Explicit API rejection');let pumps=0;
 await assert.rejects(waitForFireApi(Promise.reject(failure),{operation:'rejected API',
  pump(){pumps++;},diagnostics:()=>({})}),error=>error===failure);
 assert.equal(pumps,0);
});
