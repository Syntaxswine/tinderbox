import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const out='artifacts/qa/shared-map-runtime/support-cache-attribution-v1/',base='docs/engineering/shared-maps/support-cache-experiment/';
const sha=s=>createHash('sha256').update(s).digest('hex'),lf=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const pins=JSON.parse(lf(base+'lifecycle-successor.json')).currentProductionPins;
for(const [path,pin]of Object.entries(pins))assert.equal(sha(lf(path)),pin.successorLfSha256,path);
const authority=execFileSync('git',['show','7e6ba530b92d8cc26544d13059bea9528332ef1b:docs/engineering/shared-maps/cache-comparison-decision.md'],{encoding:'utf8',windowsHide:true});
fs.writeFileSync(out+'authority.md',authority);
let code=lf(base+'correctness-producer.mjs');const originalProducer=sha(code),changes=[];
function replace(before,after,purpose){assert.equal(code.split(before).length-1,1,purpose);code=code.replace(before,after);changes.push({purpose,before,after});}
replace(code.split('\n').find(l=>l.startsWith("assert.equal(mode,'control'")),"assert.equal(mode,'profile','Exactly one attribution-only profile is authorized');const lane='final-source-attribution';",'No control or extra lane');
replace("const frozen='cd443ccdd9cbbb38cf4c338ef697d902739726d6'","const frozen='0e1ab9ddc42a0f7e301858044c82a221f73d8805'",'Freeze the final three-path source');
replace(code.split('\n').find(l=>l.startsWith('const experimentDelta=')),`const experimentDelta=${JSON.stringify(pins)};assert.equal(git('diff','--name-only',frozen,'--','src','assets','art','vendor','workbenches'),'');for(const [path,pin]of Object.entries(experimentDelta))assert.equal(sha(fs.readFileSync(path,'utf8').replace(/\\r\\n/g,'\\n')),pin.successorLfSha256,path);`,'Exact final production freeze and three accepted file pins');
replace("purpose:'M29 architect-authorized raw-host correctness '+lane","purpose:'M29 7e6ba530 one final-source attribution profile'",'Record the actual grant');
replace('productionDiffEmpty:false,experimentDelta,lane,correctnessOnly:true,',"productionDiffEmpty:true,finalProductionPins:experimentDelta,lane,attributionOnly:true,authority:'7e6ba530b92d8cc26544d13059bea9528332ef1b',",'Do not label this a correctness or performance-improvement experiment');
const timer=String.raw`
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
`;
assert.ok(!timer.includes('.snapshot('),'Host timing must reuse the returned publication and make no extra snapshot read');
replace('const observer=new PerformanceObserver',timer+'\nconst observer=new PerformanceObserver','Record host-step intervals and existing counters without extra reads');
replace("report.correctnessOnly=true;report.lane=lane;","report.attributionOnly=true;report.sameDiagnosticReadSchedule=true;report.hostTimings=P.hostTimings;report.topologyAfterDispose=P.trial?.supportGraph.diagnostics().topologyCache;report.lane=lane;",'Retain bounded intervals and true final disposal evidence');
const expectedFixture=JSON.parse(lf(base+'correctness-candidate-receipt.json')).source.derivedLfSha256;
replace('const derivedPath=path.resolve(directory,\'fixture.mjs\');',`assert.equal(sha(code),'${expectedFixture}','Keep the exact already-reviewed command and diagnostic-read fixture');const derivedPath=path.resolve(directory,'fixture.mjs');`,'Verify unchanged derived fixture before starting the inspector');
fs.writeFileSync(out+'profile.mjs',code);
fs.writeFileSync(out+'preparation.json',JSON.stringify({scope:'One attribution-only profile of final source; no control, optimization, build, GL or improvement claim.',runtimeCommit:'0e1ab9ddc42a0f7e301858044c82a221f73d8805',authorityCommit:'7e6ba530b92d8cc26544d13059bea9528332ef1b',originalProducerLfSha256:originalProducer,producerLfSha256:sha(code),unchangedDerivedFixtureLfSha256:expectedFixture,finalProductionPins:pins,hostTimerUsesOnlyReturnedSnapshot:true,changes},null,2)+'\n');
console.log(JSON.stringify({producerLfSha256:sha(code),runtime:'0e1ab9dd',expectedFixture,hostTimerAddsNoReads:true}));
