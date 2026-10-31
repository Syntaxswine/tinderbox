export function statistics(values){
  const valid=values.filter(Number.isFinite),sorted=[...valid].sort((a,b)=>a-b),n=valid.length;
  if(!n)return {count:0,mean:null,median:null,p95:null,variance:null,standardDeviation:null,min:null,max:null};
  const mean=valid.reduce((a,b)=>a+b,0)/n,variance=valid.reduce((a,b)=>a+(b-mean)**2,0)/n;
  return {count:n,mean,median:sorted[Math.floor((n-1)*.5)],p95:sorted[Math.ceil((n-1)*.95)],variance,standardDeviation:Math.sqrt(variance),min:sorted[0],max:sorted[n-1]};
}
export function createGpuTimer(gl){
  const extension=gl.getExtension('EXT_disjoint_timer_query_webgl2'),pending=[],samples=[],rejected=[];
  let active=null,closed=false;
  const available=!!extension&&typeof gl.createQuery==='function';
  function poll(){
    if(!available||closed)return;
    const disjoint=!!gl.getParameter(extension.GPU_DISJOINT_EXT);
    for(let i=pending.length-1;i>=0;i--){
      const record=pending[i];
      if(disjoint){gl.deleteQuery(record.query);rejected.push({index:record.index,reason:'GPU disjoint'});pending.splice(i,1);continue;}
      if(!gl.getQueryParameter(record.query,gl.QUERY_RESULT_AVAILABLE))continue;
      const ns=gl.getQueryParameter(record.query,gl.QUERY_RESULT);gl.deleteQuery(record.query);pending.splice(i,1);
      if(!Number.isFinite(ns)||ns<=0)rejected.push({index:record.index,reason:'Invalid or zero timer result'});
      else samples.push({index:record.index,gpuMs:ns/1e6});
    }
  }
  return {available,reason:available?null:'EXT_disjoint_timer_query_webgl2 is unavailable; GPU cost is unknown',
    begin(index){if(!available||closed)return false;poll();if(active)throw Error('GPU query already active');
      if(pending.length>=32){rejected.push({index,reason:'Timer query queue exhausted'});return false;}
      const query=gl.createQuery();if(!query){rejected.push({index,reason:'Query allocation failed'});return false;}
      active={query,index};gl.beginQuery(extension.TIME_ELAPSED_EXT,query);return true;},
    end(){if(!active)return;gl.endQuery(extension.TIME_ELAPSED_EXT);pending.push(active);active=null;},poll,
    get pending(){return pending.length;},get samples(){return samples.slice().sort((a,b)=>a.index-b.index);},get rejected(){return [...rejected];},
    dispose(){if(closed)return;if(active){gl.endQuery(extension.TIME_ELAPSED_EXT);gl.deleteQuery(active.query);active=null;}for(const p of pending)gl.deleteQuery(p.query);pending.length=0;closed=true;}
  };
}
const finite=Number.isFinite,integer=Number.isInteger;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const vector=(value,size)=>Array.isArray(value)&&value.length===size&&value.every(finite);
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const commitHash=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const exportName=value=>typeof value==='string'&&/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
function factoryPath(path,mode){
  if(typeof path!=='string'||!path.endsWith('.js')||path.split('/').some(part=>!part||part.startsWith('.')||!/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(part)))return false;
  if(mode==='current')return path.startsWith('src/art/');
  const prefix='assets/art/fire-realism/';return mode==='reference'?path.startsWith(prefix)&&!path.startsWith(prefix+'optimized/'):mode==='optimized'&&path.startsWith(prefix+'optimized/');
}
function validFactoryFingerprint(value,{allowDebug=false}={}){
  if(!object(value)||!['current','reference','optimized'].includes(value.mode)||!(commitHash(value.sourceCommit)||allowDebug&&value.mode==='reference'&&value.sourceCommit===null)||!factoryPath(value.factoryModule,value.mode)||!exportName(value.factoryExport))return false;
  if(value.mode==='current'&&(value.factoryModule!=='src/art/fire.js'||value.factoryExport!=='createFire'))return false;
  const files=value.runtimeFiles,keys=object(files)?Object.keys(files):[];
  return keys.length>0&&Object.hasOwn(files,value.factoryModule)&&new Set(keys.map(path=>path.toLowerCase())).size===keys.length&&keys.every(path=>factoryPath(path,value.mode)&&files[path]?.verified===true&&hash(files[path].sha256));
}
function ordered(value){
  if(Array.isArray(value))return value.map(ordered);
  if(object(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])]));
  return value;
}
function same(a,b){try{return JSON.stringify(ordered(a))===JSON.stringify(ordered(b));}catch{return false;}}
function validConfiguration(config){
  const v=config?.viewport;
  return object(config)&&['match-contact','carried-torch','gasoline-front','gasoline-front-powder','wall-clipped-jet','street-fire'].includes(config.scenario)&&
    ['isometric','oblique'].includes(config.view)&&['bright','dim'].includes(config.lighting)&&['bear','goat','horse'].includes(config.characterId)&&Number.isSafeInteger(config.seed)&&
    (config.population===null||config.scenario==='street-fire'&&[32,128,512].includes(config.population))&&object(v)&&integer(v.width)&&v.width>=128&&v.width<=4096&&integer(v.height)&&v.height>=128&&v.height<=4096&&finite(v.pixelRatio)&&v.pixelRatio>=.5&&v.pixelRatio<=1.75;
}
function commonConfiguration(config){if(!object(config))return null;const {mode,...inputs}=config;return inputs;}
function validPose(pose){
  const field=pose?.sourceAppearance?.field,anchors=pose?.anchors;
  return object(pose)&&pose.kind==='fixed-authoritative-pose'&&integer(pose.frameIndex)&&pose.frameIndex>0&&integer(pose.tick)&&pose.tick>=0&&hash(pose.poseFingerprint)&&
    integer(pose.initialBurning)&&pose.initialBurning>=0&&typeof pose.activeDischarge==='boolean'&&typeof pose.activeTorch==='boolean'&&
    [pose.worldTime,pose.playerTime].every(value=>finite(value)&&value>=0)&&[pose.worldScale,pose.playerScale].every(value=>finite(value)&&value>0)&&
    object(anchors)&&Object.keys(anchors).length>0&&Object.values(anchors).every(anchor=>vector(anchor?.position,3)&&vector(anchor?.quaternion,4))&&
    object(field)&&integer(field.width)&&field.width>0&&integer(field.height)&&field.height>0&&finite(field.cellSize)&&field.cellSize>0&&
    Array.isArray(field.data)&&field.data.length===field.width*field.height*4&&field.data.every(finite);
}
function validRenderInputs(inputs,config){
  const camera=inputs?.camera,canvas=inputs?.canvas,v=config?.viewport;
  return object(inputs)&&object(camera)&&vector(camera.matrixWorld,16)&&vector(camera.projectionMatrix,16)&&finite(camera.near)&&finite(camera.far)&&camera.near>0&&camera.far>camera.near&&
    object(canvas)&&v&&canvas.width===Math.floor(v.width*v.pixelRatio)&&canvas.height===Math.floor(v.height*v.pixelRatio)&&canvas.pixelRatio===v.pixelRatio&&
    inputs.toneMapping===0&&inputs.outputColorSpace==='srgb'&&Array.isArray(inputs.lighting)&&inputs.lighting.length>0&&inputs.lighting.every(light=>finite(light.intensity)&&light.intensity>=0&&vector(light.color,3)&&vector(light.position,3));
}
function validProtocol(protocol){return object(protocol)&&protocol.method==='EXT_disjoint_timer_query_webgl2'&&integer(protocol.warmupFrames)&&protocol.warmupFrames>0&&protocol.warmupFrames<=10000&&integer(protocol.sampleFrames)&&protocol.sampleFrames>=2&&protocol.sampleFrames<=10000&&integer(protocol.trials)&&protocol.trials>0&&protocol.trials<=10&&integer(protocol.poseFrame)&&protocol.poseFrame>0&&protocol.poseFrame<=3600;}
function fullSamples(trial,count){return Array.isArray(trial.gpu)&&trial.gpu.length===count&&trial.gpu.every((sample,index)=>sample?.index===index&&finite(sample.gpuMs)&&sample.gpuMs>0)&&Array.isArray(trial.rejected)&&trial.rejected.length===0;}
function validTrace(trial,protocol){
  const pose=trial.pose,trace=trial.workloadTrace;
  if(!validPose(pose)||!Array.isArray(trace)||trace.length!==protocol.sampleFrames)return false;
  return trace.every((sample,index)=>{
    const seconds=(protocol.warmupFrames+index+1)/60;
    return object(sample)&&sample.poseFingerprint===pose.poseFingerprint&&hash(sample.fingerprint)&&sample.tick===pose.tick&&
      finite(sample.worldTime)&&Math.abs(sample.worldTime-(pose.worldTime+seconds*pose.worldScale))<1e-8&&finite(sample.playerTime)&&Math.abs(sample.playerTime-(pose.playerTime+seconds*pose.playerScale))<1e-8&&
      integer(sample.burning)&&sample.burning===pose.initialBurning&&typeof sample.jet==='boolean'&&sample.jet===pose.activeDischarge&&integer(sample.rays)&&sample.rays>=0&&sample.rays<=256&&(!sample.jet||sample.rays>0)&&
      ['unlit','lit','spent'].includes(sample.torch)&&(!pose.activeTorch||sample.torch==='lit')&&Array.isArray(sample.activeTransientIds)&&new Set(sample.activeTransientIds).size===sample.activeTransientIds.length&&sample.activeTransientIds.every(id=>Number.isSafeInteger(id)&&id>0)&&
      (sample.burning>0||sample.jet&&sample.rays>0||pose.activeTorch);
  });
}
export function summarizeFireMeasurements({trials=[],modes=[],protocol,status='complete',referenceAcceptance,optimizedAcceptance,sourceFingerprints={}}={}){
  const reasons=[],allowed=['current','reference','optimized'];
  if(status!=='complete')reasons.push('Measurement status '+String(status)+' is not complete');
  const selected=Array.isArray(modes)?[...new Set(modes.filter(mode=>allowed.includes(mode)))]:[];
  if(!Array.isArray(modes)||!selected.length||selected.length!==modes.length)reasons.push('Invalid or duplicate requested modes');
  const records=Array.isArray(trials)?trials.filter(object):[];
  if(!Array.isArray(trials)||records.length!==trials.length)reasons.push('Invalid measurement trial records');
  const expected=protocol??records[0]?.protocol,protocolOK=validProtocol(expected);
  if(!protocolOK)reasons.push('Missing or invalid measurement protocol');
  if(protocolOK&&records.length!==selected.length*2*expected.trials)reasons.push('Incomplete or extra trials for the declared protocol');
  const byMode=Object.fromEntries([...selected,'no-fire'].map(mode=>[mode,records.filter(trial=>trial.mode===mode)]));
  const absolute=Object.fromEntries(Object.entries(byMode).map(([mode,list])=>[mode,statistics(list.flatMap(trial=>Array.isArray(trial.gpu)?trial.gpu.map(sample=>sample?.gpuMs):[]))]));
  const checked=new Set(),keys=new Set();
  for(const trial of records){
    const key=trial.mode+':'+trial.forMode+':'+trial.trialIndex;
    if(keys.has(key))reasons.push('Duplicate measurement trial '+key);keys.add(key);
    const identity=(selected.includes(trial.mode)&&trial.forMode===trial.mode||trial.mode==='no-fire'&&selected.includes(trial.forMode))&&integer(trial.trialIndex)&&protocolOK&&trial.trialIndex>=0&&trial.trialIndex<expected.trials;
    const inputs=validConfiguration(trial.configuration)&&trial.configuration.mode===trial.mode&&validPose(trial.pose)&&validRenderInputs(trial.renderInputs,trial.configuration);
    const factory=trial.factoryFingerprint,declared=sourceFingerprints?.[trial.forMode];
    const factoryBound=validFactoryFingerprint(factory,{allowDebug:!selected.includes('optimized')})&&factory.mode===trial.forMode&&(!declared||same(factory,declared));
    if(!factoryBound)reasons.push('Missing or mismatched factory entry/source fingerprint for '+key);
    const complete=identity&&inputs&&factoryBound&&same(trial.protocol,expected)&&trial.sampleFrames===expected.sampleFrames&&trial.pose.frameIndex===expected.poseFrame&&fullSamples(trial,expected.sampleFrames)&&validTrace(trial,expected);
    if(complete)checked.add(trial);else reasons.push('Incomplete or invalid input/sample/occupancy evidence for '+key);
  }
  // Compare authoritative inputs, never optimized geometry, instances or draws.
  const anchor=records.find(trial=>trial.mode===(selected.includes('reference')?'reference':selected[0])&&trial.trialIndex===0);
  for(const trial of records){
    const modeAnchor=records.find(record=>record.mode===trial.forMode&&record.trialIndex===0);
    if(modeAnchor&&!same(trial.factoryFingerprint,modeAnchor.factoryFingerprint))reasons.push('Cross-trial or paired factory entry/source mismatch for '+trial.forMode);
    if(!anchor)break;
    if(!same(commonConfiguration(trial.configuration),commonConfiguration(anchor.configuration))||!same(trial.renderInputs,anchor.renderInputs)||!same(trial.pose,anchor.pose)||!same(trial.workloadTrace,anchor.workloadTrace)){
      reasons.push('Cross-mode or cross-trial authoritative workload/configuration/pose mismatch for '+trial.mode+' trial '+trial.trialIndex);
    }
  }
  const increments={};
  for(const mode of selected){
    const pairs=[];
    for(let index=0;index<(protocolOK?expected.trials:1);index++){
      const matching=byMode[mode].filter(trial=>trial.trialIndex===index),baselines=byMode['no-fire'].filter(trial=>trial.trialIndex===index&&trial.forMode===mode);
      if(matching.length!==1||baselines.length!==1){reasons.push('Missing or duplicate paired fire/no-fire trial for '+mode+' trial '+index);continue;}
      const trial=matching[0],baseline=baselines[0],a=statistics((Array.isArray(trial.gpu)?trial.gpu:[]).map(sample=>sample?.gpuMs)),b=statistics((Array.isArray(baseline.gpu)?baseline.gpu:[]).map(sample=>sample?.gpuMs));
      const value=a.median===null||b.median===null?null:a.median-b.median;
      const noise=2*Math.sqrt((a.variance??Infinity)/Math.max(1,a.count)+(b.variance??Infinity)/Math.max(1,b.count));
      const sameWork=same(trial.factoryFingerprint,baseline.factoryFingerprint)&&same(trial.workloadTrace,baseline.workloadTrace)&&same(trial.pose,baseline.pose)&&same(commonConfiguration(trial.configuration),commonConfiguration(baseline.configuration))&&same(trial.renderInputs,baseline.renderInputs);
      const valid=checked.has(trial)&&checked.has(baseline)&&sameWork&&finite(value)&&value>0&&value>noise;
      pairs.push({trialIndex:index,fireSceneMedianMs:a.median,noFireMedianMs:b.median,incrementalMs:value,noiseThresholdMs:noise,valid});
      if(!valid)reasons.push('Invalid/noisy incremental GPU subtraction or paired workload for '+mode+' trial '+index);
    }
    increments[mode]={...statistics(pairs.filter(pair=>pair.valid).map(pair=>pair.incrementalMs)),pairs};
  }
  const reference=increments.reference?.median,optimized=increments.optimized?.median;
  const ratio=reasons.length===0&&finite(reference)&&finite(optimized)&&reference>0?optimized/reference:null;
  const ref=sourceFingerprints?.reference||{},opt=sourceFingerprints?.optimized||{};
  const approvedReference=validateQualityReceipt(referenceAcceptance,{kind:'architect-fire-reference-acceptance-v1',...ref});
  const retainedQualityAccepted=approvedReference&&validateQualityReceipt(optimizedAcceptance,{kind:'architect-fire-optimized-acceptance-v1',...opt,referenceCommit:ref.sourceCommit,referenceFactoryModule:ref.factoryModule,referenceFactoryExport:ref.factoryExport})?true:null;
  if(ratio===null&&selected.includes('optimized')&&selected.includes('reference'))reasons.push('Missing valid comparable optimized/reference GPU ratio');
  return {absoluteSceneMs:absolute,noFireSceneMs:absolute['no-fire'],incrementalFireMs:increments,reasons:[...new Set(reasons)],evidenceStatus:reasons.length?'inconclusive':'complete',
    comparison:{approvedReference,retainedQualityAccepted,optimizedReferenceRatio:ratio,targetMet:ratio===null||!approvedReference||retainedQualityAccepted!==true?null:ratio<=1/3}};
}
export function validateQualityReceipt(receipt,{kind,mode,sourceCommit,factoryModule,factoryExport,runtimeFiles,referenceCommit,referenceFactoryModule,referenceFactoryExport}={}){
  const expectedKind=mode==='reference'?'architect-fire-reference-acceptance-v1':mode==='optimized'?'architect-fire-optimized-acceptance-v1':null;
  if(!expectedKind||kind!==expectedKind||!validFactoryFingerprint({mode,sourceCommit,factoryModule,factoryExport,runtimeFiles})||!receipt||receipt.kind!==kind||receipt.status!=='accepted'||!receipt.receiptId||receipt.mode!==mode||receipt.sourceCommit!==sourceCommit||receipt.factoryModule!==factoryModule||receipt.factoryExport!==factoryExport)return false;
  if(mode==='optimized'&&(!commitHash(referenceCommit)||!factoryPath(referenceFactoryModule,'reference')||!exportName(referenceFactoryExport)||receipt.referenceCommit!==referenceCommit||receipt.referenceFactoryModule!==referenceFactoryModule||receipt.referenceFactoryExport!==referenceFactoryExport))return false;
  const keys=Object.keys(runtimeFiles).sort(),recorded=receipt.runtimeFiles||{};
  return object(recorded)&&JSON.stringify(keys)===JSON.stringify(Object.keys(recorded).sort())&&keys.every(path=>runtimeFiles[path].sha256===recorded[path]);
}
// One outer query includes artist-specific depth preparation and the complete
// selected scene (including retained legacy transients and fire lighting).
export function renderTimedFireFrame({renderer,scene,camera,art,timer=null,index=0}){
  renderer.info.reset();const before=performance.now(),started=timer?.begin(index);
  try{art.beforeRender?.(camera);renderer.render(scene,camera);}finally{if(started)timer.end();}
  return {renderSubmissionMs:performance.now()-before};
}