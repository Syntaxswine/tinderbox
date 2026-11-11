export const EPS=1e-7,round=n=>Math.round(n*1e7)/1e7;
export const add=(a,b)=>a.map((n,i)=>n+b[i]),sub=(a,b)=>a.map((n,i)=>n-b[i]),mul=(a,s)=>a.map(n=>n*s);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),len=a=>Math.hypot(...a),unit=a=>mul(a,1/(len(a)||1));
export const triangleArea=t=>len(cross(sub(t[1],t[0]),sub(t[2],t[0])))/2;
export const normal=t=>unit(cross(sub(t[1],t[0]),sub(t[2],t[0])));
export const bounds=points=>({min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i])))});
export const boundsVolume=b=>b.max.reduce((n,v,i)=>n*Math.max(0,v-b.min[i]),1);
export const polygonTriangles=p=>p.slice(1,-1).map((_,i)=>[p[0],p[i+1],p[i+2]]);
export function clip(poly,metric,inside=true){
 if(poly.length<3)return [];const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],av=metric(a)*(inside?1:-1),bv=metric(b)*(inside?1:-1),ai=av>=-EPS,bi=bv>=-EPS;
  if(ai)out.push(a);if(ai!==bi){const t=av/(av-bv);out.push(a.map((v,k)=>v+(b[k]-v)*t));}
 }
 return out.filter((v,i)=>!i||len(sub(v.slice(0,3),out[i-1].slice(0,3)))>EPS);
}
export function clipBox(poly,b){
 for(let i=0;i<3;i++){poly=clip(poly,v=>v[i]-b.min[i]);poly=clip(poly,v=>b.max[i]-v[i]);if(poly.length<3)return [];}return poly;
}
export function gridPieces(poly,axes=[0,1,2]){
 let result=[poly];
 for(const axis of axes){
  const pitch=axis===1?1.06:.5,origin=axis===1?.48:0,next=[];
  for(const p of result){
   const lo=Math.min(...p.map(v=>v[axis])),hi=Math.max(...p.map(v=>v[axis]));
   if(hi-lo<EPS){next.push(p);continue;}
   for(let j=Math.floor((lo-origin)/pitch+EPS);j<=Math.floor((hi-origin-EPS)/pitch);j++){
    let q=clip(p,v=>v[axis]-(origin+j*pitch));q=clip(q,v=>origin+(j+1)*pitch-v[axis]);
    if(q.length>=3)next.push(q);
   }
  }result=next;
 }return result;
}
export const pointInTriangleXZ=(p,t)=>{const s=t.map((a,i)=>{const b=t[(i+1)%3];return (b[0]-a[0])*(p[1]-a[2])-(b[2]-a[2])*(p[0]-a[0]);});return s.every(n=>n>=-EPS)||s.every(n=>n<=EPS);};
export function distanceToBounds(p,b){return Math.hypot(...p.map((v,i)=>Math.max(b.min[i]-v,0,v-b.max[i])));}
export function nearestSurface(p,surfaces,kind=null,level=null){
 let selected=null,best=Infinity;for(const s of surfaces){if(kind&&s.kind!==kind||level!==null&&s.level!==level)continue;
  const distance=distanceToBounds(p,s.bounds);if(distance<best){best=distance;selected=s;}
 }return selected;
}
export function intervalParts(lo,hi,pitch,origin=0){
 const cuts=[lo];for(let p=origin+(Math.floor((lo-origin)/pitch)+1)*pitch;p<hi-EPS;p+=pitch)cuts.push(p);cuts.push(hi);
 return cuts.slice(1).map((v,i)=>[cuts[i],v]).filter(([a,b])=>b-a>EPS);
}
export function subtractGambrel(poly,piece,plinth){
 const half=piece.span/2,knee=half-piece.kneeRun,ridge=piece.kneeRise+knee*piece.upperPitch,profile=[[-half,0],[-knee,piece.kneeRise],[0,ridge],[knee,piece.kneeRise],[half,0]];
 const run=v=>v[piece.axis==='x'?0:2],q=v=>piece.axis==='x'?v[2]-piece.z:v[0]-piece.x,y=v=>v[1]-plinth-piece.base;
 const planes=[v=>run(v)-piece.runStart,v=>piece.runEnd-run(v),v=>q(v)+half,v=>half-q(v),v=>y(v)];
 for(let i=0;i<4;i++){const a=profile[i],b=profile[i+1],slope=(b[1]-a[1])/(b[0]-a[0]);planes.push(v=>a[1]+slope*(q(v)-a[0])-y(v));}
 let remainder=poly;const outside=[];
 for(const plane of planes){if(remainder.length<3)break;const a=clip(remainder,plane,false);if(a.length>=3)outside.push(a);remainder=clip(remainder,plane);}
 return outside;
}
export function subtractBox(poly,b){
 const planes=[];for(let i=0;i<3;i++){planes.push(v=>v[i]-b.min[i]);planes.push(v=>b.max[i]-v[i]);}
 let remainder=poly;const outside=[];for(const plane of planes){if(remainder.length<3)break;const a=clip(remainder,plane,false);if(a.length>=3)outside.push(a);remainder=clip(remainder,plane);}return outside;
}
