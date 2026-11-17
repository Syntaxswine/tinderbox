import fs from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSharedMap} from '../../src/content/shared-map.js';
import {createSimulation,worldToStick,DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {loadSharedMapSources,MAP_SOURCE_PINS} from '../../src/runtime/shared-map.js';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {createSceneThermal} from '../../src/simulation/scene-thermal.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url))),index=read('assets/runtime/map-sources/new-york/index.json'),library=read('assets/runtime/map-sources/new-york/library.json'),navigation=read('assets/art/place-scenes/new-york/navigation.json');
const tick=sim=>sim.advance(1/60),command=(sim,c)=>{assert.equal(sim.dispatch(c),true);return tick(sim);};

test('the normal New York loader requests only its two pinned compact files, with no authoring/evidence fetch',async()=>{
  const calls=[],source=await loadSharedMapSources('new-york',{loadPinned:async(url,pin)=>{calls.push(url);const bytes=fs.readFileSync(new URL(url));assert.equal(createHash('sha256').update(bytes).digest('hex'),pin);return JSON.parse(bytes);}});
  assert.equal(source.index.placeId,'new-york');assert.equal(calls.length,2);assert.ok(calls.every(url=>url.includes('/assets/runtime/map-sources/new-york/')));assert.equal(Object.keys(MAP_SOURCE_PINS).length,1);await assert.rejects(loadSharedMapSources('administration'),/not accepted/);
});

test('the actual cold glass contact cannot heat co-located timber through its shared thermal cell',()=>{
  const compiled=compileSharedMap(index,library,navigation),state={player:{id:'glass-control',x:50.5,y:25.2,elevation:2.12,height:1.66,radius:.5,hp:100},actors:[],tick:0,clocks:{world:0}},provider=createSceneThermal({compiled,state,definition:compiled.definition,config:DEFAULT_CONFIG,event:()=>{}});
  try{
    const target={x:50.5,y:26,h:3.02},hit=provider.trace([50.5,3.02,25.2],[50.5,3.02,26]);assert.equal(hit.surface.material,'glass');assert.equal(hit.surface.sourceSurfaceId,'new-york::carrier/main/0/lower-3/glass');
    const result=provider.heatTool('matches',state.player,target,DEFAULT_CONFIG.tools.matches);assert.equal(result.result,'no-fuel');assert.deepEqual(result.cells,[]);
    const picked=provider.pickAimSurface({origin:[50.5,3.02,25.2],direction:[0,0,1]});assert.ok(picked.sourceSurfaceId.includes('/lower-3/glass'));
    const endpoint=provider.heatTool('matches',state.player,picked,DEFAULT_CONFIG.tools.matches);assert.equal(endpoint.result,'no-fuel','The exact source-picker endpoint must retain its inert contact');assert.deepEqual(endpoint.cells,[]);
    const contact=provider.trial.scene.cellAt([50.5,3.02,25.98]);assert.ok(contact.fuels.some(f=>f.amount>0),'The glass cell really contains adjacent timber; an empty-cell control would miss the regression');
    provider.step(1/30,1/30);assert.equal(provider.trial.metrics().heat.input,0);assert.equal(provider.trial.metrics().burningCount,0);
    Object.assign(state.player,{x:51});const timber=provider.pickAimSurface({origin:[51,3.02,25.2],direction:[0,0,1]});provider.heatTool('matches',state.player,timber,DEFAULT_CONFIG.tools.matches);provider.step(1/30,2/30);assert.equal(provider.trial.metrics().heat.input,provider.trial.rules.matchEnergy,'The actual timber mullion picker endpoint in front of the pane remains a valid contact');
  }finally{provider.dispose();compiled.dispose();}
});

for(const characterId of ['goat','horse','bear'])test('the full-source '+characterId+' uses native movement up the real front stair, opens the real door and enters through normal commands',()=>{
  const compiled=compileSharedMap(index,library,navigation),sim=createSimulation({gameplayMap:compiled,characterId});try{
    let s=sim.snapshot();assert.equal(s.world.tiles.length,0);assert.equal(s.diagnostics.thermal.gridCells,0);assert.equal(s.diagnostics.thermal.carriers.activeCarriers,0);assert.equal(s.player.radius,CHARACTER_PROFILES[characterId].radius);assert.equal(s.player.height,CHARACTER_PROFILES[characterId].height);
    command(sim,{type:'move',...worldToStick({x:0,y:1},compiled.configuration.input)});for(let i=1;i<72;i++)s=tick(sim);s=command(sim,{type:'move',x:0,y:0});
    assert.ok(Math.abs(s.player.elevation-2.12)<1e-5);assert.ok(s.player.y>24.5&&s.player.y<25.2);assert.equal(s.diagnostics.thermal.gridCells,0,'Walking/render ownership cannot seed thermal cells');
    assert.equal(s.player.interaction?.id,'ny-front');assert.equal(s.player.interaction.action,'open');assert.equal(s.player.interaction.enabled,true);command(sim,{type:'interact',portalId:'ny-front',action:'open'});s=sim.advance(1/30);assert.equal(s.navigation.portalStates['ny-front'],true);assert.ok(s.diagnostics.thermal.carriers.activeCarriers>0);
    command(sim,{type:'move',...worldToStick({x:0,y:1},compiled.configuration.input)});for(let i=1;i<18;i++)s=tick(sim);s=command(sim,{type:'move',x:0,y:0});assert.ok(s.player.y>27);assert.equal(s.player.interior,true);assert.ok(Math.abs(s.player.elevation-2.12)<1e-5);assert.equal(s.player.hp,100);
    const before=sim.snapshot();command(sim,{type:'pause',paused:true});s=sim.advance(.2);assert.equal(s.clocks.world,before.clocks.world);assert.equal(s.player.y,before.player.y);
    s=command(sim,{type:'reset'});assert.equal(s.diagnostics.thermal.carriers.activeCarriers,0);assert.equal(s.diagnostics.thermal.gridCells,0);assert.equal(s.navigation.portalStates['ny-front'],false);assert.equal(s.player.elevation,0);assert.deepEqual(s.player.inventory,DEFAULT_CONFIG.inventory);
  }finally{sim.dispose();compiled.dispose();}
});
