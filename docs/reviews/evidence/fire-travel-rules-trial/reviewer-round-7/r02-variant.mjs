// Round 7. The survey's 101 strikes with the ground laid by this probe, so the lawn can be varied.
//   node r02-variant.mjs <plan> <variant>
// Uses the author's burn() untouched, with ground 'bare' and the grass laid in its `before` hook.
// Variant 'lawn6' lays what measure.mjs lays for ground 'lawn' and must reproduce results/lawn/ exactly.
import fs from 'node:fs';
import path from 'node:path';
import {burn, strikesOf, round, outsideWalls, PITCH} from '../measure.mjs';

const [planId, variant] = process.argv.slice(2);
const V = {
  lawn6: {margin: 6},
  lawn3: {margin: 3},
  lawn12: {margin: 12, origin: 12},
  strip1w: {margin: 6, strip: 1, porch: false},   // bare strip 0.5 m round the walls only
  strip2w: {margin: 6, strip: 2, porch: false},   // 1 m, walls only
  strip3w: {margin: 6, strip: 3, porch: false},
  strip1p: {margin: 6, strip: 1, porch: true},    // 0.5 m round walls and porch
  strip2p: {margin: 6, strip: 2, porch: true},    // 1 m
  strip3p: {margin: 6, strip: 3, porch: true},    // 1.5 m
  cool35: {margin: 6, fuels: {grass: {out: .35}}},
  cool15: {margin: 6, fuels: {grass: {out: .15}}},
  roof3lawn: {margin: 6, fuels: {roof: {delay: 3}}},
  roof3strip2p: {margin: 6, strip: 2, porch: true, fuels: {roof: {delay: 3}}},
  noglass: {margin: 6, rules: {glassBreaks: 99}},          // windows that a fire cannot break
  plinth: {margin: 6, plinth: true},                       // the whole ground layer (1.06 m) of every outside wall is masonry; room strikes only
  plinthbare: {margin: 0, none: true, plinth: true},
  plinthporch: {margin: 6, plinth: true, strip: 2, cores: 'porch'},   // and no grass within 1 m of the porch
  bare: {margin: 0, none: true}
}[variant];
if (!V) throw new Error('unknown variant ' + variant);
const o = V.origin ?? 6;

function lay(world, a) {
  if (V.plinth) for (const w of outsideWalls(world, a)) if (w.fuel.cls === 'clapboard') {
    w.tile.fuels.splice(w.tile.fuels.indexOf(w.fuel), 1); world.ledger.laid -= w.fuel.amount;
    w.fuel.face.object.kind = 'masonry'; w.fuel.face.object.pass = world.rules.pass.masonry;
  }
  if (V.none) return;
  const W = Math.round((o + a.plan.width + V.margin) / PITCH), D = Math.round((o + a.plan.depth + V.margin) / PITCH), lo = Math.round((o - V.margin) / PITCH);
  const keep = new Set();
  if (V.strip) {
    const cores = [];
    if (V.cores !== 'porch') for (const record of a.rooms.values()) for (const tile of record.tiles) if (tile.k === 0) cores.push(tile);
    if (V.porch || V.cores === 'porch') for (const tile of a.porch) if (tile.k === 0) cores.push(tile);
    for (const t of cores) for (let dj = -V.strip; dj <= V.strip; dj++) for (let di = -V.strip; di <= V.strip; di++) keep.add((t.i + di) + ':' + (t.j + dj));
  }
  for (let j = lo; j < D; j++) for (let i = lo; i < W; i++) {
    if (keep.has(i + ':' + j)) { if (!world.tileAt(i, j, 0)) world.addTile(i, j, 0); continue; }
    const tile = world.tileAt(i, j, 0) ?? world.addTile(i, j, 0);
    if (tile.building || tile.fuels.length) continue;
    world.addFuel(tile, 'grass', 1);
  }
}
const rows = [];
for (const at of strikesOf(planId)) {
  if (V.plinth && !at.startsWith('room')) continue;
  let walls = null;
  const r = burn({planId, at, seconds: 300, origin: [o, o], fuels: V.fuels ?? {}, rules: V.rules ?? {}, ground: 'bare', before: (world, a) => { lay(world, a); walls = outsideWalls(world, a); }});
  const grassLit = r.world.events.find(e => e.type === 'lit' && e.cls === 'grass')?.time ?? null;
  const wl = walls.map(w => w.fuel.litAt).filter(v => v !== null).sort((p, q) => p - q);
  // the walls of all layers, for "every outside wall is lit within a few seconds of each other"
  const all = [0, 1, 2, 3].flatMap(k => outsideWalls(r.world, r.a, k)).map(w => w.fuel.litAt);
  const allLit = all.filter(v => v !== null).sort((p, q) => p - q);
  rows.push({plan: planId, at, kind: at.startsWith('room') ? 'room' : at.endsWith(':in') ? 'wall-in' : 'wall', floor: r.struck.floor, room: round(r.roomAll), half: round(r.half), flameUntil: round(r.flameUntil), firstFall: round(r.fall?.time),
    groundLit: round(r.groundLit?.time), groundRoofLit: round(r.groundRoofLit?.time), fallToGround: round(r.fallToGround?.time), climb: r.climb?.map(v => round(v)) ?? null, ledger: r.ledger,
    grassLit: round(grassLit), groundWalls: walls.length, groundWallsLit: wl.length, groundWallFirst: round(wl[0]), groundWallLast: round(wl.at(-1)), groundWall90: round(wl[Math.floor(.9 * (walls.length - 1))]),
    allWalls: all.length, allWallsLit: allLit.length, allWallFirst: round(allLit[0]), allWallLast: round(allLit.at(-1))});
  console.error(JSON.stringify(rows.at(-1)));
}
const dir = path.join(import.meta.dirname, 'results', 'variant-' + variant);
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'survey-' + planId + '.json'), JSON.stringify(rows, null, 1) + '\n');
