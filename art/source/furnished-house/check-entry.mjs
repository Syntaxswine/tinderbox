import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from '../../../src/runtime/three.js';
import {sweptCylinderClear} from '../../../src/runtime/collision.js';
import {bounds} from './geometry.js';
const data=JSON.parse(fs.readFileSync('workbenches/furnished-house/house-data.json')),entry=data.openings.find(o=>o.entry),boundIds=new Set(entry.sourceMeshBindings),low=.48+.025,high=.48+1.66-1e-6,radius=.5,x=5.00375;
const rotation=new T.Matrix4().fromArray(entry.openTransform).multiply(new T.Matrix4().fromArray(entry.closedTransform).invert());
function shapes(open){
 return data.render.geometry.map(g=>{
  const triangles=g.triangles.map(t=>t.vertices.map(v=>{const p=new T.Vector3(...v.slice(0,3));if(open&&boundIds.has(g.id))p.applyMatrix4(rotation);return p.toArray();}));
  return {id:g.id,triangles,bounds:bounds(triangles.flat()),closed:true};
 }).filter(s=>s.bounds.max[1]>=low&&s.bounds.min[1]<=high&&s.bounds.max[0]>=x-radius&&s.bounds.min[0]<=x+radius&&s.bounds.max[2]>=-1.3&&s.bounds.min[2]<=2.7);
}
function sweep(open){
 const list=shapes(open),blocks=[];let previous=-.8;
 for(let i=1;i<=120;i++){const z=-.8+i*.025;for(const shape of list)if(!sweptCylinderClear({x,y:previous},{x,y:z},radius,low,high,shape))blocks.push({id:shape.id,fromZ:previous,toZ:z});if(blocks.length)break;previous=z;}
 return {passed:blocks.length===0,checks:120,candidateShapes:list.length,endZ:previous,blocks};
}
const opened=sweep(true),closed=sweep(false);assert.ok(opened.passed,JSON.stringify(opened.blocks));assert.ok(!closed.passed);assert.ok(closed.blocks.some(b=>boundIds.has(b.id)));
const casings=data.sourceMeshes.filter(m=>m.name==='Door casing'&&m.level===0&&m.id.startsWith(entry.sourceWallBinding+'/')),left=casings.find(m=>m.bounds.max[0]<5),right=casings.find(m=>m.bounds.min[0]>5),clear=right.bounds.min[0]-left.bounds.max[0],margin=Math.min(x-radius-left.bounds.max[0],right.bounds.min[0]-x-radius);
assert.ok(Math.abs(clear-1.015)<1e-6&&margin>.0037);assert.deepEqual(data.module,[1,1,2.12]);
const receipt={scope:'Actual exported entry, including open/closed native leaf, infill, return, casings, approach rails and source furniture. This is portal clearance, not navigation/support or the whole stair route.',profile:{radius,height:1.66,floorY:.48,centreX:x},nativeModule:data.module,jambClearWidth:clear,minimumLateralMargin:margin,stepMetres:.025,open:opened,closed,passed:3,failed:0};
fs.writeFileSync('docs/art/furnished-house/entry-checks.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({passed:3,failed:0,minimumLateralMargin:margin,closedBlock:closed.blocks[0].id}));
