// One explicitly authorized20min render-only repair. Never advances physics.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
import {serve,processIdentity} from './launch.mjs';
import {base64Payload} from './encoding.js';
const remaining=process.argv.includes('--remaining');
const root=fs.realpathSync(process.cwd()),base=path.join(root,'artifacts/qa/bell-and-alder-closing'),input=path.join(base,'first-recording-a0eef'),pkg=path.join(base,'combined-package-a0eef'),prepared=path.join(base,'render-repair-a0eef'),out=remaining?prepared+'-residual':prepared;
if(fs.existsSync(out))throw Error('Repair output already exists; preserve evidence');
fs.mkdirSync(out,{recursive:true});const started=Date.now(),deadline=remaining?Date.parse(JSON.parse(fs.readFileSync(path.join(prepared,'helper.json'))).expiresAt):started+1200000,stopFile=path.join(out,'STOP'),sha=b=>createHash('sha256').update(b).digest('hex'),save=(n,v)=>fs.writeFileSync(path.join(out,n),JSON.stringify(v,null,2)+'\n'),game=JSON.parse(fs.readFileSync(path.join(pkg,'package-manifest.json')));
const record={owner:'01a17ea3-b99b-74d2-8a74-56d2556a19cb',project:'Tinderbox',purpose:'One20min render-only repair from completed authoritative frames; zero simulation reruns',driver:processIdentity(),startedAt:new Date(started).toISOString(),expiresAt:new Date(deadline).toISOString(),stopFile,stopMethod:'Private STOP, hard deadline, or driver finally',ports:[],authorization:'Architect expressly authorized one separate20min repair after original batch closed',source:{artistCommit:game.artistCommit,dataSha256:game.dataSha256,gameRuntimeParent:game.runtimeCommit,workingGameSnapshot:true,gameRuntimeFilesSha256:sha(JSON.stringify(game.runtimeFiles)),gameManifestSha256:sha(fs.readFileSync(path.join(pkg,'package-manifest.json'))),driverSha256:sha(fs.readFileSync(import.meta.filename))},restart:{cwd:root,executable:process.execPath,sourceFiles:[import.meta.filename,path.join(root,'workbenches/bell-and-alder-closing/launch.mjs'),path.join(root,'workbenches/bell-and-alder-closing/encoding.js')],inputs:[path.join(input,'hero-frames.ndjson.gz'),path.join(input,'direct-frames.ndjson.gz'),pkg],outputs:[out],pendingWork:'Checkpointed full states and completed JPEG sequences; restart deliberately with a fresh authorization/deadline, never rerun physics',dependencies:['Node22+','installed Playwright','Edge WebGL2'],secretReferences:[]}};
if(remaining){record.purpose='One residual-time render-only continuation within the original20min repair deadline';record.authorization='Architect explicitly authorized one residual continuation, no deadline extension';record.restart.inputs.push(path.join(prepared,'states.json'));record.originalStartedAt=JSON.parse(fs.readFileSync(path.join(prepared,'helper.json'))).startedAt;}
save('helper.json',record);fs.mkdirSync(path.join(out,'source'),{recursive:true});for(const f of record.restart.sourceFiles)fs.copyFileSync(f,path.join(out,'source',path.basename(f)));fs.copyFileSync(path.join(pkg,'package-manifest.json'),path.join(out,'source/game-package-manifest.json'));
let server,edge,context,page,expiry,watcher,closing;const errors=[],states=[],sequences={};
function guard(){if(Date.now()>=deadline)throw Error('Explicit20min repair deadline');if(fs.existsSync(stopFile))throw Error('Private repair STOP');}
const close=reason=>closing??=(async()=>{clearTimeout(expiry);clearInterval(watcher);await context?.close().catch(()=>{});await edge?.close().catch(()=>{});await server?.close(reason);})();
expiry=setTimeout(()=>void close('Repair deadline'),Math.max(0,deadline-Date.now()));watcher=setInterval(()=>{if(fs.existsSync(stopFile))void close('Private STOP');},300);
async function prepare(mode){
  const maps=Object.fromEntries(['boundaries','supports','items','parts','falls','rubble'].map(k=>[k,new Map()])),directory=path.join(out,'states',mode);fs.mkdirSync(directory,{recursive:true});let events=[],sceneEvents=[],lineCount=0;
  for await(const line of createInterface({input:fs.createReadStream(path.join(input,mode+'-frames.ndjson.gz')).pipe(createGunzip()),crlfDelay:Infinity})){
    guard();const r=JSON.parse(line);if(r.type!=='frame')continue;const f=r.frame;lineCount++;if(f.full)for(const m of Object.values(maps))m.clear();
    for(const [key,map]of Object.entries(maps))for(const v of f[key]||[])map.set(v.id,v);for(const t of f.tombstones||[])maps[t.collection]?.delete(t.id);events.push(...f.events);sceneEvents.push(...f.closingTime.events);
    if(f.tick%(mode==='hero'&&f.worldTime>65?30:6)!==0)continue;
    const frame={...f,full:true,...Object.fromEntries(Object.entries(maps).map(([k,m])=>[k,[...m.values()]])),events,tombstones:[],closingTime:{...f.closingTime,events:sceneEvents}},name=String(f.tick).padStart(6,'0')+'.json',file=path.join(directory,name);fs.writeFileSync(file,JSON.stringify({frame,ui:r.ui}));states.push({mode,worldTime:f.worldTime,tick:f.tick,file});events=[];sceneEvents=[];
    if(states.length%50===0){save('progress.json',{phase:'Preparing retained states',mode,worldTime:f.worldTime,states:states.length,sourceFrames:lineCount});console.log(JSON.stringify({preparing:mode,worldTime:f.worldTime,states:states.length}));}
  }
}
const sparseTime=new Set([0,5,10,15,20,25,30,...Array.from({length:31},(_,i)=>35+i),...Array.from({length:24},(_,i)=>70+i*10)]);
async function renderSequence(name,chosen){
  const directory=path.join(out,name);fs.mkdirSync(directory,{recursive:true});const sequence=[],previous=Object.fromEntries(['boundaries','supports','items','parts','falls','rubble'].map(k=>[k,new Map()]));let priorMode=null;
  for(const [i,state]of chosen.entries()){
    guard();const t=performance.now(),r=JSON.parse(fs.readFileSync(state.file)),full=priorMode!==state.mode;if(full)for(const m of Object.values(previous))m.clear();const frame=r.frame,tombstones=[];
    for(const [key,map]of Object.entries(previous)){const current=new Set(),delta=[];for(const v of frame[key]||[]){current.add(v.id);const signature=JSON.stringify(v);if(full||map.get(v.id)!==signature)delta.push(v);map.set(v.id,signature);}for(const id of map.keys())if(!current.has(id)){map.delete(id);tombstones.push({collection:key,id});}frame[key]=delta;}
    frame.full=full;frame.tombstones=tombstones;priorMode=state.mode;const speed=state.mode==='hero'&&state.worldTime>=65?4:1,next=chosen[i+1],durationSeconds=next?.mode===state.mode?(next.worldTime-state.worldTime)/speed:1;
    const dataUrl=await page.evaluate(({r,speed,name})=>{
      const a=window.__closing;a.loadPresentationFrame(r.frame,r.ui);const c=document.createElement('canvas');c.width=a.canvas.width;c.height=a.canvas.height+76;const g=c.getContext('2d');g.drawImage(a.canvas,0,0);g.fillStyle='#241d16';g.fillRect(0,a.canvas.height,c.width,76);g.fillStyle='#f4dfb6';g.font='bold 20px monospace';g.fillText(`Bell & Alder · ${r.frame.closingTime.replay.id.toUpperCase()} · ${r.frame.worldTime.toFixed(2)}world s · ${speed}×`,16,a.canvas.height+26);g.font='15px Georgia';const officer=r.frame.closingTime.actors.find(a=>a.role==='officer');const sampling=name==='sparse'?'SPARSE TIME-LAPSE · variable source spacing':name==='direct-control'?'DIRECT CONTROL · actual retained states, 2.5Hz':name==='denser-hero'?'SAMPLED · 1Hz quiet /2.5Hz escape /every5s late':'SAMPLED actual WebGL · 5Hz early /1Hz late';g.fillText(`${sampling} · silent · fixed camera/exposure`,16,a.canvas.height+48);g.fillText(`Resident: ${r.frame.closingTime.resident.state} · Officer: ${officer.witness.reaction.kind} · east1.5m/s ambient`,16,a.canvas.height+67);return c.toDataURL('image/jpeg',.88);
    },{r,speed,name});
    const bytes=Buffer.from(base64Payload(dataUrl),'base64');if(bytes[0]!==255||bytes[1]!==216)throw Error('Actual rendered frame has no JPEG signature');const file=String(i).padStart(4,'0')+'.jpg';fs.writeFileSync(path.join(directory,file),bytes);sequence.push({file,mode:state.mode,worldTime:state.worldTime,sourceTick:state.tick,speed,durationSeconds,renderAndExportMs:performance.now()-t});
    const result={version:1,name,source:record.source,outputFps:15,sparsePreviewFps:name==='sparse'?4:null,silent:true,interpolated:false,sequence};save(name+'/sequence.json',result);sequences[name]=result;
    if(i%20===0){console.log(JSON.stringify({rendering:name,index:i,total:chosen.length,worldTime:state.worldTime}));save('progress.json',{phase:'Rendering '+name,index:i,total:chosen.length,worldTime:state.worldTime});}
  }
  save(name+'/complete.json',{completedAt:new Date().toISOString(),frames:sequence.length,source:record.source});console.log(JSON.stringify({sequenceComplete:name,path:path.join(directory,'sequence.json'),frames:sequence.length,remainingSeconds:(deadline-Date.now())/1000}));
  return sequence.reduce((n,f)=>n+f.renderAndExportMs,0)/(sequence.length||1);
}
async function free(port){return new Promise(resolve=>{const s=net.connect({host:'127.0.0.1',port});s.once('connect',()=>{s.destroy();resolve(false);});s.once('error',()=>resolve(true));});}
try{
  if(remaining)states.push(...JSON.parse(fs.readFileSync(path.join(prepared,'states.json'))).states);else for(const mode of ['hero','direct'])await prepare(mode);save('states.json',{source:record.source,states});guard();server=await serve({root:pkg,out:path.join(out,'server'),deadline,stopFile});record.ports=[server.port];save('helper.json',record);
  const modules=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),{chromium}=createRequire(path.join(modules,'playwright/package.json'))('playwright');edge=await chromium.launchServer({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],timeout:30000});record.browser=processIdentity(edge.process().pid);record.ports.push(Number(new URL(edge.wsEndpoint()).port));save('helper.json',record);
  const browser=await chromium.connect(edge.wsEndpoint());context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});await context.route('**/*',r=>r.request().url().startsWith(server.url)?r.continue():r.abort());page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(server.url+'workbenches/bell-and-alder-closing/');await page.waitForFunction(()=>window.__closing?.ready);await page.evaluate(()=>window.__closing.setAutoRender(false));
  if(remaining){
    const direct=states.filter(s=>s.mode==='direct'&&(s.tick%12===0||s.worldTime===25));await renderSequence('direct-control',direct);save('direct-control/renderer.json',await page.evaluate(()=>window.__closing.diagnostics()));
    const hero=states.filter(s=>s.mode==='hero'&&(s.worldTime<=35?s.tick%30===0:s.worldTime<=65?s.tick%12===0||s.worldTime===65:s.tick%150===0));await renderSequence('denser-hero',hero);save('denser-hero/renderer.json',await page.evaluate(()=>window.__closing.diagnostics()));
  }else{
    const sparse=states.filter(s=>s.mode==='hero'&&sparseTime.has(s.worldTime)),mean=await renderSequence('sparse',sparse);save('sparse/renderer.json',await page.evaluate(()=>window.__closing.diagnostics()));
    if(Date.now()+mean*states.length<deadline-60000&&!fs.existsSync(path.join(out,'SKIP_DENSE')))await renderSequence('sampled',states);
  }
  save('renderer-final.json',await page.evaluate(()=>window.__closing.diagnostics()));
}catch(error){errors.push(String(error.stack||error));save('failure.json',{errors,statesPrepared:states.length,completedSequences:Object.keys(sequences)});}
finally{await close('Render-only repair purpose ended');const ports=await Promise.all(record.ports.map(async port=>({port,free:await free(port)})));save('cleanup.json',{closedAt:new Date().toISOString(),driver:record.driver,browser:record.browser||null,ports,startedAt:record.startedAt,deadline:record.expiresAt,elapsedSeconds:(Date.now()-started)/1000,errors,completedSequences:Object.entries(sequences).map(([name,s])=>({name,frames:s.sequence.length}))});console.log(JSON.stringify({out,closed:true,ports,errors,completedSequences:Object.entries(sequences).map(([name,s])=>({name,frames:s.sequence.length}))}));}
if(errors.length)process.exitCode=1;
