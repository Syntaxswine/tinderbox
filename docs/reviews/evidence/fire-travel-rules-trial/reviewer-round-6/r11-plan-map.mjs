// Round 6. A character map of a plan as the scene builds it: each storey's rooms, porch (P), and the
// tiles of the upper storey that have no ground room under them (shown on the ground map as ^).
//   node reviewer-round-6/r11-plan-map.mjs <plan>
import {make, house, ALL} from '../measure.mjs';
const planId = process.argv[2] ?? 'hopkins-4-09';
const w = make(), a = house(w, 'A', planId, 6, 6, ALL), [oi, oj] = a.origin;
const cell = new Map(), names = new Map();
for (const rec of a.rooms.values()) { if (!names.has(rec.label)) names.set(rec.label, String.fromCharCode(97 + names.size)); for (const t of rec.tiles) if (t.k % 2 === 0) cell.set(t.k / 2 + ':' + (t.i - oi) + ':' + (t.j - oj), names.get(rec.label)); }
const porch = new Set(a.porch.filter(t => t.k === 0).map(t => (t.i - oi) + ':' + (t.j - oj)));
for (const f of [0, 1]) {
  console.log(planId + ' storey ' + f + '   (x across, 0 at the left; y down, first row y = -5)');
  for (let j = -5; j < a.plan.depth * 2 + 3; j++) {
    let line = String(j).padStart(3) + ' ';
    for (let i = -3; i < a.plan.width * 2 + 3; i++) line += cell.get(f + ':' + i + ':' + j) ?? (f === 0 && cell.get('1:' + i + ':' + j) ? '^' : f === 0 && porch.has(i + ':' + j) ? 'P' : '.');
    console.log(line);
  }
}
console.log([...names].map(([label, c]) => c + ' = ' + label).join(', '));
// doors and glass on the ground layer
const doors = [];
for (const rec of a.rooms.values()) for (const t of rec.tiles) for (const f of t.fuels) if (f.cls === 'door') doors.push('(' + (t.i - oi) + ',' + (t.j - oj) + ',k' + t.k + ') ' + 'xy'[f.face.axis] + (f.face.step > 0 ? '+' : '-') + (w.across(t, f.face)?.building ? ' inside' : ' FRONT'));
console.log('doors: ' + doors.join('; '));
