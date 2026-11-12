// Scene audit. Rule 1: "A surface always has a tile on both sides". For each plan: every fuel face and
// every glass face must have a tile on both sides. Also: floors, layers, tiles, low roofs, stair cells, and
// whether any upper-storey cell overhangs (no room below).
//   node r01-scene-audit.mjs
import {make, house, plan, PLANS, ALL} from './lib.mjs';
const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
for (const planId of PLANS) {
  const world = make(), a = house(world, 'A', planId, 6, 6, ALL), p = plan(planId);
  let surfaces = 0, missing = 0, roofs = 0, lowRoofs = 0, topRoofs = 0, glass = 0, glassMissing = 0, top = 0, air = 0, house_ = 0, noFloor = 0, overhang = 0;
  for (const t of world.tiles.values()) { if (t.k > top) top = t.k; if (t.building) house_++; else air++; }
  const roofTop = 2 * p.floors.length - 1;
  for (const t of world.tiles.values()) for (const f of t.fuels) {
    if (!f.face) continue;
    surfaces++;
    if (!world.across(t, f.face)) { missing++; console.log('  MISSING far tile', planId, t.i, t.j, t.k, f.cls, f.face); }
    if (f.cls === 'roof') { roofs++; if (t.k < roofTop) lowRoofs++; else topRoofs++; }
  }
  for (const [key, face] of world.faces) if (face.kind === 'glass') {
    glass++;
    const axis = key % 3, cell = (key - axis) / 3, i = cell % 512 - 64, j = Math.floor(cell / 512) % 512 - 64, k = Math.floor(cell / 512 / 512) - 2;
    if (!world.tileAt(i, j, k) || !world.tileAt(i + AX[axis][0], j + AX[axis][1], k + AX[axis][2])) glassMissing++;
  }
  for (const r of a.rooms.values()) for (const t of r.tiles) if (t.k >= 2 && t.k % 2 === 0) {
    if (!t.fuels.some(f => f.supports)) noFloor++;
    const below = world.tileAt(t.i, t.j, t.k - 1); if (!below || !below.building) overhang++;
  }
  // tiles at the top layer: have anything above? heat sent up from them is lost
  console.log(planId.padEnd(15), 'floors', p.floors.length, 'size', p.width + 'x' + p.depth, 'top layer', top, 'house tiles', house_, 'air tiles', air, 'surfaces', surfaces, 'with no far tile', missing,
    '| roofs', roofs, '(low', lowRoofs + ', top', topRoofs + ')', '| glass', glass, 'missing a side', glassMissing, '| upper cells with no floor (stair)', noFloor, 'overhanging upper cells', overhang,
    '| windows listed', p.floors.map(f => (f.windows ?? []).length).join('+'), 'rooms', p.floors.map(f => f.rooms.length).join('+'), 'stairs', p.floors.map(f => f.stairs ? 'y' : 'n').join(''));
}
