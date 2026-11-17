import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const source='artifacts/qa/shared-map-runtime/contact-live-retirement-v1/',archive='docs/engineering/shared-maps/contact-live-v1/',hash=b=>createHash('sha256').update(b).digest('hex');
const original=JSON.parse(fs.readFileSync(archive+'experimental-checkpoint-manifest.json'));
for(const f of original.files){const p=archive+(f.path==='README.md'?'experimental-checkpoint-README.md':f.path),b=fs.readFileSync(p);assert.equal(b.length,f.bytes,f.path);assert.equal(hash(b),f.sha256,f.path);}
const checks=JSON.parse(fs.readFileSync(source+'checks.json'));assert.equal(checks.steps.length,4);assert.ok(checks.steps.every(s=>s.status===0));
assert.match(fs.readFileSync(source+'baseline-focused.log','utf8'),/tests 46/);assert.match(fs.readFileSync(source+'archived-candidate-focused.log','utf8'),/tests 56/);
for(const [from,to]of [['checks.json','retirement-checks.json'],['restore.mjs','restore-baseline.mjs'],['checks.mjs','retirement-checks.mjs'],['finalize.mjs','finalize-negative-result.mjs'],['declaration.log','restored-declaration.log'],['loader-pins.log','loader-pins.log'],['baseline-focused.log','baseline-focused.log'],['archived-candidate-focused.log','archived-candidate-focused.log']])fs.copyFileSync(source+from,archive+to);
const git=(...args)=>execFileSync('git',args,{windowsHide:true}),rootRevision=git('rev-parse','codex/review-cross-map-fire').toString('utf8').trim();
const decision=git('show',rootRevision+':docs/engineering/shared-maps/contact-and-live-reach-decision.md');fs.writeFileSync(archive+'non-adoption-decision.md',decision);
const receipt={version:1,decision:'Do not adopt either measured algorithm; active baseline restored; preserve evidence and archived candidate',rootRevision,decisionSha256:hash(decision),acceptedBaseline:'822038cc7c3f3814f8aaa8e48c7973304b384fc2',supportLfSha256:hash(fs.readFileSync('src/simulation/source-support.js','utf8').replace(/\r\n/g,'\n')),experimentalCommit:'ee26e8091f5e02118360635ece29290ec6c11ccf',archivedCandidateSupportLfSha256:'18545e679d8318cb0115e7a144af62995e41b2f8cda400b40f1c3ed3a9452021',originalArchiveFilesVerified:original.files.length,baselineChecks:46,archivedCandidateChecks:56,noNewMeasurement:true,directLiveMeasuredAlone:false,noBuildProfileOrBrowser:true,queuedQa:'Failure-art capture after this separate evidence-only checkpoint; no bake consumer implementation',evidenceOnlyFinalTree:true};
assert.equal(receipt.supportLfSha256,'1e6bd6ec6921119af942cce3e3fc69bf2449b0b3ead543697f88e435039bd98c');
assert.equal(git('diff','--name-only','76290ae0ef5d08b2abdfcea5234f997f973b65e2','--','src','assets','art','vendor','workbenches').toString('utf8').trim(),'');
assert.equal(hash(fs.readFileSync('docs/engineering/shared-maps/support-regions-proposal.md')),'56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f');
fs.writeFileSync(archive+'negative-result-decision.json',JSON.stringify(receipt,null,2)+'\n');
function inventory(dir,relative=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?inventory(path.join(dir,e.name),relative+e.name+'/'):relative+e.name==='archive-manifest.json'?[]:[{path:relative+e.name,bytes:fs.statSync(path.join(dir,e.name)).size,sha256:hash(fs.readFileSync(path.join(dir,e.name)))}]);}
const files=inventory(archive).sort((a,b)=>a.path.localeCompare(b.path));fs.writeFileSync(archive+'archive-manifest.json',JSON.stringify({version:2,scope:'Evidence-only negative result with active baseline restored; original experiment and exact candidate loader/payload preserved',files},null,2)+'\n');
console.log(JSON.stringify({receipt,archiveFiles:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)}));
