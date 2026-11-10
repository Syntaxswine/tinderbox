// Mutants B04 and B05 remove Fix B's "live section" gate from the ground contact and survive all 274 tests. Is that a
// test gap or dead code? Count, on the shipped street, how often the gate is the reason a contact is skipped
// (a probe whose own house section has collapsed while its fuel site is still present and not spent).
// Counters are added in memory next to the two gate checks; behaviour is unchanged.
// One run: both lawns and the Hopkins 12 porch lawn lit at t = 0; the whole street burns through total collapse (210 s
// of world time). Reported per house: when its first section retires, and the last moment its deck, stairs or post
// could still exchange heat with the ground (present, and cold or still burning).
// Usage: node r13-support-gate.mjs
import {underPatches, TAPS, load, r} from './lib.mjs';
const SURF = 'tinderbox/src/simulation/surface-fire.js';
underPatches(import.meta.url, [...TAPS,
  {file: SURF, find: 'if (supported && !supported(support) || !lineClear(cell,edge,obstacles)) continue;',
    replace: 'if (supported && !supported(support)) { globalThis.__gate.in++; continue; } if (!lineClear(cell,edge,obstacles)) continue;'},
  {file: SURF, find: 'if (supported && !supported(support)) continue;',
    replace: 'if (supported && !supported(support)) { globalThis.__gate.out++; continue; }'}]);
const api = await load();
globalThis.__gate = {in: 0, out: 0}; globalThis.__lots = [];
const scenario = {...api.NEIGHBORHOOD_SCENARIO, actors: [],
  ignitions: [{x: 10.75, y: 34.75, radius: .6, heat: 3}, {x: 20.25, y: 12.25, radius: .6, heat: 3}, {x: 40.25, y: 27.25, radius: .6, heat: 3}, {x: 2.75, y: 11.25, radius: .3, heat: 3}]};
const sim = api.createSimulation({scenario, config: {fire: {damagePerSecond: 0}, events: {capacity: 4096}}});
const lots = globalThis.__lots, firstRetire = new Map(), lastLive = new Map();
let s, retired = 0;
for (let i = 0; i < 210 * 60; i++) {
  s = sim.advance(api.STEP);
  if (i % 6) continue;
  for (const lot of lots) {
    const id = lot.building.id, gone = lot.sections.filter(x => !x.view.present).length;
    if (gone && !firstRetire.has(id)) firstRetire.set(id, s.clocks.world);
    for (const {site} of lot.groundSites) if (!site.id.startsWith('wall:') && site.phase !== 'spent' && lot.sections[site.section].view.present &&
        !(site.phase === 'burning' && s.clocks.world - site.ignitedAt >= (site.burnSeconds ?? site.fuel.seconds))) lastLive.set(id + '/' + site.id, s.clocks.world);
  }
}
retired = lots.reduce((sum, lot) => sum + lot.sections.filter(x => !x.view.present).length, 0);
console.log(`whole street, 210 s: sections retired ${retired} of ${lots.reduce((sum, lot) => sum + lot.sections.length, 0)}; houses destroyed ${s.world.buildings.filter(b => b.destroyed).length} of ${s.world.buildings.length}`);
console.log(`gate skipped a ground->site contact ${globalThis.__gate.in} times and a site->ground contact ${globalThis.__gate.out} times`);
for (const lot of lots) {
  const id = lot.building.id, mine = [...lastLive].filter(([key]) => key.startsWith(id + '/'));
  console.log(`   ${id}: first section retires at ${r(firstRetire.get(id), 1) ?? 'never'} s | porch fuel last able to exchange heat: ` +
    (mine.map(([key, time]) => key.split('/')[1] + ' ' + r(time, 1) + ' s').join(', ') || 'never cold or burning after the first sample'));
}
sim.dispose();
