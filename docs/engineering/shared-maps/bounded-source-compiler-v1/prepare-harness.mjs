// Text/hash preparation only. This script never imports or runs native code.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),authority='1a88cf4748bf62c1456285ff43412c929d311199';
const file=name=>path.join(here,name),read=p=>fs.readFileSync(path.join(root,p)),lf=p=>read(p).toString('utf8').replace(/\r\n/g,'\n'),hash=b=>createHash('sha256').update(b).digest('hex');
const git=p=>{try{return execFileSync('git',['show',authority+':'+p],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024}).replace(/\r\n/g,'\n');}catch(error){throw Error('Source-only git read failed for '+p+': '+error.code);}};
for(const name of ['launch.once','comparison-started.once','launch.json','partial.json','final.json','receipt.json'])assert.ok(!fs.existsSync(file(name)),'No preparation after a consumed comparison: '+name);
const scenePath='workbenches/furnished-house/scene.js',mathPath='workbenches/furnished-house/partition-error.js',before=git(scenePath),after=lf(scenePath),mathBefore=git(mathPath),mathAfter=lf(mathPath);
const slice=(s,start,end)=>{const a=s.indexOf(start);assert.ok(a>=0,start);const b=s.indexOf(end,a);assert.ok(b>a,end);return s.slice(a,b);};
const nativeBody=s=>slice(s,'      const c=[x,y,z],clipBox=',"  onLoadPhase?.({phase:'physical-clipping-ready'");
assert.equal(nativeBody(after),nativeBody(before),'Original native body/IDs/geometry/fuel denominator unchanged');
const originalBounds=slice(before,'    const box=bounds(triangles.flat()),normal=','    for(let z=lo[2]');
assert.equal(slice(after,'    const box=bounds(triangles.flat()),normal=','    const first=region?'),originalBounds,'Full original lo/hi calculated before restriction');
assert.equal(slice(before,'export const CELL','export function compileScene'),slice(after,'export const CELL','export function compileScene'),'Original profiles/material rules unchanged');
assert.equal(slice(mathBefore,'  function strictArea','  for(let z='),slice(mathAfter,'  function strictArea','  for(let z='),'Original strict intersection/uncertainty body unchanged');
assert.equal(mathBefore.slice(mathBefore.lastIndexOf('  return {epsilon:EPS,sourceArea,lowerArea')),mathAfter.slice(mathAfter.lastIndexOf('  return {epsilon:EPS,sourceArea,lowerArea')),'Original default allowance return unchanged');
const wip='docs/engineering/shared-maps/support-regions-proposal.md';assert.equal(hash(read(wip)),'56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f');
const archiveChecks=[];
for(const dir of ['support-large-proof-v1','support-large-proof-v2','bounded-source-regions-v1']){
  const manifestPath='docs/engineering/shared-maps/'+dir+'/manifest.json',manifest=JSON.parse(read(manifestPath));let raw=0,normalized=0;
  for(const pin of manifest.files){const bytes=read(pin.path),inside=pin.path.startsWith('docs/engineering/shared-maps/'+dir+'/');if(inside){assert.equal(hash(bytes),pin.sha256||pin.rawSha256,pin.path);raw++;}else{assert.equal(hash(bytes.toString('utf8').replace(/\r\n/g,'\n')),pin.lfSha256,pin.path);normalized++;}}
  archiveChecks.push({manifest:manifestPath,manifestRawSha256:hash(read(manifestPath)),rawFiles:raw,lfTextFiles:normalized});
}
const sourceFiles=new Set(),walk=p=>{if(sourceFiles.has(p))return;sourceFiles.add(p);const text=lf(p);for(const match of text.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g)){const dependency=path.posix.normalize(path.posix.join(path.posix.dirname(p),match[1]));assert.ok(!dependency.startsWith('../'));walk(dependency);}};
walk('src/content/shared-map.js');walk('src/simulation/regional-source-pilot.js');
for(const p of sourceFiles)if(![scenePath,mathPath,'src/simulation/regional-source-pilot.js','workbenches/furnished-house/regional-domain.js'].includes(p))assert.equal(lf(p),git(p),'Unchanged original dependency '+p);
const original=before.replace(/from (['"])\.\/([^'"]+)\1/g,(_,q,s)=>'from '+q+'../../../../workbenches/furnished-house/'+s+q);
fs.writeFileSync(file('original-scene.mjs'),original);
assert.equal(original.replace(/from (['"])\.\.\/\.\.\/\.\.\/\.\.\/workbenches\/furnished-house\/([^'"]+)\1/g,(_,q,s)=>'from '+q+'./'+s+q),before);
let launcher=lf('docs/engineering/shared-maps/support-large-proof-v2/launch.ps1');
const replacements=[
  ["'proof.mjs'","'compare.mjs'"],["'89d4073103f436187236ee0272c1ceac6067fe02'","'"+authority+"'"],
  ["'proof-started.once'","'comparison-started.once'"],
  ["'One exact ordered-pair 3555 native support preparation observation'","'One isolated regional compiler/stock correctness comparison; four full-roof-equivalent native passes maximum'"],
  ["'This one observation consumes the grant. Preserve sources and outputs; no automatic rerun or restart is authorized.'","'This comparison consumes the grant. Preserve sources and outputs; no automatic rerun or restart is authorized.'"],
  ["'docs/engineering/shared-maps/support-preparation-v1/source-pins.json'","'docs/engineering/shared-maps/bounded-source-compiler-v1/plan.json:inputPins'"],
  ["'docs/engineering/shared-maps/support-preparation-v1/compiler-dependencies.json'","'docs/engineering/shared-maps/bounded-source-compiler-v1/plan.json:sourcePins'"],
  ["@('partial.json','final.json','calculations/','reference-blocks.json','stdout.log','stderr.log','receipt.json')","@('partial.json','final.json','iterations-forward.jsonl','iterations-reverse.jsonl','iterations-scattered.jsonl','stdout.log','stderr.log','receipt.json')"]
];for(const [a,b]of replacements){assert.ok(launcher.includes(a),a);launcher=launcher.replaceAll(a,b);}fs.writeFileSync(file('launch.ps1'),launcher);
const inputs=JSON.parse(read('docs/engineering/shared-maps/support-preparation-v1/source-pins.json')).files,sourceRevision=hash(JSON.stringify(inputs));
const pin=(p,mode='LF')=>({path:p,mode,sha256:hash(mode==='LF'?lf(p):read(p))});
const sourcePins=[...sourceFiles].sort().map(p=>pin(p));
for(const p of ['docs/engineering/shared-maps/bounded-source-regions-v1/grouping.json',wip,'docs/engineering/shared-maps/support-large-proof-v2/reference-blocks.json','docs/engineering/shared-maps/support-preparation-v1/source-pins.json'])sourcePins.push(pin(p,'raw'));
const plan={version:1,authority,sourceSeam:'989ecd6777f8a77791b0fa8ad32fcc618a2d3438',nodeRuntime:process.version,sourceRevision,kind:'One bounded correctness comparison, not a benchmark',limits:{originalNativeCalls:1,fullRoofEquivalentPasses:4,regionsPerOrder:320,regionalNativeCalls:960,cooperativeMs:50000,parentForceMs:55000,absoluteMs:60000,nodeOldSpaceMiB:1024},orders:['forward','reverse','scattered'],reuseDeckFromOriginalReference:true,noFifthPass:true,firstSubstantiveFailureStops:true,inputPins:inputs,sourcePins,harnessPins:['prepare-harness.mjs','compare.mjs','original-scene.mjs','launch.ps1'].map(name=>({file:name,sha256:hash(fs.readFileSync(file(name)))}))};
fs.writeFileSync(file('plan.json'),JSON.stringify(plan,null,2)+'\n');
const audit={version:1,authority,originalSceneLfSha256:hash(before),originalNativeCellBodyLfSha256:hash(nativeBody(before)),fullOriginalBoundsUnchanged:true,originalSingleDecisionInUnchangedBody:true,originalFuelFormulaAndDenominatorUnchanged:true,originalStrictAreaBodyLfSha256:hash(slice(mathBefore,'  function strictArea','  for(let z=')),originalDefaultAllowanceReturnUnchanged:true,unchangedOriginalDependencies:sourceFiles.size-4,sourceFiles:sourceFiles.size,originalSceneAdaptation:'Only relative import paths retargeted; reversible byte-exact LF original body.',nativeAlgorithmAdaptation:'Clamp full original integer lo/hi by a branded [4,1,4] domain before the original loop; record visits. No whole compile/filter.',productionIsolation:'Pilot is imported by its focused test and bounded harness only; ordinary installer rejects partial outputs.',unrelatedWipRawSha256:hash(read(wip)),priorArchives:archiveChecks,actualNativeCalculations:0,worldTrials:0,worldSteps:0};
fs.writeFileSync(file('preflight.json'),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({sourceFiles:sourceFiles.size,priorArchives:archiveChecks,sourceAuditPassed:true,actualNativeCalculations:0}));
