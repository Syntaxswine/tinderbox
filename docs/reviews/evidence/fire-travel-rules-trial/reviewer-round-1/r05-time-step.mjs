// Round 1, probe 5: the same rules and numbers at other time steps. kernel-var.mjs is ../kernel.mjs with DT a parameter
// (r02 shows it reproduces the original at 1/30 s). The trial's scenes and strikes; the trial's measures.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r05-time-step.mjs
import {burn, ALL, round, out, createVar, lawn, paving, house, PITCH, LAYER} from './lib.mjs';
const lines = [], steps = [[120, 1 / 120], [60, 1 / 60], [30, 1 / 30], [20, 1 / 20], [15, 1 / 15], [10, 1 / 10]];
const runFor = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
const firstLit = (world, test) => world.events.find(e => e.type === 'lit' && test(e))?.time ?? null;
const rows = [];
for (const [hz, dt] of steps) {
  const row = {hz};
  { // 1
    const world = createVar({dt}); lawn(world, 0, 0, 121, 121); world.ignite(world.tileAt(60, 60, 0)); runFor(world, 20);
    const v = r => { const s = []; for (let a = 0; a < 8; a++) { const di = Math.round(r * Math.cos(a * Math.PI / 4)), dj = Math.round(r * Math.sin(a * Math.PI / 4)), t = firstLit(world, e => e.at[0] === 60 + di && e.at[1] === 60 + dj); s.push(t ? Math.hypot(di, dj) * PITCH / t : 0); } return s; };
    const s = v(12), mean = s.reduce((a, b) => a + b, 0) / 8;
    row.grass = round(mean, 2); row.grassSpread = round(100 * (Math.max(...s) - Math.min(...s)) / mean, 1); row.grassLit = world.events.filter(e => e.type === 'lit').length;
  }
  { // 10
    const world = createVar({dt}); lawn(world, 0, 0, 20, 21); paving(world, 20, 0, 21, 21); lawn(world, 21, 0, 41, 21); world.ignite(world.tileAt(2, 10, 0)); runFor(world, 30);
    row.paving = round(firstLit(world, e => e.at[0] >= 21));
  }
  { // 2
    const world = createVar({dt}); house(world, 'A', 'hopkins-4-15', 6, 6); lawn(world, 4, 12, 12, 32); world.ignite(world.tileAt(5, 22, 0)); runFor(world, 20);
    const reach = firstLit(world, e => e.cls === 'grass' && e.at[0] === 11), wall = firstLit(world, e => e.cls === 'clapboard');
    row.wallCatch = wall !== null && reach !== null ? round(wall - reach) : null;
  }
  { // 3
    const world = createVar({dt}); const a = house(world, 'A', 'hopkins-4-15', 6, 6); const [oi, oj] = a.origin;
    world.ignite(world.tileAt(oi, oj + 12, 0), 'clapboard'); runFor(world, 60);
    const wallAt = (cj, k) => firstLit(world, e => e.cls === 'clapboard' && e.at[0] === oi && e.at[1] === oj + cj && e.at[2] === k);
    const along = wallAt(18, 0), up = wallAt(12, 3);
    row.up = round(3 * LAYER / up); row.along = round(3 / along); row.ratio = round((3 * LAYER / up) / (3 / along), 2);
  }
  { // 4-7, 11
    const r = burn({seconds: 200, neighbours: [['B', 18, 6]], world: {dt}, strike: (world, a) => { const t = world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 0); world.ignite(t, 'clapboard'); return t.room; }});
    row.t4 = round(r.roomAll); row.t5 = round(r.half); row.t6 = round(r.flameUntil); row.t7 = round(r.fall?.time); row.b = round(r.neighbours.B); row.ledger = r.ledger.toExponential(0);
  }
  { // 8
    const r = burn({seconds: 80, contents: {furniture: true}, world: {dt}, strike: (world, a) => { world.ignite(a.rooms.get('A/1:bed-a').centre, 'furniture'); return 'A/1:bed-a'; }});
    const ground = firstLit(r.world, e => e.at[2] < 2), fall = r.world.events.find(e => e.type === 'fall' && e.from[2] >= 2 && e.to[2] < 2);
    row.t8fall = round(fall?.time); row.t8ground = round(ground);
  }
  rows.push(row); console.error(JSON.stringify(row));
}
const pad = (s, n) => String(s ?? 'never').padEnd(n);
lines.push('Same rules, same numbers, same scenes; only the step changes. 1/30 s is the trial\'s step (CONTROL).');
lines.push(pad('step', 8) + pad('1 grass m/s', 13) + pad('spread %', 10) + pad('grass lit', 11) + pad('10 paving', 11) + pad('2 wall s', 10) + pad('3 up', 7) + pad('along', 7) + pad('ratio', 7) + pad('4 room s', 10) + pad('5 half s', 10) + pad('6 flame', 9) + pad('7 fall', 8) + pad('11 B lit', 10) + pad('8 fall', 8) + pad('8 ground', 10) + 'ledger');
for (const r of rows) lines.push(pad('1/' + r.hz, 8) + pad(r.grass, 13) + pad(r.grassSpread, 10) + pad(r.grassLit, 11) + pad(r.paving === null ? 'no cross' : r.paving, 11) + pad(r.wallCatch, 10) + pad(r.up, 7) + pad(r.along, 7) + pad(r.ratio, 7) + pad(r.t4, 10) + pad(r.t5, 10) + pad(r.t6, 9) + pad(r.t7, 8) + pad(r.b, 10) + pad(r.t8fall, 8) + pad(r.t8ground, 10) + r.ledger);
out('r05-time-step.txt', lines);
