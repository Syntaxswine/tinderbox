// Offline evidence/scope audit only. No runtime imports or test replay.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir='docs/engineering/shared-maps/hybrid-world-corrections-v1/',baseline='57d350835508f028310881d00edad8d50ef8b057';
const sha=b=>createHash('sha256').update(b).digest('hex'),lf=b=>b.toString().replace(/\r\n/g,'\n');
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p).toString().replace(/^\uFEFF/,''));
const git=(...a)=>execFileSync('git',a,{windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const lines=s=>s.split(/\r?\n/).filter(Boolean),write=process.argv.includes('--write');
const names=['attempt-01','islands-before','attempt-02','radiation-positive','legacy-final','consumers-final','coupled-final','legacy-current','bounded-final','legacy-bounded'];
const runs=names.map(name=>{
  const receipt=json(dir+name+'.json'),raw=read(dir+name+'.log'),log=raw.toString(),hook=log.match(/^(?:# )?(HYBRID_CORRECTION|LEGACY)_RESOURCES (.+)$/m);assert.ok(hook,name+' resource hook');
  const resource=JSON.parse(hook[2]),fixtures=resource.fixtures||[],queries=fixtures.map(f=>f.queries),stats=Object.fromEntries(['tests','pass','fail'].map(k=>[k,Number(log.match(new RegExp('^# '+k+' (\\d+)$','m'))?.[1])]));
  const passed=receipt.exitCode===0&&!/^not ok |^# fail [1-9]/m.test(log);assert.equal(passed,receipt.observedPass);assert.equal(passed,name!=='islands-before');
  assert.equal(resource.trial.created,resource.trial.disposed);assert.ok(resource.trial.steps<=receipt.maxTrialSteps);assert.ok(new Date(receipt.endedAt)-new Date(receipt.startedAt)<=30000);
  for(const k of ['actualNewYorkCalls','fullNewYorkDiagnostics','rendererCalls','builds'])assert.equal(resource[k],0);
  for(const f of fixtures){assert.ok(f.logicalCells<=64&&f.sourceTriangles<=256);assert.equal(f.retainedReceipts,0);for(const k of ['cachedShapes','cachedTriangles','workingShapes','workingTriangles','workingLeases'])assert.equal(f.queries[k],0);assert.ok(f.queries.peakShapes+f.queries.peakWorkingShapes<=f.queries.maxShapes);assert.ok(f.queries.peakTriangles+f.queries.peakWorkingTriangles<=f.queries.maxTriangles);}
  for(const p of receipt.sourcePins){const bytes=read(dir+p.snapshot);assert.equal(sha(bytes),p.rawSha256);assert.equal(sha(lf(bytes)),p.lfSha256);}
  const max=(rows,key)=>Math.max(0,...rows.map(r=>r[key]||0)),observation=log.match(/^COLD_ISLANDS_OBSERVATION (.+)$/m);
  return {name,passed,stats,receiptSha256:sha(read(dir+name+'.json')),logSha256:sha(raw),compiler:resource.compiler,trial:resource.trial,wallMs:new Date(receipt.endedAt)-new Date(receipt.startedAt),maxTrialSteps:receipt.maxTrialSteps,fixtures:fixtures.length,maxSourceCells:max(fixtures,'logicalCells'),maxSourceTriangles:max(fixtures,'sourceTriangles'),peakCacheShapes:max(queries,'peakShapes'),peakCacheTriangles:max(queries,'peakTriangles'),peakWorkingShapes:max(queries,'peakWorkingShapes'),peakWorkingTriangles:max(queries,'peakWorkingTriangles'),allFixtureLoansCachesAndReceiptsReleased:true,...observation?{islands:JSON.parse(observation[1])}:{}};
});
for(const[name,tests,calls,trials,steps]of [['bounded-final',24,58,23,28],['legacy-bounded',1,4,2,90]]){const r=runs.find(r=>r.name===name);assert.equal(r.passed,true);assert.equal(r.stats.pass,tests);assert.equal(r.compiler.calls,calls);assert.equal(r.trial.created,trials);assert.equal(r.trial.steps,steps);}
assert.equal(runs.find(r=>r.name==='islands-before').islands.rightUnrooted,false);assert.equal(runs.find(r=>r.name==='bounded-final').islands.rightUnrooted,true);
for(const name of ['bounded-final','legacy-bounded'])for(const p of json(dir+name+'.json').sourcePins)assert.equal(sha(lf(read(p.path))),p.lfSha256,name+' current pin '+p.path);
const resources={baseline,method:'Raw saved logs and exact source snapshots; no runtime/test replay',acceptedRuns:['bounded-final','legacy-bounded'],uniqueAcceptedGroups:25,totalOwnedCompilerCalls:runs.reduce((n,r)=>n+r.compiler.calls,0),totalOwnedTrialSteps:runs.reduce((n,r)=>n+r.trial.steps,0),allOwnedTrialsCreatedDisposed:runs.reduce((n,r)=>n+r.trial.created,0),actualNewYorkCalls:0,fullNewYorkDiagnostics:0,rendererCalls:0,builds:0,benchmarks:0,pages:0,defaultEnablement:0,runs};
if(write)fs.writeFileSync(dir+'resources.json',JSON.stringify(resources,null,2)+'\n');else assert.deepEqual(json(dir+'resources.json'),resources);
const protectedPath='docs/engineering/shared-maps/support-regions-proposal.md';assert.equal(sha(read(protectedPath)),'56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f');assert.equal(git('diff','--cached','--name-only','--',protectedPath),'');
const preserved=['docs/engineering/shared-maps/hybrid-world-publication-v1','docs/engineering/house-traversal/runtime-integration.json','src/main.js','src/runtime/shared-map.js','src/content/shared-map.js','docs/source-baseline.json','assets','art','vendor','tests/integration/hybrid-world-publication.test.mjs','tests/integration/source-activation.test.mjs','tests/integration/source-carriers.test.mjs'];git('diff','--quiet',baseline,'--',...preserved);
const declaration=json('docs/engineering/shared-maps/runtime-integration.json');assert.equal(declaration.runtimeFiles.length,23);assert.equal(declaration.addedFiles.length,55);for(const p of declaration.runtimeFiles)assert.equal(sha(lf(read(p.path))),p.afterLfSha256);for(const p of declaration.addedFiles)assert.equal(sha(lf(read(p.path))),p.lfSha256);assert.equal(sha(lf(read(declaration.frozenM28.path))),declaration.frozenM28.lfSha256);for(const p of declaration.runtimePackages)assert.equal(sha(read(p.path)),p.sha256);
const callback=json(dir+'architect-callback-repro.json'),modes=json(dir+'architect-owner-modes-repro.json');assert.equal(callback.partialPublicationObserved,true);assert.equal(callback.compiler.calls,2);assert.equal(callback.trial.steps,0);assert.equal(modes.modeChangedThroughExternalAlias,true);assert.equal(modes.compilerCalls,0);
const cleanup=json(dir+'cleanup.json');assert.equal(cleanup.helpers.length,names.length);assert.equal(cleanup.unresolved.length,0);assert.equal(cleanup.retainedHelpers.length,0);assert.equal(cleanup.ports.length,0);assert.ok(cleanup.helpers.every(h=>['exited-pid-absent','pid-reused-original-exited'].includes(h.state)));
const owned=[
  'src/runtime/hybrid-source-queries.js','src/runtime/regional-effective-query.js','src/runtime/source-query-registry.js',
  'src/simulation/hybrid-source-support.js','src/simulation/hybrid-world-publication.js','src/simulation/source-carriers.js','src/simulation/source-follow.js',
  'workbenches/furnished-house/geometry.js','workbenches/furnished-house/scene.js','workbenches/furnished-house/simulation.js',
  'tests/fixtures/hybrid-world-data.mjs','tests/fixtures/hybrid-cold-islands.mjs','tests/integration/hybrid-world-corrections.test.mjs',
  'tools/record-shared-map-runtime.mjs','docs/engineering/shared-maps/runtime-integration.json'
];
const changed=[...new Set([...lines(git('diff','--name-only',baseline)),...lines(git('ls-files','--others','--exclude-standard'))])];for(const p of changed)assert.ok(owned.includes(p)||p.startsWith(dir)||p===protectedPath,'Unexpected task scope '+p);
const evidence=fs.readdirSync(dir,{recursive:true}).map(p=>p.replaceAll('\\','/')).filter(p=>fs.statSync(dir+p).isFile()&&!['manifest.json','verification.json'].includes(p)).map(p=>dir+p),files=[...owned,...evidence].sort();
const manifest={baseline,scope:'Focused coupled mutation/temporary-budget/owner-mode/current-island corrections only',preserved,protectedUnrelated:protectedPath,files:files.map(path=>{const raw=read(path),keep=path.startsWith(dir),bytes=keep?raw:Buffer.from(lf(raw));return {path,hashMode:keep?'raw':'LF-normalized',bytes:bytes.length,sha256:sha(bytes)};})};
if(write)fs.writeFileSync(dir+'manifest.json',JSON.stringify(manifest,null,2)+'\n');else assert.deepEqual(json(dir+'manifest.json'),manifest);
const result={passed:true,method:'Offline source/evidence/scope hash checks',baseline,ownedFiles:files.length,preservedOwnedRuns:runs.length,uniqueSourceSnapshots:fs.readdirSync(dir+'source-evidence').length,acceptedGroups:25,coupled:{groups:24,compilerCalls:58,disposedTrials:23,steps:28},legacy:{groups:1,compilerCalls:4,disposedTrials:2,steps:90},failedColdIslandReproPreserved:true,architectCallbackAndModeReprosPreserved:true,allHelpersClosed:cleanup.helpers.length,protectedWipExcluded:true,oldEvidenceAssetsDefaultsUnchanged:true,runtimeDeclaration:{existing:23,added:55},actualNewYorkCalls:0,rendererCalls:0,builds:0};
fs.writeFileSync(dir+'verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
