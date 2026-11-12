import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {createHopkinsHouse} from '../../../src/art/hopkins-housing.js';

const raw=fs.readFileSync('workbenches/furnished-house/house-data.json');
const data=JSON.parse(raw);
for(const source of data.sourceHashes){
  const bytes=fs.readFileSync(source.path);
  assert.equal(bytes.length,source.bytes,source.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256,source.path);
}
const catalogue=JSON.parse(fs.readFileSync('assets/art/hopkins-housing-v1/houses.json'));
const model=createHopkinsHouse(T,{catalogue,textures:{}},'hopkins-4-15');
const ray=new T.Raycaster();ray.ray.direction.set(0,-1,0);ray.far=.4;
const sourceFloors=[];model.root.updateMatrixWorld(true);
model.root.traverse(o=>{if(o.isMesh&&o.name.startsWith('Room floor:'))sourceFloors.push(o);});
const inside=(x,z,[a,b,c])=>{
  const sign=(p,q)=>(x-q[0])*(p[2]-q[2])-(p[0]-q[0])*(z-q[2]);
  const s=[sign(a,b),sign(b,c),sign(c,a)];
  return !(s.some(v=>v< -1e-8)&&s.some(v=>v>1e-8));
};
let samples=0,approvedRemovedSamples=0;const mismatches=[];
assert.deepEqual(data.levels.map(l=>l.area),[100,68]);
for(const level of data.levels){
  const exported=data.surfaces.filter(s=>s.kind==='floor'&&s.level===level.index&&!s.supportType);
  for(let i=0;i<51;i++)for(let j=0;j<51;j++){
    const x=-.1+i*.2+.0137,z=-.1+j*.2+.0193;
    ray.ray.origin.set(x,level.floorY+.2,z);
    const native=ray.intersectObjects(sourceFloors,false).some(hit=>Math.abs(hit.point.y-level.floorY)<1e-5);
    // Architect-authorized one-metre fore-lip bay removal, independently pinned
    // here rather than inferred from whatever the candidate happened to export.
    const removed=level.index===1&&x>5&&x<6&&z>3&&z<4;
    const source=native&&!removed;if(native&&removed)approvedRemovedSamples++;
    const derived=exported.some(s=>x>=s.bounds.min[0]&&x<=s.bounds.max[0]&&z>=s.bounds.min[2]&&z<=s.bounds.max[2]&&s.triangles.some(t=>inside(x,z,t)));
    if(source!==derived)mismatches.push({level:level.index,x,z,source,derived});
    samples++;
  }
}
model.dispose();
const result={source:'Published native rendered floor meshes minus explicitly authorized 1m2 upper stair fore-lip bay',approvedRemoval:{level:1,x:[5,6],z:[3,4]},approvedRemovedSamples,dataSha256:createHash('sha256').update(raw).digest('hex'),samples,mismatches,sourceHashes:data.sourceHashes.length};
fs.writeFileSync('artifacts/qa/furnished-house-replay/source-floor-check.json',JSON.stringify(result,null,2)+'\n');
assert.deepEqual(mismatches,[],'Exported thermal support must agree with the actual source floors, including the stair notch.');
console.log(JSON.stringify({samples,mismatches:mismatches.length,sourceHashes:result.sourceHashes}));
