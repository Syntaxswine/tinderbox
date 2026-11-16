// Presentation-only overlap across adjacent burning polygons. Every input stays represented.
const key=p=>p.map(v=>Math.round(v*1e5)).join(',');
function distance(x,z,a,b){const dx=b[0]-a[0],dz=b[2]-a[2],den=dx*dx+dz*dz;if(den<1e-12)return Infinity;const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/den));return Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz);}
export function surfaceSampleGroupKey(q){
 if(!(q.flame>0)||!q.supportTriangles?.length||q.itemId||q.vent)return null;
 const n=[q.nx,q.ny,q.nz],plane=n[0]*q.x+n[1]*q.y+n[2]*q.z,range=q.part==='walls'?[q.supportBounds.min[1],q.supportBounds.max[1]]:[];
 return [q.part,q.presentationLevel,...n.map(v=>Math.round(v*1000)),Math.round(plane*1000),...range.map(v=>Math.round(v*1000))].join('/');
}
export function surfaceSampleContextKey(q){
 const key=surfaceSampleGroupKey(q);if(key===null||!q.anchorFootprint)return key;
 // Anchor relocation can cross a rounded-plane boundary by floating-point error.
 // Retain a conservative superset; final union grouping still uses the exact plane.
 return [q.part,q.presentationLevel,...[q.nx,q.ny,q.nz].map(v=>Math.round(v*1000))].join('/');
}
// The primitive keys belong to the detached geometry, so a changing live group
// can reuse them even when new native states add/remove burning neighbours.
function primitiveTriangles(q){
 const prepared=q.supportGeometry;if(prepared?.presentationTriangles)return prepared.presentationTriangles;
 const triangles=prepared?.coordinates?Array.from({length:prepared.coordinates.length/9},(_,i)=>
  Array.from({length:3},(_,j)=>Array.from(prepared.coordinates.subarray(i*9+j*3,i*9+j*3+3)))):q.supportTriangles;
 const result=triangles.map(t=>({key:t.map(key).sort().join('|'),edges:t.map((a,i)=>{
  const b=t[(i+1)%3];return {key:[key(a),key(b)].sort().join('|'),points:[a,b]};})}));
 if(prepared)prepared.presentationTriangles=result;return result;
}
function connectedEdges(list){
 const edges=new Map(),seen=new Set();
 for(const q of list)for(const triangle of primitiveTriangles(q)){
  if(seen.has(triangle.key))continue;seen.add(triangle.key);
  for(const edge of triangle.edges){if(edges.has(edge.key))edges.delete(edge.key);else edges.set(edge.key,edge.points);}
 }
 return [...edges.values()];
}
export function surfaceTangentRange(triangles,nx,nz,prepared){
 const h=Math.hypot(nx,nz)||1,tx=nz/h,tz=-nx/h,old=prepared?.tangentRange;
 if(old&&old.tx===tx&&old.tz===tz)return old;
 let min=Infinity,max=-Infinity;
 if(prepared?.coordinates){const a=prepared.coordinates;for(let i=0;i<a.length;i+=3){const p=a[i]*tx+a[i+2]*tz;min=Math.min(min,p);max=Math.max(max,p);}}
 else for(const t of triangles)for(const p of t){const a=p[0]*tx+p[2]*tz;min=Math.min(min,a);max=Math.max(max,a);}
 const range={tx,tz,min,max};if(prepared)prepared.tangentRange=range;return range;
}
function groupSamples(samples){
 const groups=new Map();for(const q of samples){const id=surfaceSampleGroupKey(q);if(id===null)continue;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(q);}return groups;
}
function connectGroup(id,list){
 const values=list.map(()=>({overlapGroup:id,overlapSources:list.length}));
 if(list[0].part==='walls'){
  const nx=list[0].nx,nz=list[0].nz,h=Math.hypot(nx,nz)||1,tx=nz/h,tz=-nx/h;
  const intervals=list.map(q=>{const range=surfaceTangentRange(q.supportTriangles,nx,nz,q.supportGeometry);return [range.min,range.max];}).sort((a,b)=>a[0]-b[0]),merged=[];
  for(const [lo,hi]of intervals){const last=merged.at(-1);if(last&&lo<=last[1]+1e-5)last[1]=Math.max(last[1],hi);else merged.push([lo,hi]);}
  for(let i=0;i<list.length;i++){const q=list[i],p=q.x*tx+q.z*tz,span=merged.find(a=>p>=a[0]-1e-5&&p<=a[1]+1e-5);if(span)values[i].tangentRadius=Math.min(.8,Math.max(.001,Math.min(p-span[0],span[1]-p)-.003));}
 }else{
  const edges=connectedEdges(list);
  for(let i=0;i<list.length;i++){const q=list[i];let radius=Infinity;for(const [a,b]of edges)radius=Math.min(radius,distance(q.x,q.z,a,b));radius-=.003;if(radius>0)values[i].floorRadius=values[i].supportRadius=Math.min(.85,radius);}
 }
 return values;
}
function applyGroup(list,values){for(let i=0;i<list.length;i++)Object.assign(list[i],values[i]);}
export function connectSurfaceSamples(samples){
 for(const [id,list]of groupSamples(samples))if(list.length>1)applyGroup(list,connectGroup(id,list));return samples;
}
// One latest entry per current group, storing only geometry and primitive inputs.
// List order is included because rounded duplicate triangles retain the first face.
export function createSurfaceSampleConnector(){
 let entries=new Map(),hits=0,computations=0;
 function same(saved,list){return saved.length===list.length&&saved.every((p,i)=>{
  const q=list[i];if(p.id!==q.id||p.x!==q.x||p.z!==q.z||p.nx!==q.nx||p.nz!==q.nz)return false;
  if(q.supportGeometry)return p.geometry===q.supportGeometry;
  const a=q.supportTriangles;if(p.coordinates.length!==a.length*9)return false;let at=0;
  for(const t of a)for(const point of t)for(const value of point)if(value!==p.coordinates[at++])return false;return true;
 });}
 function snapshot(q){return {id:q.id,x:q.x,z:q.z,nx:q.nx,nz:q.nz,
  ...(q.supportGeometry?{geometry:q.supportGeometry}:{coordinates:new Float64Array(q.supportTriangles.flat(2))})};}
 function connect(samples){
  const next=new Map();hits=computations=0;
  for(const [id,list]of groupSamples(samples)){
   if(list.length<2)continue;let entry=entries.get(id);
   if(entry&&same(entry.inputs,list))hits++;else{entry={inputs:list.map(snapshot),values:connectGroup(id,list)};computations++;}
   applyGroup(list,entry.values);next.set(id,entry);
  }
  entries=next;return samples;
 }
 return {connect,clear(){entries.clear();hits=computations=0;},diagnostics(){return {entries:entries.size,hits,computations};}};
}
