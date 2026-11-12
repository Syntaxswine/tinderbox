import * as T from '../../src/runtime/three.js';
import {loadCharacterKit} from '../../src/reuse/characters.js';
import {createTrial,createClock,ambientWind,calmWind} from './simulation.js';
import {createNavigation} from './navigation.js';
import {createStreetNight} from '../../src/art/street-night.js';

const $=id=>document.getElementById(id),canvas=$('world'),status=$('status'),timings={simulation:[],presentation:[],render:[],initialization:0};
let renderer,night,art,trial,clock,nav,goat,kit,lastFrame,lastDrawTick=-1,raf=0,disposed=false,autoRender=true,viewMode='exterior',level=0,orbit=Math.atan2(-12,10),tilt=Math.atan2(14,Math.hypot(10,12)),distance=Math.hypot(10,14,12),span=12.6;
const world=new T.Scene(),camera=new T.OrthographicCamera(-10,10,6.3,-6.3,.05,200),target=new T.Vector3(5,0,5),keys=new Set(),errors=[];
world.background=new T.Color(0x101b30);
const notify=text=>status.textContent=text;
const time=(name,fn)=>{const t=performance.now(),value=fn();const list=timings[name];list.push(performance.now()-t);if(list.length>18000)list.shift();return value;};
function cameraPose(){camera.position.set(target.x+Math.cos(orbit)*Math.cos(tilt)*distance,target.y+Math.sin(tilt)*distance,target.z+Math.sin(orbit)*Math.cos(tilt)*distance);camera.lookAt(target);camera.updateMatrixWorld();}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();cameraPose();}
function quantiles(list){const v=[...list].sort((a,b)=>a-b);return {samples:v.length,mean:v.reduce((a,b)=>a+b,0)/(v.length||1),p95:v[Math.floor(v.length*.95)]||0,max:v.at(-1)||0};}
function diagnostics(){return {version:1,metrics:trial.metrics(),clock:clock.diagnostics(),costMs:Object.fromEntries(Object.entries(timings).map(([key,value])=>[key,Array.isArray(value)?quantiles(value):value])),renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},art:art.diagnostics(),observer:nav.snapshot(),errors:[...errors]};}
function draw({full=false}={}) {
  if(disposed)return;
  const start=performance.now(),observer=nav.snapshot();
  if(full||lastDrawTick!==trial.tick){lastFrame=trial.frame({full});lastDrawTick=trial.tick;}
  art.update(lastFrame,{mode:viewMode,level,camera,observer:{x:observer.x,y:observer.elevation,z:observer.y,height:observer.height},sampleWind:trial.wind});
  goat?.update(observer,trial.worldTime,{paused:clock.paused});
  timings.presentation.push(performance.now()-start);if(timings.presentation.length>18000)timings.presentation.shift();
  time('render',()=>renderer.render(world,camera));
  const m=lastFrame.metrics;
  $('metrics').textContent=`World ${m.worldTime.toFixed(2)} s · tick ${m.tick}\n${clock.paused?'Paused':'Playing'} · ${clock.speed}× · backlog ${clock.accumulator.toFixed(3)} s\nBurning ${m.burningCount} · active ${m.activeCells}\nBurned ${(100*m.burnedFraction).toFixed(2)}% · falling ${m.fallingCount}\nFuel error ${m.fuel.error.toExponential(2)}\nHeat error ${m.heat.error.toExponential(2)}\nDraws ${renderer.info.render.calls} · triangles ${renderer.info.render.triangles}\nGoat ${observer.x.toFixed(2)}, ${observer.elevation.toFixed(2)}, ${observer.y.toFixed(2)}`;
  const event=lastFrame.events.at(-1);if(event&&event.id!==draw.lastEvent){draw.lastEvent=event.id;notify(`${event.time.toFixed(2)} s · ${event.type}${event.reason?' · '+event.reason:''}`);}
}
let data;
function reset({wind=$('wind').value}={}) {
  trial?.dispose();const started=performance.now();trial=createTrial(data,{wind:wind==='calm'?calmWind:ambientWind,windMetadata:{kind:wind==='calm'?'calm-control':'ambient-control',speed:wind==='calm'?0:1.5,direction:[1,0,0],obstacleResolved:false}});clock=createClock(trial,{speed:Number($('speed').value)});nav=createNavigation(trial);lastDrawTick=-1;lastFrame=null;timings.initialization=performance.now()-started;for(const name of ['simulation','presentation','render'])timings[name].length=0;draw.lastEvent=0;$('play').textContent='Play';draw({full:true});notify('Paused. Choose a replay, or walk to a surface and light one tile.');return diagnostics();
}
const REPLAYS={kitchen:{position:[.1,1.10,6.25],observer:[.8,.48,6.25],level:0,label:'Kitchen-side timber wall'},bedroom:{position:[.1,3.13,5.25],observer:[.8,2.6,5.25],level:1,label:'Upper bedroom timber wall'}};
function runReplay(name,{play=true}={}) {const replay=REPLAYS[name];if(!replay)throw Error('Unknown replay');reset();nav.setPosition(replay.observer);level=replay.level;$('level').value=String(level);viewMode='cutaway';$('view').value=viewMode;trial.command({tick:1,type:'match',position:replay.position,from:[replay.observer[0],replay.position[1],replay.observer[2]]});clock.setPaused(!play);$('play').textContent=play?'Pause':'Play';notify(`${replay.label} · one match · ${trial.windMetadata.kind}`);draw({full:true});return trial.replay();}
function loop(now){if(disposed||!autoRender)return;const elapsed=loop.previous===undefined?0:(now-loop.previous)/1000;loop.previous=now;if(!clock.paused){time('simulation',()=>clock.advance(elapsed));const dx=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft')),dz=Number(keys.has('s')||keys.has('ArrowDown'))-Number(keys.has('w')||keys.has('ArrowUp'));if(dx||dz)nav.move(dx,dz,Math.min(elapsed,.1));}draw();raf=requestAnimationFrame(loop);}
function useTool(event) {
  const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
  const hit=ray.intersectObject(art.root,true).find(h=>h.object.visible&&h.object.material?.visible!==false);if(!hit)return notify('No visible surface under the pointer.');
  const p=hit.point.toArray(),observer=nav.snapshot(),from=[observer.x,observer.elevation+.9,observer.y],tool=$('tool').value;
  if(tool==='opening') {
    const nearest=data.openings.map(o=>({o,d:Math.hypot(...o.pivot.map((v,i)=>v-p[i]))})).sort((a,b)=>a.d-b.d)[0];
    if(!nearest||nearest.d>1.5||Math.hypot(from[0]-nearest.o.pivot[0],from[2]-nearest.o.pivot[2])>1.5)return notify('Walk within reach of a door.');
    const b=[...trial.scene.index.surfaces.values()].find(b=>b.openingId===nearest.o.id);trial.command({type:'opening',id:nearest.o.id,open:!b||b.openFraction<.5});
  } else if(tool==='lantern') {const direction=new T.Vector3(...p).sub(new T.Vector3(...from)).normalize();trial.command({type:'lantern',from,velocity:[direction.x*5,3+direction.y*2,direction.z*5]});}
  else {const direction=new T.Vector3(...from).sub(hit.point).normalize();trial.command({type:tool,from,position:hit.point.clone().addScaledVector(direction,.015).toArray(),...(tool==='flame'?{energy:2.5}:{})});}
  if(clock.paused){time('simulation',()=>trial.step());draw();}
}
async function initialize() {
  const start=performance.now();renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;night=createStreetNight(T,world,renderer);world.add(night.root);
  const ground=new T.Mesh(new T.PlaneGeometry(50,50),new T.MeshStandardMaterial({color:0x584c37,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(5,-.01,4);ground.receiveShadow=true;world.add(ground);
  data=await fetch(new URL('./house-data.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('House data HTTP '+r.status);return r.json();});
  const {createFurnishedHouseArt}=await import(new URL('./art.js',import.meta.url).href);art=await createFurnishedHouseArt(T,{renderer,data});world.add(art.root);
  kit=await loadCharacterKit({characterId:'goat',THREE:T,renderer,unarmed:true});goat=kit.create();world.add(goat.root);resize();reset();timings.initialization=performance.now()-start;
  $('play').onclick=()=>{clock.setPaused(!clock.paused);$('play').textContent=clock.paused?'Play':'Pause';};$('reset').onclick=()=>reset();$('step').onclick=()=>{clock.setPaused(true);time('simulation',()=>trial.step(30));draw();};
  $('speed').onchange=()=>clock.setSpeed(Number($('speed').value));$('view').onchange=()=>{viewMode=$('view').value;draw();};$('level').onchange=()=>{level=Number($('level').value);draw();};$('wind').onchange=()=>reset();$('kitchen').onclick=()=>runReplay('kitchen');$('bedroom').onclick=()=>runReplay('bedroom');
  $('export').onclick=()=>{const blob=new Blob([JSON.stringify({replay:trial.replay(),diagnostics:diagnostics()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tinderbox-furnished-house-replay.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  addEventListener('keydown',e=>{if(e.target.closest('button,select'))return;if(['w','a','s','d','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.key)){keys.add(e.key);e.preventDefault();}});addEventListener('keyup',e=>keys.delete(e.key));addEventListener('blur',()=>keys.clear());
  for(const button of document.querySelectorAll('[data-move]')){button.onpointerdown=e=>{const [dx,dz]=button.dataset.move.split(',').map(Number);button.setPointerCapture(e.pointerId);button.move=[dx,dz];keys.add(dx<0?'a':dx>0?'d':dz<0?'w':'s');};button.onpointerup=button.onpointercancel=()=>keys.clear();}
  let drag=null;canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,orbit,tilt,moved:false};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5){drag.moved=true;orbit=drag.orbit-dx*.008;tilt=Math.max(.15,Math.min(1.45,drag.tilt+dy*.006));cameraPose();}};canvas.onpointerup=e=>{if(drag&&!drag.moved)useTool(e);drag=null;};canvas.onpointercancel=()=>drag=null;canvas.onwheel=e=>{span=Math.max(5,Math.min(35,span+e.deltaY*.01));resize();e.preventDefault();};addEventListener('resize',resize);
  const api={version:1,ready:true,replays:REPLAYS,reset,runReplay,renderer,camera,scene:world,canvas,draw,setAutoRender(value){autoRender=!!value;cancelAnimationFrame(raf);loop.previous=undefined;if(autoRender&&!disposed)raf=requestAnimationFrame(loop);return autoRender;},play(){clock.setPaused(false);},pause(){clock.setPaused(true);},advanceTicks(count){clock.setPaused(true);time('simulation',()=>trial.step(count));draw();return diagnostics();},command(value){return trial.command(value);},snapshot:()=>trial.snapshot(),replay:()=>trial.replay(),diagnostics,setView(mode,nextLevel=level){viewMode=mode;level=nextLevel;$('view').value=mode;$('level').value=String(level);draw();},setCamera({azimuth=orbit,elevation=tilt,range=distance,verticalSpan=span,offset,target:nextTarget}={}){orbit=azimuth;tilt=elevation;distance=range;span=verticalSpan;if(offset){distance=Math.hypot(...offset);orbit=Math.atan2(offset[2],offset[0]);tilt=Math.atan2(offset[1],Math.hypot(offset[0],offset[2]));}if(nextTarget)target.fromArray(nextTarget);resize();draw();},move(dx,dz,seconds){const result=nav.move(dx,dz,seconds);draw();return result;},observer:()=>nav.snapshot(),setObserver(position){nav.setPosition(position);draw();},dispose(){disposed=true;cancelAnimationFrame(raf);trial.dispose();art.dispose();kit.dispose();night.dispose();world.traverse(o=>{if(o.geometry)o.geometry.dispose();});renderer.dispose();}};
  window.__furnished=api;notify('Ready. Choose a replay or walk to a timber surface.');raf=requestAnimationFrame(loop);addEventListener('pagehide',()=>api.dispose(),{once:true});
}
initialize().catch(error=>{errors.push(String(error.stack||error));$('fatal').textContent=String(error);$('fatal').style.display='block';notify('Workbench initialization failed.');console.error(error);});
