// D: suspected defects, each with a control.
import {createSimulation, NEIGHBORHOOD_SCENARIO, COTTAGE_PAIR_SCENARIO, calmCottageWind, DEFAULT_CONFIG, press, lastTool, r, STEP} from './lib.mjs';
const hopkins9 = NEIGHBORHOOD_SCENARIO.buildings.find(b => b.id === 'hopkins-nine');
function collect(sim, seconds, events) {
  let s; for (let i = 0; i < Math.round(seconds * 60); i++) { s = sim.advance(STEP); for (const e of s.events) if (!events.has(e.id)) events.set(e.id, e); } return s;
}

console.log('== 8a. Flamethrower versus a wooden porch (Hopkins 12, plinth 0.48 m; flame rays at h = 1.05 m) ==');
for (const tool of ['flamethrower', 'matches']) {
  const house = {id: 'h12', prefabId: 'hopkins-4-12', x: 10, y: 10, quarterTurns: 0};
  // Porch occupies x 10..18, y 8..10. Stand south of it, facing north (+y).
  const sim = createSimulation({scenario: {id: 'neighborhood', width: 28, height: 24, buildings: [house], obstacles: [], actors: [],
    player: {x: 12.5, y: tool === 'matches' ? 7.3 : 6.2, tool, heading: Math.PI / 2}}, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
  const events = new Map(); let s;
  if (tool === 'matches') { s = press(sim, 12.5, 8.1); for (const e of s.events) events.set(e.id, e); s = collect(sim, 3, events); }
  else { sim.dispatch({type: 'aim', x: 12.5, y: 9}); sim.dispatch({type: 'primary', pressed: true}); s = collect(sim, 3, events); sim.dispatch({type: 'primary', pressed: false}); }
  const ignitions = [...events.values()].filter(e => e.type === 'structure-ignition');
  const rayTargets = tool === 'flamethrower' ? [...new Set(s.discharge.rays.map(x => x.obstacleId))].join(',') : '';
  console.log(tool.padEnd(13), '| fuel used', r(tool === 'matches' ? 12 - s.player.inventory.matches : 6 - s.player.inventory.flamethrowerFuel, 2),
    '| structure ignitions in 3 s:', ignitions.length, ignitions.slice(0, 2).map(e => e.siteId + ' cause=' + e.cause).join(' ; '),
    '| warm/burning samples', s.structureFire.length, rayTargets ? '| ray hit boxes: ' + rayTargets : '');
  sim.dispose();
}

console.log('\n== 8b. config.fire.ignition.wood = 3 (control: default 1.1). Match heat is 1.8. ==');
for (const wood of [1.1, 3]) {
  const a = createSimulation({scenario: {id: 'neighborhood', width: 16, height: 44, buildings: [hopkins9], obstacles: [], actors: [],
    player: {x: 10.82, y: 34.63, tool: 'matches', heading: Math.PI}}, config: {fire: {ignition: {wood}}}});
  const sa = press(a, 9.9, 34.63);
  const b = createSimulation({scenario: {...COTTAGE_PAIR_SCENARIO, patches: [], actors: []}, cottageWind: calmCottageWind, config: {fire: {ignition: {wood}}}});
  const sb = press(b, 51, 13.5);
  console.log('ignition.wood =', wood, '| ordinary Hopkins siding:', lastTool(sa).result, '| Ashland siding (same shared rule?):', lastTool(sb).result,
    '| snapshot sidingIgnitionHeat', sb.cottageFire.diagnostics.sidingIgnitionHeat);
  a.dispose(); b.dispose();
}

console.log('\n== 8c. After burnout: does the footprint the art draws as burning rubble carry any heat? ==');
{
  const sim = createSimulation({scenario: {id: 'neighborhood', width: 16, height: 44, buildings: [hopkins9], obstacles: [], actors: [],
    player: {x: 10.82, y: 34.63, tool: 'matches', heading: Math.PI}}, config: {input: {cameraRelative: false}}});
  const events = new Map();
  let s = press(sim, 9.9, 34.63);
  while (!s.world.buildings[0].destroyed) s = collect(sim, .25, events);
  const burnout = [...events.values()].find(e => e.type === 'building-burnout');
  sim.dispatch({type: 'select-tool', tool: 'jerry-can'}); sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
  sim.dispatch({type: 'move', x: -1, y: 0}); s = collect(sim, .5, events); sim.dispatch({type: 'move', x: 0, y: 0});
  s = collect(sim, 6, events);
  const poured = s.cells.filter(c => c.depositedFuel > 0);
  console.log('burnout at world', r(burnout.worldTime, 2), '| player walked into the footprint to x =', r(s.player.x, 2), '(house spanned x 2.91..10.09)',
    '| world now', r(s.clocks.world, 2), '(' + r(s.clocks.world - burnout.worldTime, 1) + ' s after burnout; art flame pockets last 13..19 s, glow 24 s)',
    '| hp', s.player.hp, '| gas cells poured over the rubble', poured.length, 'still unburnt', poured.filter(c => c.phase !== 'burning' && c.phase !== 'spent').length,
    '| max ground heat anywhere', r(Math.max(...s.cells.map(c => c.heat)), 3), '| structureFire samples', s.structureFire.length);
  sim.dispose();
}

console.log('\n== 8d. A drum beside a burning house wall on paving (structure fire -> barrel) ==');
for (const [label, patches] of [['paving', []], ['CONTROL lawn under the drum', [{x: 10, y: 35.5, width: 2, depth: 2, material: 'grass'}]]]) {
  const drum = {id: 'drum', x: 10.6, y: 36.5, width: .656, depth: .656, height: .8, material: 'steel', kind: 'barrel'};
  const sim = createSimulation({scenario: {id: 'neighborhood', width: 16, height: 44, buildings: [hopkins9], obstacles: [drum], actors: [], patches,
    player: {x: 10.82, y: 34.63, tool: 'matches', heading: Math.PI}}, config: {fire: {damagePerSecond: 0}}});
  const events = new Map(); let s = press(sim, 9.9, 34.63), nearest = Infinity;
  for (let i = 0; i < 25 * 60 && !s.world.buildings[0].destroyed; i++) {
    s = sim.advance(STEP); for (const e of s.events) if (!events.has(e.id)) events.set(e.id, e);
    for (const f of s.structureFire) if (f.flame > 0) nearest = Math.min(nearest, Math.hypot(f.x - drum.x, f.z - drum.y));
  }
  const blast = [...events.values()].find(e => e.type === 'barrel-explosion');
  console.log(label.padEnd(28), '| house destroyed', s.world.buildings[0].destroyed, '| nearest flaming site to the drum centre', r(nearest, 2), 'm | exploded', Boolean(blast), blast ? 'at world ' + r(blast.tick * STEP, 2) : '');
  sim.dispose();
}
