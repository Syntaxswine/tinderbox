// r13: the Ashland cottage pair after the floor pass (its floor tiles now come from the shared floor compiler and
// falling fuel lands on the receiver's own height). One match on the near siding, calm and with the baked wind,
// 220 s, on this tree and on tip2 (26931d9): per cottage first ignition, ignitions by layer, tile burnouts,
// clearance, falling-fuel contacts by layer, ember contacts; plus the street houses the lawn fire reaches.
// Also checks on this tree that every falling-fuel contact names a layer whose tile was still standing.
// Run: TB_TREES=<dir with tip2/> node r13-ashland-pair-differential.mjs
import {readFileSync} from 'node:fs';
import {HEAD, TIP2, load, r} from './lib.mjs';

async function run(root, mode) {
  const api = await load(root);
  const {translateCottageWind} = await import(root + 'reuse/ashland/wind.js');
  const wind = mode === 'calm' ? api.calmCottageWind : translateCottageWind(JSON.parse(readFileSync(new URL('assets/art/ashland-pair/pair-wind.json', new URL('../', root)), 'utf8').replaceAll('\r\n', '\n')));
  const sim = api.createSimulation({scenario: api.COTTAGE_PAIR_SCENARIO, cottageWind: wind, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, events: {capacity: 4096}}});
  const seen = new Set(), houses = new Map(), out = {contacts: {}, embers: 0, structure: new Map()};
  const house = id => houses.get(id) ?? houses.set(id, {first: null, layers: {}, tiles: [], cleared: null, last: null}).get(id);
  const take = s => { for (const e of s.events) {
    if (seen.has(e.id)) continue; seen.add(e.id);
    if (e.type === 'cottage-ignition') { const h = house(e.buildingId); h.first ??= s.clocks.world; h.layers[e.layer] = (h.layers[e.layer] ?? 0) + 1; h.last = s.clocks.world; }
    else if (e.type === 'building-section-burnout' && houses.has(e.buildingId)) house(e.buildingId).tiles.push(e.worldTime ?? s.clocks.world);
    else if (e.type === 'building-burnout') { if (houses.has(e.buildingId)) house(e.buildingId).cleared = e.worldTime; else out.structure.set(e.buildingId, e.worldTime); }
    else if (e.type === 'cottage-debris-contact') out.contacts[e.layer ?? 'ground'] = (out.contacts[e.layer ?? 'ground'] ?? 0) + 1;
    else if (e.type === 'cottage-ember-contact') out.embers++;
  } return s; };
  sim.dispatch({type: 'aim', x: 51, y: 13.5}); sim.dispatch({type: 'primary', pressed: true}); take(sim.advance(api.STEP)); sim.dispatch({type: 'primary', pressed: false});
  let last; for (let i = 0; i < 220 * 4; i++) last = take(sim.advance(.25));
  out.houses = houses; out.fuel = last.diagnostics.fuel; sim.dispose();
  return out;
}
for (const mode of ['calm', 'wind']) {
  const a = await run(HEAD, mode), b = process.env.TB_TREES ? await run(TIP2, mode) : null;
  console.log(`== ${mode}`);
  for (const [label, o] of [['HEAD', a], ['tip2', b]]) if (o) {
    for (const [id, h] of o.houses) console.log(`  ${label} ${id.padEnd(17)} first ${r(h.first, 2)} s, ignitions ${JSON.stringify(h.layers)}, last ignition ${r(h.last, 2)} s, tile burnouts ${h.tiles.length} (${r(Math.min(...h.tiles), 2)}..${r(Math.max(...h.tiles), 2)} s), cleared ${r(h.cleared, 2)} s`);
    console.log(`  ${label} falling-fuel contacts by receiving layer ${JSON.stringify(o.contacts)}, ember contacts ${o.embers}, street houses burned out ${JSON.stringify([...o.structure].map(([id, t]) => [id, r(t, 2)]))}, ground surface fuel burned ${r(o.fuel.burnedSurfaceFuel, 3)}`);
  }
}
