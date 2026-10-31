/** Actual SharedThree ABI with TINY SYNTHETIC fields; no actual193 asset boot. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {webcrypto,createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import * as T from '../../../../src/runtime/three.js';
import {encodeZeroLiteral} from '../../../../assets/art/fire-realism/fluid-contact/codec.js';
if(!vm.SourceTextModule)throw Error('Use node --experimental-vm-modules');
const hash=b=>createHash('sha256').update(b).digest('hex'),records=[],packets=[];let offset=0;
for(let frame=1;frame<=193;frame++)for(const [lane,channel]of ['density','temperature','flame'].entries()){
 const bytes=Buffer.alloc(8);bytes.writeFloatLE(frame===1?0:.5+lane*.1,0);bytes.writeFloatLE(frame===1?0:.9,4);const packet=encodeZeroLiteral(bytes),id=frame+':'+channel;records.push({id,frame,channel,offset,packetBytes:packet.length,packetSha256:hash(packet),rawBytes:8,rawSha256:hash(bytes)});packets.push(packet);offset+=packet.length;
}
const gzip=gzipSync(Buffer.concat(packets)),resourcePath='assets/art/fire-realism/fluid-contact/unit-only.fzp.gz';
const metadata={version:1,frames:Array.from({length:193},(_,i)=>({frame:i+1,timeSeconds:i/30,resolution:[2,1,1]})),records,sparseBytes:offset,chunks:[{id:0,offset:0,sparseBytes:offset,gzipBytes:gzip.length,gzipSha256:hash(gzip),resourcePath,recordIds:records.map(r=>r.id)}],grid:{resolution:[2,1,1],origin:[-.25,0,.5],spacing:[.5,1,1]},contactBandHeight:.2733333358168602,translation:[5.5,0,8.5],source:{scope:'SYNTHETIC2voxel controls; not actualCFDdata or rendering evidence'}};
const prism=band=>({band,lower:band,upper:band+1,hull:[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]],planes:[[0,-1,.5],[1,0,.5],[0,1,.5],[-1,0,.5]]});
const base=path.resolve('assets/art/fire-realism/fluid-contact'),context=vm.createContext({console,Uint8Array,Uint16Array,Uint32Array,Float32Array,DataView,ArrayBuffer,Blob,DecompressionStream,performance,crypto:webcrypto,structuredClone,setTimeout,clearTimeout,Error,TypeError,RangeError,AbortController});
const modules=new Map();
async function load(filename){
 if(modules.has(filename))return modules.get(filename);
 let source;if(path.basename(filename)==='metadata.js')source='export const FIELD_METADATA='+JSON.stringify(metadata)+';';
 else if(path.basename(filename)==='geometry-data.js')source='export const GEOMETRY_METRICS={maxHullVertices:4,maxPrisms:2,sourceJsonBytes:0};export function supportPair(){return{prisms:'+JSON.stringify([prism(0),prism(1)])+'};}';
 else source=fs.readFileSync(filename,'utf8');
 const module=new vm.SourceTextModule(source,{context,identifier:filename});modules.set(filename,module);await module.link(specifier=>load(path.resolve(path.dirname(filename),specifier)));return module;
}
const module=await load(path.join(base,'index.js'));await module.evaluate();const namespace=module.namespace;let rollback;const pending=new Map([[resourcePath,new Uint8Array(gzip)]]);
await namespace.prepareFluidContactData({resources:{records:[{path:resourcePath,kind:'fzp1-gzip',bytes:gzip.length,sha256:hash(gzip),uncompressedBytes:offset}],take(p){const value=pending.get(p);assert(value);pending.delete(p);return value;}},registerCleanup(fn){rollback=fn;}});
const camera=new T.OrthographicCamera(-6,6,4,-4,.05,100);camera.position.set(15,7,20);camera.lookAt(5.5,.5,8.5);camera.updateMatrixWorld(true);
const data=new Uint8Array(40*32*4),mask=new T.DataTexture(data,40,32),fieldUniforms={field:{value:mask},grid:{value:new T.Vector2(40,32)},cellSize:{value:.5}};let borrowedDisposed=0;mask.addEventListener('dispose',()=>borrowedDisposed++);
const source=[{id:'cell:10,16',x:5.25,y:8.25},{id:'cell:11,16',x:5.75,y:8.25},{id:'cell:10,17',x:5.25,y:8.75},{id:'cell:11,17',x:5.75,y:8.75}].map(c=>({...c,size:.5,material:'grass',depositedFuel:0,surfaceFuel:.08}));for(const c of source)data[(Math.floor(c.y/.5)*40+Math.floor(c.x/.5))*4+3]=255;
const birth=1/60,ignitions=source.map((c,i)=>({id:i+2,type:'ignition',cellId:c.id,receivedWorldTime:birth})),burnouts=source.map((c,i)=>({id:i+6,type:'burnout',cellId:c.id,receivedWorldTime:birth+3.2}));
const frame=(world,phase,events=[],paused=false)=>{
 const viewProjection=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).toArray(),depth=new T.DepthTexture(1280,800);depth.addEventListener('dispose',()=>borrowedDisposed++);
 return{version:1,worldTime:world,playerTime:world*1.5,tick:Math.round(world*60),paused,camera:{kind:'orthographic',position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},matrixWorld:camera.matrixWorld.toArray(),matrixWorldInverse:camera.matrixWorldInverse.toArray(),projectionMatrix:camera.projectionMatrix.toArray()},viewport:{width:1280,height:800,pixelRatio:1},fieldUniforms,opaqueDepth:{valid:true,texture:depth,width:1280,height:800,convention:'webgl-depth-0-1',viewProjectionMatrix:viewProjection,cameraWorldMatrix:camera.matrixWorld.toArray(),projectionMatrixInverse:camera.projectionMatrixInverse.toArray()},player:{x:4.25,y:8.25,elevation:0,radius:.5,tool:'matches'},cells:source.map(c=>({...c,phase,intensity:phase==='burning'?1:0,surfaceFuel:phase==='spent'?0:.08})),eventReceipts:{generation:0,primed:true,reset:false,highestId:events.at(-1)?.id??null,events},discharge:{active:false},torch:{phase:'unlit'},buildingVisuals:[]};
};
const effect=namespace.createFluidContactReference(T,{quality:'reference'}),meshes=effect.root.children.filter(x=>x.isMesh),owned=meshes.flatMap(m=>[m.geometry,m.material]);owned.push(...new Set(Object.values(meshes[0].material.uniforms).map(u=>u.value).filter(v=>v?.isData3DTexture)));const counts=new Map(owned.map(r=>[r,0]));for(const r of owned)r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));
effect.update(frame(0,'cold'));assert.equal(effect.root.visible,false);effect.update(frame(.25,'burning',ignitions));let d=effect.diagnostics();assert.equal(d.quality,'reference');assert.equal(d.geometry.triangles,24);assert.equal(d.geometry.vertices,16);assert.equal(d.resources.volumeCpuBytes,64);assert.equal(d.payload.metrics.denseBuffers,2);assert.match(d.opaqueOcclusion,/borrowed same-camera/);assert(meshes[0].renderOrder<meshes[1].renderOrder);assert(meshes.every(m=>m.material.premultipliedAlpha&&m.material.blending===T.NormalBlending&&!m.material.depthWrite&&m.material.depthTest));assert.equal(meshes[0].geometry.getAttribute('position').array[0],5);
const paused=frame(.25,'burning',[],true);paused.opaqueDepth.viewProjectionMatrix[0]+=.1;effect.update(paused);assert.match(effect.diagnostics().opaqueOcclusion,/unavailable/);assert.equal(effect.diagnostics().source.age,d.source.age);
const wrongSize=frame(.25,'burning',[],true);wrongSize.viewport.pixelRatio=1.75;effect.update(wrongSize);assert.match(effect.diagnostics().opaqueOcclusion,/unavailable/);effect.update(frame(.25,'burning',[],true));assert.match(effect.diagnostics().opaqueOcclusion,/borrowed same-camera/);
effect.update(frame(birth+3.2,'spent',burnouts));assert.equal(meshes[0].material.uniforms.reactionGain.value,0);assert.equal(effect.root.children.find(x=>x.isPointLight).intensity,0);effect.update(frame(birth+6.2,'spent'));assert(Math.abs(meshes[0].material.uniforms.densityGain.value-.5)<1e-12);effect.update(frame(birth+6.4,'spent'));assert.equal(effect.root.visible,false);assert.equal(effect.diagnostics().geometry.triangles,0);
effect.reset();assert.throws(()=>effect.update(frame(5,'spent')),/ignition age unavailable/);assert.equal(effect.root.visible,false);effect.reset();const unsupported=frame(.25,'burning',ignitions);unsupported.discharge={active:true};assert.throws(()=>effect.update(unsupported),/Unsupported/);assert.equal(effect.root.visible,false);effect.dispose();effect.dispose();assert([...counts.values()].every(n=>n===1));assert.equal(borrowedDisposed,0);assert.equal(effect.diagnostics().resources.volumeCpuBytes,0);assert.equal(effect.diagnostics().payload.metrics.denseBytes,0);assert(namespace.fluidContactPayloadEvidence().metrics.sharedSparseBytes>0);
// Execute the actual frozen existing bridge's mode predicate with only its
// unrelated painted/depth dependencies stubbed. This catches consumer ABI drift.
const bridgeSource=execFileSync('git',['show','f79ceaa0f4bb045314c144472b083a95f1c492ad:src/art/fire-review-effect.js'],{encoding:'utf8'}),bridgeModule=new vm.SourceTextModule(bridgeSource,{context,identifier:'actual-existing-review-bridge'});
const stubModule=(names,values)=>new vm.SyntheticModule(names,function(){names.forEach((name,i)=>this.setExport(name,values[i]));},{context});
await bridgeModule.link(spec=>{
 if(spec==='./fire.js')return stubModule(['createFire'],[()=>({root:new T.Group(),reset(){},update(){},dispose(){},diagnostics(){return{};}})]);
 if(spec==='./scene-depth.js')return stubModule(['createOpaqueSceneDepth'],[()=>({dispose(){},diagnostics(){return{};}})]);
 if(spec==='./fire-frame.js')return stubModule(['createFireFrameAdapter','dischargePresentation','burningBuildingVisuals'],[()=>({reset(){},diagnostics(){return{};}}),()=>({}),()=>[]]);
 throw Error('Unexpected bridge dependency:'+spec);
});await bridgeModule.evaluate();
const bridge=bridgeModule.namespace.createFireReviewEffect(T,{},fieldUniforms,{artistFactory:namespace.createFluidContactReference,initialMode:'reference'});assert.equal(bridge.diagnostics().artist.quality,'reference');bridge.dispose();rollback();
console.log('PASS: actual SharedThree + tiny synthetic fields:2RGBAuploads/useful prismdraw ranges/native units/depth positive+negative/pauseddepth refresh/sourceburnout+finitefade/reset/refusal/disposal. NO actual193asset bootstrap, GPU shader compilation or visual acceptance.');
