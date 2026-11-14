import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCatalogueModules,legacyModuleOwner} from '../../src/content/catalogue-modules.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {createGrayboxData} from '../../workbenches/bell-and-alder-closing/graybox-data.js';
import {createSimulation,worldToStick} from '../../src/simulation/index.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {bounds} from '../../workbenches/furnished-house/geometry.js';
import {validateCivilian} from '../../src/content/exterior-kit.js';
import {createNavigation} from '../../workbenches/furnished-house/navigation.js';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createCatalogueThermal} from '../../src/simulation/catalogue-thermal.js';
import {appendCatalogueNativeSources} from '../../src/content/catalogue-native-exteriors.js';
import * as THREE from '../../src/runtime/three.js';

test('whole-street bounds accept more vertices than JavaScript permits as function arguments',()=>{const points=Array.from({length:200000},(_,i)=>[i%51,(i%17)-3,(i%47)*.5]);assert.deepEqual(bounds(points),{min:[0,-3,0],max:[50,13,23]});});

test('opted-in host sliding keeps the full swept body and real support while accepting a clear wall tangent',()=>{
 const data=createGrayboxData();data.surfaces.push({id:'slide-wall',kind:'wall',material:'stone',normal:[-1,0,0],thickness:.16,triangles:[[[2,0,0],[2,2,8],[2,0,8]],[[2,0,0],[2,2,0],[2,2,8]]]});const trial=createTrial(data);
 try{const options={radius:.5,height:1.66,start:[1.3,0,2]},legacy=createNavigation(trial,options),host=createNavigation(trial,{...options,slide:true}),a=legacy.move(1,1,.1),b=host.move(1,1,.1);assert.ok(b.y>a.y+.25);assert.ok(b.x<=1.42);assert.equal(b.radius,.5);assert.equal(b.height,1.66);assert.equal(b.elevation,0);assert.ok(b.travelled<=.9+1e-8);}finally{trial.dispose();}
});

test('host sliding cannot cross a closed wall or an opening narrower than the native body',()=>{
 const data=createGrayboxData(),wall=(id,x)=>({id,kind:'wall',material:'stone',normal:[1,0,0],thickness:.16,triangles:[[[x,0,2],[x,2.3,6],[x,0,6]],[[x,0,2],[x,2.3,2],[x,2.3,6]]]});data.surfaces.push(wall('narrow-left',2),wall('narrow-right',2.9));const trial=createTrial(data);
 try{const narrow=createNavigation(trial,{slide:true,radius:.5,height:1.66,start:[2.45,0,1]}),blocked=narrow.move(.01,1,.4);assert.ok(blocked.y<2);assert.equal(blocked.radius,.5);const closed=createNavigation(trial,{slide:true,radius:.5,height:1.66,start:[1.3,0,3]}).move(1,0,.3);assert.ok(closed.x<=1.42);assert.equal(closed.y,3);}finally{trial.dispose();}
});

test('host sliding preserves upper-floor holes and refuses a rise above the native step limit',()=>{
 const floor=(id,x,z,w,d,y)=>({id,kind:'floor',material:'stone',normal:[0,1,0],thickness:.12,fuelAmount:0,triangles:[[[x,y,z],[x+w,y,z+d],[x+w,y,z]],[[x,y,z],[x,y,z+d],[x+w,y,z+d]]]}),make=surfaces=>createTrial({version:1,runtimeAdapterVersion:1,prefabId:'support-negative',groundY:0,gridOrigin:[0,0,0],levels:[{index:1,floorY:2.12}],surfaces,items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]}});
 const hole=make([floor('left',0,0,2,8,2.12),floor('right',4,0,4,8,2.12),floor('front',2,0,2,2,2.12),floor('rear',2,4,2,4,2.12)]),step=make([floor('lower',0,0,4,2,2.12),floor('too-high',0,2,4,4,2.5)]);
 try{for(const trial of [hole,step]){const nav=createNavigation(trial,{slide:true,radius:.5,height:1.66,maxStep:.22,start:[3,2.12,1.4]}),result=nav.move(0,1,.4);assert.ok(result.y<=2.000001);assert.equal(result.elevation,2.12);assert.ok(result.lastBlock);}}finally{hole.dispose();step.dispose();}
});

function fixture(){
 const host=scenarioDefinition('neighborhood'),shop=createGrayboxData(),house={version:1,prefabId:'fixture-house',levels:[{id:'level-0',index:0,floorY:0}],surfaces:[{id:'floor',kind:'floor',normal:[0,1,0],material:'timber',fuelClass:'frame',fuelAmount:16,thickness:.12,sourceMeshBindings:[],triangles:[[[0,0,0],[4,0,4],[4,0,0]],[[0,0,0],[0,0,4],[4,0,4]]]}],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]}};
 shop.levels.forEach((level,i)=>level.id??='level-'+i);
 const treads=shop.surfaces.filter(s=>s.supportType==='stair-tread'),manifest={version:1,prefabId:'catalogue-modular-v1',instances:[{id:'bell-and-alder',kind:'closing',source:'shop',translation:[36,0,9],quarterTurns:0,stairFlights:treads.length?[{id:'stairs',treadSourceIds:treads.map(s=>s.id),lower:{elevation:0,surfaceIds:shop.surfaces.filter(s=>s.level===0&&s.kind==='floor').map(s=>s.id)},upper:{elevation:2.12,surfaceIds:shop.surfaces.filter(s=>s.level===1&&s.kind==='floor').map(s=>s.id)}}]:[]},{id:'hopkins-fifteen',kind:'furnished',source:'house',translation:[24,0,13],quarterTurns:2,stairFlights:[]}]};
 return {host,manifest,sources:{shop,house}};
}

test('native prop registration retains the external host ID and publishes its real retirement before another thermal tick',()=>{
 const f=fixture(),id='native-barrel-fixture',compiled=appendCatalogueNativeSources(THREE,compileCatalogueModules(f.manifest,f.sources,f.host),{...f.host,buildings:[],tiles:[],obstacles:[{id,kind:'barrel',material:'metal',x:12.5,y:15,width:.656,depth:.656,height:.8}]}),state={player:{id:'hero',x:20,y:18,elevation:0},actors:[],tick:0,generation:0,clocks:{world:0}},provider=createCatalogueThermal({compiled,state,definition:f.host,config:DEFAULT_CONFIG,event:()=>{}});
 try{const boundaries=[...provider.trial.scene.index.surfaces.values()].filter(b=>b.hostObstacleId===id);assert.ok(boundaries.length>0);assert.ok(provider.trace([12.5,.4,17],[12.5,.4,14]));provider.physicalFrame();provider.retireObstacle(id);const frame=provider.physicalFrame();assert.equal(frame.tick,0);assert.ok(boundaries.every(b=>!b.intact));assert.ok(frame.boundaries.some(b=>b.ownerInstanceId==='street-props'&&!b.intact));assert.equal(provider.trace([12.5,.4,17],[12.5,.4,14]),null);assert.equal(frame.metrics.heat.input,0);}finally{provider.dispose();}
});
test('host module registration replaces only the real slots and preserves authored identity/quarter-turns',()=>{
 const f=fixture(),before=JSON.stringify(f.sources),c=compileCatalogueModules(f.manifest,f.sources,f.host);assert.equal(JSON.stringify(f.sources),before);
 assert.deepEqual(c.masks.buildingIds,['hopkins-fifteen']);assert.equal(c.instances.length,2);assert.ok(c.data.surfaces.every(s=>s.id.startsWith(s.instanceId+'::')));
 assert.ok(f.host.obstacles.filter(o=>o.buildingId&&o.buildingId!=='hopkins-fifteen').every(o=>!legacyModuleOwner(o,c.masks)));
 assert.ok(f.host.obstacles.filter(o=>o.shopId==='bell-and-alder').every(o=>legacyModuleOwner(o,c.masks)));
 assert.deepEqual(c.instances[1].data.surfaces[0].triangles[0][0],[24,0,13]);
 const moved=structuredClone(f.manifest);moved.instances[1].translation=[-5,0,8];assert.throws(()=>compileCatalogueModules(moved,f.sources,f.host),/original host lots/);
});
test('same host player retains stock, clocks, routes, pickups and input while native time follows only worldDelta',()=>{
 const f=fixture(),compiled=compileCatalogueModules(f.manifest,f.sources,f.host),sim=createSimulation({scenario:'neighborhood',characterId:'goat',catalogueModules:compiled});
 try{const first=sim.snapshot(),inventory={...first.player.inventory},stick=worldToStick({x:1,y:0},DEFAULT_CONFIG.input);sim.dispatch({type:'move',...stick});const s=sim.advance(.1);
 assert.equal(s.player.id,first.player.id);assert.equal(s.player.characterId,'goat');assert.ok(Math.abs(s.player.x-first.player.x-.9)<1e-6);assert.deepEqual(s.player.inventory,inventory);assert.equal(s.world.buildings.length,8);assert.equal(s.pickups.length,3);assert.deepEqual(s.actors.map(a=>a.id),first.actors.map(a=>a.id));
 assert.ok(Math.abs(s.clocks.world-.1)<1e-8);assert.equal(s.diagnostics.thermal.nativeTick,3);assert.ok(s.diagnostics.thermal.residual<1e-8);assert.equal(s.world.modules.length,0);assert.ok(s.world.obstacles.every(o=>!o.buildingId&&!o.shopId));
 for(const actor of s.actors.filter(a=>a.role==='resident'))assert.doesNotThrow(()=>validateCivilian(actor));
 sim.dispatch({type:'pause',paused:true});const paused=sim.advance(.1);assert.equal(paused.clocks.world,s.clocks.world);assert.equal(paused.diagnostics.thermal.nativeTick,3);
 sim.dispatch({type:'reset'});const reset=sim.advance(DEFAULT_CONFIG.step);assert.equal(reset.player.id,first.player.id);assert.deepEqual(reset.player.inventory,inventory);assert.equal(reset.catalogueModules.catalogueModules.generation,1);assert.equal(reset.catalogueModules.fireSamples.length,0);
 }finally{sim.dispose();}
});
test('native match spends once, queues one backend energy input, and publishes distinct host/native provenance',()=>{
 const f=fixture(),sim=createSimulation({scenario:'neighborhood',characterId:'goat',catalogueModules:compileCatalogueModules(f.manifest,f.sources,f.host)});
 try{sim.dispatch({type:'select-tool',tool:'matches'});sim.dispatch({type:'primary',pressed:true});sim.advance(1/30);sim.dispatch({type:'primary',pressed:true});const s=sim.advance(1/30);assert.equal(s.player.inventory.matches,11);assert.equal(s.events.filter(e=>e.type==='tool-use'&&e.tool==='matches').length,1);assert.equal(s.events.filter(e=>e.type==='thermal-heat-input').length,1);assert.equal(s.diagnostics.thermal.metrics.heat.input,1.05);assert.ok(s.events.every(e=>Number.isInteger(e.id)&&Number.isInteger(e.tick)));assert.ok(Math.abs(s.diagnostics.thermal.metrics.heat.error)<1e-7);
 }finally{sim.dispose();}
});

test('picked height cannot extend match/torch reach, while a reachable ground ray stops at the first native wall',()=>{
 const f=fixture();f.sources.house.surfaces.push({id:'reach-wall',kind:'wall',material:'timber',fuelClass:'partition',fuelAmount:1,normal:[1,0,0],thickness:.16,triangles:[[[3.3,0,-5.5],[3.3,2,-4.5],[3.3,0,-4.5]],[[3.3,0,-5.5],[3.3,2,-5.5],[3.3,2,-4.5]]]});
 const sim=createSimulation({scenario:'neighborhood',characterId:'goat',catalogueModules:compileCatalogueModules(f.manifest,f.sources,f.host)}),press=(tool,h)=>{for(const c of [{type:'select-tool',tool},{type:'aim',x:20.85,y:18,h},{type:'primary',pressed:true},{type:'primary',pressed:false}])sim.dispatch(c);return sim.advance(1/30);};
 try{let s=press('matches',5);assert.equal(s.diagnostics.thermal.metrics.heat.input,0);assert.ok(s.events.some(e=>e.type==='tool-rejected'&&e.result==='range'));press('torch',5);s=press('torch',5);assert.equal(s.diagnostics.thermal.metrics.heat.input,0);s=press('matches',.015);assert.equal(s.diagnostics.thermal.metrics.heat.input,1.05);const input=s.events.findLast(e=>e.type==='thermal-heat-input');assert.ok(input.position[0]>20.6&&input.position[0]<20.621);assert.ok(input.position[1]<.4);}finally{sim.dispose();}
});
test('production held cone delivers one finite native energy budget rather than multiplying it by clipped ray count',()=>{
 const f=fixture(),sim=createSimulation({scenario:'neighborhood',characterId:'goat',catalogueModules:compileCatalogueModules(f.manifest,f.sources,f.host)});
 try{sim.dispatch({type:'select-tool',tool:'flamethrower'});sim.dispatch({type:'primary',pressed:true});const s=sim.advance(.1);assert.equal(s.discharge.active,true);assert.equal(s.discharge.connectRays,false);assert.ok(s.discharge.rays.length>=25);assert.ok(Math.abs(s.player.inventory.flamethrowerFuel-5.97)<1e-8);assert.ok(Math.abs(s.diagnostics.thermal.metrics.heat.input-1.2)<1e-7);assert.ok(Math.abs(s.diagnostics.thermal.metrics.heat.error)<1e-7);
 }finally{sim.dispose();}
});
test('original walk-over powder and accepted-path pouring share the host clock without duplicating finite native fuel',()=>{
 const f=fixture(),scenario=structuredClone(NEIGHBORHOOD_SCENARIO);scenario.player={x:16.1,y:21,tool:'jerry-can'};
 const sim=createSimulation({scenario,characterId:'goat',catalogueModules:compileCatalogueModules(f.manifest,f.sources,f.host)});
 try{sim.dispatch({type:'primary',pressed:true});sim.dispatch({type:'primary',pressed:false});sim.dispatch({type:'move',...worldToStick({x:1,y:0},DEFAULT_CONFIG.input)});const s=sim.advance(.2),d=s.diagnostics.thermal;
 assert.equal(s.pickups.find(p=>p.id==='street-powder-west').consumed,true);assert.equal(s.events.filter(e=>e.type==='pickup-used').length,1);assert.equal(s.clocks.worldScale,.35);assert.equal(s.clocks.playerScale,1.5);assert.ok(s.clocks.world<s.clocks.player);assert.ok(Math.abs((4-s.player.inventory.gas)-s.player.travelled*.08)<1e-8);assert.ok(Math.abs((4-s.player.inventory.gas)-(d.metrics.fuel.added+d.pendingDepositedFuel))<1e-8);assert.ok(Math.abs(d.metrics.fuel.error)<1e-7);assert.ok(s.clocks.world-d.nativeWorldTime<1/30+1e-9);
 assert.ok(s.cells.some(c=>c.depositedFuel>0),'Native deposited fuel reaches the original visible ground-trail channel');
 }finally{sim.dispose();}
});

test('native contact and independent coating ignition drive the one host witness and pistol',()=>{
 const f=fixture(),scenario=structuredClone(NEIGHBORHOOD_SCENARIO);scenario.player={x:39.6,y:18,tool:'matches'};
 const officer=scenario.actors.find(a=>a.id==='chicago-beat-officer');officer.x=39.6;officer.y=19;officer.route=[];
 f.sources.shop.furnitureParts.push({id:'coated-test-part',itemId:'coated-test-item',sourceMeshBinding:'coated-render',bounds:{min:[3.4,0,8],max:[3.8,.8,8.4]},material:'timber',fuelClass:'furniture',fuelAmount:.1,finish:{fuelClass:'lacquer',amount:.01}});
 f.sources.shop.items.push({id:'coated-test-item',position:[3.6,0,8.2],bounds:{min:[3.4,0,8],max:[3.8,.8,8.4]}});
 f.sources.shop.sourceMeshes.push({id:'coated-render',name:'Exact fixture board',bounds:{min:[3.4,0,8],max:[3.8,.8,8.4]}});f.sources.shop.render.geometry.push({id:'coated-render',triangles:[[[3.4,0,8.2],[3.8,0,8.2],[3.8,.8,8.2]],[[3.4,0,8.2],[3.8,.8,8.2],[3.4,.8,8.2]]].map(t=>({vertices:t.map(v=>[...v,0,0,1,0,0,0,0,1,1,1])}))});
 f.sources.shop.surfaces.push({id:'host-body',hostObstacleId:'barrel-fixture',kind:'fitting',material:'iron',fuelAmount:0,normal:[1,0,0],triangles:[[[6,0,3],[6,1,4],[6,0,4]],[[6,0,3],[6,1,3],[6,1,4]]]});
 const compiled=compileCatalogueModules(f.manifest,f.sources,f.host),probe=createCatalogueThermal({compiled,state:{player:{id:'hero',x:39.6,y:18,elevation:0},actors:[],tick:0,generation:0,clocks:{world:0}},definition:f.host,config:DEFAULT_CONFIG,event:()=>{}});
 try{assert.equal(probe.lineClear({x:39.6,y:19,h:1},{x:39.6,y:17.201,h:.4},{sight:true}),true,'Front native surface is visible despite a conservative part AABB');assert.equal(probe.lineClear({x:39.6,y:19,h:1},{x:39.6,y:17.199,h:.4},{sight:true}),false,'Actual material still occludes a point behind it');assert.ok(Math.abs(probe.trace([39.6,1,19],[39.6,.1,17]).position[2]-17.2)<1e-7);
   probe.physicalFrame();assert.ok(probe.trace([43,.5,12.5],[41,.5,12.5]));probe.retireObstacle('barrel-fixture');const retired=probe.physicalFrame();assert.ok(retired.boundaries.some(b=>b.sourceSurfaceId==='bell-and-alder::host-body'&&b.intact===false));assert.equal(retired.tick,0);assert.equal(probe.trace([43,.5,12.5],[41,.5,12.5]),null);assert.equal(retired.metrics.heat.input,0);
 }finally{probe.dispose();}
 const sim=createSimulation({scenario,characterId:'goat',catalogueModules:compiled});
 try{
   sim.dispatch({type:'aim',x:39.6,y:17.15});sim.dispatch({type:'primary',pressed:true});sim.dispatch({type:'primary',pressed:false});const first=sim.advance(1/30);
   assert.equal(first.witness.reaction.kind,'aggressive');const proof=first.witness.reaction.nativeProof;
   assert.equal(proof.receiverId,'bell-and-alder::coated-test-part');assert.equal(proof.fuelId,'bell-and-alder::coated-test-part:finish');assert.equal(proof.nativeTick,1);assert.equal(proof.hostTick,1);assert.ok(first.events.some(e=>e.type==='native-ignition-proof'));
   assert.ok(Math.abs(proof.contact[2]-17.2)<1e-7);assert.equal(proof.observation.playerVisible,true);assert.equal(proof.observation.contactVisible,true);
   let last=first;for(let i=0;i<40;i++)last=sim.advance(1/30);
   assert.ok(last.events.some(e=>e.type==='officer-shot'&&e.actorId==='chicago-beat-officer'&&e.damage===24));assert.equal(last.player.hp,76);
 }finally{sim.dispose();}
});

test('incremental ground publication equals full scanning through poured oil, heat, lantern spill and reset',()=>{
 const f=fixture(),make=cached=>{const compiled=compileCatalogueModules(f.manifest,f.sources,f.host);compiled.executionCache=cached;return createSimulation({scenario:'neighborhood',characterId:'goat',catalogueModules:compiled});},a=make(false),b=make(true);
 const command=c=>{assert.ok(a.dispatch(c));assert.ok(b.dispatch(c));};let burning=false,deposited=false;
 try{
   assert.deepEqual(b.snapshot().cells,a.snapshot().cells);
   command({type:'primary',pressed:true});command({type:'primary',pressed:false});command({type:'move',...worldToStick({x:1,y:0},DEFAULT_CONFIG.input)});
   for(let tick=1;tick<=72;tick++){
     if(tick===7){command({type:'move',x:0,y:0});command({type:'primary',pressed:true});command({type:'primary',pressed:false});command({type:'select-tool',tool:'matches'});command({type:'aim',x:20.45,y:18});command({type:'primary',pressed:true});command({type:'primary',pressed:false});}
     if(tick===10){command({type:'select-tool',tool:'molotov'});command({type:'primary',pressed:true});command({type:'primary',pressed:false});}
     if(tick===11)command({type:'move',...worldToStick({x:0,y:.4},DEFAULT_CONFIG.input)});
     if(tick===12)command({type:'move',x:0,y:0});
     if(tick===13){command({type:'primary',pressed:true});command({type:'primary',pressed:false});}
     if(tick===65)command({type:'reset'});
     const reference=a.advance(1/60),cached=b.advance(1/60);assert.deepEqual(cached.cells,reference.cells);assert.deepEqual(cached.diagnostics.thermal.metrics,reference.diagnostics.thermal.metrics);burning||=cached.cells.some(c=>c.phase==='burning');deposited||=cached.cells.some(c=>c.depositedFuel>0);
   }
   assert.ok(burning&&deposited);
 }finally{a.dispose();b.dispose();}
});
