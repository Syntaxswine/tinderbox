import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const M30_BASE='b27ca225661323871e9f0bb8c536428a519d49b5';
export const M30_COMMANDS_SHA256='aa9204fe43071b6f514175004714345121683681d8a46e53ae5c5c933580c9f7';
export function assertVisualFrameCollection({frames,hostRenders,preparationRenders,allRenders}){
  assert.ok(frames>0,'M30_FRAME_HOOK_MISSING');
  assert.equal(frames,hostRenders,'M30_HOST_FRAME_ACCOUNTING_MISMATCH');
  assert.equal(hostRenders+preparationRenders,allRenders,'M30_RENDER_ACCOUNTING_MISMATCH');
}
export function currentVisualWorkload(input){
  assert.equal(input.commands.length,309,'INPUT_PREFIX_COUNT');
  assert.equal(createHash('sha256').update(JSON.stringify(input.commands)).digest('hex'),M30_COMMANDS_SHA256,'INPUT_PREFIX_HASH');
  assert.equal(input.characterId,'goat');assert.equal(input.seed,1893);assert.equal(input.hostStep,1/60);assert.equal(input.scenario,'neighborhood');assert.equal(input.representation,'structure');
  const windows=structuredClone(input.windows);assert.equal(windows.at(-1).last,1620);assert.deepEqual(windows.map(w=>w.name),['quiet','moving-body','growing-early','growing-middle','growing-later']);
  return {version:1,base:M30_BASE,characterId:'goat',seed:1893,hostStep:1/60,scenario:'neighborhood',representation:'structure',commands:structuredClone(input.commands),commandsSha256:M30_COMMANDS_SHA256,windows,lastHostTick:1620,collection:'Every displayed frame; native-advance flag; latest snapshot only',budgets:'Not frozen; architect decision follows current baseline'};
}
export function distribution(values){
  assert.ok(values.every(v=>Number.isFinite(v)&&v>=0),'NONFINITE_TIMING');
  const sorted=[...values].sort((a,b)=>a-b),n=sorted.length;
  return {count:n,mean:n?values.reduce((a,b)=>a+b,0)/n:null,p95:n?sorted[Math.floor((n-1)*.95)]:null,max:n?sorted.at(-1):null,min:n?sorted[0]:null};
}
export function summarizeVisualRows(rows){
  const summarize=list=>({frames:list.length,publication:distribution(list.map(r=>r.publicationMs)),art:distribution(list.map(r=>r.artMs)),preparation:distribution(list.map(r=>r.publicationMs+r.artMs)),submission:distribution(list.map(r=>r.renderSubmitMs)),visualCpu:distribution(list.map(r=>r.publicationMs+r.artMs+r.renderSubmitMs)),gpu:distribution(list.map(r=>r.gpuMs)),fullFrameCpu:distribution(list.map(r=>r.fullFrameCpuMs)),inclusiveSimulation:distribution(list.map(r=>r.simulationMs)),drawCalls:distribution(list.map(r=>r.drawCalls)),triangles:distribution(list.map(r=>r.triangles)),sourceCount:distribution(list.map(r=>r.sourceCount))});
  assert.ok(rows.length&&rows.every((r,i)=>r.frame===i+1),'MISSING_DISPLAYED_FRAME');
  const windows=Object.fromEntries(['quiet','moving-body','growing-early','growing-middle','growing-later'].map(name=>{const list=rows.filter(r=>r.window===name);return [name,{allDisplayed:summarize(list),newNative:summarize(list.filter(r=>r.newNative)),betweenNative:summarize(list.filter(r=>!r.newNative))}];}));
  return {allDisplayed:summarize(rows),newNative:summarize(rows.filter(r=>r.newNative)),betweenNative:summarize(rows.filter(r=>!r.newNative)),windows,formula:'visualCpu = complete snapshot publication + art + render submission, framewise. Publication is already inside inclusive simulation and fullFrameCpu. GPU remains separate.',percentile:'Sorted element floor((n-1)*0.95); no discarded outliers'};
}
export function validateVisualControls(rows){
  const later=rows.filter(r=>r.window==='growing-later'),body=rows.filter(r=>r.window==='moving-body'),quiet=rows.filter(r=>r.window==='quiet');
  assert.equal(quiet.filter(r=>r.newNative).length,30,'QUIET_NEW_NATIVE_COUNT');assert.equal(later.filter(r=>r.newNative).length,60,'DENSE_NEW_NATIVE_COUNT');
  assert.ok(later.some(r=>r.projectedWallFlames>0&&r.projectedRoofFlames>0&&r.smokeSources>0),'VISIBLE_WALL_ROOF_SMOKE_CONTROL');
  assert.ok(rows.some(r=>r.grassCells>0),'NEARBY_GRASS_CONTROL');assert.ok(rows.some(r=>r.groundFlames>0),'GROUND_FIRE_CONTROL');
  const overlap=validateMovingBodyRows(body),moved=overlap.travelXZ;
  assert.ok(rows.every(r=>r.dropped===0&&!r.paused),'CLOCK_OR_PAUSE_CONTROL');
  return {quietNewNative:30,denseNewNative:60,bodyRows:body.length,bodyTravelXZ:moved,bodyOverlap:overlap,bodyElevationRange:[Math.min(...body.map(r=>r.playerElevation)),Math.max(...body.map(r=>r.playerElevation))],projectedCenters:'Frustum projected authoritative source centers; normal-zoom appearance validates actual coverage',wallRoofSmoke:true,groundFire:true,grass:true};
}

export function validateMovingBodyRows(body){
  assert.ok(body.length&&body.every((r,i)=>Number.isFinite(r.worldTime)&&r.dropped===0&&!r.paused&&(!i||r.worldTime>=body[i-1].worldTime)),'BODY_CLOCK_CONTROL');
  const travelXZ=Math.hypot(body.at(-1).playerX-body[0].playerX,body.at(-1).playerZ-body[0].playerZ);assert.ok(travelXZ>.1&&body.some(r=>r.playerMoving),'BODY_MOVEMENT_CONTROL');
  const overlap=body.filter(r=>r.playerMoving&&r.playerBurning);assert.ok(overlap.length>1,'MOVING_BURNING_BODY_CONTROL');
  let durationSeconds=0,overlapTravelXZ=0;for(let i=1;i<body.length;i++){const a=body[i-1],b=body[i];if(a.playerMoving&&a.playerBurning&&b.playerMoving&&b.playerBurning){durationSeconds+=b.worldTime-a.worldTime;overlapTravelXZ+=Math.hypot(b.playerX-a.playerX,b.playerZ-a.playerZ);}}
  assert.ok(durationSeconds>0&&overlapTravelXZ>0,'MOVING_BURNING_BODY_CONTROL');
  return {frames:body.length,movingActiveFrames:overlap.length,firstOverlapHostTick:overlap[0].hostTick,lastOverlapHostTick:overlap.at(-1).hostTick,durationSeconds,overlapTravelXZ,travelXZ,scope:'Mixed contact/exit window; overlap duration between consecutive active moving samples, not sustained appearance'};
}
export function validateMatureBodyFrame(value){
  const p=value.player,f=value.art.fire,s=f.characterShroud;assert.ok(p.characterFire.active&&p.characterFire.age>.4,'MATURE_BODY_CONTACT');
  assert.ok(s.activeIds.includes(p.id)&&s.flameSplats>0&&s.smokeSplats>0,'MATURE_BODY_SPLATS');
  for(const key of ['missingBindingIds','invalidIds','hiddenIds','cappedIds','unpublishedIds'])assert.deepEqual(s[key],[],'MATURE_BODY_'+key);
  assert.equal(f.actorFlameCards,0,'MATURE_BODY_LEGACY_CARDS');
}

// Samples are clipped against actual runtime intervals. Categories use time
// intervals rather than an assumption that a particular fire function is hot.
export function summarizeVisualProfile(profile,ranges,navigationStartSeconds,{newNativeOnly=false}={}){
  const selected=ranges.filter(r=>!newNativeOnly||r.newNative),nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();
  for(const node of nodes.values())for(const child of node.children||[])parents.set(child,node.id);
  const offset=navigationStartSeconds*1e6,functions=new Map(),categories={publication:0,art:0,submission:0,otherFrameCpu:0},overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));let time=profile.startTime,total=0;
  for(let i=0;i<(profile.samples||[]).length;i++){
    const end=time+profile.timeDeltas[i];let weight=0;const attributed={publication:0,art:0,submission:0};
    for(const r of selected){const lo=offset+r.startMs*1000,hi=offset+r.endMs*1000;weight+=overlap(time,end,lo,hi);for(const [key,pair]of [['publication',r.publicationRange],['art',r.artRange],['submission',r.submissionRange]])if(pair)attributed[key]+=overlap(time,end,Math.max(lo,offset+pair[0]*1000),Math.min(hi,offset+pair[1]*1000));}
    time=end;if(!weight)continue;const ms=weight/1000;total+=ms;for(const key of Object.keys(attributed))categories[key]+=attributed[key]/1000;categories.otherFrameCpu+=ms-Object.values(attributed).reduce((n,v)=>n+v,0)/1000;
    let id=profile.samples[i],depth=0;const seen=new Set();while(id!==undefined){const node=nodes.get(id);if(!node)break;const c=node.callFrame,location={name:c.functionName||'<anonymous>',url:c.url||'<engine>',line:c.lineNumber+1,column:c.columnNumber+1},key=JSON.stringify(location);let row=functions.get(key);if(!row){row={...location,selfMs:0,inclusiveMs:0,publicationSelfMs:0,artSelfMs:0,submissionSelfMs:0};functions.set(key,row);}if(depth===0){row.selfMs+=ms;for(const k of ['publication','art','submission'])row[k+'SelfMs']+=attributed[k]/1000;}if(!seen.has(key)){row.inclusiveMs+=ms;seen.add(key);}id=parents.get(id);depth++;}
  }
  assert.ok(total>0,'EMPTY_CURRENT_CPU_PROFILE');assert.ok(categories.otherFrameCpu>=-1e-6,'OVERLAPPING_PROFILE_PHASES');
  const rows=[...functions.values()];return {scope:'Diagnostic CPU sampling only; not scored timings. All visual functions and other frame work retained.',selection:newNativeOnly?'new-native':'all-displayed',intervals:selected.length,newNativeIntervals:selected.filter(r=>r.newNative).length,selectedFrameMs:selected.reduce((n,r)=>n+r.endMs-r.startMs,0),sampledMs:total,categories,hottestSelf:[...rows].sort((a,b)=>b.selfMs-a.selfMs).slice(0,30),hottestInclusive:[...rows].sort((a,b)=>b.inclusiveMs-a.inclusiveMs).slice(0,30),functions:rows};
}
