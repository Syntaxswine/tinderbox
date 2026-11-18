// Compact delta/evidence validation only. No expansion, tests or native work.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir='docs/engineering/shared-maps/contact-endpoint-bounds-v1/',base='11bf4636c0b1beacdb2fdb91b95a1fb54c367b04';
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(dir+p)),sha=b=>createHash('sha256').update(b).digest('hex'),lf=b=>Buffer.from(b.toString().replace(/\r\n/g,'\n'));
const git=(...args)=>execFileSync('git',args,{windowsHide:true,maxBuffer:16*1024*1024}),lines=b=>b.toString().trim().split(/\r?\n/).filter(Boolean);
const owned=['src/content/original-contact-adapter.js','tests/integration/original-contact-adapter.test.mjs','tests/integration/contact-endpoint-bounds.test.mjs','docs/engineering/shared-maps/runtime-integration.json'],protectedPath='docs/engineering/shared-maps/support-regions-proposal.md';
assert.equal(sha(read(protectedPath)),'56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f');
const changed=lines(git('diff','--name-only',base)),untracked=lines(git('ls-files','--others','--exclude-standard'));
assert.deepEqual(changed.filter(p=>!owned.includes(p)&&!p.startsWith(dir)),[protectedPath]);assert.deepEqual(untracked.filter(p=>!owned.includes(p)&&!p.startsWith(dir)),[]);
assert.deepEqual(lines(git('diff','--cached','--name-only')).filter(p=>!owned.includes(p)&&!p.startsWith(dir)),[]);
const baseline=json('baseline.json'),affected=json('affected.json'),corrected=json('corrected.json'),uiRun=json('ui-run.json');
function pinsMatch(receipt,oldRuntime=false,oldTest=false){for(const p of receipt.sourcePins){const bytes=oldRuntime&&p.path==='src/content/original-contact-adapter.js'?git('show',base+':'+p.path):oldTest&&p.path==='tests/integration/contact-endpoint-bounds.test.mjs'?read(dir+'first-endpoint-test.mjs.txt'):read(p.path);assert.equal(sha(lf(bytes)),p.lfSha256,p.path);}}
pinsMatch(baseline,true,true);pinsMatch(affected,false,true);pinsMatch(corrected);pinsMatch(uiRun);
assert.equal(baseline.exitCode,1);assert.equal(affected.exitCode,1);assert.equal(corrected.exitCode,0);assert.equal(uiRun.exitCode,0);
function totals(name,tests,pass,fail){const s=read(dir+name+'.log').toString();for(const [k,v]of Object.entries({tests,pass,fail}))assert.match(s,new RegExp('^(?:#|ℹ) '+k+' '+v+'$','m'));}
totals('baseline',4,1,3);totals('affected',11,10,1);totals('corrected',4,4,0);
const oldFixture=read(dir+'first-endpoint-test.mjs.txt').toString(),fixture=read(owned[2]).toString();assert.equal(fixture,oldFixture.replace('b=bounds(triangle.flat())','b=bounds(triangle)'));
const declaration=JSON.parse(read(owned[3])),oldDeclaration=JSON.parse(git('show',base+':'+owned[3]));assert.equal(declaration.runtimeFiles.length,22);assert.equal(declaration.addedFiles.length,52);const entry=declaration.addedFiles.find(p=>p.path===owned[0]);assert.equal(entry.lfSha256,sha(lf(read(owned[0]))));entry.lfSha256=oldDeclaration.addedFiles.find(p=>p.path===owned[0]).lfSha256;assert.deepEqual(declaration,oldDeclaration);
assert.equal(sha(lf(read(dir+'authority.md'))),sha(lf(git('show','d37c75da782c8695c37eeef68bc6f2338a0173cf:docs/engineering/shared-maps/contact-endpoint-bounds.md'))));
const ui=json('ui-result.json'),example=json('ui-example.json');assert.equal(ui.status,'source-proof-prepared-native-unbound');assert.equal(ui.report.prepared.length,1);assert.equal(ui.report.rejected.length,0);assert.equal(ui.report.nativeRecordsBound,0);assert.equal(ui.metrics.nativeSourceExpansions,2);assert.equal(ui.metrics.nativePartTransforms,2);assert.equal(ui.report.prepared[0].selector,null);assert.deepEqual(ui.report.prepared[0].historicalVolume,example.region.historical);
for(const p of example.sourcePins){const raw=p.commit?git('show',p.commit+':'+p.path):read(p.path);assert.equal(raw.length,p.bytes);assert.equal(sha(raw),p.sha256);}
const cleanup=json('cleanup.json');assert.deepEqual(cleanup.liveRecordedHelpers,[]);assert.deepEqual(cleanup.retainedHelpers,[]);assert.deepEqual(cleanup.checkedPids.sort((a,b)=>a-b),[baseline,affected,corrected,uiRun].map(r=>r.pid).sort((a,b)=>a-b));
const files=[...owned,...lines(git('ls-files','--others','--exclude-standard',dir)),...lines(git('ls-files',dir))].filter((p,i,a)=>a.indexOf(p)===i&&p!==dir+'verification.json').sort();
const result={status:'passed',baseCommit:base,scope:'Optional shared-selector delta, four new and seven existing synthetic groups, one committed source example; no runtime rerun for packaging',passingGroups:{new:4,existing:7,committedUiSourceExamples:1},preservedRuns:{baseline:{tests:4,pass:1,fail:3,reason:'Old deliberate shared-selector rejection'},affected:{tests:11,pass:10,fail:1,reason:'Flattened test points passed to bounds; runtime unchanged by fixture correction'},corrected:{tests:4,pass:4,fail:0}},sourceOnly:{uiCommit:ui.uiCommit,regionId:ui.regionId,prepared:1,nativeRecordsBound:0,ownerExpansions:2,originalPartTransforms:2},scopeCounts:{actualNativeCompilerCalls:0,pairValidationSessions:0,fullNewYorkDiagnostics:0,worldSteps:0,rendererCalls:0,benchmarks:0,builds:0},protectedUnrelated:{path:protectedPath,sha256:sha(read(protectedPath)),staged:false},retainedHelpers:[],files:files.map(path=>({path,bytes:read(path).length,lfSha256:sha(lf(read(path)))}))};
fs.writeFileSync(dir+'verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,files:files.length,passingGroups:result.passingGroups}));
