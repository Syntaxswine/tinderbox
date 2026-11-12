// Targets 4 and 5 with the match on EVERY ground-layer outside wall tile of a plan (outside and inside), not
// the 4 mid-wall tiles the survey uses. 110 s per burn is enough for room and half (both under 80 s in the survey).
//   node r13-all-walls.mjs <plan>      writes results/r13-<plan>.json; prints a summary. Control: the survey's own 8 wall strikes are among them.
import fs from 'node:fs';
import path from 'node:path';
import {make, house, outsideWalls, burn, ALL, round, here} from './lib.mjs';
const planId = process.argv[2];
const world = make(), a = house(world, 'A', planId, 6, 6, ALL);
const strikes = outsideWalls(world, a).map(w => 'wall:' + w.side + ':' + (w.tile.i - a.origin[0]) + ':' + (w.tile.j - a.origin[1]));
const rows = [];
for (const s of strikes) for (const suffix of ['', ':in']) { const r = burn({planId, at: s + suffix, seconds: 110}); rows.push({at: s + suffix, kind: suffix ? 'in' : 'out', room: round(r.roomAll), half: round(r.half)}); }
fs.writeFileSync(path.join(here, 'results', 'r13-' + planId + '.json'), JSON.stringify(rows) + '\n');
const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
for (const kind of ['out', 'in']) { const l = rows.filter(r => r.kind === kind), rm = l.map(r => r.room).filter(v => v !== null).sort((x, y) => x - y), hf = l.map(r => r.half).filter(v => v !== null).sort((x, y) => x - y);
  console.log(planId.padEnd(15) + kind.padEnd(4) + 'n ' + l.length + ' | T4 in range ' + l.filter(t4).length + ', room ' + rm[0] + ' to ' + rm.at(-1) + ' median ' + rm[Math.floor(rm.length / 2)] + ', not alight in 110 s ' + (l.length - rm.length) + ' | T5 in range ' + l.filter(t5).length + ', half ' + hf[0] + ' to ' + hf.at(-1) + ' median ' + hf[Math.floor(hf.length / 2)]); }
