import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withCatalogueBrowser} from './catalogue-browser.mjs';
import {installStartupGpuLedger} from './startup-gpu-ledger.mjs';
import {summarizeFireCpuProfile} from './fire-cpu-profile.mjs';
import {runIsolatedLanes,endpointStateSha256,assertScalarWorkload,fireComparisonMode} from './browser-lanes.mjs';

const output=path.resolve(process.argv[2]||'artifacts/qa/fire-half-cost/comparison');
const mode=fireComparisonMode(process.argv.slice(2)),{profileOnly,isolatedTiming,qualityOnly}=mode;
if(isolatedTiming){assert.ok(process.argv[2]&&!process.argv[2].startsWith('--'),'Isolation control requires a new explicit output directory');assert.ok(!fs.existsSync(output)||!fs.readdirSync(output).length,'Isolation output must be new; earlier evidence is never overwritten');}
if(qualityOnly){assert.ok(process.argv[2]&&!process.argv[2].startsWith('--'),'Quality replay requires a new explicit output directory');assert.ok(!fs.existsSync(output)||!fs.readdirSync(output).length,'Quality output must be new; earlier evidence is never overwritten');}
const endpointHash='e211d18f739bab4bfa9a8eb006474ff8c61242d4db5368c16e0c6a65c8da845d',fixedCandidateManifest='2a9e7625087815840bc5ac316f8c011b6c0d40618cac6a35eb37ec9001559b43';
const evidence={};
if(isolatedTiming)for(const [lane,file,digest]of [['reference','1-reference-samples.json','32ca07dc9d37f2ea5127613545a9bd7989f81f7abbfb85977896c050fbee0116'],['candidate','2-candidate-samples.json','4025f2e1d3f0545b15320bff29ca75273a9f403830e356622a7d95128b7da698']]){
 const relative='artifacts/qa/fire-half-cost/comparison-round5/browser-helper/'+file,bytes=fs.readFileSync(relative);assert.equal(createHash('sha256').update(bytes).digest('hex'),digest,'Frozen round5 scalar evidence');evidence[lane]={path:relative,sha256:digest,data:JSON.parse(bytes)};
}
fs.mkdirSync(output,{recursive:true});
const original=JSON.parse(fs.readFileSync(new URL('./fire-half-cost-inputs.json',import.meta.url))),referenceRecord={base:original.sourceRecording.profilerCommit,manifestSha256:original.sourceRecording.referenceManifestSha256,path:'artifacts/qa/fire-half-cost/reference-package'};
const save=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n'),sha=value=>createHash('sha256').update(value).digest('hex');
assert.equal(sha(JSON.stringify(original.commands)),original.commandsSha256,'Unchanged recorded input prefix');
const windows=original.windows;
save('workload.json',{source:'One recorded current-production normal input sequence; no old thermal packets/timing values are replayed',commands:original.commands,windows,primary:{name:'growing-later',nativeTicks:[721,780],world:[24.03333333333325,25.999999999999805],count:60,meanBudget:14.025,p95Budget:17.55,pairedRatio:.5},snapshotRetention:'latest snapshot and scalar rows only during live timing'});
if(isolatedTiming)save('isolation-protocol.json',{scope:'Tooling-only harness interference control; no production saving is attributed to the protocol',candidateManifestSha256:fixedCandidateManifest,reference:referenceRecord,order:['reference','candidate','candidate','reference'],contexts:'Fresh context/page per lane; awaited close before next create',observations:'Original scalar observer and GPU timing unchanged',endpoint:'One in-page canonical JSON/SHA only after each lane final timing/query flush; only digest/scalars returned',endpointSha256:endpointHash,optionalCapture:'None; prior round5 intermediate states, JPGs and temporal controls are byte-identical production evidence',evidence:Object.fromEntries(Object.entries(evidence).map(([lane,r])=>[lane,{path:r.path,sha256:r.sha256}])),limits:'Browser GPU process caches and external OS load remain shared/unknown'});
const sources=['tools/review/fire-half-cost-compare.mjs','tools/review/fire-cpu-profile.mjs','tools/review/fire-half-cost-inputs.json','tools/review/catalogue-browser.mjs','tools/review/browser-lanes.mjs','tools/review/startup-gpu-ledger.mjs'];
for(const file of sources){const dest=path.join(output,'restart-source',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}
fs.writeFileSync(path.join(output,'restart-source','changes.patch'),execFileSync('git',['diff','--binary']));
save('restart.json',{owner:'Coder Tinderbox',purpose:'M27 single live scalar-only counterbalanced comparison',base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime:process.version,cwd:process.cwd(),sources,reference:referenceRecord,automaticRestart:false});

await withCatalogueBrowser(async({page:initialPage,pageContext,createPageContext,contextDiagnostics,baseUrl,referenceBaseUrl,referenceManifestSha256,manifestSha256,save:browserSave,errors})=>{
 assert.equal(referenceManifestSha256,referenceRecord.manifestSha256);
 if(isolatedTiming)assert.equal(manifestSha256,fixedCandidateManifest,'Unchanged round5 production package');
 let page=initialPage;const preparedPages=new WeakSet(),deferredSaves=[];
 let expectedBase;const imports=new Set(),crossPackage=[],laneImports=[];
 async function preparePage(current){page=current;if(preparedPages.has(current))return;preparedPages.add(current);page.setDefaultTimeout(180000);await page.addInitScript({content:'('+installStartupGpuLedger.toString()+')()'});page.on('request',request=>{const url=request.url();if(expectedBase&&/^https?:/.test(url)){if(!url.startsWith(expectedBase))crossPackage.push(url);else if(new URL(url).pathname.endsWith('.js'))imports.add(url);}});}
 await preparePage(initialPage);
 const progress=value=>isolatedTiming?console.log(JSON.stringify(value)):save('progress.json',value);
 const runs=[],canonical=new Map(),commandMap=new Map();
 const profiler=profileOnly?await page.context().newCDPSession(page):null;let cpuSummary;
 if(profiler){await profiler.send('Profiler.enable');await profiler.send('Profiler.setSamplingInterval',{interval:250});await profiler.send('Performance.enable',{timeDomain:'timeTicks'});}
 for(const row of original.commands){if(!commandMap.has(row.hostTick))commandMap.set(row.hostTick,[]);const {hostTick,...command}=row;commandMap.get(hostTick).push(command);}
 const range=name=>windows.find(w=>w.name===name),lastTick=range('growing-later').last;
 const boundaries=[...new Set([1,...windows.filter(w=>w.generation===1).flatMap(w=>[w.first,w.last+1]),lastTick+1])].sort((a,b)=>a-b);

 async function start(lane){
  imports.clear();expectedBase=lane==='reference'?referenceBaseUrl:baseUrl;
  await page.goto(expectedBase+'?catalogue=modules',{waitUntil:'networkidle'});
  await page.evaluate(async({characterId})=>{
   const main=await import('./src/main.js');main.currentApplication.dispose();
   const [{createRuntime,THREE:T},{createArtScene},{loadCatalogueModules},ui,{worldToStick},{DEFAULT_CONFIG}]=await Promise.all([import('./src/runtime/index.js'),import('./src/art/index.js'),import('./src/runtime/catalogue-modules.js'),import('./src/ui/index.js'),import('./src/simulation/index.js'),import('./src/simulation/config.js')]);
   const q=window.qa={snap:null,metrics:null,profile:null,rows:[],window:null,lastNative:-1,queries:[],gpu:new Map(),lastRender:null,uploads:{calls:0,bytes:0}};
   q.app=main.startApplication({selectedCharacterId:characterId,autoStart:false,createVisit:async(place,options)=>{
    if(place.id!=='catalogue-street')throw Error('Unexpected map in frozen workload');
    const catalogueModules=await loadCatalogueModules({scenario:'neighborhood',signal:options.signal,representation:'structure',executionCache:true});
    return createRuntime({root:document.querySelector('#viewport'),uiRoot:document.querySelector('#hud'),scenario:'neighborhood',catalogueModules,seed:1893,characterId:options.characterId,signal:options.signal,
     autoStart:false,mountUI:ui.mountUI,uiOptions:{mode:'gameplay',placeTitle:place.title,onExitToMenu:options.onExitToMenu},onError:options.onError,
     createArtScene:args=>createArtScene({...args,onPresentationProfile:row=>{q.profile=row;}}),
     rendererFactory(){
      const renderer=q.renderer=new T.WebGLRenderer({antialias:true,alpha:false}),gl=q.gl=renderer.getContext(),ext=q.ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),render=renderer.render,subData=gl.bufferSubData;
      gl.bufferSubData=function(...args){const data=args[2],length=args[4]??(data?.length-(args[3]||0));q.uploads.calls++;q.uploads.bytes+=(length||0)*(data?.BYTES_PER_ELEMENT||1);return subData.apply(this,args);};
      q.pollGpu=()=>{if(ext&&gl.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU timing window');while(q.queries.length&&gl.getQueryParameter(q.queries[0].query,gl.QUERY_RESULT_AVAILABLE)){const {query,key}=q.queries.shift();q.gpu.set(key,gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);}};
      renderer.render=function(...args){
       const primary=q.profile?.nativeTick!==q.lastNative,query=q.window&&primary&&ext?gl.createQuery():null;q.camera=args[1];q.uploads.calls=q.uploads.bytes=0;if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
       try{return render.apply(this,args);}finally{if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);q.queries.push({query,key:q.profile.generation+':'+q.profile.tick});}q.lastRender={primary,uploadCalls:q.uploads.calls,uploadBytes:q.uploads.bytes};q.lastNative=q.profile?.nativeTick;}
      };return renderer;
     },
     onSnapshot(s,m){
      q.snap=s;q.metrics=m;if(q.window){const t=s.diagnostics.thermal;q.rows.push({window:q.window,generation:s.diagnostics.generation,hostTick:s.tick,nativeTick:s.catalogueModules.tick,worldTime:s.clocks.world,paused:s.paused,dropped:s.diagnostics.droppedRealSeconds,
       primary:q.lastRender.primary,simulationMs:m.simulationMs,artMs:m.artCpuMs,uiMs:m.uiCpuMs,renderSubmitMs:m.renderSubmitCpuMs,stages:q.profile.stages,physicalPublicationMs:t.timing.physicalPublicationMs,rasterPublicationMs:t.timing.rasterPublicationMs,
       drawCalls:m.drawCalls,geometries:m.geometries,textures:m.textures,uploadCalls:q.lastRender.uploadCalls,uploadBytes:q.lastRender.uploadBytes,sourceCount:s.structureFire.length,
       positiveFlames:s.structureFire.filter(f=>f.flame>0).length,positiveRoofFlames:s.structureFire.filter(f=>f.part==='roof'&&f.flame>0).length,groundFlames:s.cells.filter(c=>c.phase==='burning').length,
       activeCharacters:[s.player,...s.actors].filter(a=>a.characterFire.active).map(a=>a.id)});}
     }
    });
   }});
   q.step=()=>{const before=performance.now();q.app.visit().advance(1/60);const end=performance.now(),row=q.rows.at(-1);if(q.window&&row?.hostTick===q.snap.tick)row.observedAdvanceMs=end-before;if(q.cpuProfileActive)q.cpuRanges.push({hostTick:q.snap.tick,nativeTick:q.snap.catalogueModules.tick,primary:q.lastRender.primary,startMs:before,endMs:end});q.pollGpu();};
   q.send=command=>{if(!q.app.visit().dispatch(command))throw Error('Rejected normal input '+JSON.stringify(command));};
   q.move=(x,y,scale=1)=>q.send({type:'move',...worldToStick({x:x*scale,y:y*scale},DEFAULT_CONFIG.input)});
   q.flush=async()=>{for(let i=0;q.queries.length&&i<60;i++){await new Promise(requestAnimationFrame);q.pollGpu();}if(q.queries.length)throw Error('Incomplete GPU query results');};
  },{characterId:original.characterId});
  await page.locator('[data-title-start]').click();await page.getByRole('button',{name:'Open Catalogue Street map',exact:true}).click();await page.waitForFunction(()=>qa.app.state().phase==='visit'||qa.app.state().error);
  assert.equal(await page.evaluate(()=>qa.app.state().phase),'visit');await page.evaluate(()=>{if(qa.snap.paused)qa.send({type:'pause',paused:false});});
  const camera=await page.evaluate(()=>({type:qa.camera.type,verticalSpan:(qa.camera.top-qa.camera.bottom)/qa.camera.zoom,zoom:qa.camera.zoom,mode:qa.metrics.camera.mode}));
  assert.equal(camera.type,'OrthographicCamera');assert.ok(Math.abs(camera.verticalSpan-12.6)<1e-8);assert.equal(camera.zoom,1);assert.equal(camera.mode,'follow');
  return camera;
 }

 async function checkpoint(run,name){
  await page.evaluate(()=>qa.flush());
  // A single current snapshot and diagnostics are read OUTSIDE timing blocks.
  const data=await page.evaluate(base=>{
   const s=qa.snap,copy={...s,diagnostics:{...s.diagnostics,thermal:{...s.diagnostics.thermal}}};delete copy.diagnostics.thermal.timing;
   return {canonical:JSON.stringify(copy).split(base).join('<PACKAGE>/'),worldTime:s.clocks.world,nativeTick:s.catalogueModules.tick,player:s.player,art:qa.app.visit().artDiagnostics(),metrics:qa.metrics,gpu:window.__startupGpu()};
  },expectedBase);
  const digest=sha(data.canonical);fs.writeFileSync(path.join(output,run+'-'+name+'-state.json'),data.canonical+'\n');delete data.canonical;
  if(canonical.has(name))assert.equal(digest,canonical.get(name),'Exact current physics/publication '+name);else canonical.set(name,digest);
  browserSave(run+'-'+name+'.json',{stateSha256:digest,...data});await page.screenshot({path:path.join(output,run+'-'+name+'.jpg'),type:'jpeg',quality:90});
  return {name,stateSha256:digest,worldTime:data.worldTime,nativeTick:data.nativeTick};
 }

 async function scalarCheckpoint(lane,name){
  const value=await page.evaluate(()=>({row:qa.rows.at(-1),viewport:qa.metrics.viewport})),expected=evidence[lane].data.rows.find(r=>r.window===name&&r.hostTick===range(name).last);
  assert.ok(expected);assertScalarWorkload([value.row],[expected]);assert.deepEqual(value.viewport,{width:1280,height:494});
  return {name,scope:'Scalar clocks/workload only; no intermediate snapshot/diagnostics/capture',hostTick:value.row.hostTick,nativeTick:value.row.nativeTick,worldTime:value.row.worldTime,viewport:value.viewport};
 }

 async function qualityClip(run){
  await page.evaluate(()=>{
   const stream=qa.renderer.domElement.captureStream(30),type=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(t=>MediaRecorder.isTypeSupported(t));qa.clip={stream,chunks:[],rows:[]};
   qa.clip.recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:2500000});qa.clip.recorder.ondataavailable=e=>{if(e.data.size)qa.clip.chunks.push(e.data);};qa.clip.recorder.start();
  });
  await page.evaluate(async()=>{for(let i=0;i<60;i++){qa.move(0,-1,.15);qa.step();const p=qa.snap.player;qa.clip.rows.push({world:qa.snap.clocks.world,x:p.x,y:p.y,moving:p.moving,travelled:p.travelled,hp:p.hp,active:p.characterFire.active});await new Promise(requestAnimationFrame);}qa.move(0,0);qa.step();});
  const clip=await page.evaluate(async()=>{
   await new Promise(resolve=>{qa.clip.recorder.onstop=resolve;qa.clip.recorder.stop();});for(const track of qa.clip.stream.getTracks())track.stop();const bytes=new Uint8Array(await new Blob(qa.clip.chunks,{type:qa.clip.recorder.mimeType}).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
   const result={base64:btoa(binary),rows:qa.clip.rows,scope:'Separate untimed normal-zoom temporal control, one additional world second; driver stepping is not an FPS claim'};qa.clip=null;return result;
  });
  fs.writeFileSync(path.join(output,run+'-temporal.webm'),Buffer.from(clip.base64,'base64'));delete clip.base64;browserSave(run+'-temporal.json',clip);
 }

 async function runLane(index,lane){
  const run=(index+1)+'-'+lane;progress({phase:'starting',run});const camera=await start(lane),checks=[];
  await page.evaluate(async profileOnly=>{qa.window=profileOnly?null:'quiet';for(let i=0;i<60;i++){qa.step();await new Promise(requestAnimationFrame);}qa.window=null;await qa.flush();qa.send({type:'reset'});qa.step();},profileOnly);
  if(isolatedTiming){const quiet=await page.evaluate(()=>qa.rows.filter(r=>r.window==='quiet'));assertScalarWorkload(quiet,evidence[lane].data.rows.filter(r=>r.window==='quiet'));}
  for(let i=0;i<boundaries.length-1;i++){
   const first=Math.max(boundaries[i],await page.evaluate(()=>qa.snap.tick+1)),last=boundaries[i+1]-1;if(first>last)continue;
   const window=windows.find(w=>w.generation===1&&first>=w.first&&first<=w.last)?.name??null;
   const batch=Array.from({length:last-first+1},(_,j)=>({tick:first+j,commands:commandMap.get(first+j)||[]}));
   let calibration;
   if(profiler&&window==='growing-later'){
    const before=await page.evaluate(()=>performance.now()),metrics=(await profiler.send('Performance.getMetrics')).metrics,after=await page.evaluate(()=>performance.now());
    const nav=metrics.find(m=>m.name==='NavigationStart')?.value,stamp=metrics.find(m=>m.name==='Timestamp')?.value;
    calibration={navigationStartSeconds:nav,metricTimestampSeconds:stamp,pageBeforeMs:before,pageAfterMs:after,errorMs:(stamp-nav)*1000-(before+after)/2};if(!Number.isFinite(nav)||Math.abs(calibration.errorMs)>10)throw Error('CPU profile clock calibration failed');
    await page.evaluate(()=>{qa.cpuRanges=[];qa.cpuProfileActive=true;});await profiler.send('Profiler.start');
   }
   await page.evaluate(async({batch,window,profileOnly})=>{qa.window=profileOnly&&window!=='growing-later'?null:window;for(const row of batch){if(qa.snap.tick+1!==row.tick)throw Error('Frozen host input cadence mismatch');for(const command of row.commands)qa.send(command);qa.step();if(window||row.tick%20===0)await new Promise(requestAnimationFrame);}qa.window=null;await qa.flush();},{batch,window,profileOnly});
   if(calibration){const {profile}=await profiler.send('Profiler.stop'),ranges=await page.evaluate(()=>{qa.cpuProfileActive=false;return qa.cpuRanges;});save('cpu-profile.json',profile);save('cpu-ranges.json',{calibration,ranges});cpuSummary=summarizeFireCpuProfile(profile,ranges,calibration.navigationStartSeconds);save('cpu-summary.json',cpuSummary);}
   if(window){if(!profileOnly)checks.push(isolatedTiming?await scalarCheckpoint(lane,window):await checkpoint(run,window));progress({phase:window,run,lastHostTick:last});}
  }
  const data=await page.evaluate(()=>({rows:qa.rows.map(r=>({...r,gpuMs:qa.gpu.get(r.generation+':'+r.hostTick)??null})),hardware:{renderer:qa.metrics.rendererDescription,userAgent:navigator.userAgent,timerQuery:!!qa.ext},heap:performance.memory?.usedJSHeapSize,retainedSnapshotHistory:0}));
  const record={run,lane,camera,checks,...data};if(qualityOnly)record.scope='Untimed appearance replay; incidental raw timing observations are not a performance comparison';if(isolatedTiming)deferredSaves.push([run+'-samples.json',record]);
  const primary=data.rows.filter(r=>r.window==='growing-later'&&r.primary);assert.deepEqual(primary.map(r=>r.nativeTick),Array.from({length:60},(_,i)=>721+i));assert.ok(primary.every(r=>!r.paused));if(data.hardware.timerQuery)assert.ok(data.rows.filter(r=>r.primary).every(r=>Number.isFinite(r.gpuMs)));
  if(isolatedTiming){
   assertScalarWorkload(data.rows,evidence[lane].data.rows);assert.deepEqual(data.hardware,evidence[lane].data.hardware);assert.deepEqual(camera,evidence[lane].data.camera);
   data.endpointStateSha256=await page.evaluate(endpointStateSha256,{base:expectedBase});record.endpointStateSha256=data.endpointStateSha256;assert.equal(data.endpointStateSha256,endpointHash,'Exact final current canonical state');canonical.set('growing-later',data.endpointStateSha256);
  }else browserSave(run+'-samples.json',record);
  runs.push({run,lane,...data});
  if(index<2&&!profileOnly&&!isolatedTiming)await qualityClip(run);
  const cleanup=isolatedTiming?await page.evaluate(()=>{qa.app.dispose();qa.snap=null;qa.profile=null;qa.camera=null;qa.renderer=null;return {scope:'No optional art diagnostic; required GL lifecycle only'};}):await page.evaluate(()=>{const runtime=qa.app.visit();qa.app.dispose();const art=runtime.artDiagnostics();qa.snap=null;qa.profile=null;qa.camera=null;qa.renderer=null;return {art};});await page.waitForTimeout(100);
  cleanup.gpu=isolatedTiming?await page.evaluate(()=>({contexts:window.__startupGpu().contexts.map(c=>({lost:c.lost,logicalBytes:c.logicalBytes}))})):await page.evaluate(()=>window.__startupGpu());assert.ok(cleanup.gpu.contexts.length&&cleanup.gpu.contexts.every(c=>c.lost&&c.logicalBytes===0));
  if(isolatedTiming)deferredSaves.push([run+'-disposed.json',cleanup]);else browserSave(run+'-disposed.json',cleanup);
  for(const relative of ['src/runtime/index.js','src/simulation/index.js','src/simulation/catalogue-thermal.js','workbenches/furnished-house/simulation.js','src/art/index.js','art/source/catalogue-modular/frame-view.js','art/source/catalogue-modular/thermal-art.js','src/art/character-shroud/splats.js'])assert.ok([...imports].some(url=>new URL(url).pathname===new URL(expectedBase).pathname+relative),'Independent live import '+run+'/'+relative);
  laneImports.push({run,lane,base:expectedBase,modules:[...imports]});if(!isolatedTiming)browserSave('import-closure.json',{lanes:laneImports,crossPackage});
 }
 if(isolatedTiming){
  try{await runIsolatedLanes(['reference','candidate','candidate','reference'],{first:pageContext,create:createPageContext,run:async({index,lane,lease})=>{
   try{await preparePage(lease.page);await runLane(index,lane);}
   catch(error){try{const partial=await lease.page.evaluate(()=>({rows:globalThis.qa?.rows??[],scope:'Available scalar rows at sequence abort; no later lane is run'}));deferredSaves.push([(index+1)+'-'+lane+'-aborted-samples.json',partial]);}catch{}throw error;}
  }});}catch(error){for(const [name,value]of deferredSaves)browserSave(name,value);browserSave('context-lifecycle.json',contextDiagnostics());browserSave('import-closure.json',{lanes:laneImports,crossPackage});throw error;}
  const lifecycle=contextDiagnostics();assert.equal(lifecycle.created,4);assert.equal(lifecycle.closed,4);assert.equal(lifecycle.remaining,0);assert.equal(lifecycle.maxLive,1);browserSave('context-lifecycle.json',lifecycle);
  for(const [name,value]of deferredSaves)browserSave(name,value);
 }else for(const [index,lane]of mode.order.entries())await runLane(index,lane);
 assert.deepEqual(crossPackage,[]);assert.deepEqual(errors,[]);
 if(profiler){await profiler.send('Profiler.disable');await profiler.detach();return {pass:true,scope:'One diagnostic candidate CPU sampling window on unchanged live prefix; no new target comparison',summary:cpuSummary};}
 if(qualityOnly){
  const appearance={scope:'Untimed reference/candidate appearance evidence only; no CPU or GPU target comparison',mechanicalChecksPass:true,visualAcceptance:'Pending architect review of normal-zoom JPGs and actual moving/burning temporal clips',order:runs.map(r=>r.lane),referenceManifestSha256,candidateManifestSha256:manifestSha256,stateChecks:checksSummary(),crossPackageImports:crossPackage,JPGs:runs.flatMap(r=>windows.filter(w=>w.generation===1).map(w=>r.run+'-'+w.name+'.jpg')),clips:runs.map(r=>r.run+'-temporal.webm'),helpers:'finally closes sole browser/server; see cleanup receipt'};
  save('appearance.json',appearance);return appearance;
 }
 const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return {count:a.length,mean:a.length?a.reduce((a,b)=>a+b,0)/a.length:null,p95:a.length?a[Math.floor((a.length-1)*.95)]:null,max:a.at(-1)??null};};
 function summarize(lane){const rows=runs.filter(r=>r.lane===lane).flatMap(r=>r.rows).filter(r=>r.window==='growing-later'&&r.primary);return {P:stats(rows.map(r=>r.physicalPublicationMs+r.artMs)),publication:stats(rows.map(r=>r.physicalPublicationMs)),art:stats(rows.map(r=>r.artMs)),renderSubmit:stats(rows.map(r=>r.renderSubmitMs)),gpu:stats(rows.map(r=>r.gpuMs)),fullCpuStages:stats(rows.map(r=>r.simulationMs+r.artMs+r.uiMs+r.renderSubmitMs)),observedAdvance:stats(rows.map(r=>r.observedAdvanceMs)),stages:Object.fromEntries(Object.keys(rows[0].stages).map(key=>[key,stats(rows.map(r=>r.stages[key]))]))};}
 const reference=summarize('reference'),candidate=summarize('candidate'),ratio={mean:candidate.P.mean/reference.P.mean,p95:candidate.P.p95/reference.P.p95,gpuMean:reference.gpu.mean?candidate.gpu.mean/reference.gpu.mean:null,gpuP95:reference.gpu.p95?candidate.gpu.p95/reference.gpu.p95:null};
 const pass=candidate.P.mean<=14.025&&candidate.P.p95<=17.55&&ratio.mean<=.5&&ratio.p95<=.5;
 const perRun=runs.map(run=>{const rows=run.rows.filter(r=>r.window==='growing-later'&&r.primary);return {run:run.run,lane:run.lane,P:stats(rows.map(r=>r.physicalPublicationMs+r.artMs)),gpu:stats(rows.map(r=>r.gpuMs))};});
 const summary={version:1,scope:'Live independent full production paths, actual publication+art, NEW native721–780, scalar-only ABBA; no packet timing reuse, no FPS/iPhone claim',...(isolatedTiming?{collectionProtocol:'Fresh context/page per lane, optional capture/diagnostic/full-state export omitted; endpoint SHA after final timing only',qualityEvidence:'Byte-identical comparison-round5 intermediate states/JPGs/temporal controls; see isolation-protocol.json',productionSavingAttribution:false}:{}),order:runs.map(r=>r.lane),referenceManifestSha256,candidateManifestSha256:manifestSha256,reference,candidate,ratio,perRun,cpuTargetPass:pass,gpuRegressionNeedsInvestigation:ratio.gpuMean!==null&&(ratio.gpuMean>1.10||ratio.gpuP95>1.10),stateChecks:checksSummary(),crossPackageImports:crossPackage,helpers:'finally closes sole browser/server, see cleanup receipt'};
 function checksSummary(){return Object.fromEntries(canonical);}
 save('comparison.json',summary);browserSave('import-closure.json',{independentBases:[referenceBaseUrl,baseUrl],lanes:laneImports,crossPackage});
 if(!pass)throw Error('Measured fire CPU reduction misses the frozen absolute or paired target');
 return {pass:!summary.gpuRegressionNeedsInvestigation,cpuTargetPass:true,cpu:summary,limits:['A flagged GPU regression needs review of the counterbalanced blocks; CPU success does not waive it.','Temporal/JPG controls require affected-world review; whole-HUD RMS is not an acceptance gate.']};
},{output:path.join(output,'browser-helper'),referencePackage:'artifacts/qa/fire-half-cost/reference-package',lifetimeMs:profileOnly?300000:900000,purpose:profileOnly?'M27 single candidate CPU diagnostic on frozen native721–780; no new ABBA/workload sweep':qualityOnly?'M27 separate untimed two-lane reference/candidate appearance replay; no performance comparison':isolatedTiming?'M27 one controlled ABBA with fresh contexts and no optional capture; unchanged round5 production and strict limits':'M27 one live ABBA reference/candidate fire comparison; actual publication+art, scalar-only timings, separate quality controls'});
