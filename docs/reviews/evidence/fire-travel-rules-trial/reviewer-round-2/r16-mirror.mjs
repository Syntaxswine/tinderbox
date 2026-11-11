// Round 2. A house and its mirror image are the same house. Does the trial give them the same times?
// With no contents (so only the door faces can differ, by one tile) and with all contents (the furniture, oil and coal tiles differ too).
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r16-mirror.mjs <plan>
import {burn, strikesOf, plan, round, ALL} from './measure-var.mjs';
const planId = process.argv[2] ?? 'hopkins-4-12';
const mirrored = id => {
  const p = plan(id), W = p.width;
  return {...p, floors: p.floors.map(f => ({...f, rooms: f.rooms.map(r => ({...r, polygon: r.polygon.map(([x, z]) => [W - x, z])})), windows: f.windows?.map(([x0, z0, x1, z1]) => [W - x0, z0, W - x1, z1]),
    stairs: f.stairs ? {...f.stairs, x: W - f.stairs.x - f.stairs.width} : f.stairs}))};
};
const n = Math.round(plan(planId).width / .5), flip = at => { if (!at.startsWith('wall')) return at; const [, s, ci, cj, side] = at.split(':'); return 'wall:' + (s[0] === 'x' ? 'x' + (s[1] === '+' ? '-' : '+') : s) + ':' + (n - 1 - +ci) + ':' + cj + (side ? ':' + side : ''); };
const census = r => { const c = {}; for (const x of r.initial) c[x.cls] = (c[x.cls] ?? 0) + 1; let glass = 0; for (const f of r.world.faces.values()) if (f.kind === 'glass' || f.kind === 'open') glass++; return JSON.stringify(c); };
let shown = false; const d = {room: [], half: []}; let flips = 0, cases = 0;
for (const at of strikesOf(planId)) for (const [label, contents] of [['empty', {}], ['furnished', ALL]]) {
  if (label === 'empty' && at.startsWith('room')) continue;   // nothing to light
  const a = burn({planId, at, contents, seconds: 110}), b = burn({planId: mirrored(planId), at: flip(at), contents, seconds: 110});
  if (!shown && label === 'furnished') { shown = true; console.log('fuel objects, as drawn:', census(a)); console.log('fuel objects, mirrored:', census(b)); }
  const in4 = v => v !== null && v >= 10 && v <= 20, in5 = v => v !== null && v >= 40 && v <= 70;
  const f = (in4(a.roomAll) !== in4(b.roomAll) ? 1 : 0) + (in5(a.half) !== in5(b.half) ? 1 : 0); flips += f; cases += 2;
  if (label === 'furnished') { d.room.push(Math.abs(a.roomAll - b.roomAll)); d.half.push(Math.abs(a.half - b.half)); }
  console.log(at.padEnd(18), label.padEnd(10), 'room', round(a.roomAll), '->', round(b.roomAll), '(counted ' + a.roomN + ' -> ' + b.roomN + ')', '| half', round(a.half), '->', round(b.half), '(' + round(100 * (b.half - a.half) / a.half, 0) + ' %)', '| first fall', round(a.fall?.time), '->', round(b.fall?.time), f ? '| ' + f + ' verdict(s) flip' : '');
}
console.log(planId + ': furnished strikes ' + d.half.length + '; |change in half| median ' + round(d.half.sort((p, q) => p - q)[Math.floor(d.half.length / 2)]) + ' s, worst ' + round(Math.max(...d.half)) + ' s; |change in room| worst ' + round(Math.max(...d.room.filter(Number.isFinite))) + ' s; target 4 and 5 verdicts that flip: ' + flips + ' of ' + cases);
