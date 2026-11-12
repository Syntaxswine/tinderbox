// Round 7. Spot-check saved reach surveys (generated on b6cc2a5) against the current kernel.
//   node r07-reach-spot.mjs <open|cover> <plan> <row index> [more row indexes]
import fs from 'node:fs';
import path from 'node:path';
import {burn, round} from '../measure.mjs';
const [which, planId, ...idx] = process.argv.slice(2);
const rows = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'results', 'reach-options', which, 'survey-' + planId + '.json'), 'utf8'));
const rules = which === 'open' ? {reach: 3} : {reach: 3, reachUnderCover: true};
for (const n of idx) {
  const row = rows[+n], r = burn({planId, at: row.at, rules, seconds: 300});
  const now = {room: round(r.roomAll), half: round(r.half), flameUntil: round(r.flameUntil), firstFall: round(r.fall?.time), groundLit: round(r.groundLit?.time), fallToGround: round(r.fallToGround?.time), neverLit: r.never, climb: JSON.stringify(r.climb?.map(v => round(v)) ?? null)};
  const diff = Object.keys(now).filter(k => (k === 'climb' ? JSON.stringify(row.climb ?? null) : row[k]) !== now[k]);
  console.log(which, planId, row.at, diff.length ? 'DIFFERS: ' + diff.map(k => k + ' saved ' + JSON.stringify(row[k]) + ' now ' + now[k]).join('; ') : 'identical on 8 fields (half ' + now.half + ')');
}
