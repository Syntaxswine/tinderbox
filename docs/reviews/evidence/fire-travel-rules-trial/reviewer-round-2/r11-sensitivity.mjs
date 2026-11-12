// Round 2. Over-fitting: each tuned number moved by 10 % (and some by 20 %), one at a time, and the targets re-measured
// on a small panel. A verdict that flips on a 10 % change is fragile.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r11-sensitivity.mjs <slice> <of>     (writes results/r11/part-<slice>.jsonl)
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r11-sensitivity.mjs summary
import fs from 'node:fs';
import path from 'node:path';
import {make, burn, house, lawn, outsideWalls, plan, round, PITCH, LAYER} from './measure-var.mjs';
import {DEFAULT_RULES, DEFAULT_FUELS} from './kernel-var.mjs';
const dir = path.join(import.meta.dirname, 'results', 'r11');
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
const litAt = (world, i, j) => world.tileAt(i, j, 0)?.fuels[0]?.litAt ?? null;

const variants = [{name: 'as tuned', rules: {}, fuels: {}}];
const R = ['rate', 'maxHeat', 'loss', 'up', 'upDiagonal', 'down', 'falloff', 'glassBreaks', 'storeyPass', 'through', 'reach', 'radiantGain', 'emberShare', 'fallPulse'];
const F = [['grass', 'out'], ['grass', 'delay'], ['clapboard', 'delay'], ['clapboard', 'burnFor'], ['partition', 'burnFor'], ['door', 'burnFor'], ['frame', 'burnFor'], ['frame', 'delay'], ['roof', 'burnFor'], ['furniture', 'out']];
const WIDE = new Set(['rate', 'maxHeat', 'loss', 'through', 'radiantGain', 'emberShare', 'reach', 'clapboard.delay', 'clapboard.burnFor', 'door.burnFor', 'grass.out']);
for (const key of R) for (const m of WIDE.has(key) ? [.8, .9, 1.1, 1.2] : [.9, 1.1]) variants.push({name: key + ' x' + m, rules: {[key]: +(DEFAULT_RULES[key] * m).toPrecision(6)}, fuels: {}});
for (const m of [.9, 1.1]) variants.push({name: 'pass.timber x' + m, rules: {pass: {timber: +(DEFAULT_RULES.pass.timber * m).toPrecision(6)}}, fuels: {}});
for (const m of [.9, 1.1]) variants.push({name: 'pass.glass x' + m, rules: {pass: {glass: +(DEFAULT_RULES.pass.glass * m).toPrecision(6)}}, fuels: {}});
for (const [cls, key] of F) for (const m of WIDE.has(cls + '.' + key) ? [.8, .9, 1.1, 1.2] : [.9, 1.1]) variants.push({name: cls + '.' + key + ' x' + m, rules: {}, fuels: {[cls]: {[key]: +(DEFAULT_FUELS[cls][key] * m).toPrecision(6)}}});

function measure({rules, fuels}) {
  const out = {};
  { // target 1, straight fronts
    const a = make(rules, fuels); lawn(a, 0, 0, 101, 21); for (let j = 0; j < 21; j++) a.ignite(a.tileAt(0, j, 0)); run(a, 40);
    const b = make(rules, fuels); lawn(b, 0, 0, 101, 101); for (let i = 0; i <= 50; i++) b.ignite(b.tileAt(i, 50 - i, 0)); run(b, 35);
    out.axis = 60 * PITCH / (litAt(a, 90, 10) - litAt(a, 30, 10)); out.diagonal = Math.hypot(30, 30) * PITCH / (litAt(b, 70, 70) - litAt(b, 40, 40));
  }
  { // target 2, the author's way, Hopkins 15, x+ side
    const world = make(rules, fuels), a = house(world, 'A', 'hopkins-4-15', 8, 8, {});
    lawn(world, 0, 0, Math.round((16 + a.plan.width) / PITCH), Math.round((16 + a.plan.depth) / PITCH));
    const wall = outsideWalls(world, a).find(w => w.side === 'x+' && w.tile.i === a.origin[0] + 19 && w.tile.j === a.origin[1] + 10);
    world.ignite(world.tileAt(wall.outside.i + 6, wall.outside.j, 0)); run(world, 15);
    out.wallWait = wall.fuel.litAt !== null ? wall.fuel.litAt - wall.outside.fuels[0].litAt : null;
  }
  { // target 3, the author's bare wall
    const world = make(rules, fuels);
    for (let j = 0; j <= 40; j++) for (let k = 0; k <= 5; k++) { const tile = world.addTile(0, j, k); world.addTile(1, j, k); world.addTile(-1, j, k); world.addFuel(tile, 'clapboard', 1, {face: {axis: 0, step: 1, object: world.setFace(0, j, k, 0, 1, 'timber')}}); }
    const f = (j, k) => world.tileAt(0, j, k).fuels[0];
    world.ignite(world.tileAt(0, 20, 0), null, {fuel: f(20, 0), from: world.tileAt(1, 20, 0)}); run(world, 90);
    out.ratio = (5 * LAYER / f(20, 5).litAt) / (3 / Math.max(f(26, 0).litAt, f(14, 0).litAt));
  }
  { // target 10: 0.5 m of paving square to the grid, and a one-tile diagonal strip
    const crossed = build => { const world = make(rules, fuels); const far = build(world); world.ignite(world.tileAt(2, 10, 0)); run(world, 40); return world.events.find(e => e.type === 'lit' && far(e.at))?.time ?? null; };
    out.pavingSquare = crossed(world => { lawn(world, 0, 0, 20, 21); for (let j = 0; j < 21; j++) world.addTile(20, j, 0); lawn(world, 21, 0, 41, 21); return at => at[0] >= 21; });
    out.pavingDiagonal = crossed(world => { for (let j = 0; j < 41; j++) for (let i = 0; i < 41; i++) { const t = world.addTile(i, j, 0); if (i + j !== 40) world.addFuel(t, 'grass', 1); } return at => at[0] + at[1] > 40; });
  }
  // targets 11, 12: Hopkins 15 pair, far-wall strike
  for (const gap of [2, 2.5]) {
    let facing = null;
    const r = burn({at: 'wall:x-:0:10', rules, fuels, seconds: 120, neighbours: [['B', 6 + plan('hopkins-4-15').width + gap, 6]], before: (world, a) => { facing = [0, 1, 2, 3].flatMap(k => outsideWalls(world, a, k)).filter(w => w.side === 'x+'); }});
    const first = Math.min(...facing.map(w => w.fuel.litAt ?? Infinity));
    out['pair' + gap] = {B: r.neighbours.B, after: r.neighbours.B !== null ? r.neighbours.B - first : null};
  }
  // targets 4 to 8 on four strikes
  out.strikes = {};
  for (const [planId, at] of [['hopkins-4-15', 'wall:x+:19:4:in'], ['hopkins-4-15', 'room:0:dining'], ['hopkins-4-12', 'room:0:kitchen'], ['hopkins-4-09', 'room:1:bed-a']]) {
    const r = burn({planId, at, rules, fuels, seconds: 120});
    out.strikes[planId + ' ' + at] = {room: r.roomAll, half: r.half, fall: r.fall?.time ?? null, lag: r.struck.floor && r.groundLit && r.fallToGround ? r.groundLit.time - r.fallToGround.time : null, before: r.struck.floor ? !!(r.groundLit && (!r.fallToGround || r.groundLit.time < r.fallToGround.time)) : null, flameAt120: r.flameUntil >= 119};
  }
  return out;
}

if (process.argv[2] === 'summary') {
  const rows = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).flatMap(f => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').map(l => JSON.parse(l)));
  const verdicts = m => {
    const v = {};
    v['1 grass'] = m.axis >= 1.395 && m.axis <= 1.605 && m.diagonal >= 1.395 && m.diagonal <= 1.605;
    v['2 wall wait'] = m.wallWait !== null && m.wallWait < 2 + 1e-9;      // generous: the record's own 2.000 counts as under
    v['3 ratio'] = m.ratio >= 2.5 && m.ratio <= 3.5;
    for (const [k, s] of Object.entries(m.strikes)) { v['4 room ' + k] = s.room !== null && s.room >= 10 && s.room <= 20; v['5 half ' + k] = s.half !== null && s.half >= 40 && s.half <= 70; v['7 fall ' + k] = s.fall !== null && s.fall >= 60 && s.fall <= 150; if (s.lag !== null || s.before !== null) v['8 ' + k] = s.before === false && s.lag !== null && s.lag <= 5; }
    v['10 paving square'] = m.pavingSquare === null; v['10b diagonal strip'] = m.pavingDiagonal === null;
    v['11 pair 2 m'] = m.pair2.after !== null && m.pair2.after <= 30; v['12 pair 2.5 m never'] = m['pair2.5'].B === null;
    return v;
  };
  const base = rows.find(r => r.name === 'as tuned'), bv = verdicts(base.m);
  const show = m => 'grass ' + round(m.axis, 3) + '/' + round(m.diagonal, 3) + ' wait ' + round(m.wallWait, 3) + ' ratio ' + round(m.ratio, 2) + ' pair2 ' + round(m.pair2.after, 1) + ' pair2.5 ' + round(m['pair2.5'].B, 1) + ' | ' + Object.values(m.strikes).map(s => round(s.room, 1) + '/' + round(s.half, 1) + '/' + round(s.fall, 1) + (s.lag !== null ? '/lag ' + round(s.lag, 1) : '')).join('  ');
  console.log('as tuned'.padEnd(26), show(base.m));
  console.log('   verdicts as tuned: ' + Object.entries(bv).map(([k, ok]) => k + ' ' + (ok ? 'in' : 'OUT')).join('; '));
  const flips = {};
  for (const r of rows.filter(r => r.name !== 'as tuned').sort((p, q) => p.name.localeCompare(q.name))) {
    const v = verdicts(r.m), changed = Object.keys(v).filter(k => v[k] !== bv[k]);
    for (const k of changed) (flips[k] ??= []).push(r.name);
    console.log(r.name.padEnd(26), show(r.m), changed.length ? '  FLIPS: ' + changed.map(k => k + (v[k] ? ' ->in' : ' ->OUT')).join(', ') : '');
  }
  console.log('\nverdicts that flip, and on what:');
  for (const [k, list] of Object.entries(flips)) console.log('  ' + k + ': ' + list.join(', '));
  console.log(rows.length + ' variants read');
} else {
  const slice = +process.argv[2], of = +process.argv[3];
  fs.mkdirSync(dir, {recursive: true});
  const file = path.join(dir, 'part-' + slice + '.jsonl');
  fs.writeFileSync(file, '');
  variants.forEach((v, n) => { if (n % of !== slice) return; fs.appendFileSync(file, JSON.stringify({name: v.name, rules: v.rules, fuels: v.fuels, m: measure(v)}) + '\n'); });
}
