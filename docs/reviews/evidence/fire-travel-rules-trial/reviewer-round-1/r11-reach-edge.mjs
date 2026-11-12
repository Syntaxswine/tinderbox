// Round 1, probe 11: how close to its edge does target 11 sit? Reach is measured between tile CENTRES, and the tiles that
// carry a wall are the ones inside it, so a 2 m gap is 2.5 m centre to centre. Sweep rules.reach and rules.radiantGain.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r11-reach-edge.mjs
import {ALL, round, out, createVar, house} from './lib.mjs';
const lines = [], pad = (s, n) => String(s ?? 'never').padEnd(n);
function pair(gap, rules, seconds = 120) {
  const world = createVar({rules});
  const a = house(world, 'A', 'hopkins-4-15', 6, 6, ALL); house(world, 'B', 'hopkins-4-15', 16 + gap, 6);
  world.ignite(world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 0), 'clapboard');
  const bTiles = [...world.tiles.values()].filter(t => t.building === 'B'); let maxRad = 0;
  for (let n = 0; n < seconds * 30; n++) { world.step(); if (n % 15 === 0) for (const t of bTiles) if (t.rad > maxRad) maxRad = t.rad; const lit = world.events.find(e => e.type === 'lit' && e.building === 'B'); if (lit) return round(lit.time) + ' s'; }
  return 'never (' + round(maxRad, 2) + ')';
}
lines.push('B first lit (or never, with the largest radiant it received; clapboard needs 1.1). Match on A\'s facing wall. CONTROL is reach 3, gain 0.5.');
lines.push(pad('reach m', 9) + pad('gain', 6) + pad('gap 1.5 m', 16) + pad('gap 2 m', 16) + pad('gap 2.5 m', 16) + 'gap 3 m');
for (const [reach, gain] of [[3, .5], [2.5, .5], [2.75, .5], [2.9, .5], [3.25, .5], [3.5, .5], [4, .5], [3, .25], [3, .3], [3, .4], [3, 1], [3, 2]])
  lines.push(pad(reach, 9) + pad(gain, 6) + pad(pair(1.5, {reach, radiantGain: gain}), 16) + pad(pair(2, {reach, radiantGain: gain}), 16) + pad(pair(2.5, {reach, radiantGain: gain}), 16) + pair(3, {reach, radiantGain: gain}));
out('r11-reach-edge.txt', lines);
