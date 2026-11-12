// Round 2. Rule 6 (reach in the open) and targets 11 and 12: the house next door.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r05-reach.mjs <control|trace|margin|gain|strikes|eave|plans|scene|step>
import {burn, outsideWalls, strikesOf, plan, round, PITCH, LAYER} from './measure-var.mjs';
import {pair as authorPair} from '../pair.mjs';
const part = process.argv[2];
const W = id => plan(id).width;
// Two houses side by side along x, `gap` metres between their walls. Returns when and how B was first lit.
function pair({gap, at = 'wall:x-:0:10', planA = 'hopkins-4-15', planB = planA, rules = {}, fuels = {}, seconds = 200, sceneOpts = {}, dy = 0, trace = false}) {
  let seen = 0, bLit = false, facing = null, ringB = null, peakRad = 0, peakRadAt = null, peakHeat = 0, radSeconds = 0;
  const r = burn({planId: planA, at, rules, fuels, seconds, sceneOpts, neighbours: [['B', 6 + W(planA) + gap, 6 + dy, planB]],
    before: (world, a) => { facing = [0, 1, 2, 3].flatMap(k => outsideWalls(world, a, k)).filter(w => w.side === 'x+'); },
    each: world => {
      ringB ??= [...world.tiles.values()].filter(t => !t.building && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => world.tileAt(t.i + di, t.j + dj, t.k)?.building === 'B'));
      for (; seen < world.events.length; seen++) if (world.events[seen].type === "lit" && world.events[seen].building === "B") bLit = true;
      if (bLit) return;
      let any = false;
      for (const t of ringB) { if (t.rad > peakRad) { peakRad = t.rad; peakRadAt = world.time; } if (t.heat > peakHeat) peakHeat = t.heat; if (t.rad >= 1.1) any = true; }
      if (any) radSeconds += world.dt;
    }});
  const first = r.world.events.find(e => e.type === 'lit' && e.building === 'B');
  const facingLit = Math.min(...facing.map(w => w.fuel.litAt ?? Infinity));
  const firstFacing = facing.filter(w => w.fuel.litAt === facingLit)[0];
  return {r, first, B: first?.time ?? null, facingLit: Number.isFinite(facingLit) ? facingLit : null, after: first && Number.isFinite(facingLit) ? first.time - facingLit : null, peakRad, peakRadAt, peakHeat, radSeconds, half: r.half, firstFacing, facing};
}
const show = (label, p) => console.log(label.padEnd(52), 'B lit', p.B === null ? 'never' : round(p.B) + ' s (' + p.first.cls + ' at layer ' + p.first.at[2] + ')', '| A facing wall first lit', round(p.facingLit), '| B after facing', round(p.after), '| A half', round(p.half),
  '| peak reach warmth on B ring', round(p.peakRad, 3), 'at', round(p.peakRadAt), 's (1.1 lights clapboard) | peak heat on B ring', round(p.peakHeat, 3), '| seconds with warmth >= 1.1:', round(p.radSeconds, 1));

if (part === 'control') {
  for (const gap of [1, 2, 2.5]) { const a = authorPair(gap, 'bare', 'wall:x-:0:10'), b = pair({gap}); console.log('gap', gap, 'author:', round(a.neighbourLit), round(a.afterFacing), round(a.half), '| mine:', round(b.B), round(b.after), round(b.half), a.neighbourLit === b.B && a.half === b.half ? 'AGREE' : 'DISAGREE'); }
}
if (part === 'trace') {
  // The saved table has B lit 1.1 s BEFORE A's facing wall at 1 m. By what path?
  for (const gap of [1, 1.5, 2]) for (const at of ['wall:x-:0:10', 'room:0:kitchen']) {
    const p = pair({gap, at});
    show('gap ' + gap + ' m ' + at, p);
    if (!p.first) continue;
    const w = p.r.world, [i, j, k] = p.first.at, tile = w.tileAt(i, j, k), fuel = tile.fuels.find(f => f.litAt === p.first.time && f.cls === p.first.cls);
    console.log('    B first lit: ' + p.first.cls + ' in tile', p.first.at, 'face', JSON.stringify(fuel?.face && {axis: fuel.face.axis, step: fuel.face.step}), 'lit from', fuel?.near ? (fuel.near.building ?? 'air') + ' tile ' + [fuel.near.i, fuel.near.j, fuel.near.k] : 'its own tile');
    // What on A was burning then, on A's x+ face or anywhere with an air tile as its burning side?
    const before = p.r.initial.filter(x => x.fuel.litAt !== null && x.fuel.litAt <= p.first.time);
    const byCls = {}; for (const x of before) byCls[x.cls] = (byCls[x.cls] ?? 0) + 1;
    const outsideLit = before.filter(x => x.fuel.face && x.fuel.near && !x.fuel.near.building);
    const sides = {}; for (const x of outsideLit) { const s = x.cls + ' ' + (x.fuel.face.axis === 2 ? 'top' : (x.fuel.face.axis === 0 ? 'x' : 'y') + (x.fuel.face.step > 0 ? '+' : '-')); sides[s] = (sides[s] ?? 0) + 1; }
    console.log('    A then: ' + before.length + ' of ' + p.r.n + ' fuels lit ' + JSON.stringify(byCls) + '; burning on their OUTSIDE (air side): ' + JSON.stringify(sides));
    const fl = p.facing.filter(x => x.fuel.litAt !== null && x.fuel.litAt <= p.first.time);
    console.log('    A facing-wall (x+) surfaces lit by then: ' + fl.length + ' of ' + p.facing.length + '; of them lit from outside: ' + fl.filter(x => x.fuel.near && !x.fuel.near.building).length + '; first at ' + round(p.facingLit) + ' s in layer ' + p.firstFacing?.tile.k + ', lit from ' + (p.firstFacing?.fuel.near ? (p.firstFacing.fuel.near.building ? 'inside' : 'outside') : 'inside (own tile)'));
  }
}
if (part === 'margin') {
  for (const gap of [1.5, 2, 2.5, 3]) show('gap ' + gap + ' m, far-wall strike', pair({gap}));
}
if (part === 'gain') {
  for (const radiantGain of [.4, .45, .5, .55, .6, .75, 1]) for (const gap of [2, 2.5]) show('gain ' + radiantGain + ' gap ' + gap, pair({gap, rules: {radiantGain}}));
  for (const reach of [2.5, 2.75, 3, 3.5, 4]) for (const gap of [2, 2.5]) show('reach ' + reach + ' gap ' + gap, pair({gap, rules: {reach}}));
  for (const [name, fuels] of [['clapboard burns 16 s', {clapboard: {burnFor: 16}}], ['clapboard burns 24 s', {clapboard: {burnFor: 24}}], ['clapboard delay 5.5 s', {clapboard: {delay: 5.5}}], ['clapboard delay 6 s', {clapboard: {delay: 6}}], ['clapboard delay 4.5 s', {clapboard: {delay: 4.5}}]]) show(name + ' gap 2', pair({gap: 2, fuels}));
  for (const [name, rules] of [['through 3', {through: 3}], ['through 5', {through: 5}], ['every 0.25 s', {radiantEvery: .25}], ['every 1 s', {radiantEvery: 1}], ['every step', {radiantEvery: 1 / 30}]]) show(name + ' gap 2', pair({gap: 2, rules}));
}
if (part === 'strikes') {
  for (const at of strikesOf('hopkins-4-15')) show('gap 2 m, A struck ' + at, pair({gap: 2, at}));
}
if (part === 'eave') {
  for (const gap of [1, 1.5, 2]) for (const eave of [undefined, 'roof', 'masonry']) show('gap ' + gap + ' m, eave ' + (eave ?? 'none (the trial)'), pair({gap, sceneOpts: eave ? {eave} : {}}));
}
if (part === 'plans') {
  for (const id of ['hopkins-4-15', 'hopkins-4-12', 'hopkins-4-09', 'hopkins-4-13', 'ashland-worker', 'monroe-row']) {
    const at = strikesOf(id).find(s => s.startsWith('wall:x-') && !s.endsWith(':in'));
    for (const gap of [1.5, 2, 2.5]) show(id + ' pair, gap ' + gap + ', A struck ' + at, pair({gap, planA: id, at}));
  }
  for (const dy of [-4, 4, 8]) show('hopkins 15 pair, gap 2, B shifted ' + dy + ' m along the wall', pair({gap: 2, dy}));
}
if (part === 'scene') {
  for (const [name, sceneOpts] of [['ring 1 (the trial)', {}], ['ring 2 tiles', {ring: 2}], ['ring 3 tiles', {ring: 3}], ['air layer above the roofs', {airAbove: 1}]]) for (const gap of [2, 2.5]) show(name + ', gap ' + gap, pair({gap, sceneOpts}));
}
if (part === 'late') {
  // Where the neighbour is lit late (100 s and after): is that the "roof gone, what burns under it reaches out" clause?
  for (const [id, at] of [['hopkins-4-12', 'wall:x-:0:7'], ['hopkins-4-09', 'wall:x-:0:11'], ['hopkins-4-13', 'wall:x-:0:4'], ['ashland-worker', 'wall:x-:0:7']]) for (const xFrozenSky of [false, true]) {
    const p = pair({gap: 2, planA: id, at, rules: xFrozenSky ? {xFrozenSky} : {}, seconds: 250});
    show(id + ' pair, 2 m' + (xFrozenSky ? ', open-to-sky frozen' : ''), p);
    if (p.first) { const w = p.r.world, [i, j, k] = p.first.at, f = w.tileAt(i, j, k).fuels.find(f => f.litAt === p.first.time); console.log('      A at that time: roofs spent ' + p.r.initial.filter(x => x.cls === 'roof' && x.fuel.spentAt !== null && x.fuel.spentAt <= p.first.time).length + ' of ' + p.r.initial.filter(x => x.cls === 'roof').length + '; facing-wall surfaces lit from outside ' + p.facing.filter(x => x.fuel.litAt !== null && x.fuel.litAt <= p.first.time && x.fuel.near && !x.fuel.near.building).length + ', from inside ' + p.facing.filter(x => x.fuel.litAt !== null && x.fuel.litAt <= p.first.time && !(x.fuel.near && !x.fuel.near.building)).length + ' of ' + p.facing.length); }
  }
}
if (part === 'step') {
  for (const step of [1 / 60, 1 / 30, 1 / 15]) for (const gap of [2, 2.5]) show('step 1/' + Math.round(1 / step) + ' gap ' + gap, pair({gap, rules: {step}}));
}
