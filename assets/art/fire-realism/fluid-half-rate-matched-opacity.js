import {FIELD_METADATA,PRESENTATION} from './fluid-contact-half-rate-diagnostic-02/metadata.js';
import {GEOMETRY_METRICS,supportPair} from './fluid-contact-half-rate-diagnostic-02/geometry-data.js';
import {createBinaryFieldStore} from './fluid-contact-half-rate-diagnostic-02/payload/payload.js';
import {createContactSourceClock} from './fluid-contact-half-rate-diagnostic-02/source-clock.js';
import {prismGeometry} from './fluid-contact-half-rate-diagnostic-02/support.js';
import {blenderToGame} from './fluid-contact-half-rate-diagnostic-02/space.js';
import {makeFluidShaders} from './fluid-contact-half-rate-diagnostic-02/shaders.js';
import {floorPrism} from './fluid-contact-half-rate-diagnostic-02/floor.js';
import {emissionAbsorptionFragment,emissionVariantUniform,configureEmissionBlend} from './fluid-contact-half-rate-diagnostic-02/emission-transfer.js';
import {normalizedEmissionFragment} from './fluid-contact-half-rate-diagnostic-02/normalization-transfer.js';
const FLUID_CONTACT_VERSION='0.1.0-half-rate-matched-opacity-control';
const store=createBinaryFieldStore(FIELD_METADATA),finite=Number.isFinite,matrix=a=>Array.isArray(a)&&a.length===16&&a.every(finite);
export async function prepareHalfRateMatchedOpacityData(context){return store.prepare(context);}
export function halfRateMatchedOpacityPayloadEvidence(){return store.evidence();}
export async function auditHalfRateMatchedOpacityRGBA(callback,options){return store.auditFrames(callback,options);}
export function createHalfRateMatchedOpacityControl(T,options={}){
  if(PRESENTATION.study?.id!=='cfe01-half-rate-terminal-diagnostic'||PRESENTATION.study.rawGatesPassed!==false||PRESENTATION.study.admitted!==false||FIELD_METADATA.source.rawManifestSha256!=='1a3bb8d2af92f6a9c7017ad37a49b76977baa227d94ae3a0cded781229a2c77e')throw Error('Exact failed diagnostic source identity required');
  if(T?.ColorManagement?.workingColorSpace!==T.LinearSRGBColorSpace)throw Error('Fixed6r requires pinned linearSRGB primaries');
  if(options.quality&&options.quality!=='reference')throw Error('Finite CFD has no optimized mode');
  if(!T?.Data3DTexture||!T?.Group||!T?.ShaderMaterial)throw Error('Shared Three/WebGL2 API is required');
  const cache=store.createFrameCache(),clock=createContactSourceClock(),root=new T.Group();root.name='Unaccepted exact cfe01 half-rate matched-opacity control';
  const [nx,ny,nz]=PRESENTATION.grid.resolution,seedSlots=cache.framePair(1,2),textures=[null,null];
  for(const slot of seedSlots){const tex=new T.Data3DTexture(slot.floats,nx,ny,nz);tex.type=T.FloatType;tex.format=T.RGBAFormat;tex.internalFormat='RGBA32F';tex.minFilter=tex.magFilter=T.NearestFilter;tex.wrapS=tex.wrapT=tex.wrapR=T.ClampToEdgeWrapping;tex.generateMipmaps=false;tex.unpackAlignment=1;tex.flipY=false;tex.colorSpace=T.NoColorSpace;tex.needsUpdate=true;textures[slot.id]=tex;}
  const white=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1,T.RGBAFormat);white.needsUpdate=true;
  const shared={field0:{value:textures[0]},field1:{value:textures[1]},nativeField:{value:white},opaqueDepth:{value:white},scalarOrigin:{value:new T.Vector3(...PRESENTATION.grid.origin)},voxelSize:{value:new T.Vector3(...PRESENTATION.grid.spacing)},fieldResolution:{value:new T.Vector3(nx,ny,nz)},patchTranslation:{value:new T.Vector3(...PRESENTATION.translation)},cameraPositionWorld:{value:new T.Vector3()},cameraForwardWorld:{value:new T.Vector3()},playerPosition:{value:new T.Vector3()},nativeGrid:{value:new T.Vector2()},opaqueDepthSize:{value:new T.Vector2(1,1)},opaqueViewProjection:{value:new T.Matrix4()},temporalMix:{value:0},reactionGain:{value:0},densityGain:{value:0},contactHeight:{value:PRESENTATION.contactBandHeight},fieldEnabled:{value:0},nativeCellSize:{value:.5},opaqueDepthEnabled:{value:0},orthographic:{value:1},playerRadius:{value:.5}};
  const original=makeFluidShaders(GEOMETRY_METRICS.maxHullVertices),shaders={vertexShader:original.vertexShader,fragmentShader:normalizedEmissionFragment(emissionAbsorptionFragment(original.fragmentShader,'matched-opacity'),GEOMETRY_METRICS.maxHullVertices)},slots=Array.from({length:GEOMETRY_METRICS.maxPrisms},()=>{
    const positions=new Float32Array(GEOMETRY_METRICS.maxHullVertices*2*3),indices=new Uint16Array((GEOMETRY_METRICS.maxHullVertices*4-4)*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setIndex(new T.BufferAttribute(indices,1).setUsage(T.DynamicDrawUsage));
    const uniforms={...shared,eaFlameExtinctionCoefficient:emissionVariantUniform('matched-opacity'),planeCount:{value:0},planes:{value:Array.from({length:GEOMETRY_METRICS.maxHullVertices},()=>new T.Vector4())},slab:{value:new T.Vector2()}};
    const material=new T.ShaderMaterial({...shaders,uniforms,transparent:true,depthWrite:false,depthTest:true,side:T.FrontSide,blending:T.NormalBlending,premultipliedAlpha:true,toneMapped:false});
    configureEmissionBlend(T,material);
    const mesh=new T.Mesh(geometry,material);mesh.visible=false;root.add(mesh);return{mesh,geometry,material,positions,indices,uniforms};
  });
  const light=new T.PointLight(0xff8d35,0,4.5,2);light.position.set(5.5,.3,8.5);root.add(light);
  let closed=false,pairIndex=-1,sourceState=null,geometryTriangles=0,geometryVertices=0,depthStatus='unavailable',maskStatus='unavailable',updates=0;const uploaded=[seedSlots.find(s=>s.id===0).version,seedSlots.find(s=>s.id===1).version];root.visible=false;
  function bindPresentation(frame){
    const camera=frame.camera,field=frame.fieldUniforms,depth=frame.opaqueDepth;
    if(!camera||!matrix(camera.matrixWorld)||!matrix(camera.matrixWorldInverse)||!matrix(camera.projectionMatrix))throw Error('Finite CFD needs actual current camera');
    shared.cameraPositionWorld.value.set(camera.position.x,camera.position.y,camera.position.z);shared.cameraForwardWorld.value.set(-camera.matrixWorld[8],-camera.matrixWorld[9],-camera.matrixWorld[10]).normalize();shared.orthographic.value=Number(camera.kind==='orthographic');
    shared.playerPosition.value.set(frame.player.x,frame.player.elevation||0,frame.player.y);shared.playerRadius.value=frame.player.radius;
    const texture=field?.field?.value,grid=field?.grid?.value,size=field?.cellSize?.value,fieldValid=texture?.isTexture&&finite(grid?.x)&&finite(grid?.y)&&grid.x>0&&grid.y>0&&finite(size)&&size>0;
    shared.nativeField.value=fieldValid?texture:white;shared.fieldEnabled.value=Number(!!fieldValid);maskStatus=fieldValid?'borrowed actual burning A; lower-band inward taper; upper emission requires all4live source texels':'unavailable; reaction disabled';if(fieldValid){shared.nativeGrid.value.set(grid.x,grid.y);shared.nativeCellSize.value=size;}
    let valid=depth?.valid===true&&depth.texture?.isTexture&&depth.convention==='webgl-depth-0-1'&&matrix(depth.viewProjectionMatrix)&&matrix(depth.cameraWorldMatrix)&&matrix(depth.projectionMatrixInverse)&&Number.isInteger(depth.width)&&depth.width>0&&Number.isInteger(depth.height)&&depth.height>0&&finite(frame.viewport?.width)&&finite(frame.viewport?.height)&&finite(frame.viewport?.pixelRatio)&&depth.width===Math.floor(frame.viewport.width*frame.viewport.pixelRatio)&&depth.height===Math.floor(frame.viewport.height*frame.viewport.pixelRatio);
    if(valid){const expected=new T.Matrix4().fromArray(camera.projectionMatrix).multiply(new T.Matrix4().fromArray(camera.matrixWorldInverse)).elements;valid=expected.every((v,i)=>Math.abs(v-depth.viewProjectionMatrix[i])<=1e-5*Math.max(1,Math.abs(v)))&&camera.matrixWorld.every((v,i)=>Math.abs(v-depth.cameraWorldMatrix[i])<=1e-5*Math.max(1,Math.abs(v)));}
    shared.opaqueDepthEnabled.value=Number(!!valid);shared.opaqueDepth.value=valid?depth.texture:white;depthStatus=valid?'borrowed same-camera current drawing-buffer depth; per-sample termination':'unavailable; no opaque-occlusion approval';if(valid){shared.opaqueDepthSize.value.set(depth.width,depth.height);shared.opaqueViewProjection.value.fromArray(depth.viewProjectionMatrix);}
  }
  function loadGeometry(index,camera){
    const rawPair=supportPair(index),pair={prisms:rawPair.prisms.map(floorPrism).filter(Boolean)};if(pair.prisms.length>slots.length)throw Error('Actual source support exceeded bound');
    if(pair.prisms.length&&camera.position.y<=Math.max(...pair.prisms.map(p=>p.upper))+PRESENTATION.translation[1])throw Error('This bounded prototype requires the supported above-volume camera ordering');
    if(pair.prisms.length){
      let vertical=1;
      if(camera.kind==='orthographic')vertical=Math.abs(shared.cameraForwardWorld.value.y);
      else{const maxY=Math.max(...pair.prisms.map(p=>p.upper))+PRESENTATION.translation[1],horizontal=Math.hypot(camera.position.x-5.5,camera.position.z-8.5)+3;vertical=(camera.position.y-maxY)/Math.hypot(horizontal,camera.position.y-PRESENTATION.translation[1]+1);}
      if(!finite(vertical)||vertical<=0||Math.ceil(PRESENTATION.grid.spacing[2]/(vertical*Math.min(...PRESENTATION.grid.spacing)*.5))>120)throw Error('Camera pitch exceeds finite per-band sampling support; no samples silently omitted');
    }
    if(index===pairIndex)return;
    geometryTriangles=geometryVertices=0;
    pair.prisms.forEach((prism,i)=>{
      const target=slots[i],data=prismGeometry(prism);if(data.vertices.length>target.positions.length||data.indices.length>target.indices.length)throw Error('Measured source geometry bound exceeded');
      for(let v=0;v<data.vertices.length;v+=3){const p=blenderToGame(data.vertices.slice(v,v+3),PRESENTATION.translation);target.positions.set(p,v);}target.indices.set(data.indices);target.geometry.setDrawRange(0,data.indices.length);
      const attr=target.geometry.getAttribute('position');attr.clearUpdateRanges();attr.addUpdateRange(0,data.vertices.length);attr.needsUpdate=true;target.geometry.index.clearUpdateRanges();target.geometry.index.addUpdateRange(0,data.indices.length);target.geometry.index.needsUpdate=true;target.geometry.computeBoundingSphere();
      target.uniforms.planeCount.value=prism.planes.length;prism.planes.forEach((p,j)=>target.uniforms.planes.value[j].set(p[0],p[1],0,p[2]));target.uniforms.slab.value.set(prism.lower,prism.upper);target.mesh.renderOrder=10+prism.band;target.mesh.visible=true;geometryVertices+=data.vertices.length/3;geometryTriangles+=data.indices.length/3;
    });
    for(let i=pair.prisms.length;i<slots.length;i++)slots[i].mesh.visible=false;pairIndex=index;
  }
  function update(frame){
    if(closed)return;try{bindPresentation(frame); // Must refresh borrowed depth even while paused.
    sourceState=clock.update(frame);updates++;shared.reactionGain.value=sourceState.reactionGain;shared.densityGain.value=sourceState.densityGain;
    if(sourceState.phase==='empty'||sourceState.phase==='retired'){root.visible=false;light.intensity=0;return;}
    const pair=cache.framePair(sourceState.sample0+1,sourceState.sample1+1);
    for(const slot of pair)if(uploaded[slot.id]!==slot.version){textures[slot.id].needsUpdate=true;uploaded[slot.id]=slot.version;}
    shared.field0.value=textures[pair[0].id];shared.field1.value=textures[pair[1].id];shared.temporalMix.value=sourceState.mix;
    loadGeometry(Math.min(191,sourceState.sample0),frame.camera);root.visible=true;
    // Local spill is finite and source-gated; prototype max4engine light units,
    // not a photometric calibration or a renderer/exposure modification.
    light.intensity=4*sourceState.reactionGain*Math.max(0,Math.min(1,(3.2-sourceState.age)/.2));
    }catch(error){reset();throw error;}
  }
  function reset(){if(closed)return;clock.reset();cache.reset();sourceState=null;pairIndex=-1;geometryTriangles=geometryVertices=0;root.visible=false;light.intensity=0;shared.reactionGain.value=shared.densityGain.value=0;}
  return{root,update,reset,diagnostics(){return{version:FLUID_CONTACT_VERSION,quality:'reference',diagnostic:{variant:'exact-half-rate-failed-terminal-fixed6r-matched-opacity6',study:structuredClone(PRESENTATION.study),rawGatesPassed:false,admitted:false,opticalControlCommit:'930553024d54297e4aeefb1cb33273de595a8eeb',fixedFlameEmissivity:6,fixedFlameExtinctionCoefficient:6,scope:'Same fixed6r emission; existing matched-opacity6 extinction control, actual source clock/A/depth and two slots; identical measured half-rate support. Unaccepted diagnostic only; no native quality/cost credit.'},prototype:true,referenceAccepted:false,optimizedAvailable:false,updates,source:sourceState?structuredClone(sourceState):null,geometry:{vertices:root.visible?geometryVertices:0,triangles:root.visible?geometryTriangles:0,pairIndex,maxPrisms:slots.length,maxHullVertices:GEOMETRY_METRICS.maxHullVertices,ownership:'Convex half-open current/next+onevoxel height bands, one ray interval each; BOTH mesh and slab floor0',floor:{nativeY:0,rawFieldsUnchanged:true,excludesBelowFloorReconstructedContribution:true}},opaqueOcclusion:depthStatus,authoritativeMask:maskStatus,resources:{volumeTextures:closed?0:2,volumeCpuBytes:closed?0:PRESENTATION.grid.resolution.reduce((a,b)=>a*b,1)*32,volumeGpuBytes:closed?0:PRESENTATION.grid.resolution.reduce((a,b)=>a*b,1)*32,geometryCpuBytes:slots.reduce((n,s)=>n+s.positions.byteLength+s.indices.byteLength,0),geometryGpuBytes:slots.reduce((n,s)=>n+s.positions.byteLength+s.indices.byteLength,0),materials:slots.length,lights:closed?0:1,sharedSparseBytes:store.diagnostics().metrics.sharedSparseBytes,geometrySourceJsonBytes:GEOMETRY_METRICS.sourceJsonBytes,sharedDataLifetime:'document/module; not freed by factory dispose',unmeasured:'Engine/driver, JavaScript objects, crypto and GC residency are not measured'},payload:store.diagnostics(),disposed:closed};},dispose(){if(closed)return;reset();closed=true;for(const target of slots){target.geometry.dispose();target.geometry.deleteAttribute('position');target.geometry.setIndex(null);target.material.dispose();target.positions=target.indices=target.uniforms=null;}slots.length=0;for(const texture of textures){texture.dispose();texture.image.data=null;}shared.field0.value=shared.field1.value=null;shared.nativeField.value=shared.opaqueDepth.value=white;white.dispose();light.dispose?.();cache.dispose();root.removeFromParent();root.clear();}};
}
