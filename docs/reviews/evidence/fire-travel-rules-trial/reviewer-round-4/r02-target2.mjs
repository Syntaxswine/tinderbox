// Round 4. Target 2 ("a lawn fire lights a wall in under 2 s, 1.27 to 1.90 s on 24 walls").
// (a) the trial's own 24 walls, with what the tile outside each holds; (b) every ground outside-wall tile
// of the six plans, lawn all round, lit from each of the four sides in turn.
import {make, house, lawn, outsideWalls, strikesOf, PLANS, PITCH} from '../measure.mjs';
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
console.log('(a) the trial\'s 24 walls, same code as trial.mjs section 2');
for (const planId of PLANS) for (const at of strikesOf(planId).filter(s => s.startsWith('wall') && !s.endsWith(':in'))) {
  const world = make(), a = house(world, 'A', planId, 8, 8, {}), [, side, ci, cj] = at.split(':');
  lawn(world, 0, 0, Math.round((16 + a.plan.width) / PITCH), Math.round((16 + a.plan.depth) / PITCH));
  const wall = outsideWalls(world, a).find(w => w.side === side && w.tile.i === a.origin[0] + +ci && w.tile.j === a.origin[1] + +cj);
  const n = side[0] === 'x' ? [side[1] === '+' ? 1 : -1, 0] : [0, side[1] === '+' ? 1 : -1];
  const lit = world.tileAt(wall.outside.i + 6 * n[0], wall.outside.j + 6 * n[1], 0);
  world.ignite(lit);
  run(world, 15);
  const o = wall.outside.fuels[0];
  console.log('  ' + planId.padEnd(15) + at.padEnd(16) + ' struck fuel ' + wall.fuel.cls.padEnd(9) + ' outside tile fuels[0] = ' + o.cls.padEnd(6) + ' lit at ' + o.litAt?.toFixed(3) + '; wall lit at ' + wall.fuel.litAt?.toFixed(3) + '; wait ' + (wall.fuel.litAt - o.litAt).toFixed(3) + ' s');
}
console.log('(b) every ground outside-wall face, lawn all round, four ignitions (one per side, separate runs); wait = wall lit - grass in the outside tile lit');
let all = [], porchFaced = 0, total = 0, neverLit = 0;
for (const planId of PLANS) {
  const waits = new Map();
  for (const corner of [[2, 2], [-3, 2], [2, -3], [-3, -3]]) {
    const world = make(), a = house(world, 'A', planId, 8, 8, {});
    const I = Math.round((16 + a.plan.width) / PITCH), J = Math.round((16 + a.plan.depth) / PITCH);
    lawn(world, 0, 0, I, J);
    world.ignite(world.tileAt(corner[0] < 0 ? I + corner[0] : corner[0], corner[1] < 0 ? J + corner[1] : corner[1], 0));
    run(world, 25);
    for (const w of outsideWalls(world, a)) {
      const id = w.tile.i + ':' + w.tile.j + ':' + w.side, g = w.outside.fuels[0];
      if (!g || g.cls !== 'grass') { waits.set(id, 'porch'); continue; }
      const wait = w.fuel.litAt !== null && g.litAt !== null ? w.fuel.litAt - g.litAt : Infinity;
      const prev = waits.get(id);
      if (!prev) waits.set(id, {min: wait, max: wait, cls: w.fuel.cls}); else { prev.min = Math.min(prev.min, wait); prev.max = Math.max(prev.max, wait); }
    }
  }
  const list = [...waits.values()].filter(v => v !== 'porch');
  const p = [...waits.values()].filter(v => v === 'porch').length;
  total += waits.size; porchFaced += p; all.push(...list);
  console.log('  ' + planId.padEnd(15) + waits.size + ' ground wall faces, ' + p + ' face the porch deck (no grass touches them); of the other ' + list.length + ': shortest wait ' + Math.min(...list.map(v => v.min)).toFixed(3) + ', longest ' + Math.max(...list.map(v => v.max)).toFixed(3) + ' s; faces with any wait >= 2 s: ' + list.filter(v => v.max >= 2).length + '; never lit in 25 s on some run: ' + list.filter(v => !Number.isFinite(v.max)).length
    + '; negative (wall lit before its grass): ' + list.filter(v => v.min < 0).length);
}
const fin = all.filter(v => Number.isFinite(v.max));
console.log('  ALL: ' + total + ' faces, ' + porchFaced + ' behind a porch; ' + all.length + ' touched by grass: wait ' + Math.min(...all.map(v => v.min)).toFixed(3) + ' to ' + Math.max(...fin.map(v => v.max)).toFixed(3) + ' s; >= 2 s on ' + all.filter(v => v.max >= 2).length + '; > 1.9 s on ' + all.filter(v => v.max > 1.9).length + '; never lit ' + all.filter(v => !Number.isFinite(v.max)).length);
const hist = {}; for (const v of fin) { const b = v.max.toFixed(1); hist[b] = (hist[b] ?? 0) + 1; }
console.log('  histogram of the longest wait per face (0.1 s bins): ' + JSON.stringify(Object.fromEntries(Object.entries(hist).sort((x, y) => x[0] - y[0]))));
