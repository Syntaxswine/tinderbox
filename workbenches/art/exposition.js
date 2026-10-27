
import * as THREE from '../../src/runtime/three.js';
import {createSimulation} from '../../src/simulation/index.js';
import {EXPOSITION_SCENARIO} from '../../src/content/exposition.js';
import {createCameraRig} from '../../src/runtime/camera.js';
import {createArtScene} from '../../src/art/index.js';
const $=id=>document.getElementById(id),stage=$('stage'),scene=new THREE.Scene();
scene.background=new THREE.Color(0xb4bba3);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stage.append(renderer.domElement);
let art,simulation,layout='proposal',skin='inherited-plaster',playing=false,alive=true,raf,last=performance.now(),cameraMode='overview',snapshot;
function scenarioFor(){
  const s=structuredClone(EXPOSITION_SCENARIO);
  if(layout==='proposal'){
    for(const m of s.modules){
      if(m.id.startsWith('court-front')||m.id==='court-gate')m.y=5;
      if(m.id==='court-west'||m.id==='court-east'){m.y=3;m.width=4;}
      if(m.id==='hall-back')m.y=1;
      if(m.id==='hall-closed-door'||m.id==='hall-pilaster')m.y=3;
      if(m.id==='hall-gable')m.y=2;
      if(m.id==='service-corner'||m.id==='service-hip')m.y=3;
    }
    const frontage=s.modules.find(m=>m.id==='court-front-west');
    for(const [i,x]of [4,8,12,16].entries())s.modules.push({...structuredClone(frontage),id:'bay-pilaster-'+i,form:'pilaster',x,y:5.10,width:.30,depth:.45,height:3.40,skinSlots:{...frontage.skinSlots,facade:'inherited-cream'},sourceRefs:[...frontage.sourceRefs,'game:bay-articulation']});
    const horse=s.actors.find(a=>a.species==='horse');horse.x=7;horse.y=10;horse.route=[{x:7,y:10},{x:13,y:10}];
  }
  for(const m of s.modules)m.skinSlots.facade=m.id.startsWith('bay-pilaster-')?'inherited-cream':skin;
  return s;
}
function reset(options={}){
  layout=options.layout||layout;skin=options.skin||skin;simulation?.dispose();
  simulation=createSimulation({scenario:scenarioFor()});snapshot=simulation.snapshot();
  $('layout').value=layout;$('skin').value=skin;draw();return snapshot;
}
const cameraRig=createCameraRig(stage,renderer,{width:20,height:16}),camera=cameraRig.camera;
function frameCamera(){
  cameraRig.resize();
  if(cameraMode==='detail'){
    const target=new THREE.Vector3(12,2.1,3.5),aspect=stage.clientWidth/stage.clientHeight,span=Math.max(10.5,14.5/aspect);
    camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
    camera.position.copy(target).add(new THREE.Vector3(10,14,12));camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
}
function draw(override){
  if(!art)return;
  const s=override||simulation.snapshot();snapshot=s;
  art.update(s,{playerTime:s.clocks.player,worldTime:s.clocks.world});renderer.render(scene,camera);
  const d=art.diagnostics();$('status').textContent=layout+' · '+cameraMode+' · '+d.exterior.modules+' modules / '+d.exterior.survivingSolidParts.length+' live solid parts · '+(d.civilianKit?.instances||0)+' original civilians · '+renderer.info.render.calls+' draws';
  return d;
}
function advance(seconds){for(let t=0;t<seconds-1e-9;t+=1/60)simulation.advance(Math.min(1/60,seconds-t));return draw();}
function focus(mode){cameraMode=mode;frameCamera();draw();}
function visibility(){
  const targets=['Provisional Tinderbox bear','Civilian horse','Civilian goat'],meshes=[];
  scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const original=meshes.map(o=>[o,o.material,o.visible]),background=scene.background,previous=renderer.getRenderTarget();
  const black=new THREE.MeshBasicMaterial({color:0,toneMapped:false,side:THREE.DoubleSide}),mark=new THREE.MeshBasicMaterial({color:0xff00ff,toneMapped:false,side:THREE.DoubleSide});
  const width=Math.max(1,stage.clientWidth),height=Math.max(1,stage.clientHeight),target=new THREE.WebGLRenderTarget(width,height),pixels=new Uint8Array(width*height*4),results=[];
  function pixelsFor(root,isolated){
    for(const [mesh,,visible]of original){
      let belongs=false;for(let o=mesh;o;o=o.parent)if(o===root){belongs=true;break;}
      mesh.material=belongs?mark:black;mesh.visible=visible&&(!isolated||belongs);
    }
    renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
    let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>240&&pixels[i+1]<20&&pixels[i+2]>240)count++;return count;
  }
  try{
    scene.background=new THREE.Color(0);renderer.setRenderTarget(target);
    for(const name of targets){const root=scene.getObjectByName(name);if(!root)throw Error('Missing visible actor '+name);const full=pixelsFor(root,false),isolated=pixelsFor(root,true);results.push({name,fullPixels:full,isolatedPixels:isolated,visibleRatio:isolated?full/isolated:0});}
  }finally{
    renderer.setRenderTarget(previous);scene.background=background;for(const [mesh,material,visible]of original){mesh.material=material;mesh.visible=visible;}target.dispose();black.dispose();mark.dispose();renderer.render(scene,camera);
  }
  return results;
}
const resize=new ResizeObserver(()=>{frameCamera();draw();});resize.observe(stage);
try{
  art=await createArtScene({THREE,scene,renderer});$('loading').remove();reset();
  $('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';};
  $('step').onclick=()=>advance(1);$('reset').onclick=()=>reset();$('layout').onchange=e=>reset({layout:e.target.value});
  $('skin').onchange=e=>reset({skin:e.target.value});$('overview').onclick=()=>focus('overview');$('detail').onclick=()=>focus('detail');
  window.expositionArt={ready:true,THREE,scene,renderer,camera,get art(){return art;},get snapshot(){return structuredClone(snapshot);},get simulation(){return simulation;},reset,draw,advance,focus,visibility,pause(){playing=false;$('play').textContent='Play';},
    diagnostics:()=>({art:art.diagnostics(),memory:{...renderer.info.memory},draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,layout,skin,cameraMode,canvas:[stage.clientWidth,stage.clientHeight]}),
    async validate(){
      playing=false;const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);},freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
      reset({layout:'proposal',skin:'inherited-plaster'});focus('overview');
      const s=freeze(structuredClone(snapshot)),before=JSON.stringify(s);draw(s);check(JSON.stringify(s)===before,'Snapshot mutated');
      for(let warm=0;warm<3;warm++)draw(s);const frozenPixels=renderer.domElement.toDataURL();draw(s);check(frozenPixels===renderer.domElement.toDataURL(),'Fixed-clock civilian pixels changed');
      advance(1);const normalTravel=snapshot.actors.find(a=>a.species==='horse').travelled;simulation.dispatch({type:'drug',drug:'powder'});advance(1);const motion={normalTravel,powderTravel:snapshot.actors.find(a=>a.species==='horse').travelled-normalTravel,worldTime:snapshot.clocks.world};
      for(const a of snapshot.actors){const root=scene.getObjectByName('Civilian '+a.species);check(Math.abs(root.position.x-a.x)<1e-7&&Math.abs(root.position.z-a.y)<1e-7,'Civilian renderer moved off authoritative pose');}
      check(Math.abs(motion.normalTravel-.8)<1e-7&&Math.abs(motion.powderTravel-.28)<1e-7,'World-time civilian motion mismatch');reset();draw(s);
      const expected=s.world.modules.flatMap(m=>m.parts.filter(p=>p.solid&&!p.destroyed)).map(p=>p.id).sort();
      check(JSON.stringify([...art.diagnostics().exterior.survivingSolidParts].sort())===JSON.stringify(expected),'Visible solid parts differ from source');
      check(art.diagnostics().provisionalActors===0&&art.diagnostics().civilianKit.instances===2,'Civilian factory not used');
      const gate=s.world.modules.find(m=>m.id==='court-gate'),probe=new THREE.Vector3(gate.x,1.1,gate.y);let gateFilled=false;
      scene.getObjectByName('Exposition construction kit').traverse(o=>{if(o.isMesh&&new THREE.Box3().setFromObject(o).containsPoint(probe))gateFilled=true;});
      check(!gateFilled,'Open gateway is visually filled');
      check(!!scene.getObjectByName('module-part:hall-closed-door:closed-door'),'Closed leaf missing');
      for(const m of s.world.modules.filter(m=>!m.form.startsWith('roof-')))for(const p of m.parts.filter(p=>!p.destroyed)){const object=scene.getObjectByName('module-part:'+p.id),box=new THREE.Box3().setFromObject(object),size=new THREE.Vector3();box.getSize(size);check(Math.abs(size.x-p.width)<1e-5&&Math.abs(size.z-p.depth)<1e-5&&Math.abs(box.min.y-(p.h-p.height/2))<1e-5,'Compiled part rotated/scaled twice: '+p.id);}
      const roofBounds={};
      for(const m of s.world.modules.filter(m=>m.form.startsWith('roof-'))){
        const mesh=scene.getObjectByName('module-part:'+m.parts[0].id),box=new THREE.Box3().setFromObject(mesh),size=new THREE.Vector3();box.getSize(size);
        check(Math.abs(size.y-m.height)<1e-5&&Math.abs(box.min.y-m.baseHeight)<1e-5,'Roof envelope mismatch');
        roofBounds[m.form]={size:size.toArray(),base:box.min.y,top:box.max.y};
      }
      const rectangular=scenarioFor(),hipSpec=rectangular.modules.find(m=>m.form==='roof-hip');hipSpec.width=4;hipSpec.depth=2;hipSpec.heading=Math.PI/2;const rectSim=createSimulation({scenario:rectangular});let rectSnapshot;try{rectSnapshot=rectSim.snapshot();}finally{rectSim.dispose();}draw(rectSnapshot);
      const rectBox=new THREE.Box3().setFromObject(scene.getObjectByName('module-part:'+hipSpec.id+':roof-envelope')),rectSize=new THREE.Vector3();rectBox.getSize(rectSize);check(Math.abs(rectSize.x-2)<1e-5&&Math.abs(rectSize.z-4)<1e-5,'Rectangular rotated hip mismatch');roofBounds.rotatedRectangularHip=rectSize.toArray();draw(s);
      for(const name of ['Civilian horse','Civilian goat']){const root=scene.getObjectByName(name);let bodies=0;root.traverse(o=>{if(o.isSkinnedMesh)bodies++;});check(root.userData.appearance==='normal'&&bodies>0,'Original civilian missing '+name);}
      const physics=JSON.stringify(s.world.obstacles),builds=art.diagnostics().exterior.builds,firstUseBefore={...renderer.info.memory};
      // Upload each selected finish once before checking repeated GPU resource reuse.
      for(const id of ['inherited-brick','inherited-wood','inherited-plaster'])reset({skin:id});
      const baseline={...renderer.info.memory},firstUse={before:firstUseBefore,afterAllFinishes:baseline};
      const skinCounts=[];for(const id of ['inherited-brick','inherited-wood','inherited-plaster']){reset({skin:id});check(JSON.stringify(snapshot.world.obstacles)===physics,'Skin changed physics');check(art.diagnostics().exterior.builds===builds,'Skin rebuilt module geometry');skinCounts.push({...renderer.info.memory});}
      check(skinCounts.every(c=>c.geometries===baseline.geometries&&c.textures===baseline.textures),'Skin swap retained resources');
      const actorCycles=[];for(let i=0;i<4;i++){draw({...snapshot,actors:[]});draw(s);actorCycles.push({...renderer.info.memory});}
      check(actorCycles.every(c=>c.geometries===baseline.geometries&&c.textures===baseline.textures),'Civilian recreation grew GPU memory');
      const frame={id:'burn-gate',form:'doorway',x:5,y:5,width:4,depth:.3,height:3.2,heading:0,physicalMaterial:'wood',opening:{width:1.4,height:2.3,state:'open'},skinSlots:{...gate.skinSlots},sourceRefs:['game:authoritative-burn-review']};
      const burn=createSimulation({scenario:{width:10,height:10,player:{x:5,y:7},actors:[],obstacles:[],modules:[frame,{...frame,id:'burn-roof',form:'roof-gable',width:6,depth:3,height:1.6,baseHeight:3.2,supportModuleIds:['burn-gate']}],ignitions:[{x:4.15,y:5,radius:1.5,heat:4}]},config:{fuel:{surfaceBurnRate:1000},fire:{damagePerSecond:0}}});
      let burned;try{burn.advance(1/60);burned=burn.advance(1/60);}finally{burn.dispose();}
      draw(freeze(burned));const damage=art.diagnostics().exterior;
      check(!scene.getObjectByName('module-part:burn-gate:pier-left')&&!scene.getObjectByName('module-part:burn-gate:lintel')&&!scene.getObjectByName('module-part:burn-roof:roof-envelope'),'Destroyed/unsupported art resurrected');
      check(!!scene.getObjectByName('module-part:burn-gate:pier-right'),'Surviving pier vanished');draw(freeze(burned));
      check(JSON.stringify(damage.survivingSolidParts)===JSON.stringify(art.diagnostics().exterior.survivingSolidParts),'Repeated burnt snapshot changed liveness');
      reset({layout:'proposal',skin:'inherited-plaster'});focus('overview');const actorVisibility=visibility();
      check(actorVisibility.every(r=>r.fullPixels>15&&r.visibleRatio>.75),'Initial actor occluded in proposed layout');
      const disposedArt=art;disposedArt.dispose();disposedArt.dispose();renderer.render(scene,camera);const disposed={...renderer.info.memory};check(!disposed.geometries&&!disposed.textures,'Art disposal retained GPU memory');
      art=await createArtScene({THREE,scene,renderer});reset();return{passed:!errors.length,errors,motion,fixedClockPixels:true,roofBounds,firstUse,skinCounts,actorCycles,damage,actorVisibility,disposed};
    },
    dispose(){if(!alive)return;alive=false;cancelAnimationFrame(raf);resize.disconnect();simulation?.dispose();art?.dispose();renderer.dispose();renderer.forceContextLoss();}
  };
  $('validate').onclick=async()=>{const output=$('review-output');output.hidden=false;output.textContent='Running actual-scene checks…';$('validate').disabled=true;try{const result=await window.expositionArt.validate();output.textContent=JSON.stringify(result,null,2);}catch(error){output.textContent=JSON.stringify({passed:false,error:error.message},null,2);}finally{$('validate').disabled=false;}};
  function frame(now){if(!alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;if(playing){simulation.advance(dt);draw();}raf=requestAnimationFrame(frame);}raf=requestAnimationFrame(frame);
  addEventListener('pagehide',()=>window.expositionArt.dispose(),{once:true});
}catch(error){const loading=$('loading');if(loading)loading.textContent=error.message;console.error(error);window.expositionArt={ready:false,error:error.message};}
