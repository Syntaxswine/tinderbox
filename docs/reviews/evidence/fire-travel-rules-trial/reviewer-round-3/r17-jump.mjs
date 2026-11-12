// r14 found that nine unrelated one-number changes of 20 % each move "half the house" for the Hopkins 15
// kitchen strike from 45.77 s to 39.8-40.4 s. What is the event that flips?
//   node r17-jump.mjs
import {burn, round} from './lib.mjs';
for (const [name, rules, fuels] of [['base', {}, {}], ['up x0.8', {up: 2.4}, {}], ['storeyPass x0.8', {storeyPass: .04}, {}], ['partition.out x0.8', {}, {partition: {out: .8}}], ['up x0.9', {up: 2.7}, {}], ['up x0.95', {up: 2.85}, {}], ['up x1.05', {up: 3.15}, {}], ['up x1.1', {up: 3.3}, {}]]) {
  const r = burn({at: 'room:0:kitchen', seconds: 120, rules, fuels}), ev = r.world.events;
  const lit = ev.filter(e => e.type === 'lit' && e.building === 'A');
  const firstOf = (test) => lit.find(test)?.time ?? null, q = f => { const all = lit.map(e => e.time).sort((a, b) => a - b); return all[Math.floor(f * r.n)] ?? null; };
  let roofs = 0, fromAir = 0; for (const rec of r.a.rooms.values()) for (const t of rec.tiles) for (const f of t.fuels) if (f.cls === 'roof') { roofs++; if (f.near && f.near.k > t.k) fromAir++; }
  console.log(name.padEnd(20) + 'half ' + round(r.half) + ' | bursts ' + ev.filter(e => e.type === 'burst').map(e => round(e.time)).join(', ') + ' | first glass ' + round(ev.find(e => e.type === 'glass')?.time) + ' | first low roof lit ' + round(firstOf(e => e.cls === 'roof' && e.at[2] < 2)) + ', first top roof lit ' + round(firstOf(e => e.cls === 'roof' && e.at[2] >= 2))
    + ' | first upstairs lit ' + round(firstOf(e => e.at[2] >= 2)) + ' | 10 % ' + round(q(.1)) + ' 25 % ' + round(q(.25)) + ' 40 % ' + round(q(.4)) + ' | roofs from air ' + fromAir + '/' + roofs);
}
