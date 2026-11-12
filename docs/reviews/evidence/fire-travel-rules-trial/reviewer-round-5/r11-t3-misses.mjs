// Target 3 on every ground wall face (from r06's results): the directions outside 2.5 to 3.5 on walls NOT behind a porch.
// For each, how far the struck face is from the nearest porch deck tile and from the end of its wall run.
//   node reviewer-round-5/r11-t3-misses.mjs
import fs from 'node:fs';
import path from 'node:path';
import {make, house, outsideWalls, PLANS, ALL} from '../measure.mjs';
const dir = path.join(import.meta.dirname, 'results', 'all-walls');
let total = 0, nearPorch = 0, nearEnd = 0, neither = 0; const lines = [];
for (const planId of PLANS) {
  const rows = JSON.parse(fs.readFileSync(path.join(dir, planId + '-out.json'), 'utf8'));
  const world = make(), a = house(world, 'A', planId, 6, 6, ALL), walls = outsideWalls(world, a), deck = a.porch.filter(p => p.k === 0);
  for (const r of rows) {
    if (r.behindPorch || !r.climb) continue;
    const bad = r.climb.filter(v => v < 2.5 || v > 3.5); if (!bad.length) continue;
    const [, side, i, j] = r.at.split(':'), ti = a.origin[0] + +i, tj = a.origin[1] + +j;
    const dPorch = deck.length ? Math.min(...deck.map(p => Math.max(Math.abs(p.i - ti), Math.abs(p.j - tj)))) : Infinity;
    // length of the straight run of same-side faces through this tile, and distance to its nearer end
    const same = walls.filter(w => w.side === side && (side[0] === 'x' ? w.tile.i === ti : w.tile.j === tj)).map(w => side[0] === 'x' ? w.tile.j : w.tile.i).sort((p, q) => p - q), pos = side[0] === 'x' ? tj : ti;
    let lo = pos, hi = pos; while (same.includes(lo - 1)) lo--; while (same.includes(hi + 1)) hi++;
    const toEnd = Math.min(pos - lo, hi - pos);
    total += bad.length; const p = dPorch <= 7, e = toEnd < 6; if (p) nearPorch += bad.length; else if (e) nearEnd += bad.length; else neither += bad.length;
    lines.push(planId.padEnd(15) + r.at.padEnd(16) + ' struck ' + r.struck.padEnd(10) + ' climb ' + JSON.stringify(r.climb).padEnd(14) + ' porch deck ' + (Number.isFinite(dPorch) ? dPorch + ' tiles away' : 'none') + '; wall run ' + (hi - lo + 1) + ' faces, ' + toEnd + ' from its nearer end');
  }
}
console.log(lines.join('\n'));
console.log('directions out of range on walls not behind a porch: ' + total + '; struck face within 3.5 m of a porch deck: ' + nearPorch + '; else within 3 m of the end of its wall run: ' + nearEnd + '; neither: ' + neither);
