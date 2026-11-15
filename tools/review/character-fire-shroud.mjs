import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {withCatalogueBrowser} from './catalogue-browser.mjs';

// One bounded real host, real title and mounted controls. No injected burning
// snapshots, teleports, geometry edits, or substitute preview renderer.
const args=process.argv.slice(2),urlIndex=args.indexOf('--url'),url=urlIndex<0?undefined:args[urlIndex+1];
if(urlIndex>=0)args.splice(urlIndex,2);
const output=path.resolve(args.find(a=>!a.startsWith('--'))||'artifacts/qa/character-fire-shroud/host');
await withCatalogueBrowser(async({page,baseUrl,save,errors,manifest})=>{
 page.setDefaultTimeout(180000);
 await page.goto(baseUrl+'?catalogue=modules',{waitUntil:'networkidle'});
 const deployed=await page.evaluate(async()=>{const response=await fetch('./build-manifest.json');if(!response.ok)throw Error('Missing package manifest');return response.json();});
 const runtimePaths=['src/art/fire.js','src/art/index.js',...manifest.files.filter(f=>f.path.startsWith('src/art/character-shroud/')).map(f=>f.path),'src/reuse/bear.js','src/reuse/civilians.js','src/simulation/character-fire.js','src/simulation/index.js','src/simulation/catalogue-thermal.js','src/simulation/field.js'];
 for(const p of runtimePaths){const expected=manifest.files.find(f=>f.path===p),actual=deployed.files.find(f=>f.path===p);assert.ok(expected&&actual,'Packaged '+p);assert.equal(actual.sha256,expected.sha256,'Exact reviewed runtime '+p);}
 save('package-identity.json',{baseUrl,files:deployed.files.filter(f=>runtimePaths.includes(f.path))});
 await page.evaluate(async()=>{
  const main=await import('./src/main.js');main.currentApplication.dispose();
  window.qa={snap:null,metrics:null,phase:'initial',rows:[],trace:[],lastRaf:null};
  const raf=t=>{qa.lastRaf=t;qa.raf=requestAnimationFrame(raf);};qa.raf=requestAnimationFrame(raf);
  qa.app=main.startApplication({autoStart:true,onSnapshot:(s,m)=>{
   qa.snap=s;qa.metrics=m;
   if(qa.phase==='active-character'){
    const active=[s.player,...s.actors].filter(a=>a.hp>0&&a.characterFire.active).map(a=>a.id);
    if(active.length){qa.windowStart??={world:s.clocks.world,wall:performance.now()};qa.rows.push({raf:qa.lastRaf,wall:performance.now(),hostTick:s.tick,world:s.clocks.world,active,paused:s.paused,dropped:s.diagnostics.droppedRealSeconds,simulationMs:m.simulationMs,artCpuMs:m.artCpuMs,uiCpuMs:m.uiCpuMs,renderSubmitCpuMs:m.renderSubmitCpuMs,drawCalls:m.drawCalls,geometries:m.geometries,textures:m.textures});if(s.clocks.world-qa.windowStart.world>=1.5)qa.phase='post-window';}
   }
  }});
 });
 await page.screenshot({path:path.join(output,'title.jpg'),type:'jpeg',quality:88});
 await page.locator('[data-title-start]').click();assert.equal(await page.locator('[data-place-grid] button').count(),4);
 await page.getByRole('button',{name:'Open Catalogue Street map',exact:true}).click();
 await page.waitForFunction(()=>qa.app.state().phase==='visit'||qa.app.state().error);
 assert.equal(await page.evaluate(()=>qa.app.state().phase),'visit');
 if(await page.evaluate(()=>qa.snap.paused))await page.locator('[data-resume]').click();
 await page.locator('#viewport canvas').focus();
 const state=()=>page.evaluate(()=>({player:qa.snap.player,actors:qa.snap.actors,tick:qa.snap.tick,paused:qa.snap.paused,clocks:qa.snap.clocks}));
 const trace=async(type,value)=>{const row=await page.evaluate(({type,value})=>{const row={type,value,tick:qa.snap.tick,world:qa.snap.clocks.world,player:qa.snap.player};qa.trace.push(row);return row;},{type,value});save('progress.json',row);};
 const capture=async label=>{
  const s=await page.evaluate(()=>({player:qa.snap.player,actors:qa.snap.actors,tick:qa.snap.tick,paused:qa.snap.paused,clocks:qa.snap.clocks,events:qa.snap.events,thermal:qa.snap.diagnostics.thermal,art:qa.app.visit().artDiagnostics(),metrics:qa.metrics}));save(label+'.json',s);
  await page.screenshot({path:path.join(output,label+'.jpg'),type:'jpeg',quality:90});assert.equal(s.art.fire.actorFlameCards,0);return s;
 };
 async function reset(label){
  await page.keyboard.up('Space');await page.locator('[data-pause]').click();await page.locator('[data-reset]').click();
  await page.waitForFunction(()=>!qa.snap.paused&&qa.snap.clocks.world<1);await page.locator('#viewport canvas').focus();return capture(label);
 }
 const stick=await page.locator('[data-stick]').boundingBox(),centre={x:stick.x+stick.width/2,y:stick.y+stick.height/2},radius=Math.min(stick.width,stick.height)*.36;
 let dragging=false;
 async function stop(){if(dragging){await page.mouse.move(centre.x,centre.y);await page.mouse.up();dragging=false;}await page.waitForTimeout(100);}
 async function walk(target,label,{tolerance=.09}={}){
  await trace('walk',{target,label});let reached=false,previous,stalled=0;
  await page.mouse.move(centre.x,centre.y);await page.mouse.down();dragging=true;
  try{for(let i=0;i<300;i++){
   const s=await state(),p=s.player,dx=target[0]-p.x,dz=target[2]-p.y,d=Math.hypot(dx,dz);
   if(d<tolerance&&Math.abs((p.elevation||0)-target[1])<.25){reached=true;break;}
   if(p.hp<=0)throw Error('Player died while walking '+label);
   if(p.interaction?.kind==='door'&&p.interaction.enabled&&p.interaction.action==='open'){await stop();await page.keyboard.press('e');await page.waitForTimeout(120);await page.mouse.move(centre.x,centre.y);await page.mouse.down();dragging=true;}
   const n=Math.hypot(10,12),scale=Math.min(.65,Math.max(.14,d*.48)),x=(dx/(d||1)*12-dz/(d||1)*10)/n*scale,y=(-dx/(d||1)*10-dz/(d||1)*12)/n*scale;
   await page.mouse.move(centre.x+x*radius,centre.y-y*radius);await page.waitForTimeout(35);
   if(previous&&Math.hypot(p.x-previous.x,p.y-previous.y)<1e-6)stalled++;else stalled=0;previous=p;
   if(stalled>12)throw Error('Real joystick blocked '+label+' '+JSON.stringify(p));
  }}finally{await stop();}
  assert.ok(reached,'Real joystick reaches '+label);return state();
 }
 async function face(point){
  const p=(await state()).player,dx=point[0]-p.x,dz=point[2]-p.y,n=Math.hypot(dx,dz)||1;
  return walk([p.x+dx/n*.19,p.elevation||0,p.y+dz/n*.19],'face-target',{tolerance:.06});
 }
 async function aim(point){
  const projected=await page.evaluate(point=>{const p=qa.app.visit().projectInteraction(point),r=document.querySelector('#hud').getBoundingClientRect();return {...p,clientX:p.x+r.left,clientY:p.y+r.top};},point);
  assert.ok(projected.visible,'Target visible at normal zoom');await page.mouse.click(projected.clientX,projected.clientY);await trace('surface-aim',point);
 }
 async function igniteNpc(id,label){
  const a=(await state()).actors.find(a=>a.id===id);assert.ok(a&&a.hp>0);await face([a.x,a.elevation||0,a.y]);
  await page.keyboard.press('5');await page.locator('#viewport canvas').focus();await page.keyboard.down('Space');
  try{await page.waitForFunction(id=>qa.snap.actors.find(a=>a.id===id)?.burn,id,{timeout:4000});}finally{await page.keyboard.up('Space');}
  await page.waitForFunction(id=>qa.snap.actors.find(a=>a.id===id)?.characterFire.age>.42,id,{timeout:3000});
  const s=await capture(label);assert.equal(s.actors.find(a=>a.id===id).characterFire.active,true);assert.ok(s.events.some(e=>e.type==='actor-ignition'&&e.actorId===id));return s;
 }
 async function startClip(){await page.evaluate(()=>{
  const canvas=document.querySelector('#viewport canvas'),stream=canvas.captureStream(30),type=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(t=>MediaRecorder.isTypeSupported(t));
  qa.clip={stream,chunks:[]};qa.clip.recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:2500000});qa.clip.recorder.ondataavailable=e=>{if(e.data.size)qa.clip.chunks.push(e.data);};qa.clip.recorder.start();
 });}
 async function endClip(name){const bytes=await page.evaluate(async()=>{
  await new Promise(resolve=>{qa.clip.recorder.onstop=resolve;qa.clip.recorder.stop();});for(const t of qa.clip.stream.getTracks())t.stop();
  const buffer=new Uint8Array(await new Blob(qa.clip.chunks,{type:qa.clip.recorder.mimeType}).arrayBuffer());let binary='';for(let i=0;i<buffer.length;i+=32768)binary+=String.fromCharCode(...buffer.subarray(i,i+32768));return btoa(binary);
 });fs.writeFileSync(path.join(output,name),Buffer.from(bytes,'base64'));}
 try{
  await capture('before');
  // Actual match/production native input, on inert paving under the player.
  let p=(await state()).player;await aim([Math.floor(p.x/.25)*.25+.125,p.elevation||0,Math.floor(p.y/.25)*.25+.125]);await page.locator('[data-tool="matches"]').click();
  await page.waitForFunction(()=>qa.snap.player.hp<100,null,{timeout:5000});const warm=await capture('warm-only');assert.equal(warm.player.characterFire.active,false);assert.equal(warm.thermal.metrics.burningCount,0);
  await reset('reset-before-npc');await walk([20,0,22.5],'goat-street-approach');
  let goat=(await state()).actors.find(a=>a.id==='neighbor-goat');await walk([goat.x,0,22.5],'goat-cone-stance');
  await startClip();await igniteNpc('neighbor-goat','moving-native-npc');
  await page.evaluate(()=>{qa.phase='active-character';qa.windowStart=null;qa.rows=[];});
  await page.waitForFunction(()=>qa.phase==='post-window',null,{timeout:6000});
  await capture('moving-npc-after-window');await endClip('moving-native-npc.webm');
  const rows=await page.evaluate(()=>qa.rows);save('actual-frame-window.json',rows);const first=rows[0],last=rows.at(-1),frames=[...new Map(rows.map(r=>[r.raf,r])).values()],intervals=frames.slice(1).map((r,i)=>r.raf-frames[i].raf).sort((a,b)=>a-b);
  save('active-character-cost.json',{autoStart:true,windowWorldSeconds:last.world-first.world,wallSeconds:(last.wall-first.wall)/1000,frames:frames.length,hz:(frames.length-1)*1000/(frames.at(-1).raf-frames[0].raf),p95FrameMs:intervals[Math.floor(intervals.length*.95)],worstFrameMs:intervals.at(-1),activeIds:[...new Set(rows.flatMap(r=>r.active))],drawCalls:[Math.min(...rows.map(r=>r.drawCalls)),Math.max(...rows.map(r=>r.drawCalls))],geometries:[first.geometries,last.geometries],textures:[first.textures,last.textures],droppedSeconds:last.dropped-first.dropped,scope:'One short normal-paced actual character window; no city-scale inference.'});
  await page.waitForFunction(()=>!qa.snap.actors.find(a=>a.id==='neighbor-goat').characterFire.active,null,{timeout:6000});await capture('npc-cleared');
  if(!args.includes('--npc-only')){
  await reset('reset-before-officer');await walk([40,0,21.5],'officer-approach');await igniteNpc('chicago-beat-officer','uniformed-officer');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);await capture('uniformed-officer-phone');await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(120);
  await reset('reset-before-resident');await walk([40,0,19],'shop-approach');await walk([40,0,16],'shop-entry');await walk([40,0,14],'shop-aisle');await walk([40,0,11.4],'resident-cone-stance');await igniteNpc('bell-and-alder:resident','native-resident');
  await reset('reset-before-player');
  await page.locator('[data-tool="jerry-can"]').click();p=(await state()).player;await walk([p.x,0,p.y+1.4],'player-oil-trail');await page.locator('[data-tool="jerry-can"]').click();
  p=(await state()).player;await aim([p.x,p.elevation||0,p.y]);await page.locator('[data-tool="matches"]').click();await page.waitForFunction(()=>qa.snap.player.characterFire.active);await page.waitForFunction(()=>qa.snap.player.characterFire.age>.4);
  await startClip();const contact=await capture('player-contact');assert.equal(contact.player.characterFire.mode,'contact');assert.equal(contact.player.burn,undefined);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>qa.snap.paused);const frozen=await state();await page.waitForTimeout(200);assert.deepEqual((await state()).player.characterFire,frozen.player.characterFire);await page.locator('[data-resume]').click();
  p=(await state()).player;await walk([p.x,0,p.y-.5],'turn-back-through-real-trail');await walk([p.x+.8,0,p.y-.5],'exit-real-fuel');await page.waitForFunction(()=>!qa.snap.player.characterFire.active);await endClip('player-moving-turning.webm');await capture('player-exited');
  await reset('reset-before-elevated');
  const route=await page.evaluate(async()=>{const manifest=await(await fetch('./workbenches/catalogue-modular/scene-data.json')).json(),i=manifest.instances.find(i=>i.id==='bell-and-alder'),data=await(await fetch('./workbenches/catalogue-modular/'+i.source)).json();return data.navigation.prototypeRoute.slice(9,28).map(([x,y,z])=>[x+i.translation[0],y+i.translation[1],z+i.translation[2]]);});
  await walk([40,0,19],'elevated-street-start');for(const [i,point]of route.entries())await walk(point,'real-service-stair-'+i);
  p=(await state()).player;assert.ok(p.elevation>2);await page.locator('[data-tool="jerry-can"]').click();await walk([p.x-.35,p.elevation,p.y],'elevated-oil');await page.locator('[data-tool="jerry-can"]').click();p=(await state()).player;await aim([p.x,p.elevation,p.y]);await page.locator('[data-tool="matches"]').click();await page.waitForFunction(()=>qa.snap.player.characterFire.active);await page.waitForFunction(()=>qa.snap.player.characterFire.age>.4);await capture('elevated-player-contact');
  await reset('final-reset');
  }
  save('input-trace.json',await page.evaluate(()=>qa.trace));
  const disposal=await page.evaluate(()=>{const runtime=qa.app.visit(),before=runtime.artDiagnostics();cancelAnimationFrame(qa.raf);qa.app.dispose();return {before,after:runtime.artDiagnostics()};});save('disposal.json',disposal);assert.equal(disposal.after.disposed,true);
  assert.deepEqual(errors,[]);return {pass:true,baseUrl,autoStart:true,controls:'real title/menu, joystick, keyboard, surface picking and mounted tools',checks:['warm-only actual native match','moving native NPC actual held cone',...(!args.includes('--npc-only')?['uniformed officer actual held cone','native resident actual held cone','player actual oil contact/turn/exit','pause','native service stairs/elevated contact']:[]),'reset/disposal','one short active-character window'],limits:['Posed three-species and all-around fitting controls are the artist delivery.','Landmark hosts have no fire gameplay and do not publish characterFire.','Measured active-character window includes the short MediaRecorder capture.','This driver does not retest the old house fire library or claim city-scale performance.']};
 }catch(error){if(!page.isClosed())save('gameplay-failure.json',await page.evaluate(()=>({player:qa.snap.player,actors:qa.snap.actors,aim:qa.snap.aim,events:qa.snap.events,clocks:qa.snap.clocks,art:qa.app.visit()?.artDiagnostics(),trace:qa.trace})));throw error;
 }finally{if(!page.isClosed()){await stop();await page.keyboard.up('Space');save('input-trace.json',await page.evaluate(()=>qa.trace));await page.evaluate(()=>{cancelAnimationFrame(qa.raf);if(qa.clip?.recorder.state==='recording'){qa.clip.recorder.stop();for(const t of qa.clip.stream.getTracks())t.stop();}qa.app.dispose();});}}
},{output,url,purpose:'M25 actual character shroud controls, motion, elevated contact and one active-body frame window'});
