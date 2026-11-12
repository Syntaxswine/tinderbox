import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createTrial,createClock,calmWind} from './simulation.js';
import {createNavigation} from './navigation.js';

const option=(name,fallback)=>{const index=process.argv.indexOf(name);return index<0?fallback:process.argv[index+1];};
const seconds=Number(option('--seconds','120')),data=JSON.parse(fs.readFileSync(new URL('./house-data.json',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
const cost=values=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:sorted.length,mean:sorted.reduce((a,b)=>a+b,0)/(sorted.length||1),p95:sorted[Math.floor(sorted.length*.95)]||0,max:sorted.at(-1)||0};};
const selectedCase=option('--case','both');
function checkFrame(trial,frame){
  const flights=new Map(frame.falls.map(f=>[f.id,f])),rubble=new Map(frame.rubble.map(r=>[r.id,r])),issues=[];
  for(const sample of frame.fireSamples){if(!(sample.flame>0||sample.smoke>0))continue;let reason=null;
    if(sample.fallId){if(!flights.get(sample.fallId)?.fuelIds.includes(sample.id))reason='Missing live flight';}
    else if(sample.rubbleId){const r=rubble.get(sample.rubbleId);if(!r?.fuelIds.includes(sample.id)||!sample.floorFootprint?.length||sample.supportBoundaryId!==r.supportBoundaryId)reason='Missing current rubble footprint/support';}
    else if(sample.itemId){if(!trial.scene.items.get(sample.itemId)?.intact)reason='Retired item';}
    else if(sample.openingId){if(![...trial.scene.index.surfaces.values()].some(b=>b.openingId===sample.openingId))reason='Unknown opening';}
    else if(sample.boundaryId){if(!trial.scene.index.surfaces.get(sample.boundaryId)?.intact)reason='Retired attached boundary';}
    else if(sample.supportBoundaryId){if(!trial.scene.index.surfaces.get(sample.supportBoundaryId)?.intact)reason='Retired loose support';}
    else reason='No current physical owner';
    if((sample.fallId||sample.rubbleId)&&sample.sourceSurfaceId)reason='Loose fuel claims original attachment';
    if(reason)issues.push({id:sample.id,reason,fallId:sample.fallId,rubbleId:sample.rubbleId,sourceSurfaceId:sample.sourceSurfaceId,originalSourceSurfaceId:sample.originalSourceSurfaceId,position:[sample.x,sample.y,sample.z]});
  }
  return {worldTime:frame.worldTime,revision:frame.revision,fireSamples:frame.fireSamples.length,falls:flights.size,rubble:rubble.size,issues};
}
const presets={kitchen:[.1,1.1,6.25],bedroom:[.1,3.13,5.25]},results=[];
for(const [name,position]of Object.entries(presets).filter(([name])=>selectedCase==='both'||name===selectedCase)) {
  const start=performance.now(),trial=createTrial(data),initializationMs=performance.now()-start,timings=[],samples=[],frameIntegrity=[];
  trial.command({tick:1,type:'match',position});
  for(let tick=0;tick<seconds*30;tick++) {
    const t=performance.now();trial.step();timings.push(performance.now()-t);
    if(trial.tick%300===0){const metrics=trial.metrics(),integrity=checkFrame(trial,trial.frame());samples.push(metrics);frameIntegrity.push(integrity);console.log(JSON.stringify({name,...metrics,costMs:cost(timings.slice(-300)),frameIntegrity:integrity}));}
  }
  const metrics=trial.metrics(),ignitions=trial.events.filter(e=>e.type==='ignition'),failures=trial.events.filter(e=>e.type==='support-failure'),falls=trial.events.filter(e=>e.type==='fall'),landings=trial.events.filter(e=>e.type==='landing');
  results.push({name,initializationMs,costMs:cost(timings),metrics,samples,frameIntegrity,summary:{firstIgnition:ignitions[0],lastIgnition:ignitions.at(-1),firstFailure:failures[0],firstFall:falls[0],firstLanding:landings[0],oil:trial.events.find(e=>e.type==='oil-release'),coal:ignitions.find(e=>e.cls==='coal'),duration:ignitions.length?Math.max(...[...trial.scene.fuels.values()].filter(f=>f.litAt!==null).map(f=>(f.spentAt??seconds)-f.litAt)):0},events:trial.events,replay:trial.replay(),support:trial.supportGraph.diagnostics(),eventCount:trial.events.length,stateBytes:JSON.stringify(trial.snapshot()).length,stateSha256:sha(JSON.stringify(trial.snapshot()))});trial.dispose();
}
const replaySchedules=[Array(300).fill(1/30),Array(600).fill(1/60),Array(120).fill(1/12),[7,.1,2.9],[10]],scheduleResults=[];
for(const schedule of replaySchedules){const trial=createTrial(data,{wind:calmWind}),clock=createClock(trial,{maxSteps:5});trial.command({tick:1,type:'match',position:presets.kitchen});clock.setPaused(false);for(const elapsed of schedule)clock.advance(elapsed);clock.drain();scheduleResults.push({tick:trial.tick,support:trial.supportGraph.diagnostics(),eventCount:trial.events.length,stateBytes:JSON.stringify(trial.snapshot()).length,stateSha256:sha(JSON.stringify(trial.snapshot())),droppedSeconds:clock.diagnostics().droppedSeconds});trial.dispose();}
const report={version:2,runtime:process.version,runtimeCommit:option('--runtime-commit',null),artistCommit:option('--artist-commit',null),sourceDataSha256:sha(fs.readFileSync(new URL('./house-data.json',import.meta.url))),seconds,controls:{frameSchedules:scheduleResults,identical:scheduleResults.every(r=>r.stateSha256===scheduleResults[0].stateSha256)},results};
const output=option('--out',null);if(output){const target=path.resolve(output);if(!target.startsWith(process.cwd()+path.sep))throw Error('Evidence output must stay in this checkout');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({complete:true,controls:report.controls,results:results.map(({events,samples,replay,...rest})=>rest)}));
if(!report.controls.identical||results.some(r=>Math.abs(r.metrics.fuel.error)>1e-7||Math.abs(r.metrics.heat.relativeError)>1e-9||r.summary.duration<60||r.frameIntegrity.some(f=>f.issues.length)))process.exitCode=1;
