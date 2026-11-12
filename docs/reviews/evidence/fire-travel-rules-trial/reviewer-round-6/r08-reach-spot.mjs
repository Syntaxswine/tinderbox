// Round 6. Spot-check saved reach-survey rows (generated on b6cc2a5) against the current kernel.
//   node reviewer-round-6/r08-reach-spot.mjs <open|cover> <plan> <strike>
import fs from 'node:fs';
import path from 'node:path';
import {burn, round} from '../measure.mjs';
const [option, planId, at] = process.argv.slice(2);
const rules = option === 'open' ? {reach: 3} : {reach: 3, reachUnderCover: true};
const saved = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'results', 'reach-options', option, 'survey-' + planId + '.json'), 'utf8')).find(r => r.at === at);
const r = burn({planId, at, rules, seconds: 300});
const now = {room: round(r.roomAll), half: round(r.half), flameUntil: round(r.flameUntil), firstFall: round(r.fall?.time), upstairsLit: round(r.upstairsLit?.time), groundLit: round(r.groundLit?.time), groundRoofLit: round(r.groundRoofLit?.time), fallToGround: round(r.fallToGround?.time), neverLit: r.never};
const diff = Object.keys(now).filter(k => now[k] !== saved[k]);
console.log(option + ' ' + planId + ' ' + at + ': ' + (diff.length ? 'DIFFERS ' + diff.map(k => k + ' saved ' + saved[k] + ' now ' + now[k]).join('; ') : 'identical on ' + Object.keys(now).length + ' fields (room ' + now.room + ', half ' + now.half + ', flame ' + now.flameUntil + ')'));
