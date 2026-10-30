import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../src/runtime/three.js';
import * as facade from '../../vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/vendor/three.module.js';
import {createBearRig,loadBearKit,BEAR_SOURCE_COMMIT} from '../../src/reuse/bear.js';
import {createSimulation} from '../../src/simulation/index.js';
import {createDischarge} from '../../src/art/discharge.js';
import {fixtureSnapshot} from '../../workbenches/art/fixtures.js';
const base='vendor/animal-factory-tactics-3d/'+BEAR_SOURCE_COMMIT+'/',data=JSON.parse(fs.readFileSync(base+'dist/tactics/bear-10k-data.json'));
const player=(extra={})=>({x:4,y:5,heading:0,travelled:0,moving:false,tool:'matches',...extra});
const boneState=rig=>rig.worker.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()]);
const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('bear intake preserves all selected raw bytes and aliases the existing Three classes',()=>{
  const manifest=JSON.parse(fs.readFileSync(base+'provenance/bear.json'));assert.equal(manifest.sourceCommit,BEAR_SOURCE_COMMIT);assert.equal(manifest.files.length,19);
  for(const f of [...manifest.files,...manifest.adaptations]){const b=fs.readFileSync(f.installedPath);assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);}
  for(const key of Object.keys(T))assert.equal(facade[key],T[key],key);assert.equal(T.REVISION,'180');assert.ok(!fs.existsSync(base+'dist/tactics/vendor/three.core.js'));
});
test('native body, rig and mutable snapshots remain distinct from source data',()=>{
  const before=JSON.stringify(data),rig=createBearRig(data);try{const d=rig.diagnostics();assert.equal(d.species,'bear');assert.equal(d.appearance,'normal');assert.equal(d.sourceCommit,BEAR_SOURCE_COMMIT);assert.equal(d.bodyTriangles,10050);assert.equal(d.skinnedMeshes,8);assert.equal(d.boneCount,17);assert.deepEqual(d.nativeScale,[1,1,1]);assert.equal(d.defaultRifleVisible,false);assert.equal(d.bodyBounds,null);
    const p=player({heading:1.8,travelled:.2,moving:true});const snapshot=structuredClone(p);rig.update(p,4);assert.deepEqual(p,snapshot);assert.equal(JSON.stringify(data),before);assert.ok(rig.worker.parts.every(m=>m instanceof T.SkinnedMesh));
  }finally{rig.dispose();}assert.throws(()=>createBearRig({...data,species:'horse'}),/reviewed native bear/);
});
test('all five fitted tools preserve native limb lengths, body clearance, headings and exact hand contacts',()=>{
  const rig=createBearRig(data),lengths=rig.worker.bones.map(b=>b.position.length());let largest=0;
  try{for(const tool of ['matches','jerry-can','molotov','torch','flamethrower'])for(let i=0;i<48;i++){
    const heading=i%4*Math.PI/2,p=player({x:6,y:7,tool,heading,travelled:i/48,moving:true}),before=JSON.stringify(p);rig.update(p,i/60);
    const bounds=rig.sampleBodyBounds(),d=rig.diagnostics();largest=Math.max(largest,bounds.radius);assert.ok(bounds.radius<.56,tool+' body exceeds unchanged collider');assert.ok(bounds.min[1]>=-1e-6);assert.ok(bounds.max[1]<2.3);assert.ok(bounds.size[0]<1.4&&bounds.size[2]<1.4);
    assert.equal(d.selectedTool,tool);assert.deepEqual(d.visibleTools,[tool]);assert.equal(d.defaultRifleVisible,false);assert.ok(d.finiteAnchors);assert.ok(d.contacts.length>=1);for(const c of d.contacts)assert.ok(c.error<1e-7,tool+' palm contact');
    rig.worker.bones.forEach((b,j)=>near(b.position.length(),lengths[j]));assert.equal(JSON.stringify(p),before);assert.ok(rig.worker.root.scale.equals(new T.Vector3(1,1,1)));
  }}finally{rig.dispose();}assert.ok(largest>.50,'walk was not sampled through a foot extension');
});
test('locomotion follows accepted distance, independent of render clock; paused samples preserve the evaluated pose',()=>{
  const a=createBearRig(data),b=createBearRig(data);try{const p=player({tool:'flamethrower',moving:true,travelled:.37,heading:.7});a.update(p,1);b.update(p,50);assert.deepEqual(boneState(a),boneState(b));
    const pose=boneState(a),muzzle=a.anchors.muzzle.getWorldPosition(new T.Vector3()).toArray(),evaluations=a.diagnostics().poseEvaluations;
    for(let i=0;i<20;i++)a.update({...p,moving:false},1,{paused:true});assert.deepEqual(boneState(a),pose);assert.deepEqual(a.anchors.muzzle.getWorldPosition(new T.Vector3()).toArray(),muzzle);assert.equal(a.diagnostics().poseEvaluations,evaluations);
    a.update({...p,x:11,y:9},1,{paused:true});near(a.anchors.muzzle.getWorldPosition(new T.Vector3()).x-muzzle[0],7);near(a.anchors.muzzle.getWorldPosition(new T.Vector3()).z-muzzle[2],4);
  }finally{a.dispose();b.dispose();}
});
test('native held-nozzle visibility still obeys the existing resolved-discharge mask',()=>{
  const simulation=createSimulation({scenario:{width:12,height:12,player:{x:5,y:5},obstacles:[],actors:[]}}),rig=createBearRig(data),texture=new T.DataTexture(new Uint8Array(16),2,2),view=createDischarge(T,texture);
  try{simulation.dispatch({type:'select-tool',tool:'flamethrower'});simulation.dispatch({type:'primary',pressed:true});const snapshot=simulation.advance(1/60),before=JSON.stringify(snapshot);rig.update(snapshot.player,snapshot.clocks.player);const muzzle=rig.anchors.muzzle.getWorldPosition(new T.Vector3());view.update(snapshot.discharge,snapshot.clocks.world,{muzzle});assert.equal(view.diagnostics().muzzleInsideShape,true);
    const short=structuredClone(snapshot);for(const r of short.discharge.rays){r.distance=.1;r.x=short.player.x+Math.cos(r.angle)*.1;r.y=short.player.y+Math.sin(r.angle)*.1;}
    view.update(short.discharge,short.clocks.world,{muzzle});assert.equal(view.diagnostics().muzzleInsideShape,false);rig.setHeldVisible(false);assert.deepEqual(rig.diagnostics().visibleTools,[]);assert.ok(rig.worker.weapon.mount.visible);rig.setHeldVisible(true);assert.deepEqual(rig.diagnostics().visibleTools,['flamethrower']);assert.equal(JSON.stringify(snapshot),before);
  }finally{view.dispose();texture.dispose();rig.dispose();simulation.dispose();}
});
test('rig disposal releases actual geometry, material and skeleton resources once and preserves borrowed materials',()=>{
  const material=new T.MeshStandardMaterial(),materials=Object.fromEntries(['wood','darkFur','brass','drum','creamWood','oliveWood','steel','glass','shirt','leather','dark'].map(k=>[k,material])),rig=createBearRig(data,{materials});
  let bodyReleased=0,skeletonReleased=0,borrowedReleased=0;rig.worker.parts[0].geometry.addEventListener('dispose',()=>bodyReleased++);const releaseSkeleton=rig.worker.skeleton.dispose;rig.worker.skeleton.dispose=function(){skeletonReleased++;return releaseSkeleton.call(this);};material.addEventListener('dispose',()=>borrowedReleased++);
  rig.update(player({tool:'flamethrower'}),1);rig.dispose();rig.dispose();assert.equal(bodyReleased,1);assert.equal(skeletonReleased,1);assert.equal(borrowedReleased,0);assert.equal(rig.diagnostics().disposed,true);assert.deepEqual(rig.counts(),{geometries:0,materials:0,textures:0,objects:0});assert.throws(()=>rig.update(player(),2),/disposed/);material.dispose();
});
test('missing/incompatible renderer and missing model fail explicitly without a procedural substitute',async()=>{
  await assert.rejects(loadBearKit({THREE:{},renderer:{}}),/shared THREE/);
  const fetchBefore=globalThis.fetch,loadBefore=T.TextureLoader.prototype.loadAsync,renderer=Object.create(T.WebGLRenderer.prototype),texture=new T.Texture();let disposed=0;texture.addEventListener('dispose',()=>disposed++);
  globalThis.fetch=async()=>({ok:false,status:404});T.TextureLoader.prototype.loadAsync=async()=>texture;
  try{await assert.rejects(loadBearKit({THREE:T,renderer}),/could not load/);assert.equal(disposed,1);}finally{globalThis.fetch=fetchBefore;T.TextureLoader.prototype.loadAsync=loadBefore;}
});
test('normal paint uses native projection/skin attributes and disposes owned resources through a renderer API fixture (no WebGL)',async()=>{
  const oldFetch=globalThis.fetch,oldLoad=T.TextureLoader.prototype.loadAsync,oldDocument=globalThis.document,texture=new T.Texture({width:4,height:4}),renderer=Object.create(T.WebGLRenderer.prototype);
  const state={target:null,views:0,targets:new Set(),disposedRenderer:0};Object.defineProperty(renderer,'outputColorSpace',{value:T.SRGBColorSpace,writable:true});
  Object.assign(renderer,{toneMapping:T.ACESFilmicToneMapping,capabilities:{getMaxAnisotropy:()=>8},getRenderTarget:()=>state.target,setRenderTarget:t=>{state.target=t;if(t)state.targets.add(t);},getClearColor:c=>c.set(0x345678),getClearAlpha:()=>.7,getViewport:v=>v.set(2,3,320,240),getScissor:v=>v.set(4,5,300,220),getScissorTest:()=>true,getPixelRatio:()=>2,setClearColor(){},setScissorTest(){},setViewport(){},setScissor(){},clear(){},render(scene,camera){assert.ok(camera instanceof T.OrthographicCamera);assert.equal(scene.children.length,8);state.views++;},dispose(){state.disposedRenderer++;}});
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(4*4*4).fill(240)})})})};
  globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});T.TextureLoader.prototype.loadAsync=async()=>texture;
  let kit,rig;try{kit=await loadBearKit({THREE:T,renderer});rig=kit.create();assert.equal(state.views,4);assert.equal(state.targets.size,1);assert.equal(state.target,null);assert.equal(renderer.outputColorSpace,T.SRGBColorSpace);assert.equal(renderer.toneMapping,T.ACESFilmicToneMapping);
    assert.ok(rig.worker.parts.every(m=>m.material===rig.worker.parts[0].material&&m.geometry.attributes.paintPart&&m.geometry.attributes.paintPosition&&m.geometry.attributes.skinIndex));assert.equal(rig.diagnostics().paint,'native-normal-projection');
    const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};rig.worker.parts[0].material.onBeforeCompile(shader,renderer);assert.ok(shader.uniforms.uModelPaint&&shader.uniforms.uPaintMask&&shader.uniforms.uPaintDepth);assert.match(shader.fragmentShader,/uModelPaint/);assert.match(shader.vertexShader,/vPaintPosition/);
    let targetReleases=0,paintReleases=0;[...state.targets][0].addEventListener('dispose',()=>targetReleases++);rig.worker.parts[0].material.addEventListener('dispose',()=>paintReleases++);kit.dispose();kit.dispose();assert.equal(targetReleases,1);assert.equal(paintReleases,1);assert.equal(state.disposedRenderer,0);assert.equal(kit.diagnostics().instances,0);assert.equal(rig.diagnostics().disposed,true);
  }finally{kit?.dispose();globalThis.fetch=oldFetch;T.TextureLoader.prototype.loadAsync=oldLoad;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
test('accepted player distance, powder and presentation sampling do not change simulation snapshots',()=>{
  const sim=createSimulation({scenario:{width:32,height:16,player:{x:3,y:7},obstacles:[],actors:[]},config:{input:{cameraRelative:false}}}),rig=createBearRig(data);
  try{sim.dispatch({type:'move',x:1,y:0});for(let i=0;i<60;i++)sim.advance(1/60);const normal=sim.snapshot();rig.update(normal.player,normal.clocks.player);const normalDistance=normal.player.travelled;
    sim.dispatch({type:'drug',drug:'powder'});for(let i=0;i<60;i++)sim.advance(1/60);const boosted=sim.snapshot(),before=JSON.stringify(boosted);near(boosted.player.travelled-normalDistance,normalDistance*1.5,1e-6);near(boosted.clocks.world-normal.clocks.world,.35,1e-6);
    rig.update(boosted.player,boosted.clocks.player);rig.sampleBodyBounds();assert.equal(JSON.stringify(boosted),before);assert.equal(rig.diagnostics().position.travelled,boosted.player.travelled);
  }finally{rig.dispose();sim.dispose();}
});
test('projection failure releases temporary targets/materials and restores borrowed renderer methods',async()=>{
  const oldFetch=globalThis.fetch,oldLoad=T.TextureLoader.prototype.loadAsync,oldDocument=globalThis.document,texture=new T.Texture({width:4,height:4}),renderer=Object.create(T.WebGLRenderer.prototype),state={target:null,targetReleases:0,materialReleases:0};
  Object.defineProperty(renderer,'outputColorSpace',{value:T.SRGBColorSpace,writable:true});
  const tracked=new WeakSet(),setTarget=t=>{state.target=t;if(t&&!tracked.has(t)){tracked.add(t);t.addEventListener('dispose',()=>state.targetReleases++);}},render=(scene)=>{for(const m of scene.children)m.material.addEventListener('dispose',()=>state.materialReleases++);throw Error('Synthetic projection failure');};
  Object.assign(renderer,{toneMapping:T.ACESFilmicToneMapping,capabilities:{getMaxAnisotropy:()=>8},getRenderTarget:()=>state.target,setRenderTarget:setTarget,getClearColor:c=>c.set(0x345678),getClearAlpha:()=>.7,getViewport:v=>v.set(2,3,320,240),getScissor:v=>v.set(4,5,300,220),getScissorTest:()=>true,getPixelRatio:()=>2,setClearColor(){},setScissorTest(){},setViewport(){},setScissor(){},clear(){},render});
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(64).fill(240)})})})};globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});T.TextureLoader.prototype.loadAsync=async()=>texture;
  let kit;try{kit=await loadBearKit({THREE:T,renderer});assert.throws(()=>kit.create(),/Synthetic projection failure/);assert.equal(kit.diagnostics().instances,0);assert.equal(state.target,null);assert.equal(state.targetReleases,1);assert.equal(state.materialReleases,8);assert.equal(renderer.render,render);assert.equal(renderer.setRenderTarget,setTarget);assert.equal(renderer.outputColorSpace,T.SRGBColorSpace);assert.equal(renderer.toneMapping,T.ACESFilmicToneMapping);}
  finally{kit?.dispose();globalThis.fetch=oldFetch;T.TextureLoader.prototype.loadAsync=oldLoad;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
test('the existing near-wall art fixture keeps the native nozzle before the real wall and clips the submitted fan',()=>{
  const snapshot=fixtureSnapshot('jet-near-wall',4,'flamethrower'),rig=createBearRig(data),texture=new T.DataTexture(new Uint8Array(16),2,2),view=createDischarge(T,texture);
  try{rig.update(snapshot.player,snapshot.clocks.player);const muzzle=rig.anchors.muzzle.getWorldPosition(new T.Vector3());near(muzzle.x-snapshot.player.x,.5301);assert.ok(muzzle.x<11.4999);view.update(snapshot.discharge,snapshot.clocks.world,{muzzle});assert.equal(view.diagnostics().muzzleInsideShape,true);assert.ok(view.diagnostics().longestRay<.61);near(view.diagnostics().visualForwardStart,.5301);
    const geometry=view.root.getObjectByName('Resolved discharge ribbons').geometry;for(let i=0;i<geometry.drawRange.count;i++)assert.ok(geometry.attributes.position.getX(geometry.index.getX(i))<=11.499902);
  }finally{view.dispose();texture.dispose();rig.dispose();}
});
