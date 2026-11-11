// Round 1, probe 3: the house targets (3, 4, 5, 6, 7, 8) on every plan and many strike points, one house, furnished.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r03-plans-and-strikes.mjs <plan id> [seconds]
// One process per plan (about 1 to 3 minutes each). r03-summary.mjs reads the JSON this writes.
import fs from 'node:fs';
import path from 'node:path';
import {burn, ALL, round, out, wallTiles, lightFuel, createVar, house, HOUSING_PLANS, LAYER} from './lib.mjs';

const planId = process.argv[2] ?? 'hopkins-4-15', seconds = +(process.argv[3] ?? 300);
// Enumerate strikes on a throwaway world.
const probe = createVar(), pa = house(probe, 'A', planId, 6, 6, ALL);
const walls0 = wallTiles(pa, probe, 0), strikes = [];
for (const side of ['x+', 'x-', 'y+', 'y-']) {
  const list = walls0.filter(w => w.side === side);
  if (!list.length) continue;
  // the longest straight run on this side, its middle tile
  const groups = {}; for (const w of list) { const k = side[0] === 'x' ? w.tile.i : w.tile.j; (groups[k] ??= []).push(w); }
  const run = Object.values(groups).sort((a, b) => b.length - a.length)[0].sort((a, b) => side[0] === 'x' ? a.tile.j - b.tile.j : a.tile.i - b.tile.i);
  const mid = run[Math.floor(run.length / 2)];
  strikes.push({kind: 'wall', name: 'wall ' + side, at: [mid.tile.i, mid.tile.j, 0], side});
}
for (const record of pa.rooms.values()) strikes.push({kind: 'room', name: 'room ' + record.label.slice(2), label: record.label, floor: record.floor});
const storeys = HOUSING_PLANS[planId].floors.length;

const rows = [];
for (const strike of strikes) {
  let wallInfo = null;
  const r = burn({planId, seconds, strike: (world, a) => {
    if (strike.kind === 'room') { const rec = a.rooms.get(strike.label); world.ignite(rec.centre, 'furniture'); return strike.label; }
    const tile = world.tileAt(...strike.at), w = wallTiles(a, world, 0).find(x => x.tile === tile && x.side === strike.side);
    lightFuel(world, tile, w.fuel); wallInfo = {tile, fuel: w.fuel};
    return tile.room;
  }});
  const row = {plan: planId, strike: strike.name, kind: strike.kind, floor: strike.floor ?? 0, n: r.n, roomN: r.roomN, roomLit: r.roomLit,
    t4: round(r.roomAll), t5: round(r.half), t5burning: round(r.halfBurningAt), peakBurning: round(r.peakBurningShare, 3), t6: round(r.flameUntil), t7: round(r.fall?.time), t7cause: r.fall?.cause ?? null,
    never: r.never, neverBy: r.neverBy, litShare: round(r.litCount / r.n, 3), ledger: r.ledger, activeAtEnd: r.activeAtEnd, ms: round(r.ms, 2)};
  if (wallInfo) {
    // Target 3: up the wall (to the top layer) against along it (3 m each way), same face.
    const {tile, fuel} = wallInfo, ax = fuel.face.axis, top = 2 * storeys - 1;
    const sameFace = t => t?.fuels.find(f => f.cls === 'clapboard' && f.face && f.face.axis === ax && f.face.step === fuel.face.step);
    const at = (di, dj, k) => sameFace(r.world.tileAt(tile.i + di, tile.j + dj, k))?.litAt ?? null;
    const up = at(0, 0, top), alongs = [6, -6].map(d => ax === 0 ? at(0, d, 0) : at(d, 0, 0)).filter(t => t !== null);
    row.up = round(up); row.along = alongs.map(t => round(t));
    row.ratios = up ? alongs.map(t => round((top * LAYER / up) / (3 / t), 2)) : [];
  }
  if (strike.floor > 0) {
    const ev = r.world.events;
    const fall = ev.find(e => e.type === 'fall' && e.building === 'A' && e.from[2] >= 2 && e.to[2] < 2);
    const ground = ev.find(e => e.type === 'lit' && e.building === 'A' && e.at[2] < 2);
    row.t8fall = round(fall?.time); row.t8cause = fall?.cause ?? null; row.t8ground = round(ground?.time); row.t8cls = ground?.cls ?? null;
    row.t8pass = !!(ground && fall && ground.time >= fall.time && ground.time - fall.time <= 5);
  }
  rows.push(row);
  console.error(JSON.stringify(row));
}
fs.mkdirSync(path.join(import.meta.dirname, 'results'), {recursive: true});
fs.writeFileSync(path.join(import.meta.dirname, 'results', 'r03-' + planId + '.json'), JSON.stringify(rows, null, 1) + '\n');
