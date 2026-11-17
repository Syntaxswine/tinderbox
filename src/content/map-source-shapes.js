import {bounds,triangleArea,cross,sub,unit,dot,mul} from '../../workbenches/furnished-house/geometry.js';

const EPS=1e-5;
const qualify=(place,id)=>{if(typeof id!=='string'||!id||id.includes('::'))throw Error('Expected a place-local source ID');return place+'::'+id;};
const area=ts=>ts.reduce((sum,t)=>sum+triangleArea(t),0);
function sourceTriangles(binding,geometry){
  const p=geometry?.attributes?.position,m=binding.matrix,index=geometry?.index?.array;
  if(!p||p.itemSize!==3||m?.length!==16||!m.every(Number.isFinite))throw Error('Missing exact emitted source geometry');
  const count=index?.length??p.array.length/3,range=binding.sourceRange;
  const start=range?.start??0,end=range?start+range.count:count;
  if(start%3||end%3||start<0||end>count)throw Error('Invalid source triangle range');
  const out=[];
  for(let i=start;i<end;i+=3)out.push([0,1,2].map(k=>{const j=(index?index[i+k]:i+k)*3,x=p.array[j],y=p.array[j+1],z=p.array[j+2];return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}));
  if(out.length!==binding.triangleCount||out.some(t=>t.flat().some(n=>!Number.isFinite(n))))throw Error('Source triangle count/coordinates changed');
  return out;
}
// The first three accepted sources are proven rectangular native solids.
// Select their actual face, then retain its measured thickness. A general
// pitched/cut solid must use a separate exact extraction, never its AABB.
function panel(carrier,triangles){
  const b=bounds(triangles.flat()),dimensions=b.max.map((n,i)=>n-b.min[i]),axis=dimensions.indexOf(Math.min(...dimensions));
  if(dimensions.some(n=>n<=0)||triangles.length!==12)throw Error('Pilot needs a verified closed native box');
  const edges=new Map();
  for(const t of triangles){if(![0,1,2].some(a=>t.every(p=>Math.abs(p[a]-b.min[a])<EPS)||t.every(p=>Math.abs(p[a]-b.max[a])<EPS)))throw Error('Pilot source is not an exact box');
    for(let i=0;i<3;i++){const key=[t[i],t[(i+1)%3]].map(p=>p.map(n=>Math.round(n/EPS)).join(',')).sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}
  if([...edges.values()].some(n=>n!==2))throw Error('Open pilot source solid');
  const floor=carrier.quantityBasis.rule==='top-area';if(floor&&axis!==1)throw Error('Pilot floor top must be measured');
  const normal=[0,0,0];normal[axis]=1;
  const faces=triangles.filter(t=>t.every(p=>Math.abs(p[axis]-b.max[axis])<EPS));
  if(faces.length!==2)throw Error('Pilot primary source face missing');
  const plane=floor?b.max[1]:(b.min[axis]+b.max[axis])/2;
  const planeTriangles=faces.map(t=>{const vertices=t.map(p=>sub(p,mul(normal,dot(p,normal)-plane)));return dot(unit(cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0]))),normal)<0?[vertices[0],vertices[2],vertices[1]]:vertices;});
  const measuredArea=area(planeTriangles);
  if(carrier.fuelAmount>0&&Math.abs(measuredArea-carrier.area)>EPS)throw Error('Pilot primary area differs from accepted finite recipe');
  return {bounds:b,normal,triangles:planeTriangles,thickness:dimensions[axis],kind:floor?'floor':carrier.physicalMaterial==='glass'?'window':'wall',supports:floor};
}
export {sourceTriangles as sourceGeometryTriangles,panel as nativePanel};
