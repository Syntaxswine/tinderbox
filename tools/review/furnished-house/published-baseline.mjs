import assert from 'node:assert/strict';
import path from 'node:path';
import {withReviewBrowser} from './review-browser.mjs';
const stats=values=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return {count:values.length,mean:values.reduce((a,b)=>a+b,0)/(values.length||1),p95:sorted[Math.floor((sorted.length-1)*.95)]??0,max:sorted.at(-1)??0};
};
await withReviewBrowser(async({page,origin,output,save,errors})=>{
  const navigationStarted=performance.now();
  await page.goto(origin+'/qa.html');
  await page.evaluate(async()=>{
    const init=performance.now();
    const link=document.createElement('link');link.rel='stylesheet';link.href='/baseline/src/app.css';document.head.append(link);
    const html=await(await fetch('/baseline/index.html')).text();
    const root=document.importNode(new DOMParser().parseFromString(html,'text/html').querySelector('#game'),true);
    root.removeAttribute('data-autostart');root.dataset.mode='gameplay';
    root.querySelector('#title-screen').hidden=root.querySelector('#main-menu').hidden=true;document.body.append(root);
    const style=document.createElement('style');style.textContent='#viewport{position:fixed;inset:0;width:100vw;height:100vh}#hud{display:none}';document.head.append(style);
    const T=await import('/baseline/src/runtime/three.js');
    const {createRuntime}=await import('/baseline/src/runtime/index.js');
    const {createArtScene}=await import('/baseline/src/art/index.js');
    let renderer,gl,ext,measuring=false,lastArtMs=0,lastRenderMs=0;
    const pending=[],gpu=[];
    const runtime=await createRuntime({root:root.querySelector('#viewport'),uiRoot:root.querySelector('#hud'),characterId:'goat',autoStart:false,seed:1893,mountUI:()=>({update(){},dispose(){}}),
      createArtScene:async args=>{const art=await createArtScene(args),update=art.update.bind(art);art.update=(...values)=>{const start=performance.now();try{return update(...values);}finally{lastArtMs=performance.now()-start;}};return art;},
      rendererFactory:()=>{renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});gl=renderer.getContext();ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');const render=renderer.render.bind(renderer);renderer.render=(...args)=>{const start=performance.now(),q=measuring&&ext?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);try{return render(...args);}finally{if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}lastRenderMs=performance.now()-start;}};return renderer;},
      scenario:{id:'neighborhood',width:22,height:22,patches:[],actors:[],obstacles:[],
        camera:{followPlayer:true,span:12,phoneSpan:10,followOffset:[5.6,-1.5]},
        buildings:[{id:'furnished-hopkins15',prefabId:'hopkins-4-15',x:5,y:5,quarterTurns:0}],
        player:{x:4.4,y:11.5,heading:Math.PI/2,tool:'matches'}},
      config:{input:{cameraRelative:false,cameraY:-12},fire:{damagePerSecond:0},events:{capacity:2048}}});
    const initMs=performance.now()-init;
    runtime.dispatch({type:'pause',paused:false});runtime.dispatch({type:'aim',x:5.05,y:11.5});
    runtime.dispatch({type:'primary',pressed:true});runtime.advance(1/60);runtime.dispatch({type:'primary',pressed:false});
    window.__baseline={runtime,renderer,gl,ext,initMs,pending,gpu,disjoint:0,
      summary(){const s=runtime.snapshot(),m=runtime.metrics(),a=runtime.artDiagnostics();
        return {time:s.clocks.world,camera:m.camera,renderer:m.rendererDescription,drawCalls:m.drawCalls,
          activeFire:s.structureFire.filter(v=>v.flame>0).length,heatSites:s.structureFire.length,firelight:a.firelight};},
      async sample(count){const cpu=[],sim=[],present=[],renderCpu=[],reporting=[];
        const poll=()=>{if(ext&&gl.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint baseline GPU timing window.');while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const p=pending.shift();gpu.push(gl.getQueryParameter(p,gl.QUERY_RESULT)/1e6);gl.deleteQuery(p);}};
        measuring=true;
        try{
        for(let i=0;i<count;i++){
          const start=performance.now();runtime.advance(1/30);const total=performance.now()-start;
          const simulation=runtime.metrics().simulationMs;cpu.push(total);sim.push(simulation);present.push(lastArtMs);renderCpu.push(lastRenderMs);reporting.push(Math.max(0,total-simulation-lastArtMs-lastRenderMs));
          await new Promise(requestAnimationFrame);
          poll();
        }
        }finally{measuring=false;}
        for(let i=0;pending.length&&i<60;i++){await new Promise(requestAnimationFrame);poll();}if(pending.length)throw Error('Unfinished baseline GPU window.');
        if(ext&&gpu.length!==count)throw Error('Baseline GPU sample count mismatch.');
        return {cpu,sim,present,renderCpu,reporting,gpu:gpu.splice(0),disjoint:0,summary:this.summary()};
      },
      advanceTo(time){while(runtime.snapshot().clocks.world+1/120<time)runtime.advance(Math.min(.25,time-runtime.snapshot().clocks.world));return this.summary();},
      dispose(){for(const p of this.pending)gl.deleteQuery(p);runtime.dispose();}
    };
  });
  const navigationToReadyMs=performance.now()-navigationStarted;
  const runs=[];
  for(const time of [5,30,75,120]){
    const before=await page.evaluate(t=>window.__baseline.advanceTo(t),time);
    const sample=await page.evaluate(()=>window.__baseline.sample(120));
    runs.push({startTime:time,before,summary:sample.summary,cpuMs:stats(sample.cpu),simulationMs:stats(sample.sim),
      presentationCpuMs:stats(sample.present),renderCpuMs:stats(sample.renderCpu),reportingAndOtherCpuMs:stats(sample.reporting),
      coreFrameCpuMs:stats(sample.sim.map((s,i)=>s+sample.present[i]+sample.renderCpu[i])),gpuMs:stats(sample.gpu),disjoint:sample.disjoint});
    if(time===30)await page.screenshot({path:path.join(output,'published-one-house.jpg'),type:'jpeg',quality:92});
  }
  const initMs=await page.evaluate(()=>window.__baseline.initMs);
  await page.evaluate(()=>window.__baseline.dispose());
  assert.deepEqual(errors,[]);assert.ok(runs.some(r=>r.summary.activeFire>0),'The published baseline must actually burn.');
  save('timings.json',{publishedCommit:'c855e627bdee963e930644839a60c027a03935de',initMs,navigationToReadyMs,viewport:[1280,800],method:'Production createRuntime/createArtScene with dummy HUD, fixed1/30 world-second advance. Art update and render CPU measured independently; GPU brackets renderer.render only.120 samples per window, bounded query drain, disjoint rejection.',runs});
  console.log(JSON.stringify({initMs,runs}));return {initMs,runs};
},{suffix:'published-baseline',lifetimeMs:360000});
