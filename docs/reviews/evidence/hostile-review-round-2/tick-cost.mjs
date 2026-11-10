// What one 1/60 s simulation tick and one snapshot cost on the shipped Catalogue Street,
// idle and while a lawn fire burns. Default configuration, default event ring.
// advance(STEP) = one step() + one snapshot(); snapshot() alone is measured separately,
// so step ~ advance - snapshot. The game calls advance() once per rendered frame.
//
// The review host was saturated by unrelated jobs, so wall-clock percentiles are not
// trustworthy here. The headline figure is CPU time (process.cpuUsage, user + system)
// summed over a window and divided by its ticks: descheduling does not inflate it.
// Wall-clock medians are printed beside it as a cross-check only.
//   node docs/reviews/evidence/hostile-review-round-1/tick-cost.mjs
import fs from 'node:fs';
import os from 'node:os';
import {createSimulation, street, press, percentile, table, round, STEP} from './lib.mjs';

const BUDGET = 1000 / 60, WINDOW = 240;
const cpuMs = () => { const {user, system} = process.cpuUsage(); return (user + system) / 1000; };

function measure(sim, ticks, sample) {
  let advanceCpu = 0, snapshotCpu = 0;
  const advanceWall = [], snapshotWall = [];
  for (let i = 0; i < ticks; i++) {
    let c = cpuMs(), t = performance.now();
    const snapshot = sim.advance(STEP);
    advanceWall.push(performance.now() - t); advanceCpu += cpuMs() - c;
    c = cpuMs(); t = performance.now();
    sim.snapshot();
    snapshotWall.push(performance.now() - t); snapshotCpu += cpuMs() - c;
    sample?.(snapshot);
  }
  return {ticks, advanceCpu: advanceCpu / ticks, snapshotCpu: snapshotCpu / ticks,
    advanceWallP50: percentile(advanceWall, .5), snapshotWallP50: percentile(snapshotWall, .5)};
}
function row(phase, m, extra = {}) {
  return {phase, 'burning cells': extra.cells ?? 0, 'burning sites': extra.sites ?? 0,
    'step cpu': round(Math.max(0, m.advanceCpu - m.snapshotCpu), 2), 'snapshot cpu': round(m.snapshotCpu, 2),
    'frame cpu': round(m.advanceCpu, 2), '% of 60 Hz budget': round(100 * m.advanceCpu / BUDGET, 0),
    'step wall p50': round(Math.max(0, m.advanceWallP50 - m.snapshotWallP50), 2), 'snapshot wall p50': round(m.snapshotWallP50, 2)};
}

const rows = [];
{ // 1. Idle street: nothing has been lit.
  const sim = createSimulation({scenario: street({player: {x: 30, y: 14}}), seed: 1893});
  measure(sim, WINDOW);                                 // warm up the JIT
  rows.push(row('idle street, nothing lit', measure(sim, 3 * WINDOW)));
  sim.dispose();
}
{ // 2. One match on the north lawn, in 4 s windows until the fire is out.
  const sim = createSimulation({scenario: street({player: {x: 30, y: 14}}), seed: 1893});
  measure(sim, WINDOW);
  press(sim, 30.8, 14);
  for (let window = 0; window < 12; window++) {
    let cells = 0, sites = 0;
    const m = measure(sim, WINDOW, snapshot => {
      cells = Math.max(cells, snapshot.diagnostics.burningCells);
      sites = Math.max(sites, snapshot.structureFire.filter(site => site.flame > 0).length);
    });
    rows.push(row('lawn fire ' + window * 4 + '-' + (window + 1) * 4 + ' s', m, {cells, sites}));
    if (!cells && !sites) break;
  }
  sim.dispose();
}
{ // 3. The opening 20 x 16 m test street the 1.1-1.3 ms figure in the repo's records came from.
  const sim = createSimulation({scenario: 'street', seed: 1947});
  measure(sim, WINDOW);
  rows.push(row('opening test street (20 x 16 m), idle', measure(sim, 3 * WINDOW)));
  sim.dispose();
}
const columns = ['phase', 'burning cells', 'burning sites', 'step cpu', 'snapshot cpu', 'frame cpu', '% of 60 Hz budget', 'step wall p50', 'snapshot wall p50'];
const load = os.loadavg();
console.log('Mean CPU ms per tick (user + system) on ' + os.cpus()[0].model.trim() + ', Node ' + process.version + '. 60 Hz frame budget: ' + round(BUDGET, 2) + ' ms.');
console.log('"frame cpu" = one advance() = one step + one snapshot, which is what the game runs per rendered frame at 60 Hz.\n');
console.log(table(rows, columns));
fs.mkdirSync(new URL('./results/', import.meta.url), {recursive: true});
fs.writeFileSync(new URL('./results/tick-cost.json', import.meta.url), JSON.stringify({node: process.version, cpu: os.cpus()[0].model.trim(), window: WINDOW, rows}, null, 1) + '\n');
