import * as THREE from '../../src/runtime/three.js';
import {createArtScene} from '../../src/art/index.js';
import {createSimulation} from '../../src/simulation/index.js';
import {EXPOSITION_SCENARIO} from '../../src/content/exposition.js';
import {WALL_STORY_OPTIONS} from '../../src/content/exterior-kit.js';
import {createCameraRig} from '../../src/runtime/camera.js';
const $=id=>document.getElementById(id),stage=$('stage'),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stage.append(renderer.domElement);
const panes=[0,1].map(()=>{const scene=new THREE.Scene();scene.background=new THREE.Color(0xb4bba3);return{scene,art:null,camera:new THREE.OrthographicCamera()};});
let simulation,snapshot,study='courtyard',stories=3,facade='inherited-plaster',door='open',alive=true,reversed=false,validating=false;
const slots=()=>({facade,trim:'inherited-cream',door:'inherited-wood',roof:'inherited-roof'});
function civilian(species,x,y){return{id:species,species,appearance:'normal',team:'civilian',headgear:'none',equipment:'none',radius:.62,x,y,heading:0,hp:100,speed:.8,route:[{x,y},{x:x+2,y}]};}
function scenario(){
  if(study==='courtyard'){
    const s=structuredClone(EXPOSITION_SCENARIO);
    for(const m of s.modules){
      if(m.id.startsWith('court-front')||m.id==='court-gate')m.y=5;
      if(m.id==='court-west'||m.id==='court-east'){m.y=3;m.width=4;}
      if(m.id==='hall-back')m.y=1;if(m.id==='hall-closed-door'||m.id==='hall-pilaster')m.y=3;
      if(m.id==='hall-gable')m.y=2;if(m.id==='service-corner'||m.id==='service-hip')m.y=3;
      m.skinSlots.facade=facade;
    }
    const horse=s.actors.find(a=>a.species==='horse');horse.x=7;horse.y=10;horse.route=[{x:7,y:10},{x:13,y:10}];
    return s;
  }
  if(study==='civilians')return{width:20,height:16,player:{x:3,y:13},actors:[civilian('horse',8.5,9),civilian('goat',11.5,9)],modules:[],obstacles:[]};
  const counts=study==='gallery'?[1,2,3,4,5]:[stories],modules=[];
  for(const [index,count]of counts.entries()){
    const x=study==='gallery'?5+index*8:10,id='canvas-'+count,preset=WALL_STORY_OPTIONS[count-1];
    modules.push({id,form:'doorway',x,y:4,width:6,depth:.3,heading:0,...preset,physicalMaterial:'wood',opening:{width:1.4,height:2.3,state:door},skinSlots:slots(),sourceRefs:['game:1893-skin-canvas']});
    for(const sign of [-1,1])modules.push({id:id+'-pilaster-'+sign,form:'pilaster',x:x+sign*2.9,y:4.12,width:.30,depth:.48,heading:0,...preset,physicalMaterial:'wood',skinSlots:{...slots(),facade:'inherited-cream'},sourceRefs:['game:1893-skin-canvas']});
    modules.push({id:id+'-roof',form:count%2?'roof-gable':'roof-hip',x,y:3,width:6.25,depth:2.5,height:.95,heading:0,baseHeight:preset.height,physicalMaterial:'wood',skinSlots:slots(),supportModuleIds:[id],sourceRefs:['game:1893-skin-canvas']});
  }
  return{width:study==='gallery'?44:20,height:16,player:{x:study==='gallery'?20:7,y:10},actors:study==='gallery'?[]:[civilian('horse',8,8),civilian('goat',12,8)],modules,obstacles:[]};
}
function dimensions(){const w=stage.clientWidth,h=stage.clientHeight,stack=w<=600;return{w,h,stack,pw:stack?w:Math.floor(w/2),ph:stack?Math.floor(h/2):h};}
function cameraFor(camera,width,height){
  const aspect=width/height;
  if(study==='courtyard'){
    const proxy={clientWidth:width,clientHeight:height},rig=createCameraRig(proxy,{setSize(){}},{width:20,height:16});rig.resize();camera.copy(rig.camera);return;
  }
  const target=study==='gallery'?new THREE.Vector3(21,7,4):study==='facade'?new THREE.Vector3(10,stories*1.6,4):new THREE.Vector3(10,1.0,9);
  const span=study==='gallery'?Math.max(23,45/aspect):study==='facade'?Math.max(stories*3.2+3.2,10/aspect):Math.max(4.6,6.6/aspect);
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.1;camera.far=180;
  camera.position.copy(target).add(study==='civilians'?new THREE.Vector3(9,4.5,14):new THREE.Vector3(8,6,16));
  camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
}
function resize(){const d=dimensions();renderer.setSize(d.w,d.h,false);for(const p of panes)cameraFor(p.camera,d.pw,d.ph);}
function draw(value=snapshot){
  if(!value||!panes[0].art)return;
  snapshot=value;const d=dimensions();renderer.setScissorTest(true);
  for(const [index,p]of panes.entries()){
    p.art.update(value,{playerTime:value.clocks.player,worldTime:value.clocks.world});
    const x=d.stack?0:index*d.pw,y=d.stack?(1-index)*d.ph:0;
    renderer.setViewport(x,y,d.pw,d.ph);renderer.setScissor(x,y,d.pw,d.ph);renderer.render(p.scene,p.camera);
  }
  renderer.setScissorTest(false);$('status').textContent=study+' · '+value.world.modules.length+' modules · original model sizes · GPU '+renderer.info.memory.geometries+' geometries / '+renderer.info.memory.textures+' textures';
}
function reset(options={}){
  study=options.study||study;stories=Number(options.stories||stories);facade=options.facade||facade;door=options.door||door;
  if(!['courtyard','gallery','facade','civilians'].includes(study)||!WALL_STORY_OPTIONS[stories-1])throw Error('Invalid art study');
  simulation?.dispose();simulation=createSimulation({scenario:scenario()});snapshot=simulation.snapshot();
  for(const [key,value]of Object.entries({study,stories,facade,door}))$(key).value=value;
  resize();draw();return snapshot;
}
function advance(seconds){for(let t=0;t<seconds-1e-9;t+=1/60)simulation.advance(Math.min(1/60,seconds-t));draw(simulation.snapshot());return snapshot;}
function swap(reverse){reversed=reverse;panes[0].art.setSkinSet(reverse?'exposition-v1':'inherited');panes[1].art.setSkinSet(reverse?'inherited':'exposition-v1');draw();}
function geometrySignature(scene){
  let hash=2166136261,meshes=0,vertices=0;const feed=n=>{hash=Math.imul(hash^(Math.round(n*1e6)|0),16777619);};
  scene.traverse(o=>{if(!o.isMesh)return;meshes++;for(const name of ['position','normal','uv','skinIndex','skinWeight','paintPosition','paintNormal','paintPart']){
    const a=o.geometry.attributes[name];if(!a)continue;if(name==='position')vertices+=a.count;
    for(const n of a.array)feed(n);
  }if(o.geometry.index)for(const n of o.geometry.index.array)feed(n);for(const n of o.matrixWorld.elements)feed(n);if(o.isSkinnedMesh)for(const n of o.skeleton.boneMatrices)feed(n);});
  return{hash:hash>>>0,meshes,vertices};
}
function headIdentity(){
  const target=new THREE.WebGLRenderTarget(420,280),camera=new THREE.OrthographicCamera(-3,3,2,-2,.1,100),pixels=new Uint8Array(420*280*4),saved=[],hashes=[];
  camera.position.set(10,2.8,17);camera.lookAt(10,1.45,9);camera.updateMatrixWorld();
  const previous=renderer.getRenderTarget(),clipping=renderer.localClippingEnabled;
  try{
    renderer.localClippingEnabled=true;renderer.setScissorTest(false);renderer.setRenderTarget(target);
    for(const pane of panes){
      const background=pane.scene.background,materials=new Map();pane.scene.background=new THREE.Color(0);
      pane.scene.traverse(o=>{if(o.isMesh){saved.push([o,o.visible]);const a=o.geometry.attributes.paintPart;o.visible=Boolean(o.isSkinnedMesh&&a?.getX(0)>=6.5);
        if(o.visible)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!materials.has(m)){materials.set(m,m.clippingPlanes);m.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),-1.33)];}}});
      renderer.render(pane.scene,camera);renderer.readRenderTargetPixels(target,0,0,420,280,pixels);
      let hash=2166136261,marked=0;for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if(i%4!==3&&pixels[i]>0)marked++;}
      hashes.push({hash:hash>>>0,marked});
      pane.scene.background=background;for(const [m,planes]of materials)m.clippingPlanes=planes;
      for(const [o,visible]of saved.splice(0))o.visible=visible;
    }
  }finally{renderer.setRenderTarget(previous);renderer.localClippingEnabled=clipping;target.dispose();draw();}
  return{passed:hashes[0].marked>100&&hashes[0].hash===hashes[1].hash,hashes,clipHeight:1.33};
}
async function createPanes(){for(const [i,p]of panes.entries())p.art=await createArtScene({THREE,scene:p.scene,renderer,skinSet:i?'exposition-v1':'inherited',enableSkinSwaps:true});}
async function validate(){
  const errors=[],check=(ok,msg)=>{if(!ok)errors.push(msg);},memory=()=>({...renderer.info.memory}),result={storyCanvases:[],skinCycles:[],actorCycles:[]};
  const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
  swap(false);reset({study:'civilians',facade:'inherited-plaster',stories:3,door:'open'});draw();draw();
  const s=freeze(structuredClone(snapshot)),immutable=JSON.stringify(s);draw(s);check(JSON.stringify(s)===immutable,'Snapshot mutated');
  result.headIdentity=headIdentity();check(result.headIdentity.passed,'Original head/fur paint changed');
  draw(s);const frozen=renderer.domElement.toDataURL();draw(s);check(frozen===renderer.domElement.toDataURL(),'Fixed-clock pixels changed');
  for(const count of [1,2,3,4,5]){
    reset({study:'facade',stories:count});const signatures=panes.map(p=>geometrySignature(p.scene));
    check(JSON.stringify(signatures[0])===JSON.stringify(signatures[1]),'Geometry/pose differs between skins at '+count+' stories');
    const m=snapshot.world.modules.find(m=>m.form==='doorway'),clear=new THREE.Vector3(m.x,1.1,m.y);
    for(const p of panes){const root=p.scene.getObjectByName('Exposition construction kit');let filled=false;root.traverse(o=>{if(o.isMesh&&new THREE.Box3().setFromObject(o).containsPoint(clear))filled=true;});check(!filled,'Open ground doorway filled');}
    const coordinates=panes[1].scene.getObjectByName('module-part:'+m.id+':lintel').geometry.attributes.tbFacadeCoord;
    let maxV=0;for(let i=0;i<coordinates.count;i++)maxV=Math.max(maxV,coordinates.getY(i));
    check(Math.abs(maxV-count)<1e-5,'Upper lintel did not receive repeated story coordinates');
    check(m.opening.width===1.4&&m.opening.height===2.3,'Ground opening scaled with stories');
    result.storyCanvases.push({stories:count,height:m.height,storyHeight:m.storyHeight,maxStoryUV:maxV,signatures,opening:{...m.opening}});
  }
  reset({study:'facade',stories:5,door:'closed'});for(const p of panes){const leaf=p.scene.getObjectByName('module-part:canvas-5:closed-door'),box=new THREE.Box3().setFromObject(leaf);check(Math.abs(box.max.y-2.3)<1e-5,'Closed leaf stretched');}
  reset({study:'courtyard',facade:'inherited-plaster',door:'open'});for(const id of ['inherited-brick','inherited-wood','inherited-plaster'])reset({facade:id});
  // Warm both palette directions before recording steady-state GPU usage.
  swap(true);swap(false);
  const physics=JSON.stringify(snapshot.world.obstacles),builds=panes.map(p=>p.art.diagnostics().exterior.builds),baseline=memory();
  for(let i=0;i<8;i++){swap(i%2===0);check(JSON.stringify(snapshot.world.obstacles)===physics,'Appearance changed collision');check(panes.every((p,k)=>p.art.diagnostics().exterior.builds===builds[k]),'Appearance rebuilt geometry');result.skinCycles.push(memory());}
  check(result.skinCycles.every(m=>m.geometries===baseline.geometries&&m.textures===baseline.textures),'Appearance swap grew GPU memory');swap(false);
  const base=structuredClone(snapshot);for(let i=0;i<4;i++){draw({...base,actors:[]});draw(base);result.actorCycles.push(memory());}
  check(result.actorCycles.every(m=>m.geometries===baseline.geometries&&m.textures===baseline.textures),'Civilian recreation grew GPU memory');
  reset({study:'civilians'});advance(1);result.motion={normal:snapshot.actors[0].travelled};simulation.dispatch({type:'drug',drug:'powder'});advance(1);result.motion.powder=snapshot.actors[0].travelled-result.motion.normal;
  check(Math.abs(result.motion.normal-.8)<1e-7&&Math.abs(result.motion.powder-.28)<1e-7,'Skins changed world-time gait');
  const poses=panes.map(p=>geometrySignature(p.scene));check(JSON.stringify(poses[0])===JSON.stringify(poses[1]),'Walking pose differs');
  const burnSpec={width:10,height:10,player:{x:5,y:7},actors:[],obstacles:[],modules:[{id:'burn-gate',form:'doorway',x:5,y:5,width:4,depth:.3,stories:5,heading:0,physicalMaterial:'wood',opening:{width:1.4,height:2.3,state:'open'},skinSlots:slots(),sourceRefs:['game:skin-burn-review']},{id:'burn-roof',form:'roof-gable',x:5,y:5,width:5,depth:3,height:1,baseHeight:16,heading:0,physicalMaterial:'wood',skinSlots:slots(),supportModuleIds:['burn-gate'],sourceRefs:['game:skin-burn-review']}],ignitions:[{x:4.15,y:5,radius:1.5,heat:4}]};
  const burn=createSimulation({scenario:burnSpec,config:{fuel:{surfaceBurnRate:1000},fire:{damagePerSecond:0}}});let burnt;try{burn.advance(1/60);burnt=burn.advance(1/60);}finally{burn.dispose();}
  draw(freeze(burnt));result.damage=panes.map(p=>p.art.diagnostics().exterior);
  check(result.damage.every(d=>!d.renderedPartIds.includes('burn-gate:pier-left')&&!d.renderedPartIds.includes('burn-gate:lintel')&&!d.renderedPartIds.includes('burn-roof:roof-envelope')&&d.renderedPartIds.includes('burn-gate:pier-right')),'Skins resurrected destroyed or unsupported parts');
  for(const p of panes){p.art.dispose();p.art.dispose();renderer.render(p.scene,p.camera);}result.disposed=memory();check(!result.disposed.geometries&&!result.disposed.textures,'Full disposal retained GPU resources');
  await createPanes();reset({study:'courtyard',facade:'inherited-plaster',stories:3,door:'open'});result.passed=!errors.length;result.errors=errors;result.fixedClockPixels=true;result.snapshotImmutable=true;return result;
}
const observer=new ResizeObserver(()=>{if(alive){resize();draw();}});observer.observe(stage);
try{
  await createPanes();$('loading').remove();reset();
  for(const id of ['study','stories','facade','door'])$(id).onchange=e=>reset({[id]:e.target.value});
  $('step').onclick=()=>advance(1);$('reset').onclick=()=>reset();
  $('review').onclick=async()=>{if(validating)return;validating=true;$('review').disabled=true;$('review-output').hidden=false;$('review-output').textContent='Running paired-scene review…';try{$('review-output').textContent=JSON.stringify(await validate(),null,2);}catch(e){$('review-output').textContent=JSON.stringify({passed:false,error:e.stack},null,2);}finally{validating=false;$('review').disabled=false;}};
  window.skinArt={ready:true,THREE,renderer,panes,reset,draw,advance,swap,validate,headIdentity,geometrySignature,get snapshot(){return structuredClone(snapshot);},diagnostics:()=>({study,stories,facade,door,reversed,memory:{...renderer.info.memory},panes:panes.map(p=>p.art.diagnostics()),canvas:dimensions()}),dispose(){if(!alive)return;alive=false;observer.disconnect();simulation?.dispose();for(const p of panes)p.art?.dispose();renderer.dispose();renderer.forceContextLoss();}};
  addEventListener('pagehide',()=>window.skinArt.dispose(),{once:true});
}catch(e){console.error(e);$('loading').textContent=e.message;window.skinArt={ready:false,error:e.stack};}
