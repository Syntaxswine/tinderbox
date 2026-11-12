import assert from 'node:assert/strict';
import path from 'node:path';
import {withReviewBrowser} from './review-browser.mjs';
import {beginFixedVideo} from './fixed-video.mjs';

const replay=process.argv[2]||'kitchen',end=Number(process.argv[3]||330),speed=Number(process.argv[4]||4);
assert.ok(['kitchen','bedroom'].includes(replay));
await withReviewBrowser(async({page,origin,output,save,allowPreview,errors})=>{
  await page.goto(origin+'/candidate/workbenches/furnished-house/index.html');
  await page.waitForFunction(()=>window.__furnished?.ready||document.querySelector('#fatal')?.textContent,{timeout:90000});
  assert.equal(await page.locator('#fatal').textContent(),'');
  await page.evaluate(({replay,speed})=>{
    const api=window.__furnished;api.pause();api.setAutoRender(false);
    if(!api.camera.isOrthographicCamera)throw Error('Normal game-scale orthographic camera is required.');
    api.setCamera({verticalSpan:12.6,offset:[10,14,-12],target:[5,1.5,5]});
    document.querySelector('aside').style.display='none';document.querySelector('.mobile').style.display='none';
    const caption=document.createElement('p');caption.id='qa-caption';caption.hidden=true;document.body.append(caption);
    document.querySelector('#speed').value=String(speed);document.querySelector('#speed').dispatchEvent(new Event('change'));
    api.runReplay(replay,{play:false});api.setView('exterior',0);
    caption.textContent='0.0 world seconds · Exterior · ambient wind control';
  },{replay,speed});
  const file=path.join(output,replay+'-night-replay.mp4');
  const stages=[];
  await page.exposeFunction('__qaReplayProgress',async progress=>{
    stages.push(progress);save('progress.json',progress);save('stages.json',stages);
    await page.screenshot({path:path.join(output,`${replay}-${Math.round(progress.worldSeconds)}-${progress.view.replace(':','-')}.jpg`),type:'jpeg',quality:93});
    console.log(JSON.stringify(progress));
  });
  const capture=await beginFixedVideo(page,{output:file,canvasSelector:'#world',labelSelector:'#qa-caption',
    title:`Tinderbox · ${replay==='kitchen'?'Kitchen':'Bedroom'} ignition · ${speed}× rendered replay`,bitrate:5_000_000});
  const playback=await page.evaluate(async({end,speed})=>{
    const api=window.__furnished,start=performance.now();let tick=0,frames=0,lastView='exterior:0',nextReport=30,maxMissing=0,maxFuelError=0,maxHeatRelativeError=0;
    const views=[[0,'exterior',0],[30,'cutaway',0],[100,'cutaway',1],[145,'cutaway',0],[190,'exterior',0],[230,'cutaway',1],[270,'exterior',0]];
    while(tick<end*30){
      const count=Math.min(speed,end*30-tick);
      const diagnostics=api.advanceTicks(count);tick+=count;frames++;
      maxMissing=Math.max(maxMissing,diagnostics.art.missingSamples);maxFuelError=Math.max(maxFuelError,Math.abs(diagnostics.metrics.fuel.error));maxHeatRelativeError=Math.max(maxHeatRelativeError,Math.abs(diagnostics.metrics.heat.relativeError));
      const time=tick/30,view=views.findLast(v=>v[0]<=time),key=view[1]+':'+view[2];
      if(key!==lastView){api.setView(view[1],view[2]);lastView=key;}
      document.querySelector('#qa-caption').textContent=`${time.toFixed(1)} world seconds · ${view[1]}${view[1]==='cutaway'?' floor '+(view[2]+1):''} · ambient wind control`;
      await window.__qaFixedVideo.frame();
      if(time>=nextReport){await window.__qaReplayProgress({worldSeconds:time,wallSeconds:(performance.now()-start)/1000,view:key,burning:diagnostics.metrics.burningCount,falling:diagnostics.metrics.fallingCount,rubble:diagnostics.art.debris.residue,missingSources:diagnostics.art.missingSamples,visualFlights:diagnostics.art.falls,pendingLanding:diagnostics.art.debris.pendingLanding});nextReport+=30;}
    }
    const wallSeconds=(performance.now()-start)/1000;
    return {worldSeconds:tick/30,playbackSpeed:speed,exportWallSeconds:wallSeconds,exportThroughput:tick/30/wallSeconds,simulationPresentations:frames,maxMissing,maxFuelError,maxHeatRelativeError,diagnostics:api.diagnostics()};
  },{end,speed});
  const recording=await capture.finish();save('recording.json',{configuration:capture.configuration,recording,playback});
  save('input-replay.json',await page.evaluate(()=>window.__furnished.replay()));
  save('final-state.json',await page.evaluate(()=>window.__furnished.snapshot()));
  await page.screenshot({path:path.join(output,'wreck.jpg'),type:'jpeg',quality:93});
  await page.evaluate(()=>window.__furnished.dispose());
  const clipUrl=origin+allowPreview(file);
  const decoded=await page.evaluate(async src=>{
    const video=document.createElement('video');video.muted=true;video.preload='auto';video.src=src;
    await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(Error('Recorded MP4 failed to decode.'));});
    const sampleTimes=[1,Math.min(8,video.duration/2),video.duration/2,Math.max(0,video.duration-1)].filter(Number.isFinite),samples=[];
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=40;const pen=canvas.getContext('2d');
    for(const time of sampleTimes){await new Promise((resolve,reject)=>{video.onseeked=resolve;video.onerror=reject;video.currentTime=time;});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);pen.drawImage(video,0,0,64,40);const pixels=pen.getImageData(0,0,64,40).data;
      let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=pixels[i]+pixels[i+1]+pixels[i+2];samples.push({time,rgbSum:sum});}
    const result={duration:video.duration,width:video.videoWidth,height:video.videoHeight,samples};video.removeAttribute('src');video.load();return result;
  },clipUrl);
  assert.equal(decoded.width,1280);assert.equal(decoded.height,800);assert.ok(decoded.samples.every(s=>s.rgbSum>10000));
  assert.ok(playback.diagnostics.metrics.stats.failures>0,'The recorded replay must include local structural failure.');
  assert.equal(playback.maxMissing,0,'Every supplied active source must remain represented throughout the recording.');
  assert.ok(playback.maxFuelError<1e-7);assert.ok(playback.maxHeatRelativeError<1e-9);
  assert.ok(Math.abs(playback.diagnostics.metrics.fuel.error)<1e-7);assert.ok(Math.abs(playback.diagnostics.metrics.heat.relativeError)<1e-9);
  assert.deepEqual(errors,[]);save('decode-check.json',decoded);
  console.log(JSON.stringify({file,recording,decoded,playback:{...playback,diagnostics:undefined}}));
  return {file,recording,decoded,playback};
},{suffix:replay+'-video',lifetimeMs:900000});
