// Round 4. Summary of r05-all-walls: targets 3, 4 and 5 on every ground outside-wall face.
import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(import.meta.dirname, 'results', process.argv[2] ?? 'all-walls');
const rows = fs.readdirSync(dir).filter(f => f.endsWith('.json')).flatMap(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const med = l => { const s = l.filter(v => v !== null).sort((a, b) => a - b), n = s.length; return n ? +(n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2).toFixed(2) : null; };
const in4 = r => r.roomAll !== null && r.roomAll >= 10 && r.roomAll <= 20, in5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
const pct = (l, t) => l.filter(t).length + ' of ' + l.length + ' (' + (100 * l.filter(t).length / Math.max(1, l.length)).toFixed(0) + ' %)';
const rng = l => { const s = l.filter(v => v !== null); return s.length ? Math.min(...s) + ' to ' + Math.max(...s) : 'none'; };
for (const kind of ['out', 'in']) {
  const l = rows.filter(r => r.kind === kind);
  console.log('match held ' + kind + 'side, ' + l.length + ' ground wall faces of ' + new Set(l.map(r => r.plan)).size + ' plans: room in 10-20 s on ' + pct(l, in4) + ', ' + rng(l.map(r => r.roomAll)) + ' s, median ' + med(l.map(r => r.roomAll)) + ', never in 150 s ' + l.filter(r => r.roomAll === null).length
    + ' | half in 40-70 s on ' + pct(l, in5) + ', ' + rng(l.map(r => r.half)) + ' s, median ' + med(l.map(r => r.half)) + ', under 40 s ' + l.filter(r => r.half !== null && r.half < 40).length + ', over 70 or never ' + l.filter(r => r.half === null || r.half > 70).length);
  for (const p of [...new Set(l.map(r => r.plan))]) { const q = l.filter(r => r.plan === p); console.log('   ' + p.padEnd(15) + ' room ' + pct(q, in4) + ' median ' + med(q.map(r => r.roomAll)) + ' | half ' + pct(q, in5) + ' median ' + med(q.map(r => r.half))); }
  for (const porch of [true, false]) { const q = l.filter(r => r.porch === porch); console.log('   ' + (porch ? 'behind a porch' : 'not behind a porch').padEnd(19) + ' room ' + pct(q, in4) + ' median ' + med(q.map(r => r.roomAll)) + ' | half ' + pct(q, in5) + ' median ' + med(q.map(r => r.half))); }
  console.log('   struck a door: ' + l.filter(r => r.cls === 'door').length);
}
const out = rows.filter(r => r.kind === 'out');
for (const [name, l] of [['all', out], ['behind a porch', out.filter(r => r.porch)], ['not behind a porch', out.filter(r => !r.porch)]]) {
  const c = l.flatMap(r => r.climb ?? []);
  console.log('target 3, match outside, ' + name + ': ' + l.filter(r => r.climb?.length).length + ' of ' + l.length + ' faces measurable, ' + c.length + ' directions; in 2.5-3.5: ' + c.filter(v => v >= 2.5 && v <= 3.5).length + ' (' + (100 * c.filter(v => v >= 2.5 && v <= 3.5).length / Math.max(1, c.length)).toFixed(0) + ' %); below ' + c.filter(v => v < 2.5).length + ', above ' + c.filter(v => v > 3.5).length + '; ' + rng(c) + ', median ' + med(c));
}
