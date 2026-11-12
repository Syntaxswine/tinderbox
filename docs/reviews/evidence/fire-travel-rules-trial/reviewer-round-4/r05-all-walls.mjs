// Round 4. Targets 3, 4 and 5 on EVERY ground outside-wall face of a plan (the survey takes four a plan).
//   node r05-all-walls.mjs <plan> <out|in>
import fs from 'node:fs';
import path from 'node:path';
import {make, house, burn, outsideWalls, plan, ALL, round} from '../measure.mjs';
const [planId, mode = 'out', variant = ''] = process.argv.slice(2);
const world = make(), a = house(world, 'A', planId, 6, 6, ALL), rows = [];
const specs = outsideWalls(world, a).map(w => ({at: 'wall:' + w.side + ':' + (w.tile.i - a.origin[0]) + ':' + (w.tile.j - a.origin[1]) + (mode === 'in' ? ':in' : ''), cls: w.fuel.cls, porch: w.outside.fuels.length > 0, room: w.room}));
for (const s of specs) {
  const r = burn({planId, at: s.at, seconds: 150});
  rows.push({plan: planId, ...s, kind: mode, roomAll: round(r.roomAll), half: round(r.half), climb: r.climb?.map(v => round(v)) ?? null});
}
const dir = path.join(import.meta.dirname, 'results', 'all-walls' + (variant ? '-' + variant : ''));
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, planId + '-' + mode + '.json'), JSON.stringify(rows, null, 1) + '\n');
