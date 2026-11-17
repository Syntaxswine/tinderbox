// Shared source-polygon subtraction, extracted without changing the offline
// place compiler's arithmetic. Coordinates are metres in the X/Z plane.
export const polygonArea=p=>Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2);
function clip(poly,a,b,keep){
  const out=[],side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],sp=side(p),sq=side(q),pin=keep?sp>=-1e-8:sp<=1e-8,qin=keep?sq>=-1e-8:sq<=1e-8;if(pin)out.push(p);if(pin!==qin){const t=sp/(sp-sq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}return out;
}
export function subtractPolygon(poly,hole){
  const signed=hole.reduce((v,p,i)=>{const q=hole[(i+1)%hole.length];return v+p[0]*q[1]-q[0]*p[1];},0);if(signed<0)hole=[...hole].reverse();
  const output=[];for(let i=0;i<hole.length&&poly.length>=3;i++){const outside=clip(poly,hole[i],hole[(i+1)%hole.length],false);if(outside.length>=3&&polygonArea(outside)>1e-7)output.push(outside);poly=clip(poly,hole[i],hole[(i+1)%hole.length],true);}return output;
}
