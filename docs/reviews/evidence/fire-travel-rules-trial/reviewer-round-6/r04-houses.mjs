// Round 6. Rule 6's list on the catalogue plans: a bare path between lawn and house, and plan pairs.
//   node reviewer-round-6/r04-houses.mjs paths <plan>
//   node reviewer-round-6/r04-houses.mjs pairs <plan>
//   node reviewer-round-6/r04-houses.mjs overhang
import {make, house, lawn, outsideWalls, strikesOf, round, PLANS, PITCH} from '../measure.mjs';
import {pair} from '../pair.mjs';
const [mode, planId] = process.argv.slice(2);
const run = (w, s) => { for (let n = Math.round(s / w.dt); n > 0; n--) w.step(); };

if (mode === 'overhang') for (const id of PLANS) {
  // upper-storey tiles with no ground-storey room under them, and how far from the ground-storey rooms they reach
  const w = make(), a = house(w, 'A', id, 8, 8, {});
  const ground = new Set(), over = [];
  for (const rec of a.rooms.values()) for (const t of rec.tiles) if (t.k === 0) ground.add(t.i + ':' + t.j);
  const porch = new Set(a.porch.filter(t => t.k === 0).map(t => t.i + ':' + t.j));
  for (const rec of a.rooms.values()) for (const t of rec.tiles) if (t.k === 2 && !ground.has(t.i + ':' + t.j)) over.push(t);
  let far = 0; for (const t of over) { let d = 99; for (const g of ground) { const [i, j] = g.split(':').map(Number); d = Math.min(d, Math.max(Math.abs(i - t.i), Math.abs(j - t.j))); } far = Math.max(far, d); }
  console.log(id.padEnd(15) + 'upper tiles over no ground room: ' + over.length + ' (' + over.filter(t => porch.has(t.i + ':' + t.j)).length + ' over the porch deck), furthest ' + far + ' tiles out; porch tiles ' + porch.size);
}

if (mode === 'paths') for (const width of [0, 1, 2]) for (const ringPorch of [false, true]) {
  if (width === 0 && ringPorch) continue;
  const perFace = new Map(); let faces = 0, porchFaces = new Map(), firstAny = Infinity, viaUpper = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const w = make(), a = house(w, 'A', planId, 8, 8, {}), W = Math.round((16 + a.plan.width) / PITCH), D = Math.round((16 + a.plan.depth) / PITCH);
    const core = [...a.rooms.values()].flatMap(rec => rec.tiles.filter(t => t.k === 0)).concat(ringPorch ? a.porch.filter(t => t.k === 0) : []);
    const bare = new Set();
    for (const t of core) for (let dj = -width; dj <= width; dj++) for (let di = -width; di <= width; di++) bare.add((t.i + di) + ':' + (t.j + dj));
    for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) { const t = w.tileAt(i, j, 0) ?? w.addTile(i, j, 0); if (!t.building && !t.fuels.length && !bare.has(i + ':' + j)) w.addFuel(t, 'grass', 1); }
    w.ignite(w.tileAt(dx > 0 ? W - 2 : dx < 0 ? 1 : W >> 1, dy > 0 ? D - 2 : dy < 0 ? 1 : D >> 1, 0));
    run(w, 60);
    const walls = outsideWalls(w, a); faces = walls.length;
    for (const x of walls) {
      const id = x.tile.id + x.side, n = [x.outside.i - x.tile.i, x.outside.j - x.tile.j];
      if (x.outside.fuels.some(f => f.cls !== 'grass')) { porchFaces.set(id, Math.max(porchFaces.get(id) ?? 0, x.fuel.litAt ?? Infinity)); continue; }
      const g = w.tileAt(x.outside.i + n[0] * width, x.outside.j + n[1] * width, 0)?.fuels.find(f => f.cls === 'grass');
      if (x.fuel.litAt !== null) firstAny = Math.min(firstAny, x.fuel.litAt);
      if (!g || g.litAt === null) { if (!perFace.has(id)) perFace.set(id, {lit: x.fuel.litAt !== null, wait: null}); else if (x.fuel.litAt !== null) perFace.get(id).lit = true; continue; }
      const e = perFace.get(id) ?? {lit: false, wait: null};
      if (x.fuel.litAt !== null) { e.lit = true; if (x.fuel.litAt >= g.litAt) e.wait = Math.max(e.wait ?? 0, x.fuel.litAt - g.litAt); }
      perFace.set(id, e);
    }
    // anything of the house lit at all, and the first thing lit
    const ev = w.events.find(e => e.type === 'lit' && e.building === 'A');
    if (ev && width === 2) viaUpper += 1, console.log('      1 m path, lawn lit from ' + [dx, dy] + ': first house fuel lit at ' + round(ev.time) + ' s, a ' + ev.cls + ' at layer ' + ev.at[2] + ', ' + w.events.filter(e => e.type === 'lit' && e.building === 'A').length + ' house fuels lit in 60 s');
  }
  const list = [...perFace.values()], waits = list.filter(e => e.wait !== null).map(e => e.wait), pf = [...porchFaces.values()];
  console.log(planId.padEnd(15) + 'path ' + width * .5 + ' m' + (ringPorch ? ' (round the porch too)' : '') + ': ' + list.filter(e => e.lit).length + ' of ' + list.length + ' ground wall faces with nothing against them light' + (waits.length ? '; wait after the grass across the path ' + Math.min(...waits).toFixed(2) + ' to ' + Math.max(...waits).toFixed(2) + ' s' : '')
    + (pf.length ? '; ' + pf.length + ' faces behind a porch deck, lit ' + pf.filter(Number.isFinite).length + ', latest ' + round(Math.max(...pf.filter(Number.isFinite), 0)) + ' s' : ''));
}

if (mode === 'pairs') {
  const farWall = strikesOf(planId).find(s => s.startsWith('wall:x-') && !s.endsWith(':in'));
  for (const gap of [.5, 1, 1.5, 2]) {
    const p = pair(gap, 'bare', farWall, {}, {}, 200, planId);
    console.log(planId.padEnd(15) + 'gap ' + gap + ' m bare, strike ' + farWall + ': neighbour ' + (p.neighbourLit === null ? 'never' : 'lit at ' + round(p.neighbourLit) + ' s, ' + round(p.afterFacing) + ' s after the facing wall'));
  }
}
