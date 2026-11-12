// Round 6. The record: "furniture 1 in the middle of every room". scene.mjs:143 takes
// record.cells[floor(length / 2)] from a list in raster order (rows of y, then x). Where is that tile?
//   node reviewer-round-6/r14-furniture-place.mjs
import {make, house, PLANS, ALL} from '../measure.mjs';
let rooms = 0, atWall = 0, kitchens = 0, kitchensAtWall = 0, off = [];
for (const planId of PLANS) {
  const w = make(), a = house(w, 'A', planId, 6, 6, ALL), lines = [];
  for (const rec of a.rooms.values()) {
    const is = rec.cells.map(c => c[0]), js = rec.cells.map(c => c[1]);
    const i0 = Math.min(...is), i1 = Math.max(...is), j0 = Math.min(...js), j1 = Math.max(...js);
    const ci = rec.centre.i - a.origin[0], cj = rec.centre.j - a.origin[1];
    // is the tile on the x- side of the furniture tile outside this room?
    const left = w.tileAt(rec.centre.i - 1, rec.centre.j, rec.centre.k), wall = !left || left.room !== rec.label;
    const fromMiddle = Math.hypot(ci - (i0 + i1) / 2, cj - (j0 + j1) / 2) * .5;
    rooms++; if (wall) atWall++; off.push(fromMiddle);
    const store = w.tileAt(rec.centre.i + 1, rec.centre.j, rec.centre.k)?.fuels.some(f => f.store === 'oil');
    if (rec.type === 'kitchen') { kitchens++; if (wall) kitchensAtWall++; }
    lines.push(rec.id + ' ' + (i1 - i0 + 1) + 'x' + (j1 - j0 + 1) + (wall ? ' AT ITS x- WALL' : ' inside') + ' (' + fromMiddle.toFixed(2) + ' m from the middle)' + (store ? ', oil can one tile further in' : ''));
  }
  console.log(planId + ': ' + lines.join('; '));
}
off.sort((p, q) => p - q);
console.log('rooms ' + rooms + '; furniture tile against the room\'s x- wall or edge: ' + atWall + '; kitchens ' + kitchens + ', of them against the x- wall: ' + kitchensAtWall + '; distance of the furniture tile from the middle of the room\'s bounding box: median ' + off[off.length >> 1].toFixed(2) + ' m, most ' + off.at(-1).toFixed(2) + ' m');
