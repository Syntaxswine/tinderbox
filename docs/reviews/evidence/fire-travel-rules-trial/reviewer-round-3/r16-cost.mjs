// Cost per step, the trial's three scenes (trial.mjs lines 121-125), with the steps split into those that
// work out reach (every 15th) and the rest. Run alone.
//   node r16-cost.mjs one | three | eight
import {burn, lawn, plan, round, PITCH} from './lib.mjs';
const which = process.argv[2] ?? 'one', p = plan('hopkins-4-15'), width = p.width, depth = p.depth;
const eightHouses = []; for (let n = 1; n < 8; n++) eightHouses.push(['N' + n, 6 + (n % 4) * (width + 3), 6 + Math.floor(n / 4) * (depth + 3)]);
const opts = {one: {}, three: {at: 'room:0:hall', neighbours: [['B', 6 + width + 2, 6], ['C', 6, 6 + depth + 2]], before: world => lawn(world, 0, 0, 70, 70)},
  eight: {at: 'room:0:hall', neighbours: eightHouses, before: world => lawn(world, 0, 0, Math.round((12 + 4 * (width + 3)) / PITCH), Math.round((12 + 2 * (depth + 3)) / PITCH))}}[which];
const r0 = burn({seconds: 1 / 30, ...opts}), world = r0.world, steps = 150 * 30 - 1;
const cost = new Float64Array(steps), isReach = new Uint8Array(steps); let peak = 0;
for (let n = 0; n < steps; n++) { const lines = world.stats.sightLines, t = performance.now(); world.step(); cost[n] = performance.now() - t; isReach[n] = world.stats.ticks % 15 === 0 ? 1 : 0; if (world.active.size > peak) peak = world.active.size; }
const all = [...cost].sort((a, b) => a - b), mean = l => l.reduce((s, v) => s + v, 0) / l.length;
const reach = [...cost].filter((_, n) => isReach[n]), rest = [...cost].filter((_, n) => !isReach[n]);
const order = [...cost.keys()].sort((a, b) => cost[b] - cost[a]).slice(0, 20);
console.log(which.padEnd(6) + 'mean ' + round(mean(all), 1) + ' ms, 95th ' + round(all[Math.floor(.95 * steps)], 1) + ', worst ' + round(all.at(-1), 1) + ', peak active ' + peak + ' | steps over 16.7 ms: ' + all.filter(v => v > 16.7).length + ' of ' + steps + ', over 33.3 ms: ' + all.filter(v => v > 33.3).length
  + ' | reach steps: mean ' + round(mean(reach), 1) + ', worst ' + round(Math.max(...reach), 1) + ' | other steps: mean ' + round(mean(rest), 1) + ', 95th ' + round(rest.sort((a, b) => a - b)[Math.floor(.95 * rest.length)], 1) + ', worst ' + round(rest.at(-1), 1)
  + ' | of the 20 worst steps, reach steps: ' + order.filter(n => isReach[n]).length + ', at ' + round(Math.min(...order.map(n => (n + 2) / 30)), 0) + ' to ' + round(Math.max(...order.map(n => (n + 2) / 30)), 0) + ' s | half ' + round(r0.half) + ' sight lines ' + world.stats.sightLines);
