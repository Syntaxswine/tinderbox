import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTrial,createClock,ambientWind,calmWind} from '../../workbenches/furnished-house/simulation.js';
import {createNavigation} from '../../workbenches/furnished-house/navigation.js';
import {prepareFurnishedData} from '../../workbenches/furnished-house/prepare-data.js';
import {createEffectPreferences} from '../../workbenches/furnished-house/effect-preferences.js';
import {mountEffectControls} from '../../workbenches/furnished-house/effect-controls.js';
import {REPLAYS,replayCommand} from '../../workbenches/furnished-house/replay-data.js';
import {buildGrassFixture,grassFrame} from '../../workbenches/furnished-house/grass-fixture.js';

const on={flames:true,smoke:true,lighting:true},key='tinderbox.furnished-house.effects.v1';
const fixture={version:1,prefabId:'effect-binding-control',gridOrigin:[0,0,0],surfaces:[{id:'wood',kind:'floor',level:0,normal:[0,1,0],thickness:.12,material:'timber',fuelClass:'frame',fuelAmount:4,triangles:[[[0,0,0],[2,0,0],[2,0,2]],[[0,0,0],[2,0,2],[0,0,2]]]}]};
const memory=()=>{const data=new Map(),writes=[];return {data,writes,getItem:k=>data.get(k)??null,setItem(k,v){data.set(k,v);writes.push([k,v]);}};};

// Execute the real entrypoint body with real store/thermal/navigation modules.
// Only the import loader, DOM, art sink and GPU resources are substituted.
// The actual UI/store/API handshake runs; browser visuals/native defaults and
// culling remain separate from this bounded wiring/lifecycle check.
async function boot(storage=memory(),search=''){
  class Vector{constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}fromArray(a){return this.set(...a);}}
  class Group{constructor(){this.children=[];this.position=new Vector();this.rotation={};}add(...children){this.children.push(...children);}traverse(fn){fn(this);for(const child of this.children)child.traverse(fn);}}
  class Camera extends Group{lookAt(){}updateMatrixWorld(){}updateProjectionMatrix(){}}
  class Resource{dispose(){}}
  class Mesh extends Group{constructor(geometry,material){super();Object.assign(this,{geometry,material});}}
  class Renderer{constructor(){this.info={render:{calls:0,triangles:2},memory:{geometries:1,textures:0}};}setPixelRatio(){}setSize(){}render(){this.info.render.calls++;}dispose(){}}
  let document;
  class Element extends EventTarget{
    constructor(tag='div'){super();this.tagName=tag;this.ownerDocument=document;this.children=[];this.dataset={};this.style={};this.attributes=new Map();this.textContent='';}
    append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}
    setAttribute(k,v){this.attributes.set(k,v);}closest(){return null;}
  }
  const elements=new Map(),frames=new Map(),artCalls=[],stores=[],errors=[];
  const lifecycle={mounts:0,unmounts:0,root:null,get controls(){return Object.fromEntries(this.root.children[0].children.filter(n=>n.tagName==='label').map(label=>{const input=label.children[0];return [input.dataset.effect,input.checked];}));}};
  const element=id=>{if(!elements.has(id)){const e=new Element();e.id=id;e.value={speed:'1',view:'exterior',level:'0',wind:'ambient',tool:'match'}[id]||'';elements.set(id,e);}return elements.get(id);};
  document={getElementById:element,querySelectorAll:()=>[],createElement:tag=>new Element(tag)};
  const art={root:new Group(),update(frame,view){artCalls.push({frame,view});},diagnostics:()=>({}),dispose(){}},events=new Map();let nextFrame=0;
  const context=vm.createContext({T:{Scene:Group,OrthographicCamera:Camera,Vector3:Vector,Color:Resource,WebGLRenderer:Renderer,PlaneGeometry:Resource,MeshStandardMaterial:Resource,Mesh,SRGBColorSpace:'srgb'},
    createTrial,createClock,ambientWind,calmWind,createNavigation,prepareFurnishedData,REPLAYS,replayCommand,buildGrassFixture,grassFrame,structuredClone,
    createEffectPreferences(options){const store=createEffectPreferences({storage,...options});stores.push(store);return store;},
    mountEffectControls(options){assert.equal(options.root.id,'fire-effect-settings');lifecycle.mounts++;lifecycle.root=options.root;const stop=mountEffectControls(options);return ()=>{lifecycle.unmounts++;stop();};},
    __artModule:{createFurnishedHouseArt:async()=>art},loadCharacterKit:async()=>({create:()=>({root:new Group(),update(){}}),dispose(){}}),createStreetNight:()=>({root:new Group(),dispose(){}}),
    document,innerWidth:1280,innerHeight:800,devicePixelRatio:1,performance,URL,URLSearchParams,location:{search},
    fetch:async()=>({ok:true,json:async()=>structuredClone(fixture)}),requestAnimationFrame(fn){const id=++nextFrame;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    addEventListener(type,fn){events.set(type,fn);},console:{error:e=>errors.push(e)}});
  context.window=context;
  const url=new URL('../../workbenches/furnished-house/main.js',import.meta.url),raw=fs.readFileSync(url,'utf8'),loader="import(new URL('./art.js',import.meta.url).href)";
  assert.ok(raw.includes(loader));
  const source=raw.replace(/^import .*;\r?\n/gm,'').replace(loader,'Promise.resolve(__artModule)').replaceAll('import.meta.url',JSON.stringify(url.href)).replace(/\ninitialize\(\)\.catch/,'\nglobalThis.initialization=initialize().catch');
  vm.runInContext(source,context,{filename:url.pathname});await context.initialization;
  assert.deepEqual(errors,[]);assert.ok(context.__furnished?.ready);
  return {api:context.__furnished,storage,artCalls,stores,lifecycle,frames,events};
}

test('real entrypoint forwards eight masks immediately while paused without changing physics, commands or clocks',async()=>{
  const h=await boot(),{api}=h;try{
    api.setAutoRender(false);api.command({type:'match',position:[.1,.1,.1]});api.advanceTicks(30);
    const before=api.snapshot(),clock=api.diagnostics().clock,replay=api.replay();assert.ok(before.cells.length);
    assert.deepEqual(structuredClone(h.artCalls.at(-1).view.windMetadata),{kind:'ambient-control',speed:1.5,direction:[1,0,0],obstacleResolved:false});
    for(let mask=0;mask<8;mask++){
      const effects={flames:!!(mask&1),smoke:!!(mask&2),lighting:!!(mask&4)},draws=h.artCalls.length;
      assert.deepEqual(api.setEffects(effects),effects);assert.ok(h.artCalls.length>draws);
      assert.deepEqual(api.effects(),effects);assert.deepEqual(h.lifecycle.controls,effects);assert.deepEqual(h.artCalls.at(-1).view.effects,effects);
      assert.equal(h.artCalls.at(-1).frame.worldTime,before.worldTime);assert.equal(h.artCalls.at(-1).frame.full,false);
      assert.equal(h.artCalls.at(-1).frame.tombstones.length,0);assert.deepEqual(api.snapshot(),before);assert.deepEqual(api.diagnostics().clock,clock);assert.deepEqual(api.replay(),replay);
    }
    const smoke=h.lifecycle.root.children[0].children.find(n=>n.tagName==='label'&&n.children[0].dataset.effect==='smoke').children[0];
    smoke.checked=false;smoke.dispatchEvent(new Event('change'));
    assert.deepEqual(api.effects(),{...on,smoke:false});assert.deepEqual(h.artCalls.at(-1).view.effects,api.effects());assert.deepEqual(api.snapshot(),before);assert.deepEqual(api.diagnostics().clock,clock);assert.deepEqual(api.replay(),replay);api.setEffects({smoke:true});
    api.setView('cutaway',1);api.setCamera({verticalSpan:9,target:[3,1,2]});assert.deepEqual(api.snapshot(),before);assert.deepEqual(api.diagnostics().clock,clock);
    const exposed=api.effects();exposed.smoke=false;assert.deepEqual(api.effects(),on);assert.equal(h.lifecycle.mounts,1);assert.equal(h.stores.length,1);
  }finally{api.dispose();}
});

test('resets keep one preference/control session, refresh restores choices, and disposal disconnects UI and redraws',async()=>{
  const storage=memory(),h=await boot(storage),effects={flames:false,smoke:true,lighting:false};
  h.api.setEffects(effects);const writes=storage.writes.length;
  h.api.reset();h.api.reset();h.api.runReplay('bedroom',{play:false});
  assert.deepEqual(h.api.effects(),effects);assert.deepEqual(h.artCalls.at(-1).view.effects,effects);assert.equal(storage.writes.length,writes);
  assert.equal(h.lifecycle.mounts,1);assert.equal(h.stores.length,1);assert.equal(h.lifecycle.unmounts,0);
  h.api.dispose();h.api.dispose();const draws=h.artCalls.length;
  h.api.setEffects(on);h.stores[0].set(on);h.api.draw();
  assert.equal(h.artCalls.length,draws);assert.equal(storage.writes.length,writes);assert.equal(h.lifecycle.unmounts,1);assert.equal(h.frames.size,0);
  const restored=await boot(storage);try{assert.deepEqual(restored.api.effects(),effects);assert.deepEqual(restored.lifecycle.controls,effects);assert.equal(JSON.parse(storage.data.get(key)).flames,false);}finally{restored.api.dispose();}
});

test('focused native settings inputs keep keyboard gestures out of the movement adapter',async()=>{
  const h=await boot();try{
    const before=h.api.observer().position;let prevented=false;
    const checkbox={closest:selector=>selector.split(',').includes('input')?checkbox:null};
    h.events.get('keydown')({key:'ArrowRight',target:checkbox,preventDefault(){prevented=true;}});
    const frame=time=>{const [id,fn]=h.frames.entries().next().value;h.frames.delete(id);fn(time);};
    h.api.play();frame(0);frame(16);h.api.pause();
    assert.equal(prevented,false);assert.deepEqual(h.api.observer().position,before);
  }finally{h.api.dispose();}
});

test('building-light comparison mode is reset-stable, immediate and separate from stored booleans and physics',async()=>{
  const storage=memory(),h=await boot(storage,'?lighting=building');try{
    assert.equal(h.api.lightingMode(),'building');assert.equal(h.artCalls.at(-1).view.lightingMode,'building');
    h.api.setAutoRender(false);h.api.advanceTicks(30);const before=h.api.snapshot(),clock=h.api.diagnostics().clock,commands=h.api.replay(),writes=storage.writes.length;
    for(const mode of ['local','building',null,'BUILDING','building']){
      const expected=mode==='building'?'building':'local';assert.equal(h.api.setLightingMode(mode),expected);assert.equal(h.artCalls.at(-1).view.lightingMode,expected);
      assert.deepEqual(h.api.snapshot(),before);assert.deepEqual(h.api.diagnostics().clock,clock);assert.deepEqual(h.api.replay(),commands);assert.deepEqual(h.api.effects(),on);
    }
    assert.equal(storage.writes.length,writes);h.api.reset();h.api.runReplay('kitchen',{play:false});assert.equal(h.api.lightingMode(),'building');assert.equal(h.lifecycle.mounts,1);
    h.api.setEffects({lighting:false,lightingMode:'local'});assert.equal(h.api.lightingMode(),'building');assert.deepEqual(JSON.parse(storage.data.get(key)),{...on,lighting:false});
  }finally{h.api.dispose();}
  assert.equal(h.api.setLightingMode('local'),'building');
  const invalid=await boot(storage,'?lighting=unknown');try{assert.equal(invalid.api.lightingMode(),'local');}finally{invalid.api.dispose();}
});

test('grass selection precedes art creation, survives replay reset and exposes detached metadata with retained paused deltas',async()=>{
  const plain=await boot();try{assert.equal(plain.api.grassFixture().enabled,false);assert.equal(plain.api.data.surfaces.length,1);}finally{plain.api.dispose();}
  const h=await boot(memory(),'?grass=on&lighting=building');try{
    h.api.setAutoRender(false);const metadata=h.api.grassFixture();assert.equal(metadata.enabled,true);assert.ok(h.api.data.surfaces.some(s=>s.id.startsWith('grass-ground/')));assert.ok(h.artCalls[0].frame.grassGround.length);
    metadata.occupiedTriangles.length=0;assert.ok(h.api.grassFixture().occupiedTriangles.length);
    h.api.setEffects({smoke:false});const before=h.api.snapshot();h.api.setCamera({verticalSpan:10});assert.equal(h.artCalls.at(-1).frame.grassGround.length,0);assert.deepEqual(h.api.snapshot(),before);
    h.api.reset();h.api.runReplay('kitchen',{play:false});assert.equal(h.api.grassFixture().enabled,true);assert.ok(h.artCalls.at(-1).frame.grassGround.length);assert.equal(h.api.effects().smoke,false);assert.equal(h.api.lightingMode(),'building');
  }finally{h.api.dispose();}
});
