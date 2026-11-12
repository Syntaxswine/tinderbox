import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sweptCylinderClear} from '../../../src/runtime/collision.js';
import {bounds,pointInTriangleXZ} from './geometry.js';
const dataPath='workbenches/furnished-house/house-data.json',controlPath='art/source/furnished-house/control-stair-egress.json',d=JSON.parse(fs.readFileSync(dataPath)),control=JSON.parse(fs.readFileSync(controlPath)),info=new Map(d.sourceMeshes.map(m=>[m.id,m])),adapt=d.navigation.routeAdaptations.find(a=>a.type==='upper-stair-side-egress'),radius=.5,height=1.66,low=2.625,high=2.6+height-1e-6,points=adapt.turnWaypoints.map(p=>[p[0],p[2]]);
const near=s=>s.bounds.max[0]>=5&&s.bounds.min[0]<=7.2&&s.bounds.max[2]>=5.8&&s.bounds.min[2]<=7.4&&s.bounds.max[1]>=2.4&&s.bounds.min[1]<=4.26;
const current=d.render.geometry.map(g=>{const triangles=g.triangles.map(t=>t.vertices.map(v=>v.slice(0,3))),m=info.get(g.id);return {id:g.id,name:m.name,triangles,bounds:bounds(triangles.flat()),closed:!/(closure|siding|envelope)/i.test(m.name)};}).filter(near);
function sweep(shapes){let steps=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.025);let previous=a;
 for(let j=1;j<=n;j++){const p=a.map((v,k)=>v+(b[k]-v)*j/n);for(const s of shapes)if(!sweptCylinderClear({x:previous[0],y:previous[1]},{x:p[0],y:p[1]},radius,low,high,s))return {passed:false,steps,blockedBy:s.id,position:p};previous=p;steps++;}}
 return {passed:true,steps,sourceShapes:shapes.length};
}
const baseline=sweep(control.sourceShapes),onlyRailUnchanged=sweep(control.sourceShapes.filter(s=>s.id!==adapt.newel.sourceMeshBinding)),onlyPostUnchanged=sweep(control.sourceShapes.filter(s=>s.id!==adapt.rightRail.sourceMeshBinding)),applied=sweep(current);
assert.ok(!baseline.passed&&!onlyRailUnchanged.passed&&!onlyPostUnchanged.passed);assert.ok(applied.passed,JSON.stringify(applied));
const post=info.get(adapt.newel.sourceMeshBinding),rail=info.get(adapt.rightRail.sourceMeshBinding),b=post.bounds,supports=adapt.newel.supportSurfaceIds.map(id=>d.surfaces.find(s=>s.id===id));assert.equal(post.level,1);assert.ok(supports.length&&supports.every(s=>s.level===1&&s.kind==='floor'));
for(const x of [b.min[0],b.max[0]])for(const z of [b.min[2],b.max[2]])assert.ok(supports.some(s=>s.triangles.some(t=>pointInTriangleXZ([x,z],t))));
assert.ok(Math.abs(b.min[1]-2.605)<1e-6);assert.ok(rail.bounds.max[2]<=6.016&&rail.bounds.min[2]>=3.984);assert.deepEqual(adapt.rightRail.crossSectionUnchanged,[.055,.055]);assert.ok(Math.abs(rail.matrix[0]-1)<1e-7);
assert.deepEqual(d.levels.map(l=>l.area),[100,68]);assert.deepEqual(d.module,[1,1,2.12]);assert.ok(adapt.floorAdded===false&&adapt.noForwardLandingBeyondZ7);
const receipt={scope:'Exact source geometry through the upper sideways turn at actual upper floor height. Full conservative standing-body cylinder; no leg-clearance exception for this landing test. Original post and rail controls remain independently blocked.',dataPath,dataSha256:createHash('sha256').update(fs.readFileSync(dataPath)).digest('hex'),controlPath,controlSha256:createHash('sha256').update(fs.readFileSync(controlPath)).digest('hex'),sourceControlCommit:control.sourceCommit,profile:{radius,height,floorY:2.6,waypoints:adapt.turnWaypoints},baseline,onlyRailUnchanged,onlyPostUnchanged,applied,postSupport:{sourceMeshId:post.id,bounds:post.bounds,supportSurfaceIds:adapt.newel.supportSurfaceIds,gap:.005},railBounds:rail.bounds,passed:4,failed:0};
fs.writeFileSync('docs/art/furnished-house/stair-egress-checks.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({passed:4,failed:0,baseline,onlyRailUnchanged,onlyPostUnchanged,applied,supportedPost:post.id}));
