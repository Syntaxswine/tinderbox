import * as T from '../../src/runtime/three.js';
import {createArtScene} from '../../src/art/index.js';
import {createFireReviewEffect} from '../../src/art/fire-review-effect.js';
import {createFireRealism} from '../../assets/art/fire-realism/index.js';
import {createFireReviewSimulation,createReviewPlaybackClock,FIRE_REVIEW_SCENARIOS,POPULATION_CASES} from '../../tools/fire-realism/scenarios.js';
import {createGpuTimer,statistics,summarizeFireMeasurements,validateQualityReceipt,renderTimedFireFrame} from '../../tools/fire-realism/profiling.js';
import {createFixedFirePose,FIRE_POSE_FRAMES} from '../../tools/fire-realism/fixed-pose.js';
export {FIRE_REVIEW_SCENARIOS};
export const FIRE_REVIEW_MODES=Object.freeze(['current','reference','optimized','no-fire']);
const CONTROL='dc7f537a83a7e832a0dfa0757d0b2700b909c053';
const clone=value=>structuredClone(value),validNumber=Number.isFinite;
function configuration(patch,previous){
  const next={...previous,...patch,viewport:{...previous.viewport,...patch.viewport}};
  if(!FIRE_REVIEW_MODES.includes(next.mode)||!FIRE_REVIEW_SCENARIOS.includes(next.scenario)||!['isometric','oblique'].includes(next.view)||!['bright','dim'].includes(next.lighting)||!['bear','goat','horse'].includes(next.characterId)||!Number.isSafeInteger(next.seed))throw new TypeError('Invalid fire review configuration');
  if(next.population!==null&&(!POPULATION_CASES.includes(next.scenario)||![32,128,512].includes(next.population)))throw new RangeError('Population is supported only in street-fire at32/128/512');
  const {width,height,pixelRatio}=next.viewport;
  if(![width,height,pixelRatio].every(validNumber)||width<128||height<128||width>4096||height>4096||pixelRatio<.5||pixelRatio>1.75)throw new RangeError('Invalid viewport; use product pixel ratio at most1.75');
  next.viewport={width:Math.round(width),height:Math.round(height),pixelRatio};return next;
}
async function localManifest(manifestUrl='../../assets/art/fire-realism/manifest.json'){
  const url=new URL(manifestUrl,import.meta.url),project=new URL('../../',import.meta.url);
  if(url.origin!==project.origin||!url.pathname.startsWith(project.pathname+'assets/'))throw Error('Delivery manifest must be inside this project assets');
  const response=await fetch(url);
  if(!response.ok)throw Error('Fire delivery manifest HTTP '+response.status);
  const manifest=await response.json(),hashes={};
  for(const record of manifest.runtimeFiles){
    if(!/^assets\/art\/fire-realism\//.test(record.path)||record.path.includes('..'))throw Error('Unexpected fire runtime source path');
    const file=await fetch(new URL('../../'+record.path,import.meta.url));if(!file.ok)throw Error('Missing fire delivery '+record.path);
    const bytes=await file.arrayBuffer(),hash=globalThis.crypto?.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join(''):null;
    if(hash&&hash!==record.sha256)throw Error('Fire delivery hash mismatch: '+record.path);
    hashes[record.path]={sha256:hash,expectedSha256:record.sha256,bytes:bytes.byteLength,verified:hash===record.sha256};
  }
  return {manifest,hashes};
}
/** Diagnostic only. Single renderer, single selected fire mode, actual game art. */
export async function createFireReviewDriver({root,uiRoot=root,mountUI,onChange=()=>{},signal,artistDelivery=null,referenceAcceptance=null}={}){
  if(!root)throw TypeError('A canvas root is required');
  if(signal?.aborted)throw new DOMException('Review cancelled','AbortError');
  const doc=root.ownerDocument,win=doc?.defaultView||globalThis,controller=new AbortController(),playbackClock=createReviewPlaybackClock();
  const stateNode=doc.createElement('script');stateNode.type='application/json';stateNode.dataset.fireReviewDriverState='';root.append(stateNode);
  let config=configuration({}, {mode:'current',scenario:'match-contact',view:'isometric',lighting:'bright',population:null,seed:1893,characterId:'bear',viewport:{width:1280,height:800,pixelRatio:Math.min(globalThis.devicePixelRatio||1,1.75)}});
  let phase='initializing',renderer,scene,camera,art,sim,ui,animation=null,lastNow=null,frameIndex=0,closed=false,loading=false,measurePromise=null,cancelRequested=false;
  let snapshot=null,error=null,progress=null,results=null,manifest=null,hashes={},controlHashes={},adapterHashes={},observerError=null,shaderError=null,notifyTime=0,latestCpu={},lastMetrics={};
  const availability={current:{available:true,reason:null,sourceCommit:CONTROL},reference:{available:false,reason:'Artist delivery not loaded',sourceCommit:null},optimized:{available:false,reason:'Optimized delivery unavailable',sourceCommit:null},'no-fire':{available:true,reason:null,sourceCommit:CONTROL}};
  const referenceDelivery=artistDelivery?.byMode?.reference||artistDelivery||{};
  const optimizedDelivery=artistDelivery?.byMode?.optimized||null;
  const factories={reference:referenceDelivery.createFireRealism||createFireRealism,optimized:optimizedDelivery?.createFireRealism||null};
  const fingerprints={reference:{sourceCommit:referenceDelivery.sourceCommit||null,runtimeFiles:{}},optimized:{sourceCommit:optimizedDelivery?.sourceCommit||null,runtimeFiles:{}}};
  function sources(){return {publishedControl:CONTROL,controlRuntimeFiles:clone(controlHashes),adapterRuntimeFiles:clone(adapterHashes),byMode:clone(fingerprints)};}
  function state(){
    const fire=art?.diagnostics().fire,frame=fire?.artist;
    return clone({version:1,phase,configuration:config,frameIndex,tick:snapshot?.tick||0,worldTime:snapshot?.clocks.world||0,playerTime:snapshot?.clocks.player||0,paused:phase!=='playing'&&phase!=='measuring',
      availability,capabilities:{gpuTimer:{available:!!timerSupport,reason:timerSupport?null:'EXT_disjoint_timer_query_webgl2 unavailable'},populations:POPULATION_CASES.includes(config.scenario)?[32,128,512]:[]},
      workload:{requestedPopulation:config.population,actualBurningCells:snapshot?.diagnostics.burningCells||0,activeDischarge:!!snapshot?.discharge.active,activeTorch:snapshot?.player.tool==='torch'&&snapshot?.player.torch.phase==='lit',burningBuildingIds:frame?.burningBuildingIds||[]},
      progress,referenceAcceptance:validateQualityReceipt(referenceAcceptance,{kind:'architect-fire-reference-acceptance-v1',sourceCommit:fingerprints.reference.sourceCommit,runtimeFiles:fingerprints.reference.runtimeFiles})?'accepted':referenceAcceptance?'pending':'missing',results,error,
      diagnostics:{fire,renderer:lastMetrics,latestCpu,playbackClock:playbackClock.diagnostics(),sourceFingerprints:sources()}});
  }
  function notify(force=false){
    const now=performance.now();if(!force&&now-notifyTime<250)return;notifyTime=now;
    try{const detached=state();stateNode.textContent=JSON.stringify(detached);root.dataset.fireReviewPhase=phase;onChange(detached);}catch(cause){observerError=cause;cancelRequested=true;phase='error';error={code:'OBSERVER_ERROR',message:cause.message||String(cause)};pauseLoop();}
  }
  function pauseLoop(){if(animation!==null)win.cancelAnimationFrame(animation);animation=null;lastNow=null;playbackClock.reset();}
  function assertUsable(){if(closed)throw Error('Fire review disposed');if(loading)throw Error('Configuration is loading');if(measurePromise)throw Error('Cancel and await measurement before editing configuration');}
  function dispatch(command){if(closed||measurePromise||phase==='measuring'||phase==='cancelling')return false;return sim?.dispatch(command)||false;}
  function placeCamera(){
    const {width,height,pixelRatio}=config.viewport;renderer.setPixelRatio(pixelRatio);renderer.setSize(width,height,false);
    renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';root.style.aspectRatio=width+'/'+height;
    const focus=config.scenario==='street-fire'?new T.Vector3(30,1.5,10):config.scenario.startsWith('gasoline')?new T.Vector3(7,.6,8.25):new T.Vector3(5.7,.9,8.25);
    const span=config.scenario==='street-fire'?15:config.scenario==='wall-clipped-jet'?10:8,aspect=width/height;
    camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
    camera.position.copy(focus).add(config.view==='oblique'?new T.Vector3(10,5,12):new T.Vector3(10,14,12));camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const lights=scene.children.filter(child=>child.userData.reviewEnvironmentLight);
    lights[0].intensity=config.lighting==='dim'?.35:2.3;lights[1].intensity=config.lighting==='dim'?.2:2.5;
  }
  function project(anchor){if(!Array.isArray(anchor))return {x:0,y:0,visible:false};const v=new T.Vector3(...anchor).project(camera),box=renderer.domElement.getBoundingClientRect(),u=uiRoot.getBoundingClientRect();return{x:box.left-u.left+(v.x+1)*box.width/2,y:box.top-u.top+(1-v.y)*box.height/2,visible:Math.abs(v.x)<=1&&Math.abs(v.y)<=1&&Math.abs(v.z)<=1};}
  function updateArt(paused=false,presentation=null){
    const start=performance.now(),next=paused?{...snapshot,paused:true}:snapshot;
    art.update(next,{playerTime:snapshot.clocks.player,worldTime:snapshot.clocks.world,camera,viewport:config.viewport,...(presentation?{fireWorldTime:presentation.worldTime,firePlayerTime:presentation.playerTime}:{})});ui?.update(next);latestCpu.updateMs=performance.now()-start;
  }
  function draw(timer=null,index=0){
    latestCpu.renderSubmissionMs=renderTimedFireFrame({renderer,scene,camera,art,timer,index}).renderSubmissionMs;
    if(shaderError)throw shaderError;
    const size=renderer.getDrawingBufferSize(new T.Vector2());lastMetrics={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,lines:renderer.info.render.lines,points:renderer.info.render.points,
      geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,width:size.x,height:size.y,pixelRatio:renderer.getPixelRatio(),toneMapping:renderer.toneMapping,outputColorSpace:renderer.outputColorSpace};
  }
  function advance(){const before=performance.now();snapshot=sim.advance();latestCpu.simulationMs=performance.now()-before;frameIndex=sim.frameIndex;updateArt(false);}
  function loop(now){
    if(closed||phase!=='playing')return;
    try{if(lastNow!==null){const frames=playbackClock.advance(Math.max(0,(now-lastNow)/1000));for(let i=0;i<frames;i++)advance();}lastNow=now;draw();notify();if(phase==='playing')animation=win.requestAnimationFrame(loop);}catch(cause){fail(cause);}
  }
  function fail(cause){pauseLoop();phase='error';error={code:'RENDER_ERROR',message:cause.message||String(cause)};cancelRequested=true;notify(true);}
  const frame=()=>new Promise(resolve=>win.requestAnimationFrame(resolve));
  let timerSupport=false;
  async function build(next){
    loading=true;pauseLoop();phase='initializing';config=next;notify(true);
    try{
      ui?.dispose();ui=null;art?.dispose();art=null;sim?.dispose();sim=createFireReviewSimulation(config);snapshot=sim.snapshot();frameIndex=0;
      placeCamera();
      art=await makeArt(config.mode);
      if(closed){art.dispose();throw new DOMException('Review disposed','AbortError');}
      ui=mountUI?.({root:uiRoot,onCommand:dispatch,onZoom:()=>{},onProjectInteraction:project,mode:'gameplay',placeTitle:'Fire comparison'});
      updateArt(true);draw();phase=availability[config.mode].available?'ready':'unavailable';error=null;notify(true);
    }catch(cause){if(!closed)fail(cause);throw cause;}finally{loading=false;}
  }
  function makeArt(mode){return createArtScene({THREE:T,scene,renderer,characterId:config.characterId,world:snapshot.world,pickups:snapshot.pickups,signal:controller.signal,
    fireFactory:(shared,assets,uniforms)=>createFireReviewEffect(shared,assets,uniforms,{renderer,scene,artistFactories:{reference:availability.reference.available?factories.reference:null,optimized:availability.optimized.available?factories.optimized:null},initialMode:mode})});}
  async function resetSimulation(mode=config.mode){sim?.dispose();sim=createFireReviewSimulation(config);snapshot=sim.snapshot();frameIndex=0;art?.dispose();art=null;art=await makeArt(mode);updateArt(false);}
  async function measureInternal(options={}){
    const modes=options.modes??['current','reference','optimized'],warmupFrames=options.warmupFrames??120,sampleFrames=options.sampleFrames??600,trialCount=options.trials??3;
    if(!Array.isArray(modes)||!modes.length||new Set(modes).size!==modes.length||modes.some(mode=>!['current','reference','optimized'].includes(mode))||![warmupFrames,sampleFrames,trialCount].every(Number.isInteger)||warmupFrames<1||sampleFrames<2||sampleFrames>10000||trialCount<1||trialCount>10)throw RangeError('Invalid measurement protocol');
    const protocol={method:'EXT_disjoint_timer_query_webgl2',warmupFrames,sampleFrames,trials:trialCount,interleaved:true,stepSeconds:1/60,depthPreparation:'Included inside timed artist-mode render',workload:'Fixed active authoritative pose; sustained emission is a benchmark adaptation, not played gameplay',globalToneMapping:'NoToneMapping',outputColorSpace:'srgb'};
    const report={version:1,status:'unavailable',reason:null,configuration:clone(config),protocol,sourceFingerprints:sources(),
      hardware:hardware(),gpu:null,cpu:{},frames:{},draws:{},resources:{},fillProxy:null,comparison:{approvedReference:false,retainedQualityAccepted:null,optimizedReferenceRatio:null,targetMet:null}};
    const missing=modes.filter(mode=>!availability[mode].available);
    if(missing.length||!timerSupport){report.reason=missing.length?'Unavailable modes: '+missing.join(', '):'GPU timer unavailable; rendering cost remains unknown';results=report;notify(true);return clone(report);}
    pauseLoop();phase='measuring';cancelRequested=false;const trials=[],passCount=modes.length*2*trialCount;let passIndex=0;
    try{
      for(let trialIndex=0;trialIndex<trialCount;trialIndex++){
        const ordered=modes.map((_,i)=>modes[(i+trialIndex)%modes.length]);
        for(const mode of ordered)for(const selected of trialIndex%2?[mode,'no-fire']:['no-fire',mode]){
          if(cancelRequested||closed||options.signal?.aborted)break;
          const setupStart=performance.now();await resetSimulation(selected);const eventTimes=[],seenEvents=new Set();
          const poseFrame=options.poseFrame??FIRE_POSE_FRAMES[config.scenario];if(!Number.isInteger(poseFrame)||poseFrame<1||poseFrame>3600)throw RangeError('Invalid active pose frame');
          for(let j=0;j<poseFrame;j++){advance();draw();for(const event of snapshot.events){if(!seenEvents.has(event.id)){seenEvents.add(event.id);eventTimes.push({...event,receivedWorldTime:snapshot.clocks.world});}}if(j%16===15){await frame();if(cancelRequested||closed||options.signal?.aborted)break;}}
          if(cancelRequested||closed||options.signal?.aborted)break;
          const nativeAnchors=Object.fromEntries(Object.entries(art.anchors||{}).map(([id,node])=>[id,{position:node.getWorldPosition(new T.Vector3()).toArray(),quaternion:node.getWorldQuaternion(new T.Quaternion()).toArray()}]));
          const housing=art.diagnostics().housing;const pose=await createFixedFirePose(snapshot,{frameIndex,anchors:nativeAnchors,sourceAppearance:{housing,characterId:config.characterId,field:art.fireReviewInputs?.()?.field},eventTimes});
          const setupMs=performance.now()-setupStart;const timer=createGpuTimer(renderer.getContext()),record={trialIndex,mode:selected,forMode:mode,sampleFrames,pose:pose.record,setup:{cpuWallMs:setupMs,resourcesBeforeSampling:{...lastMetrics}},gpu:[],rejected:[],updateCpuMs:[],renderCpuMs:[],simulationCpuMs:[],frameMs:[],draws:[],resources:[],effectOccupancyTrace:[],workloadTrace:[]};
          let previous=null;progress={trialIndex,trialCount,passIndex:passIndex++,passCount,mode:selected,phase:'warmup',phaseFrame:0,phaseFrames:warmupFrames,validSamples:0,rejectedSamples:0};notify(true);
          try{
            for(let i=0;i<warmupFrames+sampleFrames;i++){
              const now=await frame();if(cancelRequested||closed||options.signal?.aborted)break;
              if(doc.hidden)throw Error('Review tab became hidden; discard this GPU run');
              const presentation=await pose.frame(i+1);snapshot=presentation.snapshot;const updateStart=performance.now();updateArt(false,presentation);latestCpu.simulationMs=0;latestCpu.updateMs=performance.now()-updateStart;const sampling=i>=warmupFrames;draw(sampling?timer:null,i-warmupFrames);timer.poll();
              if(sampling){record.updateCpuMs.push(latestCpu.updateMs);record.renderCpuMs.push(latestCpu.renderSubmissionMs);record.simulationCpuMs.push(latestCpu.simulationMs);if(previous!==null)record.frameMs.push(now-previous);
                record.draws.push({calls:lastMetrics.calls,triangles:lastMetrics.triangles,lines:lastMetrics.lines});record.resources.push({geometries:lastMetrics.geometries,textures:lastMetrics.textures});
                record.workloadTrace.push(presentation.workload);const observed=art.diagnostics().fire;record.effectOccupancyTrace.push({sourceBurning:presentation.workload.burning,sourceTransientIds:presentation.workload.activeTransientIds,legacyBurstCards:observed.current?.burstCards??observed.legacyTransients?.burstCards??0,artistLayers:observed.artist?.layers||null});}
              previous=now;progress={...progress,phase:sampling?'sampling':'warmup',phaseFrame:sampling?i-warmupFrames+1:i+1,phaseFrames:sampling?sampleFrames:warmupFrames,validSamples:timer.samples.length,rejectedSamples:timer.rejected.length};notify();
            }
            progress={...progress,phase:'draining',phaseFrames:null};notify(true);const deadline=performance.now()+10000;
            while(timer.pending&&!cancelRequested&&!closed&&!options.signal?.aborted&&performance.now()<deadline){await frame();timer.poll();}
            record.fireDiagnostics=art.diagnostics().fire;record.gpu=timer.samples;record.rejected=timer.rejected;if(timer.pending)record.rejected.push({index:null,reason:'GPU query drain timed out'});trials.push(record);
          }finally{timer.dispose();}
          if(cancelRequested||closed||options.signal?.aborted)break;
        }
        if(cancelRequested||closed||options.signal?.aborted)break;
      }
      report.status=cancelRequested||closed||options.signal?.aborted?'cancelled':'complete';report.reason=report.status==='cancelled'?'Measurement cancelled; queries retired':null;
      const summary=summarizeFireMeasurements({trials,modes,referenceAcceptance,optimizedAcceptance:optimizedDelivery?.retainedQualityAcceptance,sourceFingerprints:fingerprints});
      if(report.status==='complete'&&summary.reasons.length){report.status='inconclusive';report.reason=summary.reasons.join('; ');}
      report.gpu={method:protocol.method,...summary,rejectedSamples:Object.fromEntries(trials.map((t,i)=>[i,t.rejected.length])),trials};report.comparison=summary.comparison;
      for(const mode of [...modes,'no-fire']){const selected=trials.filter(t=>t.mode===mode);report.cpu[mode]={updateMs:statistics(selected.flatMap(t=>t.updateCpuMs)),renderSubmissionMs:statistics(selected.flatMap(t=>t.renderCpuMs)),simulationMs:statistics(selected.flatMap(t=>t.simulationCpuMs))};report.frames[mode]=statistics(selected.flatMap(t=>t.frameMs));
        report.draws[mode]={calls:statistics(selected.flatMap(t=>t.draws.map(d=>d.calls))),triangles:statistics(selected.flatMap(t=>t.draws.map(d=>d.triangles))),lines:statistics(selected.flatMap(t=>t.draws.map(d=>d.lines)))};report.resources[mode]={samples:selected.flatMap(t=>t.resources),fireDiagnostics:selected.map(t=>t.fireDiagnostics)};}
      results=report;return clone(report);
    }finally{progress=null;if(!closed){await resetSimulation(config.mode);phase=availability[config.mode].available?'ready':'unavailable';updateArt(true);draw();notify(true);}}
  }
  function hardware(){const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return{userAgent:globalThis.navigator?.userAgent||null,threeRevision:T.REVISION,renderer:String(gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER)),vendor:String(gl.getParameter(debug?debug.UNMASKED_VENDOR_WEBGL:gl.VENDOR)),webglVersion:String(gl.getParameter(gl.VERSION)),canvas:{...config.viewport,drawingBufferWidth:gl.drawingBufferWidth,drawingBufferHeight:gl.drawingBufferHeight},phoneViewportIsPhoneHardware:false};}
  async function dispose(){if(closed)return;closed=true;cancelRequested=true;pauseLoop();controller.abort();signal?.removeEventListener('abort',abort);
    if(measurePromise)await measurePromise.catch(()=>{});ui?.dispose();art?.dispose();sim?.dispose();scene?.clear();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();phase='disposed';notify(true);stateNode.remove();delete root.dataset.fireReviewPhase;}
  function abort(){void dispose();}signal?.addEventListener('abort',abort,{once:true});
  try{
    renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.setClearColor(0x35281e);renderer.info.autoReset=false;root.append(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','Actual Tinderbox fire comparison WebGL view');
    renderer.debug.checkShaderErrors=true;renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{shaderError=Error('Fire review shader compilation/link failed: '+[gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].filter(Boolean).join(' | '));};
    const gl=renderer.getContext();timerSupport=!!gl.getExtension('EXT_disjoint_timer_query_webgl2');
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fail(Error('WebGL context lost; discard this measurement'));},{signal:controller.signal});
    scene=new T.Scene();const hemi=new T.HemisphereLight(0xfff1d1,0x334852,2.3),sun=new T.DirectionalLight(0xffffff,2.5);sun.position.set(-8,16,6);hemi.userData.reviewEnvironmentLight=sun.userData.reviewEnvironmentLight=true;scene.add(hemi,sun);
    camera=new T.OrthographicCamera(-10,10,10,-10,.1,300);
    try{const delivery=await localManifest(referenceDelivery.manifestUrl);manifest=delivery.manifest;hashes=delivery.hashes;
      fingerprints.reference.runtimeFiles=hashes;availability.reference={available:true,reason:null,sourceCommit:referenceDelivery.sourceCommit||null};}
    catch(cause){availability.reference.reason=cause.message;}
    if(optimizedDelivery){let probe;try{
      if(typeof optimizedDelivery.createFireRealism!=='function'||!optimizedDelivery.manifestUrl)throw Error('Optimized delivery requires its own factory and immutable manifest');
      const delivery=await localManifest(optimizedDelivery.manifestUrl);fingerprints.optimized.runtimeFiles=delivery.hashes;
      if(delivery.manifest.optimizedAvailable!==true)throw Error('Optimized delivery manifest does not declare an optimized export');
      probe=factories.optimized(T,{quality:'optimized',maxCells:1,maxRays:2});if(!probe?.update||!probe?.root||probe.diagnostics?.().quality!=='optimized')throw Error('Optimized export did not supply the optimized mode');
      availability.optimized={available:true,reason:null,sourceCommit:optimizedDelivery.sourceCommit||null};
    }catch(cause){availability.optimized={available:false,reason:cause.message,sourceCommit:optimizedDelivery.sourceCommit||null};}finally{probe?.dispose();}}
    const controlResponse=await fetch(new URL('../../tools/fire-realism/control-manifest.json',import.meta.url));if(!controlResponse.ok)throw Error('Frozen current-fire control manifest unavailable');
    const controlManifest=await controlResponse.json();if(controlManifest.commit!==CONTROL)throw Error('Current-fire control revision mismatch');
    const owned=['src/art/index.js','src/art/fire-frame.js','src/art/fire-review-effect.js','src/art/scene-depth.js','tools/fire-realism/scenarios.js','tools/fire-realism/fixed-pose.js','tools/fire-realism/profiling.js','workbenches/fire-realism/driver.js'];
    for(const path of [...controlManifest.files.map(f=>f.path),...owned]){
      const response=await fetch(new URL('../../'+path,import.meta.url));if(!response.ok)throw Error('Missing comparison source: '+path);
      const bytes=new TextEncoder().encode((await response.text()).split(String.fromCharCode(13)).join(''));
      const sha=globalThis.crypto?.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join(''):null;
      const expected=controlManifest.files.find(f=>f.path===path)?.canonicalSha256;
      if(expected){controlHashes[path]={sha256:sha,expectedSha256:expected,verified:sha===expected};if(sha!==expected)throw Error('Published current-fire source changed: '+path);}
      else adapterHashes[path]={sha256:sha,convention:'Canonical LF owned source; actual local candidate, no source-pin claim'};
    }
    await build(config);
    return {configure:async patch=>{assertUsable();await build(configuration(patch,config));return state();},
      play(){assertUsable();if(!availability[config.mode].available)return state();pauseLoop();phase='playing';lastNow=null;animation=win.requestAnimationFrame(loop);notify(true);return state();},
      pause(){assertUsable();pauseLoop();phase=availability[config.mode].available?'ready':'unavailable';updateArt(true);draw();notify(true);return state();},
      async reset(){assertUsable();pauseLoop();await resetSimulation();phase=availability[config.mode].available?'ready':'unavailable';updateArt(true);draw();notify(true);return state();},
      async step(frames=1){assertUsable();if(!Number.isInteger(frames)||frames<1||frames>3600)throw RangeError('step requires1..3600 frames');pauseLoop();for(let i=0;i<frames;i++){advance();draw();if(i%16===15)await frame();}phase=availability[config.mode].available?'ready':'unavailable';notify(true);return state();},
      async seek(index){assertUsable();if(!Number.isInteger(index)||index<0||index>3600)throw RangeError('seek requires0..3600');pauseLoop();await resetSimulation();for(let i=0;i<index;i++){advance();draw();if(i%16===15)await frame();}phase=availability[config.mode].available?'ready':'unavailable';notify(true);return state();},
      measure(options){assertUsable();measurePromise=measureInternal(options);return measurePromise.finally(()=>{measurePromise=null;});},
      async cancelMeasurement(){if(!measurePromise)return results?clone(results):null;cancelRequested=true;phase='cancelling';notify(true);return measurePromise;},captureFrame({quality=.92}={}){assertUsable();if(!validNumber(quality)||quality<0||quality>1)throw RangeError('JPEGquality requires0..1');draw();return {mimeType:'image/jpeg',dataUrl:renderer.domElement.toDataURL('image/jpeg',quality),configuration:clone(config),frameIndex,tick:snapshot.tick,sourceFingerprints:sources(),hardware:hardware()};},state,dispose};
  }catch(cause){await dispose();throw cause;}
}
