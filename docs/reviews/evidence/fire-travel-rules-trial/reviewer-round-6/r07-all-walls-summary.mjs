// Round 6. Counts from r05-all-walls.mjs, and the target 3 misses with what explains each.
//   node reviewer-round-6/r07-all-walls-summary.mjs [tag]
import fs from 'node:fs';
import path from 'node:path';
import {PLANS, median} from '../measure.mjs';
const dir = path.join(import.meta.dirname, 'results', process.argv[2] ?? 'all-walls');
const read = mode => PLANS.flatMap(p => JSON.parse(fs.readFileSync(path.join(dir, p + '-' + mode + '.json'), 'utf8')));
const out = read('out'), ins = read('in');
const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
for (const [name, rows] of [['outside', out], ['inside', ins]]) {
  console.log(name + ': ' + rows.length + ' faces; target 4 in range ' + rows.filter(t4).length + ' (median ' + median(rows.map(r => r.room).filter(v => v !== null)) + ', not all lit in 110 s: ' + rows.filter(r => r.room === null).length + '); target 5 in range ' + rows.filter(t5).length + ', under 40: ' + rows.filter(r => r.half !== null && r.half < 40).length + ', over 70: ' + rows.filter(r => r.half > 70).length + ', none: ' + rows.filter(r => r.half === null).length
    + '; by plan ' + PLANS.map(p => p.replace('hopkins-4-', 'H') + ' ' + rows.filter(r => r.plan === p).filter(t5).length + '/' + rows.filter(r => r.plan === p).length).join(', '));
}
const inBand = v => v >= 2.5 && v <= 3.5, dirs = rows => rows.flatMap(r => (r.climb ?? []).map(v => ({r, v})));
const all = dirs(out), porch = dirs(out.filter(r => r.behindPorch)), other = dirs(out.filter(r => !r.behindPorch));
const c = l => l.filter(x => inBand(x.v)).length + ' of ' + l.length;
console.log('target 3, every ground face struck outside: ' + c(all) + ' directions in range; behind a porch ' + c(porch) + '; other ' + c(other) + ' (below ' + other.filter(x => x.v < 2.5).length + ', above ' + other.filter(x => x.v > 3.5).length + ')');
console.log('misses on walls with nothing against the struck face:');
for (const r of out.filter(r => !r.behindPorch && (r.climb ?? []).some(v => !inBand(v)))) {
  const d = r.detail;
  console.log('  ' + r.plan.padEnd(15) + r.at.padEnd(16) + ' ratio ' + JSON.stringify(r.climb) + ' top layer ' + d.top + ' lit ' + d.up + ' s (column ' + d.column + '); along + : ' + d.plus + ' | along - : ' + d.minus + ' | faces with a deck against them + ' + d.outsideFuelPlus + ', - ' + d.outsideFuelMinus + '; glass first ' + d.glassFirst + ', first thing inside lit ' + d.firstInsideLit);
}
// how the top layer splits the walls
const byTop = {};
for (const r of out.filter(r => !r.behindPorch && r.climb?.length)) (byTop[r.detail.top] ??= []).push(...r.climb);
for (const [top, list] of Object.entries(byTop)) console.log('  walls whose struck column is ' + (+top + 1) + ' layers tall: ' + list.filter(inBand).length + ' of ' + list.length + ' in range, ' + Math.min(...list) + ' to ' + Math.max(...list) + ', median ' + median(list));
