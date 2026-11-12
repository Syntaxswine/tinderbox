// Round 2. Target 15, cost per step. Run with nothing else running.
// One, three and eight houses; where the time goes; whether the worst steps are the reach steps; what sharing the
// reach work over the steps (xSpread) does to cost and to results; and the cost with "open to the sky" frozen.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r12-cost.mjs <one|three|eight|eightFirst> [rules json]
import {burn, lawn, plan, round} from './measure-var.mjs';
import {burn as authorBurn} from '../measure.mjs';
const [scene = 'one', rulesText = '{}'] = process.argv.slice(2), rules = JSON.parse(rulesText);
const W = plan('hopkins-4-15').width, D = plan('hopkins-4-15').depth;
const scenes = {
  one: {seconds: 150},
  three: {seconds: 150, at: 'room:0:hall', neighbours: [['B', 6 + W + 2, 6], ['C', 6, 6 + D + 2]], before: world => lawn(world, 0, 0, 70, 70)},
  // a street: eight Hopkins 15 houses in two rows of four, 3 m apart, on a lawn; the first is struck
  eightFirst: {seconds: 150, at: 'room:0:hall', neighbours: [1, 2, 3].map(n => ['B' + n, 6 + n * (W + 3), 6]).concat([0, 1, 2, 3].map(n => ['C' + n, 6 + n * (W + 3), 6 + D + 3])), before: world => lawn(world, 0, 0, 2 * (12 + 4 * (W + 3)), 2 * (12 + 2 * (D + 3)))}
};
const s = scenes[scene];
const r = burn({...s, timed: true, rules});
const c = r.costs, n = c.length, sorted = [...c].sort((p, q) => p - q), mean = c.reduce((a, v) => a + v, 0) / n;
const ticks = Math.max(1, Math.round((rules.radiantEvery ?? .5) / r.world.dt));
let reachSum = 0, reachN = 0, otherSum = 0, otherN = 0, worstReach = 0, worstOther = 0;
for (let i = 0; i < n; i++) if ((i + 1) % ticks === 0 && !rules.xSpread) { reachSum += c[i]; reachN++; worstReach = Math.max(worstReach, c[i]); } else { otherSum += c[i]; otherN++; worstOther = Math.max(worstOther, c[i]); }
// busiest 30 s
const win = Math.round(30 / r.world.dt); let best = 0, bestAt = 0, acc = 0;
for (let i = 0; i < n; i++) { acc += c[i]; if (i >= win) acc -= c[i - win]; if (i >= win - 1 && acc > best) { best = acc; bestAt = i - win + 1; } }
const top = [...c.keys()].sort((p, q) => c[q] - c[p]).slice(0, 20);
const over = ms => c.filter(v => v > ms).length;
console.log(scene + ' ' + rulesText + ': per step of 1/30 s over ' + s.seconds + ' s: mean ' + round(mean, 2) + ' ms, median ' + round(sorted[Math.floor(n / 2)], 2) + ', 95th ' + round(sorted[Math.floor(.95 * n)], 1) + ', 99th ' + round(sorted[Math.floor(.99 * n)], 1) + ', worst ' + round(sorted[n - 1], 1)
  + ' | busiest 30 s (from ' + round(bestAt * r.world.dt, 0) + ' s): mean ' + round(best / win, 2) + ' ms'
  + ' | steps over 5 ms: ' + over(5) + ', over 10 ms: ' + over(10) + ', over 16.7 ms (a whole 60 Hz frame): ' + over(16.7) + ', over 33.3 ms (the step itself): ' + over(33.3) + ' of ' + n);
if (!rules.xSpread) console.log('   reach steps (1 in ' + ticks + '): mean ' + round(reachSum / reachN, 2) + ' ms, worst ' + round(worstReach, 1) + ' | other steps: mean ' + round(otherSum / otherN, 2) + ' ms, worst ' + round(worstOther, 1) + ' | of the 20 worst steps, reach steps: ' + top.filter(i => (i + 1) % ticks === 0).length + ' | share of all time spent in reach: ' + round(100 * r.world.stats.radiateMs / (mean * n), 0) + ' %');
else console.log('   share of all time spent in reach: ' + round(100 * r.world.stats.radiateMs / (mean * n), 0) + ' %');
console.log('   worst 8 steps at (s): ' + top.slice(0, 8).map(i => round((i + 1) * r.world.dt, 1) + ' (' + round(c[i], 0) + ' ms)').join(', ') + ' | peak active ' + r.peakActive + ' | sight lines ' + r.world.stats.sightLines + ' | relinks ' + r.world.stats.relinks);
console.log('   results: room ' + round(r.roomAll) + ', half ' + round(r.half) + ', first fall ' + round(r.fall?.time) + ', flame until ' + round(r.flameUntil, 1) + ', neighbours first lit ' + JSON.stringify(Object.fromEntries(Object.entries(r.neighbours).map(([k, v]) => [k, round(v, 1)]))) + ', houses alight at the end of the run: ' + new Set(r.world.events.filter(e => e.type === 'lit' && e.building).map(e => e.building)).size);
