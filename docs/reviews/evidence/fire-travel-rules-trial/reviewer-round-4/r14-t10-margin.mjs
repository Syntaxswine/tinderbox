// Round 4. Target 10's margin on the current numbers: how far rate or loss must move before a lawn fire crosses
// 0.5 m of paving square to the grid ("holds by about 9 %" is round 2's figure on its version).
import {make, lawn, paving, round} from '../measure.mjs';
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
function square(rules) { const world = make(rules); lawn(world, 0, 0, 20, 21); paving(world, 20, 0, 21, 21); lawn(world, 21, 0, 41, 21); world.ignite(world.tileAt(2, 10, 0)); run(world, 40);
  let peak = 0; return world.events.find(e => e.type === 'lit' && e.at[0] >= 21)?.time ?? null; }
// peak heat of the first grass tile past the strip, as proposed
{ const world = make(); lawn(world, 0, 0, 20, 21); paving(world, 20, 0, 21, 21); lawn(world, 21, 0, 41, 21); world.ignite(world.tileAt(2, 10, 0)); let peak = 0; for (let n = 1200; n > 0; n--) { world.step(); for (let j = 0; j < 21; j++) peak = Math.max(peak, world.tileAt(21, j, 0).heat); }
  console.log('as proposed: hottest grass tile past the strip ' + round(peak, 3) + '; grass chars above 0.85 (margin ' + round(100 * (.85 / peak - 1), 1) + ' %)'); }
for (const f of [1.1, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5]) console.log('rate x' + f + ': ' + (square({rate: 4 * f}) === null ? 'holds' : 'CROSSES') + '   loss x' + round(1 / f, 3) + ': ' + (square({loss: 2 / f}) === null ? 'holds' : 'CROSSES'));
