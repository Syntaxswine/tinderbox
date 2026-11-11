// One real match on the shipped Catalogue Street, then hands off: how far does the
// fire go on its own, and what does it never reach? (Tick cost is measured separately
// by tick-cost.mjs with the default event ring; this probe enlarges the ring to keep every event.)
//   node docs/reviews/evidence/hostile-review-round-1/one-match-census.mjs [caseId ...]
// Writes results/one-match-census.json next to this file.
import fs from 'node:fs';
import {createSimulation, street, press, eventLog, table, round, STEP} from './lib.mjs';

const CASES = [
  {id: 'north-lawn', note: 'open grass in front of the Ashland cottage', player: {x: 30, y: 14}, aim: {x: 30.8, y: 14}},
  {id: 'north-corner', note: 'far NW corner of the north lawn', player: {x: 1, y: 1}, aim: {x: 1.7, y: 1}},
  {id: 'south-lawn', note: 'open grass behind Hopkins 13', player: {x: 13, y: 42}, aim: {x: 13.8, y: 42}},
  {id: 'hopkins-9-siding', note: 'documented east clapboard strike', player: {x: 10.82, y: 34.63}, aim: {x: 9.9, y: 34.63}},
  {id: 'hopkins-15-siding', note: 'documented east clapboard strike', player: {x: 24.82, y: 8.5}, aim: {x: 23.9, y: 8.5}},
  {id: 'monroe-middle-sash', note: 'documented north window sash strike', player: {x: 38.5, y: 30.35}, aim: {x: 38.5, y: 31.15}},
  {id: 'monroe-brick', note: 'bare Monroe brick beside that sash', player: {x: 37.3, y: 30.35}, aim: {x: 37.3, y: 31.15}},
  {id: 'shop-floor', note: 'timber floor inside Bell & Alder', player: {x: 40, y: 14}, aim: {x: 40.8, y: 14}},
  {id: 'road', note: 'the road itself', player: {x: 20, y: 21}, aim: {x: 20.8, y: 21}},
  {id: 'paving', note: 'the paved strip between lawn and road', player: {x: 20, y: 17.5}, aim: {x: 20.8, y: 17.5}}
];
const CAP_SECONDS = 400, QUIET_SECONDS = 6, FRAME = 5 * STEP;      // five ticks per snapshot keeps every event and runs five times faster

function run(spec) {
  const sim = createSimulation({scenario: street({player: spec.player}), seed: 1893, config: {events: {capacity: 4096}}});
  const log = eventLog();
  const initial = sim.snapshot();
  const fuelCells = initial.cells.filter(cell => cell.surfaceFuel > 0);
  const zone = cell => cell.material === 'wood' ? 'shopFloor' : cell.y < 16 ? 'northLawn' : 'southLawn';
  const totals = {northLawn: 0, southLawn: 0, shopFloor: 0};
  for (const cell of fuelCells) totals[zone(cell)]++;
  const houses = new Map(initial.world.buildings.map(b => [b.id, {id: b.id, firstIgnition: null, firstCause: null, burnout: null, sectionsLost: 0, burned: 0}]));
  const drums = [], deaths = [];
  let snapshot = press(sim, spec.aim.x, spec.aim.y);
  log.take(snapshot);
  const strike = log.all.find(event => event.type === 'tool-use' || event.type === 'tool-rejected');
  let lastActive = 0, lastFlame = 0, lastCollapse = null, peakCells = 0, peakSites = 0;
  while (snapshot.clocks.world < CAP_SECONDS) {
    snapshot = sim.advance(FRAME);
    for (const event of log.take(snapshot)) {
      if (event.type === 'structure-ignition') {
        const house = houses.get(event.buildingId);
        if (house.firstIgnition === null) { house.firstIgnition = round(event.worldTime, 2); house.firstCause = event.cause; }
      } else if (event.type === 'building-section-burnout') { houses.get(event.buildingId).sectionsLost++; lastCollapse = round(event.worldTime ?? snapshot.clocks.world, 2); }
      else if (event.type === 'building-burnout') houses.get(event.buildingId).burnout = round(event.worldTime ?? snapshot.clocks.world, 2);
      else if (event.type === 'barrel-explosion') drums.push({id: event.objectId, at: round(snapshot.clocks.world, 2)});
      else if (event.type === 'death') deaths.push({id: event.actorId, cause: event.cause, at: round(snapshot.clocks.world, 2)});
    }
    const burningCells = snapshot.diagnostics.burningCells;
    const burningSites = snapshot.structureFire.filter(site => site.flame > 0).length;
    if (burningCells > peakCells) peakCells = burningCells;
    if (burningSites > peakSites) peakSites = burningSites;
    if (burningCells || burningSites) lastFlame = snapshot.clocks.world;
    if (burningCells || burningSites || snapshot.cells.some(cell => cell.phase === 'heating') || snapshot.structureFire.length) lastActive = snapshot.clocks.world;
    if (snapshot.clocks.world - lastActive > QUIET_SECONDS) break;
  }
  const spent = {northLawn: 0, southLawn: 0, shopFloor: 0};
  for (const cell of snapshot.cells) if (cell.phase === 'spent' && (cell.material === 'grass' || cell.material === 'wood')) spent[zone(cell)]++;
  for (const building of snapshot.world.buildings) houses.get(building.id).burned = round(building.burnedFraction, 3);
  const result = {id: spec.id, note: spec.note, strike: strike ? {type: strike.type, result: strike.result, heatedCells: strike.heatedCells} : null,
    flamesOutAt: round(lastFlame, 2), lastCollapseAt: lastCollapse, quietAt: round(lastActive, 2), capped: snapshot.clocks.world >= CAP_SECONDS,
    burnedShare: Object.fromEntries(Object.keys(totals).map(key => [key, round(spent[key] / totals[key], 3)])),
    houses: [...houses.values()], housesIgnited: [...houses.values()].filter(h => h.firstIgnition !== null).length,
    housesDestroyed: [...houses.values()].filter(h => h.burnout !== null).length,
    drums, deaths, playerHp: round(snapshot.player.hp, 1), peakBurningCells: peakCells, peakBurningSites: peakSites};
  sim.dispose();
  return result;
}

const wanted = process.argv.slice(2);
const results = CASES.filter(spec => !wanted.length || wanted.includes(spec.id)).map(spec => {
  const result = run(spec);
  console.error('done ' + spec.id);
  return result;
});
console.log(table(results.map(r => ({case: r.id, strike: r.strike?.result ?? 'none', 'flames out (s)': r.flamesOutAt, 'last collapse (s)': r.lastCollapseAt ?? '-', 'all quiet (s)': r.capped ? '>' + CAP_SECONDS : r.quietAt,
  'north lawn': Math.round(r.burnedShare.northLawn * 100) + '%', 'south lawn': Math.round(r.burnedShare.southLawn * 100) + '%',
  'shop floor': Math.round(r.burnedShare.shopFloor * 100) + '%', 'houses lit': r.housesIgnited + '/8', 'houses gone': r.housesDestroyed + '/8',
  drums: r.drums.length, deaths: r.deaths.map(d => d.id).join(',') || '-', 'player hp': r.playerHp,
  'peak cells': r.peakBurningCells, 'peak sites': r.peakBurningSites})),
  ['case', 'strike', 'flames out (s)', 'last collapse (s)', 'all quiet (s)', 'north lawn', 'south lawn', 'shop floor', 'houses lit', 'houses gone', 'drums', 'deaths', 'player hp', 'peak cells', 'peak sites']));
console.log('\nPer-house first ignition (world s after the strike tick) / cause / burnout:');
for (const r of results) {
  console.log('\n' + r.id + ' — ' + r.note);
  console.log(table(r.houses.map(h => ({house: h.id, 'first ignition': h.firstIgnition ?? 'never', cause: h.firstCause ?? '-', burnout: h.burnout ?? 'standing', sections: h.sectionsLost, burned: h.burned})),
    ['house', 'first ignition', 'cause', 'burnout', 'sections', 'burned']));
}
if (!wanted.length) {
  fs.mkdirSync(new URL('./results/', import.meta.url), {recursive: true});
  fs.writeFileSync(new URL('./results/one-match-census.json', import.meta.url), JSON.stringify(results, null, 1) + '\n');
}
