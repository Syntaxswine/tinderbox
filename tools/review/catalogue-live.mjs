import path from 'node:path';
import assert from 'node:assert/strict';
import {withCatalogueBrowser} from './catalogue-browser.mjs';

const output=path.resolve(process.argv[2]||'artifacts/qa/catalogue-modular/production-live');
await withCatalogueBrowser(async({page,context,baseUrl,save,errors})=>{
 page.setDefaultTimeout(180000);
 await page.goto(baseUrl+'?catalogue=modules',{waitUntil:'networkidle'});
 await page.evaluate(async()=>{
   const main=await import('./src/main.js');main.currentApplication.dispose();window.qa={rows:[],rafTrace:[],phase:'warmup',snap:null,metrics:null,lastRaf:null,fireStart:null,fireEnd:null};
   const observe=t=>{qa.lastRaf=t;qa.rafTrace.push({phase:qa.phase,rafMs:t,wallMs:performance.now()});qa.rafId=requestAnimationFrame(observe);};qa.rafId=requestAnimationFrame(observe);
   const point=s=>({hostTick:s.tick,worldTime:s.clocks.world,nativeTick:s.diagnostics.thermal.nativeTick,activeCells:s.diagnostics.thermal.metrics.activeCells,burning:s.diagnostics.thermal.metrics.burningCount,rafMs:qa.lastRaf});
   qa.app=main.startApplication({autoStart:true,onSnapshot:(s,m)=>{
     qa.firstSnapshotAt??=performance.now();qa.snap=s;qa.metrics=m;
     if(qa.phase==='small-fire'&&!qa.fireStart&&s.diagnostics.thermal.metrics.burningCount>0)qa.fireStart=point(s);
     if(qa.phase!=='warmup')qa.rows.push({phase:qa.phase,rafMs:qa.lastRaf,wallMs:performance.now(),hostTick:s.tick,worldTime:s.clocks.world,playerTime:s.clocks.player,paused:s.paused,dropped:s.diagnostics.droppedRealSeconds,nativeTick:s.diagnostics.thermal?.nativeTick,activeCells:s.diagnostics.thermal?.metrics.activeCells,burning:s.diagnostics.thermal?.metrics.burningCount,nativeTiming:s.diagnostics.thermal?.timing,simulationMs:m.simulationMs,artCpuMs:m.artCpuMs,uiCpuMs:m.uiCpuMs,renderSubmitCpuMs:m.renderSubmitCpuMs});
     // End only the QA window at a matched fire world-age. The real game loop
     // keeps running; screenshot/Playwright latency cannot shorten the sample.
     if(qa.phase==='small-fire'&&qa.fireStart&&s.clocks.world-qa.fireStart.worldTime>=3.5){qa.fireEnd=point(s);qa.phase='post-fire';}
   }});
 });
 await page.locator('[data-title-start]').click();assert.equal(await page.locator('[data-place-grid] button').count(),4);
 await page.evaluate(()=>qa.visitRequestedAt=performance.now());await page.getByRole('button',{name:'Open Catalogue Street map',exact:true}).click();
 await page.waitForFunction(()=>qa.app.state().phase==='visit'||qa.app.state().error);assert.equal(await page.evaluate(()=>qa.app.state().phase),'visit');
 await page.waitForTimeout(1200);if(await page.evaluate(()=>qa.snap.paused)){await page.keyboard.press('Escape');await page.waitForFunction(()=>!qa.snap.paused);}
 const initial=await page.evaluate(()=>({player:qa.snap.player,initializationMs:qa.firstSnapshotAt-qa.visitRequestedAt,droppedSinceStart:qa.snap.diagnostics.droppedRealSeconds,metrics:qa.metrics,art:qa.app.visit().artDiagnostics()}));save('initial.json',initial);
 await page.evaluate(()=>qa.phase='quiet');await page.waitForTimeout(2000);
 await page.keyboard.down('s');await page.waitForTimeout(350);await page.keyboard.up('s');await page.waitForTimeout(150);
 const released=await page.evaluate(()=>({...qa.snap.player}));await page.waitForTimeout(300);const still=await page.evaluate(()=>({...qa.snap.player}));assert.ok(released.travelled>0);assert.ok(Math.hypot(still.x-released.x,still.y-released.y)<1e-7);save('keyboard-release.json',{released,still});
 const rect=await page.locator('[data-stick]').boundingBox(),centre={x:rect.x+rect.width/2,y:rect.y+rect.height/2},radius=Math.min(rect.width,rect.height)*.36;
 await page.mouse.move(centre.x,centre.y);await page.mouse.down();
 let reached=false;
 try{for(let i=0;i<180;i++){
   const p=await page.evaluate(()=>({x:qa.snap.player.x,y:qa.snap.player.y})),dx=20-p.x,dz=24.5-p.y,d=Math.hypot(dx,dz);if(d<.065){reached=true;break;}
   const scale=Math.min(.65,Math.max(.14,d*.45)),n=Math.hypot(10,12),x=(dx/d*12-dz/d*10)/n*scale,y=(-dx/d*10-dz/d*12)/n*scale;
   await page.mouse.move(centre.x+x*radius,centre.y-y*radius);await page.waitForTimeout(35);
 }}finally{await page.mouse.up();}
 assert.ok(reached,'Real-time joystick reaches the grass edge');await page.waitForTimeout(150);
 const stance=await page.evaluate(()=>({...qa.snap.player}));await page.waitForTimeout(200);assert.ok(Math.hypot(qaSafe(await page.evaluate(()=>qa.snap.player.x))-stance.x,qaSafe(await page.evaluate(()=>qa.snap.player.y))-stance.y)<1e-7);
 save('joystick-release.json',{stance,after:await page.evaluate(()=>({...qa.snap.player}))});
 const point=await page.evaluate(()=>{const p=qa.snap.player,a=qa.app.visit().projectInteraction([p.x,0,p.y+.85]),r=document.querySelector('#hud').getBoundingClientRect();return {...a,clientX:r.left+a.x,clientY:r.top+a.y,target:{x:p.x,y:p.y+.85}};});assert.ok(point.visible);
 await page.mouse.click(point.clientX,point.clientY);await page.waitForTimeout(80);const aim=await page.evaluate(()=>qa.snap.aim);save('actual-rendered-aim.json',{projected:point,aim});assert.ok(Math.hypot(aim.x-point.target.x,aim.y-point.target.y)<.1,'Native surface picking reaches the visible grass');
 await page.evaluate(()=>qa.phase='small-fire');await page.locator('[data-tool="matches"]').click();await page.waitForFunction(()=>qa.fireEnd);const fireAge=await page.evaluate(()=>({start:qa.fireStart,end:qa.fireEnd,worldAge:qa.fireEnd.worldTime-qa.fireStart.worldTime}));assert.ok(fireAge.worldAge>=3.5);save('fire-age-window.json',fireAge);
 await page.screenshot({path:path.join(output,'live-small-fire.jpg'),type:'jpeg',quality:90});
 save('actual-frame-samples-before-focus.json',await page.evaluate(()=>qa.rows));
 await page.evaluate(()=>qa.phase='focus');await page.keyboard.down('s');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await page.waitForFunction(()=>qa.snap.paused);const paused=await page.evaluate(()=>({world:qa.snap.clocks.world,player:qa.snap.player}));await page.waitForTimeout(250);const frozen=await page.evaluate(()=>({world:qa.snap.clocks.world,player:qa.snap.player}));assert.equal(frozen.world,paused.world);assert.equal(frozen.player.moving,false);
 await page.keyboard.up('s');await page.locator('[data-resume]').click();await page.waitForFunction(()=>!qa.snap.paused);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>qa.snap.player.moving),false);save('focus-pause-release.json',{stimulus:'DOM window blur in headless Edge; tab activation does not emit OS focus loss here',paused,frozen});
 await page.evaluate(()=>qa.phase='reset');await page.locator('[data-pause]').click();await page.locator('[data-reset]').click();await page.waitForFunction(()=>qa.snap.diagnostics.generation===1);await page.waitForTimeout(400);
 const reset=await page.evaluate(()=>({player:qa.snap.player,pickups:qa.snap.pickups,thermal:qa.snap.diagnostics.thermal,metrics:qa.metrics,art:qa.app.visit().artDiagnostics()}));save('reset.json',reset);assert.equal(reset.player.inventory.matches,12);assert.ok(reset.pickups.every(p=>!p.consumed));assert.equal(reset.thermal.metrics.burningCount,0);
 const rows=await page.evaluate(()=>qa.rows);save('actual-frame-samples.json',rows);save('actual-raf-trace.json',await page.evaluate(()=>qa.rafTrace));
 const report=['quiet','small-fire'].map(phase=>{const r=[...new Map(rows.filter(r=>r.phase===phase&&!r.paused&&Number.isFinite(r.rafMs)).map(r=>[r.rafMs,r])).values()],first=r[0],last=r.at(-1),intervals=r.slice(1).map((v,i)=>v.rafMs-r[i].rafMs).sort((a,b)=>a-b);return {phase,frames:r.length,rafSeconds:(last.rafMs-first.rafMs)/1000,completionWallSeconds:(last.wallMs-first.wallMs)/1000,worldSeconds:last.worldTime-first.worldTime,hz:(r.length-1)*1000/(last.rafMs-first.rafMs),p95FrameMs:intervals[Math.floor(intervals.length*.95)],worstFrameMs:intervals.at(-1),droppedSeconds:last.dropped-first.dropped,nativeTicks:[first.nativeTick,last.nativeTick],activeCells:[first.activeCells,last.activeCells],burning:[first.burning,last.burning],...(phase==='small-fire'?{fireAge}:{})};});save('actual-pacing.json',report);
 await page.evaluate(()=>{cancelAnimationFrame(qa.rafId);qa.app.dispose();});assert.deepEqual(errors,[]);return {pass:true,autoStart:true,query:'?catalogue=modules',path:'/tinderbox/',pacing:report,checks:['native keyboard and release','real mouse joystick and release','rendered-surface aim and native match','focus pause/resume','reset'],limits:['Approximate30fps remains an assessment target; the measured pacing values are reported without a performance pass assertion.','Focus uses an explicit DOM blur stimulus in headless Edge; OS tab activation was not a reliable focus stimulus here.']};
},{output});
function qaSafe(value){assert.ok(Number.isFinite(value));return value;}
