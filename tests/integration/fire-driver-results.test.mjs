import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('a valid second measurement drops old report arrays while invalid requests and new partial exports retain their correct evidence',()=>{
 const fixture=fileURLToPath(new URL('../fixtures/fire-driver-results.mjs',import.meta.url));
 const result=spawnSync(process.execPath,['--experimental-vm-modules',fixture],{cwd:process.cwd(),encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:4*1024*1024});
 assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
 const receipt=JSON.parse(result.stdout);assert.equal(receipt.gpuEvidence,false);assert.equal(receipt.priorRawSamples,512);assert.equal(receipt.newCancelledRawSamples,32);assert.equal(receipt.archivedReportUnchanged,true);assert.equal(receipt.queriesRemaining,0);assert.deepEqual(receipt.retainedHelpers,[]);
});
