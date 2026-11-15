import * as T from '../../../src/runtime/three.js';
import {loadCharacterKit} from '../../../src/reuse/characters.js';
import {createCharacterShroud} from '../../../src/art/character-shroud/index.js';
import {createChicago1893BeatUniform} from '../../../src/art/chicago-beat-uniform.js';
import {createFire} from '../../../src/art/fire.js';
const errors=[];globalThis.__shroudPreviewErrors=errors;addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const width=1280,height=800,span=12.6,renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(width,height);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0x35281e);
renderer.debug.onShaderError=(gl,p,v,f)=>{throw Error([gl.getProgramInfoLog(p),gl.getShaderInfoLog(v),gl.getShaderInfoLog(f)].join(' / '));};
const scene=new T.Scene(),camera=new T.OrthographicCamera(-span*width/height/2,span*width/height/2,span/2,-span/2,.1,300);camera.position.set(22,15.4,24);camera.lookAt(12,1.4,12);camera.updateMatrixWorld(true);
const sun=new T.DirectionalLight(0xffffff,2.5);sun.position.set(-8,16,6);scene.add(new T.HemisphereLight(0xfff1d1,0x334852,2.3),sun);
const groundGeometry=new T.BoxGeometry(20,.12,20),groundMaterial=new T.MeshStandardMaterial({color:0x71806a,roughness:1}),ground=new T.Mesh(groundGeometry,groundMaterial);ground.position.set(12,-.06,12);scene.add(ground);
const tileGeometry=new T.BoxGeometry(1,.12,1),tileMaterial=new T.MeshStandardMaterial({color:0x8b7958,roughness:1});const right=new T.Vector3(12,0,-10).normalize(),base=new T.Vector3(12,0,12),platforms=[];
const kits=[],rigs=[],placements=[],uniforms=[],names=['bear','goat','horse','officer'];
for(const [i,characterId]of names.entries()){
  const species=characterId==='officer'?'goat':characterId,kit=i===3?kits[1]:await loadCharacterKit({characterId:species,THREE:T,renderer,unarmed:true}),rig=kit.create(),p=base.clone().addScaledVector(right,(i-1.5)*3.05);if(i===2)p.y=2.12;if(i!==3)kits.push(kit);rigs.push(rig);placements.push(p);scene.add(rig.root);rig.setHeldVisible(false);if(i===3)uniforms.push(createChicago1893BeatUniform(T,rig));
  if(i===2)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){const tile=new T.Mesh(tileGeometry,tileMaterial);tile.position.set(p.x+x,2.06,p.z+z);scene.add(tile);platforms.push(tile);}
}
const textureBase=new URL('../../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/effects/painted-fire/',import.meta.url),loader=new T.TextureLoader();
const [flame,smoke,burst]=await Promise.all(['flame-atlas-v1.png','smoke-atlas-v1.png','tank-burst-atlas-v1.png'].map(name=>loader.loadAsync(new URL(name,textureBase).href)));
const fieldData=new Uint8Array(32*32*4);for(let i=3;i<fieldData.length;i+=4)fieldData[i]=255;const fieldTexture=new T.DataTexture(fieldData,32,32,T.RGBAFormat);fieldTexture.needsUpdate=true;
const oldFire=createFire(T,{flame,smoke,burst},{field:{value:fieldTexture},grid:{value:new T.Vector2(32,32)},cellSize:{value:1}}),shroud=createCharacterShroud(T);scene.add(oldFire.root,shroud.root);
for(let i=0;i<rigs.length;i++)shroud.bind(names[i],{species:names[i]==='officer'?'goat':names[i],worker:rigs[i].worker});
const output=document.createElement('canvas');output.width=width;output.height=height+74;document.body.append(output);const ctx=output.getContext('2d'),sampleWind=(_x,_y,_z,out)=>(out[0]=1.5,out[1]=out[2]=0,out),windMetadata={kind:'ambient-control',speed:1.5,direction:[1,0,0],obstacleResolved:false};
const frameRecords=[];let disposed=false,lastTime=0,lastMode='after';
function draw(time,mode='after'){
  if(disposed)throw Error('Factory preview disposed');lastTime=time;lastMode=mode;
  const active=time>=.02&&time<2.75,walk=T.MathUtils.smoothstep(time,.4,2.4)*.72,heading=.45-.9*T.MathUtils.smoothstep(time,.6,2.4),actors=[];
  for(let i=0;i<rigs.length;i++){const p=placements[i],record={id:names[i],species:names[i]==='officer'?'goat':names[i],x:p.x+walk*.45,y:p.z-walk*.35,elevation:p.y,heading,travelled:walk,moving:time>.4&&time<2.4,tool:'matches',radius:.5,height:1.66,hp:100,...(active?{burn:{ignitedAt:.02,expiresAt:2.75}}:{})};rigs[i].update(record,time);rigs[i].setHeldVisible(false);actors.push(record);}
  oldFire.root.visible=mode==='before';shroud.root.visible=mode!=='before';
  if(mode==='before')oldFire.update({version:1,tick:Math.round(time*60),clocks:{world:time,player:time},player:{id:'offscreen-control',x:24,y:24,tool:'matches'},actors,world:{width:32,height:32,fireCellSize:1},cells:[],events:[]},time,{camera});
  else shroud.update({worldTime:time,camera,sampleWind,windMetadata,characters:names.map(id=>({id,active,startedAt:.02,intensity:1}))});
  renderer.render(scene,camera);ctx.fillStyle='#2c2119';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(renderer.domElement,0,38);
  ctx.fillStyle='#f0dfbf';ctx.font='21px Georgia';ctx.textAlign='left';ctx.fillText((mode==='before'?'Production two-card renderer':'Restored character shroud')+' | posed factory control | '+time.toFixed(2)+' world s | 12.6 m span',18,27);
  ctx.font='16px Georgia';ctx.fillStyle='#e2d0ae';ctx.fillText('Native model, paint and scale. Factory activation is explicit; this preview does not exercise gameplay ignition or damage.',18,height+62);
  for(let i=0;i<names.length;i++){const p=new T.Vector3(placements[i].x,placements[i].y+1.88,placements[i].z).project(camera);ctx.textAlign='center';ctx.font='18px Georgia';ctx.fillStyle='#eadab7';ctx.fillText(names[i].toUpperCase()+(i===2?' | 2.12 m floor':''),(p.x*.5+.5)*width,(-p.y*.5+.5)*height+24);}
  const diagnostic=shroud.diagnostics();return {time,mode,active,shroud:diagnostic,oldFire:oldFire.diagnostics(),rigs:rigs.map((r,i)=>({species:names[i],nativeScale:r.worker.root.scale.toArray(),position:r.root.position.toArray()})),renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},errors:[...errors]};
}
async function recordClip(){
  const stream=output.captureStream(15),mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));if(!mime)throw Error('Native browser video encoder unavailable');
  const chunks=[],recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2200000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start();const start=performance.now();
  await new Promise(resolve=>{function frame(now){const t=Math.min(3.25,(now-start)/1000);const result=draw(t);frameRecords.push({time:t,active:result.active,flame:result.shroud.flameSplats,smoke:result.shroud.smokeSplats,updateMs:result.shroud.lastUpdateMs});if(t<3.25)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  recorder.stop();await stopped;for(const track of stream.getTracks())track.stop();const blob=new Blob(chunks,{type:mime}),bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return {mime,base64:btoa(binary),bytes:bytes.length,frames:frameRecords};
}
function dispose(){if(disposed)return;shroud.dispose();oldFire.dispose();for(const uniform of uniforms)uniform.dispose();for(const rig of rigs){rig.dispose();rig.worker.skeleton.dispose();}for(const kit of kits)kit.dispose();ground.removeFromParent();for(const p of platforms)p.removeFromParent();groundGeometry.dispose();groundMaterial.dispose();tileGeometry.dispose();tileMaterial.dispose();for(const texture of [flame,smoke,burst,fieldTexture])texture.dispose();renderer.render(new T.Scene(),camera);const memory={...renderer.info.memory};renderer.dispose();disposed=true;return {shroud:shroud.diagnostics().resources,rendererMemory:memory};}
globalThis.__shroudPreview={draw,capture:()=>output.toDataURL('image/jpeg',.95),recordClip,dispose,ready:true,info:()=>({errors:[...errors],camera:{span,position:camera.position.toArray(),target:[12,1.4,12]},viewport:[width,height],lastTime,lastMode,gpu:(()=>{const gl=renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);})()})};draw(1.2);
