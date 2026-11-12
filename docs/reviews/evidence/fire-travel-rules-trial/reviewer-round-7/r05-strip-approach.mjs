// Round 7. A lawn fire lit 8 m from a furnished house, with a strip of bare ground between lawn and house.
// Strip n tiles wide (0.5 m each), round the walls only or round walls and porch. 150 s.
//   node r05-strip-approach.mjs
import {make, house, outsideWalls, round, ALL, PLANS, PITCH} from '../measure.mjs';
for (const porch of [false, true]) for (const n of [0, 1, 2, 3]) {
  if (!n && porch) continue;
  const out = [];
  for (const planId of PLANS) {
    const world = make(), a = house(world, 'A', planId, 8, 8, ALL), W = Math.round((16 + a.plan.width) / PITCH), D = Math.round((16 + a.plan.depth) / PITCH), keep = new Set();
    const cores = [];
    for (const record of a.rooms.values()) for (const tile of record.tiles) if (tile.k === 0) cores.push(tile);
    if (porch) for (const tile of a.porch) if (tile.k === 0) cores.push(tile);
    if (n) for (const t of cores) for (let dj = -n; dj <= n; dj++) for (let di = -n; di <= n; di++) keep.add((t.i + di) + ':' + (t.j + dj));
    for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) { const tile = world.tileAt(i, j, 0) ?? world.addTile(i, j, 0); if (!keep.has(i + ':' + j) && !tile.building && !tile.fuels.length) world.addFuel(tile, 'grass', 1); }
    const initial = [];
    for (const record of a.rooms.values()) for (const tile of record.tiles) for (const fuel of tile.fuels) initial.push(fuel);
    world.ignite(world.tileAt(1, D >> 1, 0));
    for (let s = Math.round(150 / world.dt); s > 0; s--) world.step();
    const first = world.events.find(e => e.type === 'lit' && e.building === 'A');
    const lit = initial.filter(f => f.litAt !== null).map(f => f.litAt).sort((p, q) => p - q), half = lit.length >= initial.length / 2 ? lit[Math.ceil(initial.length / 2) - 1] : null;
    const walls = outsideWalls(world, a), wl = walls.filter(w => w.fuel.litAt !== null);
    const deck = a.porch.filter(t => t.k === 0).map(t => t.fuels[0].litAt).filter(v => v !== null);
    // overhang: an upper-storey house tile with no house tile on the ground under it
    let overhang = 0; for (const record of a.rooms.values()) for (const tile of record.tiles) if (tile.k === 2 && !world.tileAt(tile.i, tile.j, 0)?.building) overhang++;
    out.push(planId.replace('hopkins-4-', 'H') + ': ' + (first ? 'house lit ' + round(first.time) + ' s (' + first.cls + ' k' + first.at[2] + '), half ' + (half === null ? 'never' : round(half - first.time) + ' s later') + ', ground walls lit ' + wl.length + '/' + walls.length : 'UNTOUCHED') + (deck.length ? ', deck lit ' + round(Math.min(...deck)) : ', deck not lit') + ', overhang tiles ' + overhang);
  }
  console.log('strip ' + n * .5 + ' m, ' + (porch ? 'round walls and porch' : 'round walls only') + '\n   ' + out.join('\n   '));
}
