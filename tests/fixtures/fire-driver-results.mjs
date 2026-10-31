// Finite API-only driver lifecycle probe. No WebGL pixels or GPU cost evidence.
// The actual driver source/state/notify/measure functions are evaluated intact;
// only renderer/art/browser transports are replaced with declared test fixtures.
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createFireReviewDeliveryLoader,FIRE_DELIVERY_PATH} from '../../tools/fire-realism/delivery.js';
import {encodeZeroLiteral} from '../../workbenches/runtime/fire-fluid-payload-probe/codec.js';
import {createHash} from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as T from '../../src/runtime/three.js';
import {createGroundField} from '../../src/art/ground-field.js';
const project=fileURLToPath(new URL('../../',import.meta.url)),base='https://fixture.invalid/tinderbox/';
const priorFetch=globalThis.fetch,callbacks=new Map(),queries=new Set();
let nextFrame=0,now=0,currentPass='current',artCreated=0,artDisposed=0,stage='first',driver,cancellation=null,cancelStarted=false;
let renderCalls=0,artUpdates=0;
const groundMode=process.argv.includes('--ground-char');
const notifications=[],measuring=[],domBytes=[],domHasOnlyNewState=[];
const binaryMode=process.argv.includes('--binary-metadata'),binaryFiles=new Map();let binaryResourceReads=0,binaryPrepares=0;
function element(){return {style:{},dataset:{},textContent:'',children:[],append(child){this.children.push(child);},remove(){},setAttribute(){},addEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:1280,height:800};}};}
const win={requestAnimationFrame(callback){const id=++nextFrame;callbacks.set(id,callback);setImmediate(()=>{const active=callbacks.get(id);callbacks.delete(id);if(active){now+=1000/60;active(now);}});return id;},cancelAnimationFrame(id){callbacks.delete(id);}};
const doc={hidden:false,defaultView:win,createElement:element},root={...element(),ownerDocument:doc};
const ext={TIME_ELAPSED_EXT:8,GPU_DISJOINT_EXT:9};
const gl={RENDERER:1,VENDOR:2,VERSION:3,QUERY_RESULT_AVAILABLE:4,QUERY_RESULT:5,drawingBufferWidth:1280,drawingBufferHeight:800,
 getExtension:name=>name==='EXT_disjoint_timer_query_webgl2'?ext:null,
 getParameter:key=>key===9?false:({1:'API-only test renderer',2:'Synthetic fixture',3:'No actual WebGL'})[key],
 createQuery(){const query={};queries.add(query);return query;},beginQuery(_target,query){query.ms=currentPass==='no-fire'?1:3;},endQuery(){},
 getQueryParameter:(query,key)=>key===4?true:query.ms*1e6,deleteQuery:query=>queries.delete(query)};
let rendererDisposed=0;
class RendererFixture{
 constructor(){this.domElement=element();this.domElement.toDataURL=()=> 'data:image/jpeg;base64,QVBJLW9ubHk=';this.debug={};this.info={render:{calls:0,triangles:0,lines:0,points:0},memory:{geometries:0,textures:0},reset(){}};this.ratio=1;this.width=1280;this.height=800;}
 setClearColor(){}getContext(){return gl;}setPixelRatio(value){this.ratio=value;}getPixelRatio(){return this.ratio;}
 setSize(width,height){this.width=width;this.height=height;gl.drawingBufferWidth=Math.floor(width*this.ratio);gl.drawingBufferHeight=Math.floor(height*this.ratio);}
 getDrawingBufferSize(v){return v.set(gl.drawingBufferWidth,gl.drawingBufferHeight);}render(){renderCalls++;}dispose(){rendererDisposed++;}forceContextLoss(){}
}
function artFixture({scene,world}){
 artCreated++;const root=new T.Group(),anchor=new T.Object3D(),ground=createGroundField(T);root.add(anchor,ground.root);scene.add(root);let latest=null,disposed=false;
 return {anchors:{muzzle:anchor},update(snapshot){latest=snapshot;ground.update(snapshot);artUpdates++;},beforeRender(){},diagnostics:()=>({fire:{burningBuildingIds:[],artist:{},legacyTransients:{}},housing:null,ground:ground.counts(),groundChar:ground.diagnostics(),lastSnapshot:latest?{tick:latest.tick,worldTime:latest.clocks.world,playerTime:latest.clocks.player}:null}),
  fireReviewInputs(){const width=Math.ceil(world.width/world.fireCellSize),height=Math.ceil(world.height/world.fireCellSize),data=Array(width*height*4).fill(0);for(const c of latest?.cells||[]){const index=(Math.floor(c.y/world.fireCellSize)*width+Math.floor(c.x/world.fireCellSize))*4;data[index+3]=c.phase==='burning'?c.intensity:0;}return {field:{width,height,cellSize:world.fireCellSize,data}};},
  dispose(){assert.equal(disposed,false);disposed=true;artDisposed++;ground.dispose();root.removeFromParent();}};
}
function synthetic(namespace,identifier){const names=Object.keys(namespace);return new vm.SyntheticModule(names,function(){for(const name of names)this.setExport(name,namespace[name]);},{identifier});}
const source=fs.readFileSync(path.join(project,'workbenches/fire-realism/driver.js'),'utf8');
const module=new vm.SourceTextModule(source,{identifier:pathToFileURL(path.join(project,'workbenches/fire-realism/driver.js')).href,initializeImportMeta:meta=>{meta.url=base+'workbenches/fire-realism/driver.js';}});
const imports=new Map();
await module.link(async(specifier,parent)=>{
 const url=new URL(specifier,parent.identifier);if(imports.has(url.href))return imports.get(url.href);
 let namespace;if(url.pathname.endsWith('/src/runtime/three.js'))namespace={...T,WebGLRenderer:RendererFixture};
 else if(url.pathname.endsWith('/src/art/index.js'))namespace={createArtScene:artFixture};
 else namespace=await import(url.href);
 const dependency=synthetic(namespace,url.href);imports.set(url.href,dependency);return dependency;
});
globalThis.fetch=async url=>{
 const target=new URL(url);assert.ok(target.href.startsWith(base));const relative=target.href.slice(base.length);assert.ok(!relative.includes('..'));const absolute=path.join(project,...relative.split('/'));
 // Serve immutable artist Git bytes just as the deployed checkout does; do
 // not normalize or rewrite raw manifest hashes for Windows CRLF checkout.
 if(binaryFiles.has(relative)&&relative.endsWith('.fzp.gz'))binaryResourceReads++;
 const bytes=binaryFiles.get(relative)||(relative.startsWith('assets/art/fire-realism/')?execFileSync('git',['show','HEAD:'+relative],{cwd:project,windowsHide:true}):fs.existsSync(absolute)?fs.readFileSync(absolute):null),response=new Response(bytes,{status:bytes?200:404});Object.defineProperty(response,'url',{value:target.href});return response;
};
try{
 await module.evaluate();
 let artistDelivery={createFireRealism:()=>{}};
 if(binaryMode){const prefix='assets/art/fire-realism/fixture/',entry=prefix+'index.js',resource=prefix+'data/one.fzp.gz',manifestUrl=prefix+'manifest.json',raw=gzipSync(encodeZeroLiteral(new Uint8Array(16))),encode=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)),hash=value=>createHash('sha256').update(value).digest('hex');binaryFiles.set(entry,encode('export function createFireRealism(){} export async function prepareFixture(){}'));binaryFiles.set(resource,raw);const manifest=encode({version:1,runtimeFiles:[{path:entry,bytes:binaryFiles.get(entry).length,sha256:hash(binaryFiles.get(entry))}],runtimeResources:[{path:resource,kind:'fzp1-gzip',bytes:raw.length,sha256:hash(raw),uncompressedBytes:16}]});binaryFiles.set(manifestUrl,manifest);binaryFiles.set(FIRE_DELIVERY_PATH,encode({version:1,byMode:{reference:{sourceCommit:'a'.repeat(40),factoryModule:entry,factoryExport:'createFireRealism',prepareExport:'prepareFixture',manifestUrl,manifestBytes:manifest.length,manifestSha256:hash(manifest)}}}));const loaded=await createFireReviewDeliveryLoader()({projectUrl:base,descriptorUrl:base+FIRE_DELIVERY_PATH,importModule:async()=>({createFireRealism:()=>{},async prepareFixture({resources,registerCleanup}){binaryPrepares++;registerCleanup(()=>{});resources.take(resource);return {scope:'API-only driver metadata fixture'};}})});artistDelivery=loaded.artistDelivery;assert.equal(binaryResourceReads,1);}
 driver=await module.namespace.createFireReviewDriver({root,artistDelivery,onChange(state){
  notifications.push({stage,phase:state.phase,resultsStatus:state.results?.status??null});
  if(state.progress?.mode)currentPass=state.progress.mode;
  if(stage==='second'&&['measuring','cancelling'].includes(state.phase)){
   measuring.push(state);domBytes.push(Buffer.byteLength(root.children[0].textContent));
   domHasOnlyNewState.push(JSON.parse(root.children[0].textContent).results===null);
   if(!cancelStarted&&state.progress?.passIndex===1){cancelStarted=true;cancellation=driver.cancelMeasurement();}
  }
 }});
 if(binaryMode){const capture=driver.captureFrame();assert.equal(capture.sourceFingerprints.byMode.reference.prepareExport,'prepareFixture');assert.equal(Object.keys(capture.sourceFingerprints.byMode.reference.runtimeResources).length,1);assert.equal(capture.sourceFingerprints.binaryPreparation.reference.preparation.resourcesConsumed,1);assert.equal(binaryResourceReads,1,'Actual driver metadata must reuse the loader-issued proof without another resource request');assert.equal(binaryPrepares,1);}
 if(groundMode){
  let captures=0;const phases=new Set();
  for(const index of [190,192,193,194]){
   await driver.seek(index);const before=driver.state(),draws=renderCalls,updates=artUpdates;
   const again=driver.state();assert.deepEqual(again.diagnostics.groundChar,before.diagnostics.groundChar);assert.equal(renderCalls,draws);assert.equal(artUpdates,updates);
   const capture=driver.captureFrame();captures++;assert.equal(renderCalls,draws+1);assert.equal(artUpdates,updates);assert.deepEqual(capture.groundChar,before.diagnostics.groundChar);
   const evidence=capture.groundChar;assert.equal(evidence.status,'available');assert.equal(evidence.cells.length,4);assert.equal(evidence.snapshot.tick,capture.tick);assert.equal(evidence.modelUpdate.tick,capture.tick);assert.equal(evidence.clocksMatch,true);assert.equal(evidence.gpuTextureReadback,false);assert.equal(evidence.uploadProved,false);for(const cell of evidence.cells)phases.add(cell.phase);
   assert.deepEqual(JSON.parse(root.children[0].textContent).diagnostics.groundChar,evidence);assert.equal(Object.keys(capture.sourceFingerprints.adapterRuntimeFiles).length,21);assert.ok(capture.sourceFingerprints.adapterRuntimeFiles['tools/fire-realism/ground-char-evidence.js']);
   capture.groundChar.cells[0].expectedFloat32RGBA[2]=999;capture.groundChar.snapshot.tick=999;assert.deepEqual(driver.state().diagnostics.groundChar,before.diagnostics.groundChar);
  }
  assert.deepEqual([...phases].sort(),['burning','spent']);await driver.dispose();assert.equal(callbacks.size,0);assert.equal(queries.size,0);assert.equal(artCreated,artDisposed);
  console.log(JSON.stringify({kind:'actual-driver-ground-char-evidence-api-test',adapterSourceCount:21,burnoutFrames:4,extraStateDraws:0,extraStateUpdates:0,captureDraws:captures,callbacksRemaining:callbacks.size,gpuEvidence:false,retainedHelpers:[]}));
 }else{
 const first=await driver.measure({modes:['current'],warmupFrames:1,sampleFrames:128,trials:2,poseFrame:45});
 const archived=JSON.stringify(first),rawSamples=first.gpu.trials.reduce((n,t)=>n+t.gpu.length,0),oldBytes=Buffer.byteLength(archived);
 assert.equal(first.status,'complete');assert.equal(rawSamples,512);const groundHash=createHash('sha256').update(fs.readFileSync(path.join(project,'src/art/ground-field.js'),'utf8').replaceAll('\r','')).digest('hex');assert.equal(first.sourceFingerprints.adapterRuntimeFiles['src/art/ground-field.js']?.sha256,groundHash,'The actual driver report must fingerprint the loaded underlay source');assert.ok(oldBytes>100000,'Prior report must be nontrivial');assert.deepEqual(driver.state().results,first);
 stage='invalid';
 for(const options of [{warmupFrames:0},{sampleFrames:1},{trials:0}]){
  const count=notifications.length;await assert.rejects(driver.measure({modes:['current'],warmupFrames:1,sampleFrames:16,trials:1,...options}),RangeError);
  assert.deepEqual(driver.state().results,first,'Rejected requests preserve the prior report');assert.equal(notifications.length,count,'Rejected requests never enter measuring');
 }
 stage='second';
 const second=await driver.measure({modes:['current'],warmupFrames:1,sampleFrames:32,trials:2,poseFrame:45});
 assert.ok(cancellation);assert.deepEqual(await cancellation,second);assert.equal(second.status,'cancelled');assert.equal(second.comparison.targetMet,null);
 assert.ok(measuring.length>=2);assert.equal(measuring.every(state=>state.results===null),true,'A valid new measurement must omit the previous raw report from every collecting notification');assert.ok(domHasOnlyNewState.every(Boolean),'Serialized DOM progress must omit the previous artifact arrays');const freshSamples=second.gpu.trials.reduce((n,t)=>n+t.gpu.length,0);assert.equal(freshSamples,32);assert.ok(second.gpu.trials.some(t=>t.gpu.length===32));
 assert.equal(JSON.stringify(first),archived,'Previously exported/archived evidence remains untouched');assert.deepEqual(driver.state().results,second);
 const domFinal=JSON.parse(root.children[0].textContent);// DOM/export is JSON, whose existing representation normalizes -0 and nonfinite summary numbers.
 assert.deepEqual(domFinal.results,JSON.parse(JSON.stringify(second)),'Partial raw evidence remains available for DOM/export');
 stage='invalid-pose';for(const poseFrame of [0,3601,NaN]){const count=notifications.length;await assert.rejects(driver.measure({modes:['current'],warmupFrames:1,sampleFrames:16,trials:1,poseFrame}),RangeError);assert.deepEqual(driver.state().results,second,'Invalid poses preserve the new partial report');assert.equal(notifications.length,count,'Invalid poses must reject before measuring starts');}
 stage='unavailable';const before=notifications.length,unavailable=await driver.measure({modes:['optimized'],warmupFrames:1,sampleFrames:16,trials:1,poseFrame:45});
 assert.equal(unavailable.status,'unavailable');assert.deepEqual(driver.state().results,unavailable);assert.ok(notifications.slice(before).every(n=>n.phase!=='measuring'));
 assert.equal(queries.size,0);await driver.dispose();assert.equal(rendererDisposed,1);assert.equal(artCreated,artDisposed);assert.equal(callbacks.size,0);
 console.log(JSON.stringify({kind:'api-only-driver-results-regression',binaryMetadata:{enabled:binaryMode,resourceReads:binaryResourceReads,prepareCalls:binaryPrepares},source:'Actual unmodified driver module; API-only renderer/art/RAF fixtures',priorRawSamples:rawSamples,priorReportBytes:oldBytes,invalidRequests:6,collectingNotifications:measuring.length,maxCollectingDomBytes:Math.max(...domBytes),newCancelledRawSamples:freshSamples,newStatus:second.status,archivedReportUnchanged:JSON.stringify(first)===archived,queriesRemaining:queries.size,callbacksRemaining:callbacks.size,artCreated,artDisposed,rendererDisposed,groundFieldFingerprinted:true,gpuEvidence:false,retainedHelpers:[]}));
 }
}finally{if(driver&&rendererDisposed===0)await driver.dispose();globalThis.fetch=priorFetch;assert.equal(queries.size,0);assert.equal(callbacks.size,0);}
