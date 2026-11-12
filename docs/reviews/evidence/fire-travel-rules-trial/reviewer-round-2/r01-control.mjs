// Round 2, control. The reviewer's copies (kernel-var, scene-var, measure-var) with no switch set must give
// the author's event log, event for event, and the author's survey numbers.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r01-control.mjs
import crypto from 'node:crypto';
import * as orig from '../measure.mjs';
import * as mine from './measure-var.mjs';
const sig = r => crypto.createHash('sha256').update(JSON.stringify(r.world.events)).digest('hex').slice(0, 16);
for (const [planId, at] of [['hopkins-4-15', 'wall:x+:19:4'], ['hopkins-4-12', 'room:0:kitchen'], ['monroe-row', 'room:1:bed-a'], ['ashland-worker', 'wall:y-:5:0:in']]) {
  const a = orig.burn({planId, at, seconds: 200}), b = mine.burn({planId, at, seconds: 200});
  console.log(planId, at, 'events', a.world.events.length, b.world.events.length, sig(a), sig(b), sig(a) === sig(b) ? 'IDENTICAL' : 'DIFFERENT',
    'room', a.roomAll === b.roomAll, 'half', a.half === b.half, 'ledger', a.ledger === b.ledger);
}
console.log('strikes equal:', JSON.stringify(orig.strikesOf('hopkins-4-15')) === JSON.stringify(mine.strikesOf('hopkins-4-15')));
