import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../src/runtime/three.js';
import {preparePhysicalInstance} from '../../workbenches/bell-and-alder-sandbox/compose.js';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createNavigation} from '../../workbenches/furnished-house/navigation.js';
import {bounds,triangleArea} from '../../workbenches/furnished-house/geometry.js';
import {sweptCylinderClear} from '../../src/runtime/collision.js';
import {NATIVE_DISC_SLIDE} from '../../src/reuse/native-disc-slide.js';

const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const xyz=(p,q,[tx,ty,tz])=>{const [x,y,z]=p;return [[tx+x,ty+y,tz+z],[tx+z,ty+y,tz-x],[tx-x,ty+y,tz-z],[tx-z,ty+y,tz+x]][q];};
function box(min,max){
  const g=new T.BoxGeometry(...max.map((v,i)=>v-min[i]));try{const p=g.attributes.position,index=g.index,result=[];for(let i=0;i<index.count;i+=3)result.push([0,1,2].map(k=>{const j=index.getX(i+k);return [p.getX(j)+(min[0]+max[0])/2,p.getY(j)+(min[1]+max[1])/2,p.getZ(j)+(min[2]+max[2])/2];}));return result;}finally{g.dispose();}
}
const fixture=(triangles,solidTriangles=triangles)=>({version:1,runtimeAdapterVersion:1,prefabId:'explicit-solid-placement',gridOrigin:[0,0,0],groundY:0,levels:[],surfaces:[{id:'authored-solid',kind:'attachment',normal:[0,0,1],material:'iron',fuelAmount:0,thickness:0,sourceMeshBindings:[],triangles,solidTriangles,bounds:bounds(solidTriangles.flat())}],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]}});
const spec=q=>({id:'placed',kind:'furnished',source:'fixture',translation:[10,2,20],quarterTurns:q});
const sourceId='circulation150/stair/rail/upper-front',worldId='hopkins-fifteen::'+sourceId;
function realHouse(){
  const root=new URL('../../workbenches/catalogue-modular/',import.meta.url),bytes=fs.readFileSync(new URL('house-data.json',root));assert.equal(createHash('sha256').update(bytes).digest('hex'),'c45fc8a1a2aaa1beeacfcb430d259130d34c410ad7ffa34bb5ba703223b9b77c');
  const raw=JSON.parse(bytes),manifest=JSON.parse(fs.readFileSync(new URL('scene-data.json',root))),placement=manifest.instances.find(s=>s.id==='hopkins-fifteen');return {raw,placement,placed:preparePhysicalInstance(raw,placement)};
}
const asShape=s=>({id:s.id,triangles:s.solidTriangles||s.triangles,closed:s.closedShape!==false});

test('owned explicit collision vertices receive translation and all four native quarter-turns without source mutation',()=>{
  const triangles=box([3.1,1.2,2.2],[3.4,1.8,2.3]),raw=fixture(triangles,structuredClone(triangles)),before=JSON.stringify(raw);
  for(const q of [0,1,2,3]){
    const placement=spec(q),data=preparePhysicalInstance(raw,placement).data,solid=data.surfaces[0].solidTriangles;assert.notEqual(solid,raw.surfaces[0].solidTriangles);
    for(let i=0;i<triangles.length;i++)for(let j=0;j<3;j++){const expected=xyz(triangles[i][j],q,placement.translation);assert.notEqual(solid[i][j],raw.surfaces[0].solidTriangles[i][j]);expected.forEach((v,k)=>near(solid[i][j][k],v));}
  }assert.equal(JSON.stringify(raw),before);
});

test('compiled broad-phase bounds include the actual explicit solid beyond its thermal plane at every rotation',()=>{
  const plane=[[[3.1,1.2,2.25],[3.4,1.8,2.25],[3.1,1.8,2.25]],[[3.1,1.2,2.25],[3.4,1.2,2.25],[3.4,1.8,2.25]]],raw=fixture(plane,box([3.1,1.2,2.2],[3.4,1.8,2.3]));
  for(const q of [0,1,2,3]){
    const placement=spec(q),trial=createTrial(preparePhysicalInstance(raw,placement).data);
    try{
      const p=xyz([3.25,1.4,2.29],q,placement.translation),box={min:[p[0]-.005,p[1]+.025,p[2]-.005],max:[p[0]+.005,p[1]+.2,p[2]+.005]},candidates=trial.scene.index.candidates(box).filter(s=>s.sourceSurfaceId==='placed::authored-solid');assert.equal(candidates.length,1,'Narrow world query must discover the real solid, not just its zero-thickness plane');
      for(const s of candidates)for(const v of s.solidTriangles.flat())for(let k=0;k<3;k++)assert.ok(v[k]>=s.bounds.min[k]-1e-8&&v[k]<=s.bounds.max[k]+1e-8);
      const nav=createNavigation(trial,{radius:.005,height:.2,start:p});assert.equal(nav.clear(p,p),false,'Existing native closed-solid oracle must reject a point inside the authored world body');
    }finally{trial.dispose();}
  }
});

test('pinned H15 railing blocks the real world-space native sweep and movement at its rendered position',()=>{
  const {raw,placement,placed}=realHouse(),source=raw.surfaces.find(s=>s.id===sourceId),expected=source.solidTriangles.map(t=>t.map(p=>xyz(p,placement.quarterTurns,placement.translation))),trial=createTrial(placed.data),from=[16.4375,2.2466667,8.75],to=[16.4375,2.2466667,9.65],low=from[1]+.45,high=from[1]+1.66;
  try{
    const nav=createNavigation(trial,{radius:.5,height:1.66,start:from,slideProfile:NATIVE_DISC_SLIDE}),fragment=trial.scene.index.surfaces.get(worldId+'@32,2,19');assert.ok(fragment);
    const a={x:from[0],y:from[2]},b={x:to[0],y:to[2]};assert.equal(sweptCylinderClear(a,b,.5,low,high,{triangles:expected,closed:true}),false,'Independent manual rigid transform of the immutable authored mesh blocks this sweep');assert.equal(sweptCylinderClear(a,b,.5,low,high,asShape(fragment)),false);assert.equal(nav.clear(from,to),false);
    const moved=nav.move(0,1,.1);assert.ok(moved.y<9.1);near(moved.x,from[0],3e-6);near(moved.elevation,from[1]);assert.match(moved.lastBlock.id,/circulation150\/stair\/(?:rail|post)/);assert.equal(moved.lastBlock.reason,'Native geometry clearance');
  }finally{trial.dispose();}
});

test('world clipping preserves native rail area and local retirement leaves no full-mesh ghost in surviving fragments',()=>{
  const {placed}=realHouse(),trial=createTrial(placed.data);
  try{
    const source=placed.data.surfaces.find(s=>s.id===worldId),fragments=[...trial.scene.index.surfaces.values()].filter(s=>s.sourceSurfaceId===worldId);assert.ok(fragments.length>1);
    const originalArea=source.solidTriangles.reduce((n,t)=>n+triangleArea(t),0),fragmentArea=fragments.reduce((n,s)=>n+s.solidTriangles.reduce((a,t)=>a+triangleArea(t),0),0);assert.ok(Math.abs(fragmentArea/originalArea-1)<1e-5,'No missing or duplicated whole native mesh area');
    for(const s of fragments){assert.equal(s.closedShape,false,'Cell cuts do not acquire invented closing faces');for(const v of s.solidTriangles.flat())for(let k=0;k<3;k++)assert.ok(v[k]>=s.bounds.min[k]-1e-8&&v[k]<=s.bounds.max[k]+1e-8);}
    const a={x:16.25,y:9.3},b={x:16.25,y:9.7},clear=()=>fragments.filter(s=>s.intact).every(s=>sweptCylinderClear(a,b,.02,2.7,3.3,asShape(s)));assert.equal(clear(),false);
    const retired=fragments.filter(s=>s.bounds.min[0]>=16-1e-6&&s.bounds.max[0]<=16.5+1e-6);assert.ok(retired.length&&retired.length<fragments.length);for(const s of retired)trial.scene.index.change(s.id,{intact:false});assert.equal(clear(),true,'Neighbouring intact cells retain only their real mesh fragments');
  }finally{trial.dispose();}
});

test('explicit compound mesh placement and clipping preserve its real aperture',()=>{
  const mesh=[...box([0,0,2],[.2,2.3,2.16]),...box([2,0,2],[2.2,2.3,2.16]),...box([.2,2.1,2],[2,2.3,2.16])],placement={...spec(3),translation:[10,0,20]},trial=createTrial(preparePhysicalInstance(fixture(mesh,structuredClone(mesh)),placement).data);
  try{const from=xyz([1.1,0,1],3,placement.translation),to=xyz([1.1,0,3],3,placement.translation),nav=createNavigation(trial,{radius:.5,height:1.66,start:from});assert.equal(nav.clear(from,to),true,'Actual triangles leave the authored doorway open');}finally{trial.dispose();}
});
