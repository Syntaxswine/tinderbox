/** One opt-in diagnostic display model. No renderer, loop, asset or field owner. */
export const LINEAR_HDR_PRESENTATION_CONTRACT='common-linear-hdr-neutral-v1';
export const HDR_MEASUREMENT_UNAVAILABLE='Hardware measurement is unavailable for the common linear-HDR appearance experiment.';
const copy=x=>structuredClone(x),SAMPLES=4,NONE=Symbol('no failure');
const message=e=>{try{return String(e?.message??e).slice(0,4096);}catch{return 'Unknown presentation failure';}};
function unavailable(reason){const e=Error(reason);e.code='LINEAR_HDR_UNAVAILABLE';return e;}
function disposeAll(items){const errors=[];for(const item of items.reverse())try{item?.dispose();}catch(e){errors.push(e);}return errors;}
function failure(primary,errors){if(errors.length)throw new AggregateError(primary===NONE?errors:[primary,...errors],'HDR work/state cleanup failed');if(primary!==NONE)throw primary;}
const VERTEX='precision highp float;\nattribute vec3 position;\nvoid main(){gl_Position=vec4(position,1.);}';
const DISPLAY=['precision highp float;','uniform sampler2D hdrScene;','uniform vec2 bufferSize;',
  '#include <tonemapping_pars_fragment>','#include <colorspace_pars_fragment>',
  'void main(){vec3 linearColor=texture2D(hdrScene,gl_FragCoord.xy/bufferSize).rgb;',
  'gl_FragColor=sRGBTransferOETF(vec4(NeutralToneMapping(linearColor),1.));}'].join('\n');
function save(T,r){
  const gl=r.getContext(),target=r.getRenderTarget(),viewport=r.getViewport(new T.Vector4()),scissor=r.getScissor(new T.Vector4()),scissorTest=r.getScissorTest(),currentViewport=r.getCurrentViewport(new T.Vector4()),ratio=r.getPixelRatio();
  const activeViewport=new T.Vector4().fromArray(gl.getParameter(gl.VIEWPORT)),activeScissor=new T.Vector4().fromArray(gl.getParameter(gl.SCISSOR_BOX)),activeScissorTest=gl.getParameter(gl.SCISSOR_TEST);
  const activeClear=Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE)||[]);
  if(activeClear.length!==4||!activeClear.every(Number.isFinite))throw unavailable('Entry physical clear color is unavailable');
  if(!Number.isFinite(ratio)||ratio<=0||![viewport,scissor,currentViewport,activeViewport,activeScissor].every(v=>v.toArray().every(Number.isFinite))||typeof scissorTest!=='boolean'||typeof activeScissorTest!=='boolean')throw unavailable('Entry renderer/physical viewport state is unavailable');
  const floor=viewport.clone().multiplyScalar(ratio).floor(),round=viewport.clone().multiplyScalar(ratio).round();
  const nullViewportMode=target?null:currentViewport.equals(floor)?'floor':currentViewport.equals(round)?'round':null;
  // Public r180 has no independent setter for an arbitrary null-target viewport cache.
  if(!target&&!nullViewportMode)throw unavailable('Null-target cached viewport matches neither public r180 logical floor nor setter round; refuse before work');
  return {target,face:r.getActiveCubeFace(),mip:r.getActiveMipmapLevel(),viewport,currentViewport,activeViewport,activeScissor,activeScissorTest,activeClear,nullViewportMode,
  targetProperties:target?{viewport:target.viewport.clone(),scissor:target.scissor.clone(),scissorTest:target.scissorTest}:null,
  scissor,scissorTest,
  color:r.getClearColor(new T.Color()).clone(),alpha:r.getClearAlpha(),autoClear:r.autoClear,
  autoClearColor:r.autoClearColor,autoClearDepth:r.autoClearDepth,autoClearStencil:r.autoClearStencil,
  tone:r.toneMapping,exposure:r.toneMappingExposure,output:r.outputColorSpace,xr:r.xr?.enabled};}
function restoreTarget(r,s){
  if(s.target){const t=s.target,p=s.targetProperties;
    try{t.viewport.copy(s.currentViewport);t.scissor.copy(s.activeScissor);t.scissorTest=s.activeScissorTest;r.setRenderTarget(t,s.face,s.mip);}
    finally{t.viewport.copy(p.viewport);t.scissor.copy(p.scissor);t.scissorTest=p.scissorTest;}
  }else{r.setRenderTarget(null,s.face,s.mip);if(s.nullViewportMode==='round')r.setViewport(s.viewport);}
  if(!r.getCurrentViewport(s.currentViewport.clone()).equals(s.currentViewport))throw Error('Renderer current viewport could not be restored through public APIs');
}
function restored(r,s){const errors=[];for(const action of [
  ()=>{r.autoClear=s.autoClear;r.autoClearColor=s.autoClearColor;r.autoClearDepth=s.autoClearDepth;r.autoClearStencil=s.autoClearStencil;
    r.toneMapping=s.tone;r.toneMappingExposure=s.exposure;r.outputColorSpace=s.output;if(r.xr)r.xr.enabled=s.xr;},
  ()=>r.setClearColor(s.color,s.alpha),
  ()=>r.setViewport(s.viewport),()=>r.setScissor(s.scissor),()=>r.setScissorTest(s.scissorTest),
  ()=>restoreTarget(r,s),
  ()=>r.state.viewport(s.activeViewport),()=>r.state.scissor(s.activeScissor),()=>r.state.setScissorTest(s.activeScissorTest),
  // Queried GL components already include premultiplication; restore cache-aware once.
  ()=>r.state.buffers.color.setClear(...s.activeClear,false)
])try{action();}catch(e){errors.push(e);}return errors;}
function guarded(T,r,work){const state=save(T,r);let value,primary=NONE;try{value=work();}catch(e){primary=e;}failure(primary,restored(r,state));return value;}
function support(T,r){
  if(T.REVISION!=='180'||T.ColorManagement?.workingColorSpace!==T.LinearSRGBColorSpace)throw unavailable('Pinned Three r180 linear-sRGB working primaries required');
  if(typeof r.getCurrentViewport!=='function'||typeof r.getPixelRatio!=='function'||!['viewport','scissor','setScissorTest'].every(k=>typeof r.state?.[k]==='function'))throw unavailable('Public r180 renderer/current WebGL state APIs required');
  const gl=r.getContext();
  if(typeof r.state?.buffers?.color?.setClear!=='function'||gl.COLOR_CLEAR_VALUE===undefined)throw unavailable('Public r180 cache-aware color clear state API required');
  if(!/WebGL 2/.test(String(gl.getParameter(gl.VERSION)))||typeof gl.getInternalformatParameter!=='function')throw unavailable('WebGL2 is required');
  if(!gl.getExtension('EXT_color_buffer_float'))throw unavailable('EXT_color_buffer_float is unavailable');
  const color=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES)||[]);
  const depth=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,gl.SAMPLES)||[]);
  if(!color.includes(SAMPLES)||!depth.includes(SAMPLES)||gl.getParameter(gl.MAX_SAMPLES)<SAMPLES)throw unavailable('RGBA16F and depth24 must both support exactly4 samples');
  return {webgl2:true,extension:'EXT_color_buffer_float',rgba16fSamples:color,depth24Samples:depth,
    multisampledRenderToTextureAdvertised:!!gl.getExtension('WEBGL_multisampled_render_to_texture'),
    resolve:'Pinned public Three r180 render completion manages one resolve before display sampling; native blit/extension mechanism is not independently observed'};
}
function estimate(w,h){const p=w*h;return {resolvedColorBytes:p*8,multisampleColorBytes:p*8*SAMPLES,
  multisampleDepthBytes:p*4*SAMPLES,resolvedDepthBudgetBytes:p*4,totalEstimatedBytes:p*60,
  basis:'RGBA16F8 bytes; depth24 budgeted4 bytes incl padding. Native driver/allocator overhead unmeasured.'};}
function triangle(T){const g=new T.BufferGeometry();try{g.setAttribute('position',new T.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));return g;}catch(e){failure(e,disposeAll([g]));}}
function makeDisplay(T){const owned=[];try{
  const geometry=triangle(T);owned.push(geometry);
  const material=new T.RawShaderMaterial({vertexShader:VERTEX,fragmentShader:DISPLAY,uniforms:{hdrScene:{value:null},bufferSize:{value:new T.Vector2()},toneMappingExposure:{value:1}},
    depthTest:false,depthWrite:false,transparent:false,blending:T.NoBlending,toneMapped:false});owned.push(material);
  const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;
  const scene=new T.Scene();scene.add(mesh);return {geometry,material,scene,camera:new T.Camera()};
}catch(e){failure(e,disposeAll(owned));}}
function engine(T,renderer){
  let closed=false,available=true,reason=null,target=null,display=null,lastError=null,lastTarget=null,lastDraw=null,readHook=null;
  const retirementErrors=[];
  const passes={scene:0,managedResolve:0,display:0};let supported=null;
  try{supported=support(T,renderer);}catch(e){available=false;reason=message(e);}
  const gl=renderer.getContext();
  function targetFor(width,height){
    if(target?.width===width&&target?.height===height)return target;
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
      width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||height>gl.getParameter(gl.MAX_TEXTURE_SIZE)||
      width>gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)||height>gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)||!Number.isSafeInteger(width*height*60))
      throw unavailable('Drawing-buffer HDR allocation dimensions are unsupported');
    let candidate;
    try{
      candidate=new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,format:T.RGBAFormat,internalFormat:'RGBA16F',
        colorSpace:T.LinearSRGBColorSpace,minFilter:T.NearestFilter,magFilter:T.NearestFilter,generateMipmaps:false,depthBuffer:true,stencilBuffer:false,samples:SAMPLES});
      candidate.texture.internalFormat='RGBA16F';candidate.texture.colorSpace=T.LinearSRGBColorSpace;candidate.samples=SAMPLES;candidate.resolveDepthBuffer=false;
      renderer.initRenderTarget(candidate);renderer.setRenderTarget(candidate);
      const framebufferStatus=gl.checkFramebufferStatus(gl.FRAMEBUFFER),samples=gl.getParameter(gl.SAMPLES),error=gl.getError();
      if(framebufferStatus!==gl.FRAMEBUFFER_COMPLETE||samples!==SAMPLES||error!==gl.NO_ERROR)throw unavailable('RGBA16F4 framebuffer unavailable (status '+framebufferStatus+', samples '+samples+', error '+error+')');
      lastTarget={width,height,internalFormat:'RGBA16F',type:'HalfFloatType',workingColorSpace:'srgb-linear',filter:'Nearest',samples,
        framebufferStatus,glError:error,depth:'DEPTH_COMPONENT24',storage:estimate(width,height)};
    }catch(e){const cleanup=disposeAll([candidate]);retirementErrors.push(...cleanup.map(message));available=false;reason=message(e);failure(e,cleanup);}
    const old=target;target=candidate;const errors=disposeAll([old]);if(errors.length){retirementErrors.push(...errors.map(message));available=false;reason='Old HDR target retirement failed';failure(NONE,errors);}return target;
  }
  function renderTo({scene,camera,beforeRender},options={}){
    if(closed)throw Error('HDR presentation disposed');if(!available)throw unavailable(reason);
    return guarded(T,renderer,()=>{
      const size=options.size||renderer.getDrawingBufferSize(new T.Vector2()),width=size.x,height=size.y;
      const hdr=targetFor(width,height);if(!display)display=makeDisplay(T);
      renderer.toneMapping=T.NoToneMapping;renderer.toneMappingExposure=1;renderer.outputColorSpace=T.LinearSRGBColorSpace;
      if(renderer.xr)renderer.xr.enabled=false;renderer.autoClear=false;renderer.setRenderTarget(hdr);renderer.setScissorTest(false);
      if(options.synthetic)renderer.setClearColor(0,0);
      else renderer.setClearColor(renderer.getClearColor(new T.Color()),renderer.getClearAlpha());
      renderer.clear(true,true,false);beforeRender?.();
      renderer.setRenderTarget(hdr);renderer.render(scene,camera);passes.scene++;passes.managedResolve++;
      options.beforeDisplay?.(hdr); // Actual HDR readback precedes any display/byte read in the isolated proof.
      display.material.uniforms.hdrScene.value=hdr.texture;display.material.uniforms.bufferSize.value.set(width,height);
      renderer.setRenderTarget(options.output||null);renderer.setScissorTest(false);
      if(!options.output){const logical=renderer.getSize(new T.Vector2());renderer.setViewport(0,0,logical.x,logical.y);}
      renderer.outputColorSpace=T.SRGBColorSpace;renderer.render(display.scene,display.camera);passes.display++;
      options.afterDisplay?.();
      const error=gl.getError();if(error!==gl.NO_ERROR)throw Error('HDR presentation GL error '+error);
      return copy(lastTarget);
    });
  }
  function diagnostics(){return {contract:LINEAR_HDR_PRESENTATION_CONTRACT,available:available&&!closed,reason:closed?'Disposed':reason,
    toneMapping:'Three r180 NeutralToneMapping',exposure:1,finalOETF:'sRGBTransferOETF once',sourceEncoding:'linear working RGB',
    sampling:copy(supported),target:target?copy(lastTarget):null,passes:copy(passes),lastDraw:copy(lastDraw),
    costRoute:lastDraw?.complete?{managedResolve:true,refreshedClear:true,premultipliedAssociatedColor:true,scenePassesPerDraw:1,displayPassesPerDraw:1,restorationIncluded:true}:null,
    resources:{targets:target?1:0,displayMaterials:display?1:0,displayGeometries:display?1:0,
      estimatedBytes:target?lastTarget.storage.totalEstimatedBytes:0,nativeOverheadMeasured:false,retirementComplete:closed&&!retirementErrors.length},retirementErrors:retirementErrors.slice(0,8),lastError,disposed:closed};}
  function render(input){lastDraw=null;try{const result=renderTo(input,readHook||{});lastDraw={complete:true,restored:true,
      outerRestored:{toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,outputColorSpace:renderer.outputColorSpace,target:renderer.getRenderTarget()?'non-null':'default'},
      scope:'Public synchronous managed resolve/display/restoration returned; not compositor/encoder completion or a native residency measurement'};return result;
    }catch(e){lastError=message(e);if(e?.code==='LINEAR_HDR_UNAVAILABLE'){available=false;reason=lastError;}throw e;}}
  function dispose(){if(closed)return;closed=true;const old=[target,display?.material,display?.geometry];target=null;
    if(display)display.material.uniforms.hdrScene.value=null;display=null;const errors=disposeAll(old);retirementErrors.push(...errors.map(message));failure(NONE,errors);}
  return {render,renderTo,diagnostics,dispose,withNativeReadback(hooks,draw){if(closed||readHook)throw Error('HDR readback is already owned or disposed');let scene=0,display=0;readHook={beforeDisplay:target=>{scene++;hooks.beforeDisplay(target);},afterDisplay:()=>{display++;hooks.afterDisplay();}};try{const value=draw();if(scene!==1||display!==1)throw Error('One normal HDR draw required');return value;}finally{readHook=null;}}};
}
export function createLinearHdrPresentation(T,renderer){const p=engine(T,renderer);return Object.freeze({render:p.render,diagnostics:p.diagnostics,dispose:p.dispose,withNativeTransportReadback:p.withNativeReadback});}
// Independent double reference of Three r180 Neutral (Three.js MIT), for the tiny proof only.
export function neutralSrgbReference(input){
  if(!Array.isArray(input)||input.length!==3||input.some(x=>!Number.isFinite(x)||x<0))throw TypeError('Finite nonnegative linear RGB required');
  const c=[...input],x=Math.min(...c),offset=x<.08?x-6.25*x*x:.04;for(let i=0;i<3;i++)c[i]-=offset;
  const peak=Math.max(...c),start=.76,d=.24;if(peak>=start){const n=1-d*d/(peak+d-start),g=1-1/(.15*(peak-n)+1);
    for(let i=0;i<3;i++)c[i]=(c[i]*n/peak)*(1-g)+n*g;}
  return c.map(v=>v<=.0031308?12.92*v:1.055*Math.pow(v,.41666)-.055);
}
function half(word){const sign=word&32768?-1:1,e=(word>>>10)&31,m=word&1023;return sign*(e===0?m*2**-24:e===31?m?NaN:Infinity:(1+m/1024)*2**(e-15));}
/** Source for a later explicit paused native proof. Never called by normal render/boot. */
export function runLinearHdrTransferProof(T,renderer){
  const p=engine(T,renderer),owned=[],result={kind:'common-linear-hdr-transfer-proof-v1',contract:LINEAR_HDR_PRESENTATION_CONTRACT,status:'unavailable',
    expected:{linearRGBA:[1.5,.5,.25,0],hdrTolerance:.003,displayRgb:neutralSrgbReference([1.5,.5,.25]),displayByteTolerance:2},
    hdrReadback:null,displayReadback:null,errors:[],scope:'Two1pixel cases: synthetic A0 and normal nonblack clear; no field/scene capture, radiometric calibration or GPU cost result'};
  try{
    if(!p.diagnostics().available)throw unavailable(p.diagnostics().reason);
    const scene=new T.Scene(),camera=new T.Camera(),geometry=triangle(T);owned.push(geometry);
    for(let i=0;i<2;i++){
      const material=new T.RawShaderMaterial({vertexShader:VERTEX,fragmentShader:'precision highp float;\nvoid main(){gl_FragColor=vec4(.75,.25,.125,0.);}',
        transparent:true,depthTest:false,depthWrite:false,toneMapped:false,premultipliedAlpha:true,blending:T.CustomBlending,
        blendEquation:T.AddEquation,blendEquationAlpha:T.AddEquation,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneMinusSrcAlphaFactor});
      owned.push(material);const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
    }
    const output=new T.WebGLRenderTarget(1,1,{type:T.UnsignedByteType,format:T.RGBAFormat,minFilter:T.NearestFilter,magFilter:T.NearestFilter,
      depthBuffer:false,stencilBuffer:false,samples:0,colorSpace:T.NoColorSpace});owned.push(output);
    guarded(T,renderer,()=>p.renderTo({scene,camera},{size:{x:1,y:1},output,synthetic:true,beforeDisplay:hdr=>{
      const raw=new Uint16Array(4);raw.fill(0x7e00);renderer.readRenderTargetPixels(hdr,0,0,1,1,raw);
      const values=Array.from(raw,half),glError=renderer.getContext().getError();result.hdrReadback={format:'RGBA16F',readType:'HALF_FLOAT',halfWords:Array.from(raw),floatValues:values.map(v=>Number.isFinite(v)?v:String(v)),poisonHalfWord:0x7e00,untouched:raw.every(x=>x===0x7e00),glError,beforeDisplay:true};
      if(glError!==renderer.getContext().NO_ERROR||values.some((v,i)=>!Number.isFinite(v)||Math.abs(v-result.expected.linearRGBA[i])>result.expected.hdrTolerance))throw Error('Actual HDR accumulation differs; display proof not attempted');
    }}));
    const bytes=new Uint8Array(4);bytes.fill(0xa5);let framebufferStatus,glError;
    guarded(T,renderer,()=>{renderer.setRenderTarget(output);framebufferStatus=renderer.getContext().checkFramebufferStatus(renderer.getContext().FRAMEBUFFER);renderer.readRenderTargetPixels(output,0,0,1,1,bytes);glError=renderer.getContext().getError();});
    result.displayReadback={format:'RGBA8',framebufferStatus,glError,poisonByte:0xa5,untouched:bytes.every(x=>x===0xa5),bytes:Array.from(bytes),expectedRgbBytes:result.expected.displayRgb.map(v=>Math.round(v*255))};
    if(framebufferStatus!==renderer.getContext().FRAMEBUFFER_COMPLETE||glError!==renderer.getContext().NO_ERROR||bytes[3]!==255||result.displayReadback.expectedRgbBytes.some((v,i)=>Math.abs(v-bytes[i])>result.expected.displayByteTolerance))throw Error('Actual final Neutral/OETF transfer differs');
    // Additional normal-route case: prime the default canvas's encoded nonblack
    // clear, then use the same HDR target/display without the synthetic override.
    const clearLinear=new T.Color(0x35281e).toArray(),clearDisplay=neutralSrgbReference(clearLinear);
    const normal=result.nonblackClear={kind:'normal-nonblack-linear-clear-v1',status:'running',normalPath:true,syntheticOverride:false,
      cpuExpectation:{label:'CPU source expectation, not GPU readback',inputHex:'0x35281e',inputColorSpace:'sRGB',alpha:1,
        linearRGBA:[...clearLinear,1],hdrTolerance:.003,displayRgb:clearDisplay,displayByteTolerance:2},
      hdrReadback:null,displayReadback:null,errors:[]};
    guarded(T,renderer,()=>{
      renderer.setRenderTarget(null);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0x35281e,1);
      p.renderTo({scene:new T.Scene(),camera},{size:{x:1,y:1},output,beforeDisplay:hdr=>{
        const raw=new Uint16Array(4);raw.fill(0x7e00);renderer.readRenderTargetPixels(hdr,0,0,1,1,raw);
        const values=Array.from(raw,half),glError=renderer.getContext().getError();
        normal.hdrReadback={format:'RGBA16F',readType:'HALF_FLOAT',halfWords:Array.from(raw),floatValues:values.map(v=>Number.isFinite(v)?v:String(v)),
          poisonHalfWord:0x7e00,untouched:raw.every(x=>x===0x7e00),glError,beforeDisplay:true};
        if(glError!==renderer.getContext().NO_ERROR||values.some((v,i)=>!Number.isFinite(v)||Math.abs(v-normal.cpuExpectation.linearRGBA[i])>normal.cpuExpectation.hdrTolerance))throw Error('Actual normal nonblack HDR clear differs; display proof not attempted');
      }});
    });
    const clearBytes=new Uint8Array(4);clearBytes.fill(0xa5);
    guarded(T,renderer,()=>{renderer.setRenderTarget(output);framebufferStatus=renderer.getContext().checkFramebufferStatus(renderer.getContext().FRAMEBUFFER);renderer.readRenderTargetPixels(output,0,0,1,1,clearBytes);glError=renderer.getContext().getError();});
    normal.displayReadback={format:'RGBA8',framebufferStatus,glError,poisonByte:0xa5,untouched:clearBytes.every(x=>x===0xa5),bytes:Array.from(clearBytes),expectedRgbBytes:clearDisplay.map(v=>Math.round(v*255))};
    if(framebufferStatus!==renderer.getContext().FRAMEBUFFER_COMPLETE||glError!==renderer.getContext().NO_ERROR||clearBytes[3]!==255||normal.displayReadback.expectedRgbBytes.some((v,i)=>Math.abs(v-clearBytes[i])>normal.cpuExpectation.displayByteTolerance))throw Error('Actual normal nonblack Neutral/OETF transfer differs');
    normal.status='pass';result.status='pass';
  }catch(e){result.errors.push(message(e));if(result.nonblackClear?.status==='running'){result.nonblackClear.status='failed';result.nonblackClear.errors.push(message(e));}}
  finally{result.presentation=p.diagnostics();try{p.dispose();}catch(e){result.errors.push(message(e));}result.errors.push(...disposeAll(owned).map(message));
    result.afterCleanup=p.diagnostics().resources;if(result.errors.length)result.status=result.hdrReadback?'failed':'unavailable';}
  return result;
}

// Fixed034 native witness. These complete source literals are the reviewed control,
// not an effect import or payload. See docs/engineering/native-transport-witness.md.
export const NATIVE_TRANSPORT_FRAGMENT="\n    precision highp sampler3D;\n    uniform sampler3D field0,field1;\n    uniform sampler2D nativeField,opaqueDepth;\n    uniform vec3 scalarOrigin,voxelSize,fieldResolution,patchTranslation,cameraPositionWorld,cameraForwardWorld,playerPosition;\n    uniform vec2 nativeGrid,opaqueDepthSize;\n    uniform mat4 opaqueViewProjection;\n    uniform float temporalMix,reactionGain,densityGain,contactHeight,fieldEnabled,nativeCellSize,opaqueDepthEnabled,orthographic,playerRadius;\n    uniform int planeCount;uniform vec4 planes[29];uniform vec2 slab;\n    varying vec3 worldPosition;\n    vec3 toScalarWorld(vec3 p){return vec3(p.x-patchTranslation.x,-(p.z-patchTranslation.z),p.y-patchTranslation.y);}\n    vec3 toNativeWorld(vec3 p){return vec3(p.x+patchTranslation.x,p.z+patchTranslation.y,-p.y+patchTranslation.z);}\n    vec4 voxel(sampler3D data,ivec3 cell){if(any(lessThan(cell,ivec3(0)))||any(greaterThanEqual(cell,ivec3(fieldResolution))))return vec4(0.);return texelFetch(data,cell,0);}\n    vec3 cornerEmission(vec3 rawCorner){\n      float F=rawCorner.z,colorHeat=clamp((rawCorner.y-1.5)/1.5,0.,1.);\n      vec3 palette=mix(vec3(1.30,.19,.018),vec3(1.65,.78,.19),smoothstep(.20,.82,colorHeat));\n      palette=mix(palette,vec3(1.65,1.45,.95),pow(colorHeat,8.)*smoothstep(.70,.97,F)*.18);\n      return F*palette;\n    }\n    vec3 tri(sampler3D data,vec3 p,out vec3 vector){\n      vec3 q=(p-scalarOrigin)/voxelSize;ivec3 i=ivec3(floor(q));vec3 f=fract(q);\n      vec3 c000=voxel(data,i).rgb;\n      vec3 c100=voxel(data,i+ivec3(1,0,0)).rgb;\n      vec3 c010=voxel(data,i+ivec3(0,1,0)).rgb;\n      vec3 c110=voxel(data,i+ivec3(1,1,0)).rgb;\n      vec3 c001=voxel(data,i+ivec3(0,0,1)).rgb;\n      vec3 c101=voxel(data,i+ivec3(1,0,1)).rgb;\n      vec3 c011=voxel(data,i+ivec3(0,1,1)).rgb;\n      vec3 c111=voxel(data,i+ivec3(1,1,1)).rgb;\n      vector=mix(mix(mix(cornerEmission(c000),cornerEmission(c100),f.x),mix(cornerEmission(c010),cornerEmission(c110),f.x),f.y),mix(mix(cornerEmission(c001),cornerEmission(c101),f.x),mix(cornerEmission(c011),cornerEmission(c111),f.x),f.y),f.z);\n      return mix(mix(mix(c000,c100,f.x),mix(c010,c110,f.x),f.y),mix(mix(c001,c101,f.x),mix(c011,c111,f.x),f.y),f.z);\n    }\n    float nativeA(vec2 xz){\n      if(fieldEnabled<.5)return 0.;vec2 cell=floor(xz/nativeCellSize);if(any(lessThan(cell,vec2(0.)))||any(greaterThanEqual(cell,nativeGrid)))return 0.;return texture2D(nativeField,(cell+.5)/nativeGrid).a;\n    }\n    float livePatchA(){return min(min(nativeA(vec2(5.25,8.25)),nativeA(vec2(5.75,8.25))),min(nativeA(vec2(5.25,8.75)),nativeA(vec2(5.75,8.75))));}\n    bool depthStops(vec3 p,float sceneDepth){if(opaqueDepthEnabled<.5)return false;vec4 q=opaqueViewProjection*vec4(p,1.);if(q.w<=0.)return true;return q.z/q.w*.5+.5>sceneDepth+2.e-6;}\n    bool clipPlane(vec3 n,float c,vec3 origin,vec3 direction,inout float entry,inout float exit){\n      float den=dot(n,direction),num=c-dot(n,origin);if(abs(den)<1.e-7){return num>=0.;}float t=num/den;if(den>0.)exit=min(exit,t);else entry=max(entry,t);return exit>entry;\n    }\n\n    vec3 eaDisplaySource(vec3 c){return c;}\n    vec3 eaEmission(float r,float ks,vec3 fire,vec3 soot){return (6.*r/1.)*eaDisplaySource(fire)+ks*eaDisplaySource(soot);}\n    uniform float eaFlameExtinctionCoefficient;\n    float eaExtinction(float ks,float r){return ks+eaFlameExtinctionCoefficient*r;}\n    vec2 eaSegment(float k,float ds){\n      float tau=k*ds,t=exp(-tau);\n      // (1-exp(-tau))/tau =1-tau/2+tau^2/6-tau^3/24+O(tau^4).\n      // The branch includes k0, retaining finite pure emission q=ds.\n      float q=tau<1.e-3?ds*(1.-tau*.5+tau*tau/6.-tau*tau*tau/24.):(1.-t)/k;\n      return vec2(t,q);\n    }\n    void eaAdvance(inout vec3 C,inout float T,vec3 j,float k,float ds){vec2 segment=eaSegment(k,ds);C+=T*segment.y*j;T*=segment.x;}\n    vec4 eaAssociated(vec3 C,float T,float legibility){return vec4(legibility*C,legibility*(1.-T));}\n  \n    void main(){\n      vec3 worldDirection=orthographic>.5?normalize(cameraForwardWorld):normalize(worldPosition-cameraPositionWorld);\n      vec3 worldOrigin=orthographic>.5?worldPosition:cameraPositionWorld;\n      vec3 origin=toScalarWorld(worldOrigin),direction=vec3(worldDirection.x,-worldDirection.z,worldDirection.y);\n      float entry=0.,exit=1.e6;\n      for(int j=0;j<29;j++){if(j>=planeCount)break;if(!clipPlane(vec3(planes[j].xy,0.),planes[j].w,origin,direction,entry,exit))discard;}\n      if(!clipPlane(vec3(0,0,-1),-slab.x,origin,direction,entry,exit)||!clipPlane(vec3(0,0,1),slab.y,origin,direction,entry,exit))discard;\n      float marchStep=min(voxelSize.x,min(voxelSize.y,voxelSize.z))*.5;\n      int steps=int(ceil((exit-entry)/marchStep));if(steps<1||steps>128)discard;float distanceStep=(exit-entry)/float(steps);\n      float sceneDepth=opaqueDepthEnabled>.5?texture2D(opaqueDepth,gl_FragCoord.xy/opaqueDepthSize).r:1.;\n      float transmittance=1.;vec3 emission=vec3(0.);float sourceA=livePatchA();\n      for(int j=0;j<128;j++){\n        if(j>=steps)break;vec3 p=origin+direction*(entry+(float(j)+.5)*distanceStep),native=toNativeWorld(p);if(depthStops(native,sceneDepth))break;\n        vec3 vector0,vector1;\n        vec3 raw0=tri(field0,p,vector0),raw1=tri(field1,p,vector1);\n        vec3 value=max(vec3(0.),mix(raw0,raw1,temporalMix));\n        vec3 localEmissionVector=mix(vector0,vector1,temporalMix);\n        float reacting=value.z*reactionGain*sourceA;\n        float emissionGate=reactionGain*sourceA;\n        float edge=min(min(native.x-5.,6.-native.x),min(native.z-8.,9.-native.z));\n        float baseAllowed=nativeA(native.xz)*smoothstep(0.,max(voxelSize.x,voxelSize.y),max(0.,edge));\n        float contactRelease=smoothstep(contactHeight,contactHeight+2.*max(voxelSize.x,voxelSize.y),p.z);\n        reacting*=mix(baseAllowed,1.,contactRelease);\n        emissionGate*=mix(baseAllowed,1.,contactRelease);\n        // Upper reaction is the architect-approved source/pair support, not new\n        // ground fuel. Actual source burnout multiplies ALL heights by zero.\n        float heat=clamp(value.y/3.,0.,1.);float flameSigma=reacting*6.;\n        float smoke=value.x*densityGain*mix(1.,.18,clamp(value.z*heat,0.,1.));float smokeSigma=smoke*1.8;\n        // Absorption may be zero while emission is nonzero.\n        // Full corner emission vector was filtered before the existing masks.\n        vec3 soot=mix(vec3(.045,.037,.030),vec3(.22,.205,.18),clamp(p.z/4.+.3,0.,1.));\n        eaAdvance(emission,transmittance,eaEmission(emissionGate,smokeSigma,localEmissionVector,soot),eaExtinction(smokeSigma,reacting),distanceStep);\n      }\n      float legibility=mix(.48,1.,smoothstep(playerRadius+.15,playerRadius+.9,length(worldPosition.xz-playerPosition.xz)));\n      vec4 associated=eaAssociated(emission,transmittance,legibility);\n      if(associated.a==0.&&all(equal(associated.rgb,vec3(0.))))discard;\n      gl_FragColor=associated;\n    }\n  ";
export const NATIVE_TRANSPORT_VERTEX="\n    varying vec3 worldPosition;\n    void main(){worldPosition=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(worldPosition,1.);}\n  ";
export const NATIVE_TRANSPORT_PIXELS=Object.freeze({
  isometric:Object.freeze([[588.5,463.5],[608.5,445.5],[608.5,415.5],[628.5,385.5]].map(Object.freeze)),
  oblique:Object.freeze([[588.5,478.5],[608.5,454.5],[608.5,416.5],[628.5,378.5]].map(Object.freeze))
});
const transportErrorList=e=>e instanceof AggregateError?e.errors.flatMap(transportErrorList).slice(0,16):[message(e).slice(0,1024)];
const transportNeed=(v,m)=>{if(!v){const e=Error(m);e.code='NATIVE_TRANSPORT_LOCKED';throw e;}};
export function nativeTransportProjection(fragment,kind){
  transportNeed(fragment===NATIVE_TRANSPORT_FRAGMENT,'Complete034 transport fragment changed');
  let text=fragment;const edits=[];
  const change=(from,to)=>{transportNeed(text.split(from).length===2,'Projection source seam changed');text=text.replace(from,to);edits.push([from,to]);};
  if(kind==='fire')change('return (6.*r/1.)*eaDisplaySource(fire)+ks*eaDisplaySource(soot);','return (6.*r/1.)*eaDisplaySource(fire);');
  else if(kind==='telemetry'){
    change('float transmittance=1.;vec3 emission=vec3(0.);float sourceA=livePatchA();','float transmittance=1.;vec3 emission=vec3(0.);float sourceA=livePatchA();float witnessAdvances=0.;float witnessDepthBreak=0.;');
    change('if(depthStops(native,sceneDepth))break;','if(depthStops(native,sceneDepth)){witnessDepthBreak=1.;break;}');
    const advance='eaAdvance(emission,transmittance,eaEmission(emissionGate,smokeSigma,localEmissionVector,soot),eaExtinction(smokeSigma,reacting),distanceStep);';
    change(advance,advance+'witnessAdvances+=1.;');
    change('gl_FragColor=associated;','gl_FragColor=vec4(associated.a*witnessDepthBreak,associated.a*(witnessAdvances/128.),associated.a*sceneDepth,associated.a);');
  }else transportNeed(false,'Unknown fixed transport projection');
  let inverse=text;for(const[from,to]of [...edits].reverse())inverse=inverse.replace(to,from);
  transportNeed(inverse===fragment,'Complete projection inverse failed');return text;
}
const TRANSPORT_SHARED=['scalarOrigin','voxelSize','fieldResolution','patchTranslation','cameraPositionWorld','cameraForwardWorld','playerPosition','nativeGrid','opaqueDepthSize','opaqueViewProjection','temporalMix','reactionGain','densityGain','contactHeight','fieldEnabled','nativeCellSize','opaqueDepthEnabled','orthographic','playerRadius'];
function transportArray(v){const a=v?.toArray?v.toArray():v;transportNeed(Array.isArray(a)&&a.length<=16&&a.every(Number.isFinite),'Finite bound vector/matrix required');return [...a];}
function textureBinding(t){
  transportNeed(t?.isTexture&&typeof t.uuid==='string','Bound texture identity required');
  const image=t.image||{};
  return {uuid:t.uuid,version:t.version,sourceVersion:t.source?.version??null,width:image.width??null,height:image.height??null,depth:image.depth??null,type:t.type,format:t.format,internalFormat:t.internalFormat??null,minFilter:t.minFilter,magFilter:t.magFilter,wrapS:t.wrapS,wrapT:t.wrapT,wrapR:t.wrapR??null,flipY:t.flipY,unpackAlignment:t.unpackAlignment,colorSpace:t.colorSpace};
}
export function nativeTransportBindings(T,lease,camera){
  transportNeed(lease?.root&&lease.frame?.tick===61&&lease.frame.worldTime===1.016666666666668&&lease.frame.playerTime===1.016666666666668,'Prepared61 transport frame required');
  const source=lease.diagnostics?.source;
  transportNeed(source?.phase==='burning'&&source.sample0===30&&source.sample1===31&&source.age===1.0000000000000013&&source.mix===3.907985046680551e-14&&source.reactionGain===1&&source.densityGain===1,'Prepared source31/32 clock changed');
  transportNeed(lease.diagnostics.geometry?.pairIndex===30&&lease.diagnostics.geometry.vertices===1334&&lease.diagnostics.geometry.triangles===2520,'Prepared geometry metadata changed');
  transportNeed(camera?.isOrthographicCamera&&lease.root.visible,'Visible orthographic reference required');
  const meshes=[],materials=new Set(),refs=[lease.root],records=[],lights=[];let shared=null;
  lease.root.traverse(node=>{if(node.isLight)lights.push(node);if(!node.isMesh)return;const m=node.material;
    transportNeed(m?.isShaderMaterial&&!Array.isArray(m)&&!materials.has(m)&&m.fragmentShader===NATIVE_TRANSPORT_FRAGMENT&&m.vertexShader===NATIVE_TRANSPORT_VERTEX,'Complete distinct034 materials required');
    transportNeed(m.side===T.FrontSide&&m.depthTest===true&&m.depthWrite===false&&m.depthFunc===T.LessEqualDepth&&m.alphaToCoverage===false&&m.visible===true&&m.transparent===true&&m.premultipliedAlpha===true&&m.toneMapped===false&&m.colorWrite===true&&m.blending===T.CustomBlending&&m.blendSrc===T.OneFactor&&m.blendDst===T.OneMinusSrcAlphaFactor&&m.blendSrcAlpha===T.OneFactor&&m.blendDstAlpha===T.OneMinusSrcAlphaFactor&&m.blendEquation===T.AddEquation&&m.blendEquationAlpha===T.AddEquation,'034 render state changed');
    transportNeed(!m.wireframe&&!m.polygonOffset&&!m.stencilWrite&&m.alphaTest===0&&(!m.clippingPlanes||m.clippingPlanes.length===0)&&Object.keys(m.defines||{}).length===0,'Unsupported transport material override');
    const u=m.uniforms;transportNeed(u?.eaFlameExtinctionCoefficient?.value===6,'Fixed total extinction6 required');
    for(const name of [...TRANSPORT_SHARED,'field0','field1','nativeField','opaqueDepth','planeCount','planes','slab','eaFlameExtinctionCoefficient']){transportNeed(u[name]&&Object.hasOwn(u[name],'value'),'Missing actual uniform '+name);refs.push(u[name]);}
    if(!shared){shared={};for(const name of TRANSPORT_SHARED){const v=u[name].value;shared[name]=typeof v==='number'?v:transportArray(v);transportNeed(typeof v!=='number'||Number.isFinite(v),'Finite actual scalar required');}for(const name of ['field0','field1','nativeField','opaqueDepth'])shared[name]=textureBinding(u[name].value);}
    else for(const name of [...TRANSPORT_SHARED,'field0','field1','nativeField','opaqueDepth'])transportNeed(u[name]===meshes[0].material.uniforms[name],'Expected shared uniform identity changed');
    refs.push(node,node.geometry,m,...['field0','field1','nativeField','opaqueDepth'].map(k=>u[k].value));materials.add(m);meshes.push(node);
    const geometry=node.geometry,position=geometry?.getAttribute?.('position');transportNeed(geometry&&position&&geometry.index,'Prepared proxy buffers required');
    const record={uuid:node.uuid,visible:node.visible,material:m.uuid,materialVersion:m.version,materialState:{depthFunc:m.depthFunc,alphaToCoverage:m.alphaToCoverage,visible:m.visible},geometry:geometry.uuid,positionVersion:position.version,indexVersion:geometry.index.version,drawRange:{...geometry.drawRange},renderOrder:node.renderOrder,matrixWorld:transportArray(node.matrixWorld)};
    if(node.visible){const count=u.planeCount.value;transportNeed(Number.isInteger(count)&&count>=3&&count<=29&&u.planes.value.length===29,'Bounded actual planes required');record.planeCount=count;record.planes=u.planes.value.slice(0,count).map(transportArray);record.slab=transportArray(u.slab.value);transportNeed(record.slab[0]>=0&&record.slab[1]>record.slab[0],'Floor-clipped slab required');}
    records.push(record);
  });
  transportNeed(lights.length===1&&lights[0].isPointLight&&lights[0].parent===lease.root&&lights[0].intensity===0&&lights[0].color.getHex()===0xff8d35&&lights[0].position.x===5.5&&lights[0].position.y===.3&&lights[0].position.z===8.5&&lights[0].distance===4.5&&lights[0].decay===2,'Exact zero-spill owned light required');refs.push(lights[0]);
  transportNeed(meshes.length===92&&records.filter(x=>x.visible).length===37,'Exact92 material capacity/37 visible proxies required');
  transportNeed(shared.field0.uuid!==shared.field1.uuid&&shared.field0.width===48&&shared.field0.height===48&&shared.field0.depth===96&&shared.field1.width===48&&shared.field1.height===48&&shared.field1.depth===96,'Current two field texture bindings required');
  const frame=lease.frame,u=meshes[0].material.uniforms,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  transportNeed(shared.temporalMix===source.mix&&shared.reactionGain===source.reactionGain&&shared.densityGain===source.densityGain,'Source gain/mix binding is stale');
  transportNeed(frame.camera?.kind==='orthographic'&&same(frame.camera.matrixWorld,transportArray(camera.matrixWorld))&&same(frame.camera.projectionMatrix,transportArray(camera.projectionMatrix)),'Prepared camera binding is stale');
  transportNeed(same(shared.playerPosition,[frame.player.x,frame.player.elevation||0,frame.player.y])&&shared.playerRadius===frame.player.radius,'Prepared player binding is stale');
  if(shared.fieldEnabled>=.5)transportNeed(u.nativeField.value===frame.fieldUniforms?.field?.value&&same(shared.nativeGrid,[frame.fieldUniforms.grid.value.x,frame.fieldUniforms.grid.value.y])&&shared.nativeCellSize===frame.fieldUniforms.cellSize.value,'Prepared native-field binding is stale');
  if(shared.opaqueDepthEnabled>=.5)transportNeed(frame.opaqueDepth?.valid===true&&frame.opaqueDepth.convention==='webgl-depth-0-1'&&u.opaqueDepth.value===frame.opaqueDepth.texture&&same(shared.opaqueDepthSize,[frame.opaqueDepth.width,frame.opaqueDepth.height])&&same(shared.opaqueViewProjection,frame.opaqueDepth.viewProjectionMatrix),'Prepared depth binding is stale');
  const record={source:copy(source),ownedLight:{uuid:lights[0].uuid,intensity:lights[0].intensity},geometry:copy(lease.diagnostics.geometry),frame:{tick:lease.frame.tick,worldTime:lease.frame.worldTime,playerTime:lease.frame.playerTime,player:copy(lease.frame.player)},camera:{matrixWorld:transportArray(camera.matrixWorld),matrixWorldInverse:transportArray(camera.matrixWorldInverse),projectionMatrix:transportArray(camera.projectionMatrix),projectionMatrixInverse:transportArray(camera.projectionMatrixInverse)},shared,proxies:records};
  return {record,refs,meshes};
}
function sameTransportBinding(before,after){transportNeed(before.refs.length===after.refs.length&&before.refs.every((r,i)=>r===after.refs[i])&&JSON.stringify(before.record)===JSON.stringify(after.record),'Borrowed source/camera/player/texture/material binding changed');}
function transportMaterial(T,source,fragment){
  const material=new T.ShaderMaterial({vertexShader:source.vertexShader,fragmentShader:fragment,uniforms:{...source.uniforms}});
  for(const key of ['transparent','side','depthTest','depthWrite','depthFunc','alphaToCoverage','visible','colorWrite','blending','blendSrc','blendDst','blendSrcAlpha','blendDstAlpha','blendEquation','blendEquationAlpha','premultipliedAlpha','toneMapped'])material[key]=source[key];
  return material;
}
function halfRadius(word){const v=half(word),e=(word>>>10)&31;return Number.isFinite(v)?Math.max(2**-24,e===0?2**-24:2**(e-25)):Infinity;}
export function assertNativeTransportReportBudget(report){
  const bytes=new TextEncoder().encode(JSON.stringify(report)+'\n').length;
  if(bytes>262144){const error=new RangeError('Native transport report compact UTF-8 JSON+LF exceeds256KiB: '+bytes+' bytes; no report returned');error.code='NATIVE_TRANSPORT_REPORT_TOO_LARGE';error.bytes=bytes;error.maximumBytes=262144;throw error;}
  return bytes;
}
export function runNativeTransportWitness(T,renderer,{scene,camera,borrow,normalDraw,context,checkpoint=()=>{}}){
  // Precondition source inspection occurs before any renderer/target allocation.
  const expected=borrow(lease=>{const bound=nativeTransportBindings(T,lease,camera);transportNeed(!scene.overrideMaterial,'Scene override material is unsupported');const selected=new Set(bound.meshes),materials=new Set(bound.meshes.map(x=>x.material));scene.traverse(node=>{if(!selected.has(node))for(const m of [node.material].flat().filter(Boolean))transportNeed(!materials.has(m),'CFD/world material sharing is unsupported');});return bound.record;});
  transportNeed(new TextEncoder().encode(JSON.stringify(context)).length+new TextEncoder().encode(JSON.stringify(expected)).length+32768+1<=262144,'Complete context/bindings cannot fit bounded report');
  transportNeed(renderer.getPixelRatio()===1&&renderer.getDrawingBufferSize(new T.Vector2()).equals(new T.Vector2(1280,800)),'Original1280x800/DPR1 required');
  const top=NATIVE_TRANSPORT_PIXELS[context.configuration.view];transportNeed(top,'Fixed original camera pose required');
  const pixels=top.map(([x,y])=>({topLeftCentre:[x,y],readPixels:[Math.floor(x),799-Math.floor(y)],shaderCentre:[x,800-y]}));
  const report={kind:'fire-native-transport-witness-v1',version:1,status:'failed',errors:[],configuration:copy(context.configuration),frameIndex:context.frameIndex,clocks:copy(context.clocks),sourceIdentities:copy(context.sourceIdentities),bindings:expected,observations:{},targets:[],limits:{maximumRendererSubmissions:8,cooperativeMs:5000,maximumJsonBytes:262144,temporaryTargets:2,configuredTemporaryBytes:61440032,hardGpuCancellation:false},scope:'Fixed current-camera diagnostic only; unadmitted raw97 study. Not quality, radiometry, field-upload proof or a timing receipt.'};
  const owned=[],retiredInsideLease=new Set(),leaseRetirementErrors=[],background=scene.background,render=renderer.render,shadowAuto=renderer.shadowMap?.autoUpdate;
  let initial=null,activeLease=null,materialReferences=null,worldMaterials=null;
  let calls=0,attempts=0,normalReadCount=0,displayReadCount=0,primary=NONE,originalState,renderWrapped=false;
  const start=performance.now(),check=()=>{checkpoint();if(performance.now()-start>5000)throw Error('Native witness cooperative five-second limit');};
  const checkBinding=()=>{transportNeed(activeLease,'Synchronous source lease required');sameTransportBinding(initial,nativeTransportBindings(T,activeLease,camera));};
  function halfRead(target,stage){const rows=[];report.observations[stage]=rows;for(const pixel of pixels){check();const raw=new Uint16Array(4);raw.fill(0x7e00);renderer.readRenderTargetPixels(target,...pixel.readPixels,1,1,raw);check();const values=Array.from(raw,half),error=renderer.getContext().getError();const row={pixel,halfWords:Array.from(raw),values:values.map(x=>Number.isFinite(x)?x:String(x)),glError:error};rows.push(row);if(raw.every(x=>x===0x7e00)||values.some(x=>!Number.isFinite(x))||error!==0)throw unavailable('RGBA16F readback unavailable/nonfinite/GL error');}return rows;}
  function makeTarget(width,height,aux=false){check();const target=new T.WebGLRenderTarget(width,height,{type:aux?T.FloatType:T.HalfFloatType,format:T.RGBAFormat,internalFormat:aux?'RGBA32F':'RGBA16F',colorSpace:T.LinearSRGBColorSpace,minFilter:T.NearestFilter,magFilter:T.NearestFilter,generateMipmaps:false,depthBuffer:!aux,stencilBuffer:false,samples:aux?0:4});owned.push(target);check();target.texture.internalFormat=aux?'RGBA32F':'RGBA16F';target.texture.colorSpace=T.LinearSRGBColorSpace;target.resolveDepthBuffer=false;renderer.initRenderTarget(target);check();renderer.setRenderTarget(target);const gl=renderer.getContext(),status=gl.checkFramebufferStatus(gl.FRAMEBUFFER),samples=gl.getParameter(gl.SAMPLES),error=gl.getError();report.targets.push({width,height,format:aux?'RGBA32F':'RGBA16F',textureType:target.texture.type,requestedSamples:aux?0:4,observedSamples:samples,framebufferStatus:status,glError:error,resolve:'Public pinned Three render completion; no private/manual blit or residency claim'});if(status!==gl.FRAMEBUFFER_COMPLETE||samples!==(aux?0:4)||error!==gl.NO_ERROR)throw unavailable('Required native witness framebuffer/type/sample count unavailable');return target;}
  function rawScene(target,stage,projection=null){
    const swaps=[];let cause=NONE;try{for(const[m]of worldMaterials)m.colorWrite=false;scene.background=null;
      if(projection)for(const mesh of initial.meshes){const m=transportMaterial(T,materialReferences.get(mesh),nativeTransportProjection(NATIVE_TRANSPORT_FRAGMENT,projection));owned.push(m);check();swaps.push(mesh);mesh.material=m;}
      renderer.setRenderTarget(target);renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.toneMappingExposure=1;renderer.autoClear=false;if(renderer.shadowMap)renderer.shadowMap.autoUpdate=false;
      renderer.setClearColor(0,0);renderer.setViewport(0,0,1280,800);const xs=pixels.map(p=>p.readPixels[0]),ys=pixels.map(p=>p.readPixels[1]);renderer.setScissor(Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs)+1,Math.max(...ys)-Math.min(...ys)+1);renderer.setScissorTest(true);renderer.clear(true,true,false);renderer.render(scene,camera);halfRead(target,stage);
    }catch(e){cause=e;}finally{const errors=[];for(const mesh of swaps)try{mesh.material=materialReferences.get(mesh);}catch(e){errors.push(e);}for(const[m,value]of worldMaterials)try{m.colorWrite=value;}catch(e){errors.push(e);}try{scene.background=background;}catch(e){errors.push(e);}failure(cause,errors);}
    checkBinding();
  }
  try{
    check();support(T,renderer);check();originalState=save(T,renderer);
    renderer.render=function(...args){check();attempts++;if(attempts>8)throw Error('Native witness render submission cap exceeded');calls++;const value=render.apply(this,args);check();return value;};renderWrapped=true;
    normalDraw({beforeDisplay(target){normalReadCount++;halfRead(target,'normalSceneHdr');},afterDisplay(){displayReadCount++;transportNeed(renderer.getRenderTarget()===null,'Normal display must target default framebuffer');const gl=renderer.getContext();report.observations.finalDisplay=pixels.map(pixel=>{check();const b=new Uint8Array(4);b.fill(17);gl.readPixels(...pixel.readPixels,1,1,gl.RGBA,gl.UNSIGNED_BYTE,b);const error=gl.getError();if(b.every(x=>x===17)||error!==gl.NO_ERROR)throw unavailable('Normal display readback unavailable');return {pixel,rgba:Array.from(b),glError:error};});}});
    if(normalReadCount!==1||displayReadCount!==1)throw Error('Exactly one normal scene/display read boundary required');
    borrow(lease=>{
      activeLease=lease;initial=nativeTransportBindings(T,lease,camera);materialReferences=new Map(initial.meshes.map(m=>[m,m.material]));worldMaterials=new Map();
      let borrowCause=NONE;try{transportNeed(JSON.stringify(initial.record)===JSON.stringify(expected),'Binding changed across ordinary preparation');const selected=new Set(initial.meshes);scene.traverse(node=>{if(!selected.has(node))for(const m of [node.material].flat().filter(Boolean))worldMaterials.set(m,m.colorWrite);});const target=makeTarget(1280,800);rawScene(target,'volumeTotal');rawScene(target,'volumeFire','fire');rawScene(target,'survivingTelemetry','telemetry');
      const source=initial.meshes[0].material.uniforms,aux=makeTarget(2,1,true),geometry=triangle(T);owned.push(geometry);
      const nativeA=NATIVE_TRANSPORT_FRAGMENT.slice(NATIVE_TRANSPORT_FRAGMENT.indexOf('    float nativeA('),NATIVE_TRANSPORT_FRAGMENT.indexOf('    float livePatchA('));
      const fragment='precision highp float;precision highp sampler2D;uniform sampler2D nativeField,opaqueDepth;uniform vec2 nativeGrid,opaqueDepthSize,originalPixel[4];uniform float nativeCellSize,fieldEnabled,opaqueDepthEnabled;'+nativeA+'void main(){if(gl_FragCoord.x<1.)gl_FragColor=vec4(nativeA(vec2(5.25,8.25)),nativeA(vec2(5.75,8.25)),nativeA(vec2(5.25,8.75)),nativeA(vec2(5.75,8.75)));else gl_FragColor=opaqueDepthEnabled>.5?vec4(texture2D(opaqueDepth,originalPixel[0]/opaqueDepthSize).r,texture2D(opaqueDepth,originalPixel[1]/opaqueDepthSize).r,texture2D(opaqueDepth,originalPixel[2]/opaqueDepthSize).r,texture2D(opaqueDepth,originalPixel[3]/opaqueDepthSize).r):vec4(1.);}';
      const uniforms=Object.fromEntries(['nativeField','opaqueDepth','nativeGrid','opaqueDepthSize','nativeCellSize','fieldEnabled','opaqueDepthEnabled'].map(k=>[k,source[k]]));uniforms.originalPixel={value:pixels.map(p=>new T.Vector2(...p.shaderCentre))};
      const material=new T.RawShaderMaterial({vertexShader:VERTEX,fragmentShader:fragment,uniforms,depthTest:false,depthWrite:false,blending:T.NoBlending,toneMapped:false});owned.push(material);const auxScene=new T.Scene(),mesh=new T.Mesh(geometry,material);auxScene.add(mesh);renderer.setRenderTarget(aux);renderer.setViewport(0,0,2,1);renderer.setScissorTest(false);renderer.setClearColor(0,0);renderer.clear(true,false,false);renderer.render(auxScene,new T.Camera());
      const values=new Float32Array(8);values.fill(NaN);renderer.readRenderTargetPixels(aux,0,0,2,1,values);const error=renderer.getContext().getError();report.observations.auxiliary={format:'RGBA32F',samples:0,originalPixels:pixels,float32Words:Array.from(new Uint32Array(values.buffer)),values:Array.from(values,x=>Number.isFinite(x)?x:String(x)),effectiveNativeA:Array.from(values.slice(0,4),x=>Number.isFinite(x)?x:String(x)),effectiveOpaqueDepthAtOriginalPixels:Array.from(values.slice(4),x=>Number.isFinite(x)?x:String(x)),productionBranchFetchObserved:false,glError:error,meaning:'Separate GPU effective nativeA(enabled/bounds) and effective centre depth evaluations; not original fragment fetch/coverage proof. Skipped original fetches remain unobserved; not raw alpha zeros.'};if(values.some(x=>!Number.isFinite(x))||error!==0)throw unavailable('Auxiliary float readback unavailable');
      sameTransportBinding(initial,nativeTransportBindings(T,lease,camera));
      }catch(error){borrowCause=error;}finally{const errors=[];for(const[mesh,m]of materialReferences)try{mesh.material=m;}catch(e){errors.push(e);}for(const[m,value]of worldMaterials)try{m.colorWrite=value;}catch(e){errors.push(e);}try{scene.background=background;}catch(e){errors.push(e);}
        // Three also caches this owned map in material properties. Clear ONLY
        // its keys, then publicly dispose inside the lease; never mutate a
        // shared wrapper.value or dispose a borrowed field/native/depth texture.
        for(const item of owned)if(item?.isMaterial){
          try{for(const key of Object.keys(item.uniforms))delete item.uniforms[key];item.uniforms={};}catch(e){errors.push(e);leaseRetirementErrors.push(e);}
          try{item.dispose();}catch(e){errors.push(e);leaseRetirementErrors.push(e);}finally{retiredInsideLease.add(item);}
        }
        materialReferences.clear();worldMaterials.clear();initial=activeLease=materialReferences=worldMaterials=null;failure(borrowCause,errors);}
    });
    report.observations.derivedSoot=report.observations.volumeTotal.map((total,n)=>{const fire=report.observations.volumeFire[n],alphaError=halfRadius(total.halfWords[3])+halfRadius(fire.halfWords[3]),valid=Math.abs(total.values[3]-fire.values[3])<=alphaError;return {pixel:total.pixel,valid,alphaDifference:total.values[3]-fire.values[3],alphaEnvelope:alphaError,signedRgb:valid?total.values.slice(0,3).map((x,c)=>x-fire.values[c]):null,rgbEnvelope:total.halfWords.slice(0,3).map((word,c)=>halfRadius(word)+halfRadius(fire.halfWords[c])),meaning:'DERIVED signed total-minus-fire, same-source/same-k/T projection. Half representation envelope only; not independent closure or a CPU oracle.'};});
    report.telemetryMeaning='RGB/A are original associated-alpha/blend/order weighted depth-break, advances/128 and sampled-depth summaries of surviving writes; not arithmetic means or individual fragments. Missing/zero-A writes are indeterminate.';report.bindingCoherent=true;report.status='observed';
  }catch(e){primary=e;report.status=e?.code==='LINEAR_HDR_UNAVAILABLE'?'unavailable':'failed';report.errors.push(...transportErrorList(e));}
  finally{
    const errors=[...leaseRetirementErrors];try{scene.background=background;if(renderer.shadowMap)renderer.shadowMap.autoUpdate=shadowAuto;}catch(e){errors.push(e);}
    if(renderWrapped)try{renderer.render=render;}catch(e){errors.push(e);}if(originalState)errors.push(...restored(renderer,originalState));errors.push(...disposeAll(owned.filter(item=>!retiredInsideLease.has(item))));if(errors.length){report.status='failed';report.errors.push(...errors.flatMap(transportErrorList).slice(0,16));}report.cleanup={errorCount:errors.length,errorsTruncated:errors.length>8,ownedRetirementErrors:errors.slice(0,8).flatMap(transportErrorList).slice(0,16),borrowedResourcesDisposed:false,retirementComplete:errors.length===0};
  }
  report.renderSubmissions={actual:calls,attempts,maximum:8,planned:7,meaning:'Explicit renderer.render invocations incl depth/normal scene/display, not GL draw calls or a timing receipt; setup/seek outside action.'};report.elapsedMs=performance.now()-start;
  assertNativeTransportReportBudget(report);
  return copy(report);
}
