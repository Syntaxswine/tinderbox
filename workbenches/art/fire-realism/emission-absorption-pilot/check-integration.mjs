/** Trial integration using the frozen fixture with TWO-VOXEL SYNTHETIC controls.
 * This is lifecycle/consumer evidence, never actual193/source/GPU acceptance.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {webcrypto,createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import * as T from '../../../../src/runtime/three.js';
import {encodeZeroLiteral} from '../../../../assets/art/fire-realism/fluid-contact-surface/payload/codec.js';
if(!vm.SourceTextModule)throw Error('Use node --experimental-vm-modules');
const hash=b=>createHash('sha256').update(b).digest('hex'),records=[],chunks=[],resources=[],pending=new Map();let offset=0;
for(let frame=1;frame<=193;frame++){
 const packets=[],recordIds=[],chunkOffset=offset;
 for(const [lane,channel]of ['density','temperature','flame'].entries()){
  const bytes=Buffer.alloc(8);bytes.writeFloatLE(frame===1?0:.5+lane*.1,0);bytes.writeFloatLE(frame===1?0:.9,4);const packet=encodeZeroLiteral(bytes),id=records.length;records.push({id,frame,channel,offset,packetBytes:packet.length,packetSha256:hash(packet),rawBytes:8,rawSha256:hash(bytes)});recordIds.push(id);packets.push(packet);offset+=packet.length;
 }
 const gzip=gzipSync(Buffer.concat(packets)),resourcePath='assets/art/fire-realism/fluid-contact-surface/synthetic-'+frame+'.fzp.gz';
 chunks.push({id:frame-1,offset:chunkOffset,sparseBytes:offset-chunkOffset,gzipBytes:gzip.length,gzipSha256:hash(gzip),resourcePath,recordIds,kind:'fzp2-gzip'});resources.push({path:resourcePath,kind:'fzp2-gzip',bytes:gzip.length,sha256:hash(gzip),uncompressedBytes:offset-chunkOffset});pending.set(resourcePath,new Uint8Array(gzip));
}
const metadata={version:2,source:Object.fromEntries(['rawManifestSha256','settingsSha256','prepareReportSha256','sourceBlendSha256'].map(k=>[k,'0'.repeat(64)])),frames:Array.from({length:193},(_,i)=>({frame:i+1,timeSeconds:i/30,resolution:[2,1,1]})),records,chunks,sparseBytes:offset};
const presentation={grid:{resolution:[2,1,1],origin:[-.25,0,.05],spacing:[.5,1,.1]},contactBandHeight:.2733333358168602,translation:[5.5,0,8.5]};
const prism=band=>({band,lower:band===0?-.05:.05,upper:band===0?.05:.15,hull:[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]],planes:[[0,-1,.5],[1,0,.5],[0,1,.5],[-1,0,.5]]});
const base=path.resolve('assets/art/fire-realism/fluid-contact-surface'),context=vm.createContext({console,Uint8Array,Uint16Array,Uint32Array,Float32Array,DataView,ArrayBuffer,Blob,DecompressionStream,performance,crypto:webcrypto,structuredClone,setTimeout,clearTimeout,Error,TypeError,RangeError,DOMException,AbortController});
const modules=new Map();
async function load(filename){
 if(modules.has(filename))return modules.get(filename);
 let source;if(path.basename(filename)==='metadata.js')source='export const FIELD_METADATA='+JSON.stringify(metadata)+';export const PRESENTATION='+JSON.stringify(presentation)+';';
 else if(path.basename(filename)==='geometry-data.js')source='export const GEOMETRY_METRICS={maxHullVertices:4,maxPrisms:2,sourceJsonBytes:0};export function supportPair(){return{prisms:'+JSON.stringify([prism(0),prism(1)])+'};}';
 else source=fs.readFileSync(filename,'utf8');
 const module=new vm.SourceTextModule(source,{context,identifier:filename});modules.set(filename,module);await module.link(specifier=>load(path.resolve(path.dirname(filename),specifier)));return module;
}
const module=await load(path.resolve('assets/art/fire-realism/fluid-surface-emission-pilot.js'));await module.evaluate();const namespace=module.namespace,original=modules.get(path.join(base,'index.js')).namespace;let rollback;
assert.deepEqual(Object.keys(namespace).sort(),['auditFluidSurfaceContactRGBA','createFluidSurfaceEmissionOpacityControl','createFluidSurfaceEmissionPilot','fluidSurfaceContactPayloadEvidence','prepareFluidSurfaceContactData']);
await namespace.prepareFluidSurfaceContactData({resources:{records:resources,take(p){const value=pending.get(p);assert(value);pending.delete(p);return value;}},registerCleanup(fn){rollback=fn;}});
assert.equal(pending.size,0);
const camera=new T.OrthographicCamera(-6,6,4,-4,.05,100);camera.position.set(15,7,20);camera.lookAt(5.5,.5,8.5);camera.updateMatrixWorld(true);
const data=new Uint8Array(40*32*4),mask=new T.DataTexture(data,40,32),fieldUniforms={field:{value:mask},grid:{value:new T.Vector2(40,32)},cellSize:{value:.5}};let borrowedDisposed=0;mask.addEventListener('dispose',()=>borrowedDisposed++);
const source=[{id:'cell:10,16',x:5.25,y:8.25},{id:'cell:11,16',x:5.75,y:8.25},{id:'cell:10,17',x:5.25,y:8.75},{id:'cell:11,17',x:5.75,y:8.75}].map(c=>({...c,size:.5,material:'grass',depositedFuel:0,surfaceFuel:.08}));for(const c of source)data[(Math.floor(c.y/.5)*40+Math.floor(c.x/.5))*4+3]=255;
const birth=1/60,ignitions=source.map((c,i)=>({id:i+2,type:'ignition',cellId:c.id,receivedWorldTime:birth})),burnouts=source.map((c,i)=>({id:i+6,type:'burnout',cellId:c.id,receivedWorldTime:birth+3.2}));
const frame=(world,phase,events=[],paused=false)=>{
 const viewProjection=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).toArray(),depth=new T.DepthTexture(1280,800);depth.addEventListener('dispose',()=>borrowedDisposed++);
 return{version:1,worldTime:world,playerTime:world*1.5,tick:Math.round(world*60),paused,camera:{kind:'orthographic',position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},matrixWorld:camera.matrixWorld.toArray(),matrixWorldInverse:camera.matrixWorldInverse.toArray(),projectionMatrix:camera.projectionMatrix.toArray()},viewport:{width:1280,height:800,pixelRatio:1},fieldUniforms,opaqueDepth:{valid:true,texture:depth,width:1280,height:800,convention:'webgl-depth-0-1',viewProjectionMatrix:viewProjection,cameraWorldMatrix:camera.matrixWorld.toArray(),projectionMatrixInverse:camera.projectionMatrixInverse.toArray()},player:{x:4.25,y:8.25,elevation:0,radius:.5,tool:'matches'},cells:source.map(c=>({...c,phase,intensity:phase==='burning'?1:0,surfaceFuel:phase==='spent'?0:.08})),eventReceipts:{generation:0,primed:true,reset:false,highestId:events.at(-1)?.id??null,events},discharge:{active:false},torch:{phase:'unlit'},buildingVisuals:[]};
};


assert.equal(namespace.prepareFluidSurfaceContactData,original.prepareFluidSurfaceContactData);assert.equal(namespace.fluidSurfaceContactPayloadEvidence,original.fluidSurfaceContactPayloadEvidence);assert.equal(namespace.auditFluidSurfaceContactRGBA,original.auditFluidSurfaceContactRGBA);
const helper=modules.get(path.resolve('assets/art/fire-realism/fluid-surface-emission-transfer.js')).namespace;
const serial=v=>{if(v?.isTexture){const i=v.image;return{kind:v.isData3DTexture?'Data3DTexture':'Texture',width:i?.width,height:i?.height,depth:i?.depth,type:v.type,format:v.format,internalFormat:v.internalFormat,min:v.minFilter,mag:v.magFilter,colorSpace:v.colorSpace,data:i?.data?hash(new Uint8Array(i.data.buffer,i.data.byteOffset,i.data.byteLength)):null};}if(v?.toArray)return v.toArray();if(Array.isArray(v))return v.map(serial);return v;};
function snapshot(effect){const meshes=effect.root.children.filter(m=>m.isMesh),light=effect.root.children.find(m=>m.isPointLight);return{meshes:meshes.map(m=>({positions:hash(Buffer.from(m.geometry.getAttribute('position').array.buffer)),indices:hash(Buffer.from(m.geometry.index.array.buffer)),drawRange:{...m.geometry.drawRange},renderOrder:m.renderOrder,flags:[m.material.transparent,m.material.depthTest,m.material.depthWrite,m.material.side,m.material.premultipliedAlpha,m.material.toneMapped,m.material.version],fragment:m.material.fragmentShader,vertex:m.material.vertexShader,uniforms:Object.fromEntries(Object.entries(m.material.uniforms).map(([k,u])=>[k,serial(u.value)]))})),light:{color:light.color.toArray(),position:light.position.toArray(),intensity:light.intensity,distance:light.distance,decay:light.decay},source:effect.diagnostics().source};}
const all=original.createFluidSurfaceContactReference(T,{quality:'reference'}),allMaterials=new Set(all.root.children.filter(m=>m.isMesh).map(m=>m.material));assert.throws(()=>namespace.createFluidSurfaceEmissionPilot(T),/existing field cache/);all.update(frame(.25,'burning',ignitions));const baseline=snapshot(all);all.dispose();
const snapshots=[];
for(const [factory,kind]of [[namespace.createFluidSurfaceEmissionPilot,'smoke-only'],[namespace.createFluidSurfaceEmissionOpacityControl,'matched-opacity']]){
 const effect=factory(T,{quality:'reference'}),meshes=effect.root.children.filter(m=>m.isMesh),owned=meshes.flatMap(m=>[m.geometry,m.material]),textures=new Set(Object.values(meshes[0].material.uniforms).map(u=>u.value).filter(v=>v?.isData3DTexture));owned.push(...textures);const disposal=new Map(owned.map(x=>[x,0]));for(const x of owned)x.addEventListener('dispose',()=>disposal.set(x,disposal.get(x)+1));assert(meshes.every(m=>!allMaterials.has(m.material)));assert.equal(new Set(meshes.map(m=>m.material)).size,2);
 effect.update(frame(.25,'burning',ignitions));const actual=snapshot(effect);for(let i=0;i<meshes.length;i++){assert.equal(actual.meshes[i].fragment,helper.emissionAbsorptionFragment(baseline.meshes[i].fragment,kind));const m=meshes[i].material;assert(Object.isFrozen(m.uniforms.eaFlameExtinctionCoefficient));assert.equal(m.uniforms.eaFlameExtinctionCoefficient.value,kind==='smoke-only'?0:6);assert.equal(m.blending,T.CustomBlending);assert.equal(m.blendSrc,T.OneFactor);assert.equal(m.blendSrcAlpha,T.OneFactor);assert.equal(m.blendDst,T.OneMinusSrcAlphaFactor);assert.equal(m.blendDstAlpha,T.OneMinusSrcAlphaFactor);assert.equal(m.blendEquation,T.AddEquation);assert.equal(m.blendEquationAlpha,T.AddEquation);}
 const compare=structuredClone(actual),prior=structuredClone(baseline);compare.meshes.forEach(m=>{delete m.fragment;delete m.uniforms.eaFlameExtinctionCoefficient;});prior.meshes.forEach(m=>delete m.fragment);assert.equal(JSON.stringify(compare),JSON.stringify(prior),'Changed a non-transport geometry/light/uniform/depth/source input');snapshots.push(actual);
 assert.equal(effect.diagnostics().quality,'reference');assert.equal(effect.diagnostics().diagnostic.variant,'display-emission-'+kind);assert.equal(effect.diagnostics().referenceAccepted,false);assert.equal(effect.diagnostics().payload.metrics.denseBytes,64);
 effect.update(frame(.25,'burning',[],true));assert.equal(effect.diagnostics().source.age,.25-birth);assert.match(effect.diagnostics().opaqueOcclusion,/borrowed same-camera/);effect.update(frame(birth+3.2,'spent',burnouts));assert.equal(meshes[0].material.uniforms.reactionGain.value,0);assert.equal(effect.root.children.find(m=>m.isPointLight).intensity,0);effect.update(frame(birth+6.2,'spent'));assert(Math.abs(meshes[0].material.uniforms.densityGain.value-.5)<1e-12);effect.update(frame(birth+6.4,'spent'));assert.equal(effect.root.visible,false);effect.reset();assert.throws(()=>effect.update(frame(5,'spent')),/ignition age unavailable/);effect.dispose();effect.dispose();assert([...disposal.values()].every(n=>n===1));assert.equal(borrowedDisposed,0);assert.equal(original.fluidSurfaceContactPayloadEvidence().metrics.denseBytes,0);
}
for(let i=0;i<2;i++)assert.equal(snapshots[0].meshes[i].fragment,snapshots[1].meshes[i].fragment,'Paired fragments must be byte-identical');
for(const fault of ['palette','smoke','duplicate','unexpected']){let constructed=[],disposed=0;class FaultShader extends T.ShaderMaterial{constructor(args){super(args);constructed.push(this);if(constructed.length===2){if(fault==='palette')this.fragmentShader=this.fragmentShader.replace('smoothstep(.20,.82,heat)','pow(heat,4.)');if(fault==='smoke')this.fragmentShader=this.fragmentShader.replace('mix(1.,.18,clamp(value.z*heat,0.,1.))','1.');if(fault==='duplicate')this.fragmentShader+='float alpha=0.;vec3 emission=vec3(0.);float sourceA=livePatchA();';if(fault==='unexpected')this.isShaderMaterial=false;}this.addEventListener('dispose',()=>disposed++);}}assert.throws(()=>namespace.createFluidSurfaceEmissionPilot({...T,ShaderMaterial:FaultShader}),fault==='unexpected'?/unexpected material/:/exactly one/);assert.equal(constructed.length,2);assert.equal(disposed,2);assert(!constructed[0].fragmentShader.includes('eaAdvance('));assert.equal(original.fluidSurfaceContactPayloadEvidence().metrics.denseBytes,0);}
assert.throws(()=>namespace.createFluidSurfaceEmissionPilot(T,{quality:'optimized'}),/no optimized/);rollback();
console.log('PASS paired actualSharedThree/synthetic2voxel: exact bootstrap aliases/one store, onlyk differs, preserved native geometry/light/readability/uniform/depth/clocks, explicit ONE/ONE_MINUS_SRC_ALPHA RGB+alpha, no sharing, all guards before mutation, failed-instance cleanup and idempotent disposal. No actualGPU/native quality claim.');
