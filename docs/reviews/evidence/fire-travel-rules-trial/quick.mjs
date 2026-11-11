// One house, one strike, one line. For checking a single case or a changed number.
//   node docs/reviews/evidence/fire-travel-rules-trial/quick.mjs [plan] [strike] [rules json] [fuels json] [seconds]
// strike: "room:<floor>:<room id>" lights the furniture there; "wall:<side>:<i>:<j>" holds a match outside
// that wall tile (add ":in" to hold it inside). `quick.mjs <plan> list` lists a plan's survey strikes.
import {burn, strikesOf, round} from './measure.mjs';
const [planId = 'hopkins-4-15', at = 'wall:x+:19:4', rules = '{}', fuels = '{}', seconds = '150'] = process.argv.slice(2);
if (at === 'list') { console.log(strikesOf(planId).join('\n')); process.exit(0); }
const began = performance.now();
const r = burn({planId, at, rules: JSON.parse(rules), fuels: JSON.parse(fuels), seconds: +seconds});
console.log([planId, at, 'room ' + round(r.roomAll) + ' (' + r.roomLit + '/' + r.roomN + ')', 'half ' + round(r.half), 'flame until ' + round(r.flameUntil), 'first fall ' + round(r.fall?.time),
  'upstairs lit ' + round(r.upstairsLit?.time), 'ground lit ' + round(r.groundLit?.time), 'fall to ground ' + round(r.fallToGround?.time), 'never lit ' + r.never + '/' + r.n,
  'embers ' + round(r.world.ledger.fellAsEmbers, 1) + ' of ' + round(r.world.ledger.laid, 1), 'ledger ' + r.ledger.toExponential(0), round((performance.now() - began) / 1000, 1) + ' s wall'].join(' | '));
