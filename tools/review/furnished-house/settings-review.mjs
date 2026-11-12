import assert from 'node:assert/strict';
import path from 'node:path';
import {withReviewBrowser} from './review-browser.mjs';

const worldSeconds=Number(process.argv[2]||120),samples=Number(process.argv[3]||40);
const rounds=Number(process.argv[4]||1),stability=process.argv[5]==='stability',warmDraws=rounds>1?12:3;
assert.ok(worldSeconds>=5&&worldSeconds<=150);
assert.ok(Number.isInteger(samples)&&samples>=20&&samples<=120);
assert.ok(Number.isInteger(rounds)&&rounds>=1&&rounds<=3);
const all={flames:true,smoke:true,lighting:true};
const masks=[all,{flames:true,smoke:false,lighting:true},{flames:false,smoke:true,lighting:true},
  {flames:true,smoke:true,lighting:false},{flames:true,smoke:false,lighting:false},
  {flames:false,smoke:true,lighting:false},{flames:false,smoke:false,lighting:true},
  {flames:false,smoke:false,lighting:false}];
const cases=[...masks.map(effects=>({effects,lightingMode:'local'})),{effects:all,lightingMode:'building'},
  {effects:{flames:false,smoke:false,lighting:true},lightingMode:'building'}];
const selected=stability?cases.filter((c,i)=>[0,1,3,6,8,9].includes(i)):cases;
const schedule=Array.from({length:rounds},(_,round)=>(round%2?[...selected].reverse():selected).map(c=>({...c,round:round+1}))).flat();
const statistics=values=>{const sorted=[...values].sort((a,b)=>a-b);return {count:sorted.length,
  mean:sorted.reduce((a,b)=>a+b,0)/(sorted.length||1),p95:sorted[Math.floor((sorted.length-1)*.95)]??0,max:sorted.at(-1)??0};};

await withReviewBrowser(async({page,context,origin,output,save,errors})=>{
  const url=origin+'/candidate/workbenches/furnished-house/index.html';
  const ready=async target=>{
    await target.waitForFunction(()=>window.__furnished?.ready||document.querySelector('#fatal')?.textContent,{timeout:90000});
    assert.equal(await target.locator('#fatal').textContent(),'');
    await target.evaluate(()=>{window.__furnished.pause();window.__furnished.setAutoRender(false);});
  };
  await page.goto(url);await ready(page);
  assert.deepEqual(await page.evaluate(()=>window.__furnished.effects()),all);
  assert.equal(await page.evaluate(()=>window.__furnished.lightingMode()),'local');
  for(const label of ['Flames','Smoke','Fire lighting'])assert.equal(await page.getByLabel(label,{exact:true}).isChecked(),true);
  const initialTick=await page.evaluate(()=>window.__furnished.snapshot().tick);
  await page.getByLabel('Smoke',{exact:true}).focus();await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>window.__furnished.effects().smoke),false);
  assert.equal(await page.evaluate(()=>window.__furnished.snapshot().tick),initialTick);
  await page.reload();await ready(page);
  assert.deepEqual(await page.evaluate(()=>window.__furnished.effects()),{...all,smoke:false});
  await page.evaluate(()=>window.__furnished.reset());
  assert.equal(await page.getByLabel('Smoke',{exact:true}).isChecked(),false);
  await page.evaluate(value=>window.__furnished.setEffects(value),all);
  await page.screenshot({path:path.join(output,'settings-controls.jpg'),type:'jpeg',quality:93});

  const blocked=await context.newPage();
  try{
    await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Review control','SecurityError');}});});
    await blocked.goto(url);await ready(blocked);
    await blocked.getByLabel('Flames',{exact:true}).uncheck();
    assert.deepEqual(await blocked.evaluate(()=>window.__furnished.effects()),{...all,flames:false});
  }finally{await blocked.evaluate(()=>window.__furnished?.dispose());await blocked.close();}

  const touchContext=await context.browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  try{
    const touch=await touchContext.newPage();await touch.goto(url);await ready(touch);
    const smoke=touch.getByLabel('Smoke',{exact:true});await smoke.tap();assert.equal(await smoke.isChecked(),false);
    assert.deepEqual(await touch.evaluate(()=>window.__furnished.effects()),{...all,smoke:false});
    assert.equal(await touch.evaluate(()=>window.__furnished.snapshot().tick),0);
    await smoke.tap();assert.equal(await smoke.isChecked(),true);
    await touch.locator('#fire-effect-settings').scrollIntoViewIfNeeded();
    await touch.screenshot({path:path.join(output,'settings-touch.jpg'),type:'jpeg',quality:93});
    await touch.evaluate(()=>window.__furnished.dispose());
  }finally{await touchContext.close();}
  await page.bringToFront();

  await page.goto(url+'?lighting=building');await ready(page);
  assert.equal(await page.evaluate(()=>window.__furnished.lightingMode()),'building');
  await page.evaluate(()=>window.__furnished.reset());
  assert.equal(await page.evaluate(()=>window.__furnished.lightingMode()),'building');
  await page.evaluate(()=>window.__furnished.setLightingMode('local'));

  await page.evaluate(()=>{
    const api=window.__furnished;api.runReplay('kitchen',{play:false});api.setAutoRender(false);
    api.setView('exterior',0);api.setCamera({verticalSpan:12.6,offset:[10,14,-12],target:[5,1.5,5]});
    document.querySelector('aside').style.display='none';document.querySelector('.mobile').style.display='none';
    const caption=document.createElement('div');caption.id='effects-review-caption';
    Object.assign(caption.style,{position:'fixed',bottom:'0',left:'0',right:'0',padding:'10px 16px',background:'#211912',color:'#f3dfb7',font:'16px Georgia,serif'});
    document.body.append(caption);
  });
  for(let tick=0;tick<worldSeconds*30;tick+=30){
    await page.evaluate(n=>window.__furnished.advanceTicks(n),Math.min(30,worldSeconds*30-tick));
    if(tick%900===0)console.log(JSON.stringify({preparingWorldSeconds:(tick+30)/30}));
  }
  const hardware=await page.evaluate(()=>{
    const api=window.__furnished,gl=api.renderer.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
    let enabled=false;const gpu=[],pending=[],render=api.renderer.render.bind(api.renderer);
    api.renderer.render=(...args)=>{const q=enabled&&timer?gl.createQuery():null;if(q)gl.beginQuery(timer.TIME_ELAPSED_EXT,q);try{return render(...args);}finally{if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push(q);}}};
    const digest=async value=>{const bytes=new TextEncoder().encode(JSON.stringify(value)),hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');};
    const poll=()=>{
      if(timer&&gl.getParameter(timer.GPU_DISJOINT_EXT))throw Error('Disjoint GPU timing window');
      while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=pending.shift();gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
    };
    window.__effectReview={digest:()=>digest(api.snapshot()),async sample(count){
      const cpu=[];enabled=true;
      try{for(let i=0;i<count;i++){const before=performance.now();api.draw();cpu.push(performance.now()-before);await new Promise(requestAnimationFrame);poll();}}
      finally{enabled=false;}
      for(let i=0;pending.length&&i<120;i++){await new Promise(requestAnimationFrame);poll();}
      if(pending.length)throw Error('Unfinished GPU query window');
      if(timer&&gpu.length!==count)throw Error('GPU sample count mismatch');
      return {cpu,gpu:gpu.splice(0),diagnostics:api.diagnostics()};
    },dispose(){for(const q of pending)gl.deleteQuery(q);api.renderer.render=render;}};
    return {renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),timerQuery:!!timer,
      contextAttributes:gl.getContextAttributes(),viewport:[api.canvas.width,api.canvas.height],span:api.camera.top-api.camera.bottom,
      exposure:api.renderer.toneMappingExposure,toneMapping:api.renderer.toneMapping};
  });
  const before=await page.evaluate(()=>window.__effectReview.digest()),tick=await page.evaluate(()=>window.__furnished.snapshot().tick),runs=[],referenceLights=new Map();
  for(const {effects,lightingMode,round}of schedule){
    const label=(rounds>1?'round'+round+'_':'')+lightingMode+'_'+Object.entries(effects).map(([key,value])=>key+'-'+(value?'on':'off')).join('_');
    await page.evaluate(({effects,lightingMode,warmDraws})=>{
      const api=window.__furnished;api.setLightingMode(lightingMode);api.setEffects(effects);for(let i=0;i<warmDraws;i++)api.draw();
      document.querySelector('#effects-review-caption').textContent=lightingMode+' lighting · '+Object.entries(effects).map(([key,on])=>key+': '+(on?'on':'off')).join(' · ')+' · paused visual comparison';
    },{effects,lightingMode,warmDraws});
    for(const [key,label]of [['flames','Flames'],['smoke','Smoke'],['lighting','Fire lighting']])assert.equal(await page.getByLabel(label,{exact:true}).isChecked(),effects[key]);
    const measured=await page.evaluate(n=>window.__effectReview.sample(n),samples);
    assert.equal(measured.diagnostics.metrics.tick,tick);assert.equal(measured.diagnostics.art.missingSamples,0);
    const art=measured.diagnostics.art,work=art.effectWork;
    assert.equal(art.lightingMode,lightingMode);
    assert.deepEqual(art.effects,effects);assert.ok(work,'Effect work counters are required');
    assert.equal(work.generatedFlameSplats>0,effects.flames);assert.equal(work.generatedSmokeSplats>0,effects.smoke);
    if(!effects.flames){assert.equal(work.work.flameCalls,0);assert.equal(work.work.flameEnvelopeSources,0);}
    if(!effects.smoke)assert.equal(work.work.smokeCalls,0);
    assert.equal(work.activeLights>0,effects.lighting);assert.ok(art.actualLights.length<=6);
    assert.ok(art.actualLights.reduce((sum,l)=>sum+l.intensity,0)<=215+1e-8);
    if(!effects.lighting){assert.equal(work.work.lightClusterCalls,0);assert.equal(art.actualLights.length,0);}
    if(effects.lighting){if(referenceLights.has(lightingMode))assert.deepEqual(art.actualLights,referenceLights.get(lightingMode),'Flame/smoke settings changed enabled lighting');else referenceLights.set(lightingMode,art.actualLights);}
    if(lightingMode==='building'){assert.equal(work.work.lightClusterCalls,0);assert.equal(work.work.buildingAggregateCalls,1);if(!effects.flames&&!effects.smoke)assert.equal(work.work.supportAnchorSources,0);}
    runs.push({effects,lightingMode,round,label,cpuDrawMs:statistics(measured.cpu),gpuMs:statistics(measured.gpu),diagnostics:measured.diagnostics});
    await page.screenshot({path:path.join(output,label+'.jpg'),type:'jpeg',quality:93});
    save('timings.json',{method:'Paused fixed-state draw isolation; includes publication/presentation, render submission and draw HUD work; excludes simulation, diagnostics and encoding. CPU/GPU are separate, not additive frame-rate estimates.',hardware,worldSeconds,samples,rounds,warmDraws,stability,runs});
    console.log(JSON.stringify({effects,lightingMode,round,cpu:runs.at(-1).cpuDrawMs,gpu:runs.at(-1).gpuMs}));
  }
  assert.equal(await page.evaluate(()=>window.__effectReview.digest()),before,'Effect preferences changed physical simulation state');
  await page.evaluate(value=>{window.__furnished.setEffects(value);window.__furnished.setLightingMode('local');},all);
  const baseline=await page.evaluate(()=>window.__furnished.diagnostics());
  await page.evaluate(()=>window.__furnished.setCamera({verticalSpan:12.6,offset:[10,14,-12],target:[1000,1.5,1000]}));
  const away=await page.evaluate(()=>window.__furnished.diagnostics());save('camera-away.json',away);
  assert.equal(away.art.effectWork.generatedFlameSplats,0);assert.equal(away.art.effectWork.generatedSmokeSplats,0);
  assert.ok(away.art.effectWork.cameraCulledSources>0,'Off-camera sources were not rejected early');
  await page.evaluate(()=>window.__furnished.setCamera({verticalSpan:12.6,offset:[10,14,-12],target:[5,1.5,5]}));
  const returned=await page.evaluate(()=>window.__furnished.diagnostics());
  assert.equal(returned.art.missingSamples,0);assert.equal(returned.metrics.tick,tick);
  assert.equal(await page.evaluate(()=>window.__effectReview.digest()),before,'Camera visibility changed physical simulation state');
  save('camera-return.json',{baseline,away,returned});
  await page.evaluate(()=>{document.querySelector('#effects-review-caption').hidden=true;});
  for(const level of [0,1]){
    await page.evaluate(level=>window.__furnished.setView('cutaway',level),level);
    assert.equal((await page.evaluate(()=>window.__furnished.diagnostics())).art.missingSamples,0);
    await page.screenshot({path:path.join(output,'cutaway-'+level+'.jpg'),type:'jpeg',quality:93});
  }
  const beforeHidden=await page.evaluate(()=>window.__furnished.snapshot().metrics);
  await page.evaluate(()=>{const api=window.__furnished;api.setEffects({flames:false,smoke:false,lighting:false});api.setCamera({verticalSpan:12.6,offset:[10,14,-12],target:[1000,1.5,1000]});api.advanceTicks(30);});
  const afterHidden=await page.evaluate(()=>window.__furnished.snapshot().metrics);
  assert.equal(afterHidden.tick,beforeHidden.tick+30);assert.ok(afterHidden.fuel.burned>beforeHidden.fuel.burned,'Disabling/hiding art stopped combustion');
  await page.evaluate(value=>{const api=window.__furnished;api.setEffects(value);api.setCamera({verticalSpan:12.6,offset:[10,14,-12],target:[5,1.5,5]});},all);
  const restored=await page.evaluate(()=>window.__furnished.diagnostics());assert.equal(restored.metrics.tick,afterHidden.tick);assert.equal(restored.art.missingSamples,0);
  save('hidden-progress.json',{beforeHidden,afterHidden,restored});
  await page.evaluate(()=>{document.querySelector('aside').style.display='';document.querySelector('.mobile').style.display='';});
  await page.locator('#fire-effect-settings').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,'settings-on-fire.jpg'),type:'jpeg',quality:93});
  await page.evaluate(()=>{window.__effectReview.dispose();window.__furnished.dispose();});
  assert.deepEqual(errors,[]);
  save('acceptance.json',{allEightCombinations:!stability,stability,rounds,caseCount:schedule.length,keyboard:true,touch:true,buildingModeQueryAndReset:true,refreshPersistence:true,resetPreservesPreferences:true,unavailableStorage:true,physicalStateSha256:before,physicalStateUnchanged:true,hardware,worldSeconds,samples,errors});
  return {hardware,worldSeconds,samples,rounds,stability,runs};
},{suffix:'effect-settings',lifetimeMs:900000});
