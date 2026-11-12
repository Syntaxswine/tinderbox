// Rule 6 (reach across a gap) is withdrawn from the proposal. This measures what each form of it would buy
// and cost, with every other number the same, so the owner can decide (round 1 decision 2).
//   node docs/reviews/evidence/fire-travel-rules-trial/reach-options.mjs
// Needs three surveys first (see README): results/survey-*.json (no reach), results/reach-options/open/
// (reach 3 m, only for tiles open to the sky) and results/reach-options/cover/ (reach 3 m everywhere).
// Run nothing else at the same time: it times steps.
import fs from 'node:fs';
import path from 'node:path';
import {burn, strikesOf, round, median, PLANS} from './measure.mjs';
import {pair} from './pair.mjs';

const dir = path.join(import.meta.dirname, 'results'), lines = [];
const say = text => { lines.push(text); console.log(text); };
const OPTIONS = [
  {name: 'no reach (the rules as proposed)', rules: {}, survey: '.'},
  {name: 'reach 3 m, tiles open to the sky only', rules: {reach: 3}, survey: 'reach-options/open'},
  {name: 'reach 3 m, everywhere', rules: {reach: 3, reachUnderCover: true}, survey: 'reach-options/cover'}
];
const farWall = planId => strikesOf(planId).find(s => s.startsWith('wall:x-') && !s.endsWith(':in'));
for (const option of OPTIONS) {
  const rows = PLANS.flatMap(planId => { const file = path.join(dir, option.survey, 'survey-' + planId + '.json'); return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []; });
  const walls = rows.filter(r => r.kind === 'wall'), wallsIn = rows.filter(r => r.kind === 'wall-in');
  const in4 = r => r.room !== null && r.room >= 10 && r.room <= 20, in5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
  const pairs = PLANS.map(planId => pair(2, 'bare', farWall(planId), option.rules, {}, 200, planId));
  const cost = burn({seconds: 150, timed: true, rules: option.rules});
  say(option.name);
  say('  survey of ' + rows.length + ' strikes: half the house in 40 to 70 s on ' + rows.filter(in5).length + ', median ' + round(median(rows.map(r => r.half).filter(v => v !== null)))
    + ' s; room in 10 to 20 s on ' + walls.filter(in4).length + ' of ' + walls.length + ' outside-wall strikes and ' + wallsIn.filter(in4).length + ' of ' + wallsIn.length + ' inside');
  say('  neighbour 2 m away on bare ground, six plan pairs: lit within 30 s of the facing wall on ' + pairs.filter(p => p.afterFacing !== null && p.afterFacing <= 30).length + ', lit at all in 200 s on ' + pairs.filter(p => p.neighbourLit !== null).length
    + ' (' + pairs.map(p => p.plan.replace('hopkins-4-', 'H').replace('-worker', '').replace('-row', '') + ' ' + (p.afterFacing === null ? 'never' : round(p.afterFacing, 0) + ' s')).join(', ') + ')');
  say('  one Hopkins 15 burning from its kitchen, per step: ' + round(cost.cost.mean, 1) + ' ms mean, ' + round(cost.cost.p95, 1) + ' ms 95th centile, ' + round(cost.cost.max, 1) + ' ms worst');
}
fs.mkdirSync(path.join(dir, 'reach-options'), {recursive: true});
fs.writeFileSync(path.join(dir, 'reach-options', 'summary.txt'), lines.join('\n') + '\n');
