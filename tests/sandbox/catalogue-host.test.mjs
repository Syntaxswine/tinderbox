import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCatalogueModules,legacyModuleOwner} from '../../src/content/catalogue-modules.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {createGrayboxData} from '../../workbenches/bell-and-alder-closing/graybox-data.js';
import {createSimulation,worldToStick} from '../../src/simulation/index.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {bounds} from '../../workbenches/furnished-house/geometry.js';

test('whole-street bounds accept more vertices than JavaScript permits as function arguments',()=>{const points=Array.from({length:200000},(_,i)=>[i%51,(i%17)-3,(i%47)*.5]);assert.deepEqual(bounds(points),{min:[0,-3,0],max:[50,13,23]});});

function fixture(){
 const host=scenarioDefinition('neighborhood'),shop=createGrayboxData(),house={version:1,prefabId:'fixture-house',levels:[{id:'level-0',index:0,floorY:0}],surfaces:[{id:'floor',kind:'floor',normal:[0,1,0],material:'timber',fuelClass:'frame',fuelAmount:16,thickness:.12,sourceMeshBindings:[],triangles:[[[0,0,0],[4,0,4],[4,0,0]],[[0,0,0],[0,0,4],[4,0,4]]]}],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]}};
 shop.levels.forEach((level,i)=>level.id??='level-'+i);
 const treads=shop.surfaces.filter(s=>s.supportType==='stair-tread'),manifest={version:1,prefabId:'catalogue-modular-v1',instances:[{id:'bell-and-alder',kind:'closing',source:'shop',translation:[36,0,9],quarterTurns:0,stairFlights:treads.length?[{id:'stairs',treadSourceIds:treads.map(s=>s.id),lower:{elevation:0,surfaceIds:shop.surfaces.filter(s=>s.level===0&&s.kind==='floor').map(s=>s.id)},upper:{elevation:2.12,surfaceIds:shop.surfaces.filter(s=>s.level===1&&s.kind==='floor').map(s=>s.id)}}]:[]},{id:'hopkins-fifteen',kind:'furnished',source:'house',translation:[24,0,13],quarterTurns:2,stairFlights:[]}]};
 return {host,manifest,sources:{shop,house}};
}
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
 sim.dispatch({type:'pause',paused:true});const paused=sim.advance(.1);assert.equal(paused.clocks.world,s.clocks.world);assert.equal(paused.diagnostics.thermal.nativeTick,3);
 sim.dispatch({type:'reset'});const reset=sim.advance(DEFAULT_CONFIG.step);assert.equal(reset.player.id,first.player.id);assert.deepEqual(reset.player.inventory,inventory);assert.equal(reset.catalogueModules.catalogueModules.generation,1);assert.equal(reset.catalogueModules.fireSamples.length,0);
 }finally{sim.dispose();}
});
test('native match spends once, queues one backend energy input, and publishes distinct host/native provenance',()=>{
 const f=fixture(),sim=createSimulation({scenario:'neighborhood',characterId:'goat',catalogueModules:compileCatalogueModules(f.manifest,f.sources,f.host)});
 try{sim.dispatch({type:'select-tool',tool:'matches'});sim.dispatch({type:'primary',pressed:true});sim.advance(1/30);sim.dispatch({type:'primary',pressed:true});const s=sim.advance(1/30);assert.equal(s.player.inventory.matches,11);assert.equal(s.events.filter(e=>e.type==='tool-use'&&e.tool==='matches').length,1);assert.equal(s.events.filter(e=>e.type==='thermal-heat-input').length,1);assert.equal(s.diagnostics.thermal.metrics.heat.input,1.05);assert.ok(s.events.every(e=>Number.isInteger(e.id)&&Number.isInteger(e.tick)));assert.ok(Math.abs(s.diagnostics.thermal.metrics.heat.error)<1e-7);
 }finally{sim.dispose();}
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
 }finally{sim.dispose();}
});
