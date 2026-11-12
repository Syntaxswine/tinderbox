// Round 6. kernel.mjs step 2 walks a copy of the active set and, per tile, a copy of its fuels. A fuel that
// falls (letGo pushes it into the landing tile's list) is burnt again in the same step if the landing tile
// comes later in the walk. Does it happen, and how much is it?
//   node reviewer-round-6/r13-fall-twice.mjs
import {createWorld} from '../kernel.mjs';
for (const groundAwake of [false, true]) {
  const w = createWorld(); for (let k = 0; k <= 3; k++) w.addTile(0, 0, k);
  const U = w.tileAt(0, 0, 2), G = w.tileAt(0, 0, 0);
  const sofa = w.addFuel(U, 'furniture', 1);
  const floor = w.addFuel(U, 'frame', .02, {supports: true, face: {axis: 2, step: -1, object: w.setFace(0, 0, 2, 2, -1, 'timber')}});
  w.ignite(U, 'furniture'); w.ignite(U, 'frame');
  let before = sofa.amount, drop = null, steps = 0;
  while (U.fuels.includes(sofa) && steps < 300) { if (groundAwake) { G.heat = Math.max(G.heat, .5); w.active.add(G); } before = sofa.amount; w.step(); steps++; }
  drop = before - sofa.amount;
  console.log('ground tile ' + (groundAwake ? 'awake' : 'asleep') + ' when the floor goes (step ' + steps + '): the sofa lost ' + (drop * 30 * 30).toFixed(2) + ' steps of burning in the step it fell; ledger ' + (w.ledger.laid - w.ledger.burnt - w.remaining()).toExponential(1));
}
