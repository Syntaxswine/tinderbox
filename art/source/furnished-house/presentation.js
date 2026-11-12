// Presentation-only overlap across adjacent burning polygons. Every input stays represented.
const key=p=>p.map(v=>Math.round(v*1e5)).join(',');
function edgeList(triangles){const edges=new Map(),seen=new Set();for(const t of triangles){const triangleKey=t.map(key).sort().join('|');if(seen.has(triangleKey))continue;seen.add(triangleKey);for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],k=[key(a),key(b)].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);}}return [...edges.values()];}
function distance(x,z,a,b){const dx=b[0]-a[0],dz=b[2]-a[2],den=dx*dx+dz*dz;if(den<1e-12)return Infinity;const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/den));return Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz);}
export function surfaceSampleGroupKey(q){
 if(!(q.flame>0)||!q.supportTriangles?.length||q.itemId||q.vent)return null;
 const n=[q.nx,q.ny,q.nz],plane=n[0]*q.x+n[1]*q.y+n[2]*q.z,range=q.part==='walls'?[q.supportBounds.min[1],q.supportBounds.max[1]]:[];
 return [q.part,q.presentationLevel,...n.map(v=>Math.round(v*1000)),Math.round(plane*1000),...range.map(v=>Math.round(v*1000))].join('/');
}
export function connectSurfaceSamples(samples){
 const groups=new Map();
 for(const q of samples){
  const id=surfaceSampleGroupKey(q);if(id===null)continue;
  if(!groups.has(id))groups.set(id,[]);groups.get(id).push(q);
 }
 for(const [id,list]of groups){
  if(list.length<2)continue;const wall=list[0].part==='walls',ids=list.map(q=>q.id).sort();
  if(wall){
   const h=Math.hypot(list[0].nx,list[0].nz)||1,tx=list[0].nz/h,tz=-list[0].nx/h,intervals=list.map(q=>{const a=q.supportTriangles.flat().map(p=>p[0]*tx+p[2]*tz);return [Math.min(...a),Math.max(...a)];}).sort((a,b)=>a[0]-b[0]),merged=[];
   for(const [lo,hi]of intervals){const last=merged.at(-1);if(last&&lo<=last[1]+1e-5)last[1]=Math.max(last[1],hi);else merged.push([lo,hi]);}
   for(const q of list){const p=q.x*tx+q.z*tz,span=merged.find(a=>p>=a[0]-1e-5&&p<=a[1]+1e-5);if(span)q.tangentRadius=Math.min(.8,Math.max(.001,Math.min(p-span[0],span[1]-p)-.003));q.overlapGroup=id;q.overlapSources=ids.length;}
  }else{
   const edges=edgeList(list.flatMap(q=>q.supportTriangles));
   for(const q of list){const radius=Math.min(...edges.map(([a,b])=>distance(q.x,q.z,a,b)))-.003;if(radius>0)q.floorRadius=q.supportRadius=Math.min(.85,radius);q.overlapGroup=id;q.overlapSources=ids.length;}
  }
 }
 return samples;
}
