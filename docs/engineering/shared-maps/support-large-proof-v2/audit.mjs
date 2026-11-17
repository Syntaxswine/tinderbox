// Read-only source/evidence verification; never imports or reruns the proof.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),hash=b=>createHash('sha256').update(b).digest('hex'),lf=b=>b.toString('utf8').replace(/\r\n/g,'\n');
const read=name=>JSON.parse(fs.readFileSync(path.join(here,name))),git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',windowsHide:true});
const plan=read('plan.json'),adaptation=read('adaptation-audit.json'),base=git('show',adaptation.baseline+':src/simulation/source-support.js').replace(/\r\n/g,'\n'),producer=git('show',adaptation.sourceSeam+':tools/prepare-source-support.mjs').replace(/\r\n/g,'\n');
assert.equal(hash(base),adaptation.baselineLfSha256);assert.equal(hash(producer),adaptation.producerLfSha256);
for(const p of plan.harnessPins)assert.equal(hash(fs.readFileSync(path.join(here,p.file))),p.sha256,p.file);
for(const p of adaptation.outputs)assert.equal(hash(lf(fs.readFileSync(path.join(here,p.file)))),p.lfSha256,p.file);
const original=lf(fs.readFileSync(path.join(here,'original-calculation.mjs'))),native=lf(fs.readFileSync(path.join(here,'native-preparation.mjs')));
for(const [name,f]of Object.entries(adaptation.referenceFragments)){assert.equal(hash(f.text),f.lfSha256);assert.ok(base.includes(f.text),name);if(f.verbatim)assert.ok(original.includes(f.text),name);}
for(const [name,f]of Object.entries(adaptation.preparationFragments)){assert.equal(hash(f.text),f.lfSha256);assert.ok(producer.includes(f.text),name);assert.ok(native.includes(f.text),name);}
const expected=read('../support-preparation-v1/compiler-dependencies.json');
assert.equal(expected.digest,'ddd03319fd6eacf936cf3afdd0b2ed914d93a8e70e51c14076dc8e4c465ad36d');
for(const p of expected.files){const raw=fs.readFileSync(path.join(root,p.path));assert.equal(hash(p.kind==='module'?lf(raw):raw),p.sha256,p.path);}
for(const p of read('../support-preparation-v1/source-pins.json').files)assert.equal(hash(fs.readFileSync(path.join(root,p.path))),p.sha256,p.path);
assert.equal(hash(fs.readFileSync(path.join(root,'docs/engineering/shared-maps/support-regions-proposal.md'))),'56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f');
const tracked=git('diff','--name-only',plan.authority).trim().split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').trim().split('\n').filter(Boolean),all=[...new Set([...tracked,...untracked])];
assert.ok(all.every(p=>p==='docs/engineering/shared-maps/support-regions-proposal.md'||p.startsWith('docs/engineering/shared-maps/support-large-proof-v2/')),'Only the fenced proof and preserved WIP may differ');
let observation=null;
if(fs.existsSync(path.join(here,'receipt.json'))){
  const receipt=read('receipt.json'),hasFinal=fs.existsSync(path.join(here,'final.json')),final=hasFinal?read('final.json'):read('partial.json');
  assert.equal(receipt.childExitConfirmed,true);assert.equal(receipt.withinAbsolute60s,true);assert.equal(receipt.ports.length,0);
  assert.equal(String(final.pid),String(receipt.pid));assert.ok(final.scope.nativeCompilationAttempts<=1);assert.ok(final.scope.nativeCompilations<=1);assert.equal(final.scope.trials,0);assert.equal(final.scope.worldSteps,0);assert.equal(final.scope.codec,false);assert.equal(final.scope.coldReplay,false);assert.equal(final.scope.productionEnabled,false);
  assert.ok(final.complete||final.firstFailure||receipt.forced||receipt.exitCode!==0,'Completion, first failure or abnormal process exit must be explicit');
  if(final.firstFailure){const failed=final.stages.findIndex(s=>s.status==='failed');if(failed>=0)assert.equal(failed,final.stages.length-1,'No stage may run after the first failure');assert.equal(final.complete,false);}
  if(final.scope.nativeCompilations===1&&!receipt.forced&&hasFinal)assert.equal(final.cleanup.native,true);
  if(!receipt.forced&&hasFinal){assert.equal(final.cleanup.query,true);assert.equal(final.cleanup.compiledMetadata,true);assert.equal(final.cleanup.contexts,true);}
  observation={complete:final.complete,exitCode:receipt.exitCode,firstFailure:final.firstFailure,lastStage:final.stages.at(-1)?.name,jsFinalReceipt:hasFinal,inProcessCleanupObserved:hasFinal&&!receipt.forced,stages:final.stages.length,unrun:final.unrun.length,nativeCompilationAttempts:final.scope.nativeCompilationAttempts,nativeCompilations:final.scope.nativeCompilations,childExitConfirmed:receipt.childExitConfirmed,withinAbsolute60s:receipt.withinAbsolute60s};
}
console.log(JSON.stringify({sourceAudit:'pass',referenceFragments:6,preparationFragments:6,compilerPins:expected.files.length,rawInputPins:3,productionUnchanged:true,wipPreserved:true,observation}));
