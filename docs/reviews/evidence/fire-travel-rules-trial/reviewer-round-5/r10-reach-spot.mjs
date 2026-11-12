// Spot-check of the two saved reach surveys: re-run a few strikes with the same rules and compare every field of the saved row.
//   node reviewer-round-5/r10-reach-spot.mjs <open|cover> <plan> <strike> [<plan> <strike> ...]
import fs from 'node:fs';
import path from 'node:path';
import {burn, round} from '../measure.mjs';
const [option, ...rest] = process.argv.slice(2), rules = option === 'open' ? {reach: 3} : {reach: 3, reachUnderCover: true};
for (let n = 0; n < rest.length; n += 2) {
  const planId = rest[n], at = rest[n + 1];
  const saved = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'results', 'reach-options', option, 'survey-' + planId + '.json'), 'utf8')).find(r => r.at === at);
  const r = burn({planId, at, rules, seconds: 300});
  const mine = {room: round(r.roomAll), half: round(r.half), flameUntil: round(r.flameUntil), firstFall: round(r.fall?.time), upstairsLit: round(r.upstairsLit?.time), groundLit: round(r.groundLit?.time), fallToGround: round(r.fallToGround?.time), neverLit: r.never, ledger: r.ledger};
  const diff = Object.keys(mine).filter(key => mine[key] !== saved[key]);
  console.log(option + ' ' + planId + ' ' + at + ': ' + (diff.length ? 'DIFFERS in ' + diff.map(key => key + ' ' + saved[key] + ' -> ' + mine[key]).join(', ') : 'identical (room ' + mine.room + ', half ' + mine.half + ', flame ' + mine.flameUntil + ', first fall ' + mine.firstFall + ')'));
}
