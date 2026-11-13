import * as T from '../../src/runtime/three.js';
import {mountUI} from '../../src/ui/index.js';
import {createStreetNight} from '../../src/art/street-night.js';
import {createSandboxRuntime} from './runtime.js';
import {composeSandbox} from './compose.js';
import {createClosingReplay} from '../bell-and-alder-closing/replays.js';
import {createClosingAudio} from '../bell-and-alder-closing/audio.js';
import {createEffectPreferences} from '../furnished-house/effect-preferences.js';
import {mountEffectControls} from '../furnished-house/effect-controls.js';
const $=id=>document.getElementById(id),canvas=$('world'),params=new URLSearchParams(location.search),graybox=false,effects=createEffectPreferences();
let renderer,world,camera,art,sim,director,audio,ui,night,raf=0,disposed=false,auto=true,lastNow=null,lastTick=-1,lastGeneration=-1,lastFrame,viewMode='auto',level=0,speed=1,data,unmountEffects,unsubscribe;
let cachedPlayback=false,cachedUi=null,manifest,instances,initializationMs;
const lifecycle=new AbortController();
const timing={simulation:[],publication:[],presentation:[],render:[]},errors=[],target=new T.Vector3(),fixedTarget=new T.Vector3(),offset=new T.Vector3(10,14,12);let span=16,fixedSpan=16,followPlayer=true;
const timed=(key,fn)=>{const start=performance.now(),value=fn();timing[key].push(performance.now()-start);if(timing[key].length>18000)timing[key].shift();return value;};
function cameraPose(){
  if(!cachedPlayback&&director?.state().mode==='manual'&&followPlayer){target.set(sim.player.x,sim.player.elevation+.8,sim.player.y);const top=document.querySelector('#hud .tb-console')?.getBoundingClientRect().top??innerHeight;camera.setViewOffset(innerWidth,innerHeight,0,Math.max(0,(innerHeight-top)/2),innerWidth,innerHeight);}
  else{target.copy(fixedTarget);camera.clearViewOffset();}
  camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;cameraPose();}
function project(anchor){const p=new T.Vector3(...anchor).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,visible:p.z>=-1&&p.z<=1};}
const statistics=values=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,mean:values.reduce((a,b)=>a+b,0)/(values.length||1),p95:sorted[Math.floor(sorted.length*.95)]||0,max:sorted.at(-1)||0};};
function diagnostics(){const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');return {version:1,initializationMs,worldTime:cachedPlayback?lastFrame.worldTime:sim.worldTime,presentationFromRecordedState:cachedPlayback,replay:cachedPlayback?lastFrame.closingTime.replay:director.state(),effects:effects.snapshot(),audio:audio.diagnostics(),ownership:sim.ownership(),costMs:Object.fromEntries(Object.entries(timing).map(([k,v])=>[k,statistics(v)])),renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,description:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)},art:art.diagnostics(),metrics:cachedPlayback?lastFrame.metrics:sim.metrics(),camera:{position:camera.position.toArray(),target:target.toArray(),span,exposure:renderer.toneMappingExposure},graybox,errors:[...errors]};}
function uiSnapshot(raw=sim.snapshot()){const min=data.closingTime.bounds.min,max=data.closingTime.bounds.max;return {...raw,player:{...raw.player,x:raw.player.x-min[0],y:raw.player.y-min[2]},world:{...raw.world,width:max[0]-min[0],height:max[2]-min[2],obstacles:raw.world.obstacles.map(b=>({...b,x:b.x-min[0],y:b.y-min[2]}))},cells:raw.cells.map(c=>({...c,x:c.x-min[0],y:c.y-min[2]}))};}
function present(frame,uiState,{paused=false,render=true}={}){const p=frame.closingTime.actors.find(a=>a.role==='player');timed('presentation',()=>{art.update(frame,{mode:viewMode,level,camera,observer:{x:p.position[0],y:p.position[1],z:p.position[2],height:p.height},effects:effects.snapshot(),lightingMode:'building',sampleWind:sim.trial.wind,windMetadata:sim.trial.windMetadata});audio.consume(frame,{paused});ui.update(uiSnapshot(uiState));});if(render)timed('render',()=>renderer.render(world,camera));}
function retained(frame){return {...frame,full:false,boundaries:[],supports:[],items:[],parts:[],rubble:[],falls:[],events:[],tombstones:[],closingTime:{...frame.closingTime,events:[]}};}
function draw({full=false}={}){if(disposed)return;cameraPose();if(cachedPlayback){present(retained(lastFrame),cachedUi);return;}const generation=sim.generation,changed=full||sim.tick!==lastTick||generation!==lastGeneration;
  if(changed){lastFrame=timed('publication',()=>sim.frame({full:full||generation!==lastGeneration}));lastTick=sim.tick;lastGeneration=generation;}
  const frame=changed?lastFrame:retained(lastFrame);
  present(frame,timed('publication',()=>sim.snapshot()),{paused:sim.paused||director.state().complete});
  $('clock').textContent=`${sim.worldTime.toFixed(2)} s · ${speed}×${sim.paused?' · paused':''}`;const state=director.state();$('status').textContent=(graybox?'TEMPORARY GRAYBOX · ':'')+state.mode+' · '+(state.failed||state.stage)+(state.complete?' · complete':'');if($('metrics').parentElement.open)$('metrics').textContent=JSON.stringify(diagnostics(),null,1);
}
function loop(now){if(disposed||!auto)return;const dt=lastNow===null?0:Math.max(0,(now-lastNow)/1000);lastNow=now;timed('simulation',()=>director.advance(dt*speed));draw();raf=requestAnimationFrame(loop);}
function replay(mode){cachedPlayback=false;cachedUi=null;followPlayer=true;if(mode!=='manual')span=fixedSpan;director=createClosingReplay(sim,data,{mode});audio.reset();lastTick=-1;lastGeneration=-1;lastNow=null;resize();draw({full:true});return director.state();}
function dispatch(command){if(command.type==='reset'){replay('manual');sim.command({type:'reset'});lastTick=-1;audio.reset();draw({full:true});return;}if(!['pause','cancel-input'].includes(command.type)&&director.state().mode!=='manual')director.cancel();sim.command(command);if(command.type==='pause')draw();}
async function initialize(){const started=performance.now();renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;world=new T.Scene();night=createStreetNight(T,world,renderer);world.add(night.root);camera=new T.OrthographicCamera(-10,10,8,-8,.05,150);
  const moon=night.root.children.find(l=>l.isDirectionalLight);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.2,far:70});moon.shadow.camera.updateProjectionMatrix();moon.shadow.normalBias=.018;moon.target.position.set(4,1,7);world.add(moon.target);renderer.toneMapping=T.NoToneMapping;
  const manifestUrl=new URL('./scene-data.json',import.meta.url),load=async url=>{const r=await fetch(url,{signal:lifecycle.signal});if(!r.ok)throw Error('Pinned sandbox source unavailable: '+url+' HTTP '+r.status);return r.json();};manifest=await load(manifestUrl);const sources=new Map(await Promise.all([...new Set(manifest.instances.map(i=>i.source))].map(async source=>[source,await load(new URL(source,manifestUrl))])));({data,instances}=composeSandbox(manifest,sources));sim=createSandboxRuntime(data,{characterId:params.get('character')||'goat'});audio=createClosingAudio({seed:1893,palette:data.closingTime.soundPalette});director=createClosingReplay(sim,data,{mode:'manual'});
  const config=data.closingTime.camera||{};fixedTarget.fromArray(config.target||[4,1.2,5]);target.copy(fixedTarget);offset.fromArray(config.offset||[10,14,12]);span=config.span||16;fixedSpan=span;renderer.toneMappingExposure=config.exposure||1;
  art=await(await import(new URL('./art.js',import.meta.url).href)).createSandboxArt(T,{renderer,data,instances,signal:lifecycle.signal});world.add(art.root);ui=mountUI({root:$('hud'),onCommand:dispatch,onZoom:factor=>{span=Math.max(10,Math.min(48,span/factor));resize();draw();},onProjectInteraction:project});unmountEffects=mountEffectControls({root:$('effects'),preferences:effects});unsubscribe=effects.subscribe(()=>draw());resize();
  $('quiet').onclick=()=>{audio.start().catch(e=>errors.push(String(e)));replay('quiet');};$('reset').onclick=()=>dispatch({type:'reset'});$('play').onclick=()=>{sim.command({type:'pause',paused:!sim.paused});draw();};$('speed').onchange=()=>{speed=Number($('speed').value);sim.setReplay({speed});};$('view').onchange=()=>{viewMode=$('view').value;draw();};$('level').onchange=()=>{level=Number($('level').value);draw();};$('audio').onclick=()=>audio.start().then(ok=>$('audio').textContent=ok?'Sound enabled':'Audio unavailable');$('mute').onchange=()=>audio.setMuted($('mute').checked);
  $('export').onclick=()=>{const blob=new Blob([JSON.stringify({inputs:sim.replay(),diagnostics:diagnostics()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bell-and-alder-sandbox-session.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const aim=event=>{const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObject(art.root,true).find(h=>{for(let p=h.object;p;p=p.parent)if(!p.visible)return false;return h.object.material?.visible!==false;});if(hit)dispatch({type:'aim',position:hit.point.toArray()});};canvas.onpointerdown=e=>{if(e.button===0)aim(e);};addEventListener('resize',resize,{signal:lifecycle.signal});addEventListener('blur',()=>{sim.command({type:'cancel-input'});sim.command({type:'pause',paused:true});draw();},{signal:lifecycle.signal});
  const api={
    version:1,ready:true,data,instances,manifest,runtime:sim,renderer,camera,canvas,scene:world,replay,dispatch,draw,diagnostics,
    snapshot:()=>sim.snapshot({thermal:true}),inputs:()=>sim.replay(),frame:()=>lastFrame,audio,art,
    setAutoRender(value){auto=!!value;cancelAnimationFrame(raf);lastNow=null;if(auto&&!disposed)raf=requestAnimationFrame(loop);},
    step(count=1,{present=true}={}){timed('simulation',()=>director.step(count));if(present)draw();return diagnostics();},
    setCamera(value){if(value.target){fixedTarget.fromArray(value.target);followPlayer=false;}if(value.offset)offset.fromArray(value.offset);if(value.span)span=value.span;resize();draw();},
    setView(mode,nextLevel=level){viewMode=mode;level=nextLevel;draw();},
    setEffects:patch=>effects.set(patch),
    setSpeed(value){speed=value;$('speed').value=String(value);sim.setReplay({speed});},
    loadPresentationFrame(frame,uiState,{render=true}={}){
      if(!uiState)throw Error('Recorded HUD snapshot is required');const entering=!cachedPlayback;cachedPlayback=true;if(entering){span=fixedSpan;resize();}cachedUi=uiState;lastFrame=frame;lastTick=frame.tick;lastGeneration=frame.closingTime.generation;present(frame,uiState,{render});
      $('clock').textContent=`${frame.worldTime.toFixed(2)} s · ${speed}×`;$('status').textContent=`Recorded ${frame.closingTime.replay.id} · ${viewMode==='cutaway'?'CUTAWAY INSERT':'fixed exterior'} · ${frame.closingTime.resident.state}`;
    },
    async dispose(){
      if(disposed)return;disposed=true;lifecycle.abort();cancelAnimationFrame(raf);canvas.onpointerdown=null;for(const id of ['reset','quiet','play','audio','export'])$(id).onclick=null;for(const id of ['speed','view','level','mute'])$(id).onchange=null;
      unmountEffects?.();unsubscribe?.();effects.dispose();ui.dispose();sim.dispose();art.dispose();night.dispose();await audio.dispose();renderer.dispose();renderer.forceContextLoss();
    }
  };
  initializationMs=performance.now()-started;window.__sandbox=api;draw({full:true});raf=requestAnimationFrame(loop);addEventListener('pagehide',()=>api.dispose(),{once:true,signal:lifecycle.signal});
}
initialize().catch(e=>{errors.push(String(e.stack||e));$('fatal').textContent=String(e);console.error(e);lifecycle.abort();cancelAnimationFrame(raf);unmountEffects?.();unsubscribe?.();ui?.dispose();sim?.dispose();art?.dispose();night?.dispose();audio?.dispose();renderer?.dispose();renderer?.forceContextLoss();});
