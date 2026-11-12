import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sweptCylinderClear} from '../../../src/runtime/collision.js';
import {bounds} from './geometry.js';
const proposalPath=process.argv[2]||'workbenches/furnished-house/house-data.json',basePath='art/source/furnished-house/control-kitchen-return.json',proposal=JSON.parse(fs.readFileSync(proposalPath)),base=JSON.parse(fs.readFileSync(basePath)),adapt=proposal.navigation.routeAdaptations.find(a=>['proposed-kitchen-return-end-cut','kitchen-return-end-cut'].includes(a.type));
assert.ok(adapt);const x=adapt.routeCentreX,radius=.5,low=.505,high=2.14-1e-6,waypoints=[[5.00375,3.35],[4.6,3.35],[x,3.65],[x,5.75],[2.5,6.5],[x,5.75],[x,3.65],[4.6,3.35],[5.00375,3.35]];
function sweep(data){
 const shapes=data.sourceShapes||data.render.geometry.map(g=>{const triangles=g.triangles.map(t=>t.vertices.map(v=>v.slice(0,3)));return {id:g.id,triangles,closed:true,bounds:bounds(triangles.flat())};}).filter(s=>s.bounds.max[1]>=low&&s.bounds.min[1]<=high&&s.bounds.max[0]>=2&&s.bounds.min[0]<=5.6&&s.bounds.max[2]>=2.8&&s.bounds.min[2]<=7.1);
 let steps=0;
 for(let i=1;i<waypoints.length;i++){const a=waypoints[i-1],b=waypoints[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.025);let previous=a;
  for(let j=1;j<=n;j++){const point=a.map((v,k)=>v+(b[k]-v)*j/n);for(const shape of shapes)if(!sweptCylinderClear({x:previous[0],y:previous[1]},{x:point[0],y:point[1]},radius,low,high,shape))return {passed:false,steps,blockedBy:shape.id,position:point,waypoint:i};previous=point;steps++;}
 }
 return {passed:true,steps,candidateShapes:shapes.length};
}
const control=sweep(base),adapted=sweep(proposal);assert.ok(!control.passed,'Original return must remain a blocked control');assert.ok(adapted.passed,JSON.stringify(adapted));
assert.deepEqual(proposal.module,[1,1,2.12]);assert.deepEqual(proposal.levels.map(l=>l.floorY),[.48,2.6]);
const width=4.9275-(4-adapt.cut),margin=(width-1)/2;assert.ok(width>1&&margin>.01);
const receipt={status:adapt.status,scope:'Exact exported geometry on a continuous standing-body kitchen-and-return sweep. Does not advance navigation, step supports or claim the full stair route.',basePath,baseSha256:createHash('sha256').update(fs.readFileSync(basePath)).digest('hex'),proposalPath,proposalSha256:createHash('sha256').update(fs.readFileSync(proposalPath)).digest('hex'),profile:{radius,height:1.66,floorY:.48},waypoints,cut:adapt.cut,clearWidth:width,minimumLateralMargin:margin,control,adapted,passed:3,failed:0};
fs.writeFileSync('docs/art/furnished-house/kitchen-return-checks.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({passed:3,failed:0,width,margin,control,adapted}));
