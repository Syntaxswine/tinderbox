// Objections I expect the code to beat: determinism across frame partitions and repeats on the default street,
// fuel-ledger conservation in a large fire, and (suspicion) the 256-entry event window.
import {createHash} from 'node:crypto';
import {createSimulation, NEIGHBORHOOD_SCENARIO, press, r, STEP} from './lib.mjs';

function digest(s) {
  const fire = {cells: s.cells.map(c => [c.phase, c.heat, c.surfaceFuel, c.depositedFuel, c.intensity]),
    sites: s.structureFire.map(x => [x.id, x.flame, x.heatFraction, x.ignitionTime]),
    buildings: s.world.buildings.map(b => [b.id, b.destroyed, b.burnedFraction, (b.sections ?? []).map(x => [x.present, x.firstIgnition])]),
    obstacles: s.world.obstacles.map(o => o.id), world: s.clocks.world, tick: s.tick};
  return createHash('sha256').update(JSON.stringify(fire)).digest('hex').slice(0, 16);
}
function burn(partition, targetTick) {
  const sim = createSimulation({scenario: {...NEIGHBORHOOD_SCENARIO, player: {x: 13, y: 27.6, tool: 'matches'}}, seed: 1893, config: {fire: {damagePerSecond: 0}}});
  let s = press(sim, 13, 28.4), i = 0;
  while (s.tick < targetTick) {
    const dt = partition[i++ % partition.length];
    s = sim.advance(Math.min(dt, (targetTick - s.tick) * STEP)); // never overshoot the comparison tick
  }
  const result = {tick: s.tick, digest: digest(s)};
  sim.dispose();
  return result;
}
console.log('== 9a. Default street lawn fire: state digest at tick 1201 (20 s) under different frame partitions ==');
for (const [label, partition] of [['60 Hz', [STEP]], ['30 Hz', [2 * STEP]], ['4 Hz hitch frames', [.25]], ['irregular', [.073, .177, .011, .2]], ['60 Hz repeat', [STEP]]]) {
  console.log(label.padEnd(20), JSON.stringify(burn(partition, 1201)));
}

console.log('\n== 9b. Fuel ledger in the same fire plus a poured trail and a thrown lantern ==');
{
  const sim = createSimulation({scenario: {...NEIGHBORHOOD_SCENARIO, player: {x: 13, y: 27.6, tool: 'jerry-can'}}, seed: 1893, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
  const s0 = sim.snapshot(), surface0 = s0.cells.reduce((n, c) => n + c.surfaceFuel, 0);
  sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false}); sim.dispatch({type: 'move', x: 1, y: 0});
  for (let i = 0; i < 30; i++) sim.advance(STEP);
  sim.dispatch({type: 'move', x: 0, y: 0}); sim.dispatch({type: 'select-tool', tool: 'molotov'}); sim.advance(STEP);
  sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
  sim.dispatch({type: 'move', x: -.8, y: 0}); sim.dispatch({type: 'move', x: 0, y: 0}); sim.advance(STEP);
  sim.dispatch({type: 'primary', pressed: true}); sim.advance(STEP); sim.dispatch({type: 'primary', pressed: false});
  let s, worst = 0, worstSurface = 0;
  for (let i = 0; i < 240; i++) {
    s = sim.advance(.25);
    const f = s.diagnostics.fuel;
    worst = Math.max(worst, Math.abs(f.pouredFuel + f.fixtureFuel + f.molotovFuel - f.remainingDepositedFuel - f.burnedDepositedFuel));
    worstSurface = Math.max(worstSurface, Math.abs(surface0 - s.cells.reduce((n, c) => n + c.surfaceFuel, 0) - f.burnedSurfaceFuel));
  }
  const f = s.diagnostics.fuel;
  console.log('deposited: poured', r(f.pouredFuel, 4), 'lantern', r(f.molotovFuel, 4), 'burned', r(f.burnedDepositedFuel, 4), 'remaining', r(f.remainingDepositedFuel, 4), '| worst ledger error (L)', worst.toExponential(2));
  console.log('surface: initial', r(surface0, 3), 'burned', r(f.burnedSurfaceFuel, 3), 'remaining', r(s.cells.reduce((n, c) => n + c.surfaceFuel, 0), 3), '| worst error', worstSurface.toExponential(2),
    '| gas inventory used', r(4 - s.player.inventory.gas, 4), 'lanterns left', s.player.inventory.molotovs);
  sim.dispose();
}

console.log('\n== 9c. Event window (capacity 256): are events lost between consecutive frames in the big fire? ==');
for (const [label, dt] of [['60 Hz frames', STEP], ['0.25 s catch-up frames', .25]]) {
  const sim = createSimulation({scenario: {...NEIGHBORHOOD_SCENARIO, player: {x: 13, y: 27.6, tool: 'matches'}}, seed: 1893, config: {fire: {damagePerSecond: 0}}});
  let s = press(sim, 13, 28.4), last = s.events.at(-1).id, lost = 0, maxNew = 0, framesWithLoss = 0, lostTypes = {};
  for (let i = 0; i < 45 / dt; i++) {
    s = sim.advance(dt);
    const newest = s.events.at(-1)?.id ?? last, oldest = s.events[0]?.id ?? last + 1;
    maxNew = Math.max(maxNew, newest - last);
    if (oldest > last + 1) { lost += oldest - last - 1; framesWithLoss++; }
    last = newest;
  }
  console.log(label.padEnd(24), '| total events', last, '| max new events in one frame', maxNew, '| events never visible to a frame-by-frame view', lost, 'in', framesWithLoss, 'frames');
  sim.dispose();
}
