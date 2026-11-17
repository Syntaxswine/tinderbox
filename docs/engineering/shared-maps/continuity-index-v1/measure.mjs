// Architect-authorized matched CPU pair. Fixed runtime and ordinary command path.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import inspector from 'node:inspector';
import {PerformanceObserver} from 'node:perf_hooks';
const args=process.argv.slice(2),mode=args.find(a=>a.startsWith('--mode='))?.slice(7),directory=args.find(a=>a.startsWith('--run-dir='))?.slice(10);
assert.equal(mode,'control','Exactly one unprofiled continuity measurement is authorized');const lane='continuity-candidate';
const frozen='0e1ab9ddc42a0f7e301858044c82a221f73d8805',sha=s=>createHash('sha256').update(s).digest('hex');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',windowsHide:true}).trim();
const experimentDelta={"path":"src/simulation/source-support.js","beforeLfSha256":"88f4a0b2c8e9937058b70dc5971c2393bfbbdafda583134332867066f67a1109","afterLfSha256":"1e6bd6ec6921119af942cce3e3fc69bf2449b0b3ead543697f88e435039bd98c"};assert.equal(git('diff','--name-only',frozen,'--','src','assets','art','vendor','workbenches'),experimentDelta.path);assert.equal(sha(fs.readFileSync(experimentDelta.path,'utf8').replace(/\r\n/g,'\n')),experimentDelta.afterLfSha256);
const declaration=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/runtime-integration.json','utf8'));
for(const r of [...declaration.runtimeFiles.map(r=>({path:r.path,hash:r.afterLfSha256})),...declaration.addedFiles.map(r=>({path:r.path,hash:r.lfSha256}))])assert.equal(sha(fs.readFileSync(r.path,'utf8').replace(/\r\n/g,'\n')),r.hash,r.path);
for(const r of declaration.runtimePackages)assert.equal(sha(fs.readFileSync(r.path)),r.sha256,r.path);
fs.mkdirSync(directory,{recursive:true});
const save=(name,value)=>fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify(value,null,2)+'\n');
const identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command','$p=Get-Process -Id '+process.pid+';[pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress'],{encoding:'utf8',windowsHide:true}));
const originalPath=path.resolve('tools/review/shared-map-route-contact.mjs'),original=fs.readFileSync(originalPath,'utf8').replace(/\r\n/g,'\n');let code=original;const substitutions=[];
function replace(before,after,purpose){assert.equal(code.split(before).length-1,1,purpose);code=code.replace(before,after);substitutions.push({purpose,before,after});}
replace("let trial;compiled.createNavigation=args=>{trial=args.trial;return createNavigation(args);};",String.raw`
const P=globalThis.__tinderboxCpuAttribution;
let trial;compiled.createNavigation=args=>{trial=args.trial;P.trial=trial;
  for(const key of ['unsupported','pendingSources','sourcesAdded'])P.timed(trial.supportGraph,key,'support.'+key);
  for(const key of ['hotSites','replaceSupportReferences','frame','fireSamples','metrics'])P.timed(trial,key,'trial.'+key);
  for(const key of ['candidates','crossings','supportAt','trace'])P.timed(trial.scene.index,key,'query.'+key);
  for(const key of ['shape','prepareClaim'])P.timed(args.querySource,key,'sourceQuery.'+key);
  for(const key of ['ensure','ensurePoint','beforeStep'])P.timed(args.activation,key,'activation.'+key);
  const prepare=trial.prepareSources;trial.prepareSources=function(...args){const at=performance.now();try{const staged=prepare.apply(this,args);for(const key of ['validate','commit'])P.timed(staged,key,'physical.'+key);return staged;}finally{P.record('physical.prepare',performance.now()-at);}};
  const nativeStep=trial.step;trial.step=function(...args){const at=performance.now();try{return nativeStep.apply(this,args);}finally{const elapsed=performance.now()-at,phases=trial.executionTimings();for(const [key,value]of Object.entries(phases))P.phaseTotals[key]=(P.phaseTotals[key]||0)+value;if(elapsed>25)P.slowSteps.push({tick:trial.tick,elapsedMs:elapsed,phases,sourceSurfaces:trial.scene.sourceDefinitions.size,cells:trial.scene.cells.size});}};
  return createNavigation(args);};`, 'Identical passive method and native-phase observers');
replace("const compiled=compileSharedMap", "globalThis.__tinderboxCpuAttribution.mark('cold-prepare-start');const compiled=compileSharedMap",'Record cold preparation');
replace("baselineRuntimeCommit:'2b350309d9116812a1d3988af090614bdaefbc25'","baselineRuntimeCommit:'cd443ccdd9cbbb38cf4c338ef697d902739726d6'",'Exact frozen source identity');
replace("const rect={left:0", "P.sim=sim;P.compiled=compiled;P.mark('cold-prepare-ready');P.states.cold=P.digest(sim,trial);const rect={left:0", 'Cold state digest without geometry expansion');
replace("const step=()=>{assert.ok(performance.now()-started<60000,'Finite CPU deadline');return sim.advance(1/60);};", "const step=()=>{assert.ok(performance.now()-P.started<60000,'Finite 60-second CPU deadline including cold preparation');assert.ok(P.hostSteps++<1000,'Finite 1000-host-step bound');return sim.advance(1/60);};",'Explicit wall and host-step bounds');
replace("const command=c=>{assert.equal(sim.dispatch(c),true);return step();};", "const command=c=>{P.commands.push(structuredClone(c));assert.equal(sim.dispatch(c),true);return step();};",'Ordinary input tape');
replace("useTool('timber',{x:54.8,y:26,h:3.02}","useTool('timber',{x:54.999999955296516,y:25.760000053644177,h:3.299999937415123}",'Reviewed actual camera jamb point');
replace('result.passed=true;',String.raw`
stage='fixed-32-host-step-held-window';
const heldBefore=sim.snapshot();P.states.before=P.digest(sim,trial);P.mark('held-start');
const heldStepStart=P.hostSteps,callsBefore=structuredClone(P.calls),phasesBefore={...P.phaseTotals};
for(const c of [{type:'select-tool',tool:'flamethrower'},{type:'primary',pressed:true}]){P.commands.push(c);assert.equal(sim.dispatch(c),true);}
for(let i=0;i<11;i++)step();
const release={type:'primary',pressed:false};P.commands.push(release);assert.equal(sim.dispatch(release),true);
for(let i=0;i<21;i++)step();
P.mark('held-end');const heldAfter=sim.snapshot();
P.held={hostSteps:P.hostSteps-heldStepStart,callsBefore,phasesBefore,before:{tick:heldBefore.tick,world:heldBefore.clocks.world,fuel:heldBefore.player.inventory.flamethrowerFuel,thermal:heldBefore.diagnostics.thermal},after:{tick:heldAfter.tick,world:heldAfter.clocks.world,fuel:heldAfter.player.inventory.flamethrowerFuel,thermal:heldAfter.diagnostics.thermal}};
assert.equal(P.held.hostSteps,32);assert.ok(Math.abs(heldAfter.clocks.world-heldBefore.clocks.world-32/60)<1e-12);assert.ok(Math.abs(heldBefore.player.inventory.flamethrowerFuel-heldAfter.player.inventory.flamethrowerFuel-.055)<1e-12);
P.states.after=P.digest(sim,trial);result.passed=true;`, 'One rapid queued input prefix, 11 held and 21 released steps');
replace('sim.dispose();compiled.dispose();result.elapsedMs=', 'P.result=result;P.mark("fixture-end");sim.dispose();compiled.dispose();result.elapsedMs=', 'Guaranteed ordinary disposal and result handoff');
code=code.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_,quote,relative)=>'from '+JSON.stringify(new URL(relative,pathToFileURL(originalPath)).href));
assert.equal(sha(code),'43f508cb92a9efd7e49113b12c3ed60968bc66a6f1c7fae659685e5ae38d8253','Keep the exact already-reviewed command and diagnostic-read fixture');const derivedPath=path.resolve(directory,'fixture.mjs');fs.writeFileSync(derivedPath,code);
const startedAt=Date.now(),started=performance.now(),initialCpu=process.cpuUsage(),marks=[],gc=[],digestCosts=[];
const P=globalThis.__tinderboxCpuAttribution={started,hostSteps:0,calls:{},phaseTotals:{},slowSteps:[],states:{},commands:[],held:null,
  record(name,ms){const row=this.calls[name]??={count:0,totalMs:0,maxMs:0};row.count++;row.totalMs+=ms;row.maxMs=Math.max(row.maxMs,ms);},
  timed(owner,key,label=key){if(!owner||typeof owner[key]!=='function')return;const raw=owner[key],profile=this;owner[key]=function(...args){const at=performance.now();try{return raw.apply(this,args);}finally{profile.record(label,performance.now()-at);}};},
  mark(stage){marks.push({stage,wallMs:performance.now()-started,cpuUsageUs:process.cpuUsage(initialCpu),hrtimeUs:Number(process.hrtime.bigint()/1000n),memory:process.memoryUsage()});},
  digest(sim,trial){const at=performance.now(),cpu=process.cpuUsage();const native=trial.snapshot(),s=sim.snapshot(),host={tick:s.tick,clocks:s.clocks,player:s.player,actors:s.actors,paused:s.paused,discharge:s.discharge,events:s.events,navigation:s.navigation},links=[...trial.supportGraph.links].sort(([a],[b])=>a.localeCompare(b)).map(([id,set])=>[id,[...set].sort()]);const label=['cold','before','after'][digestCosts.length];assert.ok(label,'Exactly three planned host captures');save(label+'-host',host);const hashes={nativeSha256:sha(JSON.stringify(native)),hostSha256:sha(JSON.stringify(host)),supportLinksSha256:sha(JSON.stringify(links)),replaySha256:sha(JSON.stringify(trial.replay())),counts:{boundaries:native.boundaries.length,fuels:native.fuels.length,cells:trial.scene.cells.size,supportNodes:links.length,supportEdges:links.reduce((n,[id,edges])=>n+edges.length,0)},fuel:native.metrics.fuel,heat:native.metrics.heat};digestCosts.push({wallMs:performance.now()-at,cpuUsageUs:process.cpuUsage(cpu)});return hashes;}
};

P.hostTimings=[];let ownedSimulation,lastWork={},lastActivation={};
Object.defineProperty(P,'sim',{get(){return ownedSimulation;},set(sim){ownedSimulation=sim;const raw=sim.advance;sim.advance=function(...args){const at=performance.now(),startUs=Number(process.hrtime.bigint()/1000n),cpu=process.cpuUsage();let returned;
  try{returned=raw.apply(this,args);return returned;}finally{
    const endUs=Number(process.hrtime.bigint()/1000n),elapsedMs=performance.now()-at,t=returned?.diagnostics?.thermal,work=t?.timing?.hostWork||{},activation=t?.activation||{};
    const workDelta=Object.fromEntries(Object.entries(work).filter(([k,v])=>typeof v==='number').map(([k,v])=>[k,v-(lastWork[k]||0)]));
    const activationDelta={batches:(activation.batches||0)-(lastActivation.batches||0),carriers:(activation.activatedCarriers||0)-(lastActivation.activatedCarriers||0),batchMs:(activation.totalBatchMs||0)-(lastActivation.totalBatchMs||0)};
    P.hostTimings.push({tick:returned?.tick,world:returned?.clocks.world,startUs,endUs,elapsedMs,cpuUsageUs:process.cpuUsage(cpu),nativeTick:t?.nativeTick,nativeSteps:t?.timing?.nativeSteps,nativeSimulationMs:t?.timing?.nativeSimulationMs,nativePhases:t?.timing?.nativeSteps?{...t.timing.nativePhases}:null,workDelta,activationDelta,cells:t?.gridCells,activeCarriers:t?.carriers?.activeCarriers,topologyCache:t?.support?.topologyCache?{...t.support.topologyCache}:null});
    lastWork={...work};lastActivation={...activation};P.record('host.advance',elapsedMs);
  }
};}});

const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())gc.push({startTime:e.startTime,duration:e.duration,kind:e.detail?.kind,flags:e.detail?.flags});});observer.observe({entryTypes:['gc']});
const helper={owner:'Coder Tinderbox',purpose:'M29 architect-authorized one unprofiled carrier-local continuity measurement',identity,ports:[],mode,startedAt:new Date(startedAt).toISOString(),expiresAt:new Date(startedAt+60000).toISOString(),bounds:{wallMs:60000,totalHostSteps:1000,heldWindowHostSteps:32,heldWorldSeconds:32/60},stopMethod:'Finite step guards, profiler disconnect and ordinary process exit',restart:{cwd:process.cwd(),executable:process.execPath,args:process.argv.slice(1)},source:{frozenRuntime:frozen,workspaceCommit:git('rev-parse','HEAD'),productionDiffEmpty:false,candidateProductionDelta:experimentDelta,lane,candidateMeasurement:true,parentAttributionCommit:'a5e171d9d924b6baf46151f416f23cd0d5746120',originalLfSha256:sha(original),derivedLfSha256:sha(code),producerSha256:sha(fs.readFileSync(new URL(import.meta.url))),sourceIntakes:declaration.sourceIntakes,runtimePackages:declaration.runtimePackages},configChanges:false};
save('helper',helper);save('adaptation-audit',{original:'tools/review/shared-map-route-contact.mjs',substitutions,originalLfSha256:sha(original),derivedLfSha256:sha(code)});
let session,profileStarted=false,profilerDisconnected=false,failure,rawProfile;
const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,result)=>error?reject(error):resolve(result)));
try{
  if(mode==='profile'){session=new inspector.Session();session.connect();await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');profileStarted=true;}
  P.mark('fixture-import-start');process.argv.push('--output='+path.join(directory,'result.json'));await import(pathToFileURL(derivedPath));P.mark('fixture-import-end');
  if(!P.result?.passed)throw Error(P.result?.failure?.message||'CPU fixture did not complete');
}catch(error){failure=error.stack;process.exitCode=1;}
finally{
  if(session){try{if(profileStarted){rawProfile=(await post('Profiler.stop')).profile;fs.writeFileSync(path.join(directory,'raw.cpuprofile'),JSON.stringify(rawProfile));}await post('Profiler.disable');}catch(error){failure??=error.stack;process.exitCode=1;}finally{session.disconnect();profilerDisconnected=true;}}
  try{P.sim?.dispose();P.compiled?.dispose();}catch(error){failure??=error.stack;process.exitCode=1;}
  await new Promise(resolve=>setImmediate(resolve));observer.disconnect();
  const cpu=process.cpuUsage(initialCpu),report={version:1,mode,passed:!failure,source:helper.source,bounds:helper.bounds,wallMs:performance.now()-started,cpuUsageUs:cpu,cpuMs:(cpu.user+cpu.system)/1000,marks,hostSteps:P.hostSteps,states:P.states,commandsSha256:sha(JSON.stringify(P.commands)),calls:P.calls,nativePhaseTotals:P.phaseTotals,slowNativeSteps:P.slowSteps,held:P.held,digestCosts,gc:{events:gc,totalMs:gc.reduce((n,e)=>n+e.duration,0)},profile:rawProfile?{path:'raw.cpuprofile',sha256:sha(fs.readFileSync(path.join(directory,'raw.cpuprofile'))),nodes:rawProfile.nodes.length,samples:rawProfile.samples?.length,startTime:rawProfile.startTime,endTime:rawProfile.endTime}:null,inclusiveCountersOverlap:true,failure,cleanup:{profilerDisconnected:mode==='control'||profilerDisconnected,gcObserverDisconnected:true,simulationDisposed:true,compiledDisposed:true,noServerOrBrowser:true,ports:[],retainedHelpers:false,closedAt:new Date().toISOString()}};
  report.candidateMeasurement=true;report.sameDiagnosticReadSchedule=true;report.hostTimings=P.hostTimings;report.topologyAfterDispose=P.trial?.supportGraph.diagnostics().topologyCache;report.lane=lane;report.rawHostPreimages=['cold-host.json','before-host.json','after-host.json'];save('commands',P.commands);report.totalProcessElapsedMs=process.uptime()*1000;report.totalProcessCpuUsageUs=process.cpuUsage();
  save('receipt',report);console.log(JSON.stringify({mode,passed:report.passed,wallMs:report.wallMs,cpuMs:report.cpuMs,hostSteps:report.hostSteps,heldSteps:report.held?.hostSteps,gcMs:report.gc.totalMs,profile:report.profile,cleanup:report.cleanup,failure}));delete globalThis.__tinderboxCpuAttribution;
}
