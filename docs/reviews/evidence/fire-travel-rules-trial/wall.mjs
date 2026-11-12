// Target 3 on a free-standing clapboard wall, 20 m long and six layers tall, with no floors or partitions:
// a match held at its foot, outside. Speed up the wall against speed along it.
//   node docs/reviews/evidence/fire-travel-rules-trial/wall.mjs [rules json] [fuels json]
import {make, round, LAYER} from './measure.mjs';
export function bareWall(rules = {}, fuels = {}) {
  const world = make(rules, fuels);
  for (let j = 0; j <= 40; j++) for (let k = 0; k <= 5; k++) {
    const tile = world.addTile(0, j, k); world.addTile(1, j, k); world.addTile(-1, j, k);
    world.addFuel(tile, 'clapboard', 1, {face: {axis: 0, step: 1, object: world.setFace(0, j, k, 0, 1, 'timber')}});
  }
  const fuelAt = (j, k) => world.tileAt(0, j, k).fuels[0];
  world.ignite(world.tileAt(0, 20, 0), null, {fuel: fuelAt(20, 0), from: world.tileAt(1, 20, 0)});
  for (let n = Math.round(90 / world.dt); n > 0; n--) world.step();
  const up = 5 * LAYER / fuelAt(20, 5).litAt, along = 3 / Math.max(fuelAt(26, 0).litAt, fuelAt(14, 0).litAt);
  return {up, along, ratio: up / along};
}
if (process.argv[1].endsWith('wall.mjs')) {
  const w = bareWall(JSON.parse(process.argv[2] ?? '{}'), JSON.parse(process.argv[3] ?? '{}'));
  console.log((process.argv[2] ?? '{}') + ' ' + (process.argv[3] ?? '') + ': ' + round(w.up) + ' m/s up, ' + round(w.along) + ' m/s along, ' + round(w.ratio, 2) + ' to 1');
}
