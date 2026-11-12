// Is a street fire the same fire regardless of how frames arrive, and from run to run?
// One match on the north lawn, 2400 ticks (40 world seconds), under four frame schedules.
//   node docs/reviews/evidence/hostile-review-round-1/determinism.mjs
import {createHash} from 'node:crypto';
import {createSimulation, street, press, table, STEP} from './lib.mjs';

const TICKS = 2400;
function run(label, deltas) {
  const sim = createSimulation({scenario: street({player: {x: 30, y: 14}}), seed: 1893});
  let snapshot = press(sim, 30.8, 14), i = 0;
  // Never step past the comparison tick, so every schedule is compared at the same instant.
  while (snapshot.tick < TICKS + 1) snapshot = sim.advance(Math.min(deltas[i++ % deltas.length], (TICKS + 1 - snapshot.tick) * STEP));
  const state = {tick: snapshot.tick, world: snapshot.clocks.world.toFixed(6),
    cells: snapshot.cells.map(c => c.phase[0] + c.heat.toFixed(6) + '/' + c.surfaceFuel.toFixed(6)).join(','),
    buildings: snapshot.world.buildings.map(b => b.id + ':' + b.destroyed + ':' + b.burnedFraction.toFixed(6) + ':' + (b.sections ?? []).map(s => Number(s.present)).join('')).join('|'),
    sites: snapshot.structureFire.map(s => s.id + ':' + s.flame.toFixed(6) + ':' + (s.heatFraction ?? -1).toFixed(6)).join('|'),
    hp: snapshot.player.hp.toFixed(6)};
  sim.dispose();
  return {schedule: label, 'final tick': state.tick, 'world s': state.world, 'buildings destroyed': snapshot.world.buildings.filter(b => b.destroyed).length,
    'state hash': createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16)};
}
const rows = [
  run('60 Hz (one tick per call)', [STEP]),
  run('60 Hz again', [STEP]),
  run('30 Hz (two ticks per call)', [2 * STEP]),
  run('120 Hz (a tick every other call)', [STEP / 2]),
  run('hitching: 1, 1, 9 and 3 ticks per call', [STEP, STEP, 9 * STEP, 3 * STEP])
];
console.log(table(rows, Object.keys(rows[0])));
console.log(new Set(rows.map(r => r['state hash'])).size === 1 ? '\nAll schedules end in the identical state.' : '\nSCHEDULES DIVERGE.');
