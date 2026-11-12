// The record quotes round 2's +-10 % sweeps and step sweeps without re-measuring on the current numbers.
// Re-measure: targets 1 (grass, straight fronts), 2 (wall wait, trial method on Hopkins 15's 4 walls),
// 3 (bare wall), 10 (0.5 m paving square, and a one-tile diagonal strip).
//   node r06-fragile.mjs <index 0..N | list>     one variant per process, so they can run in parallel
import {execFileSync} from 'node:child_process';
import {make, house, lawn, paving, outsideWalls, strikesOf, round, PITCH} from './lib.mjs';
import {bareWall} from '../wall.mjs';
const V = [['base', {}, {}]];
for (const [name, base] of [['rate', 4], ['loss', 2], ['maxHeat', 3], ['falloff', 1.5]]) for (const m of [.9, 1.1]) V.push([name + ' x' + m, {[name]: base * m}, {}]);
for (const m of [.9, 1.1]) V.push(['grass out x' + m, {}, {grass: {out: .7 * m}}], ['grass delay x' + m, {}, {grass: {delay: .18 * m}}], ['clapboard delay x' + m, {}, {clapboard: {delay: 4.5 * m}}], ['up,upDiag x' + m, {up: 3 * m, upDiagonal: 2 * m}, {}]);
for (const s of [60, 45, 40, 24, 20, 15]) V.push(['step 1/' + s, {step: 1 / s}, {}]);
const arg = process.argv[2] ?? 'list';
if (arg === 'list') { console.log(V.length); process.exit(0); }
const [name, rules, fuels] = V[+arg];
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
const litAt = (world, i, j) => world.tileAt(i, j, 0)?.fuels[0].litAt ?? null;
// 1: the author's two straight fronts (grass.mjs, copied measurement)
let axis, diagonal;
{ const world = make(rules, fuels); lawn(world, 0, 0, 101, 41); for (let j = 0; j < 41; j++) world.ignite(world.tileAt(0, j, 0)); run(world, 40); const a = litAt(world, 30, 20), b = litAt(world, 90, 20); axis = a && b ? 60 * PITCH / (b - a) : null; }
{ const world = make(rules, fuels); lawn(world, 0, 0, 121, 121); for (let i = 0; i <= 60; i++) world.ignite(world.tileAt(i, 60 - i, 0)); run(world, 40); const a = litAt(world, 45, 45), b = litAt(world, 85, 85); diagonal = a && b ? Math.hypot(40, 40) * PITCH / (b - a) : null; }
const ok1 = [axis, diagonal].every(v => v !== null && Math.abs(v - 1.5) <= .105);
// 2
const waits = [];
for (const at of strikesOf('hopkins-4-15').filter(s => s.startsWith('wall') && !s.endsWith(':in'))) {
  const world = make(rules, fuels), a = house(world, 'A', 'hopkins-4-15', 8, 8, {}), [, side, ci, cj] = at.split(':');
  lawn(world, 0, 0, Math.round((16 + a.plan.width) / PITCH), Math.round((16 + a.plan.depth) / PITCH));
  const wall = outsideWalls(world, a).find(w => w.side === side && w.tile.i === a.origin[0] + +ci && w.tile.j === a.origin[1] + +cj);
  const n = side[0] === 'x' ? [side[1] === '+' ? 1 : -1, 0] : [0, side[1] === '+' ? 1 : -1];
  world.ignite(world.tileAt(wall.outside.i + 6 * n[0], wall.outside.j + 6 * n[1], 0));
  run(world, 15);
  waits.push(wall.fuel.litAt !== null && wall.outside.fuels[0].litAt !== null ? wall.fuel.litAt - wall.outside.fuels[0].litAt : Infinity);
}
// 3
const w = bareWall(rules, fuels);
// 10
const crossed = (build, far) => { const world = make(rules, fuels); build(world); world.ignite(world.tileAt(2, 10, 0)); run(world, 40); return world.events.find(e => e.type === 'lit' && far(e.at))?.time ?? null; };
const straight = crossed(world => { lawn(world, 0, 0, 20, 21); paving(world, 20, 0, 21, 21); lawn(world, 21, 0, 41, 21); }, at => at[0] >= 21);
const diag = n => crossed(world => { for (let j = 0; j < 41; j++) for (let i = 0; i < 41; i++) { const t = world.addTile(i, j, 0); if (i + j < 40 || i + j >= 40 + n) world.addFuel(t, 'grass', 1); } }, at => at[0] + at[1] >= 40 + n);
const d1 = diag(1), d2 = diag(2);
console.log(name.padEnd(22) + ' | T1 axis ' + round(axis, 3) + ' diag ' + round(diagonal, 3) + (ok1 ? ' ok ' : ' OUT') + ' | T2 wait ' + Math.min(...waits).toFixed(3) + '-' + Math.max(...waits).toFixed(3) + (Math.max(...waits) < 2 ? ' ok ' : ' OUT')
  + ' | T3 ' + round(w.ratio, 2) + (w.ratio >= 2.5 && w.ratio <= 3.5 ? ' ok ' : ' OUT') + ' | T10 square ' + (straight === null ? 'holds' : 'CROSSED ' + round(straight)) + ', diag1 ' + (d1 === null ? 'holds' : 'CROSSED ' + round(d1)) + ', diag2 ' + (d2 === null ? 'holds' : 'CROSSED ' + round(d2)));
