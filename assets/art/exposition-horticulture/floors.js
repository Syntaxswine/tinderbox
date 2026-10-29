// Derived from the preserved Administration floor-cell clipper; native full cells stay unchanged.
import {inside} from './plan.js';
const EPS=1e-8;
export const area=poly=>Math.abs(poly.reduce((v,p,i)=>{const q=poly[(i+1)%poly.length];return v+p[0]*q[1]-q[0]*p[1];},0)/2);
function clip(poly,a,b,keepInside=true){
 const out=[],side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
 for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],sp=side(p),sq=side(q),pin=keepInside?sp>=-EPS:sp<=EPS,qin=keepInside?sq>=-EPS:sq<=EPS;if(pin)out.push(p);if(pin!==qin){const t=sp/(sp-sq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}
 return out.filter((p,i)=>Math.hypot(p[0]-out[(i+out.length-1)%out.length][0],p[1]-out[(i+out.length-1)%out.length][1])>EPS);
}
function intersect(poly,convex){for(let i=0;i<convex.length&&poly.length>=3;i++)poly=clip(poly,convex[i],convex[(i+1)%convex.length]);return poly;}
function subtract(poly,hole){const px=poly.map(p=>p[0]),pz=poly.map(p=>p[1]),hx=hole.map(p=>p[0]),hz=hole.map(p=>p[1]);if(Math.max(...px)<=Math.min(...hx)+EPS||Math.min(...px)>=Math.max(...hx)-EPS||Math.max(...pz)<=Math.min(...hz)+EPS||Math.min(...pz)>=Math.max(...hz)-EPS)return[poly];const parts=[];for(let i=0;i<hole.length&&poly.length>=3;i++){const outside=clip(poly,hole[i],hole[(i+1)%hole.length],false);if(outside.length>=3&&area(outside)>EPS)parts.push(outside);poly=clip(poly,hole[i],hole[(i+1)%hole.length]);}return parts;}
export function compileFloor(floor){
 const cells=[],keys=new Set();
 for(const outline of floor.polygons){
  const orthogonal=outline.every((p,i)=>{const q=outline[(i+1)%outline.length];return (p[0]===q[0]||p[1]===q[1])&&p.every(Number.isInteger);});
  const xs=outline.map(p=>p[0]),zs=outline.map(p=>p[1]);
  for(let x=Math.floor(Math.min(...xs));x<Math.ceil(Math.max(...xs));x++)for(let z=Math.floor(Math.min(...zs));z<Math.ceil(Math.max(...zs));z++){
   if(orthogonal&&!inside(x+.5,z+.5,outline))continue;
   let pieces=[[[x,z],[x+1,z],[x+1,z+1],[x,z+1]]];if(!orthogonal)pieces=pieces.map(p=>intersect(p,outline)).filter(p=>p.length>=3&&area(p)>EPS);
   for(const hole of floor.holes)pieces=pieces.flatMap(p=>subtract(p,hole));
   for(const [part,polygon] of pieces.entries()){
    const surface=area(polygon);if(surface<EPS)continue;const id=x+','+z+'/'+part;if(keys.has(id))throw Error('Overlapping floor cell '+id);keys.add(id);
    const full=Math.abs(surface-1)<EPS;cells.push({x,z,part,full,polygon,area:surface});
   }
  }
 }
 return cells;
}
