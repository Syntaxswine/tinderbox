// Synthetic profiler inputs only. These are not GPU evidence or quality receipts.
export function measurementQualityFixture(){
  const referenceModule='assets/art/fire-realism/index.js',optimizedModule='assets/art/fire-realism/optimized/index.js';
  const sourceFingerprints={reference:{mode:'reference',sourceCommit:'1'.repeat(40),factoryModule:referenceModule,factoryExport:'createFireRealism',runtimeFiles:{[referenceModule]:{sha256:'a'.repeat(64),verified:true}}},optimized:{mode:'optimized',sourceCommit:'2'.repeat(40),factoryModule:optimizedModule,factoryExport:'createFireRealism',runtimeFiles:{[optimizedModule]:{sha256:'b'.repeat(64),verified:true}}}};
  const receipt=(mode,kind)=>{const source=sourceFingerprints[mode];return {kind,mode,status:'accepted',receiptId:'synthetic-test-only-'+mode,sourceCommit:source.sourceCommit,factoryModule:source.factoryModule,factoryExport:source.factoryExport,runtimeFiles:Object.fromEntries(Object.entries(source.runtimeFiles).map(([path,file])=>[path,file.sha256]))};};
  const referenceAcceptance=receipt('reference','architect-fire-reference-acceptance-v1'),optimizedAcceptance={...receipt('optimized','architect-fire-optimized-acceptance-v1'),referenceCommit:sourceFingerprints.reference.sourceCommit,referenceFactoryModule:referenceModule,referenceFactoryExport:sourceFingerprints.reference.factoryExport};
  return {sourceFingerprints,referenceAcceptance,optimizedAcceptance};
}
export function measurementTrial(mode,ms,forMode=mode,{trialIndex=0,trialCount=1,sampleFrames=3,burning=128}={}){
  const protocol={method:'EXT_disjoint_timer_query_webgl2',warmupFrames:120,sampleFrames,trials:trialCount,poseFrame:60};
  const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],poseFingerprint='a'.repeat(64),data=Array(16*16*4).fill(0);
  for(let i=0;i<burning;i++)data[i*4+3]=1;
  const configuration={mode,scenario:'street-fire',view:'isometric',lighting:'bright',population:128,seed:1893,characterId:'bear',viewport:{width:1280,height:800,pixelRatio:1}};
  const pose={kind:'fixed-authoritative-pose',frameIndex:60,tick:60,poseFingerprint,initialBurning:burning,activeDischarge:false,activeTorch:false,worldTime:1,playerTime:1,worldScale:1,playerScale:1,
    anchors:{muzzle:{position:[1,1,1],quaternion:[0,0,0,1]}},sourceAppearance:{characterId:'bear',housing:{active:8},field:{width:16,height:16,cellSize:.5,data}},adaptation:'Synthetic fixed-pose unit fixture'};
  const workloadTrace=Array.from({length:sampleFrames},(_,index)=>({poseFingerprint,fingerprint:'b'.repeat(64),tick:60,worldTime:1+(121+index)/60,playerTime:1+(121+index)/60,burning,jet:false,rays:0,torch:'unlit',activeTransientIds:[]}));
  return {mode,forMode,factoryFingerprint:measurementQualityFixture().sourceFingerprints[forMode]||null,trialIndex,sampleFrames,protocol,configuration,pose,renderInputs:{camera:{matrixWorld:[...identity],projectionMatrix:[...identity],near:.1,far:300},canvas:{width:1280,height:800,pixelRatio:1},toneMapping:0,outputColorSpace:'srgb',lighting:[{intensity:2,color:[1,1,1],position:[0,1,0]}]},
    gpu:Array.from({length:sampleFrames},(_,index)=>({index,gpuMs:ms})),rejected:[],workloadTrace};
}
