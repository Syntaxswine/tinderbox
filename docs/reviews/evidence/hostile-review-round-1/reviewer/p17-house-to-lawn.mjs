// A: does a burning ordinary house light the lawn beside it? (The repo has no test for it: mutant 'house-never-lights-the-ground' survives all 257.)
// Hopkins 12 on paving, grass only along its WEST wall, one match on its EAST wall. Control: same, grass 1.5 m away from the wall.
import {createSimulation, press, lastTool, r, STEP} from './lib.mjs';
for (const [label, patch] of [['grass touching the west wall', {x: 6, y: 9, width: 4, depth: 10, material: 'grass'}], ['CONTROL grass starting 1.5 m from the wall', {x: 4.5, y: 9, width: 4, depth: 10, material: 'grass'}]]) {
  const house = {id: 'h12', prefabId: 'hopkins-4-12', x: 10, y: 10, quarterTurns: 0};
  const sim = createSimulation({scenario: {id: 'neighborhood', width: 28, height: 24, buildings: [house], obstacles: [], actors: [], patches: [patch],
    player: {x: 18.82, y: 13.5, tool: 'matches', heading: Math.PI}}, config: {fire: {damagePerSecond: 0}}});
  let s = press(sim, 17.9, 13.5); const use = lastTool(s), events = new Map(); let firstGround = null;
  for (let i = 0; i < 40 * 60; i++) {
    s = sim.advance(STEP);
    for (const e of s.events) if (!events.has(e.id)) { events.set(e.id, e); if (e.type === 'ignition' && !firstGround) firstGround = e; }
  }
  console.log(label.padEnd(42), '| match:', use.result, use.cellIds.join(' '), '| house destroyed', s.world.buildings[0].destroyed,
    '| first ground ignition:', firstGround ? `${firstGround.cellId} cause=${firstGround.cause} t=${r(firstGround.tick * STEP, 2)}` : 'NONE',
    '| grass cells spent', s.cells.filter(c => c.material === 'grass' && c.phase === 'spent').length, 'of', s.cells.filter(c => c.material === 'grass').length);
  sim.dispose();
}
