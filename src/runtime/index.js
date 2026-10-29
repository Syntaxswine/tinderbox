import * as THREE from './three.js';
import {createSimulation} from '../simulation/index.js';
import {configuration} from '../simulation/config.js';
import {createCameraRig} from './camera.js';
import {createDiagnosticScene} from './diagnostics.js';
export {THREE};
export async function createRuntime({root,uiRoot=root,createArtScene,mountUI,assetBaseUrl,simulation,seed,scenario,config,characterId='bear',autoStart=true,uiOptions={},signal:externalSignal,
  rendererFactory=()=>new THREE.WebGLRenderer({antialias:true,alpha:false}),observerFactory=callback=>new ResizeObserver(callback),onSnapshot=()=>{},onError=error=>console.error(error)}={}){
  if(!root)throw Error('A viewport root is required');
  if(externalSignal?.aborted)throw new DOMException('Visit cancelled','AbortError');
  const settings=configuration(config),sim=simulation??createSimulation({seed,scenario,config,characterId});
  const controller=new AbortController(),signal=controller.signal,doc=root.ownerDocument||globalThis.document,win=doc?.defaultView||globalThis;
  let renderer,scene,camera,observer,art,ui,animation,snapshot=sim.snapshot(),disposed=false,lastTime=null,frames=0,lastMetrics={},rendererDescription='unavailable';
  const cpuSamples=[],simulationSamples=[],frameSamples=[];
  function dispatch(command){
    if(disposed)return false;
    if(command?.type==='view-overview'||command?.type==='view-follow'){
      const mode=command.type==='view-overview'?'overview':'follow';camera.setMode(mode);sim.setView?.(mode);return true;
    }
    return sim.dispatch(command);
  }
  function present(next,delta,simulationMs=0){
    const before=performance.now(),previous=snapshot;snapshot=next;
    const timing={alpha:snapshot.diagnostics.alpha,playerDelta:Math.max(0,snapshot.clocks.player-previous.clocks.player),worldDelta:Math.max(0,snapshot.clocks.world-previous.clocks.world),
      playerTime:snapshot.clocks.player,worldTime:snapshot.clocks.world,camera:camera.camera,viewMode:camera.diagnostics().mode,viewport:{width:root.clientWidth,height:root.clientHeight}};
    camera.update(snapshot.player);art.update(snapshot,timing);ui?.update(snapshot);renderer.render(scene,camera.camera);frames++;
    cpuSamples.push(performance.now()-before);simulationSamples.push(simulationMs);frameSamples.push(delta*1000);
    if(cpuSamples.length>240){cpuSamples.shift();simulationSamples.shift();frameSamples.shift();}
    const sorted=[...cpuSamples].sort((a,b)=>a-b),simSorted=[...simulationSamples].sort((a,b)=>a-b),intervals=frameSamples.filter(v=>v>0);
    lastMetrics={frames,simulationMs,rendererDescription,userAgent:globalThis.navigator?.userAgent||'',streaming:art.streamingMetrics?.(),
      simulationCpuP95Ms:simSorted[Math.floor((simSorted.length-1)*.95)]??0,observedHz:intervals.length?1000*intervals.length/intervals.reduce((n,v)=>n+v,0):0,
      renderCpuP95Ms:sorted[Math.floor((sorted.length-1)*.95)]??0,drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,
      viewport:{width:root.clientWidth,height:root.clientHeight},threeRevision:THREE.REVISION,camera:camera.diagnostics()};
    onSnapshot(snapshot,lastMetrics);return snapshot;
  }
  function advance(delta){
    if(disposed)throw Error('Runtime disposed');const before=performance.now();
    try{return present(sim.advance(delta),delta,performance.now()-before);}catch(error){dispose();throw error;}
  }
  function frame(now){
    if(disposed)return;const delta=lastTime===null?0:Math.max(0,(now-lastTime)/1000);lastTime=now;
    try{advance(delta);}catch(error){onError(error);return;}animation=win.requestAnimationFrame(frame);
  }
  function loseFocus(){if(disposed)return;dispatch({type:'cancel-input'});dispatch({type:'pause',paused:true});lastTime=null;try{if(art)advance(settings.step);else snapshot=sim.advance(settings.step);}catch(error){dispose();onError(error);}}
  const abort=()=>dispose();externalSignal?.addEventListener('abort',abort,{once:true});
  try{
    renderer=rendererFactory();renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x35281e);root.append(renderer.domElement);
    scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xfff1d1,0x334852,2.3));const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(-8,16,6);scene.add(sun);
    camera=createCameraRig(root,renderer,snapshot.world,{x:settings.input.cameraX,h:14,y:settings.input.cameraY});
    observer=observerFactory(()=>{camera.resize();if(art&&!disposed)try{present(snapshot,0);}catch(error){dispose();onError(error);}});observer.observe(root);
    const gl=renderer.getContext();if(!gl)throw Error('The browser could not create a WebGL 2 view');const debug=gl.getExtension('WEBGL_debug_renderer_info');rendererDescription=String(gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER));
    renderer.domElement.addEventListener('webglcontextlost',event=>{if(disposed)return;event.preventDefault();dispose();onError(Error('Graphics context lost. Return to the places menu and try again.'));},{signal});
    win.addEventListener('blur',loseFocus,{signal});doc?.addEventListener('visibilitychange',()=>{if(doc.hidden)loseFocus();lastTime=null;},{signal});
    if(doc?.hidden||typeof doc?.hasFocus==='function'&&!doc.hasFocus())loseFocus();
    const created=createArtScene?await createArtScene({THREE,scene,renderer,assetBaseUrl,characterId,world:snapshot.world,pickups:snapshot.pickups||[],signal:externalSignal}):createDiagnosticScene({THREE,scene,config:settings});
    if(disposed||externalSignal?.aborted){created.dispose();throw new DOMException('Visit cancelled','AbortError');}art=created;
    ui=mountUI?.({root:uiRoot,onCommand:dispatch,onZoom:camera.magnify,...uiOptions});
    renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Isometric '+(uiOptions.placeTitle||'Tinderbox')+'. Move with the joystick, WASD or arrows.');
    const aim=event=>{const point=camera.screenToWorld(event.clientX,event.clientY);if(point)dispatch({type:'aim',...point});};
    renderer.domElement.addEventListener('pointermove',aim,{signal});renderer.domElement.addEventListener('pointerdown',event=>{if(event.button===0)aim(event);},{signal});
    present(snapshot,0);if(autoStart)animation=win.requestAnimationFrame(frame);
    return {dispatch,advance,snapshot:()=>sim.snapshot(),metrics:()=>({...lastMetrics}),screenToWorld:camera.screenToWorld,zoom:camera.magnify,artDiagnostics:()=>art?.diagnostics?.(),dispose};
  }catch(error){dispose();throw error;}
  function dispose(){
    if(disposed)return;disposed=true;
    const failures=[],clean=operation=>{try{operation();}catch(error){failures.push(error.message);}};
    clean(()=>win.cancelAnimationFrame?.(animation));clean(()=>controller.abort());clean(()=>externalSignal?.removeEventListener('abort',abort));clean(()=>observer?.disconnect());
    clean(()=>{sim.dispatch({type:'cancel-input'});sim.dispatch({type:'pause',paused:true});});
    clean(()=>ui?.dispose());clean(()=>art?.dispose());clean(()=>sim.dispose());clean(()=>scene?.clear());clean(()=>renderer?.forceContextLoss());clean(()=>renderer?.dispose());clean(()=>renderer?.domElement.remove());
    if(failures.length)lastMetrics={...lastMetrics,cleanupErrors:failures};
  }
}
