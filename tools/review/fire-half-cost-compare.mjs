import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withCatalogueBrowser} from './catalogue-browser.mjs';
import {installStartupGpuLedger} from './startup-gpu-ledger.mjs';

const output=path.resolve(process.argv[2]||'artifacts/qa/fire-half-cost/comparison');
fs.mkdirSync(output,{recursive:true});
const original=JSON.parse(fs.readFileSync(new URL('./fire-half-cost-inputs.json',import.meta.url))),referenceRecord={base:original.sourceRecording.profilerCommit,manifestSha256:original.sourceRecording.referenceManifestSha256,path:'artifacts/qa/fire-half-cost/reference-package'};
const save=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n'),sha=value=>createHash('sha256').update(value).digest('hex');
assert.equal(sha(JSON.stringify(original.commands)),original.commandsSha256,'Unchanged recorded input prefix');
const windows=original.windows;
save('workload.json',{source:'One recorded current-production normal input sequence; no old thermal packets/timing values are replayed',commands:original.commands,windows,primary:{name:'growing-later',nativeTicks:[721,780],world:[24.03333333333325,25.999999999999805],count:60,meanBudget:14.025,p95Budget:17.55,pairedRatio:.5},snapshotRetention:'latest snapshot and scalar rows only during live timing'});
const sources=['tools/review/fire-half-cost-compare.mjs','tools/review/fire-half-cost-inputs.json','tools/review/catalogue-browser.mjs','tools/review/startup-gpu-ledger.mjs'];
for(const file of sources){const dest=path.join(output,'restart-source',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}
fs.writeFileSync(path.join(output,'restart-source','changes.patch'),execFileSync('git',['diff','--binary']));
save('restart.json',{owner:'Coder Tinderbox',purpose:'M27 single live scalar-only counterbalanced comparison',base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime:process.version,cwd:process.cwd(),sources,reference:referenceRecord,automaticRestart:false});

await withCatalogueBrowser(async({page,baseUrl,referenceBaseUrl,referenceManifestSha256,manifestSha256,save:browserSave,errors})=>{
 assert.equal(referenceManifestSha256,referenceRecord.manifestSha256);
 page.setDefaultTimeout(180000);await page.addInitScript({content:'('+installStartupGpuLedger.toString()+')()'});
 let expectedBase;const imports=new Set(),crossPackage=[],laneImports=[];
 page.on('request',request=>{const url=request.url();if(expectedBase&&/^https?:/.test(url)){if(!url.startsWith(expectedBase))crossPackage.push(url);else if(new URL(url).pathname.endsWith('.js'))imports.add(url);}});
 const runs=[],canonical=new Map(),commandMap=new Map();
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
   q.step=()=>{const before=performance.now();q.app.visit().advance(1/60);const row=q.rows.at(-1);if(q.window&&row?.hostTick===q.snap.tick)row.observedAdvanceMs=performance.now()-before;q.pollGpu();};
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

 for(const [index,lane]of ['reference','candidate','candidate','reference'].entries()){
  const run=(index+1)+'-'+lane;save('progress.json',{phase:'starting',run});const camera=await start(lane),checks=[];
  await page.evaluate(async()=>{qa.window='quiet';for(let i=0;i<60;i++){qa.step();await new Promise(requestAnimationFrame);}qa.window=null;await qa.flush();qa.send({type:'reset'});qa.step();});
  for(let i=0;i<boundaries.length-1;i++){
   const first=Math.max(boundaries[i],await page.evaluate(()=>qa.snap.tick+1)),last=boundaries[i+1]-1;if(first>last)continue;
   const window=windows.find(w=>w.generation===1&&first>=w.first&&first<=w.last)?.name??null;
   const batch=Array.from({length:last-first+1},(_,j)=>({tick:first+j,commands:commandMap.get(first+j)||[]}));
   await page.evaluate(async({batch,window})=>{qa.window=window;for(const row of batch){if(qa.snap.tick+1!==row.tick)throw Error('Frozen host input cadence mismatch');for(const command of row.commands)qa.send(command);qa.step();if(window||row.tick%20===0)await new Promise(requestAnimationFrame);}qa.window=null;await qa.flush();},{batch,window});
   if(window){checks.push(await checkpoint(run,window));save('progress.json',{phase:window,run,lastHostTick:last});}
  }
  const data=await page.evaluate(()=>({rows:qa.rows.map(r=>({...r,gpuMs:qa.gpu.get(r.generation+':'+r.hostTick)??null})),hardware:{renderer:qa.metrics.rendererDescription,userAgent:navigator.userAgent,timerQuery:!!qa.ext},heap:performance.memory?.usedJSHeapSize,retainedSnapshotHistory:0}));
  const primary=data.rows.filter(r=>r.window==='growing-later'&&r.primary);assert.deepEqual(primary.map(r=>r.nativeTick),Array.from({length:60},(_,i)=>721+i));assert.ok(primary.every(r=>!r.paused));if(data.hardware.timerQuery)assert.ok(data.rows.filter(r=>r.primary).every(r=>Number.isFinite(r.gpuMs)));
  browserSave(run+'-samples.json',{run,lane,camera,checks,...data});runs.push({run,lane,...data});
  if(index<2)await qualityClip(run);
  const cleanup=await page.evaluate(()=>{const runtime=qa.app.visit();qa.app.dispose();const art=runtime.artDiagnostics();qa.snap=null;qa.profile=null;qa.camera=null;qa.renderer=null;return {art};});await page.waitForTimeout(100);cleanup.gpu=await page.evaluate(()=>window.__startupGpu());assert.ok(cleanup.gpu.contexts.every(c=>c.lost&&c.logicalBytes===0));browserSave(run+'-disposed.json',cleanup);
  for(const relative of ['src/runtime/index.js','src/simulation/index.js','src/simulation/catalogue-thermal.js','workbenches/furnished-house/simulation.js','src/art/index.js','art/source/catalogue-modular/frame-view.js','art/source/catalogue-modular/thermal-art.js','src/art/character-shroud/splats.js'])assert.ok([...imports].some(url=>new URL(url).pathname===new URL(expectedBase).pathname+relative),'Independent live import '+run+'/'+relative);
  laneImports.push({run,lane,base:expectedBase,modules:[...imports]});browserSave('import-closure.json',{lanes:laneImports,crossPackage});
 }
 assert.deepEqual(crossPackage,[]);assert.deepEqual(errors,[]);
 const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return {count:a.length,mean:a.length?a.reduce((a,b)=>a+b,0)/a.length:null,p95:a.length?a[Math.floor((a.length-1)*.95)]:null,max:a.at(-1)??null};};
 function summarize(lane){const rows=runs.filter(r=>r.lane===lane).flatMap(r=>r.rows).filter(r=>r.window==='growing-later'&&r.primary);return {P:stats(rows.map(r=>r.physicalPublicationMs+r.artMs)),publication:stats(rows.map(r=>r.physicalPublicationMs)),art:stats(rows.map(r=>r.artMs)),renderSubmit:stats(rows.map(r=>r.renderSubmitMs)),gpu:stats(rows.map(r=>r.gpuMs)),fullCpuStages:stats(rows.map(r=>r.simulationMs+r.artMs+r.uiMs+r.renderSubmitMs)),observedAdvance:stats(rows.map(r=>r.observedAdvanceMs)),stages:Object.fromEntries(Object.keys(rows[0].stages).map(key=>[key,stats(rows.map(r=>r.stages[key]))]))};}
 const reference=summarize('reference'),candidate=summarize('candidate'),ratio={mean:candidate.P.mean/reference.P.mean,p95:candidate.P.p95/reference.P.p95,gpuMean:reference.gpu.mean?candidate.gpu.mean/reference.gpu.mean:null,gpuP95:reference.gpu.p95?candidate.gpu.p95/reference.gpu.p95:null};
 const pass=candidate.P.mean<=14.025&&candidate.P.p95<=17.55&&ratio.mean<=.5&&ratio.p95<=.5;
 const perRun=runs.map(run=>{const rows=run.rows.filter(r=>r.window==='growing-later'&&r.primary);return {run:run.run,lane:run.lane,P:stats(rows.map(r=>r.physicalPublicationMs+r.artMs)),gpu:stats(rows.map(r=>r.gpuMs))};});
 const summary={version:1,scope:'Live independent full production paths, actual publication+art, NEW native721–780, scalar-only ABBA; no packet timing reuse, no FPS/iPhone claim',order:runs.map(r=>r.lane),referenceManifestSha256,candidateManifestSha256:manifestSha256,reference,candidate,ratio,perRun,cpuTargetPass:pass,gpuRegressionNeedsInvestigation:ratio.gpuMean!==null&&(ratio.gpuMean>1.10||ratio.gpuP95>1.10),stateChecks:checksSummary(),crossPackageImports:crossPackage,helpers:'finally closes sole browser/server, see cleanup receipt'};
 function checksSummary(){return Object.fromEntries(canonical);}
 save('comparison.json',summary);browserSave('import-closure.json',{independentBases:[referenceBaseUrl,baseUrl],lanes:laneImports,crossPackage});
 if(!pass)throw Error('Measured fire CPU reduction misses the frozen absolute or paired target');
 return {pass:!summary.gpuRegressionNeedsInvestigation,cpuTargetPass:true,cpu:summary,limits:['A flagged GPU regression needs review of the counterbalanced blocks; CPU success does not waive it.','Temporal/JPG controls require affected-world review; whole-HUD RMS is not an acceptance gate.']};
},{output:path.join(output,'browser-helper'),referencePackage:'artifacts/qa/fire-half-cost/reference-package',lifetimeMs:900000,purpose:'M27 one live ABBA reference/candidate fire comparison; actual publication+art, scalar-only timings, separate quality controls'});
