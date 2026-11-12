// B: how fire moves vertically inside the Ashland model. Counts ignitions by layer and cause, and debris releases, for one match.
import {createSimulation, COTTAGE_PAIR_SCENARIO, calmCottageWind, press, r, STEP} from './lib.mjs';
const sim = createSimulation({scenario: {...COTTAGE_PAIR_SCENARIO, patches: [], actors: []}, cottageWind: calmCottageWind, seed: 1893, config: {cottage: {radiation: false, embers: false}}});
const events = new Map();
let s = press(sim, 51, 13.5);
for (let i = 0; i < 31 * 60; i++) { s = sim.advance(STEP); for (const e of s.events) if (!events.has(e.id)) events.set(e.id, e); }
const list = [...events.values()];
const table = {};
for (const e of list.filter(e => e.type === 'cottage-ignition' && e.buildingId === 'ashland-cottage')) {
  table[e.layer] ??= {}; table[e.layer][e.cause] = (table[e.layer][e.cause] ?? 0) + 1;
}
console.log('ignitions by layer and cause:', JSON.stringify(table));
const first = layer => list.find(e => e.type === 'cottage-ignition' && e.layer === layer);
console.log('first ignition per layer (world s):', ['walls', 'roof', 'upper', 'lower'].map(l => l + ' ' + r(first(l)?.worldTime, 2) + ' (' + first(l)?.cause + ')').join(' | '));
console.log('debris releases:', list.filter(e => e.type === 'cottage-debris-release').map(e => e.layer + '@' + r(e.worldTime, 2) + ' tile ' + e.tile).join(', '),
  '| debris contacts:', list.filter(e => e.type === 'cottage-debris-contact').map(e => '->' + e.layer + '@' + r(e.worldTime, 2)).join(', '));
sim.dispose();
