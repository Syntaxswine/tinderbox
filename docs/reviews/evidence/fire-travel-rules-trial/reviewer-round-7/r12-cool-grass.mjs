// Round 7. "Grass that burns too coolly to light a wall" (a remedy the record offers the owner). A lawn fire
// lit 8 m from Hopkins 12, lawn up to the walls, for a range of grass outputs. Does the grass still spread, and does the wall still light?
//   node r12-cool-grass.mjs
import {make, house, lawn, outsideWalls, round, PITCH} from '../measure.mjs';
for (const out of [.7, .6, .5, .45, .42, .4, .38, .35]) {
  const world = make({}, {grass: {out}}), a = house(world, 'A', 'hopkins-4-12', 8, 8, {}), W = Math.round((16 + a.plan.width) / PITCH), D = Math.round((16 + a.plan.depth) / PITCH);
  lawn(world, 0, 0, W, D);
  world.ignite(world.tileAt(1, D >> 1, 0));
  for (let s = Math.round(120 / world.dt); s > 0; s--) world.step();
  const walls = outsideWalls(world, a).filter(w => w.outside.fuels.some(f => f.cls === 'grass'));
  const reached = walls.filter(w => w.outside.fuels[0].litAt !== null), lit = reached.filter(w => w.fuel.litAt !== null), waits = lit.map(w => w.fuel.litAt - w.outside.fuels[0].litAt).filter(v => v >= 0);
  let grassAll = 0, grassLit = 0; for (const t of world.tiles.values()) for (const f of t.fuels) if (f.cls === 'grass') { grassAll++; if (f.litAt !== null) grassLit++; }
  const arrive = reached.length ? Math.min(...reached.map(w => w.outside.fuels[0].litAt)) : null;
  console.log('grass output ' + out + ': ' + grassLit + ' of ' + grassAll + ' grass tiles burnt in 120 s; front reached the house at ' + round(arrive) + ' s (8 m: ' + (arrive ? round(7.5 / arrive, 2) + ' m/s' : 'n/a') + '); wall faces with burnt grass against them ' + reached.length + '/' + walls.length + ', of those lit ' + lit.length
    + (waits.length ? ', wait ' + round(Math.min(...waits)) + ' to ' + round(Math.max(...waits)) + ' s' : ''));
}
