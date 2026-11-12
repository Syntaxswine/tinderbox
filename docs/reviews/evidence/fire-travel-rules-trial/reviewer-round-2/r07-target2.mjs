// Round 2. Target 2: a lawn fire reaches a clapboard wall and lights it in under 2 s.
// The author times the one wall tile at the middle of the longest run of each side, on three plans, at 1/30 s.
// Here: every ground-layer wall tile of every side of all six plans, and three steps.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r07-target2.mjs <all|step|numbers>
import {make, house, lawn, outsideWalls, strikesOf, round, PLANS, PITCH} from './measure-var.mjs';
const part = process.argv[2];
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
// One lawn fire lit 3 m out from the middle of a side (as the author does); every wall tile on the ground layer timed.
function side(planId, at, rules = {}, fuels = {}) {
  const world = make(rules, fuels), a = house(world, 'A', planId, 8, 8, {}), [, s, ci, cj] = at.split(':');
  lawn(world, 0, 0, Math.round((16 + a.plan.width) / PITCH), Math.round((16 + a.plan.depth) / PITCH));
  const walls = outsideWalls(world, a), wall = walls.find(w => w.side === s && w.tile.i === a.origin[0] + +ci && w.tile.j === a.origin[1] + +cj);
  const n = s[0] === 'x' ? [s[1] === '+' ? 1 : -1, 0] : [0, s[1] === '+' ? 1 : -1];
  world.ignite(world.tileAt(wall.outside.i + 6 * n[0], wall.outside.j + 6 * n[1], 0));
  run(world, 25);
  const wait = w => w.fuel.litAt !== null && w.outside.fuels[0]?.litAt != null ? w.fuel.litAt - w.outside.fuels[0].litAt : null;
  return {author: wait(wall), all: walls.map(w => ({wait: wait(w), grassLit: w.outside.fuels[0]?.litAt ?? null, wallLit: w.fuel.litAt, fromOutside: !!(w.fuel.near && !w.fuel.near.building)}))};
}
if (part === 'all') {
  let total = 0, over = 0, never = 0, worst = 0; const authorWaits = [];
  for (const planId of PLANS) {
    const waits = [], list = strikesOf(planId).filter(s => s.startsWith('wall') && !s.endsWith(':in'));
    // one fire per plan is enough to reach every wall: use the first side's fire, and also record the author's tile on each side
    for (const at of list) authorWaits.push(side(planId, at).author);
    const r = side(planId, list[0]);
    for (const w of r.all) { total++; if (w.wait === null) never++; else { waits.push(w.wait); if (w.wait >= 2 - 1e-9) over++; worst = Math.max(worst, w.wait); } }
    const s = waits.sort((p, q) => p - q);
    console.log(planId.padEnd(15), 'ground-layer wall tiles', r.all.length, '| lit after their own grass:', waits.length, '| wait min', round(s[0], 3), 'median', round(s[Math.floor(s.length / 2)], 3), 'max', round(s.at(-1), 3), '| at 2.000 s or more:', waits.filter(w => w >= 2 - 1e-9).length, '| over 2.5 s:', waits.filter(w => w > 2.5).length, '| wall never lit or lit before its grass:', r.all.filter(w => w.wait === null || w.wait < 0).length, '| lit from inside:', r.all.filter(w => w.wallLit !== null && !w.fromOutside).length);
  }
  console.log('author\'s 24 tiles on six plans (the trial used 12 on three): ' + round(Math.min(...authorWaits), 3) + ' to ' + round(Math.max(...authorWaits), 3) + ' s; at 2.000 s or more: ' + authorWaits.filter(w => w >= 2 - 1e-9).length + ' of ' + authorWaits.length);
  console.log('all tiles: ' + total + '; at 2.000 s or more: ' + over + '; never: ' + never + '; worst ' + round(worst, 3) + ' s');
}
if (part === 'step') {
  for (const step of [1 / 120, 1 / 60, 1 / 30, 1 / 20, 1 / 15]) {
    const waits = [];
    for (const planId of ['hopkins-4-15', 'hopkins-4-12', 'ashland-worker']) for (const at of strikesOf(planId).filter(s => s.startsWith('wall') && !s.endsWith(':in'))) waits.push(side(planId, at, {step}).author);
    console.log('step 1/' + Math.round(1 / step) + ' s, the author\'s 12 walls: ' + Math.min(...waits).toFixed(3) + ' to ' + Math.max(...waits).toFixed(3) + ' s; under 2 s: ' + waits.filter(w => w < 2).length + ' of 12');
  }
}
if (part === 'numbers') {
  for (const [name, rules, fuels] of [['as tuned', {}, {}], ['maxHeat 2.9', {maxHeat: 2.9}, {}], ['maxHeat 2.95', {maxHeat: 2.95}, {}], ['maxHeat 3.1', {maxHeat: 3.1}, {}], ['maxHeat 3.3', {maxHeat: 3.3}, {}], ['maxHeat 2.7', {maxHeat: 2.7}, {}], ['loss 2.2', {loss: 2.2}, {}], ['loss 1.8', {loss: 1.8}, {}],
    ['clapboard delay 5.1', {}, {clapboard: {delay: 5.1}}], ['clapboard delay 5.5', {}, {clapboard: {delay: 5.5}}], ['clapboard delay 4.5', {}, {clapboard: {delay: 4.5}}], ['grass out 0.63', {}, {grass: {out: .63}}], ['grass burns 2.7 s', {}, {grass: {burnFor: 2.7}}], ['rate 3.6', {rate: 3.6}, {}]]) {
    const waits = [];
    for (const at of strikesOf('hopkins-4-15').filter(s => s.startsWith('wall') && !s.endsWith(':in'))) waits.push(side('hopkins-4-15', at, rules, fuels).author);
    console.log(name.padEnd(22), 'Hopkins 15, four sides: ' + waits.map(w => w === null ? 'never' : w.toFixed(3)).join(', ') + ' s; under 2 s: ' + waits.filter(w => w !== null && w < 2).length + ' of 4');
  }
}
