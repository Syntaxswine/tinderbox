// Round 1, probe 12: the gaps the shipped street actually has. src/content/neighborhood.js places the detached houses
// 3 to 5 m apart (x = 3, 15, 27 for widths 7, 8; x = 11, 24, 33 for widths 8, 10, 6) on a grass patch; no pair is 2 m apart.
// Two Hopkins 15 houses at 2, 3 and 5 m, with bare ground between (as the trial) and with lawn everywhere outside.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r12-shipped-gaps.mjs
import {ALL, round, out, createVar, house, lawn, wallTiles, lightFuel} from './lib.mjs';
const lines = [], pad = (s, n) => String(s ?? 'never').padEnd(n);
function pair(gap, grass, where, seconds = 150) {
  const world = createVar();
  const a = house(world, 'A', 'hopkins-4-15', 6, 6, ALL), b = house(world, 'B', 'hopkins-4-15', 16 + gap, 6);
  if (grass) lawn(world, a.origin[0] - 6, a.origin[1] - 6, b.origin[0] + 26, a.origin[1] + 26);   // lawn() skips cells that already hold a tile
  if (where === 'facing') world.ignite(world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 0), 'clapboard');
  else { const w = wallTiles(a, world, 0).filter(x => x.side === 'x-'); const m = w[Math.floor(w.length / 2)]; lightFuel(world, m.tile, m.fuel); }
  for (let n = 0; n < seconds * 30; n++) world.step();
  const grassLit = world.events.find(e => e.type === 'lit' && e.cls === 'grass'), bLit = world.events.find(e => e.type === 'lit' && e.building === 'B');
  const bCount = world.events.filter(e => e.type === 'lit' && e.building === 'B').length, grassCount = world.events.filter(e => e.type === 'lit' && e.cls === 'grass').length;
  return pad(grass ? round(grassLit?.time) + ' s (' + grassCount + ')' : '-', 16) + pad(bLit ? round(bLit.time) + ' s' : 'never', 10) + bCount;
}
lines.push(pad('gap m', 7) + pad('ground', 8) + pad('match', 9) + pad('first grass lit', 16) + pad('B lit', 10) + 'B fuels lit by 150 s');
for (const gap of [2, 3, 5]) for (const grass of [false, true]) for (const where of ['facing', 'far']) lines.push(pad(gap, 7) + pad(grass ? 'lawn' : 'bare', 8) + pad(where, 9) + pair(gap, grass, where));
out('r12-shipped-gaps.txt', lines);
