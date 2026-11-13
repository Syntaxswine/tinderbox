import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createGzip} from 'node:zlib';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {createClosingRuntime} from './runtime.js';
import {createClosingReplay} from './replays.js';

export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function statistics(values){const a=[...values].sort((a,b)=>a-b);return {samples:a.length,mean:a.reduce((n,v)=>n+v,0)/(a.length||1),p95:a[Math.floor(a.length*.95)]||0,max:a.at(-1)||0};}
export function checkFrame(trial,frame){
  const falls=new Map(frame.falls.map(f=>[f.id,f])),rubble=new Map(frame.rubble.map(r=>[r.id,r])),issues=[];
  for(const s of frame.fireSamples){
    if(!(s.flame>0||s.smoke>0))continue;let reason=null;
    if(s.fallId){if(!falls.get(s.fallId)?.fuelIds.includes(s.id))reason='Missing live fall';}
    else if(s.rubbleId){const r=rubble.get(s.rubbleId);if(!r?.fuelIds.includes(s.id)||!s.floorFootprint?.length||s.supportBoundaryId!==r.supportBoundaryId)reason='Missing live rubble footprint/support';}
    else if(s.itemId){if(!trial.scene.items.get(s.itemId)?.intact)reason='Retired item';}
    else if(s.openingId){if(![...trial.scene.index.surfaces.values()].some(b=>b.openingId===s.openingId))reason='Unknown opening';}
    else if(s.boundaryId){if(!trial.scene.index.surfaces.get(s.boundaryId)?.intact)reason='Retired attached boundary';}
    else if(s.supportBoundaryId){if(!trial.scene.index.surfaces.get(s.supportBoundaryId)?.intact)reason='Retired loose support';}
    else reason='No physical owner';
    if((s.fallId||s.rubbleId)&&s.sourceSurfaceId)reason='Loose fuel claims original attachment';
    if(reason)issues.push({id:s.id,reason});
  }
  return {worldTime:frame.worldTime,samples:frame.fireSamples.length,falls:falls.size,rubble:rubble.size,issues};
}

// One input replay, not a sweep. Capture orchestration supplies the same real
// deadline/STOP marker to every case and preserves partial files on failure.
export async function traceCase(data,{out,mode,source,characterId='goat',deadline,stopFile,horizon}={}){
  if(!out||!['hero','direct','quiet'].includes(mode)||!Number.isFinite(deadline)||deadline>Date.now()+1801000)throw Error('Explicit trace deadline within30minutes required');
  if(fs.existsSync(path.join(out,mode+'-frames.ndjson.gz'))||fs.existsSync(path.join(out,mode+'-report.json')))throw Error('Existing trace evidence is preserved; choose a fresh output');
  const start=performance.now(),runtime=createClosingRuntime(data,{characterId}),initializationMs=performance.now()-start;let director;
  try{director=createClosingReplay(runtime,data,{mode,...(horizon===undefined?{}:{horizon})});}catch(error){runtime.dispose();throw error;}
  fs.mkdirSync(out,{recursive:true});const framesPath=path.join(out,mode+'-frames.ndjson.gz'),stream=fs.createWriteStream(framesPath,{flags:'wx'}),gzip=createGzip({level:1});gzip.pipe(stream);
  let streamError,streamClosed=false;stream.on('close',()=>{streamClosed=true;});stream.on('error',e=>{streamError=e;gzip.destroy(e);});gzip.on('error',e=>{streamError=e;stream.destroy(e);});
  const expiry=setTimeout(()=>gzip.destroy(Error('Combined recording deadline reached')),Math.max(0,deadline-Date.now())),stopWatch=stopFile?setInterval(()=>{if(fs.existsSync(stopFile))gzip.destroy(Error('Private STOP requested'));},300):null;
  const save=(name,value)=>fs.writeFileSync(path.join(out,mode+'-'+name+'.json'),JSON.stringify(value,null,2)+'\n');
  const costs={step:[],publication:[],serialization:[]},integrity=[],metrics=[];let failed=null,records=0;
  const write=async record=>{const t=performance.now(),line=JSON.stringify(record)+'\n';costs.serialization.push(performance.now()-t);if(!gzip.write(line))await once(gzip,'drain');records++;};
  function guard(){if(streamError)throw streamError;if(Date.now()>=deadline)throw Error('Combined recording deadline reached');if(stopFile&&fs.existsSync(stopFile))throw Error('Private STOP requested');}
  try{
    await write({type:'header',version:1,mode,source,seed:1893,characterId,horizon:director.state().horizon,wind:runtime.trial.windMetadata,receiverSelection:'default; no diagnostic hook',runtime:process.version});
    const publish=async full=>{const t=performance.now(),frame=runtime.frame({full}),ui=runtime.snapshot();costs.publication.push(performance.now()-t);const check=checkFrame(runtime.trial,frame);if(check.issues.length||frame.tick%30===0)integrity.push(check);if(check.issues.length)throw Error('Published fire source lost physical ownership');await write({type:'frame',frame,ui});};
    await publish(true);
    while(!director.state().complete&&!director.state().failed){
      guard();const t=performance.now();director.step();costs.step.push(performance.now()-t);
      const stride=runtime.worldTime<=65?2:15;
      if(runtime.tick%stride===0||director.state().complete||director.state().failed)await publish(false);
      if(runtime.tick%30===0){metrics.push(runtime.metrics());if(runtime.tick%300===0)console.log(JSON.stringify({mode,worldTime:runtime.worldTime,stage:director.state().stage,costMs:statistics(costs.step.slice(-300)),burning:runtime.metrics().burningCount}));await new Promise(resolve=>setImmediate(resolve));}
    }
    if(director.state().failed)throw Error(director.state().failed);
  }catch(error){failed=String(error.stack||error);}
  finally{clearTimeout(expiry);clearInterval(stopWatch);gzip.end();try{if(!streamClosed)await once(stream,'close');}catch(error){failed||=String(error);} }
  const snapshot=runtime.snapshot({thermal:true}),events=snapshot.events,thermalEvents=runtime.trial.events,physical=runtime.metrics();
  const findings={noIgnition:!thermalEvents.some(e=>e.type==='ignition'),oneInitialMatch:runtime.replay().thermal.commands.filter(c=>c.type==='match').length===1,onePickup:events.filter(e=>e.type==='lantern-pickup').length===1,smokeNotice:events.find(e=>e.type==='smoke-noticed')||null,residentExit:events.find(e=>e.type==='resident-exit')||null,residentSafe:events.find(e=>e.type==='resident-safe')||null,suspicion:events.filter(e=>e.type==='officer-reaction'&&e.reaction?.kind==='suspicious'),aggression:events.filter(e=>e.type==='officer-reaction'&&e.reaction?.kind==='aggressive'),shots:events.filter(e=>e.type==='officer-shot'),routeBlocks:events.filter(e=>e.type==='route-blocked'),firstFailure:thermalEvents.find(e=>e.type==='support-failure')||null,firstSupportLoss:thermalEvents.find(e=>e.type==='mechanical-support-loss')||null,firstLanding:thermalEvents.find(e=>e.type==='landing')||null};
  const entryId=cEntry(data),cover=events.findLast(e=>e.type==='door'&&e.details.id===entryId&&!e.details.open);
  const checks={replayComplete:director.state().complete,physicalOwnership:!integrity.some(i=>i.issues.length),finiteFuel:Math.abs(physical.fuel.error)<1e-6,finiteHeat:Math.abs(physical.heat.relativeError)<1e-8,...(mode==='hero'?{oneInitialMatch:findings.oneInitialMatch,onePickup:findings.onePickup,suspicion:findings.suspicion.length>0,noAggression:findings.aggression.length===0,noShot:findings.shots.length===0,smokeNotice:!!findings.smokeNotice,residentExit:!!findings.residentExit,localDamage:!!(findings.firstFailure||findings.firstSupportLoss),fallingMaterial:!!findings.firstLanding}:mode==='direct'?{oneInitialMatch:findings.oneInitialMatch,aggression:findings.aggression.length>0,clearShot:findings.shots.length>0,actualCoverClosed:!!cover&&runtime.doors().find(d=>d.id===entryId)?.openFraction===0,noCoveredShot:!!cover&&!findings.shots.some(e=>e.worldTime>cover.worldTime)}:{noIgnition:findings.noIgnition,noReaction:findings.suspicion.length===0&&findings.aggression.length===0})};
  const report={version:1,source,mode,characterId,createdAt:new Date().toISOString(),elapsedRealSeconds:(performance.now()-start)/1000,initializationMs,costMs:Object.fromEntries(Object.entries(costs).map(([k,v])=>[k,statistics(v)])),records,framesPath,framesSha256:sha(fs.readFileSync(framesPath)),stateSha256:sha(JSON.stringify(snapshot)),director:director.state(),geometry:runtime.geometryChecks,findings,checks,passed:!failed&&Object.values(checks).every(Boolean),failed,physical,metrics,integrity};
  save('inputs',runtime.replay());save('events',{scene:events,thermal:thermalEvents});save('snapshot',snapshot);save('cost-samples',costs);save('report',report);runtime.dispose();
  console.log(JSON.stringify({mode,complete:true,passed:report.passed,failed,checks,out}));return report;
}
function cEntry(data){return data.closingTime.doors.find(d=>d.id==='bell-and-alder:entry')?.id||data.closingTime.doors[0]?.id;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const get=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1];},dataPath=get('--data'),out=path.resolve(get('--out','artifacts/qa/bell-and-alder-closing/trace'));
  if(!dataPath||!out.startsWith(process.cwd()+path.sep))throw Error('Supply --data and an output within this checkout');
  const raw=fs.readFileSync(dataPath),source={dataSha256:sha(raw),artistCommit:get('--artist-commit'),runtimeCommit:get('--runtime-commit')};
  if(!/^[a-f0-9]{40}$/.test(source.artistCommit||'')||!/^[a-f0-9]{40}$/.test(source.runtimeCommit||''))throw Error('Exact art and runtime commits required');
  const report=await traceCase(JSON.parse(raw),{out,mode:get('--mode','hero'),source,deadline:Number(get('--deadline',Date.now()+1800000)),stopFile:get('--stop-file')});if(!report.passed)process.exitCode=1;
}
