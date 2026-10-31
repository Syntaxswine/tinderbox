/** Fixed unclipped numeric vectors; no live controls or visual score. */
export function gpuProbeCases(){
  const layer=(kind='derived-six',extra={})=>({kind,r:.2,ks:.4,fire:[.04,.015,.004],soot:[.002,.003,.004],length:1,steps:1,legibility:1,...extra}),bg={rgb:[.1,.2,.3],alpha:1},zero={rgb:[0,0,0],alpha:0},cases=[];
  cases.push({id:'empty',background:bg,layers:[layer('derived-six',{r:0,ks:0})]});
  cases.push({id:'emission-at-alpha0',background:zero,layers:[layer('derived-six',{r:.25,ks:0,length:.5,steps:8})],requireEmissionAtA0:true});
  cases.push({id:'emission-over-known-background',background:bg,layers:[layer('derived-six',{r:.2,ks:0,steps:4})]});
  cases.push({id:'beer-alpha',background:zero,layers:[layer('derived-six',{r:0,ks:.7,fire:[0,0,0],soot:[0,0,0],steps:8})]});
  cases.push({id:'beer-background',background:{rgb:[.4,.3,.2],alpha:1},layers:[layer('derived-six',{r:0,ks:.7,fire:[0,0,0],soot:[0,0,0],steps:8})]});
  for(const kind of ['derived-six','preserved-one'])for(const steps of [1,2,4,16,64])cases.push({id:kind+'-subdivision-'+steps,background:bg,layers:[layer(kind,{steps})],subdivisionGroup:kind});
  cases.push({id:'small-tau',background:zero,layers:[layer('derived-six',{r:.1,ks:1e-6,steps:64})]});
  cases.push({id:'readability-fade',background:bg,layers:[layer('derived-six',{legibility:.48,steps:8})]});
  const far=layer('derived-six',{r:.4,ks:.05,length:.5,fire:[.06,.01,.003],steps:8}),near=layer('derived-six',{r:0,ks:1,length:.7,fire:[0,0,0],soot:[.001,.001,.001],steps:8});
  cases.push({id:'ordered-far-then-near',background:bg,layers:[far,near]});cases.push({id:'reverse-near-then-far',background:bg,layers:[near,far]});
  cases.push({id:'four-associated-bands',background:bg,layers:Array.from({length:4},()=>layer('derived-six',{length:.25,steps:4}))});
  for(const kind of ['derived-six','preserved-one'])cases.push({id:'paired-F0-'+kind,background:bg,layers:[layer(kind,{r:0,ks:.4,steps:16})],pairedF0:true});
  cases.push({id:'declared-source-saturation',background:zero,layers:[layer('derived-six',{r:1,ks:0,fire:[1.65,.3,.01],length:.25,steps:16})],expectedSaturation:[0]});
  cases.push({id:'declared-composite-saturation',background:{rgb:[.9,.9,.9],alpha:1},layers:[layer('derived-six',{r:.5,ks:0,fire:[.04,.015,.004],length:1,steps:16})],expectedSaturation:[0,1,2]});
  for(const c of cases)c.expectedSaturation??=[];
  if(cases.length>32)throw Error('Bounded case count exceeded');return cases;
}
