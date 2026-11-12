// Does a house section fall because it burned, or because 150 s passed since something in it lit?
// Hopkins 9 on bare paving, one match on the east clapboard. The control uses the default
// configuration. The test raises fuel.surfaceBurnRate 100x through the public config, so the struck
// board burns for 0.08 s and goes out before it can pass heat on (a site emits nothing in its
// first 0.16 s). Everything else is the published game.
//   node docs/reviews/evidence/hostile-review-round-1/collapse-clock.mjs
import fs from 'node:fs';
import {createSimulation, DEFAULT_CONFIG, street, press, eventLog, table, round, STEP} from './lib.mjs';

const rows = [];
for (const [label, fuel] of [['default (control)', {}], ['struck board burns 0.08 s and spreads nothing', {surfaceBurnRate: DEFAULT_CONFIG.fuel.surfaceBurnRate * 100}]]) {
  const sim = createSimulation({seed: 1893, config: {events: {capacity: 4096}, fuel},
    scenario: street({player: {x: 10.82, y: 34.63}, patches: [], actors: []})});
  const log = eventLog(), ignited = new Set(), fallen = [];
  let s = press(sim, 9.9, 34.63), flamesOut = 0, hpAt140 = null, hottest = 0;
  log.take(s).forEach(e => { if (e.type === 'structure-ignition') ignited.add(e.siteId); });
  while (s.clocks.world < 200) {
    s = sim.advance(5 * STEP);
    for (const e of log.take(s)) {
      if (e.type === 'structure-ignition' && e.buildingId === 'hopkins-nine') ignited.add(e.siteId);
      if (e.type === 'building-section-burnout' && e.buildingId === 'hopkins-nine') fallen.push(round(e.worldTime, 2));
    }
    if (s.structureFire.some(site => site.buildingId === 'hopkins-nine' && site.flame > 0)) flamesOut = s.clocks.world;
    if (hpAt140 === null && s.clocks.world >= 140) hpAt140 = s.player.hp;
    if (s.clocks.world > 149) hottest = Math.max(hottest, ...s.cells.map(cell => cell.heat));
  }
  const building = s.world.buildings.find(b => b.id === 'hopkins-nine');
  rows.push({configuration: label, 'sites that ever burned (of 286)': ignited.size, 'flames out at s': round(flamesOut, 2),
    'sections fallen (of 20)': fallen.length, 'first fell at s': fallen[0] ?? '-', 'hottest ground cell after 149 s (0-4)': round(hottest, 2),
    'bear hp at 140 s': round(hpAt140, 1), 'bear hp at 200 s': round(s.player.hp, 1), 'house destroyed': building.destroyed ? 'yes' : 'no'});
  sim.dispose();
}
console.log('One match on Hopkins 9 (bare paving). The bear stands 0.7 m from the struck wall and never moves.\n');
console.log(table(rows, Object.keys(rows[0])));
fs.mkdirSync(new URL('./results/', import.meta.url), {recursive: true});
fs.writeFileSync(new URL('./results/collapse-clock.json', import.meta.url), JSON.stringify(rows, null, 1) + '\n');
