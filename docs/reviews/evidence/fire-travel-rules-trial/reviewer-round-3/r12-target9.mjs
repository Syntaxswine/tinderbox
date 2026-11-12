// Target 9. The trial's four Hopkins 15 burns (kitchen/dining, with/without stores): summed heat of active tiles
// through time, what is burning at 300 s, when the coal lit and when it will end; and the six-plan gains.
//   node r12-target9.mjs heat | gains
import {burn, round, PLANS, ALL} from './lib.mjs';
const NO_STORES = {furniture: true, lacquer: 'some'};
if ((process.argv[2] ?? 'heat') === 'heat') for (const [name, at, contents] of [['kitchen, stores', 'room:0:kitchen', ALL], ['dining, stores', 'room:0:dining', ALL], ['kitchen, none', 'room:0:kitchen', NO_STORES], ['dining, none', 'room:0:dining', NO_STORES]]) {
  const r0 = burn({at, contents, seconds: .04}), world = r0.world, log = [];
  const heat = () => { let s = 0; for (const t of world.active) s += t.heat; return s; };
  let lastFlame = 0;
  for (let s = 2; s <= 420 * 30; s++) {
    world.step();
    if (s % 900 === 0 || s === 300 * 30) {
      const burning = {}; for (const t of world.tiles.values()) for (const f of t.fuels) if (f.lit) burning[f.cls] = (burning[f.cls] ?? 0) + 1;
      log.push('t=' + round(s / 30, 0) + ': heat ' + round(heat(), 1) + ' burning ' + JSON.stringify(burning));
    }
  }
  const coal = [...world.tiles.values()].flatMap(t => t.fuels.map(f => [t, f])).filter(([, f]) => f.cls === 'coal');
  const oilBurst = world.events.filter(e => e.type === 'burst').map(e => round(e.time) + ' s over ' + e.tiles + ' tiles');
  console.log(name.padEnd(16) + ' half ' + round(r0.half) + ' | bursts: ' + (oilBurst.join('; ') || 'none') + ' | coal: ' + (coal.map(([t, f]) => 'lit ' + round(f.litAt) + ' s, spent ' + round(f.spentAt) + ', now on layer ' + t.k + ', amount left at 420 s ' + round(f.amount, 3)).join('; ') || 'none') + '\n    ' + log.join('\n    '));
}
if (process.argv[2] === 'gains') for (const planId of PLANS) {
  const a = burn({planId, at: 'room:0:kitchen', seconds: 150}), b = burn({planId, at: 'room:0:kitchen', seconds: 150, contents: NO_STORES});
  const oilOnly = burn({planId, at: 'room:0:kitchen', seconds: 150, contents: {furniture: true, lacquer: 'some', oil: true}});
  // every ground room with stores against without, to see the spread of the room-position effect
  console.log(planId.padEnd(15) + ' kitchen half: stores ' + round(a.half) + ', none ' + round(b.half) + ', gain ' + round(b.half - a.half) + ' s; oil only ' + round(oilOnly.half) + ' | room alight: stores ' + round(a.roomAll) + ', none ' + round(b.roomAll) + ' | flame until: ' + round(a.flameUntil) + ' / ' + round(b.flameUntil));
}
