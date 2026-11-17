import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {compileSharedMapPilot,gameplayMapDefinition} from '../../src/content/shared-map-pilot.js';
import {createSimulation,worldToStick,DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {SHARED_MAP_CAPABILITIES} from '../../src/content/visit-capabilities.js';
import {createSceneThermal} from '../../src/simulation/scene-thermal.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url)));
const pilot=read('assets/runtime/shared-map-pilots/new-york.json'),navigation=read('assets/art/place-scenes/new-york/navigation.json');
const make=characterId=>createSimulation({gameplayMap:compileSharedMapPilot(pilot,navigation),characterId});
const tick=sim=>sim.advance(1/60);
const command=(sim,c)=>{assert.equal(sim.dispatch(c),true);return tick(sim);};
function press(sim){command(sim,{type:'primary',pressed:false});return command(sim,{type:'primary',pressed:true});}

test('New York pilot keeps exact source pins, quantities and world coordinates without fetching authoring at runtime',()=>{
  for(const pin of pilot.sourcePins){const bytes=fs.readFileSync(new URL('../../'+pin.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.sha256,pin.path);}
  assert.equal(pilot.carriers.length,12342);assert.equal(pilot.activeCarrierIds.length,3);
  assert.equal(pilot.carriers.filter(c=>c.finish).length,1);assert.equal(pilot.carriers.find(c=>c.finish).finish.amount,.1);
  assert.deepEqual(pilot.surfaces.find(s=>s.fuelClass==='clapboard').bounds.min,[54,2.119999885559082,25.92000000178814]);
  assert.ok(Math.abs(pilot.surfaces.find(s=>s.kind==='floor').bounds.max[1]-8.48)<1e-5);
  assert.equal(pilot.surfaces.find(s=>s.fuelClass==='clapboard').level,1,'Native first-story wall must tolerate source precision below 2.12 m');
  assert.equal(pilot.surfaces.find(s=>s.kind==='floor').level,4,'Explicit native floor level overrides slab underside below its occupied level');
  assert.equal(pilot.surfaces.find(s=>s.material==='glass').fuelAmount,0);
  assert.ok(pilot.surfaces.every(s=>s.id.startsWith('new-york::')&&!s.id.includes('new-york::new-york::')));
  assert.throws(()=>gameplayMapDefinition({...navigation,width:Infinity}),/bounds/);
});

for(const characterId of ['goat','horse','bear'])test('New York uses the shared 9 m/s player clock and native '+characterId+' body',()=>{
  const sim=make(characterId);try{
    const before=sim.snapshot();assert.equal(before.capabilities,SHARED_MAP_CAPABILITIES);assert.equal(sim.capabilities,before.capabilities);
    assert.equal(before.world.tiles.length,0);assert.equal(before.world.width,112);assert.equal(before.world.height,78);
    assert.equal(before.diagnostics.thermal.carriers.activeCarriers,3);assert.equal(before.diagnostics.thermal.carriers.reservedCarriers,12339);
    const stick=worldToStick({x:1,y:0},DEFAULT_CONFIG.input);assert.equal(sim.dispatch({type:'move',...stick}),true);let s;for(let i=0;i<30;i++)s=tick(sim);
    assert.ok(Math.abs(s.player.x-before.player.x-4.5)<1e-6);assert.ok(Math.abs(s.player.y-before.player.y)<1e-6);assert.equal(s.player.elevation,0);
    assert.ok(Math.abs(s.clocks.world-.5)<1e-8);assert.ok(Math.abs(s.clocks.player-.5)<1e-8);
    assert.equal(s.diagnostics.thermal.wind.obstacleResolved,false,'The cottage-specific resolved bake is not silently reused');
  }finally{sim.dispose();}
});

test('one New York host spends the standard five tools, uses real-path oil and clears pause/reset state',()=>{
  const sim=make('goat');try{
    command(sim,{type:'select-tool',tool:'jerry-can'});press(sim);
    assert.equal(sim.dispatch({type:'move',...worldToStick({x:1,y:0},DEFAULT_CONFIG.input)}),true);let s;for(let i=0;i<12;i++)s=tick(sim);
    command(sim,{type:'move',x:0,y:0});press(sim);s=sim.snapshot();assert.equal(s.player.pouring,false);
    assert.ok(Math.abs(s.player.inventory.gas-(4-1.8*.08))<1e-7);assert.ok(s.cells.some(c=>c.depositedFuel>0&&Math.abs(c.h)<.03));
    const gasUsed=4-s.player.inventory.gas;assert.ok(Math.abs(s.diagnostics.thermal.metrics.fuel.added-gasUsed)<1e-7,'Every oil birth is debited from stock');
    command(sim,{type:'select-tool',tool:'matches'});command(sim,{type:'aim',x:s.player.x-.075,y:s.player.y,h:.015});
    s=press(sim);assert.equal(s.player.inventory.matches,11);for(let i=0;i<4;i++)s=tick(sim);assert.equal(s.player.inventory.matches,11,'A held match is one press');
    command(sim,{type:'select-tool',tool:'torch'});s=press(sim);assert.equal(s.player.torch.phase,'lit');const fuel=s.player.inventory.torchFuel,time=s.clocks.world;
    s=command(sim,{type:'primary',pressed:false});for(let i=0;i<3;i++)s=tick(sim);assert.ok(Math.abs(fuel-s.player.inventory.torchFuel-(s.clocks.world-time)*.12)<1e-8);
    s=press(sim);assert.ok(s.events.some(e=>e.tool==='torch'&&e.type==='tool-use'));
    command(sim,{type:'select-tool',tool:'flamethrower'});s=press(sim);for(let i=0;i<5;i++)s=tick(sim);assert.ok(s.player.inventory.flamethrowerFuel<6);assert.equal(s.discharge.tool,'flamethrower');
    command(sim,{type:'primary',pressed:false});command(sim,{type:'select-tool',tool:'molotov'});s=press(sim);assert.ok(s.player.lanternAim);assert.equal(s.player.inventory.molotovs,4);
    command(sim,{type:'move',...worldToStick({x:.5,y:0},DEFAULT_CONFIG.input)});s=command(sim,{type:'move',x:0,y:0});assert.equal(s.player.lanternAim.canThrow,true);
    s=press(sim);assert.equal(s.player.inventory.molotovs,3);assert.ok(s.projectiles.length||s.events.some(e=>e.type==='lantern-impact'));
    s=command(sim,{type:'pause',paused:true});assert.equal(s.player.pouring,false);assert.equal(s.discharge.active,false);const world=s.clocks.world;for(let i=0;i<3;i++)s=tick(sim);assert.equal(s.clocks.world,world);
    s=command(sim,{type:'reset'});assert.deepEqual(s.player.inventory,DEFAULT_CONFIG.inventory);assert.equal(s.projectiles.length,0);assert.equal(s.diagnostics.thermal.carriers.activeCarriers,3);assert.equal(s.world.tiles.length,0);
  }finally{sim.dispose();}
});

test('exact source-contact fixtures heat the occupied upper level and keep the finite wall coating separate from its core',()=>{
  // Direct provider fixtures establish source coordinates/physical response.
  // These stances do not claim a normal-input traversal or browser visit.
  const compiled=compileSharedMapPilot(pilot,navigation),state={player:{id:'fixture',x:57.25,y:42.25,elevation:8.48,height:1.66,radius:.5,hp:100},actors:[],tick:0,generation:0,clocks:{world:0}},provider=createSceneThermal({compiled,state,definition:compiled.definition,config:DEFAULT_CONFIG,event:()=>{}});
  try{
    provider.heatTool('matches',state.player,{x:57.25,y:42.25,h:8.495},DEFAULT_CONFIG.tools.matches);
    provider.step(1/30,1/30);state.tick++;
    const floor=[...provider.trial.scene.fuels.values()].filter(f=>f.sourceSurfaceId?.includes('upper-floor'));
    assert.ok(floor.some(f=>f.cells.some(c=>c.heat>0)));
    assert.ok([...provider.trial.scene.cells.values()].filter(c=>c.position[1]<1).every(c=>c.heat===0),'Elevated contact does not heat a ground projection');
    Object.assign(state.player,{x:54.8,y:25.2,elevation:2.12});
    provider.heatTool('matches',state.player,{x:54.8,y:26,h:3.02},DEFAULT_CONFIG.tools.matches);provider.step(1/30,2/30);state.tick++;
    const coatings=[...provider.trial.scene.fuels.values()].filter(f=>f.physicalFinish),wall=[...provider.trial.scene.index.surfaces.values()].filter(b=>b.sourceSurfaceId?.includes('cell-1-22/1'));
    const initiallyLit=coatings.filter(f=>f.lit);assert.ok(initiallyLit.length);assert.ok(Math.abs(coatings.reduce((n,f)=>n+f.initial,0)-.1)<1e-6);
    const finishSample=provider.physicalFrame().fireSamples.find(f=>f.fuelClass==='lacquer');assert.ok(finishSample);assert.ok(Math.abs(finishSample.z-25.92)<1e-5,'Coating flame lies on the actual exposed wall face');
    for(let i=0;i<135;i++){provider.step(1/30,(i+3)/30);state.tick++;}
    assert.ok(initiallyLit.every(f=>f.amount<1e-7));assert.ok(wall.every(b=>b.intact),'Four-second finish consumption cannot retire a 180-second timber core');
    assert.ok(provider.diagnostics().carriers.coldReserve>15000);assert.ok(Math.abs(provider.diagnostics().carriers.world.error)<2e-6);
  }finally{provider.dispose();}
});

test('source-aware aiming returns the real upper floor and wall face, with an authoritative miss outside geometry',()=>{
  const sim=make('goat');try{
    const upper=sim.pickAimSurface({origin:[57.25,9,42.25],direction:[0,-1,0]});assert.ok(upper);assert.ok(Math.abs(upper.h-8.48)<1e-5);assert.ok(upper.sourceSurfaceId.includes('upper-floor'));
    const wall=sim.pickAimSurface({origin:{x:54.8,y:3.02,z:25.2},direction:{x:0,y:0,z:1}});assert.ok(wall);assert.ok(Math.abs(wall.y-25.92)<1e-5);assert.ok(wall.sourceSurfaceId.includes('cell-1-22/1'));
    const column=sim.pickAimSurface({origin:[54.5,3.02,25.2],direction:[0,0,1]});assert.ok(column.sourceSurfaceId.includes('entry/column--1'));assert.ok(column.y<25.92,'The source picker must stop at the real column in front of the wall');
    assert.equal(sim.pickAimSurface({origin:[-10,10,-10],direction:[0,-1,0]}),false);assert.equal(sim.pickAimSurface({origin:[1,1,1],direction:[0,0,0]}),false);
  }finally{sim.dispose();}
});
