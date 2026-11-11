// Metres, X/Z ground and Y up. Shared by heat, tools, support and navigation.
export const EPS = 1e-7;
export const add = (a,b) => a.map((v,i)=>v+b[i]);
export const sub = (a,b) => a.map((v,i)=>v-b[i]);
export const mul = (a,s) => a.map(v=>v*s);
export const dot = (a,b) => a.reduce((v,x,i)=>v+x*b[i],0);
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const length = a => Math.hypot(...a);
export const unit = a => mul(a,1/(length(a)||1));
export const centre = points => mul(points.reduce(add,[0,0,0]),1/points.length);
export const triangleArea = t => length(cross(sub(t[1],t[0]),sub(t[2],t[0])))/2;
export const bounds = points => ({min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i])))});
export const overlaps = (a,b,margin=EPS) => [0,1,2].every(i=>a.min[i]<=b.max[i]+margin&&a.max[i]>=b.min[i]-margin);
export function clipPolygon(poly,axis,value,above) {
  const out=[];
  for(let i=0;i<poly.length;i++) {
    const a=poly[i],b=poly[(i+1)%poly.length],ia=above?a[axis]>=value-EPS:a[axis]<=value+EPS,ib=above?b[axis]>=value-EPS:b[axis]<=value+EPS;
    if(ia)out.push(a);
    if(ia!==ib) { const t=(value-a[axis])/(b[axis]-a[axis]);out.push(add(a,mul(sub(b,a),t))); }
  }
  return out;
}
export function clipTriangle(triangle,box) {
  let p=triangle;
  for(let axis=0;axis<3&&p.length;axis++)p=clipPolygon(clipPolygon(p,axis,box.min[axis],true),axis,box.max[axis],false);
  return p.slice(1,-1).map((_,i)=>[p[0],p[i+1],p[i+2]]).filter(t=>triangleArea(t)>EPS);
}
export function pointOnTriangle(p,t,tolerance=EPS) {
  const [a,b,c]=t,u=sub(b,a),v=sub(c,a),w=sub(p,a),uu=dot(u,u),vv=dot(v,v),uv=dot(u,v),wu=dot(w,u),wv=dot(w,v),d=uu*vv-uv*uv;
  if(d<EPS*EPS)return false;
  const s=(vv*wu-uv*wv)/d,r=(uu*wv-uv*wu)/d;
  return s>=-tolerance&&r>=-tolerance&&s+r<=1+tolerance;
}
// Includes triangle edges and vertices. Simultaneous diagonal/corner hits are
// all collected; there is no choice among axis-ordered routes around a wall.
export function segmentTriangle(from,to,triangle,thickness=0) {
  const n=unit(cross(sub(triangle[1],triangle[0]),sub(triangle[2],triangle[0]))),a=dot(sub(from,triangle[0]),n),b=dot(sub(to,triangle[0]),n),den=b-a;
  if(Math.abs(den)<EPS) {
    if(Math.abs(a)>thickness/2+EPS)return null;
    for(const t of [0,.25,.5,.75,1])if(pointOnTriangle(add(from,mul(sub(to,from),t)),triangle,EPS*10))return t;
    // Coplanar edge contact, including a segment too short for the samples.
    for(const edge of [[0,1],[1,2],[2,0]]) {
      const c=triangle[edge[0]],d=triangle[edge[1]],axis=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs))),axes=[0,1,2].filter(i=>i!==axis),[i,j]=axes;
      const dx=to[i]-from[i],dy=to[j]-from[j],ex=d[i]-c[i],ey=d[j]-c[j],det=dx*ey-dy*ex;
      if(Math.abs(det)<EPS)continue;
      const rx=c[i]-from[i],ry=c[j]-from[j],t=(rx*ey-ry*ex)/det,u=(rx*dy-ry*dx)/det;
      if(t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS)return Math.max(0,Math.min(1,t));
    }
    return null;
  }
  const t=-a/den;
  if(t< -EPS||t>1+EPS)return null;
  return pointOnTriangle(add(from,mul(sub(to,from),t)),triangle,EPS*10)?Math.max(0,Math.min(1,t)):null;
}

export function createBoundaryIndex(records,binSize=1) {
  const surfaces=new Map(),bins=new Map(),listeners=new Map();let revision=0;
  const binKey=(i,j,k)=>`${i},${j},${k}`;
  function visit(box,fn) { for(let k=Math.floor((box.min[2]-EPS)/binSize);k<=Math.floor((box.max[2]+EPS)/binSize);k++)for(let j=Math.floor((box.min[1]-EPS)/binSize);j<=Math.floor((box.max[1]+EPS)/binSize);j++)for(let i=Math.floor((box.min[0]-EPS)/binSize);i<=Math.floor((box.max[0]+EPS)/binSize);i++)fn(binKey(i,j,k)); }
  function put(record) {
    const old=surfaces.get(record.id);if(old)return old; // one canonical identity
    const s={intact:true,openFraction:0,transmission:0,...record};s.bounds??=bounds(s.triangles.flat());surfaces.set(s.id,s);
    visit(s.bounds,key=>{if(!bins.has(key))bins.set(key,new Set());bins.get(key).add(s);});return s;
  }
  records.forEach(put);
  function candidates(box) { const result=new Set();visit(box,key=>{for(const s of bins.get(key)||[])if(overlaps(box,s.bounds,(s.thickness||0)/2))result.add(s);});return [...result].sort((a,b)=>a.id.localeCompare(b.id)); }
  function crossings(from,to,{ignore=[],includeEndpoints=false}={}) {
    const skip=new Set(ignore),hits=[];
    for(const s of candidates(bounds([from,to]))) {
      if(skip.has(s.id))continue;
      let first=Infinity;
      for(const t of s.triangles) {const hit=segmentTriangle(from,to,t,s.thickness||0);if(hit!==null&&((includeEndpoints)||hit>EPS&&hit<1-EPS))first=Math.min(first,hit);}
      if(first<Infinity)hits.push({surface:s,t:first});
    }
    return hits.sort((a,b)=>a.t-b.t||a.surface.id.localeCompare(b.surface.id));
  }
  const pass=s=>s.intact?Math.max(0,Math.min(1,s.openFraction+(1-s.openFraction)*s.transmission)):1;
  function trace(from,to,options={}) {const hits=crossings(from,to,options);return {hits,transmission:hits.reduce((p,h)=>p*pass(h.surface),1)};}
  function change(id,patch) {
    const s=surfaces.get(id);if(!s)throw Error(`Unknown boundary ${id}`);Object.assign(s,patch);revision++;
    for(const invalidate of listeners.get(id)||[])invalidate();return s;
  }
  function watch(ids,invalidate) {for(const id of ids){if(!listeners.has(id))listeners.set(id,new Set());listeners.get(id).add(invalidate);}}
  function supportAt(x,z,fromY,toY=-10) {
    const hits=crossings([x,fromY,z],[x,toY,z],{includeEndpoints:true});
    return hits.find(h=>h.surface.intact&&h.surface.openFraction<1&&Math.abs(h.surface.normal?.[1]??0)>.2&&h.surface.supports);
  }
  return {surfaces,bins,put,candidates,crossings,trace,change,watch,supportAt,pass,get revision(){return revision;}};
}
