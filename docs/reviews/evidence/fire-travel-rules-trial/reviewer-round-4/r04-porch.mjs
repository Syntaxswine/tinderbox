// Round 4. What the porch does. The survey strikes that front a porch, with the porch and (control) with the
// plan's porch switched off in scene-var.mjs; and the lawn-to-wall time through a porch.
import {make, house, lawn, burn, outsideWalls, strikesOf, plan, PLANS, ALL, PITCH, round, SWITCH} from './measure-var.mjs';
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
// The plan objects are frozen, so the control uses scene-var.mjs (a copy of scene.mjs with a noPorch switch).
const cases = [['hopkins-4-15', 'wall:y-:10:0'], ['hopkins-4-12', 'wall:y-:8:0'], ['hopkins-4-13', 'wall:y-:8:0'], ['hopkins-4-09', 'wall:y-:7:0'], ['ashland-worker', 'wall:y-:6:0'], ['monroe-row', 'wall:y-:7:0'], ['hopkins-4-15', 'room:0:kitchen'], ['hopkins-4-12', 'room:0:kitchen']];
console.log('(a) survey strikes on the front (y-) wall and a kitchen fire, with the porch and without');
for (const [planId, at] of cases) for (const suffix of at.startsWith('wall') ? ['', ':in'] : ['']) {
  const out = [];
  for (const porch of [true, false]) {
    SWITCH.noPorch = !porch;
    const r = burn({planId, at: at + suffix, seconds: 300});
    // world-wide state of the porch
    const porchFuels = r.a.porch.flatMap(t => t.fuels.filter(f => f.cls === 'frame' || f.cls === 'roof'));
    const firstPorch = Math.min(...porchFuels.map(f => f.litAt ?? Infinity)), porchFall = r.world.events.find(e => e.type === 'fall' && e.building === null);
    out.push((porch ? 'porch' : 'none ') + ': struck ' + (r.struck.wall?.fuel.cls ?? 'furniture') + ', room ' + round(r.roomAll) + ' s, half ' + round(r.half) + ' s, climb ' + JSON.stringify(r.climb?.map(v => round(v)) ?? null) + ', first fall counted ' + round(r.fall?.time)
      + (porch ? '; porch: ' + porchFuels.length + ' fuels, first lit ' + round(firstPorch) + ' s, never lit ' + porchFuels.filter(f => f.litAt === null).length + ', first uncounted fall (no building label) ' + round(porchFall?.time) + ' s' : ''));
  }
  SWITCH.noPorch = false;
  console.log('  ' + planId.padEnd(15) + (at + suffix).padEnd(18) + out.join('\n' + ' '.repeat(35)));
}
console.log('(b) a lawn fire lit 3 m out from the front wall: seconds from the grass touching the porch (or the wall) lighting to the wall behind lighting');
for (const planId of PLANS) {
  const at = strikesOf(planId).find(s => s.startsWith('wall:y-') && !s.endsWith(':in'));
  const world = make(), a = house(world, 'A', planId, 8, 8, {}), [, side, ci, cj] = at.split(':');
  lawn(world, 0, 0, Math.round((16 + a.plan.width) / PITCH), Math.round((16 + a.plan.depth) / PITCH));
  const wall = outsideWalls(world, a).find(w => w.side === side && w.tile.i === a.origin[0] + +ci && w.tile.j === a.origin[1] + +cj);
  // walk outward from the wall to the first grass tile
  let j = wall.outside.j; while (world.tileAt(wall.outside.i, j, 0)?.fuels[0]?.cls !== 'grass') j--;
  const grass = world.tileAt(wall.outside.i, j, 0).fuels[0];
  world.ignite(world.tileAt(wall.outside.i, j - 6, 0));
  run(world, 40);
  console.log('  ' + planId.padEnd(15) + at.padEnd(14) + ' tiles of porch deck between grass and wall: ' + (wall.outside.j - j) + '; nearest grass lit ' + round(grass.litAt) + ' s; wall (' + wall.fuel.cls + ') lit ' + round(wall.fuel.litAt) + ' s; wait ' + round(wall.fuel.litAt - grass.litAt) + ' s');
}
