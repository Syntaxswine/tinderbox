// Read-only source/archive/result audit. Never executes geometry or a compiler.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir='docs/engineering/shared-maps/regional-query-witness-v1/',base='68b6e3995bc4bad5f270275578a630fb2646c501',authority='54504bae';
const read=p=>fs.readFileSync(p),lf=p=>read(p).toString('utf8').replace(/\r\n/g,'\n'),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{windowsHide:true,maxBuffer:4*1024*1024}),lines=(...a)=>git(...a).toString('utf8').trim().split(/\r?\n/).filter(Boolean);
const owned=['src/runtime/regional-effective-query.js','tests/integration/regional-query-witness.test.mjs','docs/engineering/shared-maps/runtime-integration.json'],wip='docs/engineering/shared-maps/support-regions-proposal.md';
assert.equal(sha(read(wip)),'56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f');
const archives=[];
for(const [folder,commit]of [['bounded-source-compiler-v1','c66e659451284309e48dc420791369dd5af37e1e'],['bounded-source-compiler-guards-v1','882aed0c68508ef1e46f6815ef1db43969d11d6f'],['regional-query-kernel-v1','c9b02eb278854380cc41f1de77ed4b0c57e4dc47'],['regional-query-boundaries-v1',base]]){
  const path='docs/engineering/shared-maps/'+folder+'/manifest.json',manifest=json(path);assert.equal(sha(read(path)),sha(git('show',commit+':'+path)));let raw=1,source=0;
  for(const pin of manifest.files)if(pin.mode==='raw'){assert.equal(sha(read(pin.path)),pin.sha256,pin.path);raw++;}else{assert.equal(sha(git('show',commit+':'+pin.path).toString('utf8').replace(/\r\n/g,'\n')),pin.sha256);source++;}
  archives.push({folder,rawFilesIncludingManifest:raw,originalSourcePins:source,preserved:true});
}
const unchanged=['workbenches/furnished-house/geometry.js','src/runtime/collision.js','workbenches/furnished-house/scene.js','src/runtime/source-query-registry.js','src/runtime/native-query-registry.js','src/simulation/regional-source-pilot.js','tests/integration/regional-effective-query.test.mjs','tests/integration/regional-query-boundaries.test.mjs','tests/fixtures/regional-query-data.mjs'];
for(const path of unchanged)assert.equal(lf(path),git('show',base+':'+path).toString('utf8').replace(/\r\n/g,'\n'),path);
assert.equal(sha(read(dir+'authority-review.md')),sha(git('show',authority+':docs/reviews/2026-11-17-regional-query-kernel.md')));
const snapshots=[['review-additional.mjs.txt','e2725d4ede399985532123170108a7db42efe4706732b0d98608fc4569c341d3'],['review-additional-results.json','1f02c3eba92426fe0aa077c4d78bc78fd6151a57be6c062bd1a3aa2a694c7f20']];
for(const [path,hash]of snapshots)assert.equal(sha(read(dir+path)),hash,path);
for(const [name,passed,failed,code]of [['before',18,2,1],['final',20,0,0]]){
  const r=json(dir+'focused-'+name+'.json'),log=lf(dir+'focused-'+name+'.log');assert.equal(r.exitCode,code);assert.equal(r.signal,null);assert.equal(r.nativeCompilerCalls,0);assert.equal(r.worldTrials,0);assert.ok(log.includes('tests 20')&&log.includes('pass '+passed)&&log.includes('fail '+failed));
}
const original=json(dir+'review-additional-results.json'),current=json(dir+'additional-successor-results.json'),recheck=json(dir+'additional-launch.json');
assert.equal(original.commit,base);assert.equal(original.additionalCases,2);assert.equal(current.additionalCases,2);assert.equal(current.queryLfSha256,sha(lf(owned[0])));assert.equal(recheck.exitCode,0);assert.equal(recheck.signal,null);assert.equal(current.pid,recheck.pid);
assert.equal(current.results.length,2);for(let i=0;i<2;i++){assert.equal(original.results[i].regionalClear,false);assert.equal(original.results[i].ordinaryClear,true);const expected={...original.results[i],regionalClear:true};assert.deepEqual(current.results[i],expected);}
const saved=json(dir+'saved-first.json'),launch=json(dir+'saved-launch-first.json');
assert.equal(launch.exitCode,0);assert.equal(launch.signal,null);assert.equal(saved.complete,true);assert.equal(saved.firstFailure,null);assert.equal(saved.checks.length,239);assert.ok(saved.checks.every(c=>c.passed));assert.equal(saved.cleanup,true);assert.equal(saved.nativeCompilerCalls,0);assert.equal(saved.worldTrials,0);assert.equal(saved.worldSteps,0);assert.equal(saved.graphRebuilds,0);assert.equal(saved.proofReplay,false);
assert.deepEqual(saved.checks,json('docs/engineering/shared-maps/regional-query-boundaries-v1/saved-first.json').checks);
for(const pin of saved.inputs)assert.equal(sha(read(pin.path)),pin.sha256);
assert.deepEqual(fs.readdirSync(dir).filter(p=>/^saved-launch-.*\.json$/.test(p)),['saved-launch-first.json']);
const cleanup=json(dir+'cleanup.json');assert.equal(cleanup.processes.length,4);assert.ok(cleanup.processes.every(p=>p.pidAbsent&&p.verificationMethod.startsWith('Get-Process')));assert.deepEqual(cleanup.retainedHelpers,[]);assert.deepEqual(cleanup.portsAllocated,[]);
assert.ok(cleanup.supersedesUnverified.includes('CIM access denied'));for(const p of cleanup.processes){const receipt=json(dir+p.receipt);assert.equal(receipt.pid,p.pid);assert.equal(Date.parse(receipt.startedAt),Date.parse(p.startedAt));assert.equal(Date.parse(receipt.endedAt),Date.parse(p.endedAt));}
const declaration=json(owned[2]);assert.equal(declaration.runtimeFiles.length,22);assert.equal(declaration.addedFiles.length,48);assert.ok(declaration.addedFiles.some(f=>f.path===owned[0]&&f.lfSha256===sha(lf(owned[0]))));
const changed=[...new Set([...lines('diff','--name-only','HEAD'),...lines('ls-files','--others','--exclude-standard')])];assert.ok(changed.every(p=>p===wip||owned.includes(p)||p.startsWith(dir)));assert.ok(!lines('diff','--cached','--name-only').includes(wip));assert.ok(lines('diff','--name-only',base,'--','src','workbenches','tools').every(p=>p===owned[0]));
const module=lf(owned[0]);assert.ok(module.includes('BODY_EPS=1e-6,HALO=2*EPS'));assert.ok(!/compileScene|createTrial|createRenderer|createSourceSupportGraph/.test(module));assert.equal((module.match(/^import /gm)||[]).length,2);
const output={version:1,base,authority,passed:true,scope:'Scoped closed-body containment witnesses only',focused:{before:{passed:18,failed:2},final:{passed:20,failed:0}},exactAdditionalCases:2,savedArrayRuns:1,savedChecks:239,savedRecordsExactlyMatchPrior:true,nativeCompilerCalls:0,worldTrials:0,worldSteps:0,graphRebuilds:0,archives,unchangedExistingFiles:unchanged,sourcePins:owned.map(path=>({path,lfSha256:sha(lf(path))})),reviewSnapshotPins:snapshots.map(([path,rawSha256])=>({path:dir+path,rawSha256})),declaration:{modified:22,added:48},wipPreserved:true,helpers:[],ports:[],productionEnabled:false};
if(process.argv.includes('--check'))assert.deepEqual(json(dir+'verification.json'),output);else fs.writeFileSync(dir+'verification.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({passed:true,focused:20,additional:2,saved:239,savedRuns:1,oldRawFiles:archives.reduce((n,r)=>n+r.rawFilesIncludingManifest,0),historicalSourcePins:archives.reduce((n,r)=>n+r.originalSourcePins,0),unchanged:unchanged.length,nativeCompilerCalls:0,helpers:0}));
