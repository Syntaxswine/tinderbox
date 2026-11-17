// Read-only postmortem. It does not import the proof or native geometry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),read=n=>JSON.parse(fs.readFileSync(path.join(here,n)));
const plan=read('plan.json'),receipt=read('receipt.json'),tool=read('launcher-tool-result.json');
assert.equal(hash(fs.readFileSync(path.join(here,'plan.json'))),receipt.planSha256);
for(const f of plan.harnessPins)assert.equal(hash(fs.readFileSync(path.join(here,f.file))),f.sha256,f.file);
assert.equal(tool.exit_code,1);assert.equal(tool.session_id,undefined);assert.equal(receipt.pid,undefined);
assert.equal(receipt.childExitConfirmed,false);assert.equal(receipt.forced,false);assert.equal(receipt.stopFileWritten,false);
assert.equal(Array.isArray(receipt.executable),true);assert.equal(receipt.executable.length,2);assert.ok(receipt.executable.every(p=>p.endsWith('\\node.exe')));
assert.match(receipt.parentError,/Start/);assert.match(receipt.parentError,/cannot find the file specified/);
assert.equal(fs.statSync(path.join(here,'launch.once')).size,0);
const absent=['proof-started.once','launch.json','partial.json','partial.tmp.json','final.json','stdout.log','stderr.log','reference-blocks.json','calculations','stop.requested'];
for(const n of absent)assert.equal(fs.existsSync(path.join(here,n)),false,n+' must remain absent');
// Run only the pinned auditor's unchanged source preamble. Its observation
// assertions require a child and therefore do not apply to a failed Start.
const source=fs.readFileSync(path.join(here,'audit.mjs'),'utf8').replace(/\r\n/g,'\n'),end=source.indexOf('let observation=null;');
assert.ok(end>0);
const from='const here=path.dirname(fileURLToPath(import.meta.url))',to='const here='+JSON.stringify(here),prefix=source.slice(0,end);
assert.equal(prefix.split(from).length-1,1);
const sourceOnly=prefix.replace(from,to);
await import('data:text/javascript;base64,'+Buffer.from(sourceOnly).toString('base64'));
const proof=fs.readFileSync(path.join(here,'proof.mjs'),'utf8').replace(/\r\n/g,'\n'),start=proof.indexOf('const planned='),stop=proof.indexOf('const state=',start);
assert.ok(start>0&&stop>start);
const plannedFragment=proof.slice(start,stop),unrun=Function(plannedFragment+';return planned;')();
assert.equal(unrun.length,42);assert.equal(new Set(unrun).size,42);
const audit={version:1,kind:'Preserved failed-launch evidence/source verification; not a native proof or cost result',passed:true,firstFailure:'Parent Process.Start: multiple executable paths coerced into one invalid filename',launchAttempts:1,proofProcessesStarted:0,nativeCompilations:0,worldSteps:0,trials:0,all42ProofStagesUnrun:true,unchangedHarnessPins:plan.harnessPins.length,unchangedCompilerPins:30,unchangedRawInputs:3,productionUnchanged:true,wipPreserved:true,absentChildOutputs:absent,
  sourceAuditorAdaptation:{originalLfSha256:hash(source),sourcePreambleLfSha256:hash(prefix),derivedLfSha256:hash(sourceOnly),from,to,reason:'Fix data-URL module directory and exclude only observation assertions for a child that never started. Verbatim source/scope checks remain.'},
  stageListExtraction:{lfSha256:hash(plannedFragment),method:'Evaluate only the pinned literal stage-name declarations, never proof callbacks or module imports.'},
  cleanup:{parentPid:receipt.parentPid,parentExitConfirmedByToolChunk:'af1ec8',childPidAssigned:false,childExitNotApplicable:true,portsOpened:0,retainedHelpers:0},noRetry:true};
fs.writeFileSync(path.join(here,'unrun-stages.json'),JSON.stringify({reason:audit.firstFailure,stages:unrun},null,2)+'\n');
fs.writeFileSync(path.join(here,'launch-failure-audit.json'),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({passed:true,launchAttempts:1,proofProcessesStarted:0,nativeCompilations:0,unrunStages:unrun.length,sourcePins:30,rawInputs:3,unchangedHarnessPins:plan.harnessPins.length,noRetry:true}));
