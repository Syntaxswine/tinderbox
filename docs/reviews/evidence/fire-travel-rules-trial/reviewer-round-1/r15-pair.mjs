// Round 1, probe 15: two Hopkins 15 houses, one gap, one run. The quick reproduction for the reach items.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r15-pair.mjs <gap m> <bare|lawn> [rules json]
import {ALL, round, createVar, house, lawn} from './lib.mjs';
const gap = +(process.argv[2] ?? 2), ground = process.argv[3] ?? 'bare', rules = JSON.parse(process.argv[4] ?? '{}');
const world = createVar({rules});
const a = house(world, 'A', 'hopkins-4-15', 6, 6, ALL), b = house(world, 'B', 'hopkins-4-15', 16 + gap, 6);
if (ground === 'lawn') lawn(world, a.origin[0] - 6, a.origin[1] - 6, b.origin[0] + 26, a.origin[1] + 26);
world.ignite(world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 0), 'clapboard');
const fuelsA = [...a.rooms.values()].flatMap(r => r.tiles).flatMap(t => t.fuels), bTiles = [...world.tiles.values()].filter(t => t.building === 'B');
let maxRad = 0, lit = null;
for (let n = 0; n < 90 * 30 && !lit; n++) { world.step(); if (n % 15 === 0) for (const t of bTiles) if (t.rad > maxRad) maxRad = t.rad; lit = world.events.find(e => e.type === 'lit' && e.building === 'B'); }
const grass = world.events.find(e => e.type === 'lit' && e.cls === 'grass');
console.log('gap ' + gap + ' m, ' + ground + ', rules ' + JSON.stringify(rules) + ': B ' + (lit ? 'lit at ' + round(lit.time) + ' s with ' + round(100 * fuelsA.filter(f => f.lit).length / fuelsA.length, 1) + ' % of A burning' : 'never lit in 90 s')
  + '; largest radiant on B ' + round(maxRad, 2) + ' (clapboard needs 1.1)' + (grass ? '; first grass lit at ' + round(grass.time) + ' s' : ''));
