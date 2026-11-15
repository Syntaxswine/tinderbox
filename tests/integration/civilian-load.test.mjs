import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as T from '../../src/runtime/three.js';
import {loadCivilianKit} from '../../src/reuse/civilians.js';
import {CIVILIAN_PROFILES} from '../../src/content/exterior-kit.js';

test('civilian projection failure retires targets and restores the borrowed renderer; a normal full-resolution retry still works',async()=>{
  const oldFetch=globalThis.fetch,oldLoad=T.TextureLoader.prototype.loadAsync,oldDocument=globalThis.document;
  const renderer=Object.create(T.WebGLRenderer.prototype),state={target:null,targets:[],targetReleases:0,fail:true},tracked=new WeakSet();
  const setTarget=target=>{state.target=target;if(target&&!tracked.has(target)){tracked.add(target);state.targets.push([target.width,target.height]);target.addEventListener('dispose',()=>state.targetReleases++);}};
  const render=()=>{if(state.fail)throw Error('Civilian projection failed');};
  Object.defineProperty(renderer,'outputColorSpace',{value:T.SRGBColorSpace,writable:true});
  Object.assign(renderer,{toneMapping:T.ACESFilmicToneMapping,capabilities:{getMaxAnisotropy:()=>8},getRenderTarget:()=>state.target,setRenderTarget:setTarget,getClearColor:c=>c.set(0x345678),getClearAlpha:()=>.7,getViewport:v=>v.set(2,3,320,240),getScissor:v=>v.set(4,5,300,220),getScissorTest:()=>true,getPixelRatio:()=>2,setClearColor(){},setScissorTest(){},setViewport(){},setScissor(){},clear(){},render});
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(64).fill(240)})})})};
  globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(fileURLToPath(url)))});
  let sourceReleases=0;T.TextureLoader.prototype.loadAsync=async()=>{const texture=new T.Texture({width:4,height:4});texture.addEventListener('dispose',()=>sourceReleases++);return texture;};
  let kit;
  try{
    kit=await loadCivilianKit({THREE:T,renderer});const actor={...CIVILIAN_PROFILES.goat,id:'control',team:'civilian',headgear:'none',equipment:'none',x:0,y:0,heading:0,moving:false,travelled:0,hp:100};
    assert.throws(()=>kit.create(actor),/Civilian projection failed/);assert.equal(kit.diagnostics().instances,0);assert.equal(state.target,null);assert.equal(state.targetReleases,1);
    assert.equal(renderer.render,render);assert.equal(renderer.setRenderTarget,setTarget);assert.equal(renderer.outputColorSpace,T.SRGBColorSpace);assert.equal(renderer.toneMapping,T.ACESFilmicToneMapping);
    state.fail=false;const instance=kit.create(actor);assert.equal(kit.diagnostics().instances,1);assert.ok(state.targets.every(([w,h])=>w===2048&&h===1024));
    instance.dispose();instance.dispose();assert.equal(kit.diagnostics().instances,0);assert.equal(state.targetReleases,state.targets.length);
    kit.dispose();kit.dispose();assert.equal(sourceReleases,2);
  }finally{kit?.dispose();globalThis.fetch=oldFetch;T.TextureLoader.prototype.loadAsync=oldLoad;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
