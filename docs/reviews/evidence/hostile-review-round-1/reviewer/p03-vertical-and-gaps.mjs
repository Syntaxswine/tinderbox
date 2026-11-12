// B: what a tool can reach on the vertical axis; A: pathways that do not exist.
import {createSimulation, NEIGHBORHOOD_SCENARIO, DEFAULT_CONFIG, press, lastTool, r, STEP} from './lib.mjs';
const hopkins9 = NEIGHBORHOOD_SCENARIO.buildings.find(b => b.id === 'hopkins-nine');
const TOOLS = new Set(['matches', 'torch', 'flamethrower', 'molotov']);

function collect(sim, seconds, events = new Map()) {
  let s;
  for (let i = 0; i < seconds * 60; i++) { s = sim.advance(STEP); for (const e of s.events) if (!events.has(e.id)) events.set(e.id, e); }
  return s;
}
function toolIgnitions(events) {
  return [...events.values()].filter(e => e.type === 'structure-ignition' && TOOLS.has(e.cause))
    .map(e => ({site: e.siteId.split('/')[1], part: e.part, height: r(e.height, 2), cause: e.cause}));
}
function heights(events) {
  const all = [...events.values()].filter(e => e.type === 'structure-ignition');
  return {total: all.length, maxHeightAny: r(Math.max(...all.map(e => e.height)), 2),
    toolCaused: toolIgnitions(events), maxHeightTool: r(Math.max(-Infinity, ...toolIgnitions(events).map(e => e.height)), 2)};
}

console.log('== 3a. Tool reach on Hopkins 9 east clapboard (paving only). plinth 0.48, wall L0 0.48..2.48, L1 2.60..4.60, roof up to 6.2 ==');
for (const tool of ['matches', 'torch', 'flamethrower', 'molotov', 'molotov-high']) {
  const scenario = {id: 'neighborhood', width: 16, height: 44, buildings: [hopkins9], obstacles: [],
    player: {x: tool === 'flamethrower' ? 12 : tool.startsWith('molotov') ? 13.2 : 10.82, y: 34.63, tool: tool.startsWith('molotov') ? 'molotov' : tool, heading: Math.PI}};
  const sim = createSimulation({scenario, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
  const events = new Map();
  if (tool === 'matches') { press(sim, 9.9, 34.63); }
  else if (tool === 'torch') { press(sim, 9.9, 34.63); sim.advance(STEP); press(sim, 9.9, 34.63); }
  else if (tool === 'flamethrower') { sim.dispatch({type: 'aim', x: 9.9, y: 34.63}); sim.dispatch({type: 'primary', pressed: true}); collect(sim, 1.5, events); sim.dispatch({type: 'primary', pressed: false}); }
  else {
    const reach = tool === 'molotov' ? 13.2 - 8.5 : 6; // 'high': full 6 m throw so the arc is near its apex at the wall
    sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
    sim.dispatch({type: 'move', x: -(.12 + .88 * reach / 6), y: 0}); sim.dispatch({type: 'move', x: 0, y: 0});
    sim.advance(STEP); sim.dispatch({type: 'primary', pressed: true}); sim.advance(STEP); sim.dispatch({type: 'primary', pressed: false});
  }
  const s = collect(sim, 30, events);
  const impact = [...events.values()].find(e => e.type === 'molotov-impact');
  console.log(tool.padEnd(13), JSON.stringify(heights(events)), impact ? 'impact h=' + r(impact.h, 2) + ' x=' + r(impact.x, 2) : '', 'destroyed', s.world.buildings[0].destroyed);
  sim.dispose();
}

console.log('\n== 3b. Does a burning house hurt? Player hugs the struck wall for the whole burn (default damage 18 HP/s). ==');
{
  const base = {id: 'neighborhood', width: 16, height: 44, buildings: [hopkins9], obstacles: []};
  // Paving: only structure fire nearby.
  const sim = createSimulation({scenario: {...base, player: {x: 10.82, y: 34.63, tool: 'matches', heading: Math.PI}}});
  let s = press(sim, 9.9, 34.63), nearest = Infinity, peakNear = 0;
  for (let i = 0; i < 120 && !s.world.buildings[0].destroyed; i++) {
    s = sim.advance(.25);
    const flames = s.structureFire.filter(x => x.flame > 0);
    for (const f of flames) nearest = Math.min(nearest, Math.hypot(f.x - s.player.x, f.z - s.player.y));
    peakNear = Math.max(peakNear, flames.filter(f => Math.hypot(f.x - s.player.x, f.z - s.player.y) < 2).length);
  }
  console.log('paving, structure fire only: house destroyed', s.world.buildings[0].destroyed, 'at world', r(s.clocks.world, 2), '| player hp', s.player.hp,
    '| nearest flaming site (plan distance)', r(nearest, 2), 'm | peak flaming sites within 2 m:', peakNear);
  sim.dispose();
  // Control: same spot, a burning ground cell under the player.
  const ctl = createSimulation({scenario: {...base, player: {x: 10.82, y: 34.63, tool: 'matches', heading: Math.PI},
    fuelLines: [{from: {x: 10.6, y: 34.63}, to: {x: 11.4, y: 34.63}, litresPerMetre: .08}], ignitions: [{x: 10.82, y: 34.63, radius: .05, heat: 3}]}});
  let c; for (let i = 0; i < 12; i++) c = ctl.advance(.25);
  console.log('CONTROL, burning gas under the player for 3 s: player hp', r(c.player.hp, 1));
  ctl.dispose();
}

console.log('\n== 3c. Burning gas next to a drum on paving ==');
function drumCase(label, {fuelLines = [], offset}) {
  const drum = {id: 'drum', x: 6.25, y: 4.25, width: .656, depth: .656, height: .8, material: 'steel', kind: 'barrel'};
  const sim = createSimulation({scenario: {id: 'drum-test', width: 12, height: 8, player: {x: 1.25, y: 4.25 + (offset ?? 3), tool: 'jerry-can'},
    obstacles: [drum], actors: [], fuelLines}, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
  const events = new Map();
  if (offset !== undefined) {
    // Real player pour: walk east past the drum at the given centre offset, then light the trail's west end.
    sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false}); sim.dispatch({type: 'move', x: 1, y: 0});
    collect(sim, 1.0, events); // 9 m at 9 m/s
    sim.dispatch({type: 'move', x: 0, y: 0}); sim.dispatch({type: 'select-tool', tool: 'matches'}); collect(sim, .05, events);
    const p = sim.snapshot().player;
    sim.dispatch({type: 'aim', x: p.x - .6, y: p.y}); sim.dispatch({type: 'primary', pressed: true}); collect(sim, .05, events); sim.dispatch({type: 'primary', pressed: false});
  } else {
    sim.dispatch({type: 'select-tool', tool: 'matches'});
  }
  const before = sim.snapshot();
  const s = collect(sim, 12, events);
  const lit = [...events.values()].filter(e => e.type === 'ignition').length;
  const drumCells = before.cells.filter(c => Math.hypot(Math.max(0, Math.abs(c.x - drum.x) - .25), Math.max(0, Math.abs(c.y - drum.y) - .25)) <= .328);
  const nearestFuel = Math.min(...before.cells.filter(c => c.depositedFuel > 0).map(c => Math.hypot(c.x - drum.x, c.y - drum.y)));
  console.log(label.padEnd(58), '| cells ignited', String(lit).padStart(3), '| nearest fuelled cell centre', r(nearestFuel, 2), 'm | fuel in the', drumCells.length, 'trigger cells',
    r(drumCells.reduce((n, c) => n + c.depositedFuel, 0), 4), '| exploded', [...events.values()].some(e => e.type === 'barrel-explosion'), '| drum still present', s.world.obstacles.some(o => o.id === 'drum'));
  sim.dispose();
}
const line = dy => ({fuelLines: [{from: {x: 2.25, y: 4.25 + dy}, to: {x: 10.25, y: 4.25 + dy}, litresPerMetre: .08}]});
const lit = dy => ({...line(dy), fuelLines: line(dy).fuelLines});
function fixture(label, dy) {
  const drum = {id: 'drum', x: 6.25, y: 4.25, width: .656, depth: .656, height: .8, material: 'steel', kind: 'barrel'};
  const sim = createSimulation({scenario: {id: 'drum-test', width: 12, height: 8, player: {x: 1, y: 7}, obstacles: [drum], actors: [],
    ...line(dy), ignitions: [{x: 2.25, y: 4.25 + dy, radius: .05, heat: 3}]}, config: {fire: {damagePerSecond: 0}}});
  const events = new Map(); const s = collect(sim, 12, events);
  console.log(label.padEnd(58), '| cells ignited', String([...events.values()].filter(e => e.type === 'ignition').length).padStart(3),
    '| exploded', [...events.values()].some(e => e.type === 'barrel-explosion'));
  sim.dispose();
}
fixture('CONTROL fixture gas line straight under the drum (dy=0)', 0);
fixture('fixture gas line 0.50 m beside the drum centre', .5);
fixture('fixture gas line 0.75 m beside the drum centre', .75);
drumCase('REAL pour: player walks past at 0.90 m (closest possible 0.888)', {offset: .9});
drumCase('REAL pour: player walks past at 1.00 m', {offset: 1.0});

console.log('\n== 3d. Lawn fire versus a wooden porch and stairs (Hopkins 12, porch spans the whole front) ==');
function lawn(label, patch, ignite) {
  const house = {id: 'h12', prefabId: 'hopkins-4-12', x: 10, y: 10, quarterTurns: 0};
  const sim = createSimulation({scenario: {id: 'neighborhood', width: 28, height: 24, buildings: [house], obstacles: [], actors: [],
    patches: [patch], player: {x: 25, y: 22, tool: 'matches'}, ignitions: [{...ignite, radius: .05, heat: 3}]}, config: {fire: {damagePerSecond: 0}}});
  const events = new Map(); let peakPre = 0, burnedCells = new Set(), s;
  for (let i = 0; i < 40 * 60; i++) {
    s = sim.advance(STEP);
    for (const e of s.events) if (!events.has(e.id)) { events.set(e.id, e); if (e.type === 'ignition') burnedCells.add(e.cellId); }
    for (const x of s.structureFire) if (x.ignitionTime === null) peakPre = Math.max(peakPre, x.heatFraction);
    if (s.world.buildings[0].destroyed) break;
  }
  const first = [...events.values()].find(e => e.type === 'structure-ignition');
  console.log(label.padEnd(46), '| grass cells burned', burnedCells.size, '| peak siding/deck preheat fraction', r(peakPre, 3),
    '| first structure ignition', first ? first.siteId + ' cause=' + first.cause + ' t=' + r(first.worldTime, 2) : 'NONE', '| destroyed', s.world.buildings[0].destroyed);
  sim.dispose();
}
lawn('grass 10x4 m touching the porch front and stairs', {x: 9, y: 4, width: 10, depth: 4, material: 'grass'}, {x: 14.25, y: 5.25});
lawn('CONTROL same-size grass against the west side wall', {x: 6, y: 9, width: 4, depth: 10, material: 'grass'}, {x: 7.25, y: 12.25});
