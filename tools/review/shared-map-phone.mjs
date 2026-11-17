import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withCatalogueBrowser} from './catalogue-browser.mjs';
import {worldToStick,DEFAULT_CONFIG} from '../../src/simulation/index.js';

// One architect-granted investigation. No second lane, manual simulation tick,
// app-command shortcut, pawn placement, positive fire state or extra renderer.
const runtimeCommit='2b350309d9116812a1d3988af090614bdaefbc25',authority='a01df472';
const args=process.argv.slice(2);
for(const a of args)assert.ok(a==='--plan-only'||/^--(?:output|manifest-sha256)=/.test(a),'Unknown option '+a);
const output=path.resolve(args.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/qa/shared-map-runtime/phone-review-v1');
assert.ok(output.startsWith(path.resolve('artifacts')+path.sep),'Evidence stays inside this worktree');
const hash=s=>createHash('sha256').update(s).digest('hex'),lf=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',windowsHide:true}).trim();
assert.equal(git('diff','--name-only',runtimeCommit,'--','src','assets','art','vendor','workbenches'),'','Freeze production runtime/source bytes at the accepted checkpoint');
const declaration=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/runtime-integration.json','utf8'));
for(const r of declaration.runtimeFiles)assert.equal(hash(lf(r.path)),r.afterLfSha256,r.path);
for(const r of declaration.addedFiles)assert.equal(hash(lf(r.path)),r.lfSha256,r.path);
for(const r of declaration.runtimePackages)assert.equal(hash(fs.readFileSync(r.path)),r.sha256,r.path);
const plan={version:1,authority,runtimeCommit,harnessCommit:git('rev-parse','HEAD'),harnessSha256:hash(fs.readFileSync('tools/review/shared-map-phone.mjs')),scope:'One phone-sized Edge engineering visit, not iPhone Safari, benchmark or production acceptance.',viewport:{width:844,height:390},normalZoom:true,absoluteBrowserLifetimeMs:180000,lanes:1,route:['title','goat selection','New York','front stair','open door','interior','return and close','glass match','coated wall match','places and disposal'],toolContacts:{glass:{x:50.5,y:26,h:3.02,carrier:'new-york::carrier/main/0/lower-3/glass'},wall:{x:54.8,y:26,h:3.02,carrier:'new-york::carrier/main/0/cell-1-22/1'}},inputs:'Trusted Playwright mouse joystick, keyboard/contextual E and match keys; reads only through public visit handles',stop:'First unexpected error/stall/contact mismatch, STOP file, fixed three-minute deadline or finally cleanup'};
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'plan.json'),JSON.stringify(plan,null,2)+'\n');
if(args.includes('--plan-only')){console.log(JSON.stringify({...plan,browserLaunched:false,buildLaunched:false}));process.exit(0);}
const expectedManifest=args.find(a=>a.startsWith('--manifest-sha256='))?.slice(18);
assert.match(expectedManifest||'',/^[a-f0-9]{64}$/,'Pass the single checked build-manifest SHA');
await withCatalogueBrowser(async({page,baseUrl,manifestSha256,save,errors})=>{
  assert.equal(manifestSha256,expectedManifest);await page.setViewportSize(plan.viewport);page.setDefaultTimeout(15000);
  const helper=JSON.parse(fs.readFileSync(path.join(output,'helper.json'),'utf8'));
  assert.equal(Date.parse(helper.expiresAt)-Date.parse(helper.startedAt),plan.absoluteBrowserLifetimeMs);
  save('absolute-deadline.json',{startedAt:helper.startedAt,expiresAt:helper.expiresAt,intervalMs:plan.absoluteBrowserLifetimeMs});
  let held=false,centre,radius,stage='title';const jpgs=[];
  const guard=()=>{assert.ok(Date.now()<Date.parse(helper.expiresAt),'Absolute review deadline');assert.deepEqual(errors,[],'Stop at the first browser/resource error');};
  const read=()=>page.evaluate(()=>{const s=qa.snap;return {app:qa.app.state(),player:s?.player,clocks:s?.clocks,tick:s?.tick,paused:s?.paused,navigation:s?.navigation,discharge:s?.discharge,thermal:s?.diagnostics?.thermal,events:s?.events?.filter(e=>e.tool||e.type==='portal-state').slice(-12),metrics:qa.metrics};});
  async function stop(){if(held){await page.mouse.up();held=false;}}
  async function capture(name){guard();save(name+'.json',await read());await page.screenshot({path:path.join(output,name+'.jpg'),type:'jpeg',quality:88});jpgs.push(name+'.jpg');}
  async function walk(x,y,label){
    stage=label;guard();const start=Date.now();let lastProgressAt=Date.now(),previous;
    const box=await page.locator('[data-stick]').boundingBox();assert.ok(box);centre={x:box.x+box.width/2,y:box.y+box.height/2};radius=Math.min(box.width,box.height)*.36;
    await page.mouse.move(centre.x,centre.y);await page.mouse.down();held=true;
    try{
      while(Date.now()-start<25000){
        guard();const current=await read();assert.equal(current.app.phase,'visit');assert.equal(current.player.hp,100);assert.equal(current.paused,false);
        const p=current.player,dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);
        if(d<.12){save(label+'.json',current);return current;}
        if(!previous||Math.hypot(p.x-previous.x,p.y-previous.y)>.015){previous={x:p.x,y:p.y};lastProgressAt=Date.now();}
        assert.ok(Date.now()-lastProgressAt<5000,'Normal movement stalled at '+label);
        const magnitude=Math.min(.65,d/1.5),v=worldToStick({x:dx/d*magnitude,y:dy/d*magnitude},DEFAULT_CONFIG.input);
        await page.mouse.move(centre.x+v.x*radius,centre.y-v.y*radius);await page.waitForTimeout(100);
      }throw Error('Finite route deadline at '+label);
    }finally{await stop();}
  }
  async function door(action){
    stage=action+'-front-door';guard();const before=await read(),target=before.player.interaction;
    assert.equal(target?.id,'ny-front');assert.equal(target.action,action);assert.equal(target.enabled,true);
    await page.locator('#viewport canvas').focus();await page.keyboard.press('e');
    await page.waitForFunction(open=>qa.snap.navigation.portalStates['ny-front']===open,action==='open',{timeout:10000});save(stage+'.json',await read());
  }
  async function match(kind){
    stage=kind+'-contact';guard();const target=plan.toolContacts[kind];
    const aim=await page.evaluate(p=>{const r=qa.app.visit(),screen=r.projectInteraction([p.x,p.h,p.y]),box=document.querySelector('#hud').getBoundingClientRect(),x=box.left+screen.x,y=box.top+screen.y;return {screen,x,y,picked:screen.visible?r.screenToWorld(x,y):null,element:screen.visible?document.elementFromPoint(x,y)?.tagName:null};},target);
    save(stage+'-aim.json',aim);assert.equal(aim.screen.visible,true);assert.equal(aim.element,'CANVAS');assert.equal(aim.picked?.sourceSurfaceId,target.carrier,'The actual camera ray must select the intended original surface');
    await page.mouse.move(aim.x,aim.y);await page.locator('#viewport canvas').focus();await page.keyboard.press('Digit1');
    const before=await read();await page.keyboard.press('Space',{delay:70});
    await page.waitForFunction(stock=>qa.snap.player.inventory.matches===stock-1,before.player.inventory.matches,{timeout:10000});
    const after=await read(),event=after.events.filter(e=>e.tool==='matches').at(-1);assert.ok(event);
    if(kind==='glass')assert.equal(event.result,'no-fuel');else assert.ok(['heated','ignited'].includes(event.result));save(stage+'.json',{before,after,aim});
  }
  try{
    await page.goto(baseUrl,{waitUntil:'networkidle',timeout:30000});
    await page.evaluate(async()=>{
      const main=await import('./src/main.js');main.currentApplication.dispose();
      window.qa={snap:null,metrics:null,rows:[],phases:[],inputEvents:[],counter:0};
      for(const type of ['keydown','keyup','pointerdown','pointerup','click'])window.addEventListener(type,e=>{if(qa.inputEvents.length<2000)qa.inputEvents.push({type,trusted:e.isTrusted,at:performance.now(),code:e.code,x:e.clientX,y:e.clientY,target:e.target?.tagName});});
      qa.app=main.startApplication({onLoadPhase:p=>qa.phases.push({...p,at:performance.now()}),onSnapshot:(s,m)=>{qa.snap=s;qa.metrics=m;if(qa.counter++%15===0&&qa.rows.length<600)qa.rows.push({at:performance.now(),tick:s.tick,world:s.clocks.world,player:{x:s.player.x,y:s.player.y,h:s.player.elevation,interior:s.player.interior},nativeTick:s.diagnostics.thermal.nativeTick,cells:s.diagnostics.thermal.gridCells,activeCarriers:s.diagnostics.thermal.carriers?.activeCarriers,burning:s.diagnostics.thermal.metrics.burningCount,metrics:m});}});
    });
    save('title.json',await page.evaluate(()=>({state:qa.app.state(),text:document.querySelector('#title-screen').innerText})));
    await page.locator('[data-title-start]').click();assert.equal(await page.locator('[data-place-grid] button').count(),4);
    await page.locator('[data-select-character="goat"]').click();stage='new-york-loading';
    await page.getByRole('button',{name:'Open New York State Building map',exact:true}).click();
    await page.waitForFunction(()=>qa.app.state().phase==='visit'||qa.app.state().error,null,{timeout:120000});
    let s=await read();assert.equal(s.app.phase,'visit',s.app.error||'New York did not open');assert.equal(s.player.characterId,'goat');assert.equal(await page.locator('#viewport canvas').count(),1);
    assert.equal(s.thermal.backend,'native-map-trial');assert.deepEqual(s.metrics.viewport,plan.viewport);assert.equal(s.metrics.camera.mode,'follow');assert.equal(s.metrics.camera.zoom,1);
    if(s.paused){await page.locator('[data-resume]:visible').click();await page.waitForFunction(()=>!qa.snap.paused);}
    save('opened.json',await read());
    await walk(56,24.8,'front-stair');await door('open');s=await walk(56,28,'interior-entry');assert.ok(Math.abs(s.player.elevation-2.12)<1e-5);assert.equal(s.player.interior,true);await capture('interior');
    await walk(56,24.8,'front-return');await door('close');
    await walk(50.5,24.85,'glass-stance');await match('glass');
    await walk(54.8,24.85,'wall-stance');await match('wall');
    await page.waitForFunction(()=>qa.snap.diagnostics.thermal.metrics.burningCount>0,null,{timeout:10000});await capture('exterior-ignition');
    stage='menu-disposal';save('final-art.json',await page.evaluate(()=>qa.app.visit().artDiagnostics()));
    await page.locator('[data-pause]').click();await page.locator('[data-exit-to-menu]:visible').click();await page.waitForFunction(()=>qa.app.state().phase==='menu');assert.equal(await page.locator('#viewport canvas').count(),0);
    guard();return {passed:true,authority,runtimeCommit,manifestSha256,viewport:plan.viewport,normalZoom:true,jpgs,scope:plan.scope};
  }catch(error){
    try{save('first-finding.json',{stage,error:error.stack,state:await read()});if(jpgs.length<2){await page.screenshot({path:path.join(output,'first-failure.jpg'),type:'jpeg',quality:88});jpgs.push('first-failure.jpg');}}catch{/* Preserve the original failure if its page has already closed. */}
    throw error;
  }finally{
    try{await stop();save('frame-contacts-input.json',await page.evaluate(()=>({rows:qa.rows,phases:qa.phases,inputEvents:qa.inputEvents})));await page.evaluate(()=>qa.app.dispose());}catch{/* The existing lifecycle still closes the complete context/browser/server. */}
  }
},{output,lifetimeMs:plan.absoluteBrowserLifetimeMs,purpose:'M29 a01df472: one frozen New York phone-sized normal-input engineering review'});
