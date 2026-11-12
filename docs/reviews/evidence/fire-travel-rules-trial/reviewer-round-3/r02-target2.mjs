// Target 2 on every ground-layer outside wall tile of six plans (the trial does 24 mid-wall tiles).
// The whole lawn is lit from one tile 6 tiles off one corner region; every wall's wait is its own
// lighting time minus the lighting time of the grass tile against it.
//   node r02-target2.mjs [rules json] [fuels json]
import {make, house, lawn, outsideWalls, strikesOf, PLANS, PITCH} from './lib.mjs';
const rules = JSON.parse(process.argv[2] ?? '{}'), fuels = JSON.parse(process.argv[3] ?? '{}');
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
let all = [], control = [];
for (const planId of PLANS) {
  // control: the trial's own method on its own 4 walls
  for (const at of strikesOf(planId).filter(s => s.startsWith('wall') && !s.endsWith(':in'))) {
    const world = make(rules, fuels), a = house(world, 'A', planId, 8, 8, {}), [, side, ci, cj] = at.split(':');
    lawn(world, 0, 0, Math.round((16 + a.plan.width) / PITCH), Math.round((16 + a.plan.depth) / PITCH));
    const wall = outsideWalls(world, a).find(w => w.side === side && w.tile.i === a.origin[0] + +ci && w.tile.j === a.origin[1] + +cj);
    const n = side[0] === 'x' ? [side[1] === '+' ? 1 : -1, 0] : [0, side[1] === '+' ? 1 : -1];
    world.ignite(world.tileAt(wall.outside.i + 6 * n[0], wall.outside.j + 6 * n[1], 0));
    run(world, 15);
    control.push(wall.fuel.litAt - wall.outside.fuels[0].litAt);
  }
  // every wall tile, lawn lit at four different places
  for (const [sx, sy] of [[2, 2], [2, 60], [60, 2], [30, 1]]) {
    const world = make(rules, fuels), a = house(world, 'A', planId, 8, 8, {});
    lawn(world, 0, 0, Math.round((16 + a.plan.width) / PITCH), Math.round((16 + a.plan.depth) / PITCH));
    const start = world.tileAt(sx, Math.min(sy, Math.round((16 + a.plan.depth) / PITCH) - 2), 0) ?? world.tileAt(2, 2, 0);
    world.ignite(start);
    run(world, 40);
    for (const w of outsideWalls(world, a)) {
      const g = w.outside.fuels.find(f => f.cls === 'grass');
      all.push({planId, start: sx + ',' + sy, wait: w.fuel.litAt !== null && g?.litAt != null ? w.fuel.litAt - g.litAt : Infinity, neverGrass: !g || g.litAt === null});
    }
  }
}
const fin = all.filter(x => Number.isFinite(x.wait)).map(x => x.wait);
console.log(JSON.stringify(rules), JSON.stringify(fuels));
console.log('control (trial method, 24 walls): ' + Math.min(...control).toFixed(3) + ' to ' + Math.max(...control).toFixed(3) + ' s');
console.log('every wall tile x 4 lawn starts: n=' + all.length + ', wall never lit ' + all.filter(x => !Number.isFinite(x.wait)).length + ' (grass against it never lit: ' + all.filter(x => x.neverGrass).length + '), wait ' + Math.min(...fin).toFixed(3) + ' to ' + Math.max(...fin).toFixed(3) + ' s, at 2 s or more: ' + fin.filter(w => w >= 2).length
  + ', negative (wall lit before its own grass): ' + fin.filter(w => w < 0).length);
const hist = {}; for (const w of fin) { const b = w.toFixed(2); hist[b] = (hist[b] ?? 0) + 1; }
console.log('histogram', JSON.stringify(Object.fromEntries(Object.entries(hist).sort((a, b) => +a[0] - +b[0]))));
