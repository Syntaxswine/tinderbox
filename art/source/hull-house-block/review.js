const T=await import('../../../src/runtime/three.js');
const {createHullHouseBlock}=await import('../../../assets/art/hull-house-block/index.js');
const {loadCharacterKit}=await import('../../../src/reuse/characters.js');
const {createCityPropLibrary,CITY_PAINT_URL}=await import('../../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/three.js');
const errors=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const priorError=console.error;console.error=(...args)=>{errors.push(args.map(String).join(' '));priorError(...args);};
const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{antialias:true,preserveDrawingBuffer:true});
if(!gl)throw Error('Native WebGL2 unavailable');
const programs=[],shaders=[],cp=gl.createProgram.bind(gl),cs=gl.createShader.bind(gl);
gl.createProgram=()=>{const p=cp();programs.push(p);return p;};gl.createShader=t=>{const s=cs(t);shaders.push(s);return s;};
const renderer=new T.WebGLRenderer({canvas,context:gl,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(1600,950);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
document.body.append(canvas);
const scene=new T.Scene(),hemi=new T.HemisphereLight(0x96afb5,0x80613e,.94),sun=new T.DirectionalLight(0xb6c6d1,1.25);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.025;sun.shadow.bias=-.0001;sun.shadow.camera.near=.5;sun.shadow.camera.far=600;scene.add(hemi,sun,sun.target);
const groundGeometry=new T.PlaneGeometry(800,500),groundMaterial=new T.MeshStandardMaterial({color:0x343a30,roughness:1});groundGeometry.rotateX(-Math.PI/2);
const ground=new T.Mesh(groundGeometry,groundMaterial);ground.position.set(129,-.124,37);ground.receiveShadow=true;scene.add(ground);
const models=[],lamps=[],lights=[],owned=[];
let characterKit,character,atlas,library;
const specifications=[
 {name:'block-isometric',light:'night',camera:[204,167,267],target:[129,2,37],halfWidth:156,actor:[32,76],title:'Hull-House neighborhood | one block east of the settlement',caption:'Chicago c.1893. W. Polk / Ewing / S. Halsted / S. Desplaines. Survey-traced massing; roofs and native levels interpreted.'},
 {name:'street-and-yard',light:'night',camera:[49,19,91],target:[23,2.2,65],halfWidth:17,actor:[31.8,72],title:'Ewing court | work, rooms and a little jubilation',caption:'Native goat and Nautilus lanterns. 2.12 m floors. Rear porch inferred from a c.1900 neighborhood photograph; closed native doors.'},
 {name:'halsted-street',light:'night',camera:[-20,18,92],target:[10,2.2,65],halfWidth:18,actor:[-2.6,69],title:'Halsted shops | festival cloth over the everyday street',caption:'Generic trade lettering and selected jubilee dressing are art direction. Property-specific facade photographs remain unlocated.'},
 {name:'roof-corner-review',light:'day',camera:[244,21,86],target:[221,2.5,57],halfWidth:14,actor:[231,72],title:'Ewing155 corner | native-height roof separation',caption:'The source gap closes at one snapped wall corner. An inferred single-storey rear house keeps its eaves below the front roof.'},
 {name:'street-and-yard-day',light:'day',camera:[49,19,91],target:[23,2.2,65],halfWidth:17,actor:[31.8,72],title:'Ewing court | daylight construction review',caption:'Same exported geometry and camera. Timber lap siding continues over gable ends; muted green sash and worn earth.'}
];
try{
 const font=new FontFace('HullBesley','url('+new URL('../../../assets/art/ui/typography/besley/Besley[wght].ttf',import.meta.url).href+')',{weight:'500 800'});await font.load();document.fonts.add(font);
 [characterKit,atlas]=await Promise.all([loadCharacterKit({characterId:'goat',THREE:T,renderer,unarmed:true}),new T.TextureLoader().loadAsync(CITY_PAINT_URL)]);
 character=characterKit.create();scene.add(character.root);character.setHeldVisible(false);
 library=createCityPropLibrary(T,atlas);
 const model=createHullHouseBlock(T);models.push(model);scene.add(model.root);
 for(const a of [...model.metadata.lightAttachments,{assetId:'city1880-hand-lantern-lit',position:[21.7,2.12,61.3],quaternion:[0,0,0,1]}]){
  const lamp=library.build(a.assetId);lamp.root.position.fromArray(a.position);lamp.root.quaternion.fromArray(a.quaternion);scene.add(lamp.root);lamps.push(lamp);
  const bulb=new T.Vector3(0,a.assetId.includes('entry')?1.56:.20,a.assetId.includes('entry')?-.268:0).applyQuaternion(lamp.root.quaternion).add(lamp.root.position);
  const light=new T.PointLight(0xffb56b,14,7,2);light.position.copy(bulb);scene.add(light);lights.push(light);
 }
 const views=[],records=[];
 for(const v of specifications){
  const night=v.light==='night';scene.background=new T.Color(night?0x172624:0xb6b29a);hemi.intensity=night?1.26:1.65;hemi.color.setHex(night?0x96afb5:0xdce3ce);sun.intensity=night?1.50:3.0;sun.color.setHex(night?0xb6c6d1:0xffd6aa);renderer.toneMappingExposure=night?1.23:1.12;
  const shadowWidth=v.name==='block-isometric'?175:24;
  sun.position.set(v.target[0]-35,85,v.target[2]-50);sun.target.position.fromArray(v.target);
  Object.assign(sun.shadow.camera,{left:-shadowWidth,right:shadowWidth,top:shadowWidth,bottom:-shadowWidth});sun.shadow.camera.updateProjectionMatrix();sun.shadow.needsUpdate=true;
  for(const l of lights)l.intensity=night?14:0;
  character.update({x:v.actor[0],y:v.actor[1],heading:.55,travelled:0,moving:false,tool:'matches'},0);character.setHeldVisible(false);character.root.position.y=0;
  const camera=new T.OrthographicCamera(-v.halfWidth,v.halfWidth,v.halfWidth*950/1600,-v.halfWidth*950/1600,.1,700);camera.position.fromArray(v.camera);camera.lookAt(...v.target);camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.render(scene,camera);
  const output=document.createElement('canvas');output.width=1600;output.height=1070;const c=output.getContext('2d');c.fillStyle='#232d28';c.fillRect(0,0,1600,1070);c.drawImage(canvas,0,0);
  c.fillStyle='#ead8b2';c.font='600 25px HullBesley';c.fillText(v.title,30,988);c.font='18px Georgia';c.fillStyle='#d1c5aa';c.fillText(v.caption,30,1021);c.font='16px Georgia';c.fillStyle='#a4aaa0';c.fillText('1895 map / 1893 fieldwork / later 1906 block-scale calibration / 258 x 74 m whole-metre grid / art candidate, gameplay deferred',30,1050);
  views.push({name:v.name,jpeg:output.toDataURL('image/jpeg',.95)});
  records.push({...v,dimensions:[1600,1070],renderPixels:[1600,950],exposure:renderer.toneMappingExposure,lighting:{hemisphere:hemi.intensity,directional:sun.intensity,lanternIntensity:night?14:0,lanternReach:7,lanternColour:'#ffb56b',lanternPositions:lamps.map(l=>l.root.position.toArray())},diagnostics:model.diagnostics(),character:character.diagnostics(),rendererInfo:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},omissions:['Interior partitions, occupants and production game behavior','Detailed property-specific facades remain source gaps']});
 }
 const ext=gl.getExtension('WEBGL_debug_renderer_info'),gpu={renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),version:gl.getParameter(gl.VERSION)};
 const receipt={task:'Hull-House exported block native review',three:T.REVISION,gpu,programResults:programs.filter(p=>gl.isProgram(p)).map(p=>({linked:gl.getProgramParameter(p,gl.LINK_STATUS),log:gl.getProgramInfoLog(p)})),shaderResults:shaders.filter(s=>gl.isShader(s)).map(s=>({compiled:gl.getShaderParameter(s,gl.COMPILE_STATUS),log:gl.getShaderInfoLog(s)})),errors,views:records,scope:'Art fixture using actual exported factory, original native goat and existing lanterns. No game integration.'};
 const packet=document.createElement('script');packet.id='capture-packet';packet.type='application/json';packet.textContent=JSON.stringify({receipt,views});document.body.append(packet);document.getElementById('status').textContent='Captured '+views.length+' exported views';
}catch(e){errors.push(e.stack||String(e));document.getElementById('status').textContent=JSON.stringify(errors);throw e;}
finally{for(const m of models)m.dispose();for(const l of lamps)l.dispose();library?.dispose();atlas?.dispose();characterKit?.dispose();for(const r of owned)r.dispose();groundGeometry.dispose();groundMaterial.dispose();renderer.dispose();}
