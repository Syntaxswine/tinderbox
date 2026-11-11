// Round 1, probe 7: reach across gaps (Rule 6). House-to-house gap sweep, how few burning tiles light a neighbour,
// paving at other orientations and lawn sizes, and the 0.5 s radiant cadence.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r07-gaps-and-reach.mjs
import {ALL, round, out, createVar, lawn, house, wallTiles, lightFuel} from './lib.mjs';
const lines = [], pad = (s, n) => String(s ?? 'never').padEnd(n);

// (a) two Hopkins 15 houses, A furnished, B empty, gap g between facing walls. Strike on A's facing wall (the trial's) or its far wall.
function pair(gap, where, rules = {}, seconds = 150) {
  const world = createVar({rules});
  const a = house(world, 'A', 'hopkins-4-15', 6, 6, ALL); house(world, 'B', 'hopkins-4-15', 16 + gap, 6);
  if (where === 'facing') world.ignite(world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 0), 'clapboard');
  else { const w = wallTiles(a, world, 0).filter(x => x.side === 'x-'); const m = w[Math.floor(w.length / 2)]; lightFuel(world, m.tile, m.fuel); }
  const fuelsA = [...a.rooms.values()].flatMap(r => r.tiles).flatMap(t => t.fuels);
  const bTiles = [...world.tiles.values()].filter(t => t.building === 'B');
  let maxRad = 0, facingFirst = null;
  for (let n = 0; n < seconds * 30; n++) {
    world.step();
    if (n % 15 === 0) for (const t of bTiles) if (t.rad > maxRad) maxRad = t.rad;
    const e = world.events.at(-1);
    const lit = world.events.find(e => e.type === 'lit' && e.building === 'B');
    if (lit) return {time: lit.time, burningA: fuelsA.filter(f => f.lit).length, nA: fuelsA.length, maxRad, cls: lit.cls, k: lit.at[2]};
  }
  return {time: null, maxRad, nA: fuelsA.length};
}
lines.push('(a) gap between two Hopkins 15 houses; match on A. B "catches" = its first fuel lights. 150 s.');
lines.push(pad('gap m', 8) + pad('strike on facing wall: B lit', 30) + pad('A burning then', 18) + pad('max radiant on B', 18) + pad('| strike on far wall: B lit', 28) + 'A burning then');
for (const gap of [.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 8]) {
  const f = pair(gap, 'facing'), far = pair(gap, 'far');
  lines.push(pad(gap, 8) + pad(f.time === null ? 'never' : round(f.time) + ' s', 30) + pad(f.time === null ? '' : round(100 * f.burningA / f.nA, 1) + ' %', 18) + pad(round(f.maxRad, 2), 18) + pad('| ' + (far.time === null ? 'never' : round(far.time) + ' s'), 28) + (far.time === null ? '(max radiant ' + round(far.maxRad, 2) + ')' : round(100 * far.burningA / far.nA, 1) + ' %'));
}

// (b) how small a fire lights the house next door: a free-standing row of N burning clapboard wall tiles (no house behind), L layers tall, 2 m from B.
function row(n, layers, gap, burnFor) {
  const fuels = undefined;
  const world = createVar(burnFor ? {fuels: {...createVar().fuels, clapboard: {...createVar().fuels.clapboard, burnFor}}} : {});
  house(world, 'B', 'hopkins-4-15', 10, 6);            // B's x- wall is at i = 20
  const i = 20 - Math.round(gap / .5) - 1, j0 = 12 + 10 - Math.floor(n / 2);
  for (let k = 0; k < layers; k++) for (let j = j0; j < j0 + n; j++) {
    const t = world.addTile(i, j, k, {inside: true, building: 'X', room: 'X'});
    const object = world.setFace(i, j, k, 0, 1, 'timber');
    world.addFuel(t, 'clapboard', 1, {face: {axis: 0, step: 1, object}, lit: true});
  }
  let maxRad = 0; const bTiles = [...world.tiles.values()].filter(t => t.building === 'B');
  for (let s = 0; s < 40 * 30; s++) { world.step(); if (s % 15 === 0) for (const t of bTiles) if (t.rad > maxRad) maxRad = t.rad; const lit = world.events.find(e => e.type === 'lit' && e.building === 'B'); if (lit) return {time: lit.time, maxRad}; }
  return {time: null, maxRad};
}
lines.push('', '(b) a free-standing strip of burning clapboard wall, N tiles long and L layers tall (each tile burns 25 s), 2 m from house B. Clapboard needs radiant >= 1.1 to char.');
lines.push(pad('N x L', 10) + pad('size m', 16) + pad('B lit', 12) + 'max radiant on B');
for (const [n, l] of [[1, 1], [2, 1], [4, 1], [8, 1], [12, 1], [16, 1], [1, 2], [2, 2], [4, 2], [6, 2], [8, 2], [3, 4], [4, 4], [6, 4]]) { const r = row(n, l, 2); lines.push(pad(n + ' x ' + l, 10) + pad(n * .5 + ' x ' + round(l * 1.06), 16) + pad(r.time === null ? 'never' : round(r.time) + ' s', 12) + round(r.maxRad, 2)); }
lines.push('    the same at other gaps, strip 8 x 2 (4 m x 2.12 m): ' + [.5, 1, 1.5, 2, 2.5, 3].map(g => { const r = row(8, 2, g); return g + ' m ' + (r.time === null ? 'never' : round(r.time) + ' s') + ' (rad ' + round(r.maxRad, 2) + ')'; }).join('; '));

// (c) paving. A strip of paving (tiles with no fuel) or of nothing (no tiles), straight or diagonal, between two lawns.
function strip(kind, {size = 41, width = 1, bare = false, rules = {}, seconds = 40} = {}) {
  const world = createVar({rules});
  const mid = Math.floor(size / 2);
  const isStrip = (i, j) => kind === 'x' ? i >= mid && i < mid + width : kind === 'y' ? j >= mid && j < mid + width : kind === 'diag' ? i - j >= 0 && i - j < width : i + j - size + 1 >= 0 && i + j - size + 1 < width;
  const far = (i, j) => kind === 'x' ? i >= mid + width : kind === 'y' ? j >= mid + width : kind === 'diag' ? i - j >= width : i + j - size + 1 >= width;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    if (isStrip(i, j)) { if (!bare) world.addTile(i, j, 0); continue; }
    const t = world.addTile(i, j, 0); world.addFuel(t, 'grass', 1); t.radiantTarget = true;
  }
  // light a near-side tile close to the strip's middle
  const start = kind === 'x' ? [2, mid] : kind === 'y' ? [mid, 2] : kind === 'diag' ? [Math.floor(size / 4), Math.floor(3 * size / 4)] : [Math.floor(size / 4), Math.floor(size / 4)];
  world.ignite(world.tileAt(...start, 0));
  let maxRad = 0;
  for (let s = 0; s < seconds * 30; s++) { world.step(); if (s % 15 === 0) for (const t of world.active) if (far(t.i, t.j) && t.rad > maxRad) maxRad = t.rad; }
  const crossed = world.events.find(e => e.type === 'lit' && far(e.at[0], e.at[1]));
  return (crossed ? 'CROSSES at ' + round(crossed.time) + ' s' : 'does not cross') + ' (max radiant on far side ' + round(maxRad, 2) + ' of 0.85 needed)';
}
lines.push('', '(c) grass, a strip between two lawns. "paving" = tiles with no fuel (as trial.mjs); "nothing" = no tiles there at all.');
lines.push('    CONTROL straight strip across x, 1 tile (0.5 m), 41 x 41 lawn: ' + strip('x'));
lines.push('    straight across y, 1 tile: ' + strip('y'));
lines.push('    straight across x, 1 tile, nothing: ' + strip('x', {bare: true}));
lines.push('    diagonal strip, 1 tile wide (0.35 m across; the lawn tiles on either side touch at corners): ' + strip('diag'));
lines.push('    diagonal strip, 2 tiles wide (0.71 m across): ' + strip('diag', {width: 2}));
lines.push('    anti-diagonal strip, 1 tile: ' + strip('anti'));
lines.push('    anti-diagonal strip, 2 tiles: ' + strip('anti', {width: 2}));
for (const size of [81, 161]) lines.push('    straight across x, 1 tile, lawn ' + size + ' x ' + size + ' (a wider front arrives): ' + strip('x', {size, seconds: size > 100 ? 70 : 40}));

// (d) the radiant cadence. radiate() runs every radiantEvery seconds and what it sets stays until the next run.
lines.push('', '(d) the 0.5 s radiant cadence (rules.radiantEvery). Gap 2 m and 3 m, strike on the facing wall; and the 1-tile paving on the 81 lawn.');
lines.push(pad('every s', 9) + pad('B lit, 2 m', 14) + pad('B lit, 2.5 m', 14) + 'paving');
for (const every of [1 / 30, .1, .25, .5, 1, 2, 4]) { const a = pair(2, 'facing', {radiantEvery: every}, 60), b = pair(2.5, 'facing', {radiantEvery: every}, 150); lines.push(pad(round(every, 3), 9) + pad(a.time === null ? 'never' : round(a.time) + ' s', 14) + pad(b.time === null ? 'never' : round(b.time) + ' s', 14) + strip('x', {size: 81, rules: {radiantEvery: every}})); }
out('r07-gaps-and-reach.txt', lines);
