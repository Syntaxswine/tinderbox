// Round 1, probe 3 summary: reads results/r03-<plan>.json and prints each target's pass count across plans and strikes.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r03-summary.mjs
import fs from 'node:fs';
import path from 'node:path';
import {out} from './lib.mjs';
const dir = path.join(import.meta.dirname, 'results');
const rows = fs.readdirSync(dir).filter(f => /^r03-.*\.json$/.test(f)).flatMap(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const lines = [], pad = (s, n) => String(s ?? '-').padEnd(n);
lines.push('one furnished house, one strike, 300 s. t4 = every fuel that started in the struck room lit; t5 = half of all the house fuels ever lit; t5b = half burning at once;');
lines.push('t6 = last flame other than coal; t7 = first roof part or upper floor to fall; ratio = (up to top layer)/(3 m along), each way along the wall.');
lines.push(pad('plan', 15) + pad('strike', 18) + pad('t4', 8) + pad('t5', 8) + pad('t5b', 8) + pad('t6', 8) + pad('t7', 14) + pad('up s', 7) + pad('along s', 16) + pad('ratio', 14) + 't8: fall / ground lit / pass');
for (const r of rows) lines.push(pad(r.plan, 15) + pad(r.strike, 18) + pad(r.t4, 8) + pad(r.t5, 8) + pad(r.t5burning, 8) + pad(r.t6, 8) + pad(r.t7 + ' ' + r.t7cause, 14) + pad(r.up, 7) + pad((r.along ?? []).join(','), 16) + pad((r.ratios ?? []).join(','), 14)
  + (r.floor > 0 ? r.t8fall + ' ' + r.t8cause + ' / ' + r.t8ground + ' ' + r.t8cls + ' / ' + (r.t8pass ? 'PASS' : 'MISS') : ''));
const count = (list, test) => list.filter(test).length + ' of ' + list.length;
const range = (list, f) => { const v = list.map(f).filter(x => x !== null && x !== undefined); return v.length ? Math.min(...v) + ' to ' + Math.max(...v) : 'none'; };
const walls = rows.filter(r => r.kind === 'wall'), up = rows.filter(r => r.floor > 0), ground = rows.filter(r => r.floor === 0);
lines.push('', 'TOTALS over ' + rows.length + ' runs (' + new Set(rows.map(r => r.plan)).size + ' plans)');
lines.push('target 3 (ratio 2.5 to 3.5): wall strikes with EVERY measured direction in range: ' + count(walls, r => r.ratios.length && r.ratios.every(x => x >= 2.5 && x <= 3.5)) + '; individual ratios in range: ' + count(walls.flatMap(r => r.ratios), x => x >= 2.5 && x <= 3.5) + '; range ' + range(walls.flatMap(r => r.ratios).map(x => ({x})), o => o.x) + '; no measure (fire never reached the top by the same face): ' + count(walls, r => !r.ratios.length));
lines.push('target 4 (struck room fully alight 10 to 20 s): wall strikes ' + count(walls, r => r.t4 >= 10 && r.t4 <= 20) + ', range ' + range(walls, r => r.t4) + ' s; all strikes ' + count(rows, r => r.t4 >= 10 && r.t4 <= 20) + ', range ' + range(rows, r => r.t4) + ' s; under 10 s: ' + count(rows, r => r.t4 !== null && r.t4 < 10) + '; over 20 s: ' + count(rows, r => r.t4 > 20) + '; never: ' + count(rows, r => r.t4 === null));
lines.push('target 5 (half the house 40 to 70 s): ' + count(rows, r => r.t5 >= 40 && r.t5 <= 70) + ', range ' + range(rows, r => r.t5) + ' s; by "half burning at once": ' + count(rows, r => r.t5burning >= 40 && r.t5burning <= 70) + ', range ' + range(rows, r => r.t5burning) + ' s');
lines.push('target 6 (flame 90 s or more): ' + count(rows, r => r.t6 >= 90) + ', range ' + range(rows, r => r.t6) + ' s');
lines.push('target 7 (first fall 60 to 150 s): ' + count(rows, r => r.t7 >= 60 && r.t7 <= 150) + ', range ' + range(rows, r => r.t7) + ' s');
lines.push('target 8 (upstairs strikes: ground lit only after a fall, within 5 s): ' + count(up, r => r.t8pass) + '; ground lit BEFORE any fall: ' + count(up, r => r.t8ground !== null && (r.t8fall === null || r.t8ground < r.t8fall)) + '; more than 5 s after: ' + count(up, r => r.t8fall !== null && r.t8ground - r.t8fall > 5));
lines.push('fuels never lit at 300 s: range ' + range(rows, r => r.never) + '; ledger worst ' + Math.max(...rows.map(r => Math.abs(r.ledger))).toExponential(1) + '; tiles still active at 300 s: ' + range(rows, r => r.activeAtEnd));
for (const plan of new Set(rows.map(r => r.plan))) { const l = rows.filter(r => r.plan === plan); lines.push('  ' + pad(plan, 15) + ' t4 in range ' + count(l, r => r.t4 >= 10 && r.t4 <= 20) + ' (' + range(l, r => r.t4) + '); t5 ' + count(l, r => r.t5 >= 40 && r.t5 <= 70) + ' (' + range(l, r => r.t5) + '); t6 ' + count(l, r => r.t6 >= 90) + ' (' + range(l, r => r.t6) + '); t7 ' + count(l, r => r.t7 >= 60 && r.t7 <= 150) + ' (' + range(l, r => r.t7) + ')'); }
out('r03-summary.txt', lines);
