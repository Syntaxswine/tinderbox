// Runs the proposed fire-travel rules in the trial kernel against the targets in
// docs/reviews/2026-11-11-fire-travel-rules.md. Evidence only; nothing here touches the game.
//   1. node docs/reviews/evidence/fire-travel-rules-trial/survey.mjs <plan>     (once per plan, six plans; a few minutes each)
//   2. node docs/reviews/evidence/fire-travel-rules-trial/trial.mjs             (about five minutes; reads the surveys)
// Second version, after review round 1: targets 4 to 8 are counted over every plan and strike, not one;
// grass is timed on steady fronts; the neighbour is lit from a house struck on its far side; cost is given
// as mean, 95th centile and worst step.
import fs from 'node:fs';
import path from 'node:path';
import {DEFAULT_FUELS, DEFAULT_RULES} from './kernel.mjs';
import {make, burn, house, lawn, paving, outsideWalls, strikesOf, round, median, PLANS, ALL, PITCH, LAYER} from './measure.mjs';
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
// 2. A lawn fire lights the wall it reaches. Every ground-layer outside wall face of the six plans that grass
// touches, with the lawn lit from each of four sides in turn; a face's wait is the longest of the four. Faces
// behind a porch deck have no grass against them and are counted apart (review round 4, M3).
{
  const waits = [], behind = [];
  for (const planId of PLANS) {
    const perFace = new Map();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const world = make(), a = house(world, 'A', planId, 8, 8, {}), W = Math.round((16 + a.plan.width) / PITCH), D = Math.round((16 + a.plan.depth) / PITCH);
      lawn(world, 0, 0, W, D);
      world.ignite(world.tileAt(dx > 0 ? W - 2 : dx < 0 ? 1 : W >> 1, dy > 0 ? D - 2 : dy < 0 ? 1 : D >> 1, 0));
      run(world, 40);
      for (const w of outsideWalls(world, a)) {
        const grass = w.outside.fuels.find(f => f.cls === 'grass'), id = w.tile.id + w.side;
        if (!grass) { perFace.set(id, null); continue; }
        if (w.fuel.litAt === null || grass.litAt === null || grass.litAt > w.fuel.litAt) continue;
        perFace.set(id, Math.max(perFace.get(id) ?? 0, w.fuel.litAt - grass.litAt));
      }
    }
    for (const v of perFace.values()) (v === null ? behind : waits).push(v);
  }
  report(2, waits.every(w => w < 2) ? (Math.max(...waits) > 1.9 ? 'EDGE' : 'MET') : 'MISSED', 'a wall lights ' + Math.min(...waits).toFixed(3) + ' to ' + Math.max(...waits).toFixed(3) + ' s after the grass against it, on the ' + waits.length + ' ground wall faces of six plans that grass touches; '
    + waits.filter(w => w >= 2).length + ' at 2 s or more, ' + waits.filter(w => w > 1.8999).length + ' at 1.9 s or more. ' + behind.length + ' more faces are behind a porch deck and no grass touches them. The wait is a constant of the numbers: clapboard delay x lighting point / (heat ceiling x (1 - loss x step)) = '
    + (DEFAULT_FUELS.clapboard.delay * DEFAULT_FUELS.clapboard.lightAt / (DEFAULT_RULES.maxHeat * (1 - DEFAULT_RULES.loss * DEFAULT_RULES.step))).toFixed(2) + ' s at the heat ceiling, longer where the wall sees less than the ceiling   [target: under 2 s]');
  // A bare path between lawn and wall, one tile wide.
  const world = make(), a = house(world, 'A', 'hopkins-4-12', 8, 8, {}), W = Math.round((16 + a.plan.width) / PITCH), D = Math.round((16 + a.plan.depth) / PITCH), ring = new Set();
  for (const w of outsideWalls(world, a)) ring.add(w.outside);
  for (const record of a.rooms.values()) for (const tile of record.tiles) if (tile.k === 0) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const o = world.tileAt(tile.i + di, tile.j + dj, 0); if (o && !o.building) ring.add(o); }
  for (const tile of ring) if (!tile.fuels.length) tile.keepBare = true;
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) { const tile = world.tileAt(i, j, 0) ?? world.addTile(i, j, 0); if (!tile.building && !tile.fuels.length && !tile.keepBare) world.addFuel(tile, 'grass', 1); }
  world.ignite(world.tileAt(1, D >> 1, 0));
  run(world, 60);
  const walls = outsideWalls(world, a).filter(w => !w.outside.fuels.length), lit = walls.filter(w => w.fuel.litAt !== null);
  say('    a bare path 0.5 m wide round Hopkins 12, lawn beyond it: ' + lit.length + ' of ' + walls.length + ' ground wall faces behind the path light within 60 s' + (lit.length ? ', the first at ' + round(Math.min(...lit.map(w => w.fuel.litAt))) + ' s' : ''));
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
  const climbs = walls.flatMap(r => r.climb ?? []), inBand = climbs.filter(v => v >= 2.5 && v <= 3.5).length, band = list => list.filter(v => v >= 2.5 && v <= 3.5).length + ' of ' + list.length;
  const porchClimbs = walls.filter(r => r.behindPorch).flatMap(r => r.climb ?? []), openClimbs = walls.filter(r => !r.behindPorch).flatMap(r => r.climb ?? []);
  say('    target 3 on the houses: ' + inBand + ' of ' + climbs.length + ' measurable directions on ' + walls.filter(r => r.climb?.length).length + ' outside walls in 2.5 to 3.5; ' + range(climbs) + ', median ' + round(median(climbs))
    + '. Walls behind a porch: ' + band(porchClimbs) + (porchClimbs.length ? ' (' + range(porchClimbs) + ')' : '') + '. Other walls: ' + band(openClimbs) + ' (' + range(openClimbs) + ')');
  say('    struck fuels: ' + walls.filter(r => r.struck === 'door').map(r => r.plan + ' ' + r.at + ' is the front door').join('; '));
  if (results[3].verdict === 'MET' && inBand < climbs.length) results[3].verdict = 'PARTLY';
  const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20;
  report(4, verdict(walls, t4), 'room behind the match fully alight: ' + count(walls, t4) + ' wall strikes in range; ' + range(num(walls, r => r.room)) + ' s, median ' + round(median(num(walls, r => r.room)))
    + '. Match held inside the same walls: ' + count(wallsIn, t4) + ', ' + range(num(wallsIn, r => r.room)) + ' s, median ' + round(median(num(wallsIn, r => r.room))) + '. Room strikes, for information: ' + range(num(rooms, r => r.room)) + ' s, median ' + round(median(num(rooms, r => r.room))) + '   [target: 10 to 20 s]');
  const t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
  report(5, verdict(rows, t5), 'half the house alight: ' + count(rows, t5) + ' strikes in range (' + count(walls, t5) + ' wall outside, ' + count(wallsIn, t5) + ' wall inside, ' + count(rooms.filter(r => !r.floor), t5) + ' ground rooms, ' + count(up, t5) + ' upstairs rooms); '
    + range(num(rows, r => r.half)) + ' s, median ' + round(median(num(rows, r => r.half))) + '   [target: 40 to 70 s]');
  const roof3 = PLANS.flatMap(planId => { const file = path.join(dir, 'roof-delay-3', 'survey-' + planId + '.json'); return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []; });
  if (roof3.length) say('    target 5 with roof delay 3 s in place of 8 s: ' + count(roof3, t5) + ' in range, median ' + round(median(num(roof3, r => r.half))) + ' s (' + count(roof3.filter(r => r.kind === 'wall'), t5) + ' wall outside, ' + count(roof3.filter(r => r.kind === 'wall-in'), t5) + ' wall inside)');
  for (const planId of PLANS) { const list = rows.filter(r => r.plan === planId); say('    target 5, ' + planId + ': ' + count(list, t5) + ', median ' + round(median(num(list, r => r.half))) + ' s'); }
  // The same 101 strikes with the house standing on a lawn, as the street's houses do (review round 6, M1).
  const lawnRows = PLANS.flatMap(planId => { const file = path.join(dir, 'lawn', 'survey-' + planId + '.json'); return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []; });
  if (lawnRows.length) {
    const lw = lawnRows.filter(r => r.kind === 'wall'), li = lawnRows.filter(r => r.kind === 'wall-in'), lr = lawnRows.filter(r => r.kind === 'room'), lu = lawnRows.filter(r => r.floor > 0);
    say('    ON A LAWN, target 4: ' + count(lw, t4) + ' outside-wall strikes in range, median ' + round(median(num(lw, r => r.room))) + ' s; inside ' + count(li, t4) + ', median ' + round(median(num(li, r => r.room))) + ' s');
    say('    ON A LAWN, target 5: ' + count(lawnRows, t5) + ' in range (' + count(lw, t5) + ' wall outside, ' + count(li, t5) + ' wall inside, ' + count(lr.filter(r => !r.floor), t5) + ' ground rooms, ' + count(lu, t5) + ' upstairs rooms); ' + range(num(lawnRows, r => r.half)) + ' s, median ' + round(median(num(lawnRows, r => r.half)))
      + '; under 40 s: ' + lawnRows.filter(r => r.half !== null && r.half < 40).length);
    say('    ON A LAWN, target 6: ' + count(lawnRows, r => r.flameUntil >= 90) + ' at 90 s or more, ' + range(num(lawnRows, r => r.flameUntil)) + ' s; target 7: ' + range(num(lawnRows, r => r.firstFall)) + ' s; target 8: ground storey lit before a fall in '
      + count(lu, r => r.groundLit !== null && (r.fallToGround === null || r.groundLit < r.fallToGround)) + ', within 5 s of the first fall in ' + count(lu, r => r.groundLit !== null && r.fallToGround !== null && r.groundLit >= r.fallToGround && r.groundLit - r.fallToGround <= 5));
    results.lawn = {target5: count(lawnRows, t5)};
  }
  const t6 = r => r.flameUntil >= 90;
  report(6, verdict(rows, t6), 'flame in the house: ' + count(rows, t6) + ' strikes at 90 s or more; ' + range(num(rows, r => r.flameUntil)) + ' s   [target: 90 s or more]');
  const t7 = r => r.firstFall !== null && r.firstFall >= 60 && r.firstFall <= 150;
  report(7, verdict(rows, t7), 'first upper floor or roof part falls: ' + count(rows, t7) + ' in range; ' + range(num(rows, r => r.firstFall)) + ' s. This is the burn time of frame and roof timber (68 s) plus the time to light it   [target: 60 to 150 s]');
  const before = r => r.groundLit !== null && (r.fallToGround === null || r.groundLit < r.fallToGround), within = r => r.groundLit !== null && r.fallToGround !== null && r.groundLit >= r.fallToGround && r.groundLit - r.fallToGround <= 5;
  const roofFirst = r => r.groundRoofLit !== null && (r.fallToGround === null || r.groundRoofLit < r.fallToGround);
  const lags = up.filter(r => r.groundLit !== null && r.fallToGround !== null).map(r => r.groundLit - r.fallToGround);
  report(8, verdict(up, r => within(r) && !roofFirst(r)), 'upstairs fires: something inside the ground storey lit before anything fell to it in ' + count(up, before) + '. A ROOF OVER A GROUND-STOREY ROOM (a low roof beside the upper storey) lit before anything fell in ' + count(up, roofFirst)
    + ', from the air above it. Ground storey lit within 5 s of the first fall in ' + count(up, within) + '; lag ' + range(lags) + ' s. What falls first is embers; reviews 4 to 6 found that with embers cut to 1 % only 4 of 21 are within 5 s   [target: only after a fall, then within 5 s]');
  const small = rows.filter(r => r.firstFallDrop === 1 && r.firstFallCarried === 0).length;
  say('    target 7: in ' + small + ' of ' + rows.length + ' strikes the first fall is embers of a spent roof or wall dropping one half-storey, carrying nothing');
  results.survey = {strikes: rows.length, neverLitMax: Math.max(...rows.map(r => r.neverLit)), ledgerWorst: Math.max(...rows.map(r => Math.abs(r.ledger))), embersShare: range(rows.map(r => 100 * r.embersShare))};
}
// 9. Stores. The same kitchen fire with and without the oil and coal, on six plans; and kitchen against
// dining room on Hopkins 15 with and without them (review round 2, M4: the room's position is a confound).
// The wreck is compared by when the last thing in it stops burning (review round 3, S1).
{
  const NO_STORES = {furniture: true, lacquer: 'some'}, gains = [];
  for (const planId of PLANS) { const withStores = burn({planId, at: 'room:0:kitchen', seconds: 150}), without = burn({planId, at: 'room:0:kitchen', seconds: 150, contents: NO_STORES}); gains.push(without.half - withStores.half); }
  const k = burn({at: 'room:0:kitchen', seconds: 500}), d = burn({at: 'room:0:dining', seconds: 500}), k0 = burn({at: 'room:0:kitchen', seconds: 500, contents: NO_STORES}), d0 = burn({at: 'room:0:dining', seconds: 500, contents: NO_STORES});
  report(9, 'PARTLY', 'a kitchen fire reaches half the house ' + range(gains) + ' s sooner with the oil and coal than without, on six plans. Hopkins 15, kitchen against dining room: with stores ' + round(k.half) + ' against ' + round(d.half) + ' s; without ' + round(k0.half) + ' against ' + round(d0.half)
    + ' s, so that difference is where the room is. The wreck: the last flame other than coal is out at ' + round(k.flameUntil) + ' and ' + round(d.flameUntil) + ' s (kitchen, dining) with stores, ' + round(k0.flameUntil) + ' and ' + round(d0.flameUntil) + ' s without; with stores the coal then burns on alone until '
    + round(k.burningUntil) + ' and ' + round(d.burningUntil) + ' s   [target: a stated, measured difference in time to half alight and in heat left in the wreck]');
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
// 11, 12. The house next door. Rule 6 (reach) is withdrawn, so on bare ground nothing crosses a gap.
// reach-options.mjs measures what each form of reach would buy and cost.
{
  const table = [], farWall = planId => strikesOf(planId).find(s => s.startsWith('wall:x-') && !s.endsWith(':in'));
  for (const gap of [.5, 1, 2, 8]) table.push(pair(gap, 'bare', farWall('hopkins-4-15')));
  for (const gap of [3, 8]) table.push(pair(gap, 'lawn', farWall('hopkins-4-15')));
  const byPlan = PLANS.map(planId => planId === 'hopkins-4-15' ? table.find(p => p.gap === 2) : pair(2, 'bare', farWall(planId), {}, {}, 200, planId));
  const line = p => '    ' + p.plan.padEnd(15) + 'gap ' + String(p.gap).padEnd(4) + p.ground.padEnd(5) + ' strike ' + p.at.padEnd(15) + ' neighbour ' + (p.neighbourLit === null ? 'never (200 s)' : 'lit at ' + round(p.neighbourLit) + ' s, ' + round(p.afterFacing) + ' s after A\'s facing wall first burnt')
    + '; A half alight at ' + round(p.half) + ' s' + (p.grassLit !== null ? '; grass lit at ' + round(p.grassLit) + ' s' : '');
  for (const p of [...table, ...byPlan.filter(p => p.plan !== 'hopkins-4-15')]) say(line(p));
  const ok = p => p.afterFacing !== null && p.afterFacing <= 30, bare = table.filter(p => p.ground === 'bare');
  const eight = table.find(p => p.gap === 8 && p.ground === 'bare'), lawn8 = table.find(p => p.gap === 8 && p.ground === 'lawn');
  report(11, byPlan.every(ok) ? 'MET' : byPlan.filter(ok).length >= 3 ? 'PARTLY' : 'MISSED', 'bare ground, 2 m, a pair of the same plan, match on the far wall: the neighbour lights within 30 s on ' + byPlan.filter(ok).length + ' of ' + byPlan.length + ' plans, and at all in 200 s on ' + byPlan.filter(p => p.neighbourLit !== null).length
    + '. Hopkins 15 at 0.5, 1, 2 and 8 m: ' + bare.map(p => p.neighbourLit === null ? 'never' : round(p.neighbourLit) + ' s').join(', ') + '. With no reach rule, fire crosses a gap only on grass   [target: yes, within 30 s]');
  report(12, eight.neighbourLit === null ? (lawn8.neighbourLit === null ? 'MET' : 'PARTLY') : 'MISSED', '8 m: on bare ground ' + (eight.neighbourLit === null ? 'never' : 'lit at ' + round(eight.neighbourLit) + ' s') + '; with lawn between, ' + (lawn8.neighbourLit === null ? 'never' : 'lit at ' + round(lawn8.neighbourLit) + ' s, carried by the grass') + '   [target: no]');
  results.pairs = [...table, ...byPlan];
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
  const eightHouses = [];
  for (let n = 1; n < 8; n++) eightHouses.push(['N' + n, 6 + (n % 4) * (width + 3), 6 + Math.floor(n / 4) * (one.a.plan.depth + 3)]);
  const eight = burn({seconds: 150, timed: true, at: 'room:0:hall', neighbours: eightHouses, before: world => lawn(world, 0, 0, Math.round((12 + 4 * (width + 3)) / PITCH), Math.round((12 + 2 * (one.a.plan.depth + 3)) / PITCH))});
  const show = r => round(r.cost.mean, 1) + ' ms mean, ' + round(r.cost.p95, 1) + ' ms 95th centile, ' + round(r.cost.max, 1) + ' ms worst, ' + r.peakActive + ' tiles active at peak';
  report(15, 'MISSED', 'cost per step of 1/30 s over 150 s (one step covers two of today\'s 1/60 s frames): one house ' + show(one) + '; three houses on a lawn, all burning, ' + show(three) + '; eight houses on a lawn, one struck, ' + show(eight) + '. Today\'s game: 3 to 5 ms per 1/60 s frame   [target: no more than today\'s]');
}
say('rules: ' + JSON.stringify(DEFAULT_RULES));
say('fuels: ' + JSON.stringify(DEFAULT_FUELS));
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'trial.txt'), lines.join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'trial.json'), JSON.stringify({rules: DEFAULT_RULES, fuels: DEFAULT_FUELS, results}, null, 1) + '\n');
