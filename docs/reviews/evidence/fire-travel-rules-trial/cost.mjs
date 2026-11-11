// Cost of one furnished Hopkins 15 burning from its kitchen, per step, for a set of rule overrides.
//   node docs/reviews/evidence/fire-travel-rules-trial/cost.mjs ['<rules json>' ...]
// Run nothing else at the same time: timings on this machine move by tens of per cent between runs.
import {burn, round} from './measure.mjs';
for (const text of process.argv.length > 2 ? process.argv.slice(2) : ['{}', '{"reachUnderCover":true}', '{"reach":0.1}']) {
  const r = burn({seconds: 150, timed: true, rules: JSON.parse(text)});
  console.log(text.padEnd(26) + ' per step: ' + round(r.cost.mean, 1) + ' ms mean, ' + round(r.cost.p95, 1) + ' ms 95th centile, ' + round(r.cost.max, 1) + ' ms worst; sight lines tested ' + r.world.stats.sightLines
    + ', link rebuilds ' + r.world.stats.relinks + '; half the house at ' + round(r.half) + ' s');
}
