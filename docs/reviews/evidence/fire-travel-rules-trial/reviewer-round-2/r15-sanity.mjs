// Round 2. Conservation and sanity (round 1's M5), checked without the kernel's own ledger.
// My own sum of every fuel amount before the match, against what is left plus what the kernel says it burnt; the oil burst;
// embers as a share of the surfaces that shed them; heat bounds; negative amounts; fuel left hanging in a tile with no floor;
// tiles never lit; the active set draining.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r15-sanity.mjs
import {burn, round} from './measure-var.mjs';
for (const [planId, at, seconds] of [['hopkins-4-15', 'room:0:kitchen', 700], ['hopkins-4-15', 'room:1:bed-a', 400], ['hopkins-4-09', 'room:1:bed-c', 400], ['monroe-row', 'wall:x+:13:13', 400], ['ashland-worker', 'room:0:pantry', 400]]) {
  let laid0 = 0, surfaces0 = 0, maxHeat = 0, minAmount = 0, hanging = 0, hangingWhat = {}, oil0 = 0, activeAt = {}, burntByMe = 0, last = null;
  const r = burn({planId, at, seconds, before: world => { for (const t of world.tiles.values()) for (const f of t.fuels) { laid0 += f.amount; if (f.face || f.supports) surfaces0 += f.amount; if (f.cls === 'oil') oil0 += f.amount; } },
    each: (world, n) => {
      for (const t of world.active) { if (t.heat > maxHeat) maxHeat = t.heat; for (const f of t.fuels) if (f.amount < minAmount) minAmount = f.amount; }
      if (n % 30 === 0) {
        // fuel that is not a surface, sitting above the ground in a tile with no floor under it
        let now = 0; for (const t of world.tiles.values()) if (t.k > 0 && !t.fuels.some(f => f.supports && f.amount > 0)) for (const f of t.fuels) if (!f.face && !f.supports && f.amount > 1e-9) { now += f.amount; hangingWhat[f.cls + ' at layer ' + t.k] = Math.max(hangingWhat[f.cls + ' at layer ' + t.k] ?? 0, f.amount); }
        if (now > hanging) hanging = now;
        const s = Math.round(world.time); if ([100, 200, 300, 400, 600, 700].includes(s)) activeAt[s] = world.active.size;
      }
    }});
  const w = r.world, left = w.remaining();
  let oilMade = 0, embersLeft = 0; for (const t of w.tiles.values()) for (const f of t.fuels) { if (f.cls === 'oil' && !f.store) oilMade += f.start; if (f.cls === 'embers') embersLeft += f.amount; }
  console.log(planId, at, seconds + ' s');
  console.log('   my sum before the match ' + round(laid0, 4) + ' | kernel ledger.laid at the end ' + round(w.ledger.laid, 4) + ' | burnt ' + round(w.ledger.burnt, 4) + ' + left ' + round(left, 4) + ' = ' + round(w.ledger.burnt + left, 4) + ' | my sum - burnt - left = ' + (laid0 - w.ledger.burnt - left).toExponential(1));
  console.log('   oil: in cans before ' + round(oil0, 3) + ', spread as pools ' + round(oilMade, 3) + ', bursts ' + w.events.filter(e => e.type === 'burst').length + ' | embers fallen ' + round(w.ledger.fellAsEmbers, 3) + ' = ' + round(100 * w.ledger.fellAsEmbers / surfaces0, 2) + ' % of the surfaces laid (rule: 15 %) | embers unburnt at the end ' + round(embersLeft, 4));
  console.log('   heat: highest ever ' + round(maxHeat, 3) + ' (ceiling ' + w.rules.maxHeat + ') | lowest amount ever ' + minAmount + ' | fuels never lit ' + r.never + ' of ' + r.n + ' | active tiles at ' + Object.entries(activeAt).map(([s, n]) => s + ' s: ' + n).join(', ')
    + ' | most loose fuel ever hanging above ground in a tile with no floor: ' + round(hanging, 3) + ' tile-fulls ' + JSON.stringify(Object.fromEntries(Object.entries(hangingWhat).map(([k, v]) => [k, round(v, 3)]))));
}
