// Round 2 re-check, finding N2: the fix lets flame pass over the plinth. Can the bear now walk over it?
// The bear starts on the lawn beside the Hopkins 9 notch and walks west at the wall for 4 s.
// The control walks at a wall of the same house that is flush with the plinth, 2 m along.
//   node docs/reviews/evidence/hostile-review-round-2/notch-walk.mjs
import {createSimulation, street, round, STEP} from './lib.mjs';

function walk(label, x, y) {
  const sim = createSimulation({scenario: street({player: {x, y}, actors: []}), seed: 1893,
    config: {input: {cameraRelative: false}}});   // so that x: -1 means world west
  sim.advance(STEP); sim.dispatch({type: 'pause', paused: false});
  sim.dispatch({type: 'move', x: -1, y: 0});
  let snapshot;
  for (let i = 0; i < 4 / STEP; i++) snapshot = sim.advance(STEP);
  console.log(label + ': started at x ' + x + ', stopped at x ' + round(snapshot.player.x) + ' (moved ' + round(x - snapshot.player.x) + ' m)');
  sim.dispose();
}
walk('at the notch wall (wall face x 9.08, plinth face x 10.09)', 12.5, 32.5);
walk('at the flush wall, 2 m along (wall and plinth face x 10.09)', 12.5, 34.5);
// Positive control: the same walk on open lawn north of the house row is not stopped.
walk('open ground (no building in the way)', 12.5, 22.5);
