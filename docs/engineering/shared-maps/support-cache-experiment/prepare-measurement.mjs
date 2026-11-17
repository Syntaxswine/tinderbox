import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const out='artifacts/qa/shared-map-runtime/support-cache-experiment/',base='docs/engineering/shared-maps/cpu-stall-v1/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),lf=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),sha=s=>createHash('sha256').update(s).digest('hex');
const before=read(base+'runtime-source-declaration.json'),current=read('docs/engineering/shared-maps/runtime-integration.json'),expected=structuredClone(before);
const changed=['src/simulation/source-support.js','workbenches/furnished-house/simulation.js'];
expected.runtimeFiles.find(r=>r.path===changed[1]).afterLfSha256=sha(lf(changed[1]));
expected.runtimeFiles.find(r=>r.path===changed[1]).reason='Commit native source batches without resetting heat/time; reuse native local support, inert falls, real rubble and pane retirement without fuel creation; dispose owned source-support memoization with the trial.';
for(const p of [changed[0],'tools/record-shared-map-runtime.mjs'])expected.addedFiles.find(r=>r.path===p).lfSha256=sha(lf(p));
assert.deepEqual(current,expected,'Only the support cache, native disposal hook and exact declaration-producer self-hash may differ');
const delta=Object.fromEntries(changed.map(path=>[path,{beforeLfSha256:sha(execFileSync('git',['show','cd443ccdd9cbbb38cf4c338ef697d902739726d6:'+path],{encoding:'utf8',windowsHide:true}).replace(/\r\n/g,'\n')),afterLfSha256:sha(lf(path))}]));
let code=lf(base+'matched-cpu.mjs');const originalProducer=sha(code),changes=[];
function replace(before,after,purpose){assert.equal(code.split(before).length-1,1,purpose);code=code.replace(before,after);changes.push({purpose,before,after});}
replace("assert.ok(['control','profile'].includes(mode));","assert.equal(mode,'control','Exactly one unprofiled optimized measurement is authorized');",'Do not create an extra profile');
replace("assert.equal(git('diff','--name-only',frozen,'--','src','assets','art','vendor','workbenches'),'');",`const experimentDelta=${JSON.stringify(delta)};assert.deepEqual(git('diff','--name-only',frozen,'--','src','assets','art','vendor','workbenches').split(/\\r?\\n/).filter(Boolean).sort(),Object.keys(experimentDelta).sort());for(const [path,pin]of Object.entries(experimentDelta))assert.equal(sha(fs.readFileSync(path,'utf8').replace(/\\r\\n/g,'\\n')),pin.afterLfSha256,path);`,'Pin exactly the two authorized production changes');
replace('productionDiffEmpty:true,','productionDiffEmpty:false,experimentDelta,','Record the scoped physical-source delta');
replace('const observer=new PerformanceObserver',String.raw`
P.slowHostSteps=[];let ownedSimulation;
Object.defineProperty(P,'sim',{get(){return ownedSimulation;},set(sim){ownedSimulation=sim;const raw=sim.advance;sim.advance=function(...args){const at=performance.now(),cpu=process.cpuUsage();try{return raw.apply(this,args);}finally{const elapsed=performance.now()-at;P.record('host.advance',elapsed);if(elapsed>25){const snapshot=sim.snapshot();P.slowHostSteps.push({tick:snapshot.tick,world:snapshot.clocks.world,elapsedMs:elapsed,cpuUsageUs:process.cpuUsage(cpu),topologyCache:snapshot.diagnostics.thermal.support.topologyCache});}}};}});
const observer=new PerformanceObserver`, 'Measure actual host-step stalls without changing the derived command fixture');
replace('report.totalProcessElapsedMs=',"report.slowHostSteps=P.slowHostSteps;report.topologyAfterDispose=P.trial?.supportGraph.diagnostics().topologyCache;report.totalProcessElapsedMs=",'Keep worst host-step and disposal evidence');
fs.writeFileSync(out+'optimized-cpu.mjs',code);
fs.writeFileSync(out+'preparation.json',JSON.stringify({scope:'One bounded ordered support-cache experiment; identical derived fixture and physical digest comparison to cd443 control.',originalProducerLfSha256:originalProducer,experimentProducerLfSha256:sha(code),experimentDelta:delta,changes,productionChanges:changed,declarationDeltaVerified:true},null,2)+'\n');
console.log(JSON.stringify({experimentDelta:delta,declarationDeltaVerified:true,producerSha256:sha(code)}));
