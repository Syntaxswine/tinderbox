// Targets 3, 4 and 5 with a match on EVERY ground wall face of a plan (not the survey's four), 150 s each, furnished.
//   node reviewer-round-5/r06-all-walls.mjs <plan> <out|in>      writes reviewer-round-5/results/all-walls/<plan>-<out|in>.json
//   node reviewer-round-5/r06-all-walls.mjs summary
import fs from 'node:fs';
import path from 'node:path';
import {make, burn, house, outsideWalls, round, PLANS, ALL} from '../measure.mjs';
const dir = path.join(import.meta.dirname, 'results', 'all-walls');
const [planId, mode] = process.argv.slice(2);
const med = l => { const s = [...l].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
if (planId === 'summary') {
  for (const m of ['out', 'in']) {
    const rows = PLANS.flatMap(p => JSON.parse(fs.readFileSync(path.join(dir, p + '-' + m + '.json'), 'utf8')));
    const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
    console.log('match held ' + (m === 'out' ? 'outside' : 'inside') + ', ' + rows.length + ' ground wall faces:');
    console.log('  target 4: ' + rows.filter(t4).length + ' in range, median ' + round(med(rows.map(r => r.room).filter(v => v !== null))) + ' s, never ' + rows.filter(r => r.room === null).length);
    console.log('  target 5: ' + rows.filter(t5).length + ' in range, median ' + round(med(rows.map(r => r.half).filter(v => v !== null))) + ' s; under 40 s: ' + rows.filter(r => r.half !== null && r.half < 40).length + ', over 70 s: ' + rows.filter(r => r.half > 70).length + ', never in 150 s: ' + rows.filter(r => r.half === null).length);
    for (const p of PLANS) { const l = rows.filter(r => r.plan === p); console.log('    ' + p.padEnd(15) + l.filter(t5).length + ' of ' + l.length + ' (' + Math.round(100 * l.filter(t5).length / l.length) + ' %), median ' + round(med(l.map(r => r.half).filter(v => v !== null))) + ' s'); }
    if (m === 'out') {
      const band = l => { const v = l.flatMap(r => r.climb ?? []); return v.filter(x => x >= 2.5 && x <= 3.5).length + ' of ' + v.length + ' directions in 2.5 to 3.5 (' + (v.length ? Math.min(...v) + ' to ' + Math.max(...v) + ', median ' + round(med(v)) : '') + '; below ' + v.filter(x => x < 2.5).length + ', above ' + v.filter(x => x > 3.5).length + ')'; };
      console.log('  target 3: all ' + band(rows)); console.log('    behind a porch: ' + band(rows.filter(r => r.behindPorch))); console.log('    others: ' + band(rows.filter(r => !r.behindPorch)));
    }
  }
} else {
  const world = make(), a = house(world, 'A', planId, 6, 6, ALL), rows = [];
  for (const w of outsideWalls(world, a)) {
    const at = 'wall:' + w.side + ':' + (w.tile.i - a.origin[0]) + ':' + (w.tile.j - a.origin[1]) + (mode === 'in' ? ':in' : '');
    const r = burn({planId, at, seconds: 150});
    rows.push({plan: planId, at, struck: r.struck.what, behindPorch: r.struck.behindPorch, room: round(r.roomAll), half: round(r.half), climb: r.climb?.map(v => round(v)) ?? null});
  }
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, planId + '-' + mode + '.json'), JSON.stringify(rows, null, 1) + '\n');
}
