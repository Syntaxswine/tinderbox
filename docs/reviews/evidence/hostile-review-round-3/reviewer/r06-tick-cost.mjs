// r06: per-frame cost of advance(1/60), this tree against tip2 (26931d9), measured in ONE process with the two
// trees stepped through the same inputs in alternating blocks (A B B A ...), so machine load and clock drift hit
// both equally. Wall clock (performance.now), block medians and paired per-block ratios; never CPU ticks.
// Phases: idle street; a flamethrower held against Hopkins 9's east wall; the house and lawn fire that follows.
// Run: TB_TREES=<dir with tip2/> node r06-tick-cost.mjs [rounds=3]
import {HEAD, TIP2, load, r} from './lib.mjs';
const ROUNDS = +process.argv[2] || 3, BLOCK = 120;
const head = await load(HEAD), tip = await load(TIP2);
const median = list => { const s = [...list].sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

function make(api) {
  const scenario = {...api.NEIGHBORHOOD_SCENARIO, player: {...api.NEIGHBORHOOD_SCENARIO.player, x: 11.6, y: 34.5, tool: 'flamethrower', heading: Math.PI}};
  const t0 = performance.now();
  const sim = api.createSimulation({scenario, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
  return {sim, api, create: performance.now() - t0};
}
function block(entry, n = BLOCK) {
  const t0 = performance.now();
  for (let i = 0; i < n; i++) entry.sim.advance(entry.api.STEP);
  return (performance.now() - t0) / n;
}
const phases = {idle: [], flame: [], 'burn 3-20s': [], 'burn 20-60s': [], 'burn 60-150s': [], 'collapse 150-200s': []};
const creates = {head: [], tip: []};
for (let round = 0; round < ROUNDS; round++) {
  const a = make(head), b = make(tip);
  creates.head.push(a.create); creates.tip.push(b.create);
  let flip = round % 2 === 1;
  const pair = name => {
    const first = flip ? b : a, second = flip ? a : b;
    const t1 = block(first), t2 = block(second);
    phases[name].push(flip ? [t2, t1] : [t1, t2]);
    flip = !flip;
  };
  block(a, 30); block(b, 30);                                   // warm both
  for (let i = 0; i < 8; i++) pair('idle');                     // 16 s idle
  for (const e of [a, b]) { e.sim.dispatch({type: 'aim', x: 9.5, y: 34.5}); e.sim.dispatch({type: 'primary', pressed: true}); }
  for (let i = 0; i < 1; i++) pair('flame');                    // 2 s of held flamethrower
  for (const e of [a, b]) e.sim.dispatch({type: 'primary', pressed: false});
  for (let i = 0; i < 8; i++) pair('burn 3-20s');
  for (let i = 0; i < 20; i++) pair('burn 20-60s');
  for (let i = 0; i < 45; i++) pair('burn 60-150s');
  for (let i = 0; i < 25; i++) pair('collapse 150-200s');
  const sa = a.sim.snapshot(), sb = b.sim.snapshot();
  console.log(`round ${round}: create HEAD ${r(a.create, 1)} ms tip2 ${r(b.create, 1)} ms; at end burning cells HEAD ${sa.diagnostics.burningCells} tip2 ${sb.diagnostics.burningCells}, structure samples HEAD ${sa.structureFire.length} tip2 ${sb.structureFire.length}`);
  a.sim.dispose(); b.sim.dispose();
}
console.log(`\nper advance(1/60), wall clock ms, ${ROUNDS} rounds, ${BLOCK}-step blocks alternated in one process`);
console.log('phase               blocks   HEAD median   tip2 median   median paired ratio HEAD/tip2   [min..max ratio]');
for (const [name, pairs] of Object.entries(phases)) {
  const ratios = pairs.map(([x, y]) => x / y);
  console.log(`${name.padEnd(19)} ${String(pairs.length).padStart(6)}   ${r(median(pairs.map(p => p[0])), 4).toString().padStart(11)}   ${r(median(pairs.map(p => p[1])), 4).toString().padStart(11)}   ${r(median(ratios), 3).toString().padStart(10)}                     [${r(Math.min(...ratios), 2)}..${r(Math.max(...ratios), 2)}]`);
}
console.log(`createSimulation median: HEAD ${r(median(creates.head), 1)} ms, tip2 ${r(median(creates.tip), 1)} ms`);
