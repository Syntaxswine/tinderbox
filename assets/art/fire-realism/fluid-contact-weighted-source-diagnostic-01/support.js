import {validateGrid} from './space.js';
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function convexHull(points){
  const sorted=points.map(p=>[...p]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).filter((p,i,a)=>!i||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
  if(sorted.length<3)return [];
  const lower=[],upper=[];
  for(const p of sorted){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(let i=sorted.length-1;i>=0;i--){const p=sorted[i];while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}
export function hullPlanes(hull){
  return hull.map((a,i)=>{const b=hull[(i+1)%hull.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length===0)throw Error('Duplicate hull vertex');const nx=dy/length,ny=-dx/length;return[nx,ny,nx*a[0]+ny*a[1]];});
}
export function footprintContains(prism,p,tolerance=1e-10){return prism.planes.every(([nx,ny,c])=>nx*p[0]+ny*p[1]<=c+tolerance);}
export function prismOwnsHeight(prism,z){return z>=prism.lower&&z<prism.upper;}
export function prismContains(prism,p,{halfOpen=true,tolerance=1e-10}={}){
  // Support proof may be tolerant; integration ownership never is.
  const height=halfOpen?prismOwnsHeight(prism,p[2]):p[2]>=prism.lower-tolerance&&p[2]<=prism.upper+tolerance;
  return height&&footprintContains(prism,p,tolerance);
}
/** Conservative union of current/next positive density OR flame, plus exactly
 * one scalar-voxel interpolation support. No threshold, centre shift, crop,
 * occupied-voxel loss or extra density is introduced by this proxy geometry.
 * Bands use scalar-centre heights; a voxel contributes to two disjoint bands.
 */
export function buildSupportPrisms(current,next,grid){
  const count=validateGrid(grid),[nx,ny,nz]=grid.resolution,[hx,hy,hz]=grid.spacing,arrays=[current.density,current.flame,next.density,next.flame];
  for(const a of arrays)if(!(a instanceof Float32Array)||a.length!==count||!a.every(Number.isFinite))throw Error('Expected full finite current/next fields');
  const prisms=[];
  for(let band=-1;band<nz;band++){
    const points=[];
    for(let y=0;y<ny;y++){
      let minX=nx,maxX=-1;
      for(const z of [band,band+1])if(z>=0&&z<nz){
        for(let x=0;x<nx;x++){
          const index=x+nx*(y+ny*z);
          if(arrays.some(a=>a[index]>0)){minX=Math.min(minX,x);maxX=Math.max(maxX,x);}
        }
      }
      if(maxX<0)continue;
      const x0=grid.origin[0]+minX*hx-hx,x1=grid.origin[0]+maxX*hx+hx,y0=grid.origin[1]+y*hy-hy,y1=grid.origin[1]+y*hy+hy;
      points.push([x0,y0],[x1,y0],[x1,y1],[x0,y1]);
    }
    if(!points.length)continue;
    const hull=convexHull(points);if(hull.length<3||hull.length>128)throw Error('Unsupported contour complexity; never truncate a hull');
    const lower=grid.origin[2]+band*hz;
    prisms.push({band,lower,upper:grid.origin[2]+(band+1)*hz,hull,planes:hullPlanes(hull)});
  }
  return prisms;
}
/** Convex halfspaces produce exactly one entry/exit interval per band. */
export function rayPrismInterval(prism,origin,direction){
  const directionScale=Math.hypot(...direction);
  if(![...origin,...direction].every(Number.isFinite)||!Number.isFinite(directionScale)||directionScale===0)throw Error('Invalid ray');
  const parallelEpsilon=Number.EPSILON*8*directionScale; // Planes have unit normals; invariant under ray scaling.
  if(direction[2]===0&&(origin[2]<prism.lower||origin[2]>=prism.upper))return null;
  let enter=-Infinity,exit=Infinity;
  const planes=prism.planes.map(([nx,ny,c])=>[nx,ny,0,c]).concat([[0,0,-1,-prism.lower],[0,0,1,prism.upper]]);
  for(const [nx,ny,nz,c]of planes){const denominator=nx*direction[0]+ny*direction[1]+nz*direction[2],numerator=c-(nx*origin[0]+ny*origin[1]+nz*origin[2]);
    if(Math.abs(denominator)<=parallelEpsilon){if(numerator<0)return null;continue;}
    const t=numerator/denominator;if(denominator>0)exit=Math.min(exit,t);else enter=Math.max(enter,t);
  }
  enter=Math.max(0,enter);return exit>enter?[enter,exit]:null;
}
export function prismGeometry(prism){
  const n=prism.hull.length,vertices=[],indices=[];
  for(const z of [prism.lower,prism.upper])for(const p of prism.hull)vertices.push(p[0],p[1],z);
  for(let i=1;i<n-1;i++){indices.push(0,i+1,i,n,n+i,n+i+1);}
  for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,n+j,i,n+j,n+i);}
  return {vertices,indices};
}
