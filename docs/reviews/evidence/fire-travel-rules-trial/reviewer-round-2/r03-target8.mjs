// Round 2. Target 8: an upstairs fire and the ground floor. For every upstairs room strike of one plan:
// what first fell to the ground storey, what then lit, how hot the ground storey got before the fall,
// whether a ground-storey ROOF was lit before the fall (measure.mjs leaves roofs out), and what happens
// to the lag with the landing pulse off, and with almost no embers.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r03-target8.mjs <plan>
import {burn, strikesOf, round} from './measure-var.mjs';
const planId = process.argv[2] ?? 'hopkins-4-15';
const one = (at, rules) => {
  let seen = 0, fallen = false, maxHeat = 0, maxChar = 0, ground = null;
  const r = burn({planId, at, rules, seconds: 130, each: world => {
    for (; seen < world.events.length; seen++) { const e = world.events[seen]; if (e.building === 'A' && e.type === 'fall' && e.from[2] >= 2 && e.to[2] < 2) fallen = true; }
    if (fallen) return;
    ground ??= [...world.tiles.values()].filter(t => t.building === 'A' && t.k < 2);
    for (const t of ground) { if (t.heat > maxHeat) maxHeat = t.heat; for (const f of t.fuels) if (!f.lit && f.amount > 0) { const c = f.char / (world.fuels[f.cls].delay || 1e-9); if (world.fuels[f.cls].delay && c > maxChar) maxChar = c; } }
  }});
  const ev = r.world.events.filter(e => e.building === 'A');
  const fall = ev.find(e => e.type === 'fall' && e.from[2] >= 2 && e.to[2] < 2);
  const lit = ev.find(e => e.type === 'lit' && e.at[2] < 2 && e.cls !== 'roof' && e.cause !== 'match');
  const anyLit = ev.find(e => e.type === 'lit' && e.at[2] < 2 && e.cause !== 'match');
  const fallsBefore = fall && lit ? ev.filter(e => e.type === 'fall' && e.from[2] >= 2 && e.to[2] < 2 && e.time <= lit.time) : [];
  const sameTile = fallsBefore.filter(e => lit && e.to[0] === lit.at[0] && e.to[1] === lit.at[1]).length;
  return {fall, lit, anyLit, lag: fall && lit ? lit.time - fall.time : null, maxHeat, maxChar, nFalls: fallsBefore.length, sameTile, carried: [...new Set(fallsBefore.flatMap(e => e.carried))].join('+') || '-', causes: [...new Set(fallsBefore.map(e => e.cause))].join('+')};
};
for (const at of strikesOf(planId).filter(s => s.startsWith('room:1'))) {
  const b = one(at, {}), noPulse = one(at, {fallPulse: 0}), fewEmbers = one(at, {emberShare: .01});
  console.log(JSON.stringify({plan: planId, at, fallToGround: round(b.fall?.time), cause: b.fall?.cause, fallEmbers: round(b.fall?.embers, 3), groundLit: round(b.lit?.time), what: b.lit?.cls, lag: round(b.lag),
    fallsToGroundBeforeLit: b.nFalls, ofWhichIntoTheLitTile: b.sameTile, carried: b.carried, causes: b.causes,
    groundMaxHeatBeforeFall: round(b.maxHeat, 3), groundMaxCharShareBeforeFall: round(b.maxChar, 3),
    anyGroundStoreyFuelLitIncludingRoofs: round(b.anyLit?.time), whatThat: b.anyLit?.cls, roofBeforeFall: b.anyLit && b.fall ? b.anyLit.time < b.fall.time : null,
    lagNoPulse: round(noPulse.lag), groundLitNoPulse: round(noPulse.lit?.time), lagEmbers1pc: round(fewEmbers.lag), groundLitEmbers1pc: round(fewEmbers.lit?.time), fallEmbers1pc: round(fewEmbers.fall?.time)}));
}
