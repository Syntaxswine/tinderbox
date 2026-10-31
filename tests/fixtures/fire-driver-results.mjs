// Finite API-only driver lifecycle probe. No WebGL pixels or GPU cost evidence.
// The actual driver source/state/notify/measure functions are evaluated intact;
// only renderer/art/browser transports are replaced with declared test fixtures.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as T from '../../src/runtime/three.js';
const project=fileURLToPath(new URL('../../',import.meta.url)),base='https://fixture.invalid/tinderbox/';
const priorFetch=globalThis.fetch,callbacks=new Map(),queries=new Set();
let nextFrame=0,now=0,currentPass='current',artCreated=0,artDisposed=0,stage='first',driver,cancellation=null,cancelStarted=false;
const notifications=[],measuring=[],domBytes=[],domHasOnlyNewState=[];
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
 constructor(){this.domElement=element();this.debug={};this.info={render:{calls:0,triangles:0,lines:0,points:0},memory:{geometries:0,textures:0},reset(){}};this.ratio=1;this.width=1280;this.height=800;}
 setClearColor(){}getContext(){return gl;}setPixelRatio(value){this.ratio=value;}getPixelRatio(){return this.ratio;}
 setSize(width,height){this.width=width;this.height=height;gl.drawingBufferWidth=Math.floor(width*this.ratio);gl.drawingBufferHeight=Math.floor(height*this.ratio);}
 getDrawingBufferSize(v){return v.set(gl.drawingBufferWidth,gl.drawingBufferHeight);}render(){}dispose(){rendererDisposed++;}forceContextLoss(){}
}
function artFixture({scene,world}){
 artCreated++;const root=new T.Group(),anchor=new T.Object3D();root.add(anchor);scene.add(root);let latest=null,disposed=false;
 return {anchors:{muzzle:anchor},update(snapshot){latest=snapshot;},beforeRender(){},diagnostics:()=>({fire:{burningBuildingIds:[],artist:{},legacyTransients:{}},housing:null}),
  fireReviewInputs(){const width=Math.ceil(world.width/world.fireCellSize),height=Math.ceil(world.height/world.fireCellSize),data=Array(width*height*4).fill(0);for(const c of latest?.cells||[]){const index=(Math.floor(c.y/world.fireCellSize)*width+Math.floor(c.x/world.fireCellSize))*4;data[index+3]=c.phase==='burning'?c.intensity:0;}return {field:{width,height,cellSize:world.fireCellSize,data}};},
  dispose(){assert.equal(disposed,false);disposed=true;artDisposed++;root.removeFromParent();}};
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
 const bytes=relative.startsWith('assets/art/fire-realism/')?execFileSync('git',['show','HEAD:'+relative],{cwd:project,windowsHide:true}):fs.existsSync(absolute)?fs.readFileSync(absolute):null,response=new Response(bytes,{status:bytes?200:404});Object.defineProperty(response,'url',{value:target.href});return response;
};
try{
 await module.evaluate();
 driver=await module.namespace.createFireReviewDriver({root,artistDelivery:{createFireRealism:()=>{}},onChange(state){
  notifications.push({stage,phase:state.phase,resultsStatus:state.results?.status??null});
  if(state.progress?.mode)currentPass=state.progress.mode;
  if(stage==='second'&&['measuring','cancelling'].includes(state.phase)){
   measuring.push(state);domBytes.push(Buffer.byteLength(root.children[0].textContent));
   domHasOnlyNewState.push(JSON.parse(root.children[0].textContent).results===null);
   if(!cancelStarted&&state.progress?.passIndex===1){cancelStarted=true;cancellation=driver.cancelMeasurement();}
  }
 }});
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
 console.log(JSON.stringify({kind:'api-only-driver-results-regression',source:'Actual unmodified driver module; API-only renderer/art/RAF fixtures',priorRawSamples:rawSamples,priorReportBytes:oldBytes,invalidRequests:6,collectingNotifications:measuring.length,maxCollectingDomBytes:Math.max(...domBytes),newCancelledRawSamples:freshSamples,newStatus:second.status,archivedReportUnchanged:JSON.stringify(first)===archived,queriesRemaining:queries.size,callbacksRemaining:callbacks.size,artCreated,artDisposed,rendererDisposed,groundFieldFingerprinted:true,gpuEvidence:false,retainedHelpers:[]}));
}finally{if(driver&&rendererDisposed===0)await driver.dispose();globalThis.fetch=priorFetch;assert.equal(queries.size,0);assert.equal(callbacks.size,0);}
