// Runs the proposed fire-travel rules in the trial kernel against the targets in
// docs/reviews/2026-11-11-fire-travel-rules.md. Evidence only; nothing here touches the game.
//   1. node docs/reviews/evidence/fire-travel-rules-trial/survey.mjs <plan>     (once per plan, six plans; a few minutes each)
//   2. node docs/reviews/evidence/fire-travel-rules-trial/trial.mjs             (about ten minutes; reads the surveys)
// Second version, after review round 1: targets 4 to 8 are counted over every plan and strike, not one;
// grass is timed on steady fronts; the neighbour is lit from a house struck on its far side; cost is given
// as mean, 95th centile and worst step.
import fs from 'node:fs';
import path from 'node:path';
import {DEFAULT_FUELS, DEFAULT_RULES} from './kernel.mjs';
import {make, burn, house, lawn, paving, outsideWalls, strikesOf, round, quantile, PLANS, ALL, PITCH, LAYER} from './measure.mjs';
import {grass} from './grass.mjs';
import {pair} from './pair.mjs';
import {bareWall} from './wall.mjs';

const dir = path.join(import.meta.dirname, 'results'), lines = [], results = {};
const say = text => { lines.push(text); console.log(text); };
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
const range = list => list.length ? round(Math.min(...list)) + ' to ' + round(Math.max(...list)) : 'none';
const report = (n, verdict, text) => { results[n] = {verdict, text}; say(String(n).padStart(2) + '  ' + verdict.padEnd(8) + text); };

// 1. Grass.
{
  const g = grass(), all = [g.axis, g.diagonal, g.point.min, g.point.max], ok = all.every(v => Math.abs(v - 1.5) <= .105);
  report(1, ok ? 'MET' : 'MISSED', 'grass front: straight ' + round(g.axis, 3) + ' m/s along the grid, ' + round(g.diagonal, 3) + ' on its diagonal; from one tile, 32 directions timed from 6 m to 24 m out, '
    + round(g.point.min, 3) + ' to ' + round(g.point.max, 3) + ' (mean ' + round(g.point.mean, 3) + ')   [target: every one within 7 % of 1.5, that is 1.395 to 1.605]');
}
// 2. A lawn fire lights the wall it reaches: three plans, four sides each.
{
  const waits = [];
  for (const planId of ['hopkins-4-15', 'hopkins-4-12', 'ashland-worker']) for (const at of strikesOf(planId).filter(s => s.startsWith('wall') && !s.endsWith(':in'))) {
    const world = make(), a = house(world, 'A', planId, 8, 8, {}), [, side, ci, cj] = at.split(':');
    lawn(world, 0, 0, Math.round((16 + a.plan.width) / PITCH), Math.round((16 + a.plan.depth) / PITCH));
    const wall = outsideWalls(world, a).find(w => w.side === side && w.tile.i === a.origin[0] + +ci && w.tile.j === a.origin[1] + +cj);
    const n = side[0] === 'x' ? [side[1] === '+' ? 1 : -1, 0] : [0, side[1] === '+' ? 1 : -1];
    world.ignite(world.tileAt(wall.outside.i + 6 * n[0], wall.outside.j + 6 * n[1], 0));
    run(world, 15);
    waits.push(wall.fuel.litAt !== null && wall.outside.fuels[0].litAt !== null ? wall.fuel.litAt - wall.outside.fuels[0].litAt : Infinity);
  }
  report(2, waits.every(w => w < 2) ? (Math.max(...waits) > 1.9 ? 'EDGE' : 'MET') : 'MISSED', 'a wall lights ' + Math.min(...waits).toFixed(3) + ' to ' + Math.max(...waits).toFixed(3) + ' s after the grass against it, on ' + waits.length + ' walls of three plans   [target: under 2 s]');
}
// 3. Up a wall against along it, on a free-standing wall with no floors or partitions.
{
  const {up, along, ratio} = bareWall();
  report(3, ratio >= 2.5 && ratio <= 3.5 ? 'MET' : 'MISSED', 'bare wall, match at its foot: ' + round(up) + ' m/s up, ' + round(along) + ' m/s along, ' + round(ratio, 2) + ' to 1   [target: 2.5 to 3.5 to 1]');
}
// 4 to 8: the survey.
{
  const rows = PLANS.flatMap(planId => { const file = path.join(dir, 'survey-' + planId + '.json'); return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []; });
  const plansRead = new Set(rows.map(r => r.plan)).size;
  const count = (list, test) => list.filter(test).length + ' of ' + list.length;
  const verdict = (list, test) => !list.length ? 'NO DATA' : list.every(test) ? 'MET' : list.filter(test).length >= list.length / 2 ? 'PARTLY' : 'MISSED';
  const walls = rows.filter(r => r.kind === 'wall'), wallsIn = rows.filter(r => r.kind === 'wall-in'), rooms = rows.filter(r => r.kind === 'room'), up = rows.filter(r => r.floor > 0), num = (list, f) => list.map(f).filter(v => v !== null);
  say('    survey: ' + rows.length + ' strikes on ' + plansRead + ' plans (' + walls.length + ' outside walls with the match held outside, the same ' + wallsIn.length + ' with it held inside; ' + rooms.length + ' rooms, furniture lit)');
  const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20;
  report(4, verdict(walls, t4), 'room behind the match fully alight: ' + count(walls, t4) + ' wall strikes in range; ' + range(num(walls, r => r.room)) + ' s, median ' + round(quantile(num(walls, r => r.room), .5))
    + '. Match held inside the same walls: ' + count(wallsIn, t4) + ', ' + range(num(wallsIn, r => r.room)) + ' s, median ' + round(quantile(num(wallsIn, r => r.room), .5)) + '. Room strikes, for information: ' + range(num(rooms, r => r.room)) + ' s, median ' + round(quantile(num(rooms, r => r.room), .5)) + '   [target: 10 to 20 s]');
  const t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
  report(5, verdict(rows, t5), 'half the house alight: ' + count(rows, t5) + ' strikes in range (' + count(walls, t5) + ' wall outside, ' + count(wallsIn, t5) + ' wall inside, ' + count(rooms.filter(r => !r.floor), t5) + ' ground rooms, ' + count(up, t5) + ' upstairs rooms); '
    + range(num(rows, r => r.half)) + ' s, median ' + round(quantile(num(rows, r => r.half), .5)) + '   [target: 40 to 70 s]');
  const t6 = r => r.flameUntil >= 90;
  report(6, verdict(rows, t6), 'flame in the house: ' + count(rows, t6) + ' strikes at 90 s or more; ' + range(num(rows, r => r.flameUntil)) + ' s   [target: 90 s or more]');
  const t7 = r => r.firstFall !== null && r.firstFall >= 60 && r.firstFall <= 150;
  report(7, verdict(rows, t7), 'first upper floor or roof part falls: ' + count(rows, t7) + ' in range; ' + range(num(rows, r => r.firstFall)) + ' s. This is the burn time of frame and roof timber (68 s) plus the time to light it   [target: 60 to 150 s]');
  const before = r => r.groundLit !== null && (r.fallToGround === null || r.groundLit < r.fallToGround), within = r => r.groundLit !== null && r.fallToGround !== null && r.groundLit >= r.fallToGround && r.groundLit - r.fallToGround <= 5;
  const lags = up.filter(r => r.groundLit !== null && r.fallToGround !== null).map(r => r.groundLit - r.fallToGround);
  report(8, verdict(up, within), 'upstairs fires: ground floor lit before anything fell to it in ' + count(up, before) + '; lit within 5 s of the first fall in ' + count(up, within) + '; lag ' + range(lags) + ' s   [target: only after a fall, then within 5 s]');
  results.survey = {strikes: rows.length, neverLitMax: Math.max(...rows.map(r => r.neverLit)), ledgerWorst: Math.max(...rows.map(r => Math.abs(r.ledger))), embersShare: range(rows.map(r => 100 * r.embersShare))};
}
// 9. Kitchen against dining room, Hopkins 15, all contents.
{
  const wreck = r => { const classes = {}; for (const tile of r.world.active) for (const fuel of tile.fuels) if (fuel.lit) classes[fuel.cls] = (classes[fuel.cls] ?? 0) + 1; return JSON.stringify(classes); };
  const k = burn({at: 'room:0:kitchen', seconds: 300}), d = burn({at: 'room:0:dining', seconds: 300});
  const burstAt = r => r.world.events.filter(e => e.type === 'burst').map(e => round(e.time, 1)).join(', ');
  report(9, Math.abs(k.half - d.half) >= 5 ? 'MET' : 'WEAK', (k.half > d.half ? 'the kitchen fire takes the house more SLOWLY. ' : '') + 'kitchen fire: room alight ' + round(k.roomAll) + ' s, half the house ' + round(k.half) + ' s, oil bursts at ' + burstAt(k) + ' s; dining-room fire: ' + round(d.roomAll) + ' s, ' + round(d.half) + ' s, oil at ' + burstAt(d)
    + ' s. Burning at 300 s: ' + wreck(k) + ' against ' + wreck(d) + '   [target: a stated difference; the trial\'s own mark is 5 s on half alight]');
}
// 10. Paving.
{
  const crossed = (build, far) => { const world = make(); build(world); world.ignite(world.tileAt(2, 10, 0)); run(world, 40); return world.events.find(e => e.type === 'lit' && far(e.at))?.time ?? null; };
  const straight = crossed(world => { lawn(world, 0, 0, 20, 21); paving(world, 20, 0, 21, 21); lawn(world, 21, 0, 41, 21); }, at => at[0] >= 21);
  const diagonal = n => crossed(world => { for (let j = 0; j < 41; j++) for (let i = 0; i < 41; i++) { const t = world.addTile(i, j, 0); if (i + j < 40 || i + j >= 40 + n) world.addFuel(t, 'grass', 1); } }, at => at[0] + at[1] >= 40 + n);
  const d1 = diagonal(1), d2 = diagonal(2);
  report(10, straight === null ? 'MET' : 'MISSED', 'lawn fire and 0.5 m of paving square to the grid: ' + (straight === null ? 'does not cross' : 'crosses at ' + round(straight) + ' s') + '. A diagonal strip one tile wide (0.35 m across): '
    + (d1 === null ? 'does not cross' : 'CROSSES at ' + round(d1) + ' s') + '; two tiles wide (0.71 m): ' + (d2 === null ? 'does not cross' : 'CROSSES at ' + round(d2) + ' s') + '   [target: does not cross 0.5 m]');
}
// 11, 12. The house next door.
{
  const table = [];
  for (const gap of [1, 2, 2.5, 3, 5, 8]) table.push(pair(gap, 'bare', 'wall:x-:0:10'));
  table.push(pair(2, 'bare', 'room:0:kitchen'));
  for (const gap of [3, 8]) table.push(pair(gap, 'lawn', 'wall:x-:0:10'));
  for (const p of table) say('    gap ' + String(p.gap).padEnd(4) + p.ground.padEnd(5) + ' strike ' + p.at.padEnd(15) + ' neighbour ' + (p.neighbourLit === null ? 'never (200 s)' : 'lit at ' + round(p.neighbourLit) + ' s, ' + round(p.afterFacing) + ' s after A\'s facing wall first burnt')
    + '; A half alight at ' + round(p.half) + ' s' + (p.grassLit !== null ? '; grass lit at ' + round(p.grassLit) + ' s' : ''));
  const two = table.filter(p => p.gap === 2 && p.ground === 'bare'), eight = table.find(p => p.gap === 8 && p.ground === 'bare'), lawn8 = table.find(p => p.gap === 8 && p.ground === 'lawn');
  report(11, two.every(p => p.afterFacing !== null && p.afterFacing <= 30) ? 'MET' : 'MISSED', 'bare ground, 2 m: the neighbour lights ' + two.map(p => round(p.afterFacing)).join(' and ') + ' s after the facing wall of the burning house first burns (match on its far wall, and in its kitchen). At 2.5 m and wider it never does   [target: yes, within 30 s]');
  report(12, eight.neighbourLit === null ? (lawn8.neighbourLit === null ? 'MET' : 'PARTLY') : 'MISSED', '8 m: on bare ground ' + (eight.neighbourLit === null ? 'never' : 'lit at ' + round(eight.neighbourLit) + ' s') + '; with lawn between, ' + (lawn8.neighbourLit === null ? 'never' : 'lit at ' + round(lawn8.neighbourLit) + ' s, carried by the grass') + '   [target: no]');
  results.pairs = table;
}
report(13, 'UNTESTED', 'a lantern is never a dud: the scene has no stone plinth and the kernel has no lantern');
// 14. Ledger and time step.
{
  const at = 'wall:x+:19:4', base = burn({at, seconds: 150}), fine = burn({at, seconds: 150, rules: {step: 1 / 60}}), coarse = burn({at, seconds: 150, rules: {step: 1 / 15}});
  const s = results.survey;
  report(14, s.ledgerWorst < 1e-6 ? 'PARTLY' : 'MISSED', 'fuel laid - burnt - left: worst ' + s.ledgerWorst.toExponential(0) + ' over ' + s.strikes + ' burns; no fuel is created (embers are the last ' + s.embersShare + ' % of what was laid, falling). "Same state under five frame schedules" is not tested: the kernel has one fixed step. '
    + 'The step matters: at 1/60, 1/30 and 1/15 s a match outside the sitting-room wall of Hopkins 15 gives room alight ' + [fine, base, coarse].map(r => round(r.roomAll)).join(', ') + ' s and half the house ' + [fine, base, coarse].map(r => round(r.half)).join(', ') + ' s   [target: same state under five frame schedules; ledger closes]');
}
// 15. Cost.
{
  const one = burn({seconds: 150, timed: true}), width = one.a.plan.width;
  const three = burn({seconds: 150, timed: true, at: 'room:0:hall', neighbours: [['B', 6 + width + 2, 6], ['C', 6, 6 + one.a.plan.depth + 2]], before: world => lawn(world, 0, 0, 70, 70)});
  const show = r => round(r.cost.mean, 1) + ' ms mean, ' + round(r.cost.p95, 1) + ' ms 95th centile, ' + round(r.cost.max, 1) + ' ms worst, ' + r.peakActive + ' tiles active at peak';
  report(15, 'MISSED', 'cost per step of 1/30 s over 150 s (one step covers two of today\'s 1/60 s frames): one house ' + show(one) + '; three houses on a lawn, all burning, ' + show(three) + '. Today\'s game: 3 to 5 ms per 1/60 s frame   [target: no more than today\'s]');
}
say('rules: ' + JSON.stringify(DEFAULT_RULES));
say('fuels: ' + JSON.stringify(DEFAULT_FUELS));
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'trial.txt'), lines.join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'trial.json'), JSON.stringify({rules: DEFAULT_RULES, fuels: DEFAULT_FUELS, results}, null, 1) + '\n');
