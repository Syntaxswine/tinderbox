// Round 4. (a) With reach 0, does anything in the default path depend on the reach numbers?
// (b) Spot-check the two saved reach surveys against the rules they claim (a few strikes each).
import fs from 'node:fs';
import path from 'node:path';
import {burn, round} from '../measure.mjs';
const dir = path.join(import.meta.dirname, '..', 'results');
{
  const base = burn({planId: 'hopkins-4-13', at: 'room:0:kitchen', seconds: 200});
  const other = burn({planId: 'hopkins-4-13', at: 'room:0:kitchen', seconds: 200, rules: {radiantGain: 50, radiantEvery: .1, reachUnderCover: true}, fuels: {grass: {radiates: 1}, embers: {radiates: 1}, clapboard: {radiates: 5}}});
  console.log('(a) reach 0, every other reach number changed (radiantGain 50, radiantEvery 0.1, reachUnderCover true, radiates 1 and 5): event log identical: ' + (JSON.stringify(base.world.events) === JSON.stringify(other.world.events)) + ' (' + base.world.events.length + ' events); sight lines tested ' + base.world.stats.sightLines + ' (oil burst only)');
  const sight = burn({planId: 'hopkins-4-13', at: 'room:0:kitchen', seconds: 200, rules: {sight: .01}});
  console.log('    sight 0.5 -> 0.01 (the one "Rule 6" number the default path does read, for the oil burst): half ' + round(base.half) + ' -> ' + round(sight.half) + ' s; burst tiles ' + base.world.events.find(e => e.type === 'burst')?.tiles + ' -> ' + sight.world.events.find(e => e.type === 'burst')?.tiles);
}
const picks = [['ashland-worker', 0], ['ashland-worker', 9], ['hopkins-4-12', 2], ['hopkins-4-13', 12]];
for (const [name, rules, sub] of [['open', {reach: 3}, 'reach-options/open'], ['everywhere', {reach: 3, reachUnderCover: true}, 'reach-options/cover']]) for (const [planId, n] of picks) {
  const row = JSON.parse(fs.readFileSync(path.join(dir, sub, 'survey-' + planId + '.json'), 'utf8'))[n];
  const r = burn({planId, at: row.at, rules, seconds: 300});
  const same = round(r.half) === row.half && round(r.roomAll) === row.room && round(r.flameUntil) === row.flameUntil && round(r.fall?.time) === row.firstFall;
  console.log('(b) reach ' + name.padEnd(10) + planId.padEnd(15) + row.at.padEnd(18) + ' saved half ' + row.half + ' room ' + row.room + ' flame ' + row.flameUntil + ' fall ' + row.firstFall + ' | re-run half ' + round(r.half) + ' room ' + round(r.roomAll) + ' flame ' + round(r.flameUntil) + ' fall ' + round(r.fall?.time) + ' | ' + (same ? 'SAME' : 'DIFFERENT'));
}
