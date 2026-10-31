import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import * as T from '../../src/runtime/three.js';
import {createArtScene} from '../../src/art/index.js';
import {createGroundField} from '../../src/art/ground-field.js';
import {createFireReviewSimulation} from '../../tools/fire-realism/scenarios.js';
import {groundCharReviewEvidence,GROUND_CHAR_REVIEW_LIMIT} from '../../tools/fire-realism/ground-char-evidence.js';
const source=()=>({tick:4,clocks:{world:.1,player:.15},world:{width:20,height:2,fireCellSize:.5},cells:[]});
const cell=(id,i)=>({id,x:(i+.5)*.5,y:.25,size:.5,phase:'burning',initialSurfaceFuel:.08,surfaceFuel:.04,consumedDepositedFuel:0,depositedFuel:.0625,heat:1.5,intensity:.8});
const model=snapshot=>({groundChar:{charMode:snapshot.cells.length?'consumed-fuel-v1':'empty',charVersion:1,cells:snapshot.cells.length},lastSnapshot:{tick:snapshot.tick,worldTime:snapshot.clocks.world,playerTime:snapshot.clocks.player}});

test('bounded ASCII evidence selects burning/consumed cells, truncates deterministically and detaches every nested value',()=>{
  const snapshot=source();snapshot.cells=Array.from({length:40},(_,i)=>cell('cell:'+i+',0',i));snapshot.cells.push({...cell('cold',40),x:20.25,phase:'cold',surfaceFuel:.08});
  const before=structuredClone(snapshot),diagnostics=model(snapshot),a=groundCharReviewEvidence(snapshot,diagnostics),b=groundCharReviewEvidence({...snapshot,cells:[...snapshot.cells].reverse()},diagnostics);
  assert.equal(GROUND_CHAR_REVIEW_LIMIT,32);assert.equal(a.status,'available');assert.equal(a.cells.length,32);assert.deepEqual(a,b);assert.deepEqual(a.coverage,{maxCells:32,sourceCells:41,modelCells:41,candidates:40,selected:32,omitted:8,truncated:true});
  const ids=snapshot.cells.slice(0,40).map(c=>c.id).sort();assert.deepEqual(a.cells.map(c=>c.id),ids.slice(0,32));
  assert.deepEqual(a.cells[0].expectedFloat32RGBA,Array.from(new Float32Array([.5,.6,.5,1])));assert.equal(a.gpuTextureReadback,false);assert.equal(a.uploadProved,false);
  assert.deepEqual(snapshot,before);a.cells[0].nativePosition[0]=999;a.cells[0].expectedFloat32RGBA[2]=999;a.snapshot.worldTime=999;a.modelUpdate.playerTime=999;
  assert.deepEqual(groundCharReviewEvidence(snapshot,diagnostics),b);assert.deepEqual(snapshot,before);
});

test('missing, legacy, mixed, malformed and stale model evidence stays explicitly unavailable or mismatched',()=>{
  const s=source();s.cells=[cell('cell:0,0',0)];const m=model(s);
  assert.equal(groundCharReviewEvidence(null,m).status,'unavailable');assert.equal(groundCharReviewEvidence(s,null).status,'unavailable');assert.equal(groundCharReviewEvidence(s,{...m,disposed:true}).status,'unavailable');
  const legacy={...s,cells:s.cells.map(({initialSurfaceFuel,consumedDepositedFuel,...c})=>c)};const old={...m,groundChar:{charMode:'legacy-phase',charVersion:0,cells:1}};
  const record=groundCharReviewEvidence(legacy,old);assert.equal(record.status,'legacy');assert.deepEqual(record.cells,[]);assert.equal(record.coverage.candidates,null);
  for(const cells of [[s.cells[0],legacy.cells[0]],[{...s.cells[0],consumedDepositedFuel:-1}],[{...s.cells[0],id:'non-ASCII-\u00e9'}],[{...s.cells[0],heat:NaN}]])assert.equal(groundCharReviewEvidence({...s,cells},m).status,'unavailable');
  const stale=groundCharReviewEvidence(s,{...m,lastSnapshot:{tick:3,worldTime:.05,playerTime:.1}});assert.equal(stale.status,'clock-mismatch');assert.equal(stale.clocksMatch,false);assert.equal(stale.snapshot.tick,4);assert.equal(stale.modelUpdate.tick,3);assert.equal(stale.cells.length,1,'Snapshot-only CPU expectation remains explicitly separate from stale model');
  assert.equal(groundCharReviewEvidence(s,{...m,groundChar:{...m.groundChar,cells:2}}).status,'model-mismatch');
  assert.equal(groundCharReviewEvidence(source(),model(source())).status,'available');
});

test('actual four-cell native burnout records equal the actual CPU field mask before/at/after phase change without touching clocks or resources',()=>{
  const sim=createFireReviewSimulation({scenario:'match-contact'}),field=createGroundField(T),phases=new Set();let compared=0;
  try{for(let frame=0;frame<196;frame++){
    const snapshot=sim.advance();if(frame<189)continue;const before=structuredClone(snapshot);field.update(snapshot);
    const actual=field.diagnostics(),evidence=groundCharReviewEvidence(snapshot,{...model(snapshot),groundChar:actual});
    assert.equal(evidence.status,'available');assert.equal(evidence.cells.length,4);assert.equal(evidence.coverage.truncated,false);
    for(const c of evidence.cells){const i=(Math.floor(c.y/.5)*field.uniforms.grid.value.x+Math.floor(c.x/.5))*4;assert.deepEqual(c.expectedFloat32RGBA,Array.from(field.uniforms.field.value.image.data.slice(i,i+4)));phases.add(c.phase);}
    assert.deepEqual(snapshot,before);assert.deepEqual(sim.snapshot(),snapshot);assert.deepEqual(field.counts(),{geometries:1,materials:1,textures:1,objects:0});compared++;
  }assert.equal(compared,7);assert.deepEqual([...phases].sort(),['burning','spent']);}finally{sim.dispose();field.dispose();}
});

test('actual injected art diagnostics expose the ground mode beside unchanged counts and distinguish model clocks without extra render/update',async()=>{
  const oldFetch=globalThis.fetch,oldLoad=T.TextureLoader.prototype.loadAsync,oldDocument=globalThis.document;
  const renderer=Object.create(T.WebGLRenderer.prototype);let projections=0,target=null;
  Object.defineProperty(renderer,'outputColorSpace',{value:T.SRGBColorSpace,writable:true});
  Object.assign(renderer,{toneMapping:T.NoToneMapping,capabilities:{getMaxAnisotropy:()=>8},getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},getClearColor:c=>c.set('#203028'),getClearAlpha:()=>1,getViewport:v=>v.set(0,0,1280,800),getScissor:v=>v.set(0,0,1280,800),getScissorTest:()=>false,getPixelRatio:()=>1,setClearColor(){},setViewport(){},setScissor(){},setScissorTest(){},clear(){},render(){projections++;}});
  const context=new Proxy({getImageData:()=>({data:new Uint8ClampedArray(64).fill(220)})},{get:(o,k)=>k in o?o[k]:()=>{}});globalThis.document={createElement:()=>({getContext:()=>context})};
  globalThis.fetch=async resource=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(fileURLToPath(new URL(resource))))});T.TextureLoader.prototype.loadAsync=async()=>new T.Texture({width:4,height:4});
  const sim=createFireReviewSimulation(),scene=new T.Scene();let art;
  try{
    const snapshot=sim.advance();art=await createArtScene({THREE:T,renderer,scene,world:snapshot.world});art.update(snapshot,{worldTime:2,playerTime:3});const prior=art.diagnostics(),draws=projections;
    assert.deepEqual(prior.ground,{geometries:1,materials:1,textures:1,objects:0});assert.deepEqual(prior.groundChar,{charMode:'consumed-fuel-v1',charVersion:1,cells:snapshot.cells.length});
    assert.deepEqual(prior.lastSnapshot,{tick:snapshot.tick,worldTime:2,playerTime:3});const evidence=groundCharReviewEvidence(snapshot,prior);assert.equal(evidence.status,'clock-mismatch');assert.equal(evidence.modelUpdate.worldTime,2);assert.equal(evidence.snapshot.worldTime,snapshot.clocks.world);
    for(let i=0;i<3;i++)groundCharReviewEvidence(snapshot,art.diagnostics());assert.equal(projections,draws);assert.equal(art.diagnostics().updates,prior.updates);assert.deepEqual(art.diagnostics().ground,prior.ground);
    evidence.cells[0].expectedFloat32RGBA[2]=999;assert.notEqual(groundCharReviewEvidence(snapshot,art.diagnostics()).cells[0].expectedFloat32RGBA[2],999);
  }finally{art?.dispose();sim.dispose();globalThis.fetch=oldFetch;T.TextureLoader.prototype.loadAsync=oldLoad;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});

test('actual public driver state, phase JSON and JPEG metadata carry the same bounded ground evidence',()=>{
  const fixture=fileURLToPath(new URL('../fixtures/fire-driver-results.mjs',import.meta.url));const result=spawnSync(process.execPath,['--experimental-vm-modules',fixture,'--ground-char'],{cwd:process.cwd(),encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:4*1024*1024});
  assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr+'\n'+result.stdout);const proof=JSON.parse(result.stdout);assert.equal(proof.adapterSourceCount,21);assert.equal(proof.gpuEvidence,false);assert.equal(proof.burnoutFrames,4);assert.equal(proof.extraStateDraws,0);assert.equal(proof.extraStateUpdates,0);assert.equal(proof.captureDraws,4);assert.equal(proof.callbacksRemaining,0);
});
