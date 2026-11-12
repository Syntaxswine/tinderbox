// Round 7. Detail from results/variant-<name>: when grass first lights, and how long the ground outside walls take to all light after it.
//   node r09-lawn-detail.mjs <variant>
import fs from 'node:fs';
import path from 'node:path';
const PLANS = ['hopkins-4-15', 'hopkins-4-12', 'hopkins-4-09', 'hopkins-4-13', 'ashland-worker', 'monroe-row'];
const rows = PLANS.flatMap(p => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'results', 'variant-' + process.argv[2], 'survey-' + p + '.json'), 'utf8')));
const med = l => { const s = [...l].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const f = v => v.toFixed(1);
for (const [name, test] of [['match outside', r => r.kind === 'wall'], ['match inside', r => r.kind === 'wall-in'], ['ground rooms', r => r.kind === 'room' && !r.floor], ['upstairs rooms', r => r.floor > 0]]) {
  const l = rows.filter(test).filter(r => r.grassLit !== null);
  const last = l.map(r => r.groundWallLast - r.grassLit), p90 = l.map(r => r.groundWall90 - r.grassLit), halfAfter = l.filter(r => r.half !== null).map(r => r.half - r.grassLit);
  console.log(name + ' (' + l.length + '): grass first lit ' + f(Math.min(...l.map(r => r.grassLit))) + ' to ' + f(Math.max(...l.map(r => r.grassLit))) + ' s; last ground outside wall lit ' + f(Math.min(...last)) + ' to ' + f(Math.max(...last)) + ' s after the grass, median ' + f(med(last))
    + '; nine tenths of them ' + f(Math.min(...p90)) + ' to ' + f(Math.max(...p90)) + ', median ' + f(med(p90)) + '; half the house ' + f(Math.min(...halfAfter)) + ' to ' + f(Math.max(...halfAfter)) + ' s after the grass, median ' + f(med(halfAfter)));
}
console.log('ground rooms whose grass lights after 31 s: ' + rows.filter(r => r.kind === 'room' && !r.floor && r.grassLit > 31).map(r => r.plan + ' ' + r.at + ' grass ' + r.grassLit + ' half ' + r.half).join('; '));
console.log('outside-match strikes whose grass lights after 1 s: ' + rows.filter(r => r.kind === 'wall' && r.grassLit > 1).map(r => r.plan + ' ' + r.at + ' grass ' + r.grassLit + ' half ' + r.half).join('; '));
console.log('strikes in range for target 5 that are not upstairs: ' + rows.filter(r => !r.floor && r.half >= 40 && r.half <= 70).map(r => r.plan + ' ' + r.at + ' half ' + r.half + ' grass ' + r.grassLit).join('; '));
