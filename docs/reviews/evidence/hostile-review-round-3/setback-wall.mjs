// Round 2, finding N2, checked independently of the reviewer's probe.
// Hopkins 9 is L-shaped, but its collision box is the plan's full rectangle (7.18 x 10.18 m, 4.6 m high).
// A clapboard wall in the notch stands 1.09 m inside that box. Can the player light it?
// The control is a wall of the same house that is flush with the box, 2 m further along.
//   node docs/reviews/evidence/hostile-review-round-2/setback-wall.mjs
import {createSimulation, street, table, round, STEP} from './lib.mjs';

function attempt(tool, playerY, aimX, seconds) {
  const sim = createSimulation({scenario: street({player: {x: 10.68, y: playerY}, actors: []}), seed: 1893});
  sim.advance(STEP); sim.dispatch({type: 'pause', paused: false});
  sim.dispatch({type: 'select-tool', tool}); sim.dispatch({type: 'aim', x: aimX, y: playerY});
  sim.dispatch({type: 'primary', pressed: true});
  let result = null, hottest = 0, first = null;
  for (let i = 0; i < seconds / STEP; i++) {
    const snapshot = sim.advance(STEP);
    if (tool !== 'flamethrower' && (i === 0 || i === 31)) sim.dispatch({type: 'primary', pressed: false});
    // A torch is lit by its first press and used by its second.
    if (tool === 'torch' && i === 30) sim.dispatch({type: 'primary', pressed: true});
    const uses = snapshot.events.filter(event => event.type === 'tool-use');
    if (uses.length) result = uses.map(event => event.result).join(', then ');
    for (const sample of snapshot.structureFire) if (sample.buildingId === 'hopkins-nine') hottest = Math.max(hottest, sample.heatFraction ?? 0, sample.flame ? 1 : 0);
    first ??= snapshot.events.find(event => event.type === 'structure-ignition' && event.buildingId === 'hopkins-nine') ?? null;
  }
  sim.dispose();
  return {'tool-use events': result ?? 'none', 'hottest Hopkins 9 site (1 = ignition)': round(hottest, 2),
    'first ignition': first ? first.siteId.split('/')[1] + ' by ' + first.cause + ' at ' + round(first.worldTime, 2) + ' s' : 'none'};
}

const rows = [];
for (const [wall, playerY, aimX] of [['set back 1.09 m: wall:0:6,2|6,3 at x 9.08', 32.5, 9.08], ['flush (control): wall:0:7,4|7,5 at x 10.08', 34.5, 10.08]])
  for (const [tool, seconds] of [['matches', 2], ['torch', 2], ['flamethrower', 1.5]])
    rows.push({wall, tool, 'held or watched s': seconds, ...attempt(tool, playerY, aimX, seconds)});
console.log('The player stands on the lawn at x 10.68, 0.59 m from the collision box, facing the wall.\n');
console.log(table(rows, Object.keys(rows[0])));
