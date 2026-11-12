// Round 6. The two kernel changes of this round: the catch-up fade (fuel.seen) and listenersStale in addTile.
//   node reviewer-round-6/r01-fade-seen.mjs
import {createWorld} from '../kernel.mjs';
import {make, house, lawn, PITCH} from '../measure.mjs';
const dt = 1 / 30, r = (v, d = 3) => +v.toFixed(d);

// A. A loose fuel heated, then cold for a while, either kept awake (held at 0.5, below every lighting point
// used here) or allowed to sleep. Char after, and time to relight at the ceiling, must agree.
function loose(cls, hot, cold, mode) {
  const w = createWorld(), t = w.addTile(0, 0, 0), f = w.addFuel(t, cls, 1);
  for (let n = Math.round(hot / dt); n > 0; n--) { t.heat = 2.9; w.active.add(t); w.step(); }
  const charHot = f.char;
  t.heat = .5;
  let slept = 0;
  for (let n = Math.round(cold / dt); n > 0; n--) { if (mode === 'awake') { t.heat = .5; w.active.add(t); } w.step(); if (!w.active.has(t)) slept++; }
  t.heat = .5; w.active.add(t); w.step();
  const charAfter = f.char;
  let steps = 0; while (!f.lit && steps < 30000) { t.heat = 2.9; w.active.add(t); w.step(); steps++; }
  return {cls, hot, cold, mode, charHot: r(charHot), sleptSteps: slept, charAfter: r(charAfter), expected: r(Math.max(0, charHot - .5 * (cold + dt))), relight: r(steps * dt)};
}
console.log('A. loose fuel, awake against asleep');
for (const [cls, hot, cold] of [['clapboard', 1, 2], ['clapboard', 1, 4], ['clapboard', 1, 120], ['coal', 8, 10], ['coal', 8, 600], ['roof', 2, 5], ['furniture', 1, 3.5]])
  for (const mode of ['awake', 'sleep']) console.log('  ' + JSON.stringify(loose(cls, hot, cold, mode)));

// B. A surface whose own tile is cold; the tile it stands against is heated, then cold.
function surface(hot, cold, mode) {
  const w = createWorld(), h = w.addTile(0, 0, 0), o = w.addTile(1, 0, 0);
  const f = w.addFuel(h, 'clapboard', 1, {face: {axis: 0, step: 1, object: w.setFace(0, 0, 0, 0, 1, 'timber')}});
  for (let n = Math.round(hot / dt); n > 0; n--) { o.heat = 2.9; w.active.add(o); w.step(); }
  const charHot = f.char; o.heat = .5; let slept = 0;
  for (let n = Math.round(cold / dt); n > 0; n--) { if (mode === 'awake') { o.heat = .5; w.active.add(o); } w.step(); if (!w.active.has(h)) slept++; }
  o.heat = .5; w.active.add(o); w.step(); w.step();
  const charAfter = f.char;
  let steps = 0; while (!f.lit && steps < 3000) { o.heat = 2.9; w.active.add(o); w.step(); steps++; }
  return {hot, cold, mode, charHot: r(charHot), holderSleptSteps: slept, charAfter: r(charAfter), relight: r(steps * dt)};
}
console.log('B. surface, the tile against it heated then cold');
for (const [hot, cold] of [[1, 2], [1, 4], [1.5, 30]]) for (const mode of ['awake', 'sleep']) console.log('  ' + JSON.stringify(surface(hot, cold, mode)));

// C. A tile laid late against a surface (round 5 S2).
{
  const w = createWorld(), h = w.addTile(0, 0, 0);
  const f = w.addFuel(h, 'clapboard', 1, {face: {axis: 0, step: 1, object: w.setFace(0, 0, 0, 0, 1, 'timber')}});
  for (let n = 0; n < 30; n++) w.step();
  const o = w.addTile(1, 0, 0);
  let steps = 0; while (!f.lit && steps < 600) { o.heat = 2.9; w.active.add(o); w.step(); steps++; }
  console.log('C. air tile laid after 1 s, then held at the ceiling: wall ' + (f.lit ? 'lit after ' + r(steps * dt) + ' s' : 'never lit in 20 s') + '; facing set: ' + !!o.facing);
  // a surface laid late against an existing warm tile
  const w2 = createWorld(), a = w2.addTile(0, 0, 0), b = w2.addTile(1, 0, 0);
  for (let n = 0; n < 30; n++) { b.heat = 2.9; w2.active.add(b); w2.step(); }
  const f2 = w2.addFuel(a, 'clapboard', 1, {face: {axis: 0, step: 1, object: w2.setFace(0, 0, 0, 0, 1, 'timber')}});
  steps = 0; while (!f2.lit && steps < 600) { b.heat = 2.9; w2.active.add(b); w2.step(); steps++; }
  console.log('   wall laid after 1 s against a tile held at the ceiling: ' + (f2.lit ? 'lit after ' + r(steps * dt) + ' s' : 'never'));
}

// D. Cost of marking listeners stale: eight houses on a lawn, nothing burning, one new far tile each step.
{
  const build = () => { const w = make(); for (let n = 0; n < 8; n++) house(w, 'N' + n, 'hopkins-4-15', 6 + (n % 4) * 13, 6 + Math.floor(n / 4) * 14, {furniture: true}); lawn(w, 0, 0, 120, 80); return w; };
  for (const lay of [false, true, false, true]) {
    const w = build(); w.step();
    const began = performance.now();
    for (let n = 0; n < 300; n++) { if (lay) w.addTile(-60, -60 + (n % 100), 5 + Math.floor(n / 100)); w.step(); }
    console.log('D. eight houses idle, ' + w.tiles.size + ' tiles, ' + (lay ? 'one tile laid per step' : 'no tile laid') + ': ' + r((performance.now() - began) / 300) + ' ms a step');
  }
}
