
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
  const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);span=fixture==='bear'||fixture==='corner'?5.8:fixture==='jet-near-wall'?7.2:13;
  target.set(fixture==='corner'?9.06:fixture==='bear'?11.55:10.8,fixture==='bear'||fixture==='corner'?.9:.25,fixture==='corner'?7.8:fixture==='bear'?9.4:8.9);
  camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.1;camera.far=100;
  camera.position.copy(target).add(new THREE.Vector3(10,14,12));camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  $('view-label').textContent=span+' m vertical span';
}
function setFixture(id,options={}){
  if(!FIXTURES.some(f=>f.id===id))throw Error('Unknown fixture '+id);
  fixture=id;reviewTime=options.time??(id==='burst'?.3:4);
  if(options.tool)tool=options.tool;else if(id.startsWith('jet'))tool='flamethrower';else if(id==='torch')tool='torch';
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
  art=await createArtScene({THREE,scene,renderer});$('loading').remove();
  for(const name of ['grip','muzzle','spout']){const label=document.createElement('span');label.className='anchor-tag';label.textContent=name.toUpperCase();$('anchor-labels').append(label);labels.set(name,label);}
  setFixture(new URLSearchParams(location.search).get('fixture')||'front');
  window.artWorkbench={ready:true,scene,camera,renderer,THREE,createArtScene,
    setFixture,drawAt,get snapshot(){return structuredClone(lastSnapshot);},get art(){return art;},
    diagnostics:()=>({art:art.diagnostics(),renderer:JSON.parse(JSON.stringify(renderer.info.memory)),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,viewport:[innerWidth,innerHeight],canvas:[stage.clientWidth,stage.clientHeight]}),
    pause(){playing=false;$('play').textContent='Play review';},
    async recreate(){art.dispose();renderer.render(scene,camera);art=await createArtScene({THREE,scene,renderer});drawAt(reviewTime);},
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
      const footprint=scene.getObjectByName('Player footprint'),diameter=new THREE.Vector3();
      let footprintCounts;
      for(const radius of [.56,.8,.56]){const sized=fixtureSnapshot('corner',4,'jerry-can');sized.player.radius=radius;art.update(sized,timingFor(sized));renderer.render(scene,camera);new THREE.Box3().setFromObject(footprint).getSize(diameter);check(Math.abs(diameter.x-radius*2)<1e-5&&Math.abs(diameter.z-radius*2)<1e-5,'Player radius did not set footprint diameter');if(!footprintCounts)footprintCounts={...renderer.info.memory};else check(renderer.info.memory.geometries===footprintCounts.geometries&&renderer.info.memory.textures===footprintCounts.textures,'Footprint resizing retained GPU resources');}

      const openDischarge=freeze(fixtureSnapshot('jet',4,'flamethrower')),openBefore=JSON.stringify(openDischarge);
      art.update(openDischarge,timingFor(openDischarge));renderer.render(scene,camera);
      const opened=art.diagnostics().fire.discharge;
      check(opened.active&&Math.abs(opened.longestRay-4.5)<1e-8&&opened.connectRays&&opened.plumeCards>0,'Open resolved fan did not show its supplied reach');
      check(JSON.stringify(openDischarge)===openBefore,'Discharge snapshot mutation');
      art.update(openDischarge,timingFor(openDischarge));check(art.diagnostics().fire.discharge.geometryBuilds===opened.geometryBuilds,'Unchanged discharge rebuilt geometry');
      for(let warm=0;warm<3;warm++){art.update(openDischarge,{playerTime:4,worldTime:2});renderer.render(scene,camera);}
      const frozenDischarge=renderer.domElement.toDataURL();art.update(openDischarge,{playerTime:4,worldTime:2});renderer.render(scene,camera);
      check(frozenDischarge===renderer.domElement.toDataURL(),'Frozen discharge pixels changed');
      art.update(openDischarge,{playerTime:11,worldTime:2});check(art.diagnostics().fire.discharge.worldTime===2,'Player clock advanced discharge animation');
      const independent=fixtureSnapshot('jet-rays',4,'flamethrower');art.update(independent,timingFor(independent));renderer.render(scene,camera);
      const independentState=art.diagnostics().fire.discharge,segments=scene.getObjectByName('Resolved discharge ribbons').geometry;
      let nonSegmentTriangles=0;
      for(let i=0;i<segments.drawRange.count;i+=3){
        const a=segments.index.array[i]*3,b=segments.index.array[i+1]*3,c=segments.index.array[i+2]*3,p=segments.attributes.position.array;
        const area=(p[b]-p[a])*(p[c+2]-p[a+2])-(p[b+2]-p[a+2])*(p[c]-p[a]);if(Math.abs(area)>1e-5)nonSegmentTriangles++;
      }
      check(!independentState.connectRays&&independentState.plumeCards===0&&nonSegmentTriangles===0,'Independent rays gained invented fan fill');
      const torch=fixtureSnapshot('torch',4,'torch');art.update(torch,timingFor(torch));renderer.render(scene,camera);
      check(art.diagnostics().fire.discharge.active&&Math.abs(art.diagnostics().fire.discharge.longestRay-.4)<1e-7&&torch.discharge.lead,'Torch endpoint fan/lead missing');
      const blocked=fixtureSnapshot('jet-near-wall',4,'flamethrower');blocked.cells=[];blocked.actors=[];art.update(freeze(blocked),timingFor(blocked));renderer.render(scene,camera);
      const blockedState=art.diagnostics().fire.discharge;
      check(!blockedState.muzzleInsideShape&&blockedState.longestRay<.61,'Near-wall nozzle did not use the clipped domain');
      check(!scene.getObjectByName('Cosmetic lance').visible,'Far-side cosmetic lance remained visible');
      const blockGeometry=scene.getObjectByName('Resolved discharge ribbons').geometry;
      let maxSubmittedX=-Infinity;
      for(let i=0;i<blockGeometry.drawRange.count;i++)maxSubmittedX=Math.max(maxSubmittedX,blockGeometry.attributes.position.array[blockGeometry.index.array[i]*3]);
      check(maxSubmittedX<=11.499902,'Ribbon extended past supplied wall endpoints');
      const artRoot=scene.getObjectByName('Tinderbox art module'),savedVisibility=artRoot.children.map(object=>[object,object.visible]),savedBackground=scene.background,previousTarget=renderer.getRenderTarget();
      const target=new THREE.WebGLRenderTarget(256,256),probeCamera=new THREE.OrthographicCamera(-3,3,3,-3,.1,60);
      let visiblePixels=0,outsidePixels=0;
      try{
        for(const object of artRoot.children)object.visible=object.name==='Painted authoritative fire';
        scene.background=new THREE.Color(0);probeCamera.position.set(11,10,15);probeCamera.lookAt(11,1.05,9);probeCamera.updateProjectionMatrix();probeCamera.updateMatrixWorld();
        renderer.setRenderTarget(target);renderer.render(scene,probeCamera);
        const pixels=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,pixels);
        const edge=new THREE.Vector3(11.5,1.05,9).project(probeCamera),outsideColumn=Math.ceil((edge.x*.5+.5)*256)+1;
        for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>8){visiblePixels++;if(x>=outsideColumn)outsidePixels++;}}
        check(visiblePixels>10&&outsidePixels===0,'Painted discharge crossed clipped wall in GPU probe');
      }finally{
        renderer.setRenderTarget(previousTarget);scene.background=savedBackground;for(const [object,visible]of savedVisibility)object.visible=visible;target.dispose();
      }
      const stopped=fixtureSnapshot('jet',4,'flamethrower');stopped.paused=true;stopped.discharge={...stopped.discharge,active:false,tool:null,origin:null,shapeOrigin:null,rays:[],lead:null};art.update(stopped,timingFor(stopped));renderer.render(scene,camera);
      check(!art.diagnostics().fire.discharge.active&&art.diagnostics().fire.discharge.plumeCards===0,'Inactive discharge retained a jet');
      check(scene.getObjectByName('Cosmetic lance').visible,'Inactive discharge did not restore held art');
      const dischargeReview={openReach:opened.longestRay,openPlumes:opened.plumeCards,independentTriangles:independentState.triangles,nonSegmentTriangles,blockedReach:blockedState.longestRay,maxSubmittedX,visiblePixels,outsidePixels,pixelGuard:1};

      const counts=[];
      for(let i=0;i<8;i++){
        const changed=fixtureSnapshot('burn',4,'torch');if(i%2)changed.world.obstacles=changed.world.obstacles.slice(0,4);
        changed.actors=i%2?[]:changed.actors;art.update(changed,timingFor(changed));renderer.render(scene,camera);counts.push({...renderer.info.memory});
      }
      check(counts.slice(2).every((m,i)=>m.geometries===counts[i%2+2].geometries&&m.textures===counts[i%2+2].textures),'World/actor rebuild resources grew');
      art.dispose();art.dispose();renderer.render(scene,camera);const disposed={...renderer.info.memory};
      check(disposed.geometries===0&&disposed.textures===0,'Dispose retained GPU resources');
      art=await createArtScene({THREE,scene,renderer});
      const history=fixtureSnapshot('burst',4.3);history.events=[{id:999,tick:0,type:'barrel-explosion',x:8,y:7}];
      art.update(history,timingFor(history));check(art.diagnostics().fire.burstCards===0,'Undated startup history replayed');
      history.tick++;history.events=[{id:1000,tick:history.tick,type:'barrel-explosion',x:8,y:7}];art.update(history,timingFor(history));check(art.diagnostics().fire.burstCards>0,'New event after startup cursor did not play');
      drawAt(4);
      return {passed:errors.length===0,errors,rebuildCounts:counts,disposed,dischargeReview,diagnostics:this.diagnostics()};
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
}catch(error){const loading=$('loading');if(loading)loading.textContent='Art workbench failed: '+error.message;console.error(error);window.artWorkbench={ready:false,error:error.message};}
