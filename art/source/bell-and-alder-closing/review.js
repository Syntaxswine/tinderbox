import * as T from '../../../src/runtime/three.js';
import {createClosingTimeArt} from '../../../workbenches/bell-and-alder-closing/art.js';
import {createStreetNight} from '../../../src/art/street-night.js';
import {CIVILIAN_PROFILES,CHICAGO_PATROL} from '../../../src/content/exterior-kit.js';
const errors=[],prior=console.error;window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));console.error=(...a)=>{errors.push(a.map(String).join(' '));prior(...a);};
const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{antialias:true,preserveDrawingBuffer:true}),programs=[],shaders=[];if(!gl)throw Error('Native WebGL2 is required');
const cp=gl.createProgram.bind(gl),cs=gl.createShader.bind(gl);gl.createProgram=()=>{const p=cp();programs.push(p);return p;};gl.createShader=t=>{const s=cs(t);shaders.push(s);return s;};
const renderer=new T.WebGLRenderer({canvas,context:gl,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1600,950);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.toneMappingExposure=1;
const scene=new T.Scene();scene.background=new T.Color(0x101b30);const night=createStreetNight(T,scene,renderer);scene.add(night.root);document.body.append(canvas);
const moon=night.root.children.find(l=>l.isDirectionalLight);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.2,far:70});moon.shadow.camera.updateProjectionMatrix();moon.shadow.normalBias=.018;moon.target.position.set(4,1,7);scene.add(moon.target);
let art;
try{
 const data=await fetch('../../../workbenches/bell-and-alder-closing/scene-data.json').then(r=>r.json());art=await createClosingTimeArt(T,{renderer,data});scene.add(art.root);
 const actor=(s,position=data.closingTime.anchors[s.anchor].position)=>{
  const profile=s.role==='player'?{height:1.66,radius:.5}:CIVILIAN_PROFILES[s.characterId],heading=s.heading??-Math.PI/2;
  const native=s.role==='officer'?{...CHICAGO_PATROL}:s.role==='resident'?{...profile,id:s.id,team:'civilian',headgear:'none',equipment:'none'}:{id:s.id,characterId:s.characterId,species:s.characterId,tool:'matches',usingTool:false};
  Object.assign(native,{x:position[0],y:position[2],elevation:position[1],heading,travelled:0,moving:false,hp:100,height:profile.height,radius:profile.radius});return {...s,position,heading,travelled:0,moving:false,hp:100,height:profile.height,radius:profile.radius,native};
 };
 const base={version:1,revision:0,tick:0,worldTime:0,full:true,boundaries:[],supports:[],items:[],parts:[],falls:[],rubble:[],events:[],tombstones:[],occupancy:[],fireSamples:[],metrics:{},closingTime:{version:1,revision:0,worldTime:0,actors:data.closingTime.actors.map(s=>actor(s)),doors:data.closingTime.doors.map(d=>({...d,openFraction:0,intact:true})),lantern:{...data.closingTime.lantern,phase:'placed',ownerId:null,position:data.closingTime.anchors.lantern.position},resident:{state:'routine',evidence:null,routeIndex:0,blocked:null},smokeSignals:[],events:[],replay:{id:'quiet',seed:1893,stage:'authored initial pose',speed:1}}};
 const views=[
  {name:'quiet-exterior',mode:'exterior',level:0,camera:[25,17,29],target:[4.2,1.5,7.2],halfWidth:12,title:'Bell & Alder | closing time',caption:'Quiet exported-art exemplar. Native animals, one placed lantern, warm shop windows and a new grid-built lodging/stair.'},
  {name:'quiet-shop-cutaway',mode:'cutaway',level:0,camera:[22,17,26],target:[4.5,.6,5.3],halfWidth:9.4,title:'Published shop | native fittings and clear aisle',caption:'Diagnostic cutaway. Original 25 shop fittings and 21 unit walls retain their transforms; doors are paired native leaves.'},
  {name:'quiet-lodging-cutaway',mode:'cutaway',level:1,camera:[23,19,27],target:[5,2.4,4.7],halfWidth:10,title:'New lodging | native floor pitch and service route',caption:'Diagnostic static pose upstairs. Walking Y2.12 m; twelve exterior treads, a real landing and three native 2 m sash bays.'},
  {name:'quiet-lantern-carried',mode:'exterior',level:0,camera:[25,17,29],target:[4.2,1.5,7.2],halfWidth:12,title:'One lantern | placed-to-carried presentation check',caption:'Static ownership fixture at the same camera and exposure. The single native lantern moves to its accepted hip-loop attachment.'}
 ];
 const output=[],records=[];
 for(const [index,v]of views.entries()){
  const camera=new T.OrthographicCamera(-v.halfWidth,v.halfWidth,v.halfWidth*950/1600,-v.halfWidth*950/1600,.1,150);camera.position.fromArray(v.camera);camera.lookAt(...v.target);camera.updateMatrixWorld(true);
  const frame=structuredClone(base);frame.revision=index;frame.closingTime.revision=index;
  if(v.level===1){const spec=data.closingTime.actors.find(s=>s.role==='resident');frame.closingTime.actors=frame.closingTime.actors.map(a=>a.role==='resident'?actor(spec,data.closingTime.anchors.residentRest.position):a);}
  if(index===3){frame.closingTime.lantern.phase='carried';frame.closingTime.lantern.ownerId='player';}
  art.update(frame,{mode:v.mode,level:v.level,camera,effects:{flames:true,smoke:true,lighting:true},lightingMode:'building',observer:{x:4,y:0,z:10,height:1.66},sampleWind:(x,y,z,out)=>(out[0]=1.5,out[1]=0,out[2]=0,out),windMetadata:{kind:'ambient',maximumSpeed:1.5}});
  const start=performance.now();renderer.render(scene,camera);renderer.render(scene,camera);const renderMs=performance.now()-start;
  const image=document.createElement('canvas');image.width=1600;image.height=1070;const ctx=image.getContext('2d');ctx.fillStyle='#252923';ctx.fillRect(0,0,1600,1070);ctx.drawImage(canvas,0,0);ctx.fillStyle='#ead7b2';ctx.font='bold 26px Georgia';ctx.fillText(v.title,30,988);ctx.font='17px Georgia';ctx.fillStyle='#d0c2a5';ctx.fillText(v.caption,30,1021);ctx.fillStyle='#a1a59d';ctx.font='16px Georgia';ctx.fillText('Actual shared WebGL renderer / static art QA / no simulated reactions, traversal or causal replay claimed',30,1050);
  output.push({name:v.name,jpeg:image.toDataURL('image/jpeg',.95)});records.push({...v,worldTime:0,exposure:1,dimensions:[1600,1070],art:art.diagnostics(),renderMsTwoDraws:renderMs,renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,memory:{...renderer.info.memory}}});
 }
 const expect=(yes,message)=>{if(!yes)throw Error(message);};
 const camera=new T.OrthographicCamera(-12,12,7.125,-7.125,.1,150);camera.position.set(25,17,29);camera.lookAt(4.2,1.5,7.2);camera.updateMatrixWorld(true);
 const view={mode:'exterior',level:0,camera,effects:{flames:true,smoke:true,lighting:true},lightingMode:'building',sampleWind:(x,y,z,out)=>(out[0]=1.5,out[1]=0,out[2]=0,out)};
 art.update(structuredClone(base),view);
 const source='floor/l0/2,6',triangles=[[[2,0,6],[2,0,6.5],[2.5,0,6.5]],[[2,0,6],[2.5,0,6.5],[2.5,0,6]]],retired={...structuredClone(base),full:false,revision:5,tick:30,worldTime:1,boundaries:[{id:source+'@4,0,12',sourceSurfaceId:source,triangles,intact:false,charFraction:1,openFraction:0}]};
 art.update(retired,view);
 const present=id=>art.inspect().patches.filter(p=>p.sourceSurfaceId===id&&p.present).length;
 expect(present(source)===3,'One lower quarter must retire at the zero-based thermal grid');expect(present('floor/l1/2,6')===4,'Upper floor must survive lower quarter retirement');
 art.update({...retired,boundaries:[],events:[],closingTime:{...retired.closingTime,events:[]}},view);expect(present(source)===3,'Empty paused delta must retain the local removal');
 art.update(structuredClone(base),view);expect(present(source)===4,'Full reset must restore exactly the lower floor patch');
 const smoke={id:'controlled-vent-proof',sourceSurfaceId:source,buildingId:data.buildingId,part:'floor',x:2.25,y:.015,z:6.75,nx:0,ny:1,nz:0,area:.25,flame:0,smoke:.8,preheat:true,ignitionTime:0,floorFootprint:triangles};
 const smokeFrame={...structuredClone(base),revision:6,tick:60,worldTime:2,fireSamples:[smoke]};smokeFrame.closingTime.resident.evidence={sourceId:smoke.id,ventId:'front-entry-vent',position:[4,2.8,8.2],strength:.8,seenAt:2};smokeFrame.closingTime.doors[0].openFraction=1;smokeFrame.closingTime.smokeSignals=[{sourceId:smoke.id,ventId:'front-entry-vent',position:[4,2.8,8.2],strength:.8,sourcePosition:[smoke.x,smoke.y,smoke.z]}];
 art.update(smokeFrame,view);expect(art.diagnostics().ventSmoke.signals.length===1,'Current runtime smoke evidence must produce its matching vent display');
 art.update({...smokeFrame,full:false,closingTime:{...smokeFrame.closingTime,smokeSignals:[]}},view);expect(art.diagnostics().ventSmoke.signals.length===0,'A closed/blocked current path must stop the plume even while source smoke and resident memory persist');
 art.update({...smokeFrame,full:false,fireSamples:[]},view);expect(art.diagnostics().ventSmoke.signals.length===0,'Resident memory cannot keep smoke emitting after its current source disappears');
 art.update(smokeFrame,{...view,effects:{flames:false,smoke:false,lighting:false}});expect(art.diagnostics().ventSmoke.signals.length===0,'Smoke setting must stop vent presentation');
 art.update(structuredClone(base),view);expect(art.diagnostics().lantern.models===1&&art.diagnostics().lantern.phase==='placed','Reset restores one placed lantern');
 const stateChecks={localQuarterRetirement:true,otherStoreyPreserved:true,emptyDeltaRetains:true,fullResetRestores:true,currentVentSignal:true,staleEvidenceStops:true,removedCurrentPathStops:true,smokeToggle:true,oneLanternReset:true};
 const before=art.diagnostics();art.dispose();renderer.render(scene,new T.PerspectiveCamera());const after=art.diagnostics(),rendererAfter={...renderer.info.memory};
 const ext=gl.getExtension('WEBGL_debug_renderer_info'),receipt={task:'Bell and Alder first native WebGL exemplar',scope:'Static authored quiet/pose/ownership fixtures only; combined runtime acceptance remains separate',gpu:{renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)},cameraExposureFixed:true,stateChecks,errors,programResults:programs.filter(p=>gl.isProgram(p)).map(p=>({linked:gl.getProgramParameter(p,gl.LINK_STATUS),log:gl.getProgramInfoLog(p)})),shaderResults:shaders.filter(s=>gl.isShader(s)).map(s=>({compiled:gl.getShaderParameter(s,gl.COMPILE_STATUS),log:gl.getShaderInfoLog(s)})),views:records,disposal:{before:before.resources,after:after.resources,rendererAfter}};
 const packet=document.createElement('script');packet.id='capture-packet';packet.type='application/json';packet.textContent=JSON.stringify({receipt,views:output});document.body.append(packet);document.getElementById('status').textContent='Captured quiet native art exemplar';
}catch(e){errors.push(e.stack||String(e));document.getElementById('status').textContent=JSON.stringify(errors);throw e;}
finally{art?.dispose();night.dispose();moon.shadow.dispose();renderer.dispose();}
