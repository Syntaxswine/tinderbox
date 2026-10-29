import * as T from '../src/runtime/three.js';
import {transformCollisionShape} from '../src/runtime/collision.js';
// Offline source-provider extraction. Runtime never constructs the monolithic
// landmark factories; exact arrays/matrices are emitted as independent sections.
export function* sourceParts(root){
  root.updateMatrixWorld(true);const instance=new T.Matrix4(),meshes=[];root.traverse(object=>{if(object.isMesh)meshes.push(object);});
  for(const object of meshes)for(let i=0;i<(object.isInstancedMesh?object.count:1);i++){
    const matrix=object.matrixWorld.clone();if(object.isInstancedMesh){object.getMatrixAt(i,instance);matrix.multiply(instance);}
    const data=object.isInstancedMesh?object.userData.parts[i]:object.userData;
    const ranges=data.form==='boundary-slab-assembly'?data.parts:[null];
    for(const range of ranges){
      let geometry=object.geometry;
      if(range){geometry=new T.BufferGeometry();for(const [name,a]of Object.entries(object.geometry.attributes))geometry.setAttribute(name,new T.BufferAttribute(a.array.slice(range.start*a.itemSize,(range.start+range.count)*a.itemSize),a.itemSize,a.normalized));}
      yield {id:(range?.componentId||range?.id||data.componentId||object.name),data:range||data,geometry,material:object.material,matrix,temporary:!!range};
    }
  }
}
export function geometryData(g){return {attributes:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,{array:Array.from(a.array),type:a.array.constructor.name,itemSize:a.itemSize,normalized:a.normalized}])),index:g.index?{array:Array.from(g.index.array),type:g.index.array.constructor.name}:null};}
export function materialData(m){return {color:m.color?.toArray()||[1,1,1],emissive:m.emissive?.toArray()||[0,0,0],emissiveIntensity:m.emissiveIntensity,roughness:m.roughness??1,metalness:m.metalness??0,transparent:!!m.transparent,opacity:m.opacity,alphaTest:m.alphaTest,depthTest:m.depthTest,depthWrite:m.depthWrite,side:m.side,flatShading:m.flatShading,vertexColors:m.vertexColors,toneMapped:m.toneMapped,dithering:m.dithering,blending:m.blending,polygonOffset:m.polygonOffset,polygonOffsetFactor:m.polygonOffsetFactor,polygonOffsetUnits:m.polygonOffsetUnits};}
export function colliderGeometryData(geometry){
  const vertices=[],indices=[],lookup=new Map(),edges=new Map(),p=geometry.attributes.position;
  for(let i=0;i<(geometry.index?.count||p.count);i++){
    const v=geometry.index?geometry.index.getX(i):i,point=[p.getX(v),p.getY(v),p.getZ(v)],key=point.map(n=>Math.round(n*1e6)).join(',');
    if(!lookup.has(key)){lookup.set(key,vertices.length/3);vertices.push(...point);}indices.push(lookup.get(key));
  }
  for(let i=0;i<indices.length;i+=3)for(let edge=0;edge<3;edge++){const a=indices[i+edge],b=indices[i+(edge+1)%3];if(a===b)continue;const key=Math.min(a,b)+','+Math.max(a,b);edges.set(key,(edges.get(key)||0)+1);}
  return {vertices,indices,closed:edges.size>0&&[...edges.values()].every(count=>count===2)};
}
export function axisAlignedBox(shape,matrix){
  if(!shape.closed||shape.vertices.length!==24)return false;const triangles=transformCollisionShape(shape,matrix).triangles,points=triangles.flat(),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const point of points)for(let a=0;a<3;a++){min[a]=Math.min(min[a],point[a]);max[a]=Math.max(max[a],point[a]);}
  if(points.some(p=>p.some((value,a)=>Math.abs(value-min[a])>1e-6&&Math.abs(value-max[a])>1e-6)))return false;
  if(triangles.some(triangle=>![0,1,2].some(axis=>triangle.every(p=>Math.abs(p[axis]-min[axis])<1e-6)||triangle.every(p=>Math.abs(p[axis]-max[axis])<1e-6))))return false;
  return new Set(points.map(p=>p.map((v,a)=>Math.abs(v-min[a])<1e-6?0:1).join(''))).size===8;
}
export function portalBounds(parts,portalId){
  const leaves=parts.filter(part=>part.portalId===portalId);if(!leaves.length)throw Error('Access portal has no actual posed leaf: '+portalId);
  const boxes=leaves.flatMap(part=>[part.bounds,...(part.openBounds?[part.openBounds]:[])]);
  return {min:[0,1,2].map(axis=>Math.min(...boxes.map(box=>box.min[axis]))),max:[0,1,2].map(axis=>Math.max(...boxes.map(box=>box.max[axis])))};
}
export function hull(points){
  points=[...new Map(points.map(p=>[p.map(v=>Math.round(v*1e6)/1e6).join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(points.length<3)return points;
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lower=[],upper=[];
  for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=1e-8)lower.pop();lower.push(p);}
  for(const p of [...points].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=1e-8)upper.pop();upper.push(p);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
export function topPolygon(part){
  const points=[],v=new T.Vector3(),p=part.geometry.attributes.position;let top=-Infinity;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(part.matrix);top=Math.max(top,v.y);points.push(v.clone());}
  return {height:top,polygon:hull(points.filter(p=>Math.abs(p.y-top)<.001).map(p=>[p.x,p.z]))};
}
export const area=poly=>Math.abs(poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2);
function clip(poly,a,b,keep){
  const out=[],side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],sp=side(p),sq=side(q),pin=keep?sp>=-1e-8:sp<=1e-8,qin=keep?sq>=-1e-8:sq<=1e-8;if(pin)out.push(p);if(pin!==qin){const t=sp/(sp-sq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}
  return out;
}
export function subtract(poly,hole){
  const signed=hole.reduce((v,p,i)=>{const q=hole[(i+1)%hole.length];return v+p[0]*q[1]-q[0]*p[1];},0);if(signed<0)hole=[...hole].reverse();
  const output=[];for(let i=0;i<hole.length&&poly.length>=3;i++){const outside=clip(poly,hole[i],hole[(i+1)%hole.length],false);if(outside.length>=3&&area(outside)>1e-7)output.push(outside);poly=clip(poly,hole[i],hole[(i+1)%hole.length],true);}return output;
}
export function floorPrism(poly,top){
  const shape=new T.Shape(poly.map(p=>new T.Vector2(p[0],-p[1]))),geometry=new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false,steps:1});
  geometry.rotateX(-Math.PI/2);geometry.translate(0,top-.12,0);
  const p=geometry.attributes.position,uv=[];for(let i=0;i<p.count;i++)uv.push(p.getX(i),p.getZ(i));geometry.setAttribute('grossUV',new T.Float32BufferAttribute(uv,2));geometry.computeBoundingBox();return geometry;
}
// Merge only unique, opaque floor fragments with identical matrix/material and
// attribute layout. Copy original triangle/UV values; do not rescale or rebake.
export function batchFloorFragments(parts,usage,readGeometry,writeGeometry){
  const groups=new Map(),keep=[];
  for(const part of parts){
    if(part.role!=='floor'||part.portalId||usage.get(part.geometry)!==1){keep.push(part);continue;}
    const geometry=readGeometry(part.geometry),layout=Object.entries(geometry.attributes).map(([name,a])=>[name,a.type,a.itemSize,a.normalized]);
    const key=JSON.stringify([part.material,part.matrix,part.floorId,part.level,part.fromAccess,layout]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({part,geometry});
  }
  let merged=0;
  for(const entries of groups.values()){
    if(entries.length<2){keep.push(entries[0].part);continue;}
    const first=entries[0],data={attributes:Object.fromEntries(Object.entries(first.geometry.attributes).map(([name,a])=>[name,{...a,array:[]}])),index:null},ranges=[];
    let start=0;const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
    for(const {part,geometry}of entries){
      const count=geometry.index?.array.length||geometry.attributes.position.array.length/3;
      for(let i=0;i<count;i++){const vertex=geometry.index?geometry.index.array[i]:i;for(const [name,a]of Object.entries(geometry.attributes))for(let n=0;n<a.itemSize;n++)data.attributes[name].array.push(a.array[vertex*a.itemSize+n]);}
      ranges.push({id:part.id,start,count});start+=count;for(let a=0;a<3;a++){bounds.min[a]=Math.min(bounds.min[a],part.bounds.min[a]);bounds.max[a]=Math.max(bounds.max[a],part.bounds.max[a]);}
    }
    keep.push({...first.part,id:first.part.id+'/section-batch',geometry:writeGeometry(data),bounds,sourceRanges:ranges});merged+=entries.length-1;
  }
  return {parts:keep,merged};
}
