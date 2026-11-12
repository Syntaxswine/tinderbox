// Round 7. In an upstairs fire on the author's lawn, how does the grass first light? Rule 6's list says that
// downward nothing lights but oil, poured gas and lacquer, and target 8 says fire goes down only by falling.
//   node r10-upstairs-grass.mjs
import {burn, strikesOf, round, PLANS} from '../measure.mjs';
for (const planId of PLANS) for (const at of strikesOf(planId).filter(s => s.startsWith('room:1'))) {
  const r = burn({planId, at, seconds: 120, ground: 'lawn'}), ev = r.world.events;
  const g = ev.find(e => e.type === 'lit' && e.cls === 'grass');
  if (!g) { console.log(planId, at, 'grass never lit in 120 s'); continue; }
  const near = e => Math.abs(e.at?.[0] - g.at[0]) <= 1 && Math.abs(e.at?.[1] - g.at[1]) <= 1;
  const fallsHere = ev.filter(e => e.type === 'fall' && e.time <= g.time && e.to[0] === g.at[0] && e.to[1] === g.at[1] && e.to[2] === 0);
  const fallsNear = ev.filter(e => e.type === 'fall' && e.time <= g.time && Math.abs(e.to[0] - g.at[0]) <= 1 && Math.abs(e.to[1] - g.at[1]) <= 1 && e.to[2] <= 1);
  const litNear = ev.filter(e => e.type === 'lit' && e.time < g.time && near(e) && e.cls !== 'grass').map(e => e.cls + ' k' + e.at[2] + (e.building ? '' : ' (porch)') + ' ' + round(e.time, 1));
  const firstFall = ev.find(e => e.type === 'fall');
  console.log(planId, at, 'grass first lit ' + round(g.time) + ' s at ' + g.at + '; half ' + round(r.half) + '; first fall anywhere ' + round(firstFall?.time) + '; falls into that tile before: ' + fallsHere.length + ', into a tile next to it: ' + fallsNear.length
    + '; lit within one tile in plan before it: ' + (litNear.slice(0, 6).join(', ') || 'nothing'));
}
