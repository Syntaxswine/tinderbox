// Read-only f32LE assessment math, adapted from the pinned V5 audit/profile sources.
export const need=(ok,message)=>{if(!ok)throw Error(message);};
export const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const CHANNELS=Object.freeze(['density','temperature','flame']);
export const THRESHOLDS=Object.freeze([0,.0001,.01,.1,.5]);
export function validateSamples(manifest,grid){
 need(manifest.sampleCount===193&&manifest.samples?.length===193,'Require exactly 193 samples');
 const count=grid.resolution.reduce((a,b)=>a*b,1),bytes=count*4;
 for(let i=0;i<193;i++){
  const s=manifest.samples[i];need(s.frame===i+1&&s.ageSeconds===i/30,'Frame/age mismatch');
  for(const [key,value]of Object.entries({resolution:grid.resolution,voxelSize:grid.voxelSize,scalarCentreOriginBlender:grid.gridOrigin,domainBoundsBlender:grid.domainBounds}))need(equal(s[key],value),'Grid mapping mismatch: '+key);
  need(s.contactBandHeight===grid.contactBandHeight,'Contact band mismatch');
  need(equal(Object.keys(s.channels??{}).sort(),[...CHANNELS].sort()),'Exact D/T/F channels required');
  need(equal(Object.keys(s.support??{}).sort(),['density','flame']),'Exact saved D/F support required');
  for(const c of CHANNELS){
   const r=s.channels[c],p=`fields/${c}-${String(i+1).padStart(3,'0')}.f32`;
   need(r.path===p&&r.bytes===bytes&&/^[a-f0-9]{64}$/.test(r.sha256),'Canonical field record required');
   need(Number.isFinite(r.min)&&Number.isFinite(r.max)&&r.min<=r.max&&Number.isInteger(r.nonzero)&&Number.isInteger(r.positive)&&r.nonzero>=r.positive&&r.nonzero<=count&&r.positive>=0,'Invalid saved statistics');
  }
 }
 return manifest.samples.flatMap(s=>CHANNELS.map(c=>s.channels[c].path.slice(7))).sort();
}
export function scanField(bytes,grid,{profile=false,check=()=>{}}={}){
 const [nx,ny,nz]=grid.resolution,n=nx*ny*nz,origin=grid.gridOrigin,h=grid.voxelSize,volume=h[0]*h[1]*h[2];
 need(bytes.byteLength===n*4&&[nx,ny,nz].every(x=>Number.isInteger(x)&&x>0),'Full-sized f32LE grid required');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),layers=Array(nz).fill(null),heightSums=new Float64Array(nz),heightMax=new Float64Array(nz);
 const faces={xMin:0,xMax:0,yMin:0,yMax:0,zMin:0,zMax:0},lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 const thresholds=profile?THRESHOLDS.map(threshold=>({threshold,strictlyGreater:true,voxels:0,minNativeY:null,maxNativeY:null,sumF:0})):[];
 let min=Infinity,max=-Infinity,sum=0,positive=0,nonzero=0,negative=0,negativeZero=0,nonzeroBits=0,below=0,boundary=0,contactOutside=0;
 for(let z=0;z<nz;z++){
  check();const pz=origin[2]+z*h[2];
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
   const i=x+nx*(y+ny*z),v=view.getFloat32(i*4,true),bits=view.getUint32(i*4,true);
   need(Number.isFinite(v),'Nonfinite scalar');min=Math.min(min,v);max=Math.max(max,v);sum+=v;
   if(bits!==0)nonzeroBits++;if(bits===0x80000000)negativeZero++;if(v!==0)nonzero++;if(v<0)negative++;
   heightSums[z]+=v;heightMax[z]=Math.max(heightMax[z],v);
   if(v>0){
    positive++;const p=[origin[0]+x*h[0],origin[1]+y*h[1],pz];
    for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],p[a]);hi[a]=Math.max(hi[a],p[a]);}
    if(pz<0)below++;
    if(pz<=grid.contactBandHeight&&(Math.abs(p[0])>.5||Math.abs(p[1])>.5))contactOutside++;
    const edge=[x===0,x===nx-1,y===0,y===ny-1,z===0,z===nz-1];if(edge.some(Boolean))boundary++;
    Object.keys(faces).forEach((k,a)=>{if(edge[a])faces[k]++;});
    let l=layers[z];if(!l)l=layers[z]={minXY:[x,y],maxXY:[x,y],positiveVoxels:0};l.positiveVoxels++;
    l.minXY[0]=Math.min(l.minXY[0],x);l.minXY[1]=Math.min(l.minXY[1],y);l.maxXY[0]=Math.max(l.maxXY[0],x);l.maxXY[1]=Math.max(l.maxXY[1],y);
   }
   for(const t of thresholds)if(v>t.threshold){t.voxels++;t.sumF+=v;t.minNativeY=t.minNativeY===null?pz:Math.min(t.minNativeY,pz);t.maxNativeY=t.maxNativeY===null?pz:Math.max(t.maxNativeY,pz);}
  }
 }
 const bounds=positive?{min:lo,max:hi}:null;
 const support={positiveVoxels:positive,positiveCentreBoundsBlender:bounds,oneVoxelHaloBoundsBlender:bounds?{min:lo.map((v,i)=>v-h[i]),max:hi.map((v,i)=>v+h[i])}:null,boundaryVoxels:faces,hasBoundaryReaction:Object.values(faces).some(v=>v>0),lowerBandOutsidePatchVoxels:contactOutside,layers,threshold:0};
 const result={min,max,nonzero,positive,negative,negativeZero,nonzeroBits,sum,integral:sum*volume,belowGroundPositive:below,boundaryPositive:boundary,support};
 if(profile){
  need(negative===0,'Flame profiles require nonnegative F');
  const rows=Array.from(heightSums,(sumF,z)=>({z,centreNativeY:origin[2]+z*h[2],sumF,integral:sumF*volume,maxF:heightMax[z],positiveVoxels:layers[z]?.positiveVoxels??0}));
  const weightedQuantiles=[.5,.9,.95,.99].map(q=>{let total=0;return{q,centreNativeY:sum>0?(rows.find(r=>(total+=r.sumF)>=sum*q)?.centreNativeY??null):null};});
  const fractionsAbove=[0,.1,.25,.5,1].map(height=>({height,sumFFraction:sum>0?rows.filter(l=>l.centreNativeY>height).reduce((a,l)=>a+l.sumF,0)/sum:null}));
  result.profile={positiveVoxels:positive,maxF:max,sumF:sum,integral:sum*volume,thresholds,weightedQuantiles,fractionsAbove,layers:rows};
 }
 return result;
}
export function connectivity(bytes,resolution,check=()=>{}){
 // Descriptive 6-face connectivity at F>0; does not identify rendered folds.
 const [nx,ny,nz]=resolution,n=nx*ny*nz,plane=nx*ny,view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),seen=new Uint8Array(n),queue=new Uint32Array(n);
 let components=0,largestVoxels=0,largestSumF=0,totalF=0;
 for(let i=0;i<n;i++){if(i%4096===0)check();const v=view.getFloat32(4*i,true);if(v>0)totalF+=v;if(seen[i]||v<=0)continue;
  components++;let head=0,tail=1,weight=0;queue[0]=i;seen[i]=1;
  while(head<tail){if(head%4096===0)check();const j=queue[head++],x=j%nx,y=Math.floor(j/nx)%ny,z=Math.floor(j/plane);weight+=view.getFloat32(4*j,true);
   for(const k of[x>0?j-1:-1,x<nx-1?j+1:-1,y>0?j-nx:-1,y<ny-1?j+nx:-1,z>0?j-plane:-1,z<nz-1?j+plane:-1])if(k>=0&&!seen[k]&&view.getFloat32(4*k,true)>0){seen[k]=1;queue[tail++]=k;}
  }
  largestVoxels=Math.max(largestVoxels,tail);largestSumF=Math.max(largestSumF,weight);
 }
 return{definition:'6-face adjacency at strictly F>0; no interpolated topology or visible-fold claim',components,largestVoxels,largestComponentSumFFraction:totalF>0?largestSumF/totalF:null,temporaryBytes:n*5};
}
export function sameIntegral(a,b){return a===b||Number.isFinite(a)&&Number.isFinite(b)&&a!==0&&b!==0&&Math.abs(a-b)<=Math.max(Math.abs(a),Math.abs(b))*1e-12;}
export function compareTerminal(actual,saved){
 for(const k of['rawGatesPassed','failures','peakMaximum','lastPositiveAge','initialAllThreeChannelsActuallyZero'])need(equal(actual[k],saved[k]),'Saved terminal mismatch: '+k);
 need(actual.peakIntegral.age===saved.peakIntegral.age&&sameIntegral(actual.peakIntegral.value,saved.peakIntegral.value),'Saved peak integral mismatch');
 for(const k of['requiredSamples','finalApproach']){
  need(actual[k].length===saved[k].length,'Saved terminal row count mismatch');
  actual[k].forEach((r,i)=>{for(const key of Object.keys(r))need(key==='integral'?sameIntegral(r[key],saved[k][i][key]):r[key]===saved[k][i][key],'Saved terminal row mismatch: '+key);});
 }
}
export function terminalReport(rows,initial){
 need(rows.length===193&&rows.every((r,i)=>r.frame===i+1&&r.age===i/30),'Complete flame clock required');
 const pi=rows.reduce((a,b)=>b.integral>a.integral?b:a),pm=rows.reduce((a,b)=>b.max>a.max?b:a),reasons=[],sentinel=rows[90];
 for(const r of rows){
  if(r.age>=3.2&&r.nonzero!==0)reasons.push('raw flame not exactly zero at/after3.2 frame'+r.frame);
  if(r.age>=2.8&&r.age<=3&&r.positive===0)reasons.push('early cold gap in final persistence frame'+r.frame);
  if(r.belowGroundPositive||r.boundaryPositive)reasons.push('raw below-ground/domain-boundary reaction frame'+r.frame);
  if(r.min<0)reasons.push('negative flame proxy frame'+r.frame);
 }
 if(sentinel.max<.05)reasons.push('age3.0 flame maximum below.05 author sentinel');
 if(pi.integral<=0||sentinel.integral<.01*pi.integral)reasons.push('age3.0 integral below1%candidatepeak author sentinel');
 if(!initial)reasons.push('Initial actual fields are not all zero; no preroll or fabrication permitted');
 return{rawGatesPassed:reasons.length===0,failures:reasons,peakMaximum:{value:pm.max,age:pm.age},peakIntegral:{value:pi.integral,age:pi.age},lastPositiveAge:rows.findLast(r=>r.positive>0)?.age??null,requiredSamples:[91,96,97,98].map(f=>rows[f-1]),finalApproach:rows.filter(r=>r.age>=2.8&&r.age<=97/30),initialAllThreeChannelsActuallyZero:initial};
}
