import assert from 'node:assert/strict';
import {withReviewBrowser} from './review-browser.mjs';
const stats=values=>{const a=[...values].sort((x,y)=>x-y);return {count:a.length,mean:a.reduce((x,y)=>x+y,0)/(a.length||1),p95:a[Math.floor((a.length-1)*.95)]??0,max:a.at(-1)??0};};
await withReviewBrowser(async({page,origin,save,errors})=>{
  const navigationStarted=performance.now();
  await page.goto(origin+'/candidate/workbenches/furnished-house/index.html');
  await page.waitForFunction(()=>window.__furnished?.ready||document.querySelector('#fatal')?.textContent,{timeout:90000});
  assert.equal(await page.locator('#fatal').textContent(),'');
  const navigationToReadyMs=performance.now()-navigationStarted;
  const hardware=await page.evaluate(()=>{
    const api=window.__furnished,coldInitialization=api.diagnostics().costMs.initialization;api.pause();api.setAutoRender(false);api.runReplay('kitchen',{play:false});
    api.setView('exterior',0);api.setCamera({verticalSpan:12.6,offset:[10,14,-12],target:[5,0,5]});
    const gl=api.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
    const gpu=[],pending=[],render=api.renderer.render.bind(api.renderer);let measuring=false;
    api.renderer.render=(scene,camera)=>{
      const query=measuring&&ext?gl.createQuery():null;if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
      try{return render(scene,camera);}finally{if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(query);}}
    };
    const poll=()=>{
      if(ext&&gl.getParameter(ext.GPU_DISJOINT_EXT)){for(const q of pending)gl.deleteQuery(q);pending.length=0;throw Error('Disjoint GPU timing window.');}
      while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=pending.shift();gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
    };
    window.__qaCost={tick:0,
      advanceTo(time){while(this.tick<time*30){const n=Math.min(30,time*30-this.tick);api.advanceTicks(n);this.tick+=n;}return api.diagnostics();},
      async sample(count){
        const sim=[],presentation=[],renderCpu=[],debugApi=[];let previous=api.diagnostics().costMs;
        const last=(a,b)=>b.mean*b.samples-a.mean*a.samples;
        measuring=true;
        try{for(let i=0;i<count;i++){
          const before=performance.now(),d=api.advanceTicks(1),elapsed=performance.now()-before;this.tick++;
          sim.push(last(previous.simulation,d.costMs.simulation));presentation.push(last(previous.presentation,d.costMs.presentation));renderCpu.push(last(previous.render,d.costMs.render));debugApi.push(elapsed);
          previous=d.costMs;await new Promise(requestAnimationFrame);poll();
        }}finally{measuring=false;}
        for(let i=0;pending.length&&i<60;i++){await new Promise(requestAnimationFrame);poll();}
        if(pending.length)throw Error('GPU queries did not complete.');
        return {sim,presentation,renderCpu,debugApi,gpu:gpu.splice(0),diagnostics:api.diagnostics()};
      },dispose(){for(const q of pending)gl.deleteQuery(q);api.renderer.render=render;api.dispose();}
    };
    return {renderer:String(gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER)),timerQuery:!!ext,
      toneMapping:api.renderer.toneMapping,exposure:api.renderer.toneMappingExposure,cameraType:api.camera.type,verticalSpan:api.camera.top-api.camera.bottom,
      coldInitializationMs:coldInitialization,resetCompilationMs:api.diagnostics().costMs.initialization,viewport:[api.canvas.width,api.canvas.height],userAgent:navigator.userAgent};
  });
  const runs=[];
  for(const time of [5,30,75,120,170,240]){
    const before=await page.evaluate(t=>window.__qaCost.advanceTo(t),time);
    const sample=await page.evaluate(()=>window.__qaCost.sample(120));
    runs.push({startTime:time,simulationMs:stats(sample.sim),presentationCpuMs:stats(sample.presentation),renderCpuMs:stats(sample.renderCpu),
      coreFrameCpuMs:stats(sample.sim.map((s,i)=>s+sample.presentation[i]+sample.renderCpu[i])),apiFrameTotalMs:stats(sample.debugApi),
      reportingAndOtherCpuMs:stats(sample.debugApi.map((s,i)=>Math.max(0,s-sample.sim[i]-sample.presentation[i]-sample.renderCpu[i]))),gpuMs:stats(sample.gpu),
      before:{worldTime:before.metrics.worldTime,burning:before.metrics.burningCount,active:before.metrics.activeCells},diagnostics:sample.diagnostics});
    save('timings.json',{hardware,navigationToReadyMs,runs});console.log(JSON.stringify({time,simulation:runs.at(-1).simulationMs,presentation:runs.at(-1).presentationCpuMs,gpu:runs.at(-1).gpuMs,draws:sample.diagnostics.renderer.calls}));
  }
  await page.evaluate(()=>window.__qaCost.dispose());assert.deepEqual(errors,[]);return {hardware,runs};
},{suffix:'candidate-cost',lifetimeMs:900000});
