// Explicit review-only observer. It owns no timer, RAF, renderer or game state.
export const LIVE_TRACE_LIMIT=4096;
export const LIVE_FRAME_COLUMNS=Object.freeze(['rafMs','startMs','endMs','gapMs','frameBefore','frameAfter','tickBefore','tickAfter','worldBefore','worldAfter','playerBefore','playerAfter','fixedSteps','fullSnapshots','presentations','draws','simulationMs','snapshotMs','receiptMs','artUpdateMs','hudUpdateMs','updateMs','submissionMs','calls','triangles','geometries','textures','observerMs']);
export const LIVE_NOTIFY_COLUMNS=Object.freeze(['atMs','frame','tick','world','player','buildMs','serializeMs','subscriberMs','phaseCode','sourceAge','sample0','sample1','pairIndex','cacheDecodes','artistUpdates','vertices','triangles','droppedRealSeconds','observerMs']);
const finite=Number.isFinite;

export function createLiveTrace({maxRows=LIVE_TRACE_LIMIT,durationMs=10000,metadata={},now=()=>performance.now()}={}){
 if(!Number.isInteger(maxRows)||maxRows<1||maxRows>LIVE_TRACE_LIMIT||!finite(durationMs)||durationMs<=0||durationMs>10000)throw RangeError('Live trace requires1..4096 rows and at most10000ms');
 const startedMs=now(),frames=[],notifications=[],phases=['unknown'];
 const savedMetadata=structuredClone(metadata);
 let active=true,status='collecting',reason=null,endedMs=null,overflowRows=0,observerMs=0,endpoint=null;
 const count=()=>frames.length+notifications.length;
 function stop(next='complete',why='finished',end=null){
  if(!active)return summary();active=false;status=next;reason=String(why).slice(0,512);endedMs=now();endpoint=end?structuredClone(end):null;return summary();
 }
 function append(target,columns,values,observedStart,setupMs=0){
  if(!active)return false;
  if(count()>=maxRows){overflowRows++;stop('overflow','Numeric ledger row ceiling reached');return false;}
  if(values.length!==columns.length-1||values.some(n=>!finite(n))){stop('error','Invalid numeric observer row');return false;}
  const row=[...values,0];target.push(row);row[row.length-1]=Math.max(0,setupMs+now()-observedStart);observerMs+=row.at(-1);return true;
 }
 function phaseCode(name){
  if(typeof name!=='string'||name.length>64)return 0;
  let i=phases.indexOf(name);if(i<0&&phases.length<16){phases.push(name);i=phases.length-1;}return Math.max(0,i);
 }
 function summary(){return {active,status,reason,rows:count(),frameRows:frames.length,notificationRows:notifications.length,maxRows,durationMs,overflowRows,observerMs,startedMs,endedMs};}
 return Object.freeze({get active(){return active;},stop,summary,phaseCode,
  frame:(values,start,setup=0)=>append(frames,LIVE_FRAME_COLUMNS,values,start,setup),
  notify:(values,start)=>append(notifications,LIVE_NOTIFY_COLUMNS,values,start),
  evidence(){return {version:1,kind:'finite-live-CPU-cadence-trace',...summary(),metadata:structuredClone(savedMetadata),endpoint:structuredClone(endpoint),columns:{frames:[...LIVE_FRAME_COLUMNS],notifications:[...LIVE_NOTIFY_COLUMNS]},phases:[...phases],unknownNumericValue:-1,frames:frames.map(row=>row.slice()),notifications:notifications.map(row=>row.slice()),scope:'CPU wall boundaries and observed RAFs; not GPU cost, encoded FPS or quality acceptance. Observer timing covers row preparation/append, not every added clock-read instruction.'};}
 });
}

function stats(values){const v=values.filter(finite).sort((a,b)=>a-b),n=v.length;return{count:n,median:n?v[Math.floor((n-1)/2)]:null,p95:n?v[Math.ceil(n*.95)-1]:null,min:n?v[0]:null,max:n?v.at(-1):null};}
export function summarizeLiveTrace(e){
 if(!e||e.version!==1||e.frames.length+e.notifications.length>LIVE_TRACE_LIMIT)throw TypeError('Invalid bounded live trace');
 const f=Object.fromEntries(e.columns.frames.map((name,i)=>[name,i])),n=Object.fromEntries(e.columns.notifications.map((name,i)=>[name,i]));
 const groups={};for(const row of e.frames){const world=row[f.worldAfter],key=world<1?'0..1':world<2?'1..2':world<3.2?'2..3.2':world<6.4?'3.2..6.4':'6.4+';(groups[key]??=[]).push(row);}
 const byWorldTime=Object.fromEntries(Object.entries(groups).map(([key,rows])=>[key,{callbacks:rows.length,draws:rows.reduce((s,r)=>s+r[f.draws],0),...Object.fromEntries(['gapMs','simulationMs','snapshotMs','receiptMs','artUpdateMs','hudUpdateMs','updateMs','submissionMs','calls','triangles','observerMs'].map(name=>[name,stats(rows.map(r=>r[f[name]]))])),callbackCpuMs:stats(rows.map(r=>r[f.endMs]-r[f.startMs]))}]));
 const byObservedSourcePhase={};for(const row of e.notifications){const key=e.phases[row[n.phaseCode]]||'unknown';(byObservedSourcePhase[key]??=[]).push(row);}
 const observed=Object.fromEntries(Object.entries(byObservedSourcePhase).map(([key,rows])=>[key,{samples:rows.length,buildMs:stats(rows.map(r=>r[n.buildMs])),serializeMs:stats(rows.map(r=>r[n.serializeMs])),subscriberMs:stats(rows.map(r=>r[n.subscriberMs])),sourceAge:stats(rows.map(r=>r[n.sourceAge]).filter(v=>v>=0))}]));
 const cache=e.notifications.map(r=>r[n.cacheDecodes]).filter(v=>v>=0);
 return {status:e.status,callbackCount:e.frames.length,notificationCount:e.notifications.length,byWorldTime,byObservedSourcePhase:observed,sampledCacheDecodeDelta:cache.length?cache.at(-1)-cache[0]:null,endpoint:e.endpoint,limitation:'World bins use actual world clock. Source-phase/cache observations exist only at original notifications; they are not per-RAF samples. CPU submission includes possible backend stalls.'};
}
