// Where fire can and cannot go. Each experiment has a control in which the effect is present.
//   node docs/reviews/evidence/hostile-review-round-1/pathways.mjs
import fs from 'node:fs';
import {createSimulation, DEFAULT_CONFIG, street, press, eventLog, table, round, STEP} from './lib.mjs';
import {COTTAGE_PAIR_SCENARIO} from '../../../../src/content/cottage-pair.js';
import {calmCottageWind} from '../../../../src/reuse/ashland/wind.js';

const out = {};
const config = {events: {capacity: 4096}};

// 1. A gap of bare ground. Fuel on both sides of a strip k cells wide; the left end is lit.
{
  const rows = [];
  for (const kind of ['grass', 'wood', 'gas']) for (const k of [0, 1, 2]) {
    const gap = .5 * k, split = 6;
    const patches = kind === 'gas' ? [] : [{x: 0, y: 0, width: split, depth: 6, material: kind}, {x: split + gap, y: 0, width: 6 - gap, depth: 6, material: kind}];
    const line = (x0, x1) => Array.from({length: 12}, (_, row) => ({from: {x: x0 + .001, y: (row + .5) * .5}, to: {x: x1 - .001, y: (row + .5) * .5}, litresPerMetre: DEFAULT_CONFIG.fuel.gasPerMetre}));
    const sim = createSimulation({config: {...config, fire: {damagePerSecond: 0}}, scenario: {id: 'gap', width: 12, height: 6, player: {x: 11, y: 5.2},
      obstacles: [], actors: [], patches, fuelLines: kind === 'gas' ? [...line(0, split), ...line(split + gap, 12)] : [],
      ignitions: [{x: .25, y: 3.25, radius: .01, heat: 3}]}});
    let s, leftDone = null, hottestAcross = 0;
    for (let tick = 0; tick < 60 * 90; tick++) {
      s = sim.advance(STEP);
      hottestAcross = Math.max(hottestAcross, ...s.cells.filter(c => c.x > split + gap && c.phase !== 'burning' && c.phase !== 'spent').map(c => c.heat));
      if (tick > 60 && s.diagnostics.burningCells === 0) break;
    }
    const far = s.cells.filter(c => c.x > split + gap), near = s.cells.filter(c => c.x < split);
    const burned = cells => cells.filter(c => c.phase === 'spent' || c.phase === 'burning').length;
    rows.push({fuel: kind, 'gap m': gap, 'near side burned': burned(near) + '/' + near.length, 'far side burned': burned(far) + '/' + far.length,
      'hottest far cell before any far ignition': round(hottestAcross, 3), crossed: burned(far) > 0 ? 'YES' : 'no'});
    sim.dispose();
  }
  out.gap = rows;
  console.log('1. Bare gap between two fuel beds (0.5 m cells). Gap 0 is the control.\n');
  console.log(table(rows, ['fuel', 'gap m', 'near side burned', 'far side burned', 'hottest far cell before any far ignition', 'crossed']));
}

// 2 and 3. A house on fire: does it hurt a bystander, and does it set off a drum beside it?
{
  const rows = [];
  for (const lawn of [false, true]) {
    const drum = {id: 'probe-drum', x: 10.62, y: 37.5, width: .656, depth: .656, height: .8, material: 'steel', kind: 'barrel'};
    const base = street({player: {x: 10.82, y: 34.63}, actors: []});
    const sim = createSimulation({seed: 1893, config, scenario: {...base, ...(lawn ? {} : {patches: []}), obstacles: [...base.obstacles, drum]}});
    const log = eventLog();
    let s = press(sim, 9.9, 34.63), gone = null, drumAt = null, minDistance = Infinity, flamesOut = 0, hpWhenFlamesEnd = null, firstCollapse = null;
    log.take(s);
    while (s.clocks.world < 300 && gone === null) {
      s = sim.advance(5 * STEP);
      for (const e of log.take(s)) {
        if (e.type === 'building-burnout' && e.buildingId === 'hopkins-nine') gone = e.worldTime;
        if (e.type === 'building-section-burnout' && e.buildingId === 'hopkins-nine') firstCollapse ??= e.worldTime;
        if (e.type === 'barrel-explosion' && e.objectId === 'probe-drum') drumAt ??= s.clocks.world;
      }
      const flames = s.structureFire.filter(site => site.flame > 0 && site.buildingId === 'hopkins-nine');
      if (flames.length) { flamesOut = s.clocks.world; hpWhenFlamesEnd = s.player.hp; }
      for (const site of flames) minDistance = Math.min(minDistance, Math.hypot(site.x - s.player.x, site.z - s.player.y));
    }
    rows.push({scene: lawn ? 'house on its lawn (control)' : 'house on bare paving', 'nearest flame to the bear m': round(minDistance, 2),
      'flames out at s': round(flamesOut, 1), 'bear hp when the flames end': round(hpWhenFlamesEnd, 1),
      'first section falls at s': round(firstCollapse, 1), 'house gone at s': round(gone, 1), 'bear hp at the end': round(s.player.hp, 1),
      'drum 0.2 m from the wall': drumAt === null ? 'never exploded' : 'exploded at ' + round(drumAt, 1) + ' s'});
    sim.dispose();
  }
  out.bystander = rows;
  console.log('\n2-3. One match on Hopkins 9. The bear stands still 0.7 m from the struck wall; a steel drum sits 0.2 m from the same wall.\n');
  console.log(table(rows, Object.keys(rows[0])));
}

// 4. A burning animal runs into dry grass.
{
  const sim = createSimulation({config, scenario: {id: 'runner', width: 16, height: 6, player: {x: 2, y: 3, tool: 'flamethrower'}, obstacles: [],
    patches: [{x: 8, y: 0, width: 8, depth: 6, material: 'grass'}],
    actors: [{id: 'runner', x: 4.5, y: 3, speed: 2, hp: 100, route: [{x: 4.5, y: 3}, {x: 14, y: 3}]}]}});
  const log = eventLog();
  sim.dispatch({type: 'aim', x: 4.5, y: 3}); sim.dispatch({type: 'primary', pressed: true});
  let s, ignitedAt = null, furthestBurning = 0, burnEnds = null, grassIgnitions = 0, burningOnGrass = 0;
  for (let tick = 0; tick < 60 * 12; tick++) {
    s = sim.advance(STEP);
    for (const e of log.take(s)) {
      if (e.type === 'actor-ignition') { ignitedAt ??= s.clocks.world; sim.dispatch({type: 'primary', pressed: false}); }
      if (e.type === 'ignition') grassIgnitions++;
    }
    const actor = s.actors[0];
    if (actor.burn) { furthestBurning = Math.max(furthestBurning, actor.x); if (actor.x >= 8) burningOnGrass++; }
    else if (ignitedAt !== null && burnEnds === null) burnEnds = s.clocks.world;
  }
  out.runner = {actorIgnitedAt: round(ignitedAt, 2), burnEndedAt: round(burnEnds, 2), furthestXWhileBurning: round(furthestBurning, 2),
    ticksBurningOnGrass: burningOnGrass, grassStartsAtX: 8, groundIgnitions: grassIgnitions, actorHp: round(s.actors[0].hp, 1)};
  console.log('\n4. A goat set alight by the flamethrower on paving runs 2 m/s into dry grass that starts at x = 8 m (outside the flame cone).\n');
  console.log(JSON.stringify(out.runner));
  sim.dispose();
}

// 5. Powder scales world time by 0.35. Does fire keep the same speed in world seconds?
{
  const rows = [];
  for (const powder of [false, true]) {
    const sim = createSimulation({config, scenario: {id: 'powder', width: 16, height: 4, player: {x: 15, y: 3.2}, obstacles: [], actors: [],
      fuelLines: [{from: {x: .25, y: 1.25}, to: {x: 12.25, y: 1.25}, litresPerMetre: DEFAULT_CONFIG.fuel.gasPerMetre}],
      ignitions: [{x: .25, y: 1.25, radius: .01, heat: 3}]}});
    if (powder) sim.dispatch({type: 'drug', drug: 'powder'});
    let s, start = null, arrival = null;
    for (let tick = 0; tick < 60 * 12 && arrival === null; tick++) {
      s = sim.advance(STEP);
      const front = Math.max(0, ...s.cells.filter(c => c.phase === 'burning').map(c => c.x));
      if (start === null && front >= 1) start = {t: s.clocks.world, x: front};
      if (front >= 8.25) arrival = {t: s.clocks.world, x: front};
    }
    rows.push({powder: powder ? 'yes (world x0.35)' : 'no', 'world dt ms': round(1000 * STEP * (powder ? .35 : 1), 2),
      'front speed m per world s': round((arrival.x - start.x) / (arrival.t - start.t), 3), 'cell-to-cell delay world s': round(.5 * (arrival.t - start.t) / (arrival.x - start.x), 4)});
    sim.dispose();
  }
  out.powder = rows;
  console.log('\n5. Gas-trail front speed in world seconds, with and without powder (config front speed 4 m/s, deadline 0.125 s per 0.5 m cell).\n');
  console.log(table(rows, ['powder', 'world dt ms', 'front speed m per world s', 'cell-to-cell delay world s']));
}

// 6. The Ashland cottage: when do the flames end, and when does it fall?
{
  const sim = createSimulation({scenario: COTTAGE_PAIR_SCENARIO, cottageWind: calmCottageWind, seed: 1893, config: {...config, cottage: {radiation: false, embers: false}}});
  let s = press(sim, 51, 13.5);
  const t0 = s.cottageFire.buildings[0].firstIgnition?.time ?? s.clocks.world;
  const rows = [], marks = [5, 10, 20, 30, 40, 60, 100, 149, 151, 155, 160, 170, 180];
  while (marks.length) {
    s = sim.advance(5 * STEP);
    const b = s.cottageFire.buildings[0], t = s.clocks.world - (b.firstIgnition?.time ?? t0);
    if (t + 1e-9 >= marks[0]) {
      marks.shift();
      const live = b.tiles.reduce((n, tile) => n + Number(tile.roof) + Number(tile.upper) + Number(tile.lower), 0);
      rows.push({'s after first ignition': round(t, 1), 'supports standing (of 126)': live, 'sites ever ignited (of 178)': b.cells.length,
        'sites in flame': b.cells.filter(c => c.flame > 0).length, gone: b.gone ? 'yes' : 'no'});
    }
  }
  out.cottageClock = rows;
  console.log('\n6. One match on the first Ashland cottage, calm air, radiation and embers off. Supports are roof, upper-floor and lower-floor tiles.\n');
  console.log(table(rows, Object.keys(rows[0])));
  sim.dispose();
}
fs.mkdirSync(new URL('./results/', import.meta.url), {recursive: true});
fs.writeFileSync(new URL('./results/pathways.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
