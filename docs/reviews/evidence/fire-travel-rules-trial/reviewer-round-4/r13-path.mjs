// Round 4. The sleeping-surface case on a lawn: a house with a path one tile (0.5 m) wide round it, lawn beyond.
// The path tiles are the house's own ring of empty tiles; the lawn starts one tile further out.
// Author's kernel (no switch) against kernel-var's wakeFacing (Rule 2 as written).
import {make, house, outsideWalls, PLANS, PITCH, round} from './measure-var.mjs';
for (const planId of PLANS) for (const rules of [{}, {wakeFacing: 1e-3}]) {
  const world = make(rules), a = house(world, 'A', planId, 8, 8, {});
  const ring = new Set(outsideWalls(world, a).map(w => w.outside));
  const I = Math.round((16 + a.plan.width) / PITCH), J = Math.round((16 + a.plan.depth) / PITCH);
  // lawn everywhere there is no tile yet (so the one-tile ring stays bare)
  for (let j = 0; j < J; j++) for (let i = 0; i < I; i++) if (!world.tileAt(i, j, 0)) world.addFuel(world.addTile(i, j, 0), 'grass', 1);
  world.ignite(world.tileAt(2, 2, 0));
  let peak = 0;
  for (let n = Math.round(60 / world.dt); n > 0; n--) { world.step(); for (const t of ring) if (t.heat > peak) peak = t.heat; }
  const walls = outsideWalls(world, a), lit = walls.filter(w => w.fuel.litAt !== null);
  console.log(planId.padEnd(15) + (rules.wakeFacing ? 'wakeFacing     ' : 'author\'s kernel ') + 'grass burnt: ' + (world.ledger.burnt > 100) + '; hottest path tile ' + round(peak) + '; ground wall faces lit in 60 s: ' + lit.length + ' of ' + walls.length + (lit.length ? ', first at ' + round(Math.min(...lit.map(w => w.fuel.litAt))) + ' s' : ''));
}
