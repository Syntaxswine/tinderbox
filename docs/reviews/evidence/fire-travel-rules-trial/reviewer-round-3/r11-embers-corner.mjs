// Two sentences the record quotes from round 2 without re-measuring.
//   node r11-embers-corner.mjs embers <plan>   the plan's upstairs strikes at ember share 15 % (control) and 1 %: within 5 s of the first fall to the ground storey?
//   node r11-embers-corner.mjs corner          furniture moved from the middle of each room to its first cell (a corner): Hopkins 15 bed-a and the other upstairs rooms
import {burn, strikesOf, round, PLANS} from './lib.mjs';
const mode = process.argv[2];
if (mode === 'embers') {
  const planId = process.argv[3];
  for (const at of strikesOf(planId).filter(s => s.startsWith('room:1'))) {
    const row = [];
    for (const share of [.15, .01]) {
      const r = burn({planId, at, seconds: 300, rules: {emberShare: share}});
      const g = r.groundLit?.time ?? null, f = r.fallToGround?.time ?? null;
      row.push('embers ' + share + ': fall to ground ' + round(f) + ', ground lit ' + round(g) + ', lag ' + (g !== null && f !== null ? round(g - f) : null) + (g !== null && f !== null && g >= f && g - f <= 5 ? ' WITHIN' : ' NOT') + (g !== null && (f === null || g < f) ? ' BEFORE-FALL' : ''));
    }
    console.log(planId.padEnd(15) + at.padEnd(16) + row.join(' || '));
  }
}
if (mode === 'corner') for (const [planId, at] of [['hopkins-4-15', 'room:1:bed-a'], ['hopkins-4-15', 'room:1:bed-b'], ['hopkins-4-15', 'room:0:dining'], ['hopkins-4-09', 'room:1:bed-a'], ['hopkins-4-12', 'room:0:kitchen'], ['monroe-row', 'room:0:parlor']]) {
  const base = burn({planId, at, seconds: 200});
  const moved = burn({planId, at, seconds: 200, before: (world, a) => {
    for (const rec of a.rooms.values()) {
      const [ci, cj] = rec.cells[0], to = world.tileAt(a.origin[0] + ci, a.origin[1] + cj, 2 * rec.floor), from = rec.centre;
      if (to === from) continue;
      for (const f of [...from.fuels]) if (!f.face && !f.supports && !f.store && f.cls !== 'coal') { from.fuels.splice(from.fuels.indexOf(f), 1); to.fuels.push(f); }
      rec.centre = to;
    }
  }});
  console.log(planId.padEnd(15) + at.padEnd(16) + 'middle: room ' + round(base.roomAll) + ' half ' + round(base.half) + ' || corner (first cell): room ' + round(moved.roomAll) + ' half ' + round(moved.half) + ' ledger ' + moved.ledger.toExponential(0));
}
