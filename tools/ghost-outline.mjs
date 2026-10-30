import * as T from '../src/runtime/three.js';
// Sparse line selection from native plan runs and original mesh vertices.
// No whole-building factory is constructed and no collision data is changed.
export function exteriorOutline({plan,offset,parts,geometry}){
  const positions=[],groups=[],seen=new Set();
  function line(a,b){
    a=a.map(v=>+v.toFixed(6));b=b.map(v=>+v.toFixed(6));
    if(![...a,...b].every(Number.isFinite))throw Error('Nonfinite native outline');
    if(Math.hypot(...a.map((v,i)=>v-b[i]))<1e-5)return;
    const key=[a.join(','),b.join(',')].sort().join('/');if(seen.has(key))return;seen.add(key);positions.push(...a,...b);
    if(positions.length/6>12000)throw Error('Exterior ghost exceeds its 12,000-segment budget');
  }
  function group(kind,id,write){const start=positions.length/6;write();if(positions.length/6>start)groups.push({kind,id,start,count:positions.length/6-start});}
  const world=(p,h)=>[p[0]+offset[0],h,p[1]+offset[2]];
  for(const run of plan.runs.filter(r=>r.role!=='interior'&&r.role!=='foundation'&&r.role!=='colonnade-pier'))group('native-wall-run',run.id,()=>{
    const low=run.startLevel*2.12,high=run.endLevel*2.12;
    if(!(high>low))return;
    line(world(run.a,low),world(run.b,low));line(world(run.a,high),world(run.b,high));
    line(world(run.a,low),world(run.a,high));line(world(run.b,low),world(run.b,high));
  });
  for(const floor of plan.floors.filter(f=>/roof|porch/.test(f.id)))group('native-deck-perimeter',floor.id,()=>{
    for(const polygon of floor.polygons||[floor.polygon])for(let i=0;i<polygon.length;i++)line(world(polygon[i],floor.level*2.12),world(polygon[(i+1)%polygon.length],floor.level*2.12));
  });
  for(const part of parts.filter(p=>p.id.startsWith('roof/')||p.id==='great-dome/shell'||['dome-glass','lantern-glass','cupola-roof','roof-glass'].includes(p.role)||/^replacement\/end-pavilion-roof-/.test(p.id)))group('native-roof-mesh',part.id,()=>{
    const data=geometry(part.geometry),p=data.attributes.position,uv=data.attributes.uv,matrix=new T.Matrix4().fromArray(part.matrix);
    const points=Array.from({length:p.array.length/p.itemSize},(_,i)=>new T.Vector3(...p.array.slice(i*p.itemSize,i*p.itemSize+3)).applyMatrix4(matrix).toArray());
    if(uv){
      const grid=new Map(),us=new Set(),vs=new Set();
      for(let i=0;i<points.length;i++){const u=+uv.array[i*uv.itemSize].toFixed(6),v=+uv.array[i*uv.itemSize+1].toFixed(6);grid.set(u+'/'+v,points[i]);us.add(u);vs.add(v);}
      const u=[...us].sort((a,b)=>a-b),v=[...vs].sort((a,b)=>a-b);
      if(u.length>=8&&v.length>=4&&grid.size>=u.length*v.length*.9){
        // Eight source meridians and three rings preserve the roof/dome form
        // without displaying every native triangle or small ornament.
        for(const i of new Set(Array.from({length:8},(_,i)=>Math.floor(i*(u.length-1)/8))))for(let j=1;j<v.length;j++){const a=grid.get(u[i]+'/'+v[j-1]),b=grid.get(u[i]+'/'+v[j]);if(a&&b)line(a,b);}
        for(const j of new Set([0,Math.floor((v.length-1)/2),v.length-1]))for(let i=1;i<u.length;i++){const a=grid.get(u[i-1]+'/'+v[j]),b=grid.get(u[i]+'/'+v[j]);if(a&&b)line(a,b);}
        return;
      }
    }
    const source=new T.BufferGeometry();source.setAttribute('position',new T.Float32BufferAttribute(p.array,p.itemSize));if(data.index)source.setIndex(data.index.array);
    const edges=new T.EdgesGeometry(source,25),vertices=edges.attributes.position;
    try{for(let i=0;i<vertices.count;i+=2)line(new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(matrix).toArray(),new T.Vector3().fromBufferAttribute(vertices,i+1).applyMatrix4(matrix).toArray());}finally{edges.dispose();source.dispose();}
  });
  if(!positions.length)throw Error('Empty exterior ghost');
  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};for(let i=0;i<positions.length;i++){
    const axis=i%3;bounds.min[axis]=Math.min(bounds.min[axis],positions[i]);bounds.max[axis]=Math.max(bounds.max[axis],positions[i]);
  }
  return {positions,groups,bounds,segments:positions.length/6};
}
