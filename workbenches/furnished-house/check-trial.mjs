import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createTrial,createClock,calmWind} from './simulation.js';
import {createNavigation} from './navigation.js';

const option=(name,fallback)=>{const index=process.argv.indexOf(name);return index<0?fallback:process.argv[index+1];};
const seconds=Number(option('--seconds','120')),data=JSON.parse(fs.readFileSync(new URL('./house-data.json',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
const cost=values=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:sorted.length,mean:sorted.reduce((a,b)=>a+b,0)/(sorted.length||1),p95:sorted[Math.floor(sorted.length*.95)]||0,max:sorted.at(-1)||0};};
const presets={kitchen:[.1,1.1,6.25],bedroom:[.1,3.15,5.75]},results=[];
for(const [name,position]of Object.entries(presets)) {
  const start=performance.now(),trial=createTrial(data),initializationMs=performance.now()-start,timings=[],samples=[];
  trial.command({tick:1,type:'match',position});
  for(let tick=0;tick<seconds*30;tick++) {
    const t=performance.now();trial.step();timings.push(performance.now()-t);
    if(trial.tick%300===0){const metrics=trial.metrics();samples.push(metrics);console.log(JSON.stringify({name,...metrics,costMs:cost(timings.slice(-300))}));}
  }
  const metrics=trial.metrics(),ignitions=trial.events.filter(e=>e.type==='ignition'),failures=trial.events.filter(e=>e.type==='support-failure'),falls=trial.events.filter(e=>e.type==='fall'),landings=trial.events.filter(e=>e.type==='landing');
  results.push({name,initializationMs,costMs:cost(timings),metrics,samples,summary:{firstIgnition:ignitions[0],lastIgnition:ignitions.at(-1),firstFailure:failures[0],firstFall:falls[0],firstLanding:landings[0],oil:trial.events.find(e=>e.type==='oil-release'),coal:ignitions.find(e=>e.cls==='coal'),duration:ignitions.length?Math.max(...[...trial.scene.fuels.values()].filter(f=>f.litAt!==null).map(f=>(f.spentAt??seconds)-f.litAt)):0},events:trial.events,replay:trial.replay(),stateSha256:sha(JSON.stringify(trial.snapshot()))});trial.dispose();
}
const replaySchedules=[Array(30).fill(1/30),Array(60).fill(1/60),Array(12).fill(1/12),[.7,.01,.29],[1]],scheduleResults=[];
for(const schedule of replaySchedules){const trial=createTrial(data,{wind:calmWind}),clock=createClock(trial,{maxSteps:5});trial.command({tick:1,type:'match',position:presets.kitchen});clock.setPaused(false);for(const elapsed of schedule)clock.advance(elapsed);clock.drain();scheduleResults.push({tick:trial.tick,stateSha256:sha(JSON.stringify(trial.snapshot())),droppedSeconds:clock.diagnostics().droppedSeconds});trial.dispose();}
const report={version:1,runtime:process.version,sourceDataSha256:sha(fs.readFileSync(new URL('./house-data.json',import.meta.url))),seconds,controls:{frameSchedules:scheduleResults,identical:scheduleResults.every(r=>r.stateSha256===scheduleResults[0].stateSha256)},results};
const output=option('--out',null);if(output){const target=path.resolve(output);if(!target.startsWith(process.cwd()+path.sep))throw Error('Evidence output must stay in this checkout');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({complete:true,controls:report.controls,results:results.map(({events,samples,replay,...rest})=>rest)}));
if(!report.controls.identical||results.some(r=>Math.abs(r.metrics.fuel.error)>1e-7||Math.abs(r.metrics.heat.relativeError)>1e-9||r.summary.duration<60))process.exitCode=1;
