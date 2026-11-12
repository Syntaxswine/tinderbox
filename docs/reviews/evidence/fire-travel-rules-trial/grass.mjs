// Target 1, measured the way review round 1 (M1) asked: steady straight fronts along the grid axis and
// along its diagonal, and a fire from one lit tile timed in 32 directions between 6 m and 24 m out
// (so the start-up is left out).
//   node docs/reviews/evidence/fire-travel-rules-trial/grass.mjs [rules json] [fuels json] [quick]
import {make, lawn, round, PITCH} from './measure.mjs';
const rules = JSON.parse(process.argv[2] ?? '{}'), fuels = JSON.parse(process.argv[3] ?? '{}'), quick = process.argv[4] === 'quick';
const litAt = (world, i, j) => world.tileAt(i, j, 0)?.fuels[0].litAt ?? null;
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };

export function grass() {
  const out = {};
  // Straight front along x: light the whole column i = 0.
  {
    const world = make(rules, fuels); lawn(world, 0, 0, 101, 41);
    for (let j = 0; j < 41; j++) world.ignite(world.tileAt(0, j, 0));
    run(world, 40);
    const a = litAt(world, 30, 20), b = litAt(world, 90, 20);
    out.axis = a && b ? 60 * PITCH / (b - a) : null;
  }
  // Straight front along the diagonal: light every tile with i + j = 60 on a square lawn, time along (1,1).
  {
    const world = make(rules, fuels); lawn(world, 0, 0, 121, 121);
    for (let i = 0; i <= 60; i++) world.ignite(world.tileAt(i, 60 - i, 0));
    run(world, 40);
    const a = litAt(world, 45, 45), b = litAt(world, 85, 85);
    out.diagonal = a && b ? Math.hypot(40, 40) * PITCH / (b - a) : null;
  }
  if (!quick) {
    const world = make(rules, fuels); lawn(world, 0, 0, 111, 111);
    world.ignite(world.tileAt(55, 55, 0));
    run(world, 30);
    const speeds = [];
    for (let n = 0; n < 32; n++) {
      const angle = n * Math.PI / 16, at = radius => [Math.round(radius * Math.cos(angle)), Math.round(radius * Math.sin(angle))];
      const [i0, j0] = at(12), [i1, j1] = at(48), t0 = litAt(world, 55 + i0, 55 + j0), t1 = litAt(world, 55 + i1, 55 + j1);
      speeds.push(t0 && t1 ? (Math.hypot(i1, j1) - Math.hypot(i0, j0)) * PITCH / (t1 - t0) : NaN);
    }
    out.point = {mean: speeds.reduce((s, v) => s + v, 0) / 32, min: Math.min(...speeds), max: Math.max(...speeds)};
  }
  return out;
}
if (process.argv[1].endsWith('grass.mjs')) {
  const g = grass();
  console.log(JSON.stringify(rules) + ' ' + JSON.stringify(fuels) + '  straight front: axis ' + round(g.axis, 3) + ' m/s, diagonal ' + round(g.diagonal, 3) + ' m/s, apart ' + round(200 * Math.abs(g.axis - g.diagonal) / (g.axis + g.diagonal), 1) + ' %'
    + (g.point ? '; from one tile, 32 directions, 6 to 24 m: mean ' + round(g.point.mean, 3) + ', ' + round(g.point.min, 3) + ' to ' + round(g.point.max, 3) + ' m/s' : ''));
}
