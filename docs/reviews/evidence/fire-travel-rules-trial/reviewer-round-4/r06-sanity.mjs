// Round 4. Conservation, ceilings, never-lit (whole world, porch included), active set draining, determinism.
import {make, house, lawn, strike, strikesOf, PLANS, ALL, PITCH} from '../measure.mjs';
function run(planId, at, {grass = false, seconds = 420} = {}) {
  const world = make(), a = house(world, 'A', planId, 6, 6, ALL);
  if (grass) lawn(world, 0, 0, Math.round((12 + a.plan.width) / PITCH), Math.round((12 + a.plan.depth) / PITCH));
  const laid0 = world.remaining();
  strike(world, a, at);
  let worstLedger = 0, maxHeat = 0, maxAmount = 0, negative = 0, peakActive = 0, burntPrev = 0, burntDown = 0;
  for (let n = Math.round(seconds / world.dt); n > 0; n--) {
    world.step();
    if (n % 15 === 0) {
      const rem = world.remaining();
      worstLedger = Math.max(worstLedger, Math.abs(world.ledger.laid - world.ledger.burnt - rem), Math.abs(laid0 - world.ledger.burnt - rem));
      for (const t of world.tiles.values()) { if (t.heat > maxHeat) maxHeat = t.heat; for (const f of t.fuels) { if (f.amount < -1e-12) negative++; if (f.amount > f.start + 1e-12) maxAmount++; } }
    }
    if (world.ledger.burnt < burntPrev) burntDown++; burntPrev = world.ledger.burnt;
    if (world.active.size > peakActive) peakActive = world.active.size;
  }
  let never = 0, neverPorch = 0, stillLit = 0, left = {};
  for (const t of world.tiles.values()) for (const f of t.fuels) {
    if (f.cls !== 'embers' && f.litAt === null && f.amount > 0 && f.store !== 'oil') { never++; if (!t.building) neverPorch++; }
    if (f.lit) stillLit++;
    if (f.amount > 1e-9) left[f.cls] = (left[f.cls] ?? 0) + f.amount;
  }
  return {world, worstLedger, maxHeat, negative, maxAmount, peakActive, never, neverPorch, stillLit, activeEnd: world.active.size, laid0, burnt: world.ledger.burnt, embers: world.ledger.fellAsEmbers, left, burntDown,
    log: JSON.stringify(world.events)};
}
for (const planId of PLANS) for (const at of [strikesOf(planId).find(s => s.startsWith('wall:y-') && !s.endsWith(':in')), 'room:0:kitchen']) {
  const r = run(planId, at), again = run(planId, at);
  console.log(planId.padEnd(15) + at.padEnd(16) + ' laid ' + r.laid0.toFixed(1) + ' burnt ' + r.burnt.toFixed(1) + ' left ' + JSON.stringify(Object.fromEntries(Object.entries(r.left).map(([k, v]) => [k, +v.toFixed(3)]))) + '; ledger worst ' + r.worstLedger.toExponential(1) + '; hottest tile ' + r.maxHeat.toFixed(4)
    + '; negative amounts ' + r.negative + ', amounts above start ' + r.maxAmount + '; never lit (whole world) ' + r.never + ' (porch or grass ' + r.neverPorch + '); still lit at 420 s ' + r.stillLit + '; active at peak ' + r.peakActive + ', at 420 s ' + r.activeEnd + '; events ' + r.world.events.length + ', identical on a second run: ' + (r.log === again.log));
}
const g = run('hopkins-4-15', 'room:0:kitchen', {grass: true});
console.log('hopkins-4-15 on a lawn, kitchen: ledger worst ' + g.worstLedger.toExponential(1) + '; hottest ' + g.maxHeat.toFixed(4) + '; never lit ' + g.never + '; active at 420 s ' + g.activeEnd + '; left ' + JSON.stringify(Object.fromEntries(Object.entries(g.left).map(([k, v]) => [k, +v.toFixed(3)]))));
