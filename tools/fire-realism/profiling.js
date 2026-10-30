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
export function summarizeFireMeasurements({trials,modes,referenceAcceptance,optimizedAcceptance,sourceFingerprints={}}){
  const byMode=Object.fromEntries([...modes,'no-fire'].map(mode=>[mode,trials.filter(t=>t.mode===mode)]));
  const absolute=Object.fromEntries(Object.entries(byMode).map(([mode,list])=>[mode,statistics(list.flatMap(t=>t.gpu.map(s=>s.gpuMs)))]));
  const increments={},reasons=[];
  for(const mode of modes){
    const pairs=[];
    for(const trial of byMode[mode]){
      const baseline=byMode['no-fire'].find(t=>t.trialIndex===trial.trialIndex&&t.forMode===mode);
      if(!baseline){reasons.push('Missing paired no-fire trial for '+mode);continue;}
      const a=statistics(trial.gpu.map(s=>s.gpuMs)),b=statistics(baseline.gpu.map(s=>s.gpuMs));
      const value=a.median===null||b.median===null?null:a.median-b.median;
      // High scene variance can make subtraction untrustworthy even if positive.
      const noise=2*Math.sqrt((a.variance??Infinity)/Math.max(1,a.count)+(b.variance??Infinity)/Math.max(1,b.count));
      const valid=Number.isFinite(value)&&value>0&&value>noise&&trial.rejected.length===0&&baseline.rejected.length===0&&trial.gpu.length===trial.sampleFrames&&baseline.gpu.length===baseline.sampleFrames;
      pairs.push({trialIndex:trial.trialIndex,fireSceneMedianMs:a.median,noFireMedianMs:b.median,incrementalMs:value,noiseThresholdMs:noise,valid});
      if(!valid)reasons.push('Invalid/noisy incremental GPU subtraction for '+mode+' trial '+trial.trialIndex);
      if(JSON.stringify(trial.workloadTrace)!==JSON.stringify(baseline.workloadTrace))reasons.push('Authoritative workload mismatch for '+mode);
    }
    increments[mode]={...statistics(pairs.filter(p=>p.valid).map(p=>p.incrementalMs)),pairs};
  }
  const reference=increments.reference?.median,optimized=increments.optimized?.median;
  const ratio=Number.isFinite(reference)&&Number.isFinite(optimized)&&reference>0?optimized/reference:null;
  const ref=sourceFingerprints.reference||{},opt=sourceFingerprints.optimized||{};
  const approvedReference=validateQualityReceipt(referenceAcceptance,{kind:'architect-fire-reference-acceptance-v1',sourceCommit:ref.sourceCommit,runtimeFiles:ref.runtimeFiles});
  const retainedQualityAccepted=approvedReference&&validateQualityReceipt(optimizedAcceptance,{kind:'architect-fire-optimized-acceptance-v1',sourceCommit:opt.sourceCommit,runtimeFiles:opt.runtimeFiles,referenceCommit:ref.sourceCommit})?true:null;
  if(ratio===null&&modes.includes('optimized')&&modes.includes('reference'))reasons.push('Missing valid optimized/reference GPU ratio');
  return {absoluteSceneMs:absolute,noFireSceneMs:absolute['no-fire'],incrementalFireMs:increments,reasons:[...new Set(reasons)],
    comparison:{approvedReference,retainedQualityAccepted:retainedQualityAccepted??null,optimizedReferenceRatio:ratio,
      targetMet:ratio===null||!approvedReference||retainedQualityAccepted!==true||reasons.length?null:ratio<=1/3}};
}

export function validateQualityReceipt(receipt,{kind,sourceCommit,runtimeFiles,referenceCommit}={}){
  if(!receipt||receipt.kind!==kind||receipt.status!=='accepted'||!receipt.receiptId||!sourceCommit||receipt.sourceCommit!==sourceCommit)return false;
  if(referenceCommit&&receipt.referenceCommit!==referenceCommit)return false;
  const actual=runtimeFiles||{},keys=Object.keys(actual).sort(),recorded=receipt.runtimeFiles||{};
  return keys.length>0&&JSON.stringify(keys)===JSON.stringify(Object.keys(recorded).sort())&&keys.every(path=>actual[path].verified===true&&actual[path].sha256===recorded[path]);
}
// One outer query includes artist-specific depth preparation and the complete
// selected scene (including retained legacy transients and fire lighting).
export function renderTimedFireFrame({renderer,scene,camera,art,timer=null,index=0}){
  renderer.info.reset();const before=performance.now(),started=timer?.begin(index);
  try{art.beforeRender?.(camera);renderer.render(scene,camera);}finally{if(started)timer.end();}
  return {renderSubmissionMs:performance.now()-before};
}