import test from 'node:test';
import assert from 'node:assert/strict';
import {startApplication} from '../../src/main.js';
import {createRuntime} from '../../src/runtime/index.js';
import {assertVisualFrameCollection} from '../../tools/review/visual-half-cost-metrics.mjs';

test('displayed-frame guard retains missing-hook and mismatched-population negative controls',()=>{
  assert.throws(()=>assertVisualFrameCollection({frames:0,hostRenders:1,preparationRenders:20,allRenders:21}),/M30_FRAME_HOOK_MISSING/);
  assert.throws(()=>assertVisualFrameCollection({frames:1,hostRenders:21,preparationRenders:0,allRenders:21}),/M30_HOST_FRAME_ACCOUNTING_MISMATCH/);
  assert.throws(()=>assertVisualFrameCollection({frames:1,hostRenders:1,preparationRenders:19,allRenders:21}),/M30_RENDER_ACCOUNTING_MISMATCH/);
});

test('actual title/menu/application/custom visit facade delivers both hooks before visit readiness; paint draws are not host frames',async()=>{
  class Element extends EventTarget {
    constructor(){super();this.children=[];this.dataset={};this.clientWidth=1280;this.clientHeight=800;this.hidden=false;}
    append(child){this.children.push(child);child.parent=this;}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
    querySelector(selector){return this.nodes?.[selector]||{textContent:''};}
    setAttribute(){}
  }
  const win=new EventTarget(),doc=new EventTarget(),root=new Element(),canvas=new Element();doc.defaultView=win;doc.createElement=()=>new Element();
  win.requestAnimationFrame=()=>{throw Error('A diagnostic facade control must not start an animation loop');};win.cancelAnimationFrame=()=>{};
  root.ownerDocument=doc;root.nodes=Object.fromEntries(['#viewport','#hud','#title-screen','#main-menu','#load-state','.field-help'].map(id=>{const e=new Element();e.ownerDocument=doc;return [id,e];}));
  const publications=[],frames=[],snapshots=[],counts={renderCalls:0,hostRenders:0,disposed:0,contextLost:0};let menu,title,factoryReturned=false,selected,hostScene;
  const ui={mountTitleScreen(options){title=options;return {focusStart(){},dispose(){}};},mountMainMenu(options){menu=options;return {update(){},focusPlace(){},dispose(){}};},mountUI:()=>({update(){},dispose(){}})};
  const renderer={domElement:canvas,info:{render:{calls:0},memory:{geometries:0,textures:0}},setPixelRatio(){},setClearColor(){},setSize(){},render(scene){counts.renderCalls++;if(scene===hostScene)counts.hostRenders++;},getContext:()=>({getExtension:()=>null,getParameter:()=> 'Facade fixture; no real WebGL'}),forceContextLoss(){counts.contextLost++;},dispose(){counts.disposed++;}};
  const app=startApplication({root,ui,selectedCharacterId:'goat',autoStart:false,createVisit:async(place,options)=>{
    selected={place:place.id,character:options.characterId};
    const visit=await createRuntime({root:root.nodes['#viewport'],uiRoot:root.nodes['#hud'],scenario:'tiny',seed:1893,characterId:options.characterId,signal:options.signal,onError:options.onError,autoStart:false,
      rendererFactory:()=>renderer,observerFactory:()=>({observe(){},disconnect(){}}),mountUI:ui.mountUI,
      onPublicationProfile:row=>publications.push({...row}),onSnapshot:snapshot=>snapshots.push({tick:snapshot.tick}),onFrameProfile:row=>frames.push({...row,factoryReturned,renderSerial:counts.renderCalls,hostRenderSerial:counts.hostRenders}),
      createArtScene:async({THREE,renderer,scene})=>{hostScene=scene;const projectionScene=new THREE.Scene(),camera=new THREE.Camera();for(let i=0;i<20;i++)renderer.render(projectionScene,camera);return {update(){},dispose(){}};}});
    factoryReturned=true;return visit;
  }});
  try{
    assert.equal(app.state().phase,'title');assert.equal(frames.length,0);title.onStart();assert.equal(app.state().phase,'menu');
    assert.equal(await menu.onSelect('catalogue-street'),true);assert.deepEqual(selected,{place:'catalogue-street',character:'goat'});assert.equal(app.state().phase,'visit');
    assert.equal(publications.length,1);assert.equal(publications[0].tick,0);assert.equal(frames.length,1);assert.equal(frames[0].tick,0);assert.equal(frames[0].factoryReturned,false);assert.equal(frames[0].kind,'presentation');assert.equal(frames[0].renderSerial,21);
    // The failed browser assertion confused these two different populations.
    assert.notEqual(frames.length,counts.renderCalls);assert.equal(frames[0].hostRenderSerial,1);assert.equal(frames.length,counts.hostRenders);assert.deepEqual(snapshots,[{tick:0}]);
    assertVisualFrameCollection({frames:frames.length,hostRenders:counts.hostRenders,preparationRenders:20,allRenders:counts.renderCalls});
    app.visit().advance(1/60);assert.equal(publications.length,2);assert.equal(publications[1].tick,1);assert.equal(frames.length,2);assert.equal(frames[1].kind,'advance');assert.equal(frames[1].tick,1);
    app.visit().zoom(1.1);assert.equal(frames.length,3);assert.equal(frames[2].kind,'presentation');assert.equal(frames[2].tick,1);assert.equal(publications.length,2);assert.deepEqual(frames.map(r=>r.hostRenderSerial),[1,2,3]);assert.equal(counts.hostRenders,frames.length);
  }finally{app.dispose();}
  assert.equal(counts.disposed,1);assert.equal(counts.contextLost,1);assert.equal(root.nodes['#viewport'].children.length,0);
});
