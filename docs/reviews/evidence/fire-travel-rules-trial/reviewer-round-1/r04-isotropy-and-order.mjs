// Round 1, probe 4: grass front in 32 directions at four radii; tile creation order; the order in which
// active tiles are processed; a mirrored and a transposed house.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r04-isotropy-and-order.mjs [grass]
import {burn, ALL, round, out, createVar, lawn, wallTiles, lightFuel, transformPlan, HOUSING_PLANS, PITCH} from './lib.mjs';
const lines = [];

// (a) grass, 32 directions.
function grass(build) {
  const world = createVar(), N = 201, c = 100;
  build(world, N);
  world.ignite(world.tileAt(c, c, 0));
  for (let n = 0; n < 22 * 30; n++) world.step();
  const lit = new Map(); for (const e of world.events) if (e.type === 'lit') lit.set(e.at[0] + ',' + e.at[1], e.time);
  const radii = [6, 12, 24, 48], table = [];
  for (let a = 0; a < 32; a++) {
    const angle = a * Math.PI / 16, row = {deg: a * 11.25};
    for (const r of radii) { const di = Math.round(r * Math.cos(angle)), dj = Math.round(r * Math.sin(angle)); row[r] = {d: Math.hypot(di, dj) * PITCH, t: lit.get((c + di) + ',' + (c + dj)) ?? null}; }
    table.push(row);
  }
  return {world, table, radii, lit};
}
const g = grass((world, N) => lawn(world, 0, 0, N, N));
lines.push('(a) grass front from one lit tile, 32 directions. speed = distance / time of first light (m/s); "12-48" = speed between the 6 m and 24 m rings (start transient removed).');
lines.push('deg     r=3m   r=6m   r=12m  r=24m  12-48');
const col = {3: [], 6: [], 12: [], 24: [], d: []};
for (const row of g.table) {
  const v = g.radii.map(r => row[r].t ? row[r].d / row[r].t : null), d = row[48].t && row[12].t ? (row[48].d - row[12].d) / (row[48].t - row[12].t) : null;
  [3, 6, 12, 24].forEach((k, n) => col[k].push(v[n])); col.d.push(d);
  lines.push(String(row.deg).padEnd(8) + v.map(x => String(round(x, 3)).padEnd(7)).join('') + round(d, 3));
}
const stat = list => { const mean = list.reduce((a, b) => a + b, 0) / list.length; return 'mean ' + round(mean, 3) + ' m/s, min ' + round(Math.min(...list), 3) + ', max ' + round(Math.max(...list), 3) + ', spread ' + round(100 * (Math.max(...list) - Math.min(...list)) / mean, 1) + ' %'; };
for (const k of [3, 6, 12, 24]) lines.push('radius ' + k + ' m, 32 directions: ' + stat(col[k]));
lines.push('between 6 m and 24 m, 32 directions: ' + stat(col.d));
const eight = list => list.filter((_, n) => n % 4 === 0);
lines.push('CONTROL the trial\'s own 8 directions at 6 m: ' + stat(eight(col[6])) + '   (trial reports 1.46 m/s, 3.4 %)');

// (b) the same lawn with tiles created in the reverse order.
const g2 = grass((world, N) => { for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) { const t = world.addTile(i, j, 0); world.addFuel(t, 'grass', 1); t.radiantTarget = true; } });
let differ = 0, worst = 0; for (const [k, t] of g.lit) { const t2 = g2.lit.get(k); if (t2 !== t) { differ++; worst = Math.max(worst, Math.abs((t2 ?? 1e9) - t)); } }
lines.push('', '(b) tile CREATION order reversed, same lawn: tiles whose light time differs: ' + differ + ' of ' + g.lit.size + ', worst ' + round(worst, 4) + ' s');
// point symmetry of the front: tile (c+di, c+dj) against (c-di, c-dj)
let asym = 0, worstA = 0, n = 0; for (const [k, t] of g.lit) { const [i, j] = k.split(',').map(Number), t2 = g.lit.get((200 - i) + ',' + (200 - j)); if (t2 === undefined) continue; n++; if (Math.abs(t2 - t) > 1e-9) { asym++; worstA = Math.max(worstA, Math.abs(t2 - t)); } }
lines.push('    point symmetry of one run (tile against its opposite through the start): ' + asym + ' of ' + n + ' differ, worst ' + round(worstA, 4) + ' s');

// quick mode: 'grass' as the first argument stops here (about 15 s).
if (process.argv[2] === 'grass') { out('r04-grass-only.txt', lines); process.exit(0); }
// (c) the order active tiles are processed in phase 2 (heat, char, burn), house scene.
const strikeTrial = (world, a) => { const t = world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 0); world.ignite(t, 'clapboard'); return t.room; };
const base = burn({seconds: 150, strike: strikeTrial});
const rev = burn({seconds: 150, strike: strikeTrial, world: {variant: {phase2Order: list => list.reverse()}}});
const sorted = burn({seconds: 150, strike: strikeTrial, world: {variant: {phase2Order: list => list.sort((x, y) => x.id - y.id)}}});
const show = r => 't4 ' + round(r.roomAll) + ' s, t5 ' + round(r.half) + ' s, t6 ' + round(r.flameUntil) + ' s, t7 ' + round(r.fall?.time) + ' s (' + r.fall?.cause + '), lit events ' + r.world.events.filter(e => e.type === 'lit').length + ', falls ' + r.falls.length;
lines.push('', '(c) Hopkins 15, trial strike, one house, 150 s. Order in which active tiles are processed within a step:');
lines.push('    as written (Set insertion order): ' + show(base));
lines.push('    reversed:                         ' + show(rev));
lines.push('    sorted by tile id:                ' + show(sorted));
const times = r => r.initial.map(x => x.fuel.litAt);
const cmp = (a, b) => { let d = 0, w = 0; const ta = times(a), tb = times(b); ta.forEach((t, n) => { if (t !== tb[n]) { d++; if (t !== null && tb[n] !== null) w = Math.max(w, Math.abs(t - tb[n])); } }); return d + ' of ' + ta.length + ' fuels light at a different time, worst ' + round(w, 2) + ' s'; };
lines.push('    reversed vs as written: ' + cmp(base, rev) + '; sorted vs as written: ' + cmp(base, sorted));

// (d) mirrored and transposed Hopkins 15: the same house, the same strike point carried through the transform.
const p = HOUSING_PLANS['hopkins-4-15'];
function transformed(kind) {
  const plan = kind ? transformPlan(p, kind) : p;
  // trial strike: tile (19, 4) = plan point (9.75, 2.25), on the x+ wall.
  const pt = kind === 'mirror' ? [p.width - 9.75, 2.25] : kind === 'transpose' ? [2.25, 9.75] : [9.75, 2.25];
  const side = kind === 'mirror' ? 'x-' : kind === 'transpose' ? 'y+' : 'x+';
  return burn({planId: plan, seconds: 150, strike: (world, a) => {
    const tile = world.tileAt(a.origin[0] + Math.floor(pt[0] / PITCH), a.origin[1] + Math.floor(pt[1] / PITCH), 0);
    const w = wallTiles(a, world, 0).find(x => x.tile === tile && x.side === side);
    lightFuel(world, tile, w.fuel); return tile.room;
  }});
}
lines.push('', '(d) the same house and strike, mirrored in x and transposed (x and y swapped). A rule set with no grid or order artefact gives the same numbers.');
for (const kind of [null, 'mirror', 'transpose']) { const r = transformed(kind); lines.push('    ' + (kind ?? 'as built').padEnd(10) + show(r) + ', fuels ' + r.n + ', room fuels ' + r.roomN); }
out('r04-isotropy-and-order.txt', lines);
