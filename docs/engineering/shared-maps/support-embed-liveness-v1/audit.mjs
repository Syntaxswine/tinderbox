// Read-only source/result audit. Never imports a runtime or executes geometry.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir='docs/engineering/shared-maps/support-embed-liveness-v1/',base='f45f0c4eac03059634d164ce5941211c5ee32e3a';
const read=p=>fs.readFileSync(p),lf=p=>read(p).toString('utf8').replace(/\r\n/g,'\n'),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{windowsHide:true,maxBuffer:12*1024*1024}),gitLf=(ref,p)=>git('show',ref+':'+p).toString('utf8').replace(/\r\n/g,'\n'),lines=(...args)=>git(...args).toString('utf8').trim().split(/\r?\n/).filter(Boolean);
const owned=['src/simulation/original-support-ports.js','tests/integration/original-support-ports.test.mjs','tests/integration/original-support-embed.test.mjs','tests/integration/original-support-rooting.test.mjs','docs/engineering/shared-maps/runtime-integration.json'],wip='docs/engineering/shared-maps/support-regions-proposal.md';
assert.equal(sha(read(wip)),'56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f');
const archives=[];
for(const [folder,commit]of [['bounded-source-compiler-v1','c66e659451284309e48dc420791369dd5af37e1e'],['bounded-source-compiler-guards-v1','882aed0c68508ef1e46f6815ef1db43969d11d6f'],['regional-query-kernel-v1','c9b02eb278854380cc41f1de77ed4b0c57e4dc47'],['regional-query-boundaries-v1','68b6e3995bc4bad5f270275578a630fb2646c501'],['regional-query-witness-v1','e84ed22c43d99177848c6226ad25e8eaea9678e4'],['regional-receipt-bridge-v1','4eae509b41aba018da4dc42b63757338d6760324'],['support-port-birth-v1',base]]){
  const path='docs/engineering/shared-maps/'+folder+'/manifest.json',manifest=json(path);assert.equal(sha(read(path)),sha(git('show',commit+':'+path)));let raw=1,source=0;
  for(const pin of manifest.files){if(pin.mode==='raw'){assert.equal(sha(read(pin.path)),pin.sha256,pin.path);raw++;}else{assert.equal(sha(gitLf(commit,pin.path)),pin.sha256,pin.path);source++;}}
  archives.push({folder,rawFilesIncludingManifest:raw,historicalSourcePins:source,preserved:true});
}
assert.equal(archives.reduce((n,a)=>n+a.rawFilesIncludingManifest,0),215);assert.equal(archives.reduce((n,a)=>n+a.historicalSourcePins,0),32);
const unchanged=json('docs/engineering/shared-maps/support-port-birth-v1/verification.json').unchangedFiles;
assert.equal(unchanged.length,18);for(const path of unchanged)assert.equal(lf(path),gitLf(base,path),path);
assert.equal(lf(dir+'original-core-test.mjs.txt'),gitLf(base,owned[1]));
const fixtureComment='    // Explicit closed physical fixture bodies accompany the clipped exterior\n    // views. The core adds no closing faces or material to either remnant.\n';
assert.equal(lf(owned[1]).replace(fixtureComment,'').replace(',solidTriangles:boxTriangles(min,max)',''),gitLf(base,owned[1]),'Only closed material fixture input was added; all prior test groups/assertions remain');
const attempts=[['baseline',9,1,8],['rooting-baseline',4,1,3],['corrected',41,41,0],['joint-witness',44,44,0]];
for(const [name,total,passed,failed]of attempts){const record=json(dir+name+'.json'),log=lf(dir+name+'.log');assert.equal(record.exitCode,failed?1:0);assert.equal(record.signal,null);assert.equal(record.originalRoofCompilations,0);assert.equal(record.actualNewYorkDiagnostics,0);assert.equal(record.worldTrials,0);assert.equal(record.worldSteps,0);assert.deepEqual(record.ports,[]);assert.deepEqual(record.retainedHelpers,[]);for(const text of ['tests '+total,'pass '+passed,'fail '+failed])assert.ok(log.includes(text),name+' '+text);
  for(const pin of record.sourcePins){let text;if(name==='baseline'||name==='rooting-baseline'){text=pin.path===owned[0]?gitLf(base,pin.path):pin.path===owned[2]?lf(dir+'first-correction-embed.test.mjs.txt'):lf(pin.path);}else if(name==='corrected'){text=pin.path===owned[0]?lf(dir+'first-correction-core.js.txt'):pin.path===owned[2]?lf(dir+'first-correction-embed.test.mjs.txt'):lf(pin.path);}else text=lf(pin.path);assert.equal(sha(text),pin.lfSha256,name+' '+pin.path);}
}
const cleanup=json(dir+'cleanup.json');assert.equal(cleanup.processes.length,4);assert.ok(cleanup.processes.every(p=>p.pidAbsent));assert.deepEqual(cleanup.retainedHelpers,[]);assert.deepEqual(cleanup.portsAllocated,[]);
for(const p of cleanup.processes){const record=json(dir+p.receipt);assert.equal(p.pid,record.pid);assert.equal(Date.parse(p.startedAt),Date.parse(record.startedAt));assert.equal(Date.parse(p.endedAt),Date.parse(record.endedAt));}
const boundary=json(dir+'boundary.json');assert.equal(boundary.base,base);assert.equal(boundary.actualNewYorkDiagnostics,0);assert.equal(boundary.actualDiagnosticAllowanceConsumed,false);assert.equal(boundary.nativeCompilerCalls,0);assert.equal(boundary.originalRoofCompilations,0);assert.equal(boundary.sourceCatalogueBound,false);
for(const pin of boundary.originalEvidence)assert.equal(sha(read(dir+pin.snapshot)),pin.rawSha256,pin.snapshot);
const ui=json(dir+'ui-verification.json');assert.equal(ui.candidate,base);assert.equal(ui.coreSha256,sha(gitLf(base,owned[0])));assert.equal(sha(read(dir+'architect-repro.mjs.txt')),ui.architectEmbedEvidence[0].sha256);assert.equal(sha(read(dir+'architect-repro.json')),ui.architectEmbedEvidence[1].sha256);
assert.equal(json(dir+'ui-crafted-results.json').results.filter(r=>r.bugReproduced).length,2);
assert.ok(!fs.existsSync('src/content/original-support-adapters.js'));assert.ok(!fs.existsSync('tests/integration/original-support-adapters.test.mjs'));
const declaration=json(owned[4]);assert.equal(declaration.runtimeFiles.length,22);assert.equal(declaration.addedFiles.length,50);assert.ok(declaration.addedFiles.some(f=>f.path===owned[0]&&f.lfSha256===sha(lf(owned[0]))));
const changed=[...new Set([...lines('diff','--name-only','HEAD'),...lines('ls-files','--others','--exclude-standard')])];assert.ok(changed.every(p=>p===wip||owned.includes(p)||p.startsWith(dir)));assert.ok(!lines('diff','--cached','--name-only').includes(wip));assert.ok(lines('diff','--name-only',base,'--','src','workbenches','tools').every(p=>p===owned[0]));
const result={version:1,base,status:'Three bounded core corrections; source adapter and actual New York diagnostic remain incomplete',focusedTests:44,embedGroups:12,rootingGroups:4,priorPhysicalGroups:8,unchangedQueryControls:20,archives,unchangedFiles:unchanged,sourcePins:owned.map(path=>({path,lfSha256:sha(lf(path))})),runtimeDeclaration:{modified:22,added:50},preservedAdapterWip:true,protectedProposalWip:true,closedTestChildren:4,helpers:[],ports:[],nativeCompilerCalls:0,originalRoofCompilations:0,actualNewYorkDiagnostics:0,actualDiagnosticAllowanceConsumed:false,sourceCatalogueBound:false,productionEnabled:false};
if(process.argv.includes('--check'))assert.deepEqual(json(dir+'verification.json'),result);else fs.writeFileSync(dir+'verification.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({focusedPassed:44,oldRawFiles:215,historicalSourcePins:32,unchangedHelpers:18,actualNewYorkDiagnostics:0,helpers:0}));
