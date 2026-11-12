// How fire moves through a house, axis by axis. One real match on low siding, with the
// lawn removed so the house is the only fuel. Every structural ignition event names its
// parent site, so each parent -> child hop gives a direction and a speed.
//   node docs/reviews/evidence/hostile-review-round-1/structure-spread.mjs
import fs from 'node:fs';
import {createSimulation, street, press, eventLog, percentile, table, round, STEP} from './lib.mjs';

const CASES = [
  {house: 'hopkins-nine', player: {x: 10.82, y: 34.63}, aim: {x: 9.9, y: 34.63}},
  {house: 'hopkins-fifteen', player: {x: 24.82, y: 8.5}, aim: {x: 23.9, y: 8.5}},
  {house: 'monroe-row-middle', player: {x: 38.5, y: 30.35}, aim: {x: 38.5, y: 31.15}}
];

function run(spec) {
  const sim = createSimulation({scenario: street({player: spec.player, patches: [], actors: []}), seed: 1893,
    config: {events: {capacity: 4096}, fire: {damagePerSecond: 0}}});
  const log = eventLog(), sites = new Map(), other = new Set();
  let snapshot = press(sim, spec.aim.x, spec.aim.y), burnout = null, firstSection = null, flamesOut = 0;
  const t0 = snapshot.clocks.world;
  const read = () => {
    for (const event of log.take(snapshot)) {
      if (event.type === 'structure-ignition') {
        if (event.buildingId !== spec.house) { other.add(event.buildingId); continue; }
        sites.set(event.siteId, {id: event.siteId, x: event.x, z: event.y, h: event.height, part: event.part,
          t: event.worldTime - t0, cause: event.cause, parent: event.parentSiteId});
      } else if (event.type === 'building-section-burnout' && event.buildingId === spec.house) firstSection ??= event.worldTime - t0;
      else if (event.type === 'building-burnout' && event.buildingId === spec.house) burnout = event.worldTime - t0;
    }
  };
  read();
  while (snapshot.clocks.world < 300 && burnout === null) {
    snapshot = sim.advance(5 * STEP); read();
    if (snapshot.structureFire.some(site => site.buildingId === spec.house && site.flame > 0)) flamesOut = snapshot.clocks.world - t0;
  }
  const building = snapshot.world.buildings.find(b => b.id === spec.house);
  sim.dispose();

  const hops = {up: [], level: [], down: []};
  for (const site of sites.values()) {
    const parent = sites.get(site.parent);
    if (!parent || site.cause !== 'surface-spread') continue;
    const rise = site.h - parent.h, run = Math.hypot(site.x - parent.x, site.z - parent.z), length = Math.hypot(rise, run);
    const dt = site.t - parent.t;
    if (length < .05 || dt <= 0) continue;
    // Direction class by the hop's inclination: steeper than 30 degrees counts as vertical.
    const kind = Math.abs(rise) > run * Math.tan(Math.PI / 6) ? (rise > 0 ? 'up' : 'down') : 'level';
    hops[kind].push({speed: length / dt, dt, length});
  }
  const all = [...sites.values()];
  const first = test => { const hit = all.filter(test).sort((a, b) => a.t - b.t)[0]; return hit ? round(hit.t, 2) : null; };
  const levelOf = id => Number(id.split('/')[1].split(':')[1]);
  const stat = list => list.length ? {n: list.length, median: round(percentile(list.map(h => h.speed), .5), 2),
    p10: round(percentile(list.map(h => h.speed), .1), 2), p90: round(percentile(list.map(h => h.speed), .9), 2)} : {n: 0};
  return {house: spec.house, sitesIgnited: all.length,
    heights: {min: round(Math.min(...all.map(s => s.h)), 2), max: round(Math.max(...all.map(s => s.h)), 2)},
    firstUpperWall: first(s => /\/wall:1:/.test(s.id)), firstEave: first(s => /\/eave:/.test(s.id)),
    firstRoof: first(s => s.part === 'roof'), firstGroundFloor: first(s => /\/floor:0:/.test(s.id)),
    firstUpperFloor: first(s => /\/floor:1:/.test(s.id)), lastIgnition: round(Math.max(...all.map(s => s.t)), 2),
    flamesOut: round(flamesOut, 2), firstSectionGone: round(firstSection, 2), houseGone: round(burnout, 2), burned: round(building.burnedFraction, 3),
    otherHousesLit: [...other], hops: {up: stat(hops.up), level: stat(hops.level), down: stat(hops.down)},
    causes: Object.fromEntries([...new Set(all.map(s => s.cause))].map(cause => [cause, all.filter(s => s.cause === cause).length]))};
}

const results = CASES.map(run);
console.log('One match on low siding, lawn removed. Times are world seconds after the strike.\n');
console.log(table(results.map(r => ({house: r.house, 'sites lit': r.sitesIgnited, 'upper wall': r.firstUpperWall, eave: r.firstEave, roof: r.firstRoof,
  'ground floor': r.firstGroundFloor, 'upper floor': r.firstUpperFloor, 'last ignition': r.lastIgnition, 'flames out': r.flamesOut, 'first section gone': r.firstSectionGone,
  'house gone': r.houseGone, 'other houses lit': r.otherHousesLit.join(',') || 'none'})),
  ['house', 'sites lit', 'upper wall', 'eave', 'roof', 'ground floor', 'upper floor', 'last ignition', 'flames out', 'first section gone', 'house gone', 'other houses lit']));
console.log('\nSpeed of each parent -> child hop in m per world second (median, 10th-90th percentile), by direction:\n');
console.log(table(results.map(r => ({house: r.house,
  up: r.hops.up.n ? r.hops.up.median + ' (' + r.hops.up.p10 + '-' + r.hops.up.p90 + '), n=' + r.hops.up.n : 'none',
  level: r.hops.level.n ? r.hops.level.median + ' (' + r.hops.level.p10 + '-' + r.hops.level.p90 + '), n=' + r.hops.level.n : 'none',
  down: r.hops.down.n ? r.hops.down.median + ' (' + r.hops.down.p10 + '-' + r.hops.down.p90 + '), n=' + r.hops.down.n : 'none',
  'up : level : down': r.hops.level.n && r.hops.down.n ? round(r.hops.up.median / r.hops.level.median, 2) + ' : 1 : ' + round(r.hops.down.median / r.hops.level.median, 2) : '-'})),
  ['house', 'up', 'level', 'down', 'up : level : down']));
fs.mkdirSync(new URL('./results/', import.meta.url), {recursive: true});
fs.writeFileSync(new URL('./results/structure-spread.json', import.meta.url), JSON.stringify(results, null, 1) + '\n');
