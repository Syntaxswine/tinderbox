// Fix B gave the porch deck ground contact along its whole perimeter, but the deck is still ONE fuel site (8 m x 2 m on
// Hopkins 12). This probe measures what that does, through the public entry point, on this tree and on 720f7b6 (m5,
// before the contact fix) as the control. Fixture: the repo's own porch scene (tests/simulation/fire-exposure.test.js):
// hopkins-4-12 at (10,10), quarterTurns 0; house x 10..18, y 10..17; porch x 10..18, y 8..10; bare paving elsewhere.
//   P1  two single grass cells 7 m apart in front of the porch, lit together. Controls: one cell alone; the same two
//       cells 5 m apart in front of the east wall.
//   P2  fire crossing 8 m of bare paving: grass at the west end of the porch, grass at the east end, light the west.
//       Controls: the same two patches joined by a strip of lawn (ground front), and two patches 5 m apart on the east wall
//       (many 1 m wall sites in a chain instead of one deck site).
//   P3  one match on the deck, lawn all round: how many lawn cells the deck lights, how far apart, in how many ticks.
//   P4  the shipped street: lawn lit at one end of the Hopkins 12 porch; when does lawn at the other end catch, and from what.
// Usage: node r05-porch-one-site.mjs
import {load, HEAD, M5, r} from './lib.mjs';
const trees = [['this tree', await load(HEAD)], ['m5 720f7b6 (control)', await load(M5)]];
const house = {id: 'h12', prefabId: 'hopkins-4-12', x: 10, y: 10, quarterTurns: 0};
const scene = extra => ({id: 'neighborhood', width: 28, height: 24, buildings: [house], obstacles: [], actors: [], player: {x: 25, y: 22, tool: 'matches'}, ...extra});
const grass = (x, y, width = .5, depth = .5) => ({x, y, width, depth, material: 'grass'});
const light = (x, y) => ({x: x + .25, y: y + .25, radius: .01, heat: 3});

function run(api, scenario, seconds, each) {
  const sim = api.createSimulation({scenario, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, events: {capacity: 4096}}});
  const events = new Map(), peaks = new Map(); let s;
  each?.(sim, 'start');
  for (let i = 0; i < Math.round(seconds / api.STEP); i++) {
    s = sim.advance(api.STEP);
    for (const e of s.events) events.set(e.id, e);
    for (const f of s.structureFire) if (f.ignitionTime === null) peaks.set(f.id, Math.max(peaks.get(f.id) ?? 0, f.heatFraction));
  }
  sim.dispose();
  const all = [...events.values()];
  return {s, all, peaks, structure: all.filter(e => e.type === 'structure-ignition'), ground: all.filter(e => e.type === 'ignition')};
}
const first = (list, test) => list.find(test);
const at = e => e ? r(e.worldTime ?? e.tick / 60, 3) : null;

for (const [label, api] of trees) {
  console.log(`\n================ ${label} ================`);
  console.log('P1. Single 0.5 m grass cells against one receiver (grass cell burns 3.2 s; deck/siding ignite at heat 1.10)');
  const cases = [
    ['porch, ONE cell at its west end        ', [grass(10.5, 7.5)]],
    ['porch, TWO cells 7 m apart             ', [grass(10.5, 7.5), grass(17.5, 7.5)]],
    ['porch, THREE cells, 3.5 m apart        ', [grass(10.5, 7.5), grass(13, 7.5), grass(17.5, 7.5)]],
    ['east wall, TWO cells 5 m apart (control)', [grass(18, 10.5), grass(18, 15.5)]],
    ['east wall, TWO cells on ONE panel (control)', [grass(18, 12), grass(18, 12.5)]]
  ];
  for (const [name, patches] of cases) {
    const out = run(api, scene({patches, ignitions: patches.map(p => light(p.x, p.y))}), 8);
    const deck = first(out.structure, e => e.cause === 'ground-heat');
    const peak = Math.max(0, ...out.peaks.values());
    console.log(`   ${name}: burning cells lit ${out.ground.length} | highest preheat on any site ${r(peak, 3)} | ` +
      (deck ? `IGNITED ${deck.siteId} at ${at(deck)} s, parent ${deck.parentSiteId}` : 'no structure ignition'));
  }

  console.log('P2. Fire crossing bare paving between two lawn patches (west patch lit at t=0)');
  const west = grass(8.5, 8, 1.5, 2), east = grass(18, 8, 1.5, 2);
  const crossings = [
    ['along the 8 m porch front (bare paving between)   ', [west, east], [9.25, 9], e => e.x > 18],
    ['CONTROL same patches joined by a 0.5 m lawn strip  ', [west, east, grass(10, 7.5, 8, .5)], [9.25, 9], e => e.x > 18],
    ['CONTROL along the east wall, 5 m of bare paving between', [grass(18, 10, 1.5, 1), grass(18, 16, 1.5, 1)], [18.5, 10.5], e => e.y > 16]
  ];
  for (const [name, patches, [x, y], far] of crossings) {
    const out = run(api, scene({patches, ignitions: [{x, y, radius: .3, heat: 3}]}), 40);
    const struct = out.structure[0], arrival = first(out.ground, e => far(e));
    const start = Math.min(...out.ground.map(e => e.tick)) / 60;
    console.log(`   ${name}: first structure ignition ${struct ? struct.siteId.split('/')[1] + ' at ' + at(struct) + ' s' : 'none'} | far patch ` +
      (arrival ? `ignites at ${r(arrival.tick / 60, 3)} s (cause ${arrival.cause}), ${r(arrival.tick / 60 - start, 2)} s after the west patch` : 'NEVER ignites in 40 s'));
  }

  console.log('P3. One match on the deck, lawn all round the house');
  {
    const out = run(api, scene({patches: [grass(0, 0, 28, 24)], player: {x: 12.5, y: 7.3, tool: 'matches', heading: Math.PI / 2}}), 4, (sim) => {
      sim.dispatch({type: 'aim', x: 12.5, y: 8.1}); sim.dispatch({type: 'primary', pressed: true}); sim.advance(1 / 60); sim.dispatch({type: 'primary', pressed: false});
    });
    const deck = first(out.all, e => e.type === 'tool-use');
    const lit = out.ground.filter(e => e.cause === 'structure-siding');
    const byTick = new Map(); for (const e of lit) byTick.set(e.tick, [...(byTick.get(e.tick) ?? []), e]);
    const firstTick = Math.min(...byTick.keys()), wave = byTick.get(firstTick) ?? [];
    const span = list => list.length ? r(Math.max(...list.map(e => e.x)) - Math.min(...list.map(e => e.x)), 2) : 0;
    console.log(`   match result ${deck?.result} on ${deck?.cellIds?.[0]} | lawn cells lit by the house in 4 s: ${lit.length}` +
      (lit.length ? ` | first wave: ${wave.length} cells in ONE tick (${r(firstTick / 60, 3)} s), spanning ${span(wave)} m east-west | all ${lit.length} within ${r((Math.max(...lit.map(e => e.tick)) - firstTick) / 60, 2)} s, spanning ${span(lit)} m` : ''));
  }

  console.log('P4. The shipped street: lawn lit at the west end of the Hopkins 12 porch (porch x 3..11, y 10..12), full Catalogue Street');
  {
    const out = run(api, {...api.NEIGHBORHOOD_SCENARIO, actors: [], ignitions: [{x: 2.75, y: 11.25, radius: .3, heat: 3}]}, 8);
    const start = Math.min(...out.ground.map(e => e.tick)) / 60;
    const east = out.ground.filter(e => e.x > 11 && e.x < 12.5 && e.y > 10 && e.y < 12.5).sort((a, b) => a.tick - b.tick)[0];
    const deck = first(out.structure, e => e.siteId.endsWith('deck:porch'));
    console.log(`   deck ignites at ${deck ? at(deck) + ' s (cause ' + deck.cause + ')' : 'never'} | first lawn cell beyond the east end of the porch (8.5 m away) ignites ` +
      (east ? `${r(east.tick / 60 - start, 2)} s after the west lawn, cause ${east.cause} => ${r(8.5 / (east.tick / 60 - start), 1)} m/s (a grass front moves 2 m/s)` : 'not within 8 s'));
  }
}
