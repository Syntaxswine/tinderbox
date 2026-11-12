import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from '../../../src/runtime/three.js';import {createFurnishedHouseArt} from '../../../workbenches/furnished-house/art.js';
const data=JSON.parse(fs.readFileSync('workbenches/furnished-house/house-data.json')),a=await createFurnishedHouseArt(T,{data}),camera=new T.OrthographicCamera(-10,10,8,-8,.1,100);camera.position.set(18,14,-20);camera.lookAt(5,2,4);camera.updateMatrixWorld(true);
const frame=(revision,changes={})=>({version:1,revision,tick:revision*30,worldTime:revision,full:false,boundaries:[],supports:[],items:[],parts:[],falls:[],rubble:[],tombstones:[],events:[],fireSamples:[],...changes}),view={mode:'exterior',camera},groups=[],pass=s=>groups.push(s);
const source=data.surfaces.find(s=>s.kind==='roof'),patch=(x,z,y)=>[[[x,y,z],[x+.24,y,z+.24],[x+.24,y,z]],[[x,y,z],[x,y,z+.24],[x+.24,y,z+.24]]],footA=patch(1,4,.366),footB=patch(3,4,.366),fly={id:'transfer-flight',position:[1.12,1.4,4.12],origin:[1.12,2.6,4.12],fuelIds:['fuel-a'],geometry:{triangles:patch(1,4,2.6),thickness:.12,normal:[0,1,0],kind:'floor'},quaternion:[0,0,0,1]};
try{
 a.update(frame(0,{full:true}),view);a.update(frame(1,{falls:[fly]}),view);assert.equal(a.diagnostics().debris.flights,1);
 a.update(frame(2,{tombstones:[{collection:'falls',id:fly.id},{collection:'rubble',id:'transient-landing'}],events:[{type:'landing',fallId:fly.id,fuelIds:fly.fuelIds,position:[1.12,.366,4.12]}]}),view);
 assert.equal(a.diagnostics().debris.flights,0);assert.equal(a.diagnostics().debris.pendingLanding,0);assert.equal(a.diagnostics().falls,0);pass('A skipped land-and-retransfer retires flight unconditionally even when its historical rubble is gone');
 const old={id:'old-rubble',fuelIds:['fuel-a','fuel-b'],floorFootprint:footA,thickness:.01,phase:'burning',remainingAmount:.2,remainingFraction:.8,heatFraction:1};
 a.update(frame(3,{rubble:[old],falls:[fly]}),view);
 a.update(frame(3,{rubble:[],falls:[]}),view);assert.equal(a.diagnostics().debris.flights,1);assert.equal(a.diagnostics().falls,1);assert.equal(a.diagnostics().debris.residue,1);pass('Same-revision paused/camera empty deltas preserve current flight and rubble');
 const next={...old,id:'new-rubble',floorFootprint:footB,supportBoundaryId:'actual-stone-support'};
 const samples=['fuel-a','fuel-b'].map((id,i)=>({id,sourceSurfaceId:source.id,originalSourceSurfaceId:source.id,...(i===0?{rubbleId:next.id}:{}),part:'contents',x:3.12,y:.366,z:4.12,nx:0,ny:1,nz:0,area:.0576,flame:.8,smoke:.3,ignitionTime:0,floorFootprint:footB}));
 a.update(frame(4,{boundaries:[{id:source.id,sourceSurfaceId:source.id,triangles:source.triangles,intact:false}],rubble:[next],tombstones:[{collection:'rubble',id:old.id},{collection:'falls',id:fly.id}],fireSamples:samples}),view);
 assert.equal(a.diagnostics().representedSamples,2);assert.equal(a.diagnostics().missingSamples,0);assert.equal(a.diagnostics().debris.residue,1);
 for(const e of a.inspect().emitters){assert.equal(e.rubbleId,next.id);assert.equal(e.supportOrigin,'landed');assert.ok(e.anchor[0]>=3&&e.anchor[0]<=3.24);assert.ok(e.supportRadius<=.121);}
 pass('New landing ownership beats both old rubble tombstones and a retired roof provenance');
 assert.ok(a.inspect().emitters.every(e=>Number.isFinite(e.supportRadius)&&e.supportRadius<=.121));pass('Shared duplicated fuel footprints preserve the real outer boundary instead of inflating the flame envelope');
 const airborne={...fly,id:'active-again',position:[3.12,1.1,4.12]};a.update(frame(5,{falls:[airborne],fireSamples:[{...samples[0],fallId:airborne.id,y:1.1}]}),view);
 assert.equal(a.diagnostics().missingSamples,0);assert.equal(a.inspect().emitters[0].supportOrigin,'airborne');assert.equal(a.inspect().emitters[0].fallId,airborne.id);pass('A current airborne association takes priority over retained prior landing metadata');
 a.update(frame(6,{tombstones:[{collection:'falls',id:airborne.id},{collection:'rubble',id:next.id}]}),view);
 assert.equal(a.diagnostics().debris.flights,0);assert.equal(a.diagnostics().debris.residue,0);assert.equal(a.diagnostics().falls,0);a.update(frame(0,{full:true}),view);assert.equal(a.diagnostics().debris.pendingLanding,0);pass('Escape/retirement and full reset leave no retained flight, landing or fuel-owner cache');
 fs.writeFileSync('docs/art/furnished-house/retained-checks.json',JSON.stringify({passed:groups.length,failed:0,groups,scope:'Focused coalesced-render lifecycle, associations and support-envelope regression; long exact runtime replay is separate.'},null,2)+'\n');console.log(JSON.stringify({passed:groups.length,failed:0}));
}finally{a.dispose();}
