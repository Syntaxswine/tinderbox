// Round 7. Target 9 as trial.mjs measures it, on bare ground (control: must match results/trial.txt) and on the lawn.
//   node r04-target9-lawn.mjs
import {burn, round, PLANS} from '../measure.mjs';
const NO_STORES = {furniture: true, lacquer: 'some'};
for (const ground of ['bare', 'lawn']) {
  const gains = [];
  for (const planId of PLANS) { const w = burn({planId, at: 'room:0:kitchen', seconds: 150, ground}), wo = burn({planId, at: 'room:0:kitchen', seconds: 150, contents: NO_STORES, ground}); gains.push(round(wo.half - w.half)); }
  const k = burn({at: 'room:0:kitchen', seconds: 500, ground}), d = burn({at: 'room:0:dining', seconds: 500, ground}), k0 = burn({at: 'room:0:kitchen', seconds: 500, contents: NO_STORES, ground}), d0 = burn({at: 'room:0:dining', seconds: 500, contents: NO_STORES, ground});
  console.log(ground + ': stores bring the kitchen fire forward by ' + gains.join(', ') + ' s (six plans). H15 kitchen ' + round(k.half) + ' against dining ' + round(d.half) + ' with stores; ' + round(k0.half) + ' against ' + round(d0.half) + ' without. Last flame '
    + round(k.flameUntil) + ', ' + round(d.flameUntil) + '; coal burns until ' + round(k.burningUntil) + ', ' + round(d.burningUntil));
  // bedrooms on Hopkins 15
  const beds = ['room:1:bed-a', 'room:1:bed-b', 'room:1:bed-c'].map(at => { try { return at + ' ' + round(burn({at, seconds: 150, ground}).half); } catch (e) { return at + ' n/a'; } });
  console.log('   ' + beds.join('; '));
}
