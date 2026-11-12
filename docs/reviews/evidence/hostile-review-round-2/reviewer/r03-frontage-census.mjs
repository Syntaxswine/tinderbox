// Fix B across the whole street. For every house on Catalogue Street and both playable Ashland cottages, for every
// ground-storey fuel site that Fix B couples to the ground (wall bands, porch deck, stairs, post), cut its frontage into
// half-metre pieces and ask, piece by piece:
//   STATIC  which ground cells the shipped frontage table gives that piece, whether each can ever hold fuel
//           (own surface fuel, or bare ground that takes gas), and whether its line to the wall is clear.
//   DYNAMIC (walls only) fill the first-band cell in front of that one piece with gas in the FULL scenario, light it,
//           and read the site's published preheat after 0.2 s of world time, before any neighbour cell can ignite.
// Reads the live frontage tables through read-only taps (lib.mjs TAPS). Usage: node r03-frontage-census.mjs [quick]
import {underPatches, TAPS, load, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const api = await load();
const {lineClear, inObstacle} = await import(api.root + 'simulation/geometry.js');
const quick = process.argv.includes('quick');

function open(scenario, extra = {}) {
  globalThis.__lots = []; globalThis.__cottageLots = null;
  const sim = api.createSimulation({scenario: {...scenario, ...extra}, cottageWind: api.calmCottageWind, config: {fire: {damagePerSecond: 0}}});
  sim.advance(api.STEP);
  return sim;
}
// Every coupled site of the scenario as {building, id, kind, fronts, frontage}.
function coupled() {
  const list = [];
  for (const lot of globalThis.__lots) for (const g of lot.groundSites) {
    list.push({building: lot.building, lot, site: g.site, id: g.site.id, sampleId: lot.building.id + '/' + g.site.id,
      kind: g.site.id.startsWith('wall:') ? (lot.plan.style.wall === 'brick' ? 'joinery' : 'wall') : g.site.id, fronts: g.fronts, frontage: g.frontage});
  }
  for (const lot of globalThis.__cottageLots ?? []) for (const g of lot.groundSites) {
    const world = {x: lot.building.x + g.site.x, z: lot.building.y + g.site.z, nx: g.site.nx, nz: g.site.nz};
    list.push({building: lot.building, lot, site: g.site, id: g.site.id, sampleId: lot.building.id + '/' + g.site.id, kind: 'cottage-wall',
      fronts: [{...world, span: 1}], frontage: g.frontage});
  }
  return list;
}
function pieces(entry, field, obstacles) {
  const out = [];
  for (const [f, front] of entry.fronts.entries()) {
    const {x, z, nx, nz, span} = front, n = Math.max(1, Math.round(span / .5)), width = span / n;
    for (let j = 0; j < n; j++) {
      const s = -span / 2 + (j + .5) * width, centre = {x: x + nz * s, y: z - nx * s};
      const mine = [];
      for (const {cell, probes} of entry.frontage) for (const probe of probes) {
        const along = (probe.edge.x - x) * nz + (probe.edge.y - z) * -nx, off = (probe.edge.x - x) * nx + (probe.edge.y - z) * nz;
        if (Math.abs(off - .12) > 1e-6 || Math.abs(along - s) > width / 2 + 1e-6) continue;
        mine.push({cell, coupling: probe.coupling, clear: lineClear(cell, probe.edge, obstacles),
          fuel: cell.surfaceFuel > 0 ? 'own' : cell.material !== 'masonry' ? 'gas-only' : 'never'});
      }
      const outside = {x: centre.x + nx * .2, y: centre.y + nz * .2};
      const cover = obstacles.filter(o => !o.destroyed && inObstacle(outside, o)).map(o => o.id);
      const first = field.at({x: centre.x + nx * .38, y: centre.y + nz * .38});
      const status = mine.some(p => p.clear && p.fuel === 'own') ? 'lawn' : mine.some(p => p.clear && p.fuel === 'gas-only') ? 'gas-only' : 'dead';
      out.push({front: f, piece: j, centre, normal: {nx, nz}, cells: mine, status, cover, first,
        coupling: mine.filter(p => p.clear && p.fuel !== 'never').reduce((sum, p) => sum + p.coupling, 0)});
    }
  }
  return out;
}

const scenarios = [['catalogue', api.NEIGHBORHOOD_SCENARIO], ['ashland-pair', api.COTTAGE_PAIR_SCENARIO]];
const done = new Set();
let findings = 0;
for (const [label, scenario] of scenarios) {
  const sim = open(scenario), {field, state} = globalThis.__tb, entries = coupled();
  console.log(`\n==== ${label}: ${entries.length} ground-coupled sites ====`);
  const byHouse = new Map();
  for (const entry of entries) {
    if (label === 'ashland-pair' && done.has(entry.building.id + entry.building.x)) continue; // the six ordinary houses repeat
    if (!byHouse.has(entry.building.id)) byHouse.set(entry.building.id, []);
    byHouse.get(entry.building.id).push({entry, pieces: pieces(entry, field, state.obstacles)});
  }
  sim.dispose();
  for (const [house, list] of byHouse) {
    const building = list[0].entry.building; done.add(building.id + building.x);
    const lot = list[0].entry.lot, panels = lot.panels?.filter(p => p.level === 0) ?? [];
    const walls = list.filter(x => /wall|joinery/.test(x.entry.kind)), other = list.filter(x => !/wall|joinery/.test(x.entry.kind));
    const all = walls.flatMap(x => x.pieces.map(p => ({...p, entry: x.entry})));
    const count = status => all.filter(p => p.status === status).length;
    console.log(`\n-- ${house} (${building.prefabId}, quarterTurns ${building.quarterTurns}${lot.plan ? ', ' + lot.plan.style.wall + ', plinth ' + lot.plan.plinth : ''}) --`);
    if (panels.length) console.log(`   ground-storey panels ${panels.length}: with a fuel site ${panels.filter(p => p.low).length}, without (party wall or bare masonry) ${panels.filter(p => !p.low).length}`);
    console.log(`   wall half-metres ${all.length}: catch from their own lawn ${count('lawn')}, only from poured gas ${count('gas-only')}, DEAD ${count('dead')}`);
    const dead = all.filter(p => p.status === 'dead'), openDead = dead.filter(p => !p.cover.length);
    const coveredBy = {};
    for (const p of dead) for (const id of p.cover.length ? p.cover : ['OPEN AIR']) coveredBy[id.split(':').slice(1).join(':') || id] = (coveredBy[id.split(':').slice(1).join(':') || id] ?? 0) + 1;
    if (dead.length) console.log('   dead half-metres by what stands 0.2 m in front of them:', JSON.stringify(coveredBy));
    for (const p of openDead.slice(0, 12)) {
      findings++;
      console.log(`   OPEN-AIR DEAD ${p.entry.id} piece ${p.piece} at (${r(p.centre.x, 2)}, ${r(p.centre.y, 2)}) normal (${p.normal.nx}, ${p.normal.nz}): cells ` +
        (p.cells.map(c => `${c.cell.id}[${c.cell.material},${c.fuel},${c.clear ? 'clear' : 'BLOCKED'}]`).join(' ') || 'NONE in the table'));
    }
    // Dynamic check of every wall half-metre.
    let warmed = 0, cold = [], tested = 0;
    const sample = quick ? all.filter((_, i) => i % 6 === 0) : all;
    for (const p of sample) {
      if (!p.first) { cold.push({p, why: 'first-band cell is outside the world'}); continue; }
      const c = p.first, run = open(scenario, {
        fuelLines: [{from: {x: c.x - .2, y: c.y}, to: {x: c.x + .2, y: c.y}, litresPerMetre: .4}],
        ignitions: [{x: c.x, y: c.y, radius: .01, heat: 3}]});
      let s, peak = 0;
      for (let i = 0; i < 12; i++) { s = run.advance(api.STEP); peak = Math.max(peak, s.structureFire.find(f => f.id === p.entry.sampleId)?.heatFraction ?? 0); }
      const burning = s.cells.filter(x => x.phase === 'burning').map(x => x.id);
      run.dispose(); tested++;
      if (peak > .03) warmed++;
      else cold.push({p, why: `cell ${c.id} [${c.material}] burning=${burning.includes(c.id)} others burning ${burning.length - 1}; site preheat ${r(peak, 4)}; static ${p.status}; in front: ${p.cover.join(',') || 'open air'}`});
    }
    console.log(`   DYNAMIC: ${tested} half-metres lit one at a time with gas in their first-band cell: ${warmed} warmed the siding within 0.2 s, ${cold.length} did not`);
    const openCold = cold.filter(x => !x.p.cover.length);
    for (const x of openCold.slice(0, 12)) console.log(`     COLD in open air: ${x.p.entry.id} piece ${x.p.piece} at (${r(x.p.centre.x, 2)}, ${r(x.p.centre.y, 2)}): ${x.why}`);
    if (cold.length - openCold.length) console.log(`     (${cold.length - openCold.length} cold pieces stand behind: ${[...new Set(cold.filter(x => x.p.cover.length).flatMap(x => x.p.cover))].join(', ')})`);
    for (const x of other) {
      const live = x.pieces.filter(p => p.status !== 'dead'), cells = new Set(x.entry.frontage.filter(f => f.probes.length).map(f => f.cell));
      const usable = [...cells].filter(c => c.surfaceFuel > 0 || c.material !== 'masonry');
      console.log(`   ${x.entry.id}: frontage half-metres ${x.pieces.length} (live ${live.length}); ground cells in its table ${cells.size}, of which can hold fuel ${usable.length}` +
        ` (own surface fuel ${usable.filter(c => c.surfaceFuel > 0).length}); summed clear coupling ${r(x.pieces.reduce((s, p) => s + p.coupling, 0), 3)} (one wall panel: 0.084)`);
    }
  }
}
console.log(`\nRESULT: ${findings} wall half-metres stand in open air with no usable ground cell (static table).`);
