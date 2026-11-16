import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withCatalogueBrowser} from './catalogue-browser.mjs';
import {installStartupGpuLedger} from './startup-gpu-ledger.mjs';

const output=path.resolve(process.argv[2]||'artifacts/qa/fire-half-cost/baseline');
fs.mkdirSync(output,{recursive:true});
const read=file=>JSON.parse(fs.readFileSync(file)),save=(file,value)=>fs.writeFileSync(path.join(output,file),JSON.stringify(value,null,2)+'\n');
// Reuse inputs, not the old thermal states/timings. The whole sequence below is
// generated once by the current native production runtime and its real tools.
const inputDirectory='artifacts/qa/catalogue-modular/native-play-02';
const oldFrames=read(path.join(inputDirectory,'frames.json')),end=oldFrames.find(f=>f.label==='cover-after-cooldown');
assert.equal(end.hostTick,700);
const commands=read(path.join(inputDirectory,'commands.json')).filter(c=>c.generation===0&&c.hostTick<=end.hostTick);
save('input-prefix.json',{origin:inputDirectory,endLabel:end.label,commands});
const sources=['src/art/index.js','tools/review/fire-half-cost-baseline.mjs','tools/review/catalogue-browser.mjs','tools/review/startup-gpu-ledger.mjs'];
const restart=path.join(output,'restart-source');
for(const file of sources){const dest=path.join(restart,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}
save('restart.json',{owner:'Coder Tinderbox',purpose:'M27 one current-production sequence and scalar stage baseline',base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),cwd:process.cwd(),runtime:process.version,sources,commands:'input-prefix.json',automaticRestart:false});
fs.writeFileSync(path.join(restart,'changes.patch'),execFileSync('git',['diff','--binary']));

await withCatalogueBrowser(async({page,baseUrl,save:browserSave,errors,manifestSha256})=>{
 page.setDefaultTimeout(120000);
 await page.addInitScript({content:'('+installStartupGpuLedger.toString()+')()'});
 await page.goto(baseUrl+'?catalogue=modules',{waitUntil:'networkidle'});
 await page.evaluate(async()=>{
  const main=await import('./src/main.js');main.currentApplication.dispose();
  const [{createRuntime,THREE:T},{createArtScene},{loadCatalogueModules},ui,{worldToStick},{DEFAULT_CONFIG}]=await Promise.all([import('./src/runtime/index.js'),import('./src/art/index.js'),import('./src/runtime/catalogue-modules.js'),import('./src/ui/index.js'),import('./src/simulation/index.js'),import('./src/simulation/config.js')]);
  const q=window.qa={snap:null,metrics:null,profile:null,rows:[],frames:[],commands:[],activeWindow:null,lastRenderedNative:-1,queries:[],gpu:new Map(),uploads:{calls:0,bytes:0},lastRender:null};
  q.app=main.startApplication({autoStart:false,createVisit:async(place,options)=>{
   if(place.id!=='catalogue-street')throw Error('Only the contracted native Catalogue workload is allowed');
   const catalogueModules=await loadCatalogueModules({scenario:'neighborhood',signal:options.signal,representation:'structure',executionCache:true});
   return createRuntime({root:document.querySelector('#viewport'),uiRoot:document.querySelector('#hud'),scenario:'neighborhood',catalogueModules,seed:1893,characterId:options.characterId,signal:options.signal,
    autoStart:false,mountUI:ui.mountUI,uiOptions:{mode:'gameplay',placeTitle:place.title,onExitToMenu:options.onExitToMenu},onError:options.onError,
    createArtScene:args=>createArtScene({...args,onPresentationProfile:row=>{q.profile=row;}}),
    rendererFactory(){
     const renderer=q.renderer=new T.WebGLRenderer({antialias:true,alpha:false}),gl=renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),render=renderer.render;
     const subData=gl.bufferSubData;
     gl.bufferSubData=function(...args){const data=args[2],length=args[4]??(data?.length-(args[3]||0));q.uploads.calls++;q.uploads.bytes+=(length||0)*(data?.BYTES_PER_ELEMENT||1);return subData.apply(this,args);};
     q.gl=gl;q.ext=ext;
     q.pollGpu=()=>{
      if(ext&&gl.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU timing window');
      while(q.queries.length&&gl.getQueryParameter(q.queries[0].query,gl.QUERY_RESULT_AVAILABLE)){const {query,key}=q.queries.shift();q.gpu.set(key,gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);}
     };
     renderer.render=function(...args){
      const primary=q.profile?.nativeTick!==q.lastRenderedNative,qry=q.activeWindow&&primary&&ext?gl.createQuery():null;
      q.uploads.calls=q.uploads.bytes=0;if(qry)gl.beginQuery(ext.TIME_ELAPSED_EXT,qry);
      const before=performance.now();try{return render.apply(this,args);}finally{
       const elapsed=performance.now()-before;if(qry){gl.endQuery(ext.TIME_ELAPSED_EXT);q.queries.push({query:qry,key:q.profile.generation+':'+q.profile.tick});}
       q.lastRender={primary,submitMs:elapsed,uploadCalls:q.uploads.calls,uploadBytes:q.uploads.bytes};q.lastRenderedNative=q.profile?.nativeTick;
      }
     };
     return renderer;
    },
    onSnapshot(s,m){
     q.snap=s;q.metrics=m;if(q.frames.at(-1)?.tick!==s.tick)q.frames.push(s);
     if(q.activeWindow){const t=s.diagnostics.thermal;q.rows.push({window:q.activeWindow,generation:s.diagnostics.generation,hostTick:s.tick,nativeTick:s.catalogueModules.tick,worldTime:s.clocks.world,paused:s.paused,dropped:s.diagnostics.droppedRealSeconds,
      primary:q.lastRender.primary,simulationMs:m.simulationMs,artMs:m.artCpuMs,uiMs:m.uiCpuMs,renderSubmitMs:m.renderSubmitCpuMs,stages:q.profile.stages,
      physicalPublicationMs:t.timing.physicalPublicationMs,rasterPublicationMs:t.timing.rasterPublicationMs,nativeSimulationMs:t.timing.nativeSimulationMs,
      drawCalls:m.drawCalls,geometries:m.geometries,textures:m.textures,uploadCalls:q.lastRender.uploadCalls,uploadBytes:q.lastRender.uploadBytes,
      sourceCount:s.structureFire.length,positiveFlames:s.structureFire.filter(f=>f.flame>0).length,positiveRoofFlames:s.structureFire.filter(f=>f.part==='roof'&&f.flame>0).length,
      groundFlames:s.cells.filter(c=>c.phase==='burning').length,activeCharacters:[s.player,...s.actors].filter(a=>a.characterFire.active).map(a=>a.id)});}
    }
   });
  }});
  q.step=()=>{q.app.visit().advance(1/60);q.pollGpu();};
  q.send=command=>{const row={hostTick:q.snap.tick+1,...command};q.commands.push(row);if(!q.app.visit().dispatch(command))throw Error('Rejected normal input '+JSON.stringify(row));};
  q.move=(x,y,scale=1)=>q.send({type:'move',...worldToStick({x:x*scale,y:y*scale},DEFAULT_CONFIG.input)});
  q.press=(tool,aim)=>{q.send({type:'select-tool',tool});if(aim)q.send({type:'aim',...aim});q.send({type:'primary',pressed:true});q.send({type:'primary',pressed:false});q.step();};
  q.walk=async(x,y)=>{for(let i=0;i<200;i++){const p=q.snap.player,dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<.025){q.move(0,0);q.step();return;}q.move(dx/d,dy/d,Math.min(1,d/(9/60)));q.step();if(i%20===0)await new Promise(requestAnimationFrame);}throw Error('Bounded actual movement blocked');};
 });
 await page.locator('[data-title-start]').click();await page.getByRole('button',{name:'Open Catalogue Street map',exact:true}).click();
 await page.waitForFunction(()=>qa.app.state().phase==='visit'||qa.app.state().error);
 assert.equal(await page.evaluate(()=>qa.app.state().phase),'visit');
 await page.evaluate(()=>{if(qa.snap.paused)qa.send({type:'pause',paused:false});});
 const initial=await page.evaluate(()=>({metrics:qa.metrics,art:qa.app.visit().artDiagnostics(),gpu:window.__startupGpu(),heap:performance.memory?.usedJSHeapSize}));browserSave('initial.json',initial);
 // Quiet warm-up and control occur on NEW native states, not repeated draws.
 await page.evaluate(async()=>{qa.activeWindow='quiet';for(let i=0;i<60;i++){qa.step();await new Promise(requestAnimationFrame);}qa.activeWindow=null;});
 // Reset restores the input sequence's original clock and exact current world.
 await page.evaluate(()=>{qa.send({type:'reset'});qa.step();qa.frames=[qa.snap];qa.commands.length=0;qa.frameBase=qa.snap.tick;qa.profileBaseNative=qa.snap.catalogueModules.tick;});
 const body=await page.evaluate(async()=>{
  const start={x:qa.snap.player.x,y:qa.snap.player.y};qa.press('jerry-can');await qa.walk(start.x+1.6,start.y);qa.press('jerry-can');
  qa.press('matches',{x:qa.snap.player.x,y:qa.snap.player.y});for(let i=0;i<30&&!qa.snap.player.characterFire.active;i++)qa.step();
  if(!qa.snap.player.characterFire.active)throw Error('Real native oil contact did not light the body control');
  qa.activeWindow='moving-body';for(let i=0;i<24;i++){qa.move(-1,0,.15);qa.step();await new Promise(requestAnimationFrame);}qa.activeWindow=null;qa.move(0,0);qa.step();
  return {start,player:qa.snap.player,worldTime:qa.snap.clocks.world,art:qa.app.visit().artDiagnostics().fire.characterShroud};
 });browserSave('moving-body.json',body);await page.screenshot({path:path.join(output,'moving-body.jpg'),type:'jpeg',quality:90});
 await page.evaluate(start=>qa.walk(start.x,start.y),body.start);
 save('progress.json',{phase:'current-prefix',nativeSource:'current production',hostTicks:700});
 const commandMap=new Map();for(const row of commands){if(!commandMap.has(row.hostTick))commandMap.set(row.hostTick,[]);const {hostTick,generation,...command}=row;commandMap.get(hostTick).push(command);}
 for(let start=1;start<=700;start+=20){const count=Math.min(20,701-start),batch=Array.from({length:count},(_,i)=>({tick:start+i,commands:commandMap.get(start+i)||[]}));await page.evaluate(async batch=>{for(const row of batch){for(const c of row.commands)qa.send(c);qa.step();}await new Promise(requestAnimationFrame);},batch);}
 const prefix=await page.evaluate(()=>({player:qa.snap.player,clocks:qa.snap.clocks,thermal:qa.snap.diagnostics.thermal,sourceCount:qa.snap.structureFire.length}));browserSave('current-prefix.json',prefix);
 assert.ok(prefix.sourceCount>0,'The current production prefix creates real fire');
 async function capture(name){const data=await page.evaluate(()=>({world:qa.snap.clocks.world,player:qa.snap.player,thermal:qa.snap.diagnostics.thermal,art:qa.app.visit().artDiagnostics(),metrics:qa.metrics,gpu:window.__startupGpu()}));browserSave(name+'.json',data);await page.screenshot({path:path.join(output,name+'.jpg'),type:'jpeg',quality:90});}
 await capture('growing-before');
 // Fixed, bounded sequence: growing native states through 26 world seconds.
 // No synthetic fuel/heat/state changes or roof ignition are inserted.
 for(const [name,target]of [['growing-early',14],['growing-middle',20],['growing-later',26]]){
  await page.evaluate(async target=>{while(qa.snap.clocks.world<target-2-1e-7){qa.step();if(qa.snap.tick%20===0)await new Promise(requestAnimationFrame);}},target);
  await page.evaluate(name=>{qa.activeWindow=name;},name);
  await page.evaluate(async()=>{for(let i=0;i<120;i++){qa.step();await new Promise(requestAnimationFrame);}qa.activeWindow=null;});
  await capture(name);save('progress.json',{phase:name,worldTime:await page.evaluate(()=>qa.snap.clocks.world)});
 }
 await page.evaluate(async()=>{for(let i=0;qa.queries.length&&i<60;i++){await new Promise(requestAnimationFrame);qa.pollGpu();}if(qa.queries.length)throw Error('Incomplete GPU queries');});
 const sampled=await page.evaluate(()=>({rows:qa.rows.map(r=>({...r,gpuMs:qa.gpu.get(r.generation+':'+r.hostTick)??null})),frameCount:qa.frames.length,commands:qa.commands,hardware:{renderer:qa.metrics.rendererDescription,userAgent:navigator.userAgent,timerQuery:!!qa.ext,viewport:qa.metrics.viewport,heap:performance.memory?.usedJSHeapSize},art:qa.app.visit().artDiagnostics()}));
 save('sampled.json',{manifestSha256,...sampled});
 // Stream compact native packet deltas only AFTER all timed windows. Avoid
 // repeated whole-world JSON/gzip or retaining a second cloned simulation.
 await page.evaluate(()=>{
  qa.exportIndex=0;qa.exportPrevious=null;
  qa.exportNext=()=>{
   const s=qa.frames[qa.exportIndex++];if(!s)return null;const old=qa.exportPrevious;qa.exportPrevious=s;
   const sameOrder=old&&s.cells.length===old.cells.length&&s.cells.every((c,i)=>c.id===old.cells[i].id);
   const cells=sameOrder?{changes:s.cells.flatMap((c,i)=>c===old.cells[i]?[]:[[i,c]])}:{full:s.cells};
   const world=Object.fromEntries(Object.entries(s.world).filter(([key,value])=>!old||value!==old.world[key]));
   const {cells:omittedCells,world:omittedWorld,...frame}=s;return {world,cells,frame};
  };
 });
 const packetFile=fs.openSync(path.join(output,'current-native-sequence.jsonl'),'w'),hash=createHash('sha256');
 try{for(let i=0;i<sampled.frameCount;i++){const packet=await page.evaluate(()=>qa.exportNext()),line=JSON.stringify(packet)+'\n';fs.writeSync(packetFile,line);hash.update(line);}}finally{fs.closeSync(packetFile);}
 save('sequence.json',{frames:sampled.frameCount,sha256:hash.digest('hex'),path:'current-native-sequence.jsonl',inputPrefix:'input-prefix.json',scope:'Every new host state of the one current-production prefix/windows, compact reference deltas, world/clock/pose/wind preserved; no old thermal frames'});
 const cleanup=await page.evaluate(()=>{for(const {query}of qa.queries)qa.gl.deleteQuery(query);qa.queries.length=0;const runtime=qa.app.visit();qa.app.dispose();const art=runtime.artDiagnostics();qa.frames.length=0;qa.snap=null;qa.renderer=null;qa.profile=null;return {art,gpu:window.__startupGpu()};});
 await page.waitForTimeout(100);cleanup.gpu=await page.evaluate(()=>window.__startupGpu());browserSave('disposed.json',cleanup);
 assert.ok(cleanup.gpu.contexts.every(c=>c.lost&&c.logicalBytes===0));assert.deepEqual(errors,[]);
 return {pass:true,scope:'One current native sequence, quiet and growing new-state windows, matched normal zoom; not FPS or iPhone acceptance',frames:sampled.frameCount,rows:sampled.rows.length,roofSeen:sampled.rows.some(r=>r.positiveRoofFlames>0)};
},{output:path.join(output,'browser-helper'),lifetimeMs:600000,purpose:'M27 single shared current native fire baseline, stage/GPU timings and immutable replay packets; no competing benchmarks'});
