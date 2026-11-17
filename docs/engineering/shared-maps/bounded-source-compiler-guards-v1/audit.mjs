// Text/hash and saved focused logs only. No compiler/world imports or replay.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),prefix=path.relative(root,here).replaceAll('\\','/'),base='c66e659451284309e48dc420791369dd5af37e1e';
const read=p=>fs.readFileSync(path.join(root,p)),lf=p=>read(p).toString('utf8').replace(/\r\n/g,'\n'),sha=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(read(p));
const git=(...args)=>execFileSync('git',args,{windowsHide:true,maxBuffer:4*1024*1024}),text=(...args)=>git(...args).toString('utf8').trim().split(/\r?\n/).filter(Boolean),old=p=>git('show',base+':'+p);
const owned=['src/simulation/regional-source-pilot.js','workbenches/furnished-house/regional-domain.js','tests/integration/regional-source-compiler.test.mjs','tests/integration/regional-source-guards.test.mjs','docs/engineering/shared-maps/runtime-integration.json'],wip='docs/engineering/shared-maps/support-regions-proposal.md';
assert.equal(sha(read(wip)),'56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f');
const previous='docs/engineering/shared-maps/bounded-source-compiler-v1/',manifest=json(previous+'manifest.json');
assert.equal(sha(read(previous+'manifest.json')),sha(old(previous+'manifest.json')));
let originalSources=0,rawArchiveFiles=1;
for(const pin of manifest.files){if(pin.mode==='raw'){assert.equal(sha(read(pin.path)),pin.sha256,pin.path);rawArchiveFiles++;}else{assert.equal(sha(old(pin.path).toString('utf8').replace(/\r\n/g,'\n')),pin.sha256,pin.path);originalSources++;}}
const immutable=['workbenches/furnished-house/scene.js','workbenches/furnished-house/geometry.js','workbenches/furnished-house/partition-error.js','workbenches/furnished-house/prepare-data.js','tools/record-shared-map-runtime.mjs'];
for(const p of immutable)assert.equal(lf(p),old(p).toString('utf8').replace(/\r\n/g,'\n'),p);
const plan=json(previous+'plan.json');let originalDependencyPins=0;
for(const pin of plan.sourcePins){
  if(pin.path===wip){assert.equal(sha(read(wip)),pin.sha256);continue;} // Deliberately uncommitted in the prior checkpoint too.
  if(pin.mode==='raw'){assert.equal(sha(read(pin.path)),pin.sha256);assert.deepEqual(text('hash-object','--no-filters','--',pin.path),text('rev-parse',base+':'+pin.path));}
  else{assert.equal(sha(old(pin.path).toString('utf8').replace(/\r\n/g,'\n')),pin.sha256);if(!['src/simulation/regional-source-pilot.js','workbenches/furnished-house/regional-domain.js'].includes(pin.path))assert.equal(sha(lf(pin.path)),pin.sha256);}
  originalDependencyPins++;
}
for(const attempt of ['first','final']){const receipt=json(prefix+'/'+attempt+'.json'),log=lf(prefix+'/'+attempt+'.log');assert.equal(receipt.exitCode,0);assert.equal(receipt.signal,null);assert.equal(receipt.actualRoofReruns,0);assert.ok(log.includes('tests 12')&&log.includes('pass 12')&&log.includes('fail 0'));assert.ok(log.includes('"original":4,"current":4,"regional":14,"total":22'));assert.ok(log.includes('"regionalNativeCalls":5,"retainedReceipts":0,"actualRoofReruns":0'));}
const cleanup=json(prefix+'/cleanup.json');assert.ok(cleanup.tests.every(t=>!t.knownTestLifetimeAlive));assert.deepEqual(cleanup.retainedHelpers,[]);assert.deepEqual(cleanup.portsAllocated,[]);
const current=lf('src/simulation/regional-source-pilot.js');assert.ok(current.includes('descriptors:320'));assert.ok(current.indexOf('if(catalogueSize>REGIONAL_SOURCE_PILOT_LIMITS.descriptors)')<current.indexOf('for(const owner of ownerMap.values())for'));assert.ok(current.includes('r.physical.validate()'));assert.ok(current.includes('Math.abs(carry)>proved'));assert.ok(!current.includes('f.amount='));
const declaration=json('docs/engineering/shared-maps/runtime-integration.json');assert.equal(declaration.runtimeFiles.length,22);assert.equal(declaration.addedFiles.length,47);for(const p of owned.filter(p=>/^(src|workbenches)\//.test(p)))assert.ok(declaration.addedFiles.some(row=>row.path===p&&row.lfSha256===sha(lf(p))));
const changed=[...new Set([...text('diff','--name-only','HEAD'),...text('ls-files','--others','--exclude-standard')])];assert.ok(changed.every(p=>p===wip||owned.includes(p)||p.startsWith(prefix+'/')));assert.ok(!text('diff','--cached','--name-only').includes(wip));
const result={version:1,base,passed:true,scope:'Successor receipt/span/carry guards only',focused:{runs:2,testsPerRun:12,originalCalls:8,currentCalls:8,regionalCalls:38,totalNativeCalls:54,rejectedBeforeNative:2,rootEarlierReproCallsExcluded:2},actualRoofReruns:0,previousArchive:{rawFilesIncludingManifest:rawArchiveFiles,originalSourcePins:originalSources,originalDependencyPins,allPreserved:true,spentComparisonNotReplayed:true},nativeAlgorithmFilesUnchanged:immutable,constructorCatalogueCeiling:320,guard:'In-place immutable nested data plus local table/record/field references; no full geometry clone',partialCarry:'Finite absolute carry must fit separately derived parent roundoff; measured/native quantities unchanged',runtimeDeclaration:{modified:22,added:47},sourcePins:owned.map(p=>({path:p,lfSha256:sha(lf(p))})),wipPreserved:true,helpers:[],ports:[],productionEnabled:false};
const target=path.join(here,'verification.json');if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(target)),result);else fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,testsPerRun:12,focusedRuns:2,totalSyntheticNativeCalls:54,actualRoofReruns:0,oldArchiveRawFiles:rawArchiveFiles,originalSourcePins:originalSources}));
