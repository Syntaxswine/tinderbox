// Round 7. Every ground outside-wall face of one plan struck, match held outside and inside, on bare ground
// or on the author's lawn. Uses the author's burn() untouched. 80 s a burn: enough for room, half and climb.
//   node r03-allfaces.mjs <plan> <bare|lawn>
import fs from 'node:fs';
import path from 'node:path';
import {burn, make, house, outsideWalls, round, ALL} from '../measure.mjs';
const [planId, ground] = process.argv.slice(2);
const world = make(), a = house(world, 'A', planId, 6, 6, ALL);
const specs = outsideWalls(world, a).map(w => 'wall:' + w.side + ':' + (w.tile.i - a.origin[0]) + ':' + (w.tile.j - a.origin[1]));
const rows = [];
for (const spec of specs) for (const at of [spec, spec + ':in']) {
  const r = burn({planId, at, seconds: 80, ground});
  // behind a porch: the outside tile holds the deck (frame), whatever else the ground holds
  const porch = r.struck.wall.outside.fuels.some(f => f.cls === 'frame');
  rows.push({plan: planId, at, kind: at.endsWith(':in') ? 'wall-in' : 'wall', what: r.struck.what, porch, room: round(r.roomAll), half: round(r.half), climb: r.climb?.map(v => round(v)) ?? null});
}
const dir = path.join(import.meta.dirname, 'results', 'allfaces-' + ground);
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'faces-' + planId + '.json'), JSON.stringify(rows, null, 1) + '\n');
console.log(planId, ground, rows.length);
