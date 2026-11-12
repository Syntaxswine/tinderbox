// A check of one kernel path no trial scene uses: an air tile laid AFTER the first step must still be
// told about the surface standing against it (review round 5, S2; made cheap in round 6, S6).
//   node docs/reviews/evidence/fire-travel-rules-trial/late-tile.mjs
// A clapboard wall on the +x face of tile (0,0,0). The air tile (1,0,0) is laid after one second and then
// held at the heat ceiling. The wall should light after clapboard delay x lighting point / (ceiling less one step's loss).
import {createWorld} from './kernel.mjs';
const world = createWorld(), holder = world.addTile(0, 0, 0);
const wall = world.addFuel(holder, 'clapboard', 1, {face: {axis: 0, step: 1, object: world.setFace(0, 0, 0, 0, 1, 'timber')}});
for (let n = 0; n < 30; n++) world.step();
const air = world.addTile(1, 0, 0), laidAt = world.time;
for (let n = 0; n < 300 && wall.litAt === null; n++) { air.heat = world.rules.maxHeat; world.active.add(air); world.step(); }
console.log(wall.litAt === null ? 'FAIL: the wall never lit' : 'the wall lit ' + (wall.litAt - laidAt).toFixed(3) + ' s after the air tile was laid and heated (expected about '
  + (world.fuels.clapboard.delay * world.fuels.clapboard.lightAt / (world.rules.maxHeat * (1 - world.rules.loss * world.dt))).toFixed(2) + ' s)');
