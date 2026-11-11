const base = import.meta.url.includes('/art/source/') ? '../../../' : './';
const T = await import(base + 'src/runtime/three.js');
const {createStockyardAsset} = await import(base + 'assets/art/stockyards/index.js');
const {loadCharacterKit} = await import(base + 'src/reuse/characters.js');
const {createCityPropLibrary,CITY_PAINT_URL} = await import(base + 'vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/three.js');
const errors = [];
window.addEventListener('error', e => errors.push(e.message));
window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)));
const originalError = console.error;
console.error = (...args) => { errors.push(args.map(String).join(' ')); originalError(...args); };
const canvas = document.createElement('canvas'), gl = canvas.getContext('webgl2', {antialias:true,preserveDrawingBuffer:true});
const programs = [], shaders = [];
const cp = gl.createProgram.bind(gl), cs = gl.createShader.bind(gl);
gl.createProgram = () => {const p = cp();programs.push(p);return p;};
gl.createShader = t => {const s = cs(t);shaders.push(s);return s;};
const renderer = new T.WebGLRenderer({canvas,context:gl,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1600,950);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const scene = new T.Scene();document.body.append(canvas);
const hemi = new T.HemisphereLight(0xd9e3d4,0x65513f,1.6), sun = new T.DirectionalLight(0xffd6aa,3.0);
sun.position.set(-8,16,-10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;sun.shadow.camera.near=.5;sun.shadow.camera.far=60;sun.shadow.normalBias=.018;sun.shadow.bias=-.0001;
sun.target.position.set(0,2,0);scene.add(hemi,sun,sun.target);
const groundGeometry=new T.PlaneGeometry(160,160),groundMaterial=new T.MeshStandardMaterial({color:0x777659,roughness:1});
groundGeometry.rotateX(-Math.PI/2);const ground = new T.Mesh(groundGeometry,groundMaterial);ground.position.y=-.124;ground.receiveShadow=true;scene.add(ground);
const owned = [], instances = [], lanterns = [], lights = [];
let characterKit, character, library, atlas;
const styles = {
  day:{background:0xbab79d,ground:0x777659,sky:0xd9e3d4,hemisphere:1.6,sun:3.0,sunColour:0xffd6aa,exposure:1.12},
  night:{background:0x152321,ground:0x3d3b2d,sky:0x849ea4,hemisphere:.86,sun:1.0,sunColour:0xb0c3d2,exposure:1.18}
};
const specifications = [
  {name:'pen-single',asset:'pen1',skin:'jubilee',light:'day',camera:[10,7.5,-10],target:[2,1.05,1.3],halfWidth:5.25,actor:[3.2,-1.7],title:'Covered swine pen | one native-scale bay',caption:'4 x 4 m game bay. 1 m fence and roof repeats. Native goat, worn earth and a separate service approach.'},
  {name:'pen-two-bay',asset:'pen2',skin:'jubilee',light:'day',camera:[14,7.5,-12],target:[4,1.10,1.25],halfWidth:7.35,actor:[6.0,-1.8],title:'Joined swine pens | festive skin',caption:'Two 4 x 4 m bays. One shared partition and post line; one service leaf swung fully outward.'},
  {name:'pen-joint-cutaway',asset:'pen2',skin:'working',light:'day',camera:[12,10,-9],target:[4,1.1,1.7],halfWidth:6.5,actor:[6.0,-1.8],cutaway:true,title:'Pen construction | shared fence and roof joint',caption:'Review cutaway only: two 1 m roof spans hidden to expose the single shared partition. End caps remain at row ends.'},
  {name:'pen-night',asset:'pen2',skin:'jubilee',light:'night',camera:[13,5.5,-13],target:[4,1.35,1],halfWidth:6.75,actor:[6.1,-1.6],title:'Swine pens | lantern night treatment',caption:'Jubilee fans and ribbon tails stay broad at game zoom. Borrowed Nautilus oil lanterns; no fire or livestock simulation.'},
  {name:'gate-jubilee',asset:'gate',skin:'jubilee',light:'day',camera:[15,12,-30],target:[0,4.9,.3],halfWidth:11.1,actor:[1.9,-2.8],title:'Union Stock Yard entrance | jubilee skin',caption:'Limestone gate predating 1893. Removable welcome board, framework, flags and pleated cloth inspired by the c.1901-07 postcard.'},
  {name:'gate-plain',asset:'gate',skin:'working',light:'day',camera:[15,12,-30],target:[0,4.9,.3],halfWidth:11.1,actor:[1.9,-2.8],title:'Union Stock Yard entrance | underlying architecture',caption:'Same camera and unchanged native goat. 15 m nominal facade; 5 m central, 2.5 m north and 2 m south arches, rounded from NPS dimensions.'},
  {name:'gate-night',asset:'gate',skin:'jubilee',light:'night',camera:[14,11,-30],target:[0,4.9,.3],halfWidth:11.1,actor:[1.9,-2.8],title:'Union Stock Yard entrance | lantern night treatment',caption:'Celebratory cloth against a working industrial entrance. Later postcard dressing is a selectable, removable skin.'}
];
try {
  const font = new FontFace('StockBesley','url('+new URL(base+'assets/art/ui/typography/besley/Besley[wght].ttf',import.meta.url).href+')',{weight:'500 800'});
  await font.load();document.fonts.add(font);
  [characterKit,atlas] = await Promise.all([
    loadCharacterKit({characterId:'goat',THREE:T,renderer,unarmed:true}),new T.TextureLoader().loadAsync(CITY_PAINT_URL)
  ]);
  character=characterKit.create();character.setHeldVisible(false);scene.add(character.root);
  library=createCityPropLibrary(T,atlas);
  const models = {
    pen1:createStockyardAsset(T,{skin:'jubilee'}),
    pen2:createStockyardAsset(T,{bays:2,skin:'jubilee',gateAngles:[Math.PI/2,0]}),
    gate:createStockyardAsset(T,{id:'union-stockyard-gate',skin:'jubilee'})
  };
  for(const m of Object.values(models)){scene.add(m.root);instances.push(m);}
  for(const position of [[.14,2.05,-.26],[7.85,2.05,-.26],[-3.25,2.1,-.98],[3.25,2.1,-.98]]){
    const lamp=library.build('city1880-hand-lantern-lit');lamp.root.position.fromArray(position);scene.add(lamp.root);lanterns.push(lamp);
    const light=new T.PointLight(0xffb56b,10.5,6,2);light.position.set(position[0],position[1]+.20,position[2]);scene.add(light);lights.push(light);
  }
  const records=[],views=[];
  for(const view of specifications){
    for(const [key,m]of Object.entries(models))m.root.visible=key===view.asset;
    const model=models[view.asset];model.setSkin(view.skin);
    const hidden=[];
    if(view.cutaway) for(const name of ['roof/0/3','roof/1/0']){const node=model.root.getObjectByName(name);if(node){node.visible=false;hidden.push(node);}}
    const isGate=view.asset==='gate',style=styles[view.light];
    lanterns.forEach((l,i)=>l.root.visible=(isGate?i>=2:i<2&&(view.asset==='pen2'||i===0)));
    lights.forEach((l,i)=>l.intensity=lanterns[i].root.visible&&(view.light==='night')?10.5:0);
    character.update({x:view.actor[0],y:view.actor[1],heading:.55,travelled:0,moving:false,tool:'matches'},0);character.setHeldVisible(false);character.root.position.y=-.124;
    scene.background=new T.Color(style.background);groundMaterial.color.setHex(style.ground);hemi.color.setHex(style.sky);hemi.intensity=style.hemisphere;sun.color.setHex(style.sunColour);sun.intensity=style.sun;renderer.toneMappingExposure=style.exposure;
    const camera=new T.OrthographicCamera(-view.halfWidth,view.halfWidth,view.halfWidth*950/1600,-view.halfWidth*950/1600,.1,200);
    camera.position.fromArray(view.camera);camera.lookAt(...view.target);camera.updateProjectionMatrix();scene.updateMatrixWorld(true);
    renderer.render(scene,camera);renderer.render(scene,camera);
    const output=document.createElement('canvas');output.width=1600;output.height=1070;
    const ctx=output.getContext('2d');ctx.fillStyle='#242c28';ctx.fillRect(0,0,1600,1070);ctx.drawImage(canvas,0,0);
    ctx.fillStyle='#ead8b2';ctx.font='600 26px StockBesley';ctx.fillText(view.title,32,987);
    ctx.font='18px Georgia';ctx.fillStyle='#d1c5aa';ctx.fillText(view.caption,32,1020);
    ctx.fillStyle='#a4aaa0';ctx.font='16px Georgia';ctx.fillText('Actual exported geometry / shared Three r180 / source ratios and inferred details recorded / art review before production wiring',32,1050);
    views.push({name:view.name,jpeg:output.toDataURL('image/jpeg',.95)});
    records.push({...view,dimensions:[1600,1070],renderPixels:[1600,950],lighting:style,lantern:{asset:'city1880-hand-lantern-lit',pointColour:'#ffb56b',intensity:10.5,reach:6,decay:2},diagnostics:model.diagnostics(),metadata:model.metadata,rendererInfo:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},character:character.diagnostics(),omissions:view.cutaway?['Two named roof spans hidden for construction inspection']:[]});
    for(const node of hidden)node.visible=true;
  }
  const ext=gl.getExtension('WEBGL_debug_renderer_info');
  const gpu={renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),version:gl.getParameter(gl.VERSION)};
  const programResults=programs.filter(p=>gl.isProgram(p)).map(p=>({linked:gl.getProgramParameter(p,gl.LINK_STATUS),log:gl.getProgramInfoLog(p)}));
  const shaderResults=shaders.filter(s=>gl.isShader(s)).map(s=>({compiled:gl.getShaderParameter(s,gl.COMPILE_STATUS),log:gl.getShaderInfoLog(s)}));
  const receipt={task:'stockyard exported asset review',three:T.REVISION,gpu,programResults,shaderResults,errors,views:records,scope:'Native WebGL art fixtures. Gameplay placement/traversal/fire are deferred.'};
  const packet=document.createElement('script');packet.id='capture-packet';packet.type='application/json';packet.textContent=JSON.stringify({receipt,views});document.body.append(packet);
  document.getElementById('status').textContent='Captured '+views.length+' exported asset views';
} catch(e){errors.push(e.stack||String(e));document.getElementById('status').textContent=JSON.stringify(errors);throw e;}
finally{for(const a of instances)a.dispose();for(const l of lanterns)l.dispose();library?.dispose();atlas?.dispose();characterKit?.dispose();groundGeometry.dispose();groundMaterial.dispose();renderer.dispose();}
