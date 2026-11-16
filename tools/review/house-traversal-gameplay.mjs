import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {withCatalogueBrowser} from './catalogue-browser.mjs';
import {pinnedTraversalSource} from './house-traversal-physical.mjs';
import {physicalDriver} from './house-traversal-controls.mjs';
import {createNavigation} from '../../workbenches/furnished-house/navigation.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {worldToStick} from '../../src/simulation/index.js';
import {loadCatalogueModules} from '../../src/runtime/catalogue-modules.js';
import {sweptCylinderClear} from '../../src/runtime/collision.js';

const option=name=>process.argv.slice(2).find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
const commit=option('art-commit'),expectedManifest=option('manifest-sha256');assert.match(expectedManifest||'',/^[a-f0-9]{64}$/,'The checked package manifest hash is required');
const output=path.resolve(option('output')||'artifacts/qa/house-traversal-gameplay/'+Date.now());assert.ok(!fs.existsSync(output),'Use fresh evidence');fs.mkdirSync(output,{recursive:true});
const save=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n'),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(fs.readFileSync('dist/build-manifest.json')),expectedManifest);
const sources=['tools/review/house-traversal-gameplay.mjs','tools/review/catalogue-browser.mjs','tools/review/browser-lanes.mjs','tools/review/house-traversal-physical.mjs','tools/review/house-traversal-controls.mjs','package.json'];
for(const file of sources){const target=path.join(output,'restart-source',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}
const restart={owner:'Coder Tinderbox',project:'M28 actual gameplay',cwd:process.cwd(),executable:process.execPath,args:process.argv.slice(1),runtime:process.version,sources,sourceHashes:sources.map(path=>({path,sha256:sha(fs.readFileSync(path))})),artCommit:commit,manifestSha256:expectedManifest,inputs:'Checked dist and real title/character/menu/joystick/contextual controls',outputs:output,pendingWork:'Canonical source-only planning, then2regressions,1mouse barrel glance and6full H15 visits',automaticRestart:false,deadline:'Existing browser harness installs one absolute shutdown time20minutes from its launch; never reset',stop:'STOP file or harness deadline/finally',ports:'Recorded by helper.json at launch'};save('restart.json',restart);
const source=pinnedTraversalSource(commit),plan=source.plan,prepared={};
// Resolve expectations against the pinned real support before creating the
// browser. This disposable Node fixture is never the gameplay player.
for(const characterId of ['bear','goat','horse']){
 const driver=physicalDriver({...source,characterId}),nav=createNavigation(driver.provider.trial,{...driver.body,start:plan.route[0],slide:true});
 try{
  const resolve=p=>{const q=[...p],support=nav.support(q,q[1]);if(support)q[1]=support.y;return q;},targets={};
  for(const offset of [0,-.05,.05,-.1,.1])targets[String(offset)]=plan.route.map((p,i)=>resolve(plan.point(i,offset)));
  const probes={wall:null,unsupported:null};
  for(let i=plan.route.length-1;i>=plan.inside;i--){
   const a=resolve(plan.route[i]);if(!nav.support(a,a[1])||!nav.clear(a,a))continue;
   for(const distance of [.35,.6,.9,1.2])for(const [x,z]of [[1,0],[-1,0],[0,1],[0,-1],[.70710678,.70710678],[-.70710678,.70710678],[.70710678,-.70710678],[-.70710678,-.70710678]]){
    const b=[a[0]+x*distance,a[1],a[2]+z*distance],support=nav.support(b,b[1]),clear=nav.clear(a,b),block=nav.snapshot().lastBlock,boundary=block&&driver.provider.trial.scene.index.surfaces.get(block.id);
    if(!probes.wall&&support&&Math.abs(support.y-a[1])<1e-6&&!clear&&boundary?.kind==='wall'&&!boundary.openingId)probes.wall={fromIndex:i,target:b,sourceBoundaryId:block.id};
    if(!probes.unsupported&&a[1]>plan.floorY+.22&&!support&&clear)probes.unsupported={fromIndex:i,target:b};
   }
  }
  prepared[characterId]={body:driver.body,targets,probes};
 }finally{driver.dispose();}
}
// Derive one quiet west approach from the actual street prop/profile, then
// traverse it with the bound native provider. This fixture never places or
// changes the actual gameplay player and is disposed before renderer launch.
async function planBarrel(){
 const compiled=await loadCatalogueModules({fetcher:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(url,'utf8'))})}),driver=physicalDriver({...source,compiled,characterId:'goat'});
 try{
  const prop=source.definition.obstacles.find(o=>o.id==='street-drum-west'),shape=compiled.data.surfaces.find(s=>s.hostObstacleId===prop.id);assert.ok(shape&&shape.physicalShape==='source-closed-mesh');
  const combined=Math.min(prop.width,prop.depth)/2+driver.body.radius,offset=(combined+.1)/Math.sqrt(2),stance=[prop.x-offset,0,prop.y+offset],west=prop.x-combined-.25,route=[[source.definition.player.x,0,source.definition.player.y],[west,0,source.definition.player.y],[west,0,stance[2]],stance];
  for(const [index,target]of route.entries())driver.walk(target,'barrel-source-approach-'+index,{autoOpen:false});
  const before=driver.position(),oracle={id:shape.id,triangles:shape.triangles,closed:true},frames=[];
  assert.equal(sweptCylinderClear({x:before[0],y:before[2]},{x:before[0],y:before[2]},driver.body.radius,.025,driver.body.height,oracle),true);
  for(let i=0;i<4;i++){const row=driver.step(driver.input(1,0),'barrel-source-glance');for(let j=1;j<row.acceptedPath.length;j++){const a=row.acceptedPath[j-1],b=row.acceptedPath[j];assert.equal(sweptCylinderClear(a,b,driver.body.radius,.025,driver.body.height,oracle),true);}frames.push(row);}
  const after=driver.position();assert.ok(after[0]>before[0]&&after[2]>before[2]+.015,'Source-planned pure +X demand must glance around the actual barrel');
  return {prop,body:driver.body,route,stance,before,after,requestedWorld:{x:1,y:0},ticks:4,frames,oracle,scope:'CPU planning only; no actual pawn placement. Source/profile clearance and real provider path verified; fixture disposed before browser.'};
 }finally{driver.dispose();}
}
let barrelPlan;try{barrelPlan=await planBarrel();}catch(error){save('preflight-failure.json',{stage:'canonical-barrel-source-plan',error:error.stack,prepared});throw error;}
const matrix=[
 {id:'bear-front-regression',animal:'bear',mode:'mouse',frontOnly:true},
 {id:'goat20mm-exit-regression',animal:'goat',mode:'mouse',frontOnly:true,exitShift:.02},
 {id:'goat-mouse-street-barrel-glance',animal:'goat',mode:'mouse',barrel:true},
 ...['goat','horse','bear'].flatMap(animal=>['keyboard','mouse'].map(mode=>({id:animal+'-'+mode,animal,mode})))
].map(row=>({...row,status:'not-run'}));
save('preflight-plan.json',{artCommit:commit,sourceClosure:source.records,route:plan.route,front:plan.front,inside:plan.inside,outside:plan.outside,flights:plan.flights,interpolatedStances:plan.interpolatedStances,prepared,barrelPlan,matrix,planningFixtures:{h15:3,barrel:1,remaining:0},scope:'Actual full Catalogue visit; source-only physical planning fixtures disposed before browser launch. Fixed-step runtime with trusted DOM inputs; no FPS claim.'});
save('restart.json',{...restart,pendingWork:matrix,planningFixtures:{h15:3,barrel:1,remaining:0}});

await withCatalogueBrowser(async({page,baseUrl,manifestSha256,errors})=>{
 assert.equal(manifestSha256,expectedManifest);page.setDefaultTimeout(15000);
 const helper=JSON.parse(fs.readFileSync(path.join(output,'helper.json'))),expires=Date.parse(helper.expiresAt);save('absolute-deadline.json',{startedAt:helper.startedAt,expiresAt:helper.expiresAt,intervalMs:expires-Date.parse(helper.startedAt),automaticStop:helper.automaticStop});assert.equal(expires-Date.parse(helper.startedAt),1200000);
 let current,active,keys=new Set(),mouseHeld=false,held={x:0,y:0},centre,radius,startedRoute=0,frame=0,shift=0;
 const visits=[],negatives=[],unrun=[],barrelGlances=[];
 const guard=()=>{if(Date.now()>=expires||fs.existsSync(path.join(output,'STOP')))throw Error('Absolute browser deadline/STOP');if(startedRoute&&Date.now()-startedRoute>90000)throw Error('90second route wall deadline');};
 await page.goto(baseUrl+'?catalogue=modules',{waitUntil:'networkidle',timeout:30000});
 await page.evaluate(async()=>{
  const main=await import('./src/main.js');main.currentApplication.dispose();window.qa={snap:null,inputEvents:[]};
  for(const type of ['keydown','keyup','pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','click','blur'])window.addEventListener(type,e=>{if(qa.inputEvents.length<100000)qa.inputEvents.push({type,trusted:e.isTrusted,at:performance.now(),code:e.code,buttons:e.buttons,pointerId:e.pointerId,x:e.clientX,y:e.clientY,target:e.target?.dataset?.stick!==undefined?'stick':e.target?.dataset?.interact!==undefined?'interact':e.target?.tagName});},true);
  qa.app=main.startApplication({autoStart:false,onSnapshot:s=>{qa.snap=s;}});
 });
 await page.locator('[data-title-start]').click();
 async function step(label){
  guard();current=await page.evaluate(()=>{const s=qa.app.visit().advance(1/60);return {tick:s.tick,paused:s.paused,clocks:s.clocks,player:s.player,acceptedPath:s.diagnostics.acceptedPath,navigation:s.diagnostics.thermal?.navigation,doors:s.world?.shop?.doors,effects:s.effects,events:s.events.filter(e=>/portal|door/.test(e.type)),burningCells:s.diagnostics.burningCells};});
  assert.ok(Array.isArray(current.doors),'Actual snapshot world.shop.doors must be present before review');
  fs.appendFileSync(path.join(output,'frames.jsonl'),JSON.stringify({case:active?.id,frame:++frame,at:new Date().toISOString(),label,held:{...held,keys:[...keys],mouseHeld},...current})+'\n');
  assert.ok(!current.effects.powder.active&&!current.effects.inversion.active,'Quiet route must avoid movement-changing pickups');assert.equal(current.player.hp,100);return current;
 }
 async function setKeys(wanted){for(const key of [...keys])if(!wanted.has(key)){await page.keyboard.up(key);keys.delete(key);}for(const key of wanted)if(!keys.has(key)){await page.keyboard.down(key);keys.add(key);}}
 async function stop(label='stop'){await setKeys(new Set());if(mouseHeld){await page.mouse.up();mouseHeld=false;}held={x:0,y:0};if(current)await step(label);}
 async function move(vector){
  if(active.mode==='mouse'){
   if(!mouseHeld){const box=await page.locator('[data-stick]').boundingBox();centre={x:box.x+box.width/2,y:box.y+box.height/2};radius=Math.min(box.width,box.height)*.36;await page.mouse.move(centre.x,centre.y);await page.mouse.down();mouseHeld=true;}
   held={...vector};await page.mouse.move(centre.x+vector.x*radius,centre.y-vector.y*radius);
  }else{
   const a=Math.round(Math.atan2(vector.y,vector.x)/(Math.PI/4))*Math.PI/4,x=Math.cos(a),y=Math.sin(a),wanted=new Set();if(x>.4)wanted.add('d');if(x<-.4)wanted.add('a');if(y>.4)wanted.add('w');if(y<-.4)wanted.add('s');held={x:Math.abs(x)>.4?Math.sign(x):0,y:Math.abs(y)>.4?Math.sign(y):0};await setKeys(wanted);
  }
 }
 async function capture(label,extra={}){const name=active.id+'-'+label;save(name+'.json',{case:active,label,...extra,current,viewport:await page.locator('#viewport canvas').boundingBox()});await page.screenshot({path:path.join(output,name+'.jpg'),type:'jpeg',quality:90});}
 const front=()=>current.doors.find(d=>d.id===plan.front.id);
 async function action(requested){
  await stop('before-'+requested);const context=current.player.interaction;assert.equal(context?.id,plan.front.id);assert.equal(context.action,requested);assert.equal(context.enabled,true,context.reason);
  await page.locator('[data-interact]').click();await step('prompt-'+requested);await step('after-'+requested);assert.equal(front().open,requested==='open');assert.ok(!current.doors.some(d=>d.id===plan.front.id+'/right'));await page.locator('#viewport canvas').focus();
 }
 async function walk(target,label,{autoOpen=true,magnitude=1,expectBlock=false,movingCapture=false}={}){
  let samples=[];
  for(let i=0;i<5400;i++){
   guard();const p=current.player,dx=target[0]-p.x,dz=target[2]-p.y,d=Math.hypot(dx,dz),tolerance=active.mode==='keyboard'?.105:.035;
   if(d<tolerance&&Math.abs((p.elevation||0)-target[1])<1e-5){if(movingCapture)await capture(label+'-moving');await stop(label+'-arrived');visits.push({case:active.id,label,target,actual:current.player,tick:current.tick});return {arrived:true};}
   if(autoOpen&&p.interaction?.kind==='door'&&p.interaction.action==='open'&&p.interaction.enabled){await stop('before-nearby-open');await page.locator('[data-interact]').click();await step('nearby-open');await step('nearby-open-pose');samples=[];}
   const scale=active.mode==='mouse'?Math.max(.13,Math.min(magnitude,d/(DEFAULT_CONFIG.player.speed*DEFAULT_CONFIG.step))):1,vector=worldToStick({x:dx/(d||1)*scale,y:dz/(d||1)*scale},DEFAULT_CONFIG.input);
   await move(vector);await step(label);samples.push({time:current.clocks.active,x:current.player.x,y:current.player.y});while(samples.length>1&&current.clocks.active-samples[1].time>1.05)samples.shift();
   if(samples.length>1&&current.clocks.active-samples[0].time>1&&samples.every(r=>Math.hypot(r.x-samples[0].x,r.y-samples[0].y)<.005)){
    const result={arrived:false,label,target,expected:expectBlock,window:samples,block:current.navigation?.[current.player.id]};await capture(expectBlock?'expected-'+label:'first-unexpected-stall',result);
    if(expectBlock){await stop(label+'-expected-release');return result;}throw Object.assign(Error('Actual input stalled: '+active.id+'/'+label),{finding:result});
   }
  }throw Error('Bounded input route exhausted: '+label);
 }
 const target=(index,offset=0)=>{const p=[...prepared[active.animal].targets[String(offset)][index]];if(shift)p[0]+=shift;return p;};
 const checkpointSet=new Set(plan.flights.map(f=>f.checkpoint));
 async function finishReview(test){
  await stop();test.status='passed';test.final={player:current.player,clocks:current.clocks,tick:current.tick};save('matrix.json',matrix);save(test.id+'-input-events.json',await page.evaluate(()=>qa.inputEvents));await page.evaluate(()=>{qa.inputEvents=[];});
  startedRoute=0;await page.locator('[data-pause]').click();await step('pause-for-places');await page.locator('[data-exit-to-menu]:visible').click();await page.waitForFunction(()=>qa.app.state().phase==='menu');assert.equal(await page.locator('#viewport canvas').count(),0);current=null;
 }
 async function review(test){
  active=test;current=null;startedRoute=0;shift=0;keys.clear();mouseHeld=false;held={x:0,y:0};
  await page.locator('[data-select-character="'+test.animal+'"]').click();await page.getByRole('button',{name:'Open Catalogue Street map',exact:true}).click();await page.waitForFunction(()=>qa.app.state().phase==='visit'||qa.app.state().error,null,{timeout:120000});assert.equal(await page.evaluate(()=>qa.app.state().phase),'visit');
  await step('initial');if(current.paused){await page.locator('[data-resume]').click();await step('resume');}assert.equal(current.player.characterId,test.animal);assert.equal(current.player.radius,prepared[test.animal].body.radius);assert.equal(current.player.height,prepared[test.animal].body.height);assert.equal(await page.locator('#viewport canvas').count(),1);await page.locator('#viewport canvas').focus();
  startedRoute=Date.now();test.status='running';save('matrix.json',matrix);console.log(JSON.stringify({stage:'visit',case:test.id,expiresAt:helper.expiresAt}));
  if(test.barrel){
   for(const [index,point]of barrelPlan.route.entries())await walk(point,'barrel-approach-'+index,{autoOpen:false,magnitude:.5});await stop('barrel-stance');
   const before=structuredClone(current),body=current.player;assert.equal(sweptCylinderClear(body,body,body.radius,.025,body.height,barrelPlan.oracle),true);await capture('barrel-before');const frames=[];
   for(let i=0;i<barrelPlan.ticks;i++){await move(worldToStick(barrelPlan.requestedWorld,DEFAULT_CONFIG.input));await step('barrel-world-plus-x-'+i);for(let j=1;j<current.acceptedPath.length;j++)assert.equal(sweptCylinderClear(current.acceptedPath[j-1],current.acceptedPath[j],body.radius,.025,body.height,barrelPlan.oracle),true);frames.push(structuredClone(current));}
   await capture('barrel-glancing-moving');assert.ok(current.player.x>before.player.x&&current.player.y>before.player.y+.015,'Actual normal-mouse +X request must accept a curved barrel tangent');
   const distance=frames.reduce((n,row)=>n+row.acceptedPath.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-row.acceptedPath[i].x,p.y-row.acceptedPath[i].y),0),0);assert.ok(distance<=DEFAULT_CONFIG.player.speed*DEFAULT_CONFIG.step*barrelPlan.ticks+1e-6);assert.ok(Math.abs(current.player.travelled-before.player.travelled-distance)<1e-6);
   const result={case:test.id,requestedWorld:barrelPlan.requestedWorld,ticks:barrelPlan.ticks,before,after:structuredClone(current),distance,frames,sourceProp:barrelPlan.prop};barrelGlances.push(result);save('barrel-glance.json',result);await stop('barrel-release');await capture('barrel-after');await finishReview(test);return;
  }
  const end=test.frontOnly?plan.inside:plan.route.length-1;
  for(let i=0;i<=end;i++){
   let offset=0;if(!test.frontOnly&&test.mode==='mouse')offset=i<=plan.inside?.05:checkpointSet.has(i)?-.1:i===end?.1:0;
   const magnitude=!test.frontOnly&&test.mode==='mouse'?(checkpointSet.has(i)?.2:i>plan.inside?.5:1):1;
   await walk(target(i,offset),'in-'+i,{autoOpen:false,magnitude,movingCapture:checkpointSet.has(i)});
   if(i===plan.outside){
    if(test.id==='bear-front-regression'){const result=await walk(target(plan.inside),'closed-pair',{autoOpen:false,expectBlock:true});assert.equal(result.arrived,false);assert.equal(front().open,false);negatives.push({case:test.id,kind:'closed',...result});await walk(target(i),'closed-backoff',{autoOpen:false});}
    await action('open');
    await walk([plan.front.position[0],plan.floorY,plan.front.position[2]],'occupied-threshold',{autoOpen:false,magnitude:.5});await stop();assert.equal(current.player.interaction?.id,plan.front.id);assert.equal(current.player.interaction.enabled,false);assert.match(current.player.interaction.reason,/clear/i);await page.keyboard.press('e');await step('occupied-close-request');await step('occupied-close-pose-flush');assert.equal(front().open,true);await capture('occupied-close-rejected');negatives.push({case:test.id,kind:'occupied-close',blocked:true});
   }
   if(i===plan.inside){await capture('entered');await action('close');await action('open');}
   if(!test.frontOnly&&checkpointSet.has(i)){
    const before={x:current.player.x,y:current.player.y,elevation:current.player.elevation};for(let n=0;n<15;n++)await step('stopped-on-tread');assert.ok(Math.hypot(current.player.x-before.x,current.player.y-before.y)<1e-6);
    await walk(target(i-1,offset),'reverse-tread-'+i,{autoOpen:false,magnitude:.5});await walk(target(i,offset),'resume-tread-'+i,{autoOpen:false,magnitude:.2});
   }
  }
  await capture(test.frontOnly?'inside-turn':'upper');
  if(!test.frontOnly){
   await walk(target(end),'probe-centre',{autoOpen:true,magnitude:.5});
   for(const kind of ['wall','unsupported']){const probe=prepared[test.animal].probes[kind];if(!probe){unrun.push({case:test.id,kind,reason:'No canonical clear approach to an exclusive probe found; no source geometry altered'});continue;}
    // Reach the probe through authored points; no pawn placement.
    for(let i=end-1;i>=probe.fromIndex;i--)await walk(target(i),'probe-approach-'+kind+'-'+i,{autoOpen:true,magnitude:.5});
    const result=await walk(probe.target,kind+'-negative',{autoOpen:false,magnitude:.5,expectBlock:true});assert.equal(result.arrived,false);
    if(kind==='unsupported'&&result.block?.reason!=='No reachable support')unrun.push({case:test.id,kind,reason:'A real solid intercepted the probe before unsupported crossing',block:result.block});else negatives.push({case:test.id,kind,...result});
    await walk(target(probe.fromIndex),'probe-backoff-'+kind,{autoOpen:false,magnitude:.5});
    for(let i=probe.fromIndex+1;i<=end;i++)await walk(target(i),'probe-return-'+kind+'-'+i,{autoOpen:true,magnitude:.5});
   }
  }
  for(let i=end;i>=0;i--){
   const offset=!test.frontOnly&&test.mode==='mouse'?(i<=plan.inside?-.05:checkpointSet.has(i)?.1:0):0,magnitude=!test.frontOnly&&test.mode==='mouse'?(i>plan.inside?.2:.5):1;
   await walk(target(i,offset),'out-'+i,{autoOpen:i>plan.outside,magnitude});
   if(i===plan.inside&&test.exitShift){const before=current.player.x;await move(worldToStick({x:test.exitShift/(DEFAULT_CONFIG.player.speed*DEFAULT_CONFIG.step),y:0},DEFAULT_CONFIG.input));await step('walked20mm-exit-offset');await stop();assert.ok(Math.abs(current.player.x-before-test.exitShift)<1e-5);shift=test.exitShift;await capture('walked20mm-exit-offset');}
   if(i===plan.outside)await action('close');
  }
  await capture('outside');await finishReview(test);
 }
 try{for(const test of matrix)await review(test);assert.deepEqual(errors,[]);save('acceptance.json',{pass:true,matrix,visits,negatives,unrun,barrelGlances,sourceCommit:commit,manifestSha256,query:'?catalogue=modules',input:'Trusted DOM controls in actual production application; manual fixed-step clock, no FPS or phone claim',limits:['Bell & Alder full species/input matrix not repeated in this bounded H15 correction','Only selected offset/magnitude combinations repeated in browser; full67provider controls are separate']});}
 catch(error){if(active)active.status='failed';save('acceptance.json',{pass:false,error:error.stack,finding:error.finding,current,matrix,visits,negatives,unrun,barrelGlances});try{save('first-failure-input-events.json',await page.evaluate(()=>qa.inputEvents));await capture('failure',{error:String(error)});}catch{}throw error;}
 finally{try{await stop('final-release');await page.evaluate(()=>qa.app.dispose());}catch{}save('matrix.json',matrix);}
},{output,lifetimeMs:1200000,purpose:'M28 one20minute absolute-expiry actual-input H15 regression/native traversal review; stop first unexpected failure; no performance benchmark'});
