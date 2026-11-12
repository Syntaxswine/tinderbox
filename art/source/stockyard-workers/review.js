import * as T from '../../../src/runtime/three.js';
import {createRuntime} from '../../../src/runtime/index.js';
import {createSimulation} from '../../../src/simulation/index.js';
import {NEIGHBORHOOD_SCENARIO} from '../../../src/content/neighborhood.js';
import {createArtScene} from '../../../src/art/index.js';
import {mountUI} from '../../../src/ui/index.js';
import {loadCharacterKit} from '../../../src/reuse/characters.js';
import {createStockyardWorkerSkin,STOCKYARD_WORKER_SKINS} from '../../../src/art/stockyard-worker-skins.js';
import {loadStockyardWorkerPaint} from '../../../src/art/stockyard-worker-paint.js';
import {createStockyardAsset} from '../../../assets/art/stockyards/index.js';
const errors=[],views=[],records=[],resources=[],garments=[],kits=[],rigs=[],programs=[],shaders=[];
window.addEventListener('error',e=>errors.push(e.message));
window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const originalError=console.error;console.error=(...args)=>{errors.push(args.map(String).join(' '));originalError(...args);};
let runtime,renderer,simulation,workerPaint;
const caption=(canvas,title,subtitle)=>{
 const output=document.createElement('canvas');output.width=canvas.width;output.height=canvas.height+100;const ctx=output.getContext('2d');
 ctx.fillStyle='#26271f';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(canvas,0,0);
 ctx.fillStyle='#ead8b2';ctx.font='600 24px StockBesley';ctx.fillText(title,28,canvas.height+35);ctx.font='17px Georgia';ctx.fillStyle='#d0c7b4';ctx.fillText(subtitle,28,canvas.height+69);return output;
};
const capture=(name,canvas,title,subtitle,metadata)=>{const output=caption(canvas,title,subtitle);views.push({name,jpeg:output.toDataURL('image/jpeg',.95)});records.push({name,title,subtitle,dimensions:[output.width,output.height],...metadata});};
try{
 const font=new FontFace('StockBesley','url('+new URL('../../../assets/art/ui/typography/besley/Besley[wght].ttf',import.meta.url).href+')',{weight:'500 800'});await font.load();document.fonts.add(font);
 const fixture=structuredClone(NEIGHBORHOOD_SCENARIO);fixture.player={...fixture.player,x:20,y:18,tool:'matches'};
 fixture.actors=fixture.actors.map(a=>a.id==='neighbor-goat'?{...a,x:18,y:19.6667,route:[{x:18,y:19.6667},{x:19,y:19.6667}]}:a.id==='neighbor-horse'?{...a,x:22,y:16.3333,route:[{x:22,y:16.3333},{x:23,y:16.3333}]}:a);
 simulation=createSimulation({scenario:fixture,seed:1893,characterId:'bear'});
 let artUpdateIsolation=true,artFactory;
 runtime=await createRuntime({root:document.getElementById('viewport'),uiRoot:document.getElementById('hud'),simulation,characterId:'bear',autoStart:false,mountUI,
  createArtScene:async args=>{const a=await createArtScene({...args,stockyardWorkers:true});artFactory=a;const update=a.update;a.update=(s,t)=>{const before=JSON.stringify(s);update(s,t);if(JSON.stringify(s)!==before)artUpdateIsolation=false;};return a;},
  rendererFactory:()=>{
   const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{antialias:true,preserveDrawingBuffer:true});
   if(!gl)throw Error('Native WebGL2 unavailable');
   const cp=gl.createProgram.bind(gl),cs=gl.createShader.bind(gl);gl.createProgram=()=>{const value=cp();programs.push(value);return value;};gl.createShader=t=>{const value=cs(t);shaders.push(value);return value;};
   renderer=new T.WebGLRenderer({canvas,context:gl,antialias:true,preserveDrawingBuffer:true});return renderer;
  }});
 renderer.setPixelRatio(1);renderer.setSize(1600,950);runtime.advance(0);
 let diagnostics=runtime.artDiagnostics();
 if(diagnostics.workerPaint?.textures!==3)throw Error('Actual game worker paint did not load');
 if(!diagnostics.stockyardWorkers||diagnostics.bearProtagonist.stockyardWorker?.skin!=='yard-foreman')throw Error('Actual game player wardrobe was not wired');
 if(diagnostics.civilianActors.length!==2||diagnostics.civilianActors.some(a=>!a.stockyardWorker))throw Error('Actual civilian wardrobe was not wired');
 if(diagnostics.patrolActors.some(a=>a.stockyardWorker)||diagnostics.patrolActors[0]?.uniform?.id==='stockyard-worker')throw Error('Police identity changed');
 renderer.getContext().finish();
 capture('game-normal',renderer.domElement,'Painted stockyard workwear / actual Catalogue Street runtime','Native game zoom. Staged existing civilian positions; original bodies, collision, gait and police are preserved.',{kind:'actual-game',diagnostics,camera:runtime.metrics().camera});
 runtime.zoom(2.15);runtime.dispatch({type:'pause',paused:false});runtime.advance(.5);runtime.dispatch({type:'pause',paused:true});runtime.advance(1/60);renderer.getContext().finish();
 diagnostics=runtime.artDiagnostics();
 capture('game-close-walking',renderer.domElement,'Painted stockyard workwear / live game detail','Goat yard hand, bear foreman and horse packing worker. Existing runtime actors and evaluated native walking poses.',{kind:'actual-game',diagnostics,camera:runtime.metrics().camera});
 if(!artUpdateIsolation)throw Error('Wardrobe presentation mutated the supplied game snapshot');
 workerPaint=await loadStockyardWorkerPaint(T);
 // The same borrowed renderer produces separate fitted-asset studies after the actual game frames.
 const scene=new T.Scene(),hemi=new T.HemisphereLight(0xe3e5d6,0x574735,1.8),sun=new T.DirectionalLight(0xffdbb0,3.0);sun.position.set(5,8,6);scene.add(hemi,sun);
 scene.background=new T.Color(0xb3af94);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const groundGeometry=new T.PlaneGeometry(100,100).rotateX(-Math.PI/2),groundMaterial=new T.MeshStandardMaterial({color:0x77745a,roughness:1});resources.push(groundGeometry,groundMaterial);
 const ground=new T.Mesh(groundGeometry,groundMaterial);ground.position.y=-.124;ground.receiveShadow=true;scene.add(ground);
 const pens=createStockyardAsset(T,{bays:2,skin:'jubilee',gateAngles:[Math.PI/2,0]});scene.add(pens.root);resources.push(pens);
 for(const species of ['goat','bear','horse']){const kit=await loadCharacterKit({characterId:species,THREE:T,renderer,unarmed:true});kits.push(kit);const rig=kit.create();rig.setHeldVisible(false);rigs.push(rig);scene.add(rig.root);}
 const chosen=['yard-hand','yard-foreman','packing-worker'];
 for(let i=0;i<rigs.length;i++){const rig=rigs[i];garments.push(createStockyardWorkerSkin(T,rig,{skin:chosen[i],texture:workerPaint.get(chosen[i])}));rig.update({x:1+i*2.1,y:-1.8,heading:.35,travelled:i*.22,moving:i>0,tool:'matches'},.5);rig.setHeldVisible(false);rig.root.position.y=-.124;}
 let camera=new T.OrthographicCamera(-6.1,6.1,6.1*950/1600,-6.1*950/1600,.1,120);camera.position.set(11,6,-12);camera.lookAt(3.3,1.15,.15);scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.getContext().finish();
 capture('stockyard-crew',renderer.domElement,'Painted stockyard workers / approved pen kit','Three workwear roles at original authored scale. Fitted art study; livestock and stockyard map integration are separate.',{kind:'asset-study',nativeScale:rigs.map(r=>r.worker.root.scale.toArray()),workerSkins:garments.map(g=>g.diagnostics()),pen:pens.diagnostics()});
 for(const g of garments)g.dispose();garments.length=0;pens.root.visible=false;ground.visible=false;
 for(const view of [{name:'nine-native-fits',side:1},{name:'rear-native-fits',side:-1}]){
 const sheet=document.createElement('canvas');sheet.width=1500;sheet.height=1900;const ctx=sheet.getContext('2d');ctx.fillStyle='#2b2b24';ctx.fillRect(0,0,1500,1900);
 const gridRecords=[];renderer.setSize(500,570);scene.background=new T.Color(0xb3af94);
 for(let row=0;row<STOCKYARD_WORKER_SKINS.length;row++)for(let column=0;column<rigs.length;column++){
  const rig=rigs[column],species=rig.root.userData.species,skin=STOCKYARD_WORKER_SKINS[row];for(const r of rigs)r.root.visible=r===rig;
  const clothing=createStockyardWorkerSkin(T,rig,{skin,texture:workerPaint.get(skin)});rig.update({x:0,y:0,heading:.20,travelled:row===2?.37:0,moving:row===2,tool:'matches'},.5);rig.root.position.y=0;rig.setHeldVisible(false);
  camera=new T.OrthographicCamera(-.95,.95,1.083,-1.083,.1,20);camera.position.set(3.6*view.side,2.0,4.8*view.side);camera.lookAt(0,.83,0);scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.getContext().finish();
  const x=column*500,y=row*620;ctx.drawImage(renderer.domElement,x,y);ctx.fillStyle='#ead8b2';ctx.font='600 20px StockBesley';ctx.fillText(species+' / '+skin,x+18,y+600);
  gridRecords.push(clothing.diagnostics());clothing.dispose();
 }
 views.push({name:view.name,jpeg:sheet.toDataURL('image/jpeg',.95)});records.push({name:view.name,kind:'asset-study',dimensions:[1500,1900],fits:gridRecords,caption:'Three original native species, each in three independent stockyard worker looks. No body rescaling.'});
 }

 const comparison=document.createElement('canvas');comparison.width=1500;comparison.height=1280;const compare=comparison.getContext('2d');compare.fillStyle='#2b2b24';compare.fillRect(0,0,1500,1280);
 const compareRecords=[];
 for(let row=0;row<2;row++)for(let column=0;column<rigs.length;column++){
  const rig=rigs[column],skin=chosen[column];for(const r of rigs)r.root.visible=r===rig;
  const clothing=row===1?createStockyardWorkerSkin(T,rig,{skin,texture:workerPaint.get(skin)}):null;
  rig.update({x:0,y:0,heading:.20,travelled:0,moving:false,tool:'matches'},.5);rig.root.position.y=0;rig.setHeldVisible(false);
  camera=new T.OrthographicCamera(-.95,.95,1.083,-1.083,.1,20);camera.position.set(3.6,2,4.8);camera.lookAt(0,.83,0);scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.getContext().finish();
  compare.drawImage(renderer.domElement,column*500,row*620);compare.fillStyle='#ead8b2';compare.font='600 19px StockBesley';compare.fillText((row?'Painted worker / ':'Original AFT paint / ')+rig.root.userData.species,column*500+18,row*620+600);
  compareRecords.push({species:rig.root.userData.species,look:row?skin:'original-native-paint',nativeScale:rig.worker.root.scale.toArray()});clothing?.dispose();
 }
 views.push({name:'reference-and-workers',jpeg:comparison.toDataURL('image/jpeg',.95)});records.push({name:'reference-and-workers',kind:'asset-study',dimensions:[1500,1280],fits:compareRecords,caption:'Original native painting above; revised worker painting below. Same rigs, camera, pose and study lighting.'});
 const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
 const receipt={task:'Stockyard worker skins',three:T.REVISION,gpu:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),artUpdateIsolation,errors,
  programs:programs.filter(p=>gl.isProgram(p)).map(p=>({linked:gl.getProgramParameter(p,gl.LINK_STATUS),log:gl.getProgramInfoLog(p)})),
  shaders:shaders.filter(s=>gl.isShader(s)).map(s=>({compiled:gl.getShaderParameter(s,gl.COMPILE_STATUS),log:gl.getShaderInfoLog(s)})),views:records,
  limits:['Actual game frames use controlled existing actor placements in Catalogue Street. No stockyard population AI or livestock is added.','Nine-fit and pen-crew pictures are asset studies, not production map placement.']};
 if(errors.length)throw Error(errors.join(';'));
 const packet=document.createElement('script');packet.id='capture-packet';packet.type='application/json';packet.textContent=JSON.stringify({receipt,views});document.body.append(packet);
 document.getElementById('status').textContent='Captured '+views.length+' JPG views';
}catch(error){errors.push(error.stack||String(error));document.getElementById('status').textContent=errors.join(';');const p=document.createElement('script');p.id='capture-failure';p.type='application/json';p.textContent=JSON.stringify(errors);document.body.append(p);}
finally{for(const g of garments)g.dispose();for(const k of kits)k.dispose();workerPaint?.dispose();for(const r of resources)r.dispose();runtime?.dispose();simulation?.dispose();}
