// Round 2. Target 1: grass front speed. Other steps, a long run, other radii, narrow lawns.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r06-grass.mjs <step|long|radii|strip|numbers>
import {make, lawn, round, PITCH} from './measure-var.mjs';
const part = process.argv[2];
const litAt = (world, i, j) => world.tileAt(i, j, 0)?.fuels[0]?.litAt ?? null;
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
const within = v => v >= 1.395 && v <= 1.605 ? 'in' : 'OUT';
// Steady straight fronts, as the author's grass.mjs measures them.
function straight(rules = {}, fuels = {}) {
  const a = make(rules, fuels); lawn(a, 0, 0, 101, 41); for (let j = 0; j < 41; j++) a.ignite(a.tileAt(0, j, 0)); run(a, 40);
  const b = make(rules, fuels); lawn(b, 0, 0, 121, 121); for (let i = 0; i <= 60; i++) b.ignite(b.tileAt(i, 60 - i, 0)); run(b, 40);
  return {axis: 60 * PITCH / (litAt(a, 90, 20) - litAt(a, 30, 20)), diagonal: Math.hypot(40, 40) * PITCH / (litAt(b, 85, 85) - litAt(b, 45, 45)),
    stepsPerTile: (litAt(a, 90, 20) - litAt(a, 30, 20)) / 60 / a.dt};
}
function point(rules = {}, fuels = {}, half = 100, rings = [[12, 48], [12, 24], [24, 48], [48, 96]], n = 64) {
  const world = make(rules, fuels), c = half; lawn(world, 0, 0, 2 * half + 1, 2 * half + 1);
  world.ignite(world.tileAt(c, c, 0)); run(world, half * PITCH / 1.2);
  return rings.map(([r0, r1]) => {
    const speeds = [];
    for (let m = 0; m < n; m++) {
      const angle = m * 2 * Math.PI / n, at = radius => [Math.round(radius * Math.cos(angle)), Math.round(radius * Math.sin(angle))];
      const [i0, j0] = at(r0), [i1, j1] = at(r1), t0 = litAt(world, c + i0, c + j0), t1 = litAt(world, c + i1, c + j1);
      if (t0 && t1) speeds.push((Math.hypot(i1, j1) - Math.hypot(i0, j0)) * PITCH / (t1 - t0));
    }
    return {from: r0 * PITCH, to: r1 * PITCH, n: speeds.length, min: Math.min(...speeds), max: Math.max(...speeds), mean: speeds.reduce((s, v) => s + v, 0) / speeds.length};
  });
}
if (part === 'step') {
  for (const step of [1 / 120, 1 / 60, 1 / 45, 1 / 30, 1 / 20, 1 / 15, 1 / 10]) {
    const s = straight({step});
    console.log('step 1/' + Math.round(1 / step), 's: straight front along the grid', round(s.axis, 3), within(s.axis), '| on the diagonal', round(s.diagonal, 3), within(s.diagonal), '| steps per tile along the grid', round(s.stepsPerTile, 3));
  }
}
if (part === 'long') {
  // A straight front along the grid for 80 m; speed in 10 m stretches.
  const world = make(); lawn(world, 0, 0, 181, 21); for (let j = 0; j < 21; j++) world.ignite(world.tileAt(0, j, 0)); run(world, 70);
  const out = []; for (let m = 0; m < 80; m += 10) out.push(m + '-' + (m + 10) + ' m: ' + round(10 / (litAt(world, 2 * (m + 10), 10) - (m ? litAt(world, 2 * m, 10) : 0)), 3));
  console.log('straight front along the grid, 80 m: ' + out.join(', '));
  const gaps = {}; for (let i = 40; i < 160; i++) { const d = Math.round((litAt(world, i + 1, 10) - litAt(world, i, 10)) / world.dt); gaps[d] = (gaps[d] ?? 0) + 1; }
  console.log('steps taken to cross one tile, tiles 40 to 160: ' + JSON.stringify(gaps));
}
if (part === 'radii') {
  for (const p of point()) console.log('from one tile, 64 directions, ' + p.from + ' to ' + p.to + ' m (' + p.n + ' measured): mean ' + round(p.mean, 3) + ', ' + round(p.min, 3) + ' ' + within(p.min) + ' to ' + round(p.max, 3) + ' ' + within(p.max) + ', spread ' + round(100 * (p.max - p.min) / p.mean, 1) + ' %');
  for (const p of point({}, {}, 30, [[2, 6], [2, 12], [6, 12], [0, 12]], 32)) console.log('start-up, 32 directions, ' + p.from + ' to ' + p.to + ' m: mean ' + round(p.mean, 3) + ', ' + round(p.min, 3) + ' to ' + round(p.max, 3));
}
if (part === 'strip') {
  // A lawn strip of limited width (a verge, a side yard): does the front still run, and how fast?
  for (const width of [1, 2, 3, 4, 6, 10, 20]) {
    const world = make(); lawn(world, 0, 0, 121, width); for (let j = 0; j < width; j++) world.ignite(world.tileAt(0, j, 0)); run(world, 150);
    const mid = Math.floor(width / 2), a = litAt(world, 30, mid), b = litAt(world, 110, mid);
    console.log('strip ' + width * PITCH + ' m wide (' + width + ' tiles): ' + (a && b ? round(80 * PITCH / (b - a), 3) + ' m/s ' + within(80 * PITCH / (b - a)) : 'front dies; last tile lit ' + Math.max(...[...world.tiles.values()].filter(t => t.fuels[0].litAt !== null).map(t => t.i)) * PITCH + ' m out'));
  }
}
if (part === 'numbers') {
  for (const [name, rules, fuels] of [['as tuned', {}, {}], ['grass delay 0.16', {}, {grass: {delay: .16}}], ['grass delay 0.20', {}, {grass: {delay: .2}}], ['grass delay 0.22', {}, {grass: {delay: .22}}], ['grass out 0.63', {}, {grass: {out: .63}}], ['grass out 0.77', {}, {grass: {out: .77}}],
    ['rate 3.6', {rate: 3.6}, {}], ['rate 4.4', {rate: 4.4}, {}], ['loss 1.8', {loss: 1.8}, {}], ['loss 2.2', {loss: 2.2}, {}], ['maxHeat 2.7', {maxHeat: 2.7}, {}], ['maxHeat 3.3', {maxHeat: 3.3}, {}], ['falloff 1.35', {falloff: 1.35}, {}], ['falloff 1.65', {falloff: 1.65}, {}], ['falloff 1 (first version)', {falloff: 1}, {}], ['falloff 2', {falloff: 2}, {}]]) {
    const s = straight(rules, fuels);
    console.log(name.padEnd(26), 'along the grid', round(s.axis, 3), within(s.axis), '| diagonal', round(s.diagonal, 3), within(s.diagonal), '| apart', round(200 * Math.abs(s.axis - s.diagonal) / (s.axis + s.diagonal), 1), '%');
  }
}
