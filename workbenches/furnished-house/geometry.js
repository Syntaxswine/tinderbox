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
const prepared=new WeakMap();
function prepareTriangle(t) {
  let p=prepared.get(t);if(p)return p;
  const a=t[0],ux=t[1][0]-a[0],uy=t[1][1]-a[1],uz=t[1][2]-a[2],vx=t[2][0]-a[0],vy=t[2][1]-a[1],vz=t[2][2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,nn=Math.hypot(nx,ny,nz),uu=ux*ux+uy*uy+uz*uz,vv=vx*vx+vy*vy+vz*vz,uv=ux*vx+uy*vy+uz*vz;
  p={a,ux,uy,uz,vx,vy,vz,nx:nx/nn,ny:ny/nn,nz:nz/nn,uu,vv,uv,inverse:1/(uu*vv-uv*uv)};prepared.set(t,p);return p;
}
export function segmentTriangle(from,to,triangle,thickness=0) {
  const p=prepareTriangle(triangle),ax=from[0]-p.a[0],ay=from[1]-p.a[1],az=from[2]-p.a[2],dx=to[0]-from[0],dy=to[1]-from[1],dz=to[2]-from[2],a=ax*p.nx+ay*p.ny+az*p.nz,den=dx*p.nx+dy*p.ny+dz*p.nz;
  if(Math.abs(den)<EPS) {
    if(Math.abs(a)>thickness/2+EPS)return null;
    const wu=ax*p.ux+ay*p.uy+az*p.uz,wv=ax*p.vx+ay*p.vy+az*p.vz,s=(p.vv*wu-p.uv*wv)*p.inverse,r=(p.uu*wv-p.uv*wu)*p.inverse;if(s>=-EPS&&r>=-EPS&&s+r<=1+EPS)return 0;
    const axis=Math.abs(p.nx)>Math.abs(p.ny)?(Math.abs(p.nx)>Math.abs(p.nz)?0:2):(Math.abs(p.ny)>Math.abs(p.nz)?1:2),i=(axis+1)%3,j=(axis+2)%3;
    for(let edge=0;edge<3;edge++) {
      const c=triangle[edge],d=triangle[(edge+1)%3],ex=d[i]-c[i],ey=d[j]-c[j],fx=to[i]-from[i],fy=to[j]-from[j],det=fx*ey-fy*ex;if(Math.abs(det)<EPS)continue;
      const rx=c[i]-from[i],ry=c[j]-from[j],t=(rx*ey-ry*ex)/det,u=(rx*fy-ry*fx)/det;if(t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS)return Math.max(0,Math.min(1,t));
    }
    return null;
  }
  const t=-a/den;if(t< -EPS||t>1+EPS)return null;
  const x=ax+dx*t,y=ay+dy*t,z=az+dz*t,wu=x*p.ux+y*p.uy+z*p.uz,wv=x*p.vx+y*p.vy+z*p.vz,s=(p.vv*wu-p.uv*wv)*p.inverse,r=(p.uu*wv-p.uv*wu)*p.inverse;
  return s>=-EPS&&r>=-EPS&&s+r<=1+EPS?Math.max(0,Math.min(1,t)):null;
}
function segmentBox(from,to,b) {
  let low=0,high=1;
  for(let i=0;i<3;i++){const d=to[i]-from[i];if(Math.abs(d)<EPS){if(from[i]<b.min[i]-EPS||from[i]>b.max[i]+EPS)return false;}else{const a=(b.min[i]-EPS-from[i])/d,c=(b.max[i]+EPS-from[i])/d;low=Math.max(low,Math.min(a,c));high=Math.min(high,Math.max(a,c));if(low>high)return false;}}
  return true;
}

export function createBoundaryIndex(records,binSize=1) {
  const surfaces=new Map(),bins=new Map(),listeners=new Map(),pathListeners=new Map();let revision=0;
  const binKey=(i,j,k)=>`${i},${j},${k}`;
  function visit(box,fn) { for(let k=Math.floor((box.min[2]-EPS)/binSize);k<=Math.floor((box.max[2]+EPS)/binSize);k++)for(let j=Math.floor((box.min[1]-EPS)/binSize);j<=Math.floor((box.max[1]+EPS)/binSize);j++)for(let i=Math.floor((box.min[0]-EPS)/binSize);i<=Math.floor((box.max[0]+EPS)/binSize);i++)fn(binKey(i,j,k)); }
  function put(record) {
    const old=surfaces.get(record.id);if(old)return old; // one canonical identity
    const s={intact:true,openFraction:0,transmission:0,...record};s.bounds??=bounds(s.triangles.flat());surfaces.set(s.id,s);
    visit(s.bounds,key=>{if(!bins.has(key))bins.set(key,new Set());bins.get(key).add(s);});return s;
  }
  records.forEach(put);
  function candidates(box) { const result=new Set();visit(box,key=>{for(const s of bins.get(key)||[])if(overlaps(box,s.bounds,(s.thickness||0)/2))result.add(s);});return [...result].sort((a,b)=>a.id.localeCompare(b.id)); }
  function segmentCandidates(from,to,onBin=null) {
    const result=new Set(),delta=sub(to,from),c=from.map(v=>Math.floor(v/binSize)),end=to.map(v=>Math.floor(v/binSize)),step=delta.map(Math.sign),next=c.map((v,i)=>step[i]?(((v+(step[i]>0?1:0))*binSize-from[i])/delta[i]):Infinity),increment=delta.map(v=>v?binSize/Math.abs(v):Infinity);
    const include=cell=>{const key=binKey(...cell);onBin?.(key);for(const s of bins.get(key)||[])result.add(s);};include(c);
    const limit=end.reduce((n,v,i)=>n+Math.abs(v-c[i]),0)+4;
    for(let n=0;n<limit;n++) {
      const t=Math.min(...next);if(t>1+EPS||!Number.isFinite(t))break;
      const axes=[0,1,2].filter(i=>Math.abs(next[i]-t)<EPS);
      // All subsets at a simultaneous crossing include edge and corner bins.
      for(let mask=1;mask<1<<axes.length;mask++){const touched=[...c];for(let a=0;a<axes.length;a++)if(mask>>a&1)touched[axes[a]]+=step[axes[a]];include(touched);}
      for(const i of axes){c[i]+=step[i];next[i]+=increment[i];}
    }
    return [...result].sort((a,b)=>a.id.localeCompare(b.id));
  }
  function crossings(from,to,{ignore=[],includeEndpoints=false}={}) {
    const skip=new Set(ignore),hits=[];
    for(const s of segmentCandidates(from,to)) {
      if(skip.has(s.id)||!segmentBox(from,to,s.bounds))continue;
      let first=Infinity;
      for(const t of s.solidTriangles||s.triangles) {const hit=segmentTriangle(from,to,t,s.thickness||0);if(hit!==null&&((includeEndpoints)||hit>EPS&&hit<1-EPS))first=Math.min(first,hit);}
      if(first<Infinity)hits.push({surface:s,t:first});
    }
    hits.sort((a,b)=>a.t-b.t||a.surface.id.localeCompare(b.surface.id));
    // Subdivision seams represent one physical sheet. Distinct sheets at a
    // corner still all count, including when they meet at the same parameter.
    return hits.filter((hit,i)=>!hits.slice(0,i).some(other=>other.surface.sourceSurfaceId&&other.surface.sourceSurfaceId===hit.surface.sourceSurfaceId&&Math.abs(other.t-hit.t)<EPS));
  }
  const pass=s=>s.intact?(s.actualDoorPose?s.transmission:Math.max(0,Math.min(1,s.openFraction+(1-s.openFraction)*s.transmission))):1;
  function trace(from,to,options={}) {const hits=crossings(from,to,options);return {hits,transmission:hits.reduce((p,h)=>p*pass(h.surface),1)};}
  function change(id,patch) {
    const s=surfaces.get(id);if(!s)throw Error(`Unknown boundary ${id}`);
    const moved=Object.hasOwn(patch,'solidTriangles')||Object.hasOwn(patch,'bounds'),affected=new Set();
    if(moved)visit(s.bounds,key=>{bins.get(key)?.delete(s);for(const fn of pathListeners.get(key)||[])affected.add(fn);});
    Object.assign(s,patch);revision++;
    if(moved)visit(s.bounds,key=>{if(!bins.has(key))bins.set(key,new Set());bins.get(key).add(s);for(const fn of pathListeners.get(key)||[])affected.add(fn);});
    for(const fn of affected)fn();
    for(const invalidate of listeners.get(id)||[])invalidate();return s;
  }
  function watch(ids,invalidate) {for(const id of ids){if(!listeners.has(id))listeners.set(id,new Set());listeners.get(id).add(invalidate);}}
  function watchPath(from,to,invalidate) {segmentCandidates(from,to,key=>{if(!pathListeners.has(key))pathListeners.set(key,new Set());pathListeners.get(key).add(invalidate);});}
  function supportAt(x,z,fromY,toY=-10) {
    const hits=crossings([x,fromY,z],[x,toY,z],{includeEndpoints:true});
    return hits.find(h=>h.surface.intact&&h.surface.openFraction<1&&Math.abs(h.surface.normal?.[1]??0)>.2&&h.surface.supports);
  }
  return {surfaces,bins,put,candidates,crossings,trace,change,watch,watchPath,supportAt,pass,get revision(){return revision;}};
}
