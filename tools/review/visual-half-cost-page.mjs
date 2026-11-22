// Serialized into the task-owned page; no historical frame/geometry imports.
export async function installVisualBaseline({workload,lane}){
  const main=await import('./src/main.js');main.currentApplication.dispose();
  const [{createRuntime,THREE:T},{createArtScene},{loadCatalogueModules},ui]=await Promise.all([import('./src/runtime/index.js'),import('./src/art/index.js'),import('./src/runtime/catalogue-modules.js'),import('./src/ui/index.js')]);
  const q=window.m30={workload,lane,snap:null,metrics:null,artProfile:null,publication:null,publicationSerial:0,consumedPublication:0,rows:[],ranges:[],sampling:null,queries:[],gpu:new Map(),hostScene:null,renderSerial:0,allRenderSerial:0,preparationRenders:0,consumedPreparationRenders:0,lastNative:null,uploads:{calls:0,bytes:0},point:new T.Vector3(),clip:null};
  window.qa=q; // Reuse the existing in-page endpoint hash utility, latest state only.
  q.poll=()=>{
    if(q.gl.getParameter(q.ext.GPU_DISJOINT_EXT))throw Error('GPU_DISJOINT');
    while(q.queries.length&&q.gl.getQueryParameter(q.queries[0].query,q.gl.QUERY_RESULT_AVAILABLE)){
      const entry=q.queries.shift();q.gpu.set(entry.frame,q.gl.getQueryParameter(entry.query,q.gl.QUERY_RESULT)/1e6);q.gl.deleteQuery(entry.query);
    }
  };
  q.app=main.startApplication({selectedCharacterId:workload.characterId,autoStart:false,createVisit:async(place,options)=>{
    if(place.id!=='catalogue-street')throw Error('UNEXPECTED_MAP');
    const catalogueModules=await loadCatalogueModules({scenario:workload.scenario,signal:options.signal,representation:workload.representation,executionCache:true});
    return createRuntime({root:document.querySelector('#viewport'),uiRoot:document.querySelector('#hud'),scenario:workload.scenario,catalogueModules,seed:workload.seed,characterId:options.characterId,signal:options.signal,
      autoStart:false,mountUI:ui.mountUI,uiOptions:{mode:'gameplay',placeTitle:place.title,onExitToMenu:options.onExitToMenu},onError:options.onError,
      onPublicationProfile:row=>{q.publication={...row,serial:++q.publicationSerial};},
      createArtScene:args=>{q.hostScene=args.scene;return createArtScene({...args,onPresentationProfile:row=>{q.artProfile=row;}});},
      rendererFactory(){
        const renderer=q.renderer=new T.WebGLRenderer({antialias:true,alpha:false}),gl=q.gl=renderer.getContext(),ext=q.ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),render=renderer.render,subData=gl.bufferSubData;
        if(!ext)throw Error('GPU_TIMER_QUERY_UNAVAILABLE');
        gl.bufferSubData=function(...args){const data=args[2],length=args[4]??(data?.length-(args[3]||0));q.uploads.calls++;q.uploads.bytes+=(length||0)*(data?.BYTES_PER_ELEMENT||1);return subData.apply(this,args);};
        renderer.render=function(...args){
          q.allRenderSerial++;if(args[0]!==q.hostScene){q.preparationRenders++;return render.apply(this,args);}
          q.camera=args[1];q.uploads.calls=q.uploads.bytes=0;const frame=++q.renderSerial,query=gl.createQuery();if(!query)throw Error('GPU_QUERY_ALLOCATION');gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
          try{return render.apply(this,args);}finally{gl.endQuery(ext.TIME_ELAPSED_EXT);q.queries.push({query,frame});q.lastRender={frame,uploadCalls:q.uploads.calls,uploadBytes:q.uploads.bytes};}
        };
        return renderer;
      },
      onSnapshot(s,m){q.snap=s;q.metrics=m;},
      onFrameProfile(p){
        const s=q.snap,m=q.metrics,key=s.diagnostics.generation+':'+s.catalogueModules.tick,previous=q.lastNative,newNative=previous!==null&&previous.generation===s.diagnostics.generation&&s.catalogueModules.tick>previous.tick;
        q.lastNative={key,generation:s.diagnostics.generation,tick:s.catalogueModules.tick};
        const pub=q.publication,fresh=pub&&pub.serial!==q.consumedPublication&&pub.tick===s.tick&&pub.generation===s.diagnostics.generation;if(fresh)q.consumedPublication=pub.serial;
        let positiveFlames=0,positiveWallFlames=0,positiveRoofFlames=0,projectedWallFlames=0,projectedRoofFlames=0,smokeSources=0,preheatSmoke=0,grassCells=0,groundFlames=0;
        for(const f of s.structureFire){
          if(f.smoke>0){smokeSources++;if(!(f.flame>0))preheatSmoke++;}
          if(!(f.flame>0))continue;positiveFlames++;const wall=f.part==='walls',roof=f.part==='roof';if(wall)positiveWallFlames++;if(roof)positiveRoofFlames++;
          if(wall||roof){q.point.set(f.x,f.y,f.z).project(q.camera);const visible=Math.abs(q.point.x)<=1&&Math.abs(q.point.y)<=1&&Math.abs(q.point.z)<=1;if(visible&&wall)projectedWallFlames++;if(visible&&roof)projectedRoofFlames++;}
        }
        for(const c of s.cells){if(c.material==='grass')grassCells++;if(c.phase==='burning')groundFlames++;}
        const window=workload.windows.find(w=>w.generation===s.diagnostics.generation&&s.tick>=w.first&&s.tick<=w.last)?.name??null,thermal=s.diagnostics.thermal,publicationMs=fresh?pub.publicationMs:0,host=thermal.timing.hostWork,prior=q.hostCounters?.generation===s.diagnostics.generation?q.hostCounters:null;
        const physicalNestedMs=host.physicalPublicationMs-(prior?.physical??0),rasterNestedMs=host.rasterPublicationMs-(prior?.raster??0);q.hostCounters={generation:s.diagnostics.generation,physical:host.physicalPublicationMs,raster:host.rasterPublicationMs};
        const row={frame:q.lastRender.frame,kind:p.kind,window,generation:s.diagnostics.generation,hostTick:s.tick,nativeTick:s.catalogueModules.tick,worldTime:s.clocks.world,newNative,paused:s.paused,dropped:s.diagnostics.droppedRealSeconds,
          publicationMs,physicalNestedMs,rasterNestedMs,artMs:m.artCpuMs,renderSubmitMs:m.renderSubmitCpuMs,uiMs:m.uiCpuMs,simulationMs:m.simulationMs,fullFrameCpuMs:p.fullFrameCpuMs,
          preparationMs:publicationMs+m.artCpuMs,visualCpuMs:publicationMs+m.artCpuMs+m.renderSubmitCpuMs,stages:{...q.artProfile.stages},drawCalls:m.drawCalls,triangles:q.renderer.info.render.triangles,geometries:m.geometries,textures:m.textures,
          uploadCalls:q.lastRender.uploadCalls,uploadBytes:q.lastRender.uploadBytes,sourceCount:s.structureFire.length,positiveFlames,positiveWallFlames,positiveRoofFlames,projectedWallFlames,projectedRoofFlames,smokeSources,preheatSmoke,grassCells,groundFlames,
          activeCharacters:[s.player,...s.actors].filter(a=>a.characterFire.active).map(a=>a.id),playerX:s.player.x,playerZ:s.player.y,playerElevation:s.player.elevation||0,playerMoving:s.player.moving,playerBurning:s.player.characterFire.active,playerHp:s.player.hp,
          preparationRenderCalls:q.preparationRenders-q.consumedPreparationRenders,totalPreparationRenders:q.preparationRenders,allRenderSerial:q.allRenderSerial,
          cameraPosition:q.camera.position.toArray(),zoom:q.camera.zoom,viewportWidth:m.viewport.width,viewportHeight:m.viewport.height};
        q.rows.push(row);
        q.consumedPreparationRenders=q.preparationRenders;
        if(window&&row.preparationRenderCalls)throw Error('M30_PREPARATION_RENDER_IN_SCORED_WINDOW '+window+' hostTick='+row.hostTick+' count='+row.preparationRenderCalls);
        if(q.sampling&&q.sampling===window)q.ranges.push({frame:row.frame,window,newNative,startMs:p.startMs,endMs:p.endMs,publicationRange:fresh?[pub.startMs,pub.endMs]:null,artRange:p.art,submissionRange:p.submission});
      }
    });
  }});
  q.send=command=>{if(!q.app.visit().dispatch(command))throw Error('REJECTED_RECORDED_INPUT '+JSON.stringify(command));if(q.bodyControl)q.bodyControl.commands.push({hostTick:q.snap.tick+1,...command});};
  q.step=()=>{const start=performance.now();q.app.visit().advance(workload.hostStep);const row=q.rows.at(-1);row.observedAdvanceMs=performance.now()-start;q.poll();};
  q.flush=async()=>{for(let i=0;q.queries.length&&i<120;i++){await new Promise(requestAnimationFrame);q.poll();}if(q.queries.length)throw Error('INCOMPLETE_GPU_RESULTS');};
  q.commands=new Map();for(const entry of workload.commands){const {hostTick,...command}=entry;if(!q.commands.has(hostTick))q.commands.set(hostTick,[]);q.commands.get(hostTick).push(command);}
  q.batch=async(first,last,commands)=>{for(let tick=first;tick<=last;tick++){
    if(q.snap.tick+1!==tick)throw Error('HOST_SEQUENCE_DRIFT '+tick);if(commands)for(const command of q.commands.get(tick)||[])q.send(command);q.step();await new Promise(requestAnimationFrame);
  }};
  // Extra appearance only: ordinary reset and the same oil/match recipe, with
  // every accepted input frozen for later paired replay. No state assignment.
  q.bodyBegin=async()=>{
    if(lane!=='appearance'||q.snap.tick!==1620)throw Error('BODY_CONTROL_SCOPE');
    const [{worldToStick},{DEFAULT_CONFIG}]=await Promise.all([import('./src/simulation/index.js'),import('./src/simulation/config.js')]);
    q.bodyControl={startHostTick:q.snap.tick,steps:0,commands:[],rows:[]};
    q.bodyMove=(x,y,scale)=>q.send({type:'move',...worldToStick({x:x*scale,y:y*scale},DEFAULT_CONFIG.input)});
    q.bodyStep=async phase=>{if(q.bodyControl.steps>=240)throw Error('BODY_EXTRA_STEP_LIMIT');q.step();q.bodyControl.steps++;await new Promise(requestAnimationFrame);const d=q.app.visit().artDiagnostics();const value={phase,hostTick:q.snap.tick,worldTime:q.snap.clocks.world,player:{...q.snap.player},art:{fire:d.fire},zoom:q.camera.zoom};q.bodyControl.rows.push(value);return value;};
    q.send({type:'reset'});await q.bodyStep('normal-reset');
    for(let tick=62;tick<=76;tick++){for(const command of q.commands.get(tick)||[])q.send(command);await q.bodyStep('oil-match-recipe');}
    for(let i=0;i<90;i++){if(q.snap.player.characterFire.active&&q.snap.player.characterFire.age>.4)return {steps:q.bodyControl.steps,age:q.snap.player.characterFire.age};await q.bodyStep('contact-age-wait');}
    throw Error('MATURE_CONTACT_WAIT_LIMIT');
  };
  q.bodyMotion=async count=>{const result=[];for(let i=0;i<count;i++){q.bodyMove(-1,0,.01);result.push(await q.bodyStep('mature-motion'));}return result;};
  q.bodyExit=async()=>{for(let i=0;i<60&&q.snap.player.characterFire.active;i++){q.bodyMove(-1,0,1);await q.bodyStep('natural-exit');}q.bodyMove(0,0,1);await q.bodyStep('stop');return {cleared:!q.snap.player.characterFire.active,steps:q.bodyControl.steps};};
  q.startClip=()=>{
    const stream=q.renderer.domElement.captureStream(30),type=['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(type=>MediaRecorder.isTypeSupported(type));if(!type)throw Error('BODY_CLIP_CODEC');
    q.clip={stream,chunks:[],firstFrame:q.renderSerial+1,firstHost:q.snap.tick+1};q.clip.recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:2500000});q.clip.recorder.ondataavailable=e=>{if(e.data.size)q.clip.chunks.push(e.data);};q.clip.recorder.start();
  };
  q.stopClip=async()=>{
    const c=q.clip;await new Promise(resolve=>{c.recorder.onstop=resolve;c.recorder.stop();});for(const t of c.stream.getTracks())t.stop();const bytes=new Uint8Array(await new Blob(c.chunks,{type:c.recorder.mimeType}).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    const result={base64:btoa(binary),firstHost:c.firstHost,lastHost:q.snap.tick,rows:q.rows.filter(r=>r.frame>=c.firstFrame).map(r=>({hostTick:r.hostTick,world:r.worldTime,x:r.playerX,z:r.playerZ,elevation:r.playerElevation,moving:r.playerMoving,burning:r.playerBurning})),scope:'Untimed appearance only; capture wall duration is not a game FPS measurement'};q.clip=null;return result;
  };
}
