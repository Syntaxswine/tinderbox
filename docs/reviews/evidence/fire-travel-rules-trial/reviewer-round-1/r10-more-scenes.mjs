// Round 1, probe 10: more changes of scene.
// (a) a straight grass front (a lit line) along the axis and along the diagonal: the steady speed.
// (b) target 2 on every side of two plans, lawn all round the house.
// (c) the trial house with doors open, with no contents, with its windows lost (plan shifted off the 1 m grid), mirrored, and with the match upstairs.
// (d) Rule 7 / Rule 8: does oil upstairs run through the floor?
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r10-more-scenes.mjs
import {burn, ALL, round, out, createVar, lawn, house, wallTiles, lightFuel, transformPlan, HOUSING_PLANS, PITCH} from './lib.mjs';
const lines = [], pad = (s, n) => String(s ?? 'never').padEnd(n);

// (a)
{
  const N = 241, lit = world => { const m = new Map(); for (const e of world.events) if (e.type === 'lit') m.set(e.at[0] + ',' + e.at[1], e.time); return m; };
  const w1 = createVar(); lawn(w1, 0, 0, N, N); for (let i = 0; i < N; i++) w1.ignite(w1.tileAt(i, 0, 0));
  for (let n = 0; n < 60 * 30; n++) w1.step();
  const m1 = lit(w1), ax = (a, b) => (b - a) * PITCH / (m1.get('120,' + b) - m1.get('120,' + a));
  const w2 = createVar(); lawn(w2, 0, 0, N, N); for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i + j === 120) w2.ignite(w2.tileAt(i, j, 0));
  for (let n = 0; n < 60 * 30; n++) w2.step();
  const m2 = lit(w2), dg = (a, b) => (b - a) * 2 / Math.SQRT2 * PITCH / (m2.get(b + ',' + b) - m2.get(a + ',' + a));
  lines.push('(a) STRAIGHT grass front from a lit line, 120 m lawn (no curvature). Speed normal to the front, m/s:');
  lines.push('    front along the grid axis:  2-10 m ' + round(ax(4, 20), 3) + ', 10-30 m ' + round(ax(20, 60), 3) + ', 30-60 m ' + round(ax(60, 120), 3));
  lines.push('    front along the diagonal:   2-10 m ' + round(dg(63, 68), 3) + ', 10-30 m ' + round(dg(74, 102), 3) + ', 30-50 m ' + round(dg(102, 130), 3));
  const a = ax(60, 120), d = dg(102, 130);
  lines.push('    steady axis ' + round(a, 3) + ' against diagonal ' + round(d, 3) + ' m/s: ' + round(100 * (a - d) / ((a + d) / 2), 1) + ' % apart; against the 1.5 m/s target: axis ' + round(100 * (a - 1.5) / 1.5, 1) + ' %, diagonal ' + round(100 * (d - 1.5) / 1.5, 1) + ' %');
}

// (b)
lines.push('', '(b) target 2 (a lawn fire at a clapboard wall lights it in under 2 s after the grass beside it). Lawn 3 m all round, grass lit 2.5 m out from the middle of each side.');
let ok = 0, n2 = 0;
for (const planId of ['hopkins-4-15', 'ashland-worker', 'hopkins-4-09']) {
  const p = HOUSING_PLANS[planId];
  for (const side of ['x+', 'x-', 'y+', 'y-']) {
    const world = createVar(), a = house(world, 'A', planId, 6, 6), [oi, oj] = a.origin;
    lawn(world, oi - 8, oj - 10, oi + p.width * 2 + 8, oj + p.depth * 2 + 8);
    const list = wallTiles(a, world, 0).filter(w => w.side === side), mid = list[Math.floor(list.length / 2)].tile;
    const d = side[1] === '+' ? 1 : -1, out1 = side[0] === 'x' ? [mid.i + d, mid.j] : [mid.i, mid.j + d], start = side[0] === 'x' ? [mid.i + 5 * d, mid.j] : [mid.i, mid.j + 5 * d];
    if (!world.tileAt(...start, 0) || world.tileAt(...start, 0).inside) { lines.push('    ' + planId + ' ' + side + ': no lawn tile there'); continue; }
    world.ignite(world.tileAt(...start, 0));
    for (let s = 0; s < 25 * 30; s++) world.step();
    const beside = world.events.find(e => e.type === 'lit' && e.cls === 'grass' && e.at[0] === out1[0] && e.at[1] === out1[1])?.time ?? null;
    const wall = world.events.find(e => e.type === 'lit' && e.building === 'A')?.time ?? null;
    const thisWall = world.events.find(e => e.type === 'lit' && e.building === 'A' && e.at[0] === mid.i && e.at[1] === mid.j)?.time ?? null;
    const any = world.events.filter(e => e.type === 'lit' && e.building === 'A').length;
    n2++; if (wall !== null && beside !== null && wall - beside < 2) ok++;
    lines.push('    ' + pad(planId, 15) + pad(side, 4) + 'grass beside the wall lit ' + pad(round(beside) + ' s', 9) + 'first fuel of the house lit ' + pad(wall === null ? 'never' : round(wall) + ' s', 9) + 'lag ' + pad(wall === null ? '' : round(wall - beside), 7) + 'that wall tile ' + pad(thisWall === null ? 'never' : round(thisWall) + ' s', 9) + 'house fuels lit by 25 s: ' + any);
  }
}
lines.push('    target 2 met in ' + ok + ' of ' + n2);

// (c)
const strikeTrial = (world, a) => { const t = world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 0); world.ignite(t, 'clapboard'); return t.room; };
const show = r => pad(round(r.roomAll), 9) + pad(round(r.half), 9) + pad(round(r.halfBurningAt), 9) + pad(round(r.flameUntil), 9) + pad(round(r.fall?.time) + ' ' + r.fall?.cause, 13) + pad(round(r.neighbours?.B), 9) + r.n;
lines.push('', '(c) Hopkins 15, the trial strike, neighbour B at 2 m, 200 s.');
lines.push(pad('scene', 62) + pad('4 room', 9) + pad('5 half', 9) + pad('half@once', 9) + pad('6 flame', 9) + pad('7 fall', 13) + pad('11 B', 9) + 'fuels');
const nb = [['B', 18, 6]];
lines.push(pad('as the trial (CONTROL)', 62) + show(burn({seconds: 200, neighbours: nb, strike: strikeTrial})));
lines.push(pad('every door open', 62) + show(burn({seconds: 200, neighbours: nb, strike: strikeTrial, options: {doorsOpen: true}})));
lines.push(pad('no contents', 62) + show(burn({seconds: 200, neighbours: nb, strike: strikeTrial, contents: {}})));
lines.push(pad('furniture only', 62) + show(burn({seconds: 200, neighbours: nb, strike: strikeTrial, contents: {furniture: true}})));
lines.push(pad('all furniture lacquered', 62) + show(burn({seconds: 200, neighbours: nb, strike: strikeTrial, contents: {...ALL, lacquer: 'all'}})));
{
  const shifted = transformPlan(HOUSING_PLANS['hopkins-4-15'], 'shift', .125, .125);
  const probe = createVar(), pa = house(probe, 'A', shifted, 6, 6), glass = [...probe.faces.values()].filter(f => f.kind === 'glass').length;
  const probe0 = createVar(); house(probe0, 'A', 'hopkins-4-15', 6, 6); const glass0 = [...probe0.faces.values()].filter(f => f.kind === 'glass').length;
  lines.push(pad('plan shifted 0.125 m off the grid (glass faces ' + glass0 + ' -> ' + glass + ')', 62) + show(burn({planId: shifted, seconds: 200, neighbours: nb, strike: strikeTrial})));
}
for (const dj of [0, 2, 6, 8, 10, 14, 18]) lines.push(pad('match moved along the same wall to tile j = ' + dj + ' (trial: 4)', 62) + show(burn({seconds: 200, neighbours: nb, strike: (world, a) => { const t = world.tileAt(a.origin[0] + 19, a.origin[1] + dj, 0); const w = wallTiles(a, world, 0).find(x => x.tile === t && x.side === 'x+'); lightFuel(world, t, w.fuel); return t.room; }})));
lines.push(pad('match on the same wall upstairs (k = 2)', 62) + show(burn({seconds: 200, neighbours: nb, strike: (world, a) => { const t = world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 2); const w = wallTiles(a, world, 2).find(x => x.tile === t && x.side === 'x+'); lightFuel(world, t, w.fuel); return t.room; }})));

// (d)
{
  const r = burn({contents: {furniture: true}, seconds: 100, before: (world, a) => { const c = a.rooms.get('A/1:bed-b').centre; world.addFuel(world.tileAt(c.i + 1, c.j, c.k), 'oil', 3, {store: 'oil'}); },
    strike: (world, a) => { world.ignite(a.rooms.get('A/1:bed-b').centre, 'furniture'); return 'A/1:bed-b'; }});
  const w = r.world, burstEv = w.events.find(e => e.type === 'burst');
  let oilBelowAt = null; // first time any oil is on the ground storey: look at fall events that carried oil
  const carried = w.events.find(e => e.type === 'fall' && e.carried.includes('oil') && e.to[2] < 2);
  lines.push('', '(d) Rule 7: "A liquid does not wait for the floor to fail. Burning oil runs through a floor at once." Rule 8: "... and through any burnt floor".');
  lines.push('    a 3-tile can of oil upstairs (bed-b), furniture lit beside it: can bursts at ' + round(burstEv?.time) + ' s over ' + burstEv?.tiles + ' tiles on k = ' + burstEv?.at[2] + '; oil first reaches the ground storey at ' + (carried ? round(carried.time) + ' s, carried by a "' + carried.cause + '" fall' : 'never (burnt out upstairs: 14 s per tile-full, floor needs 60 s)'));
}
out('r10-more-scenes.txt', lines);
