// Target 2 as trial.mjs now measures it (every ground wall face grass touches, lawn lit from four sides, a face's
// wait is the longest of the four), reproduced, then broken down by kind of face and re-run with four more
// starts (the lawn's corners) and with rule or fuel overrides.
//   node reviewer-round-5/r05-target2.mjs ['<rules json>'] ['<fuels json>']
import {make, house, lawn, outsideWalls, PLANS, PITCH} from '../measure.mjs';
const rules = JSON.parse(process.argv[2] ?? '{}'), fuels = JSON.parse(process.argv[3] ?? '{}');
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
const EDGE = [[1, 0], [-1, 0], [0, 1], [0, -1]], CORNER = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const faces = new Map(); let skippedWallFirst = 0, skippedNever = 0, samples = 0;
for (const planId of PLANS) for (const [set, starts] of [['edge', EDGE], ['corner', CORNER]]) for (const [dx, dy] of starts) {
  const world = make(rules, fuels), a = house(world, 'A', planId, 8, 8, {}), W = Math.round((16 + a.plan.width) / PITCH), D = Math.round((16 + a.plan.depth) / PITCH);
  lawn(world, 0, 0, W, D);
  world.ignite(world.tileAt(dx > 0 ? W - 2 : dx < 0 ? 1 : W >> 1, dy > 0 ? D - 2 : dy < 0 ? 1 : D >> 1, 0));
  run(world, 40);
  const walls = outsideWalls(world, a), perOutside = new Map();
  for (const w of walls) perOutside.set(w.outside, (perOutside.get(w.outside) ?? 0) + 1);
  const deck = new Set(a.porch.filter(p => p.k === 0));
  for (const w of walls) {
    const grass = w.outside.fuels.find(f => f.cls === 'grass'), id = planId + ':' + w.tile.id + w.side;
    if (!faces.has(id)) {
      let nearDeck = false; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (deck.has(world.tileAt(w.outside.i + di, w.outside.j + dj, 0))) nearDeck = true;
      faces.set(id, {planId, kind: !grass ? 'behind porch' : w.fuel.cls === 'door' ? 'front door' : nearDeck ? 'beside a porch deck' : perOutside.get(w.outside) > 1 ? 'inner corner' : 'plain', edge: null, all: null});
    }
    if (!grass) continue;
    samples++;
    if (w.fuel.litAt === null || grass.litAt === null) { skippedNever++; continue; }
    if (grass.litAt > w.fuel.litAt) { skippedWallFirst++; continue; }
    const f = faces.get(id), wait = w.fuel.litAt - grass.litAt;
    if (set === 'edge') f.edge = Math.max(f.edge ?? 0, wait);
    f.all = Math.max(f.all ?? 0, wait);
  }
}
const list = [...faces.values()], touched = list.filter(f => f.kind !== 'behind porch');
const show = (name, l, key) => { const v = l.map(f => f[key]).filter(x => x !== null); console.log('  ' + name.padEnd(22) + String(l.length).padStart(4) + ' faces, ' + v.length + ' timed: ' + (v.length ? Math.min(...v).toFixed(3) + ' to ' + Math.max(...v).toFixed(3) + ' s; over 1.9 s: ' + v.filter(x => x > 1.9).length + '; at 2 s or more: ' + v.filter(x => x >= 2 - 1e-9).length : '')); };
console.log('rules ' + JSON.stringify(rules) + ' fuels ' + JSON.stringify(fuels));
console.log('faces: ' + list.length + ' ground wall faces, ' + touched.length + ' touched by grass, ' + (list.length - touched.length) + ' behind a porch deck');
console.log('samples (face x start, eight starts): ' + samples + '; left out because the wall lit before its grass: ' + skippedWallFirst + '; because wall or grass never lit in 40 s: ' + skippedNever);
console.log('four starts at the middle of each lawn edge (the trial\'s):');
show('all', touched, 'edge'); for (const kind of ['plain', 'inner corner', 'beside a porch deck', 'front door']) show(kind, touched.filter(f => f.kind === kind), 'edge');
console.log('eight starts (four more at the lawn\'s corners):');
show('all', touched, 'all'); for (const kind of ['plain', 'inner corner', 'beside a porch deck', 'front door']) show(kind, touched.filter(f => f.kind === kind), 'all');
