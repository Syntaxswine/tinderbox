
import * as THREE from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.module.js';
import {createArtScene} from '../../src/art/index.js';
import {FIXTURES,fixtureSnapshot,timingFor} from './fixtures.js';
const $=id=>document.getElementById(id),stage=$('stage');
if(new URLSearchParams(location.search).has('capture'))document.body.classList.add('capture');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xaeb69a);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.append(renderer.domElement);const camera=new THREE.OrthographicCamera();
let art,fixture='front',reviewTime=4,playing=true,tool='jerry-can',alive=true,lastSnapshot,lastReal=performance.now(),frames=0,lastStats=lastReal,raf,span=13;
const target=new THREE.Vector3(),anchorWorld=new THREE.Vector3(),labels=new Map();
for(const info of FIXTURES){const b=document.createElement('button');b.type='button';b.textContent=info.label;b.dataset.fixture=info.id;b.addEventListener('click',()=>setFixture(info.id));$('fixtures').append(b);}
function cameraFrame(){
  const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);span=fixture==='bear'?5.8:13;
  target.set(fixture==='bear'?11.55:10.8,fixture==='bear'?.9:.25,fixture==='bear'?9.4:8.9);
  camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.1;camera.far=100;
  camera.position.copy(target).add(new THREE.Vector3(10,14,12));camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  $('view-label').textContent=span+' m vertical span';
}
function setFixture(id,options={}){
  if(!FIXTURES.some(f=>f.id===id))throw Error('Unknown fixture '+id);
  fixture=id;reviewTime=options.time??(id==='burst'?.3:4);
  if(options.tool)tool=options.tool;
  if(options.frozen!==undefined)playing=!options.frozen;
  const info=FIXTURES.find(f=>f.id===id);$('title').textContent=info.title;$('copy').textContent=info.copy;$('state-label').textContent=info.label;
  for(const b of $('fixtures').children)b.setAttribute('aria-current',String(b.dataset.fixture===id));
  $('tool').value=tool;$('play').textContent=playing?'Pause review':'Play review';cameraFrame();drawAt(reviewTime);
}
function drawAt(time,overrides={}){
  if(!art)return;reviewTime=time;const snap=fixtureSnapshot(fixture,reviewTime,tool);
  if(overrides.worldTime!==undefined)snap.clocks.world=overrides.worldTime;
  if(overrides.playerTime!==undefined)snap.clocks.player=overrides.playerTime;
  if(overrides.snapshot)Object.assign(snap,overrides.snapshot);
  lastSnapshot=snap;art.update(snap,timingFor(snap));renderer.render(scene,camera);
  $('time').value=String(time);$('clock').textContent=time.toFixed(2)+' s';$('stats').textContent=renderer.info.render.calls+' DRAWS / '+art.diagnostics().fire.flameCards+' FLAME CARDS';
  for(const [name,label]of labels){
    label.hidden=!$('guides').checked||fixture!=='bear'||(name==='spout'&&tool!=='jerry-can')||(name==='muzzle'&&tool==='jerry-can');
    if(!label.hidden){art.anchors[name].getWorldPosition(anchorWorld);anchorWorld.project(camera);label.style.left=(anchorWorld.x*.5+.5)*stage.clientWidth+'px';label.style.top=((-anchorWorld.y*.5+.5)*stage.clientHeight+(name==='muzzle'?-9:name==='spout'?12:0))+'px';}
  }
  return art.diagnostics();
}
$('play').addEventListener('click',()=>{playing=!playing;$('play').textContent=playing?'Pause review':'Play review';});
$('time').addEventListener('input',e=>{playing=false;$('play').textContent='Play review';drawAt(Number(e.target.value));});
$('tool').addEventListener('change',e=>{tool=e.target.value;drawAt(reviewTime);});
$('guides').addEventListener('change',()=>drawAt(reviewTime));
const resize=new ResizeObserver(()=>{cameraFrame();drawAt(reviewTime);});resize.observe(stage);
try{
  art=await createArtScene({THREE,scene});$('loading').remove();
  for(const name of ['grip','muzzle','spout']){const label=document.createElement('span');label.className='anchor-tag';label.textContent=name.toUpperCase();$('anchor-labels').append(label);labels.set(name,label);}
  setFixture(new URLSearchParams(location.search).get('fixture')||'front');
  window.artWorkbench={ready:true,scene,camera,renderer,THREE,createArtScene,
    setFixture,drawAt,get snapshot(){return structuredClone(lastSnapshot);},get art(){return art;},
    diagnostics:()=>({art:art.diagnostics(),renderer:JSON.parse(JSON.stringify(renderer.info.memory)),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,viewport:[innerWidth,innerHeight],canvas:[stage.clientWidth,stage.clientHeight]}),
    pause(){playing=false;$('play').textContent='Play review';},
    async recreate(){art.dispose();renderer.render(scene,camera);art=await createArtScene({THREE,scene});drawAt(reviewTime);},
    render(){renderer.render(scene,camera);},
    async validate(){
      playing=false;const errors=[],check=(ok,msg)=>{if(!ok)errors.push(msg);};
      const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
      const snap=freeze(fixtureSnapshot('front',4,'flamethrower')),before=JSON.stringify(snap);
      art.update(snap,timingFor(snap));renderer.render(scene,camera);check(before===JSON.stringify(snap),'Snapshot mutation');
      const first=art.diagnostics().fire.eventCount;const eventSnap=fixtureSnapshot('burst',.3,'matches');
      art.update(eventSnap,timingFor(eventSnap));art.update(eventSnap,timingFor(eventSnap));
      check(art.diagnostics().fire.eventCount===first+1,'Repeated event replayed');
      const still=fixtureSnapshot('front',6,'flamethrower');art.update(still,{playerTime:5,worldTime:2});renderer.render(scene,camera);
      for(let warm=0;warm<3;warm++){art.update(still,{playerTime:5,worldTime:2});renderer.render(scene,camera);}
      const frozenCanvas=renderer.domElement.toDataURL();
      art.update(still,{playerTime:5,worldTime:2});renderer.render(scene,camera);
      check(frozenCanvas===renderer.domElement.toDataURL(),'Frozen clocks changed rendered pixels');
      art.update(still,{playerTime:11,worldTime:2});check(art.diagnostics().fire.worldTime===2,'Player clock advanced environmental flame');
      for(const selected of ['matches','jerry-can','molotov','torch','flamethrower']){const equipped=fixtureSnapshot('bear',4,selected);art.update(equipped,timingFor(equipped));for(const name of ['grip','muzzle','spout']){const p=art.anchors[name].getWorldPosition(new THREE.Vector3());check(p.toArray().every(Number.isFinite),'Invalid '+selected+' '+name+' anchor');}}
      const dry=fixtureSnapshot('trail',4);art.update(dry,timingFor(dry));const mask=scene.getObjectByName('Authoritative gas / heat / char mask').children[0].material.uniforms.field.value;check(mask.image.data[(17*40+16)*4]===0,'Dry gap received inferred gas');
      const counts=[];
      for(let i=0;i<8;i++){
        const changed=fixtureSnapshot('burn',4,'torch');if(i%2)changed.world.obstacles=changed.world.obstacles.slice(0,4);
        changed.actors=i%2?[]:changed.actors;art.update(changed,timingFor(changed));renderer.render(scene,camera);counts.push({...renderer.info.memory});
      }
      check(counts.slice(2).every((m,i)=>m.geometries===counts[i%2+2].geometries&&m.textures===counts[i%2+2].textures),'World/actor rebuild resources grew');
      art.dispose();art.dispose();renderer.render(scene,camera);const disposed={...renderer.info.memory};
      check(disposed.geometries===0&&disposed.textures===0,'Dispose retained GPU resources');
      art=await createArtScene({THREE,scene});
      const history=fixtureSnapshot('burst',4.3);history.events=[{id:999,tick:0,type:'barrel-explosion',x:8,y:7}];
      art.update(history,timingFor(history));check(art.diagnostics().fire.burstCards===0,'Undated startup history replayed');
      history.tick++;history.events=[{id:1000,tick:history.tick,type:'barrel-explosion',x:8,y:7}];art.update(history,timingFor(history));check(art.diagnostics().fire.burstCards>0,'New event after startup cursor did not play');
      drawAt(4);
      return {passed:errors.length===0,errors,rebuildCounts:counts,disposed,diagnostics:this.diagnostics()};
    },
    dispose(){if(!alive)return;alive=false;cancelAnimationFrame(raf);resize.disconnect();art.dispose();renderer.dispose();renderer.forceContextLoss();}
  };
  function frame(now){
    if(!alive)return;const delta=Math.min(.05,(now-lastReal)/1000);lastReal=now;
    if(playing){reviewTime+=delta;if(reviewTime>12)reviewTime=0;}
    drawAt(reviewTime);frames++;
    if(now-lastStats>700){$('stats').textContent=Math.round(frames*1000/(now-lastStats))+' FPS · '+renderer.info.render.calls+' DRAWS · '+art.diagnostics().fire.flameCards+' FLAME CARDS';frames=0;lastStats=now;}
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  window.addEventListener('pagehide',()=>window.artWorkbench.dispose(),{once:true});
}catch(error){$('loading').textContent='Art workbench failed: '+error.message;console.error(error);window.artWorkbench={ready:false,error:error.message};}
