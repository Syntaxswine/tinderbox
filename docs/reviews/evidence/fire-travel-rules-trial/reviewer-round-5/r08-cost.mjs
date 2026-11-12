// Cost per step, and the size of the active set, for the trial's three cost scenes. Run alone, once per kernel:
//   node reviewer-round-5/r08-cost.mjs <one|three|eight>
//   KERNEL=./kernel-06061b0.mjs node reviewer-round-5/r08-cost.mjs <one|three|eight>      (round 4's kernel, before the fix)
// The scenes are the ones trial.mjs builds for target 15.
const M = await import('./measure-var.mjs');
const {make, house, lawn, strike, ALL, PITCH, round} = M;
const which = process.argv[2] ?? 'one';
const world = make(), a = house(world, 'A', 'hopkins-4-15', 6, 6, ALL), width = a.plan.width, depth = a.plan.depth;
let at = 'room:0:kitchen';
if (which === 'three') { house(world, 'B', 'hopkins-4-15', 6 + width + 2, 6); house(world, 'C', 'hopkins-4-15', 6, 6 + depth + 2); lawn(world, 0, 0, 70, 70); at = 'room:0:hall'; }
if (which === 'eight') { for (let n = 1; n < 8; n++) house(world, 'N' + n, 'hopkins-4-15', 6 + (n % 4) * (width + 3), 6 + Math.floor(n / 4) * (depth + 3)); lawn(world, 0, 0, Math.round((12 + 4 * (width + 3)) / PITCH), Math.round((12 + 2 * (depth + 3)) / PITCH)); at = 'room:0:hall'; }
strike(world, a, at);
const steps = 4500, costs = new Float64Array(steps); let activeSum = 0, peak = 0;
for (let n = 0; n < steps; n++) { const t0 = performance.now(); world.step(); costs[n] = performance.now() - t0; activeSum += world.active.size; if (world.active.size > peak) peak = world.active.size; }
const sorted = [...costs].sort((p, q) => p - q), mean = costs.reduce((s, v) => s + v, 0) / steps;
console.log((process.env.KERNEL ?? '../kernel.mjs').padEnd(24) + which.padEnd(6) + ' per step: ' + round(mean, 2) + ' ms mean, ' + round(sorted[Math.floor(.95 * steps)], 2) + ' ms 95th centile, ' + round(sorted[steps - 1], 1) + ' ms worst; active tiles: mean ' + Math.round(activeSum / steps) + ', peak ' + peak
  + '; events ' + world.events.length + '; lit events ' + world.events.filter(e => e.type === 'lit').length + '; last lit ' + round(Math.max(...world.events.filter(e => e.type === 'lit').map(e => e.time))) + ' s');
