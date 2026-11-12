import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sweptCylinderClear} from '../../../src/runtime/collision.js';
import {bounds,add} from './geometry.js';
const dataPath='workbenches/furnished-house/house-data.json',controlPath='art/source/furnished-house/control-stair-fitting.json',d=JSON.parse(fs.readFileSync(dataPath)),control=JSON.parse(fs.readFileSync(controlPath)),info=new Map(d.sourceMeshes.map(m=>[m.id,m]));
const radius=.5,height=1.66,legClearance=.45,x=5.5,start=4.125,end=6.875;
function nearby(s){const b=s.bounds;return b.max[0]>=5&&b.min[0]<=6&&b.max[2]>=3.5&&b.min[2]<=7.5&&b.max[1]>=.48&&b.min[1]<=4.26;}
function floorShape(s){
 const offset=[0,-s.thickness,0],edges=new Map();for(const t of s.triangles)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],key=[a.join(','),b.join(',')].sort().join('|');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
 const back=s.triangles.map(t=>[...t].reverse().map(p=>add(p,offset))),sides=[...edges.values()].flatMap(([a,b])=>{const c=add(b,offset),q=add(a,offset);return [[a,b,c],[a,c,q]];});
 return {id:s.id,triangles:[...s.triangles,...back,...sides],bounds:s.bounds,closed:true};
}
const slabs=d.surfaces.filter(s=>s.kind==='floor'&&!s.supportType&&nearby(s)).map(floorShape);
const adapted=d.render.geometry.map(g=>{const triangles=g.triangles.map(t=>t.vertices.map(v=>v.slice(0,3))),m=info.get(g.id);return {id:g.id,name:m.name,triangles,bounds:bounds(triangles.flat()),closed:!/(closure|siding|envelope)/i.test(m.name)};}).filter(nearby);
const foot=z=>.48+(Math.max(0,Math.min(11,Math.floor((z-4)/.25+1e-7)))+1)*2.12/12;
function sweep(shapes){
 let previous=start,steps=0;const n=Math.ceil((end-start)/.025);
 for(let i=1;i<=n;i++){const z=start+(end-start)*i/n,low=Math.max(foot(previous),foot(z))+legClearance,high=Math.max(foot(previous),foot(z))+height-1e-6;
  for(const s of [...shapes,...slabs])if(!sweptCylinderClear({x,y:previous},{x,y:z},radius,low,high,s))return {passed:false,steps,blockedBy:s.id,fromZ:previous,toZ:z,low,high};
  previous=z;steps++;
 }
 return {passed:true,steps,sourceShapes:shapes.length,actualClosedSlabs:slabs.length};
}
const blocked=sweep(control.sourceShapes),passed=sweep(adapted);assert.ok(!blocked.passed);assert.ok(/wall-6-6-7-6/.test(blocked.blockedBy),JSON.stringify(blocked));assert.ok(passed.passed,JSON.stringify(passed));
const arch=d.openings.find(o=>o.id==='opening/l0/6-6-7-6');assert.equal(arch.kind,'arch');assert.equal(arch.openingWidth,1);
for(const m of d.sourceMeshes.filter(m=>m.id.startsWith(arch.sourceWallBinding+'/')))assert.ok(m.bounds.min[0]>=6-1e-6);
assert.deepEqual(d.module,[1,1,2.12]);assert.deepEqual(d.levels.map(l=>l.floorY),[.48,2.6]);
const receipt={scope:'Actual source stair-lane geometry and real closed slab union, using the production swept cylinder and its existing .45m stair leg-clearance convention. Foot support is sampled from unchanged native tread heights. This is a geometric fitting regression, not full navigation/gait acceptance.',dataPath,dataSha256:createHash('sha256').update(fs.readFileSync(dataPath)).digest('hex'),controlPath,controlSha256:createHash('sha256').update(fs.readFileSync(controlPath)).digest('hex'),sourceControlCommit:control.sourceCommit,profile:{radius,height,legClearance,centreX:x,startZ:start,endZ:end},blocked,applied:passed,passed:3,failed:0};
fs.writeFileSync('docs/art/furnished-house/stair-fitting-checks.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({passed:3,failed:0,blocked,applied:passed}));
