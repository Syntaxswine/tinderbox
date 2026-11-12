// Targets 4 and 5 from one or more survey directories.  node summarise.mjs <dir relative to this folder> ...
import fs from 'node:fs';
import path from 'node:path';
import {PLANS, median, round} from './measure.mjs';
for (const dir of process.argv.slice(2)) {
  const rows = PLANS.flatMap(p => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, dir, 'survey-' + p + '.json'), 'utf8')));
  const t5 = r => r.half !== null && r.half >= 40 && r.half <= 70, t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, n = (l, f) => l.filter(f).length + ' of ' + l.length;
  const w = rows.filter(r => r.kind === 'wall'), wi = rows.filter(r => r.kind === 'wall-in'), g = rows.filter(r => r.kind === 'room' && !r.floor), u = rows.filter(r => r.floor > 0);
  console.log(dir.padEnd(30) + ' half in 40-70 s: ' + n(rows, t5) + ' (outside wall ' + n(w, t5) + ', inside wall ' + n(wi, t5) + ', ground rooms ' + n(g, t5) + ', upstairs ' + n(u, t5) + '), median ' + round(median(rows.map(r => r.half).filter(v => v !== null)))
    + ' s, under 40 s: ' + rows.filter(r => r.half !== null && r.half < 40).length + ', never half in 300 s: ' + rows.filter(r => r.half === null).length + '; room 10-20 s: outside ' + n(w, t4) + ', inside ' + n(wi, t4)
    + '; flame 90 s or more: ' + n(rows, r => r.flameUntil >= 90));
}
