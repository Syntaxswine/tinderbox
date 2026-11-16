// CDP sampling attribution is diagnostic, not a replacement for the measured P.
// Only samples overlapping actual NEW-native-state advance calls are included.
export function summarizeFireCpuProfile(profile,ranges,navigationStartSeconds){
  const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();
  for(const node of profile.nodes)for(const child of node.children||[])parents.set(child,node.id);
  const selected=ranges.filter(r=>r.primary&&r.nativeTick>=721&&r.nativeTick<=780);
  if(selected.length!==60)throw Error('CPU profile must contain exactly60 new native states');
  const offset=navigationStartSeconds*1e6,intervals=selected.map(r=>[offset+r.startMs*1000,offset+r.endMs*1000]);
  const functions=new Map(),categories={publication:0,art:0,nativeStructures:0,unattributed:0};let time=profile.startTime,totalMs=0,selectedSamples=0;
  function location(node){const c=node.callFrame;let url=c.url||'<runtime/harness>';try{url=new URL(url).pathname.replace(/^\/tinderbox\//,'');}catch{}return {name:c.functionName||'<anonymous>',url,line:c.lineNumber+1,column:c.columnNumber+1};}
  for(let i=0;i<(profile.samples||[]).length;i++){
    const end=time+profile.timeDeltas[i];let weight=0;for(const [lo,hi]of intervals)weight+=Math.max(0,Math.min(end,hi)-Math.max(time,lo));time=end;if(!weight)continue;
    const ms=weight/1000;selectedSamples++;totalMs+=ms;const stack=[];let id=profile.samples[i];while(id!==undefined){const node=nodes.get(id);if(!node)break;stack.push(node);id=parents.get(id);}
    const publication=stack.some(n=>n.callFrame.functionName==='physicalFrame'&&n.callFrame.url.endsWith('/src/simulation/catalogue-thermal.js'));
    const art=stack.some(n=>n.callFrame.functionName==='update'&&n.callFrame.url.endsWith('/src/art/index.js'));
    const native=stack.some(n=>n.callFrame.functionName==='update'&&n.callFrame.url.endsWith('/art/source/catalogue-modular/thermal-art.js'));
    if(publication)categories.publication+=ms;if(art)categories.art+=ms;if(native)categories.nativeStructures+=ms;if(!publication&&!art)categories.unattributed+=ms;
    const seen=new Set();for(let depth=0;depth<stack.length;depth++){
      const loc=location(stack[depth]),key=JSON.stringify(loc);let row=functions.get(key);if(!row){row={...loc,selfMs:0,totalMs:0,PselfMs:0,PtotalMs:0,publicationSelfMs:0,publicationTotalMs:0,nativeSelfMs:0,nativeTotalMs:0};functions.set(key,row);}
      if(depth===0){row.selfMs+=ms;if(publication||art)row.PselfMs+=ms;if(publication)row.publicationSelfMs+=ms;if(native)row.nativeSelfMs+=ms;}
      if(!seen.has(key)){row.totalMs+=ms;if(publication||art)row.PtotalMs+=ms;if(publication)row.publicationTotalMs+=ms;if(native)row.nativeTotalMs+=ms;seen.add(key);}
    }
  }
  const rows=[...functions.values()];
  return {scope:'CDP250us sampling attribution inside60 actual new-state runtime.advance calls, including native calls/waits; overhead means these are not the P benchmark values',nativeStates:60,selectedSamples,selectedAdvanceMs:selected.reduce((sum,r)=>sum+r.endMs-r.startMs,0),sampledMs:totalMs,categories,
    hottestPSelf:rows.filter(r=>r.PselfMs>0).sort((a,b)=>b.PselfMs-a.PselfMs).slice(0,24),hottestPTotal:rows.filter(r=>r.PtotalMs>0).sort((a,b)=>b.PtotalMs-a.PtotalMs).slice(0,24),hottestAllSelf:[...rows].sort((a,b)=>b.selfMs-a.selfMs).slice(0,20),
    requestedFunctions:rows.filter(r=>/finish|traverse|updateMatrixWorld|physicalFrame|frame|fireSamples|publishedBounds|connectGroup|geometry|classifySample|resolveSample/.test(r.name)||/catalogue-modular\/art\.js$/.test(r.url)),functions:rows};
}
