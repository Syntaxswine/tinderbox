// r19: the flamethrower fan's ray budget in the real street. discharge.js adds three rays per blocker corner and
// falls back from a connected, corner-trimmed fan to 25 unconnected regular rays when the list exceeds 256.
// The authored blockers of Hopkins 9 and 13 add many corners. Stand at every legal point of a 0.5 m grid in the
// gap between the two houses and around both, fire in 16 directions, and record the ray count and whether the fan
// stayed connected. Control: tip2 (26931d9). Run: TB_TREES=<dir with tip2/> node r19-fan-ray-budget.mjs
import {HEAD, TIP2, load, r} from './lib.mjs';
for (const [label, root] of [['HEAD', HEAD], ...(process.env.TB_TREES ? [['tip2', TIP2]] : [])]) {
  const api = await load(root);
  let shots = 0, unconnected = 0, max = 0, stances = 0; const examples = [], hist = new Map();
  for (let x = 1.5; x <= 24.5; x += .5) for (let y = 27.5; y <= 41.5; y += .5) {
    let sim;
    try { sim = api.createSimulation({scenario: {...api.NEIGHBORHOOD_SCENARIO, actors: [], player: {x, y, tool: 'flamethrower'}}, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, inventory: {flamethrowerFuel: 60}}}); }
    catch { continue; }
    stances++;
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8;
      sim.dispatch({type: 'aim', x: x + Math.cos(a) * 1.2, y: y + Math.sin(a) * 1.2}); sim.dispatch({type: 'primary', pressed: true});
      const s = sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false}); sim.advance(api.STEP);
      if (!s.discharge.active) continue;
      shots++; max = Math.max(max, s.discharge.rays.length);
      const bucket = Math.min(5, Math.floor(s.discharge.rays.length / 50)); hist.set(bucket, (hist.get(bucket) ?? 0) + 1);
      if (!s.discharge.connectRays) { unconnected++; if (examples.length < 5) examples.push(`stance (${x},${y}) heading ${r(a * 180 / Math.PI, 0)} deg: ${s.discharge.rays.length} rays, unconnected`); }
    }
    sim.dispose();
  }
  console.log(`${label}: ${stances} legal stances, ${shots} shots; fans that lost their connected shape ${unconnected}; most rays in one fan ${max}; rays per fan histogram (0-49, 50-99, ...): ${[0, 1, 2, 3, 4, 5].map(b => hist.get(b) ?? 0).join(' / ')}`);
  for (const line of examples) console.log('    ' + line);
}
