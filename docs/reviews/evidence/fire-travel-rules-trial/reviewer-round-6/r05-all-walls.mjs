// Round 6. Every ground-layer outside wall face of one plan struck in turn, match outside or inside.
// Room, half, target 3's ratio, and what is needed to explain a ratio out of the band.
//   node reviewer-round-6/r05-all-walls.mjs <plan> <out|in> [rules json] [tag]
import fs from 'node:fs';
import path from 'node:path';
import {make, burn, house, outsideWalls, round, ALL, LAYER} from '../measure.mjs';
const [planId, mode, rules = '{}', tag = 'all-walls'] = process.argv.slice(2);
const world0 = make(), a0 = house(world0, 'A', planId, 6, 6, ALL);
const specs = outsideWalls(world0, a0).map(w => 'wall:' + w.side + ':' + (w.tile.i - a0.origin[0]) + ':' + (w.tile.j - a0.origin[1]) + (mode === 'in' ? ':in' : ''));
const rows = [];
for (const at of specs) {
  const r = burn({planId, at, seconds: 110, rules: JSON.parse(rules)});
  const row = {plan: planId, at, struck: r.struck.what, behindPorch: r.struck.behindPorch, room: round(r.roomAll), half: round(r.half), climb: r.climb?.map(v => round(v)) ?? null};
  if (mode === 'out') {
    const {tile, fuel} = r.struck.wall, w = r.world, ax = fuel.face.axis;
    const same = t => t?.fuels.find(f => (f.cls === 'clapboard' || f.cls === 'door') && f.face && f.face.axis === ax && f.face.step === fuel.face.step);
    let top = 0; while (same(w.tileAt(tile.i, tile.j, top + 1))) top++;
    const at2 = (d, k) => ax === 0 ? w.tileAt(tile.i, tile.j + d, k) : w.tileAt(tile.i + d, tile.j, k);
    // how each wall face along the foot of the wall was lit: from outside ('o'), or from its own tile, inside ('i')
    const trace = dir => { const out = []; for (let d = 1; d <= 6; d++) { const f = same(at2(dir * d, 0)); out.push(f ? (f.litAt === null ? 'x' : round(f.litAt, 1) + (f.near ? 'o' : 'i') + f.cls[0]) : '-'); } return out.join(' '); };
    // what lies against the outside of the wall along the 3 m: empty air, or something that burns (a porch deck)
    const outsideFuel = dir => { let n = 0; for (let d = 0; d <= 6; d++) { const f = same(at2(dir * d, 0)); if (f) { const o = w.across(at2(dir * d, 0), f.face); if (o && o.fuels.length) n++; } } return n; };
    row.detail = {top, up: round(same(w.tileAt(tile.i, tile.j, top))?.litAt), plus: trace(1), minus: trace(-1), outsideFuelPlus: outsideFuel(1), outsideFuelMinus: outsideFuel(-1),
      column: Array.from({length: top + 1}, (_, k) => round(same(w.tileAt(tile.i, tile.j, k))?.litAt, 1)).join(' '),
      glassFirst: round(w.events.find(e => e.type === 'glass')?.time), firstInsideLit: round(w.events.find(e => e.type === 'lit' && e.cause !== 'match' && e.cls !== 'clapboard' && e.cls !== 'door')?.time)};
  }
  rows.push(row);
}
const dir = path.join(import.meta.dirname, 'results', tag);
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, planId + '-' + mode + '.json'), JSON.stringify(rows, null, 1) + '\n');
console.log(planId + ' ' + mode + ': ' + rows.length + ' faces');
