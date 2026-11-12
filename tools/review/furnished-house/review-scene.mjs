import assert from 'node:assert/strict';
import path from 'node:path';
import {withReviewBrowser} from './review-browser.mjs';

const end=Number(process.argv[2]||330);
await withReviewBrowser(async({page,origin,output,save,errors})=>{
  await page.goto(origin+'/candidate/workbenches/furnished-house/index.html');
  await page.waitForFunction(()=>window.__furnished?.ready||document.querySelector('#fatal')?.textContent,{timeout:90000});
  const fatal=await page.locator('#fatal').textContent();assert.equal(fatal,'');
  await page.evaluate(()=>{
    const api=window.__furnished;api.pause();api.setAutoRender?.(false);
    if(!api.camera.isOrthographicCamera)throw Error('Normal game-scale orthographic camera is required.');
    api.setCamera({verticalSpan:12.6,offset:[10,14,-12],target:[5,1.5,5]});
    document.querySelector('aside').style.display='none';document.querySelector('.mobile').style.display='none';
    window.__qaCaption=document.createElement('p');window.__qaCaption.id='qa-caption';window.__qaCaption.hidden=true;document.body.append(window.__qaCaption);
    api.runReplay('kitchen',{play:false});api.setView('exterior',0);
  });
  const frames=[];
  for(const time of [0,10,30,60,120,154,170,210,270,330].filter(t=>t<=end)){
    const current=await page.evaluate(()=>window.__furnished.snapshot().tick);
    const count=Math.round(time*30)-current;assert.ok(count>=0);
    for(let ticks=0;ticks<count;ticks+=30)await page.evaluate(n=>window.__furnished.advanceTicks(n),Math.min(30,count-ticks));
    const stage={time,views:[]};
    for(const [mode,level]of [['exterior',0],['cutaway',0],['cutaway',1]]){
      await page.evaluate(({mode,level})=>window.__furnished.setView(mode,level),{mode,level});
      await page.screenshot({path:path.join(output,`kitchen-${String(time).padStart(3,'0')}-${mode}-${level}.jpg`),type:'jpeg',quality:93});
      const diagnostics=await page.evaluate(()=>window.__furnished.diagnostics());
      assert.deepEqual(diagnostics.errors,[]);assert.ok(Math.abs(diagnostics.metrics.fuel.error)<1e-7);
      assert.ok(Math.abs(diagnostics.metrics.heat.relativeError)<1e-9);
      stage.views.push({mode,level,diagnostics});
    }
    frames.push(stage);save('frames.json',frames);
    console.log(JSON.stringify({time,burning:stage.views[0].diagnostics.metrics.burningCount,
      falling:stage.views[0].diagnostics.metrics.fallingCount,draws:stage.views[0].diagnostics.renderer.calls}));
  }
  const state=await page.evaluate(()=>window.__furnished.snapshot());save('final-state.json',state);
  const replay=await page.evaluate(()=>window.__furnished.replay());save('input-replay.json',replay);
  await page.evaluate(()=>window.__furnished.dispose());assert.deepEqual(errors,[]);
  return {end,frames:frames.map(f=>({time:f.time,metrics:f.views[0].diagnostics.metrics}))};
},{suffix:'scene-review',lifetimeMs:900000});
