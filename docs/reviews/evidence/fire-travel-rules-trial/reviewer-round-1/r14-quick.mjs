// Round 1, probe 14: one house, one strike, one line of numbers. The quick reproduction for the must-fix items.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r14-quick.mjs [rules json] [variant json] [plan] [strike] [seconds]
// strike: "trial" (Hopkins 15 tile 19,4 on the x+ wall), "wall:<j>" (the same wall, tile j), or "room:<floor>:<id>" (furniture at that room's centre).
// Each run prints the CONTROL (kernel as written, trial strike) first unless the 6th argument is "nocontrol".
import {burn, round, wallTiles, lightFuel} from './lib.mjs';
const [rulesArg = '{}', variantArg = '{}', planId = 'hopkins-4-15', strikeArg = 'trial', secondsArg = '70', control] = process.argv.slice(2);
const strikeOf = spec => (world, a) => {
  if (spec.startsWith('room:')) { const label = 'A/' + spec.slice(5); world.ignite(a.rooms.get(label).centre, 'furniture'); return label; }
  const j = spec === 'trial' ? 4 : +spec.slice(5), t = world.tileAt(a.origin[0] + 19, a.origin[1] + j, 0), w = wallTiles(a, world, 0).find(x => x.tile === t && x.side === 'x+');
  lightFuel(world, t, w.fuel); return t.room;
};
function line(name, rules, variant, plan, strike) {
  const r = burn({planId: plan, seconds: +secondsArg, world: {rules, variant}, strike: strikeOf(strike)});
  const ev = r.world.events, fall = ev.find(e => e.type === 'fall' && e.from[2] >= 2 && e.to[2] < 2), ground = ev.find(e => e.type === 'lit' && e.at[2] < 2);
  console.log(name.padEnd(46) + ' room alight ' + String(round(r.roomAll)).padEnd(7) + ' half the house ' + String(round(r.half)).padEnd(7) + ' first fall ' + String(round(r.fall?.time)).padEnd(7)
    + (strike.startsWith('room:1') ? ' first fall to ground ' + round(fall?.time) + ' ground lit ' + round(ground?.time) : '')
    + ' embers made ' + round(r.world.ledger.embersMade, 1) + ' of ' + round(r.laid0, 1) + ' laid; "ledger" ' + r.ledger.toExponential(0));
}
if (control !== 'nocontrol') line('CONTROL as written, hopkins-4-15, trial', {}, {}, 'hopkins-4-15', 'trial');
line(rulesArg + ' ' + variantArg + ' ' + planId + ' ' + strikeArg, JSON.parse(rulesArg), JSON.parse(variantArg), planId, strikeArg);
