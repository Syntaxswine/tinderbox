// Offline source/evidence audit. No runtime imports, compilation or trial calls.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir='docs/engineering/shared-maps/hybrid-world-publication-v1/';
const baseline='228d5e3c0761a470f243d02de8b5ac4a3cb27c41';
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p).toString().replace(/^\uFEFF/,''));
const sha=b=>createHash('sha256').update(b).digest('hex'),lf=b=>b.toString().replace(/\r\n/g,'\n');
const git=(...a)=>execFileSync('git',a,{windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const lines=s=>s.split(/\r?\n/).filter(Boolean);
const inputs=json(dir+'inputs.json'),resources=json(dir+'resources.json'),index=json(dir+'source-evidence-index.json'),cleanup=json(dir+'cleanup.json');
assert.equal(inputs.baseline,baseline);assert.equal(index.length,11);
for(const run of index){const pins=json(dir+run.receipt).sourcePins;assert.equal(pins.length,run.entries.length);for(const entry of run.entries){assert.ok(pins.some(p=>p.path===entry.path&&p.lfSha256===entry.lfSha256));const bytes=read(dir+entry.snapshot);assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.rawSha256);assert.equal(sha(lf(bytes)),entry.lfSha256);}}
for(const p of json(dir+'final-vetted.json').sourcePins)assert.equal(sha(lf(read(p.path))),p.lfSha256,p.path);
for(const p of [...inputs.unchangedInputs,...inputs.operationalInputs])assert.equal(sha(lf(read(p.path))),p.lfSha256,p.path);
for(const p of inputs.unchangedInputs)git('diff','--quiet',baseline,'--',p.path);
assert.equal(sha(read(inputs.protectedUnrelated.path)),inputs.protectedUnrelated.rawSha256);
assert.equal(git('diff','--cached','--name-only','--',inputs.protectedUnrelated.path),'','Unrelated WIP staged');
for(const r of resources.runs){assert.equal(sha(read(dir+r.receipt)),r.receiptSha256);assert.equal(sha(read(dir+r.log)),r.logSha256);assert.equal(r.resources.trial.created,r.resources.trial.disposed);}
for(const[name,pass,steps,compile,created]of [['final-vetted',12,6,28,10],['legacy-final',1,90,4,2],['physical-final',23,0,0,0]]){const r=resources.runs.find(r=>r.name===name);assert.equal(r.observedPass,true);assert.equal(r.stats.pass,pass);assert.equal(r.stats.fail,0);assert.equal(r.notOk.length,0);assert.equal(r.resources.trial.steps,steps);assert.equal(r.resources.compiler.calls,compile);assert.equal(r.resources.trial.created,created);}
const overrun=resources.runs.find(r=>r.name==='attempt-06');assert.equal(overrun.observedPass,false);assert.equal(overrun.exitCode,0);assert.equal(overrun.resources.trial.steps,96);assert.ok(read(dir+overrun.log).includes("failureType: 'hookFailed'"));
const guarded=resources.runs.find(r=>r.name==='final-coupled');assert.equal(guarded.observedPass,false);assert.equal(guarded.resources.trial.steps,64);
for(const k of ['actualNewYorkCalls','fullNewYorkDiagnostics','rendererCalls','benchmarks','builds','pages','defaultEnablement'])assert.equal(resources[k],0);
const accepted=resources.runs.find(r=>r.name==='final-vetted').resources.fixtures;
assert.equal(accepted.length,8);for(const f of accepted){assert.equal(f.logicalCells,13);assert.equal(f.sourceTriangles,18);assert.equal(f.retainedReceipts,0);assert.equal(f.query.cachedShapes,0);assert.equal(f.query.cachedTriangles,0);assert.ok(f.query.peakShapes<=192);assert.ok(f.query.peakTriangles+f.query.peakWorkingTriangles<=65536);}
assert.equal(cleanup.helpers.length,11);assert.equal(cleanup.unresolved.length,0);assert.equal(cleanup.ports.length,0);assert.equal(cleanup.retainedHelpers.length,0);assert.ok(cleanup.helpers.every(h=>['exited-pid-absent','pid-reused-original-exited'].includes(h.state)));
const declaration=json('docs/engineering/shared-maps/runtime-integration.json');assert.equal(declaration.runtimeFiles.length,23);assert.equal(declaration.addedFiles.length,55);for(const p of declaration.runtimeFiles)assert.equal(sha(lf(read(p.path))),p.afterLfSha256,p.path);for(const p of declaration.addedFiles)assert.equal(sha(lf(read(p.path))),p.lfSha256,p.path);assert.equal(sha(lf(read(declaration.frozenM28.path))),declaration.frozenM28.lfSha256);for(const p of declaration.runtimePackages)assert.equal(sha(read(p.path)),p.sha256);
const owned=[
  'src/content/shared-map.js','src/runtime/collision.js','src/runtime/source-query-registry.js','src/runtime/hybrid-source-queries.js',
  'src/simulation/map-navigation.js','src/simulation/original-support-ports.js','src/simulation/regional-source-pilot.js','src/simulation/scene-thermal.js','src/simulation/source-activation.js','src/simulation/source-carriers.js','src/simulation/source-support.js','src/simulation/hybrid-source-support.js','src/simulation/hybrid-world-publication.js',
  'workbenches/furnished-house/geometry.js','workbenches/furnished-house/scene.js','workbenches/furnished-house/simulation.js',
  'tests/fixtures/hybrid-world-data.mjs','tests/integration/hybrid-world-publication.test.mjs',
  'tools/record-shared-map-runtime.mjs','docs/engineering/shared-maps/runtime-integration.json'
];
const changed=[...new Set([...lines(git('diff','--name-only',baseline)),...lines(git('ls-files','--others','--exclude-standard'))])].sort();
for(const p of changed)assert.ok(p===inputs.protectedUnrelated.path||owned.includes(p)||p.startsWith(dir),'Unexpected task delta: '+p);
const evidence=fs.readdirSync(dir,{recursive:true}).map(p=>p.replaceAll('\\','/')).filter(p=>fs.statSync(dir+p).isFile()&&!['manifest.json','verification.json'].includes(p)).map(p=>dir+p);
const files=[...owned,...evidence].sort();assert.equal(new Set(files).size,files.length);for(const p of files)assert.ok(fs.existsSync(p));
const manifest={baseline,scope:'Disabled coupled source publication candidate; excludes protected unrelated WIP',files:files.map(p=>{const raw=read(p),preserved=p.startsWith(dir),bytes=preserved?raw:Buffer.from(lf(raw));return {path:p,bytes:bytes.length,hashMode:preserved?'raw':'LF-normalized',sha256:sha(bytes)};})};
if(process.argv.includes('--write-manifest'))fs.writeFileSync(dir+'manifest.json',JSON.stringify(manifest,null,2)+'\n');else assert.deepEqual(json(dir+'manifest.json'),manifest);
const result={passed:true,method:'Offline text, Git scope and byte-hash audit only',baseline,ownedFiles:files.length,preservedRuns:index.length,sourceSnapshots:fs.readdirSync(dir+'source-evidence').length,acceptedGroups:36,coupledSteps:6,legacySteps:90,physicalSteps:0,helperClosure:11,overrunPreservedNotPassing:true,guardFailurePreservedNotPassing:true,runtimeDeclaration:{existing:23,added:55},actualNewYorkCalls:0,rendererCalls:0,builds:0,unrelatedWipExcluded:true};
fs.writeFileSync(dir+'verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
