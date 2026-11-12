// Round 7. Summary of r03-allfaces results: targets 3, 4 and 5 over every ground outside-wall face.
//   node r13-allfaces-summary.mjs <bare|lawn>
import fs from 'node:fs';
import path from 'node:path';
const PLANS = ['hopkins-4-15', 'hopkins-4-12', 'hopkins-4-09', 'hopkins-4-13', 'ashland-worker', 'monroe-row'];
const rows = PLANS.flatMap(p => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'results', 'allfaces-' + process.argv[2], 'faces-' + p + '.json'), 'utf8')));
const out = rows.filter(r => r.kind === 'wall'), inn = rows.filter(r => r.kind === 'wall-in');
const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70, band = l => l.filter(v => v >= 2.5 && v <= 3.5).length + ' of ' + l.length;
const med = l => { const s = [...l].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
console.log(process.argv[2] + ': ' + out.length + ' faces (' + out.filter(r => r.porch).length + ' behind a porch deck)');
const climbs = l => l.flatMap(r => r.climb ?? []);
console.log(' target 3: ' + band(climbs(out)) + ' directions in range; behind a porch ' + band(climbs(out.filter(r => r.porch))) + '; other walls ' + band(climbs(out.filter(r => !r.porch))) + '; range ' + Math.min(...climbs(out)) + ' to ' + Math.max(...climbs(out)) + ', median ' + med(climbs(out)));
console.log('   other walls out of range: ' + out.filter(r => !r.porch && (r.climb ?? []).some(v => v < 2.5 || v > 3.5)).map(r => r.plan.replace('hopkins-4-', 'H') + ' ' + r.at + ' ' + JSON.stringify(r.climb)).join('; '));
console.log(' target 4: outside ' + out.filter(t4).length + ' of ' + out.length + ', median ' + med(out.map(r => r.room).filter(v => v !== null)) + ' s; inside ' + inn.filter(t4).length + ' of ' + inn.length + ', median ' + med(inn.map(r => r.room).filter(v => v !== null)));
console.log(' target 5: outside ' + out.filter(t5).length + ' of ' + out.length + ', median ' + med(out.map(r => r.half).filter(v => v !== null)) + ' s; inside ' + inn.filter(t5).length + ' of ' + inn.length + ', median ' + med(inn.map(r => r.half).filter(v => v !== null))
  + '; misses at 40 s or more: ' + rows.filter(r => !t5(r) && (r.half === null || r.half >= 40)).length + ' (half not reached in 80 s: ' + rows.filter(r => r.half === null).length + ')');
