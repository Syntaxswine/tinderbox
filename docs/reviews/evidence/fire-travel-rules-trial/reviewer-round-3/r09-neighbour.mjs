// Target 11: beyond a pair of the same plan, squarely opposite.
//   node r09-neighbour.mjs control          the trial's six same-plan pairs through my own builder: must equal pair.mjs
//   node r09-neighbour.mjs mixed <planA>    plan A struck on its far wall, each of the six plans as the neighbour
//   node r09-neighbour.mjs shift <plan>     the neighbour moved along the wall by -4..+4 m
//   node r09-neighbour.mjs trace            for each same-plan pair: what of B lit first, on which layer, from which side, and was any of A open to the sky then
import {burn, outsideWalls, plan, strikesOf, round, PLANS, isOpenToSky} from './lib.mjs';
import {pair} from '../pair.mjs';
const mode = process.argv[2] ?? 'control';
const farWall = planId => strikesOf(planId).find(s => s.startsWith('wall:x-') && !s.endsWith(':in'));
function mine(planA, planB, gap, dy = 0, seconds = 200) {
  const width = plan(planA).width; let facing = null;
  const r = burn({planId: planA, at: farWall(planA), seconds, neighbours: [['B', 6 + width + gap, 6 + dy, planB]], before: (world, a) => { facing = [0, 1, 2, 3].flatMap(k => outsideWalls(world, a, k)).filter(w => w.side === 'x+'); }});
  const facingLit = Math.min(...facing.map(w => w.fuel.litAt ?? Infinity)), B = r.neighbours.B;
  return {r, B, facingLit, after: B === null ? null : B - facingLit};
}
const show = m => m.B === null ? 'never (200 s)' : round(m.B) + ' s, ' + round(m.after) + ' s after facing' + (m.after <= 30 ? '  OK' : '  LATE');
if (mode === 'control') for (const p of PLANS) { const a = pair(2, 'bare', farWall(p), {}, {}, 200, p), b = mine(p, p, 2); console.log(p.padEnd(15), 'pair.mjs: ' + round(a.neighbourLit) + ' s, ' + round(a.afterFacing) + ' after | mine: ' + show(b)); }
if (mode === 'mixed') { const A = process.argv[3]; let ok = 0; for (const B of PLANS) { const m = mine(A, B, 2); if (m.after !== null && m.after <= 30) ok++; console.log(A.padEnd(15) + ' -> ' + B.padEnd(15) + show(m)); } console.log(A + ': within 30 s on ' + ok + ' of 6 neighbours'); }
if (mode === 'shift') { const A = process.argv[3]; for (const dy of [-4, -2, -1, -.5, 0, .5, 1, 2, 4]) console.log(A.padEnd(15) + ' neighbour shifted ' + String(dy).padStart(4) + ' m: ' + show(mine(A, A, 2, dy))); }
if (mode === 'trace') for (const p of PLANS) {
  const m = mine(p, p, 2), world = m.r.world;
  const first = world.events.find(e => e.type === 'lit' && e.building === 'B');
  if (!first) { console.log(p, 'never'); continue; }
  // state of A at the moment B lit: re-run to that time
  const width = plan(p).width;
  const again = burn({planId: p, at: farWall(p), seconds: first.time - .02, neighbours: [['B', 6 + width + 2, 6]]});
  const w = again.world, aTiles = [...again.a.rooms.values()].flatMap(x => x.tiles);
  const open = aTiles.filter(t => isOpenToSky(w, t)).length;
  let roofsSpent = 0, roofs = 0, facingBurning = 0, facingOut = 0, lowRoofBurning = 0;
  for (const t of aTiles) for (const f of t.fuels) if (f.cls === 'roof') { roofs++; if (f.amount <= 0) roofsSpent++; if (f.lit && t.k < 2) lowRoofBurning++; }
  for (const k of [0, 1, 2, 3]) for (const x of outsideWalls(w, again.a, k)) if (x.side === 'x+' && x.fuel.lit) { facingBurning++; if (x.fuel.near) facingOut++; }
  const t = world.tileAt(...first.at), fuel = t.fuels.find(f => f.litAt === first.time && f.cls === first.cls);
  console.log(p.padEnd(15), 'B first lit ' + round(first.time) + ' s (' + round(m.after) + ' after facing): ' + first.cls + ' on layer ' + first.at[2] + ', lit from ' + (fuel?.near ? (fuel.near.building ? 'inside' : 'the air side') : 'its own tile') + ' | A then: facing-wall tiles burning ' + facingBurning + ' (burning on the outside ' + facingOut + '), roofs spent ' + roofsSpent + '/' + roofs
    + ', low roofs burning ' + lowRoofBurning + ', house tiles open to sky ' + open + '/' + aTiles.length);
}
