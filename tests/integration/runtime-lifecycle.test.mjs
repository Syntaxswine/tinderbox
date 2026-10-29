import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime} from '../../src/runtime/index.js';
import {createSimulation} from '../../src/simulation/index.js';
import {loadOwnedPair} from '../../src/reuse/loading.js';
function fixture(){
  const counts={renderer:0,context:0,observer:0,art:0,ui:0,simulation:0,frames:0};
  class Node extends EventTarget{constructor(){super();this.clientWidth=900;this.clientHeight=600;this.children=[];}append(child){this.children.push(child);child.parent=this;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}setAttribute(){}getBoundingClientRect(){return{left:0,top:0,width:900,height:600};}}
  const win=new EventTarget();win.requestAnimationFrame=()=>++counts.frames;win.cancelAnimationFrame=()=>{counts.frames=0;};const doc=new EventTarget();doc.defaultView=win;
  const root=new Node();root.ownerDocument=doc;const canvas=new Node();
  const renderer={domElement:canvas,info:{render:{calls:0},memory:{geometries:0,textures:0}},setPixelRatio(){},setClearColor(){},setSize(){},render(){},getContext:()=>({getExtension:()=>null,getParameter:()=> 'Renderer API fixture; no WebGL'}),forceContextLoss(){counts.context++;},dispose(){counts.renderer++;}};
  const sim=createSimulation({scenario:'tiny'}),release=sim.dispose;sim.dispose=()=>{counts.simulation++;release();};
  return {counts,root,canvas,renderer,sim,options:{root,simulation:sim,rendererFactory:()=>renderer,observerFactory:()=>({observe(){},disconnect(){counts.observer++;}}),autoStart:false,
    createArtScene:async()=>({update(){},dispose(){counts.art++;}}),mountUI:()=>({update(){},dispose(){counts.ui++;}})}};
}
test('renderer construction/setup failure releases the simulation and every partially allocated host resource',async()=>{
  const a=fixture();await assert.rejects(createRuntime({...a.options,rendererFactory(){throw Error('WebGL unavailable');}}),/WebGL/);assert.equal(a.counts.simulation,1);assert.equal(a.root.children.length,0);
  const b=fixture();b.renderer.setPixelRatio=()=>{throw Error('setup failed');};await assert.rejects(createRuntime(b.options),/setup/);assert.equal(b.counts.renderer,1);assert.equal(b.counts.simulation,1);assert.equal(b.counts.context,1);
});
test('abort during art loading stops the renderer immediately and disposes late art before mounting UI',async()=>{
  const f=fixture(),controller=new AbortController();let resolve;const art=new Promise(r=>resolve=r);
  const pending=createRuntime({...f.options,signal:controller.signal,createArtScene:()=>art});controller.abort();assert.equal(f.counts.renderer,1);assert.equal(f.root.children.length,0);
  resolve({update(){},dispose(){f.counts.art++;}});await assert.rejects(pending,error=>error.name==='AbortError');assert.equal(f.counts.art,1);assert.equal(f.counts.ui,0);assert.equal(f.counts.observer,1);assert.equal(f.counts.simulation,1);
});
test('UI setup failure, context loss, focus cancellation and repeated disposal keep one runtime and release all owners',async()=>{
  const a=fixture();await assert.rejects(createRuntime({...a.options,mountUI(){throw Error('UI failed');}}),/UI/);assert.equal(a.counts.art,1);assert.equal(a.counts.renderer,1);
  const b=fixture(),errors=[];let uiOptions;const runtime=await createRuntime({...b.options,autoStart:true,onError:e=>errors.push(e),mountUI:options=>{uiOptions=options;return{update(){},dispose(){b.counts.ui++;}};}});
  assert.equal(b.counts.frames,1);runtime.dispatch({type:'move',x:1,y:0});runtime.advance(1/60);b.root.ownerDocument.defaultView.dispatchEvent(new Event('blur'));assert.equal(runtime.snapshot().paused,true);
  assert.equal(typeof uiOptions.onZoom,'function');assert.equal(runtime.dispatch({type:'view-overview'}),true);runtime.advance(1/60);assert.equal(runtime.metrics().camera.mode,'overview');
  b.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));runtime.dispose();assert.equal(errors.length,1);assert.equal(b.counts.frames,0);for(const key of ['renderer','context','observer','art','ui','simulation'])assert.equal(b.counts[key],1,key);assert.equal(b.root.children.length,0);
});
test('native model/texture loads cancel promptly and release fulfilled or late textures after cancellation and partial failure',async()=>{
  let resolveTexture,released=0;const controller=new AbortController(),texture=new Promise(resolve=>resolveTexture=resolve);
  const pair=loadOwnedPair(new Promise(()=>{}),texture,controller.signal);controller.abort();await assert.rejects(pair,error=>error.name==='AbortError');resolveTexture({dispose(){released++;}});await Promise.resolve();assert.equal(released,1);
  let rejectModel;const failure=loadOwnedPair(new Promise((_,reject)=>rejectModel=reject),Promise.resolve({dispose(){released++;}}));await Promise.resolve();rejectModel(Error('Model unavailable'));await assert.rejects(failure,/unavailable/);assert.equal(released,2);
});
test('focus lost while assets are still loading is retained as a paused visit, with no held movement replay',async()=>{
  const f=fixture();let resolve;const pending=createRuntime({...f.options,createArtScene:()=>new Promise(r=>resolve=r)});
  f.sim.dispatch({type:'move',x:1,y:0});f.root.ownerDocument.defaultView.dispatchEvent(new Event('blur'));
  resolve({update(){},dispose(){f.counts.art++;}});const runtime=await pending;assert.equal(runtime.snapshot().paused,true);const position=runtime.snapshot().player.x;runtime.dispatch({type:'pause',paused:false});runtime.advance(.1);assert.equal(runtime.snapshot().player.x,position);runtime.dispose();
});

test('exiting never advances queued gameplay, and a failed cleanup still releases the remaining owners',async()=>{
  const f=fixture(),runtime=await createRuntime({...f.options,observerFactory:()=>({observe(){},disconnect(){f.counts.observer++;throw Error('observer cleanup failed');}})});
  let advances=0;const advance=f.sim.advance;f.sim.advance=delta=>{advances++;return advance(delta);};runtime.dispatch({type:'use'});runtime.dispose();runtime.dispose();
  assert.equal(advances,0);assert.deepEqual(runtime.metrics().cleanupErrors,['observer cleanup failed']);
  for(const key of ['renderer','context','observer','art','ui','simulation'])assert.equal(f.counts[key],1,key);assert.equal(f.root.children.length,0);
});
