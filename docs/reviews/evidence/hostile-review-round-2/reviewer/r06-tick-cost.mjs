// Cost per advance (one fixed step + one snapshot) on Catalogue Street, in process CPU milliseconds (user + system),
// for the three trees: old = 4fc97bb, m5 = 720f7b6 (snapshot fix), head = this tree (snapshot fix + contact fix).
//   idle     : nothing lit. old -> m5 is Fix A's gain; m5 -> head is what Fix B's frontage tables cost every tick.
//   burning  : both lawns lit at t = 0 beside the houses, 25 s of world time. old -> m5 hold identical fire states
//              (Fix A only); m5 -> head differ because the contact fix changes who burns, so burning-cell counts are shown.
// Arms are interleaved and repeated; the median of the rounds is reported. CPU time, not wall time, because the host is shared.
// Usage: node r06-tick-cost.mjs [rounds]
import {load, OLD, M5, HEAD, r} from './lib.mjs';
const trees = [['old', await load(OLD)], ['m5', await load(M5)], ['head', await load(HEAD)]];
const rounds = Number(process.argv[2] ?? 5);
const cpu = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
const median = list => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];

function idle(api) {
  const sim = api.createSimulation({scenario: api.NEIGHBORHOOD_SCENARIO});
  for (let i = 0; i < 60; i++) sim.advance(api.STEP);
  const start = cpu(); for (let i = 0; i < 600; i++) sim.advance(api.STEP);
  const ms = (cpu() - start) / 600; sim.dispose(); return {ms};
}
function burning(api) {
  const scenario = {...api.NEIGHBORHOOD_SCENARIO, actors: [],
    ignitions: [{x: 10.75, y: 34.75, radius: .6, heat: 3}, {x: 20.25, y: 12.25, radius: .6, heat: 3}, {x: 40.25, y: 27.25, radius: .6, heat: 3}]};
  const sim = api.createSimulation({scenario, config: {fire: {damagePerSecond: 0}}});
  let s, peak = 0, sum = 0, sites = 0;
  const start = cpu();
  for (let i = 0; i < 1500; i++) { s = sim.advance(api.STEP); peak = Math.max(peak, s.diagnostics.burningCells); sum += s.diagnostics.burningCells; sites = Math.max(sites, s.structureFire.length); }
  const ms = (cpu() - start) / 1500; sim.dispose();
  return {ms, peak, mean: sum / 1500, sites};
}
for (const [name, bench] of [['idle', idle], ['burning', burning]]) {
  const samples = Object.fromEntries(trees.map(([label]) => [label, []])); let info = {};
  for (let round = 0; round < rounds; round++) for (const [label, api] of (round % 2 ? [...trees].reverse() : trees)) { const out = bench(api); samples[label].push(out.ms); info[label] = out; }
  console.log(`== ${name}: CPU ms per advance, median of ${rounds} interleaved rounds ==`);
  for (const [label] of trees) console.log(`   ${label.padEnd(5)} ${r(median(samples[label]), 3)} ms  (rounds: ${samples[label].map(v => r(v, 2)).join(', ')})` +
    (info[label].peak !== undefined ? `  peak burning cells ${info[label].peak}, mean ${r(info[label].mean, 1)}, peak warm/burning structure sites ${info[label].sites}` : ''));
}
