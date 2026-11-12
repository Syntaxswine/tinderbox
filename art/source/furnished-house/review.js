import * as T from '../../../src/runtime/three.js';
import {createFurnishedHouseArt} from '../../../workbenches/furnished-house/art.js';
import {createStreetNight} from '../../../src/art/street-night.js';
import {loadCharacterKit} from '../../../src/reuse/characters.js';
const errors=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));const prior=console.error;console.error=(...a)=>{errors.push(a.map(String).join(' '));prior(...a);};
const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{antialias:true,preserveDrawingBuffer:true}),programs=[],shaders=[];
if(!gl)throw Error('Native WebGL2 required');
const cp=gl.createProgram.bind(gl),cs=gl.createShader.bind(gl);gl.createProgram=()=>{const p=cp();programs.push(p);return p;};gl.createShader=t=>{const s=cs(t);shaders.push(s);return s;};
const renderer=new T.WebGLRenderer({canvas,context:gl,antialias:true,preserveDrawingBuffer:true});renderer.setSize(1600,950);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.toneMappingExposure=1;
const scene=new T.Scene();scene.background=new T.Color(0x101b30);const night=createStreetNight(T,scene,renderer);scene.add(night.root);document.body.append(canvas);
const moon=night.root.children.find(l=>l.isDirectionalLight);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:.2,far:60});moon.shadow.camera.updateProjectionMatrix();moon.target.position.set(5,1,4);scene.add(moon.target);moon.shadow.normalBias=.018;
const gg=new T.PlaneGeometry(60,60),gm=new T.MeshStandardMaterial({color:0x584c37,roughness:1});gg.rotateX(-Math.PI/2);const ground=new T.Mesh(gg,gm);ground.position.set(5,-.01,4);ground.receiveShadow=true;scene.add(ground);
let art,kit,goat;
try{
 const font=new FontFace('FurnishedBesley','url('+new URL('../../../assets/art/ui/typography/besley/Besley[wght].ttf',import.meta.url).href+')',{weight:'500 800'});await font.load();document.fonts.add(font);
 const data=await fetch('../../../workbenches/furnished-house/house-data.json').then(r=>r.json());
 [art,kit]=await Promise.all([createFurnishedHouseArt(T,{renderer,data}),loadCharacterKit({characterId:'goat',THREE:T,renderer,unarmed:true})]);scene.add(art.root);goat=kit.create();scene.add(goat.root);goat.setHeldVisible(false);
 const source=data.surfaces.find(s=>s.id===data.replayTargets.kitchen.sourceSurfaceId),floor=data.surfaces.find(s=>s.id==='floor/l0/2,10'),roof=data.surfaces.find(s=>s.kind==='roof'),entry=data.openings.find(o=>o.entry);
 const base={version:1,revision:0,tick:0,worldTime:0,full:true,boundaries:[],supports:[],items:[],falls:[],events:[],parts:[],metrics:{},fireSamples:[],occupancy:[]};
 const sample={id:'controlled-support-check',sourceSurfaceId:source.id,buildingId:data.buildingId,part:'walls',x:0,y:1.01,z:6.25,nx:-1,ny:0,nz:0,area:source.area,flame:.8,smoke:.5,ignitionTime:0};
 const bodySamples=data.surfaces.filter(s=>s.level===0&&(s.kind==='wall'||s.kind==='floor'&&!s.supportType)&&s.material==='timber').map(s=>{
  const p=s.triangles.flat().reduce((n,p)=>(p.forEach((v,i)=>n[i]+=v),n),[0,0,0]).map(v=>v/s.triangles.flat().length);
  return {id:'controlled:'+s.id,sourceSurfaceId:s.id,buildingId:data.buildingId,part:s.kind,x:p[0],y:p[1],z:p[2],nx:s.normal[0],ny:s.normal[1],nz:s.normal[2],area:s.area,flame:.85,smoke:.5,ignitionTime:10,...(s.kind==='floor'?{floorFootprint:s.triangles}:{})};
 });
 const charred=data.surfaces.filter(s=>s.material==='timber').map(s=>({id:s.id,sourceSurfaceId:s.id,triangles:s.triangles,intact:true,charFraction:.75,openFraction:0}));
 const views=[
  {name:'qa-exterior',mode:'exterior',level:0,camera:[20,14,-22],target:[5,2,4],halfWidth:11,frame:base,actor:[5.00375,.48,-1.3],title:'Furnished Hopkins 15 | native structural composition',caption:'Artist WebGL fixture. Actual exported geometry and native goat. Six unchanged entry blocks; source roof union and composed route.'},
  {name:'qa-kitchen-cutaway',mode:'cutaway',level:0,camera:[-12,17,22],target:[4.5,.9,4.5],halfWidth:8.7,frame:{...base,revision:1,tick:300,worldTime:10,fireSamples:[sample],boundaries:[{id:entry.surfaceId,sourceSurfaceId:entry.surfaceId,triangles:data.surfaces.find(s=>s.id===entry.surfaceId).triangles,intact:true,openFraction:1,charFraction:0}]},actor:[4.35,.48,5.75],title:'Kitchen and stair alcove | physical source QA',caption:'Controlled artist frame tests the accepted flame at its actual siding support. This image does not establish simulation timing.'},
  {name:'qa-local-retirement',mode:'cutaway',level:0,camera:[-12,17,22],target:[4.5,.9,4.5],halfWidth:8.7,frame:{...base,revision:2,tick:600,worldTime:20,boundaries:[{id:floor.id,sourceSurfaceId:floor.id,triangles:floor.triangles,intact:false,openFraction:1,charFraction:1}]},actor:[4.35,.48,5.75],title:'Local floor retirement | one support and its shadow',caption:'Controlled mask proof: one lower wood patch removed. Upper floor and roof retain their own physical state; no vertical-column clearing.'}
  ,{name:'qa-flame-body',mode:'cutaway',level:0,camera:[20,14,-13],target:[5,1,5],halfWidth:10.1,frame:{...base,revision:3,tick:3600,worldTime:120,fireSamples:bodySamples,boundaries:charred},actor:[5.00375,.48,-1.3],title:'Low connected flame body | controlled dense support',caption:'All supplied samples remain accounted. Adjacent lit support overlaps; small folds replace repeated tall needles. Not a simulation trace.'}
  ,{name:'qa-preheat-smoke',mode:'cutaway',level:0,camera:[-12,12,17],target:[3,1,6],halfWidth:7,frame:{...base,revision:4,tick:60,worldTime:2,fireSamples:[{...sample,flame:0,smoke:.75,preheat:true}]},actor:[4.35,.48,5.75],title:'Unlit siding | authoritative preheat smoke',caption:'Zero flame and zero firelight. Neutral smoke consumes supplied heating/cooling state; no renderer-derived ignition.'}
 ];
 const output=[],records=[];
 for(const v of views){
  const c=new T.OrthographicCamera(-v.halfWidth,v.halfWidth,v.halfWidth*950/1600,-v.halfWidth*950/1600,.1,150);c.position.fromArray(v.camera);c.lookAt(...v.target);c.updateMatrixWorld(true);
  goat.update({x:v.actor[0],y:v.actor[2],heading:.5,travelled:0,moving:false,tool:'matches'},v.frame.worldTime);goat.root.position.y=v.actor[1];goat.setHeldVisible(false);
  art.update(v.frame,{mode:v.mode,level:v.level,camera:c,observer:{x:v.actor[0],y:v.actor[1],z:v.actor[2],height:1.66},sampleWind:(x,y,z,out)=>(out[0]=1.5,out[1]=0,out[2]=0,out)});
  renderer.render(scene,c);renderer.render(scene,c);
  const image=document.createElement('canvas');image.width=1600;image.height=1070;const ctx=image.getContext('2d');ctx.fillStyle='#242c28';ctx.fillRect(0,0,1600,1070);ctx.drawImage(canvas,0,0);ctx.fillStyle='#ead8b2';ctx.font='600 25px FurnishedBesley';ctx.fillText(v.title,30,989);ctx.font='18px Georgia';ctx.fillStyle='#d1c5aa';ctx.fillText(v.caption,30,1022);ctx.font='16px Georgia';ctx.fillStyle='#a4aaa0';ctx.fillText('Controlled presentation evidence / geometry and state masks / simulation replay and full-route acceptance remain separate',30,1051);
  output.push({name:v.name,jpeg:image.toDataURL('image/jpeg',.95)});records.push({...v,frame:undefined,dimensions:[1600,1070],exposure:renderer.toneMappingExposure,art:art.diagnostics(),renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},character:goat.diagnostics()});
 }
 const ext=gl.getExtension('WEBGL_debug_renderer_info'),receipt={task:'Furnished artist native WebGL QA',scope:'Controlled authored frames for geometry, shading and local retirement. Not a simulation replay.',gpu:{renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)},errors,programResults:programs.filter(p=>gl.isProgram(p)).map(p=>({linked:gl.getProgramParameter(p,gl.LINK_STATUS),log:gl.getProgramInfoLog(p)})),shaderResults:shaders.filter(s=>gl.isShader(s)).map(s=>({compiled:gl.getShaderParameter(s,gl.COMPILE_STATUS),log:gl.getShaderInfoLog(s)})),views:records};
 const packet=document.createElement('script');packet.id='capture-packet';packet.type='application/json';packet.textContent=JSON.stringify({receipt,views:output});document.body.append(packet);document.getElementById('status').textContent='Captured native artist QA views';
}catch(e){errors.push(e.stack||String(e));document.getElementById('status').textContent=JSON.stringify(errors);throw e;}
finally{art?.dispose();kit?.dispose();night.dispose();gg.dispose();gm.dispose();renderer.dispose();}
