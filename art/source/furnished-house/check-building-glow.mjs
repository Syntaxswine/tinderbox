import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from '../../../src/runtime/three.js';
import {createFurnishedHouseArt} from '../../../workbenches/furnished-house/art.js';
const data=JSON.parse(fs.readFileSync('workbenches/furnished-house/house-data.json')),a=await createFurnishedHouseArt(T,{data});
const camera=new T.OrthographicCamera(-10,10,8,-8,.1,100);camera.position.set(18,14,-20);camera.lookAt(5,2,4);camera.updateMatrixWorld(true);
const groups=[],masks=[],pass=name=>groups.push(name);
const floor=data.surfaces.find(s=>s.id==='floor/l0/4,8'),upper=data.surfaces.find(s=>s.id==='floor/l1/4,8');
const sample=(s,id,flame)=>({id,sourceSurfaceId:s.id,x:2.25,y:s.bounds.max[1],z:4.25,nx:0,ny:1,nz:0,area:.25,part:'floor',flame,smoke:.6,ignitionTime:0,floorFootprint:s.triangles});
const samples=[sample(floor,'ground',.9),sample(upper,'upper',.8)];
const frame={version:1,revision:300,tick:9000,worldTime:10,full:false,boundaries:[],supports:[],items:[],parts:[],falls:[],rubble:[],tombstones:[],fireSamples:samples},before=JSON.stringify(frame),beforeData=JSON.stringify(data);
const view={mode:'exterior',camera},effects={flames:false,smoke:false,lighting:true};
const points=()=>{const list=[];a.root.traverse(o=>{if(o.isPointLight)list.push(o);});return list;};
try{
 a.update(frame,view);const reference=a.inspect().splats,local=a.diagnostics().actualLights,pool=points();
 assert.equal(pool.length,6);
 a.update(frame,{...view,lightingMode:'building'});
 assert.deepEqual(a.inspect().splats,reference);let d=a.diagnostics();
 assert.equal(d.lightingMode,'building');assert.equal(d.effectWork.work.lightClusterCalls,0);assert.equal(d.effectWork.work.buildingAggregateCalls,1);assert.equal(d.lightBudget.surfaceSites,2);
 assert.ok(Math.abs(d.lightBudget.activeEnergy-(.25*.9+.25*.8))<1e-12);
 assert.ok(d.actualLights.length>0&&d.actualLights.length<=6);assert.ok(d.actualLights.reduce((sum,l)=>sum+l.intensity,0)<=215);
 const building=d.actualLights;
 pass('Building mode leaves all flame/smoke splats unchanged and derives bounded pooled power from authoritative intensity times area');
 for(let mask=0;mask<8;mask++){
  const settings={flames:!!(mask&1),smoke:!!(mask&2),lighting:!!(mask&4)};
  a.update(frame,{...view,lightingMode:'building',effects:settings});d=a.diagnostics();
  assert.equal(d.missingSamples,0);assert.equal(d.effectWork.work.lightClusterCalls,0);
  assert.equal(d.effectWork.work.buildingAggregateCalls,settings.lighting?1:0);
  assert.deepEqual(d.actualLights,settings.lighting?building:[]);
  assert.deepEqual(a.inspect().splats.filter(s=>!s.smoke),settings.flames?reference.filter(s=>!s.smoke):[]);
  assert.deepEqual(a.inspect().splats.filter(s=>s.smoke),settings.smoke?reference.filter(s=>s.smoke):[]);
  assert.deepEqual(points(),pool);
  masks.push({mask,effects:settings,counts:d.effectWork,lights:d.actualLights.length});
 }
 pass('All eight building-mode masks keep channels independent, zero disabled power/work and reuse exactly the six original PointLight objects');
 a.update(frame,{...view,lightingMode:'building',effects});d=a.diagnostics();
 assert.equal(d.effectWork.work.supportAnchorSources,0);assert.equal(d.effectWork.work.flameEnvelopeSources,0);assert.equal(d.effectWork.work.flameCalls,0);assert.equal(d.effectWork.work.smokeCalls,0);assert.equal(d.effectWork.preparedSources,0);assert.equal(d.effectWork.work.buildingAggregateSources,2);
 pass('Lighting-only building mode skips every support-anchor lookup, connected envelope and splat generation call');
 const floorPoints=data.surfaces.filter(s=>s.kind==='floor'&&s.level===0).flatMap(s=>s.triangles.flat());
 const min=[0,2].map(i=>Math.min(...floorPoints.map(p=>p[i]))),max=[0,2].map(i=>Math.max(...floorPoints.map(p=>p[i])));
 const center=[(min[0]+max[0])/2,2,(min[1]+max[1])/2];
 for(const [axis,side]of [[0,-1],[0,1],[2,-1],[2,1]]){
  const facade=[...center];facade[axis]=side<0?min[axis===0?0:1]:max[axis===0?0:1];
  assert.ok(d.actualLights.some(l=>(l.position[axis]-facade[axis])*side>0&&Math.hypot(...l.position.map((v,i)=>v-facade[i]))<l.reach));
 }
 assert.ok(pool.every(l=>l.decay===2&&l.distance>0&&Number.isFinite(l.distance)));
 const inner=pool.filter(l=>l.position.x>min[0]&&l.position.x<max[0]&&l.position.z>min[1]&&l.position.z<max[1]);
 assert.equal(inner.length,2);assert.ok(Math.abs(Math.abs(inner[1].position.y-inner[0].position.y)-2.12)<1e-12);
 pass('Distributed lights stand outside all four facade normals, retain inverse-square distance falloff, and cover both native2.12m storeys');
 const away=new T.OrthographicCamera(-1,1,1,-1,.1,100);away.position.set(1000,20,-20);away.lookAt(1000,2,4);away.updateMatrixWorld(true);
 a.update(frame,{...view,camera:away,lightingMode:'building',effects});assert.deepEqual(a.diagnostics().actualLights,building);
 a.update(frame,{...view,lightingMode:'building',effects:{...effects,lighting:false}});assert.equal(points().reduce((sum,l)=>sum+l.intensity,0),0);assert.equal(a.diagnostics().lightBudget.lights.length,0);
 a.update({...frame,worldTime:20},{...view,lightingMode:'building',effects:{...effects,lighting:false}});
 a.update({...frame,worldTime:20},{...view,lightingMode:'building',effects});const restored=a.diagnostics().actualLights;
 a.update({...frame,worldTime:20},{...view,lightingMode:'building',effects});assert.deepEqual(a.diagnostics().actualLights,restored);
 pass('Off-screen illumination remains eligible and lighting re-enable uses current world time without a private clock');
 const input=flame=>({...frame,worldTime:20,fireSamples:[sample(floor,'energy',flame)]});
 a.update(input(.1),{...view,lightingMode:'building',effects});const low=a.diagnostics().actualLights.reduce((sum,l)=>sum+l.intensity,0);
 a.update(input(.9),{...view,lightingMode:'building',effects});const high=a.diagnostics().actualLights.reduce((sum,l)=>sum+l.intensity,0);assert.ok(high>low);
 a.update(input(0),{...view,lightingMode:'building',effects});assert.equal(a.diagnostics().actualLights.length,0);assert.equal(a.diagnostics().lightBudget.activeEnergy,0);
 pass('Sub-cap building power grows with active intensity; zero-flame preheat adds no firelight');
 a.update({...frame,worldTime:20},{...view,lightingMode:'unsupported'});
 a.update(frame,{...view,lightingMode:'unsupported'});assert.equal(a.diagnostics().lightingMode,'local');assert.deepEqual(a.diagnostics().actualLights,local);assert.deepEqual(a.inspect().splats,reference);
 assert.equal(JSON.stringify(frame),before);assert.equal(JSON.stringify(data),beforeData);
 pass('Invalid or omitted mode restores exact local reference lighting, with native geometry and all authoritative fields unchanged');
 let disposed=0;for(const light of pool){const original=light.dispose;light.dispose=function(){disposed++;original.call(this);};}
 a.dispose();a.dispose();assert.equal(disposed,6);assert.equal(a.root.children.length,0);
 pass('Mode switching creates no extra light resources; original owned pool disposes once');
 fs.writeFileSync('docs/art/fire-effect-settings/building-checks.json',JSON.stringify({passed:groups.length,failed:0,groups,masks,limits:['Optional broad visual approximation; no uniform physical irradiance or thermal claim.','Actual outward-facing facade appearance and hardware costs require the architect combined WebGL/JPG review.','No browser, service or GPU helper was launched.']},null,2)+String.fromCharCode(10));
 console.log(JSON.stringify({passed:groups.length,failed:0,masks:masks.length}));
}finally{a.dispose();}
