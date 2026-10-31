// Finite API-only driver lifecycle probe. No WebGL pixels or GPU cost evidence.
// The actual driver camera/cadence/state/measurement functions are evaluated intact;
// Renderer/art/browser transports are explicit API fixtures; simulation/camera
// wrappers only count calls while forwarding the unchanged native methods.
// The manual no-pixel reference is first proved unsupported; an explicit local
// support-provider fixture then permits lifecycle-only camera/depth probes.
// It does not claim a verified R09 delivery, source compatibility or acceptance.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {waitForFireApi} from './fire-api-wait.mjs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as T from '../../src/runtime/three.js';
import {createBearRig,BEAR_SOURCE_COMMIT} from '../../src/reuse/bear.js';
import {createNeighborhood} from '../../src/art/neighborhood.js';
import {createGroundField} from '../../src/art/ground-field.js';
import {createFireReviewSimulation} from '../../tools/fire-realism/scenarios.js';
import {placeFireReviewCamera} from '../../tools/fire-realism/camera.js';
const project=fileURLToPath(new URL('../../',import.meta.url)),base='https://fixture.invalid/tinderbox/';
const priorFetch=globalThis.fetch,callbacks=new Map(),queries=new Set();
let allowApiSupportFixture=false,unverifiedSourceChecks=0;
let nextFrame=0,now=0,currentPass='current',artCreated=0,artDisposed=0,stage='first',driver,cancellation=null,cancelStarted=false;
const notifications=[],measuring=[],domBytes=[],domHasOnlyNewState=[];let stopDuringPreparing=false,throwDuringPreparing=false;
function element(){return {style:{},dataset:{},textContent:'',children:[],append(child){this.children.push(child);},remove(){},setAttribute(){},addEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:1280,height:800};}};}
const win={requestAnimationFrame(callback){const id=++nextFrame;callbacks.set(id,callback);return id;},cancelAnimationFrame(id){callbacks.delete(id);}};
const doc={hidden:false,defaultView:win,createElement:element},root={...element(),ownerDocument:doc};
const ext={TIME_ELAPSED_EXT:8,GPU_DISJOINT_EXT:9};
const gl={RENDERER:1,VENDOR:2,VERSION:3,QUERY_RESULT_AVAILABLE:4,QUERY_RESULT:5,drawingBufferWidth:1280,drawingBufferHeight:800,
 getExtension:name=>name==='EXT_disjoint_timer_query_webgl2'?ext:null,
 getParameter:key=>key===9?false:({1:'API-only test renderer',2:'Synthetic fixture',3:'No actual WebGL'})[key],
 createQuery(){const query={};queries.add(query);return query;},beginQuery(_target,query){query.ms=currentPass==='no-fire'?1:3;},endQuery(){},
 getQueryParameter:(query,key)=>key===4?true:query.ms*1e6,deleteQuery:query=>queries.delete(query)};
let rendererDisposed=0,mainDraws=0,depthDraws=0,packetChecks=0,cameraAdvances=0,queryCreated=0,lastRaw=null,fullSnapshots=0,narrowSteps=0,activeEffect=null,lastAnchors=null;
const originalQuery=gl.createQuery;gl.createQuery=()=>{queryCreated++;return originalQuery();};
const actorData=JSON.parse(fs.readFileSync(path.join(project,`vendor/animal-factory-tactics-3d/${BEAR_SOURCE_COMMIT}/dist/tactics/bear-10k-data.json`))),catalogue={houses:['gross','hopkins'].flatMap(name=>JSON.parse(fs.readFileSync(path.join(project,`assets/art/${name}-housing-v1/houses.json`))).houses)};
const packets=[];let target=null;
class RendererFixture{
 constructor(){this.domElement=element();this.domElement.toDataURL=()=> 'data:image/jpeg;base64,ZmFrZQ==';this.debug={};this.info={render:{calls:0,triangles:0,lines:0,points:0},memory:{geometries:0,textures:0},reset(){}};this.ratio=1;this.autoClear=true;this.shadowMap={autoUpdate:true};}
 setClearColor(){}getContext(){return gl;}setPixelRatio(value){this.ratio=value;}getPixelRatio(){return this.ratio;}
 setSize(width,height){gl.drawingBufferWidth=Math.floor(width*this.ratio);gl.drawingBufferHeight=Math.floor(height*this.ratio);}
 getDrawingBufferSize(v){return v.set(gl.drawingBufferWidth,gl.drawingBufferHeight);}getRenderTarget(){return target;}setRenderTarget(value){target=value;}getViewport(v){return v.set(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);}getScissor(v){return v.set(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);}getScissorTest(){return false;}setViewport(){}setScissor(){}setScissorTest(){}clear(){}
 render(_scene,camera){if(target){depthDraws++;return;}mainDraws++;if(activeEffect?.diagnostics().mode==='reference'){const frame=packets.at(-1);assert.ok(frame);assert.deepEqual(frame.camera.matrixWorld,camera.matrixWorld.toArray());const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).toArray();assert.deepEqual(frame.depth.viewProjectionMatrix,vp);assert.equal(frame.depth.width,gl.drawingBufferWidth);assert.equal(frame.depth.height,gl.drawingBufferHeight);packetChecks++;}}
 dispose(){rendererDisposed++;}forceContextLoss(){}
}
function artFixture({scene,world,fireFactory}){
 artCreated++;const root=new T.Group(),rig=createBearRig(actorData),field=createGroundField(T),assets={flame:new T.Texture(),smoke:new T.Texture(),burst:new T.Texture()},housing=world.buildings.length?createNeighborhood(T,{catalogue,textures:{}},{facadeSites:true}):null;
 root.add(rig.root,field.root);if(housing)root.add(housing.root);scene.add(root);const fire=fireFactory(T,assets,field.uniforms);activeEffect=fire;root.add(fire.root);let disposed=false;
 return {anchors:rig.anchors,update(snapshot,{camera,viewport,worldTime,playerTime}){rig.update(snapshot.player,playerTime,{paused:snapshot.paused});field.update(snapshot);housing?.update(snapshot.world,{camera,player:snapshot.player,viewport});const muzzle=rig.anchors.muzzle.getWorldPosition(new T.Vector3());fire.update(snapshot,worldTime,{camera,viewport,muzzle,muzzleQuaternion:rig.anchors.muzzle.getWorldQuaternion(new T.Quaternion()),housing:housing?.diagnostics(),firePlayerTime:playerTime});lastAnchors=Object.fromEntries(Object.entries(rig.anchors).map(([name,node])=>[name,node.getWorldPosition(new T.Vector3()).toArray()]));},observeFireReviewSnapshot:s=>fire.observeSnapshot(s),beforeRender:camera=>fire.beforeRender(camera),diagnostics:()=>({fire:fire.diagnostics(),housing:housing?.diagnostics()||null}),fireReviewInputs:()=>fire.captureInputs(),dispose(){assert.equal(disposed,false);disposed=true;artDisposed++;fire.dispose();field.dispose();rig.dispose();housing?.dispose();for(const texture of Object.values(assets))texture.dispose();root.removeFromParent();root.clear();}};
}
const context=vm.createContext({URL,DOMException,AbortController,structuredClone,TextEncoder,crypto:globalThis.crypto,navigator:globalThis.navigator,performance:{now:()=>now},fetch:(...args)=>globalThis.fetch(...args)});
function synthetic(namespace,identifier){const names=Object.keys(namespace);return new vm.SyntheticModule(names,function(){for(const name of names)this.setExport(name,namespace[name]);},{identifier,context});}
const source=fs.readFileSync(path.join(project,'workbenches/fire-realism/driver.js'),'utf8');
const module=new vm.SourceTextModule(source,{context,identifier:pathToFileURL(path.join(project,'workbenches/fire-realism/driver.js')).href,initializeImportMeta:meta=>{meta.url=base+'workbenches/fire-realism/driver.js';}});
const imports=new Map();
await module.link(async(specifier,parent)=>{
 const url=new URL(specifier,parent.identifier);if(imports.has(url.href))return imports.get(url.href);
 let namespace;if(url.pathname.endsWith('/src/runtime/three.js'))namespace={...T,WebGLRenderer:RendererFixture};
 else if(url.pathname.endsWith('/src/art/index.js'))namespace={createArtScene:artFixture};
 else{namespace=await import(url.href);if(url.pathname.endsWith('/tools/fire-realism/scenarios.js')){const actual=namespace.createFireReviewSimulation;namespace={...namespace,createFireReviewSimulation:options=>{const sim=actual(options);return {...sim,get frameIndex(){return sim.frameIndex;},snapshot(){fullSnapshots++;lastRaw=sim.snapshot();return lastRaw;},advance(){lastRaw=sim.advance();return lastRaw;},advanceReceiptStep(){narrowSteps++;return sim.advanceReceiptStep();}};}};}if(url.pathname.endsWith('/tools/fire-realism/camera-sweep.js')){const actual=namespace.createCameraSweep,actualSupport=namespace.captureCameraSweepSupport;namespace={...namespace,captureCameraSweepSupport:(T,options)=>{if(options.configuration.mode!=='reference')return actualSupport(T,options);assert.equal(options.factoryFingerprint.sourceCommit,null);assert.equal(options.factoryFingerprint.factoryModule,null);assert.throws(()=>actualSupport(T,options),/source bounds are unreviewed/);unverifiedSourceChecks++;if(!allowApiSupportFixture)return actualSupport(T,options);const value=actualSupport(T,{...options,configuration:{...options.configuration,mode:'current'},factoryFingerprint:{mode:'current',sourceCommit:'dc7f537a83a7e832a0dfa0757d0b2700b909c053',factoryModule:'src/art/fire.js',factoryExport:'createFire'}});value.descriptor.sourceSupport={kind:'api-only-unverified-reference-support-fixture',verified:false};return value;},createCameraSweep:(...args)=>{const controller=actual(...args),advance=controller.advance;controller.advance=time=>{cameraAdvances++;return advance(time);};return controller;}};}}
 const dependency=synthetic(namespace,url.href);imports.set(url.href,dependency);return dependency;
});
globalThis.fetch=async url=>{
 const target=new URL(url);assert.ok(target.href.startsWith(base));const relative=target.href.slice(base.length);assert.ok(!relative.includes('..'));const absolute=path.join(project,...relative.split('/'));
 // Serve immutable artist Git bytes just as the deployed checkout does; do
 // not normalize or rewrite raw manifest hashes for Windows CRLF checkout.
 const bytes=relative.startsWith('assets/art/fire-realism/')?execFileSync('git',['show','HEAD:'+relative],{cwd:project,windowsHide:true}):fs.existsSync(absolute)?fs.readFileSync(absolute):null,response=new Response(bytes,{status:bytes?200:404});Object.defineProperty(response,'url',{value:target.href});return response;
};

const nativeFactory=(_T,{quality})=>({root:new T.Group(),update(frame){packets.push({camera:structuredClone(frame.camera),depth:{width:frame.opaqueDepth.width,height:frame.opaqueDepth.height,viewProjectionMatrix:[...frame.opaqueDepth.viewProjectionMatrix]},paused:frame.paused,worldDelta:frame.worldDelta,playerDelta:frame.playerDelta,worldTime:frame.worldTime,tick:frame.tick,events:structuredClone(frame.eventReceipts.events),reset:frame.eventReceipts.reset});},reset(){},dispose(){},diagnostics:()=>({quality,settings:{smokeBillowsPerInstance:4}})});
function flush(delta){now+=delta;const pending=[...callbacks.values()];callbacks.clear();assert.ok(pending.length<=1,'One owned RAF, never competing loops');for(const callback of pending)callback(now);}
async function wait(operation,promise){
 return waitForFireApi(promise,{operation,pump(){if(callbacks.size)flush(1000/60);},diagnostics(){
  const state=driver?.state();return {phase:state?.phase??null,progress:state?.progress??null,cameraSweep:state?.cameraSweep??null,
   simulationTick:lastRaw?.tick??null,fakeRafTimeMs:now,callbacks:callbacks.size,queries:queries.size,mainDraws,depthDraws,artCreated,artDisposed,rendererDisposed};
 }});
}
function camera(){const result=new T.OrthographicCamera(-10,10,10,-10,.1,300);placeFireReviewCamera(T,result,driver.state().configuration);return result;}
try{
 await module.evaluate();driver=await module.namespace.createFireReviewDriver({root,artistDelivery:{createFireRealism:nativeFactory},onChange(state){notifications.push(state);if(state.progress?.mode)currentPass=state.progress.mode;if(state.cameraSweep?.status==='preparing'&&stopDuringPreparing){stopDuringPreparing=false;driver.stopCameraSweep({restoreStatic:true});}if(state.cameraSweep?.status==='preparing'&&throwDuringPreparing){throwDuringPreparing=false;throw Error('Explicit preparing observer failure');}}});
 await wait('configure',driver.configure({mode:'reference'}));assert.equal(driver.state().cameraSweep.supported,false);await assert.rejects(driver.startCameraSweep(),/source bounds are unreviewed/);assert.equal(callbacks.size,0);allowApiSupportFixture=true;await wait('seek',driver.seek(60));assert.equal(driver.state().cameraSweep.supported,true,JSON.stringify(driver.state().cameraSweep));
 const staticCamera=camera(),first=driver.captureFrame();assert.deepEqual(first.camera.matrixWorld,staticCamera.matrixWorld.toArray());const raw=structuredClone(lastRaw),anchors=structuredClone(lastAnchors),draws=mainDraws,snaps=fullSnapshots,steps=narrowSteps,packetStart=packets.length;
 const starting=driver.startCameraSweep({preset:'contact-street-yaw-v1'});assert.equal(driver.state().cameraSweep.status,'preparing');const activated=await starting;assert.equal(activated.cameraSweep.status,'running');assert.equal(driver.state().phase,'ready');assert.equal(callbacks.size,1);assert.ok(!Object.hasOwn(driver.state().cameraSweep,'samples'));const activeQueries=queryCreated,activeNotifications=notifications.length;await assert.rejects(driver.measure({modes:['current'],warmupFrames:1,sampleFrames:2,trials:1,poseFrame:45}),/restore camera motion/);assert.equal(queryCreated,activeQueries);assert.equal(notifications.length,activeNotifications);assert.equal(callbacks.size,1);
 for(let i=0;i<80;i++)flush(100);
 assert.equal(mainDraws-draws,80);assert.equal(fullSnapshots,snaps);assert.equal(narrowSteps,steps);assert.deepEqual(lastRaw,raw);assert.deepEqual(lastAnchors,anchors);assert.equal(callbacks.size,0);assert.equal(driver.state().cameraSweep.status,'complete');assert.equal(driver.state().cameraSweep.restored,true);
 const paused=packets.slice(packetStart);assert.equal(paused.length,80);assert.ok(paused.every(frame=>frame.paused&&frame.worldDelta===0&&frame.playerDelta===0&&frame.events.length===0&&!frame.reset));assert.ok(new Set(paused.map(frame=>JSON.stringify(frame.camera.matrixWorld))).size>2);assert.deepEqual(driver.captureFrame().camera.matrixWorld,first.camera.matrixWorld);
 const completed=driver.cameraSweepEvidence();assert.equal(completed.samples.length,80);assert.equal(driver.cameraSweepEvidence(),null);assert.equal(driver.state().cameraSweep.sampledDraws,80);
 await wait('seek',driver.seek(0));driver.play();await driver.startCameraSweep();assert.equal(callbacks.size,1);const beforeLive=mainDraws,beforeNarrow=narrowSteps,beforeFull=fullSnapshots,zeroPackets=packets.length;
 flush(1);flush(1);assert.ok(packets.slice(zeroPackets).every(frame=>frame.paused&&frame.worldDelta===0));flush(100);assert.equal(mainDraws-beforeLive,3);assert.equal(narrowSteps-beforeNarrow,6);assert.equal(fullSnapshots-beforeFull,1);
 const independent=createFireReviewSimulation({scenario:'match-contact'});try{for(let i=0;i<6;i++)independent.advance();assert.deepEqual(lastRaw,independent.snapshot());}finally{independent.dispose();}
 driver.pause();assert.equal(callbacks.size,1);driver.stopCameraSweep({restoreStatic:false});assert.equal(callbacks.size,0);assert.equal(driver.state().cameraSweep.status,'interrupted');assert.equal(driver.state().cameraSweep.restored,false);const heldState=driver.state(),heldQueries=queryCreated,notifyCount=notifications.length;
 await assert.rejects(driver.measure({modes:['current'],warmupFrames:1,sampleFrames:2,trials:1,poseFrame:45}),/restore camera motion/);assert.equal(queryCreated,heldQueries);assert.equal(notifications.length,notifyCount);assert.deepEqual(driver.state().results,heldState.results);
 driver.stopCameraSweep({restoreStatic:true});assert.equal(driver.state().cameraSweep.restored,true);assert.equal(driver.state().cameraSweep.status,'interrupted');assert.deepEqual(driver.captureFrame().camera.matrixWorld,camera().matrixWorld.toArray());const heldEvidence=driver.cameraSweepEvidence();assert.equal(heldEvidence.status,'interrupted');assert.equal(heldEvidence.restoration.drawn,true);
 const beforeCostAdvances=cameraAdvances;await wait('current-mode measurement',driver.measure({modes:['current'],warmupFrames:1,sampleFrames:2,trials:1,poseFrame:45}));assert.equal(cameraAdvances,beforeCostAdvances,'GPU protocol must never advance a camera path');
 await wait('seek',driver.seek(60));await driver.startCameraSweep();flush(1000);await wait('configure',driver.configure({view:'oblique'}));assert.equal(callbacks.size,0);assert.equal(driver.cameraSweepEvidence().reason,'configuration-change');assert.deepEqual(driver.captureFrame().camera.matrixWorld,camera().matrixWorld.toArray());
 await wait('seek',driver.seek(60));await driver.startCameraSweep();flush(1000);await wait('seek',driver.seek(30));assert.equal(driver.cameraSweepEvidence().reason,'seek');assert.equal(callbacks.size,0);
 await wait('configure',driver.configure({scenario:'street-fire',view:'isometric',mode:'reference'}));await wait('seek',driver.seek(30));assert.equal(driver.state().cameraSweep.supported,true,JSON.stringify(driver.state().cameraSweep));const street=structuredClone(lastRaw),streetDraws=mainDraws;await driver.startCameraSweep();for(let i=0;i<8;i++)flush(1000);assert.deepEqual(lastRaw,street);assert.equal(mainDraws-streetDraws,8);assert.equal(driver.cameraSweepEvidence().status,'complete');
 await driver.startCameraSweep();flush(1000);await wait('reset',driver.reset());assert.equal(driver.cameraSweepEvidence().reason,'reset');assert.equal(callbacks.size,0);
 await driver.startCameraSweep();flush(1000);doc.hidden=true;flush(10);assert.equal(driver.state().phase,'error');assert.equal(driver.state().cameraSweep.status,'cancelled');assert.equal(driver.state().cameraSweep.restored,true);assert.equal(callbacks.size,0);doc.hidden=false;driver.stopCameraSweep({restoreStatic:true});assert.equal(driver.cameraSweepEvidence().restoration.drawn,true);await wait('reset',driver.reset());
 await driver.startCameraSweep();for(let i=0;i<8;i++)flush(1000);assert.equal(driver.state().cameraSweep.status,'complete');const pending=driver.startCameraSweep();assert.equal(driver.state().cameraSweep.status,'preparing');driver.stopCameraSweep({restoreStatic:true});await assert.rejects(pending,{name:'AbortError'});assert.equal(driver.cameraSweepEvidence(),null,'No prior terminal ledger after a cancelled new preparation');assert.equal(callbacks.size,0);
 stopDuringPreparing=true;await assert.rejects(driver.startCameraSweep(),{name:'AbortError'});assert.equal(callbacks.size,0,'Synchronous preparing observer cancellation must invalidate the actual pending task');throwDuringPreparing=true;await assert.rejects(driver.startCameraSweep(),{name:'AbortError'});assert.equal(driver.state().phase,'error');assert.equal(driver.state().cameraSweep.restored,true);assert.equal(callbacks.size,0);await wait('reset',driver.reset());
 const pendingDispose=driver.startCameraSweep(),disposing=driver.dispose();await assert.rejects(pendingDispose,{name:'AbortError'});await disposing;assert.equal(callbacks.size,0);assert.equal(queries.size,0);assert.equal(artCreated,artDisposed);assert.equal(rendererDisposed,1);
 console.log(JSON.stringify({kind:'api-only-camera-sweep-driver-regression',unverifiedSourceChecks,unverifiedReferenceRejected:true,apiSupportOverride:true,staticMatricesMatch:true,pausedRawSnapshotExact:true,pausedContactDraws:80,pausedStreetDraws:8,cameraPacketsChecked:packetChecks,oneRaf:true,liveFixedSteps:6,heldMeasurementRejected:true,noSweepAdvancesInGpuProtocol:true,pendingCancelAndDisposeRetired:true,artCreated,artDisposed,rendererDisposed,queriesRemaining:queries.size,callbacksRemaining:callbacks.size,gpuEvidence:false,retainedHelpers:[]}));
}finally{if(driver&&rendererDisposed===0)await driver.dispose();globalThis.fetch=priorFetch;assert.equal(queries.size,0);assert.equal(callbacks.size,0);}
