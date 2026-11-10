// Balance: the Hopkins 15 grass traces pinned in docs/engineering/fire-exposure.md ("November 10 frontage follow-up"),
// re-measured on this tree, with 720f7b6 (m5, before the contact fix) as the control. Same fixture as the repo's test
// 'a sustained grass front catches siding and a weaker grass strike cools' (tests/integration/cottage-fire-interactions):
// one match from (25.48, 8.5) aimed at (24.85, 8.5), beside the Hopkins 15 east wall, on three lawns:
//   full lawn (the match lights 4 cells)  | a 0.5 x 1 m strip (2 cells: the test's control BEFORE the fix) | one 0.5 m cell
// Doc pins for this tree: 4 cells -> siding at 0.933 s after the match; 2 cells -> 2.383 s; 1 cell -> peak 0.567, no ignition.
// Usage: node r12-pinned-traces.mjs
import {load, HEAD, M5, r} from './lib.mjs';
for (const [label, root] of [['this tree', HEAD], ['m5 720f7b6 (control)', M5]]) {
  const api = await load(root);
  console.log(`== ${label} ==`);
  for (const [name, patches] of [['full lawn       ', null], ['0.5 x 1 m strip ', [{x: 24.5, y: 8, width: .5, depth: 1, material: 'grass'}]], ['one 0.5 m cell   ', [{x: 24.5, y: 8.5, width: .5, depth: .5, material: 'grass'}]]]) {
    const scenario = {...api.NEIGHBORHOOD_SCENARIO, actors: [], player: {x: 25.48, y: 8.5, tool: 'matches'}, ...(patches ? {patches} : {})};
    const sim = api.createSimulation({scenario, seed: 1893, config: {fire: {damagePerSecond: 0}}});
    sim.dispatch({type: 'aim', x: 24.85, y: 8.5}); sim.dispatch({type: 'primary', pressed: true});
    let s = sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false});
    const started = s.clocks.world, use = s.events.find(e => e.type === 'tool-use');
    let peak = 0, first, cooled = null;
    for (let i = 0; i < 14 * 60 && !first; i++) {
      s = sim.advance(api.STEP);
      const warm = s.structureFire.filter(f => f.buildingId === 'hopkins-fifteen' && f.ignitionTime === null);
      peak = Math.max(peak, ...warm.map(f => f.heatFraction));
      if (peak > 0 && !warm.length && cooled === null) cooled = s.clocks.world;
      first = s.events.find(e => e.type === 'structure-ignition' && e.buildingId === 'hopkins-fifteen');
    }
    console.log(`   ${name}: match lit ${use?.heatedCells} cells | peak siding preheat ${r(peak, 3)} of ignition | ` +
      (first ? `siding IGNITES ${r(first.worldTime - started, 3)} s after the match (world ${r(first.worldTime, 3)} s), cause ${first.cause}` : `no ignition; siding back to zero at world ${r(cooled, 3)} s`));
    sim.dispose();
  }
}
