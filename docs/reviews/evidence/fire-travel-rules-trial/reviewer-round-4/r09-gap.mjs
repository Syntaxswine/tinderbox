// Round 4. Targets 11 and 12 and the 0.5 m case, with no reach.
// Uses measure-var.mjs / kernel-var.mjs (copies; with no switch they are the author's code: see r07 control).
// kernel-var has one switch, rules.wakeFacing: a warm tile wakes the tiles holding an unlit surface that faces it,
// so that Rule 2's "a surface is exposed to the hotter of the two tiles it stands between" holds when the tile
// that holds the surface is asleep.
import {burn, outsideWalls, lawn, paving, plan, strikesOf, round, PITCH, PLANS, make, house} from './measure-var.mjs';
const farWall = planId => strikesOf(planId).find(s => s.startsWith('wall:x-') && !s.endsWith(':in'));
function pair(gap, ground, planA, planB, rules = {}, {shift = 0, seconds = 200, at = farWall(planA)} = {}) {
  const width = plan(planA).width;
  let ringB = null, innerB = null, peak = 0, hotSteps = 0, innerAwake = 0;
  const r = burn({planId: planA, at, rules, seconds, neighbours: [['B', 6 + width + gap, 6 + shift, planB]], before: (world, a) => {
    const I = Math.round((12 + width + plan(planB).width + gap) / PITCH), J = Math.round((22 + Math.abs(shift)) / PITCH);
    if (ground === 'lawn') lawn(world, 0, 0, I, J);
    if (ground === 'paved') paving(world, 0, 0, I, J);
    const step = world.step;
    // B's west (x-) ground and upper wall faces: the outside tile each faces, and the tile that holds it
    const bx = Math.round((6 + width + gap) / PITCH);
    ringB = []; innerB = [];
    for (const t of world.tiles.values()) if (t.building === 'B' && t.i === bx) for (const f of t.fuels) if (f.face && f.face.axis === 0 && f.face.step === -1) { innerB.push(t); ringB.push(world.across(t, f.face)); }
    world.probe = () => { let hot = false; for (const t of ringB) { if (t.heat > peak) peak = t.heat; if (t.heat >= 1.1) hot = true; } if (hot) hotSteps++; if (innerB.some(t => world.active.has(t))) innerAwake++; };
  }});
  return r;
}
// burn() steps the world itself, so the heat of B's outside tiles is sampled by a second run with a stepping wrapper.
function watch(gap, ground, planA, planB, rules = {}, seconds = 200) {
  const world = make(rules), width = plan(planA).width;
  const a = house(world, 'A', planA, 6, 6, {furniture: true, lacquer: 'some', oil: true, coal: true}), b = house(world, 'B', planB, 6 + width + gap, 6);
  if (ground === 'paved') paving(world, 0, 0, Math.round((12 + width + plan(planB).width + gap) / PITCH), Math.round(22 / PITCH));
  const bx = Math.round((6 + width + gap) / PITCH), ring = [], inner = [], walls = [];
  for (const t of world.tiles.values()) if (t.building === 'B' && t.i === bx) for (const f of t.fuels) if (f.face && f.face.axis === 0 && f.face.step === -1) { inner.push(t); ring.push(world.across(t, f.face)); walls.push(f); }
  const [, side, ci, cj] = farWall(planA).split(':'), tile = world.tileAt(a.origin[0] + +ci, a.origin[1] + +cj, 0), w = outsideWalls(world, a).find(w => w.tile === tile && w.side === side);
  world.ignite(tile, null, {fuel: w.fuel, from: w.outside});
  let peak = 0, hot = 0, awake = 0, longest = 0, runNow = new Map();
  for (let n = Math.round(seconds / world.dt); n > 0; n--) {
    world.step();
    let any = false;
    for (const t of ring) { if (t.heat > peak) peak = t.heat; if (t.heat >= 1.1) { any = true; runNow.set(t, (runNow.get(t) ?? 0) + 1); if (runNow.get(t) > longest) longest = runNow.get(t); } else runNow.set(t, 0); }
    if (any) hot++;
    if (inner.some(t => world.active.has(t))) awake++;
  }
  const lit = Math.min(...walls.map(f => f.litAt ?? Infinity));
  return {peak, hotSeconds: hot * world.dt, longestHotSeconds: longest * world.dt, innerAwakeSeconds: awake * world.dt, lit: Number.isFinite(lit) ? lit : null, anyB: world.events.find(e => e.type === 'lit' && e.building === 'B')?.time ?? null, woken: world.stats.woken ?? 0};
}
const show = v => v === null ? 'never' : round(v) + ' s';
console.log('(a) control: the author\'s kernel (no switch), Hopkins 15 pair, bare ground. trial.txt says 65.77 s, never, never');
for (const gap of [.5, 1, 2]) console.log('  gap ' + gap + ' m: neighbour ' + show(pair(gap, 'bare', 'hopkins-4-15', 'hopkins-4-15').neighbours.B));
console.log('(b) the author\'s kernel, gap 1 m, bare: how hot do the air tiles against B\'s facing wall get, and is the tile holding that wall ever awake?');
for (const planId of PLANS) { const w = watch(1, 'bare', planId, planId); console.log('  ' + planId.padEnd(15) + ' hottest air tile against B\'s wall ' + round(w.peak) + ' (clapboard chars above 1.1; ceiling 2.9); some such tile above 1.1 for ' + round(w.hotSeconds, 1) + ' s in all, one tile continuously for ' + round(w.longestHotSeconds, 1) + ' s (clapboard needs 1.83 s at the ceiling); the tiles holding B\'s facing wall awake for ' + round(w.innerAwakeSeconds, 1) + ' s; B lit: ' + show(w.anyB)); }
console.log('(c) the same with wakeFacing (Rule 2 applied to a surface whose own tile is asleep)');
for (const planId of PLANS) { const w = watch(1, 'bare', planId, planId, {wakeFacing: 1e-3}); console.log('  ' + planId.padEnd(15) + ' gap 1 m bare: B lit ' + show(w.anyB) + '; tiles woken ' + w.woken); }
for (const gap of [.5, 1, 1.5, 2]) { const w = watch(gap, 'bare', 'hopkins-4-15', 'hopkins-4-15', {wakeFacing: 1e-3}); console.log('  hopkins-4-15    gap ' + gap + ' m bare: B lit ' + show(w.anyB)); }
console.log('(d) paved ground between (tiles exist all the way across), author\'s kernel then wakeFacing');
for (const gap of [1, 1.5, 2]) { const w0 = watch(gap, 'paved', 'hopkins-4-15', 'hopkins-4-15'), w1 = watch(gap, 'paved', 'hopkins-4-15', 'hopkins-4-15', {wakeFacing: 1e-3}); console.log('  hopkins-4-15    gap ' + gap + ' m paved: author\'s kernel ' + show(w0.anyB) + ' (hottest air tile at B\'s wall ' + round(w0.peak) + '); wakeFacing ' + show(w1.anyB)); }
console.log('(e) author\'s kernel, bare ground: mixed plan pairs, a neighbour shifted 3 m along the wall, gaps 1 to 8 m');
let lit = 0, n = 0;
for (const planA of PLANS) for (const planB of PLANS) for (const gap of [1, 2]) { n++; if (pair(gap, 'bare', planA, planB, {}, {seconds: 150}).neighbours.B !== null) { lit++; console.log('  LIT: ' + planA + ' -> ' + planB + ' gap ' + gap); } }
console.log('  36 plan pairs x gaps 1 and 2 m: neighbour lit in ' + lit + ' of ' + n);
for (const gap of [1, 1.5, 2, 3, 5, 8]) for (const shift of [0, 3, -3]) { n++; const p = pair(gap, 'bare', 'hopkins-4-15', 'hopkins-4-12', {}, {shift, seconds: 150}); if (p.neighbours.B !== null) console.log('  LIT: gap ' + gap + ' shift ' + shift + ' at ' + round(p.neighbours.B)); }
console.log('  Hopkins 15 -> Hopkins 12, gaps 1, 1.5, 2, 3, 5, 8 m, shifts 0, +3, -3 m: done (any LIT lines are above)');
