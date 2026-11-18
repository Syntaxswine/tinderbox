// Offline packaging only: reads saved scalar receipts/source text, no runtime imports.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir='docs/engineering/shared-maps/hybrid-world-publication-v1/';
const baseline='228d5e3c0761a470f243d02de8b5ac4a3cb27c41';
const sha=b=>createHash('sha256').update(b).digest('hex');
const lf=b=>b.toString().replace(/\r\n/g,'\n');
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p).toString().replace(/^\uFEFF/,''));
const git=(...a)=>execFileSync('git',a,{windowsHide:true,encoding:'utf8'}).trim();
const write=(p,v)=>fs.writeFileSync(dir+p,JSON.stringify(v,null,2)+'\n');
const failures={
  'attempt-01':'Fixture roof owner differed from the actual producer owner; no compilation or trial occurred.',
  'attempt-02':'Fixture open sheets lacked closedShape:false; unchanged effective-query source guard rejected them.',
  'attempt-03':'Assertion incorrectly expected all support at a retired roof position to vanish while the unsupported fitting still awaited its normal fall.',
  'attempt-04':'Fixture expected decimal 1.7 instead of the exact sum .5+.3+.9; the numerical assertion was corrected.',
  'attempt-06':'96 steps exceeded the original 64 limit because the affected-name filter included the unchanged legacy 2x45-step comparison. The after-hook failed despite Node exiting 0. Disclosed and acknowledged; never accepted as passing.',
  'final-coupled':'Misplaced skip flag selected the legacy comparison in the 64-step child. The explicit hard guard stopped work at 64, failing that test. Flag moved before positional test paths.'
};
const archives=json(dir+'source-evidence-index.json');
const runs=archives.map(({receipt})=>{
  const name=receipt.slice(0,-5),r=json(dir+receipt),raw=read(dir+name+'.log'),log=raw.toString();
  const match=log.match(/^(?:# )?(HYBRID|LEGACY|PHYSICAL)_RESOURCES (.+)$/m);assert.ok(match,'Resource hook absent: '+name);
  const resources=JSON.parse(match[2]);
  const stats=Object.fromEntries(['tests','pass','fail','skipped'].map(k=>[k,Number(log.match(new RegExp('^# '+k+' (\\d+)$','m'))?.[1])]));
  const notOk=[...log.matchAll(/^not ok \d+ - (.*)$/gm)].map(m=>m[1]);
  const observedPass=r.exitCode===0&&notOk.length===0&&stats.fail===0&&!failures[name];
  assert.equal(resources.trial.created,resources.trial.disposed,name+' trial cleanup');
  assert.ok(new Date(r.endedAt)-new Date(r.startedAt)<=r.timeoutMs,name+' wall bound');
  for(const k of ['actualNewYorkCalls','fullNewYorkDiagnostics','rendererCalls','builds'])assert.equal(resources[k],0,name+' '+k);
  if(name==='attempt-06')assert.equal(resources.trial.steps,96);
  else assert.ok(resources.trial.steps<=r.maxTrialSteps,name+' step bound');
  for(const f of resources.fixtures||[]){assert.ok(f.logicalCells<=64&&f.sourceTriangles<=256);assert.equal(f.retainedReceipts,0);assert.equal(f.query.cachedShapes,0);assert.equal(f.query.cachedTriangles,0);}
  return {name,receipt,receiptSha256:sha(read(dir+receipt)),log:name+'.log',logSha256:sha(raw),observedPass,exitCode:r.exitCode,stats,notOk,failure:failures[name]||null,wallMs:new Date(r.endedAt)-new Date(r.startedAt),resourceType:match[1],resources};
});
for(const [name,tests,steps,compiles,trials]of [['final-vetted',12,6,28,10],['legacy-final',1,90,4,2],['physical-final',23,0,0,0]]){
  const r=runs.find(r=>r.name===name);assert.equal(r.observedPass,true,name);assert.equal(r.stats.pass,tests);assert.equal(r.resources.trial.steps,steps);assert.equal(r.resources.compiler.calls,compiles);assert.equal(r.resources.trial.created,trials);
}
write('resources.json',{baseline,method:'Parsed existing raw logs only; no compiler, trial, renderer or repeated test run.',acceptedRuns:['final-vetted','legacy-final','physical-final'],acceptedGroups:36,overrun:{run:'attempt-06',steps:96,originalLimit:64,accepted:false,disclosed:true,acknowledged:true,authority:'authority.md#existing-comparison-allowance'},actualNewYorkCalls:0,fullNewYorkDiagnostics:0,rendererCalls:0,benchmarks:0,builds:0,pages:0,defaultEnablement:0,runs});
const unchanged=[
  'tests/integration/source-activation.test.mjs','tests/integration/source-carriers.test.mjs',
  'tests/integration/original-support-ports.test.mjs','tests/integration/original-support-embed.test.mjs','tests/integration/original-support-rooting.test.mjs',
  'tests/fixtures/regional-source-data.mjs','tests/fixtures/regional-query-data.mjs',
  'src/main.js','src/runtime/shared-map.js','docs/engineering/house-traversal/runtime-integration.json',
  'assets/runtime/map-sources/new-york/index.json','assets/runtime/map-sources/new-york/library.json'
];
const unchangedInputs=unchanged.map(p=>{execFileSync('git',['diff','--quiet',baseline,'--',p],{windowsHide:true,stdio:'ignore'});return {path:p,lfSha256:sha(lf(read(p))),unchangedFrom:baseline};});
const operationalInputs=['authority.md','legacy-preload.mjs','physical-preload.mjs','run.mjs','preserve-sources.mjs','package-evidence.mjs'].map(p=>({path:dir+p,lfSha256:sha(lf(read(dir+p)))}));
const currentPins=json(dir+'final-vetted.json').sourcePins;for(const p of currentPins)assert.equal(sha(lf(read(p.path))),p.lfSha256,p.path+' differs from final tested source');
const legacy=json(dir+'legacy-final.json').sourcePins;
const legacyDifferences=legacy.filter(p=>sha(lf(read(p.path)))!==p.lfSha256).map(p=>p.path);
write('inputs.json',{baseline,node:'v24.15.0; project requires Node >=22',finalRuntimePins:'final-vetted.json',unchangedInputs,operationalInputs,legacyDifferencesAfterPassingRun:legacyDifferences,legacyDifferenceScope:'Later disabled-mode identity/admission guards and coupled fixture checks only; the unchanged original legacy test was not repeated for packaging.',protectedUnrelated:{path:'docs/engineering/shared-maps/support-regions-proposal.md',rawSha256:'56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f'},sourceEvidence:{runs:archives.length,uniqueSnapshots:fs.readdirSync(dir+'source-evidence').length,method:'Each historical LF pin resolves to a preserved source text with its own raw SHA. Reconstruction of later changes is explicitly marked; no unobserved raw-byte identity is claimed.'}});
const cleanup=json(dir+'cleanup.json');assert.equal(cleanup.unresolved.length,0);assert.equal(cleanup.helpers.length,runs.length);assert.ok(cleanup.helpers.every(h=>['exited-pid-absent','pid-reused-original-exited'].includes(h.state)));
console.log(JSON.stringify({runs:runs.length,acceptedGroups:36,compilerCalls:32,trialSteps:96,disposedTrials:12,sourceSnapshots:fs.readdirSync(dir+'source-evidence').length,legacyDifferences,helpersClosed:cleanup.helpers.length}));
