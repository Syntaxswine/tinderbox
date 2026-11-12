// Round 2 reviewer. Writes kernel-var.mjs, scene-var.mjs and measure-var.mjs into this folder: copies of the
// author's kernel.mjs, scene.mjs and measure.mjs with switches. With no switch set they must reproduce the
// originals exactly (r01-control.mjs proves it). Every edit is an exact, single text replacement.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/make-var.mjs
import fs from 'node:fs';
import path from 'node:path';
const here = import.meta.dirname, up = path.join(here, '..');
const edit = (text, pairs) => {
  for (const [from, to] of pairs) {
    const n = text.split(from).length - 1;
    if (n !== 1) throw new Error('expected one match, found ' + n + ' for: ' + from.slice(0, 70));
    text = text.replace(from, () => to);
  }
  return text;
};

let kernel = fs.readFileSync(path.join(up, 'kernel.mjs'), 'utf8');
kernel = edit(kernel, [
  // xNoListen: drop the "listens" filter.
  ['if (!target || !(target.listens || target.fuels.some(fuel => !fuel.lit && fuel.amount > 0))) continue;',
    'if (!target || !rules.xNoListen && !(target.listens || target.fuels.some(fuel => !fuel.lit && fuel.amount > 0))) continue;'],
  // xFrozenSky: "open to the sky" is worked out once, before the fire, and never again.
  ['    const sky = new Map();\n    const r = Math.ceil(rules.reach / PITCH), top',
    '    if (rules.xFrozenSky && !frozenSky) { frozenSky = new Map(); for (const t of tiles.values()) openToSky(t, frozenSky); }\n    const sky = frozenSky ?? new Map();\n    const r = Math.ceil(rules.reach / PITCH), top'],
  ['  function radiate() {', '  let frozenSky = null;\n  const phaseFlux = [], totals = new Map();\n' + `  // xSpread: each source is worked out once every radiantEvery seconds, but the sources are shared out over the steps.
  function radiateSpread() {
    if (listenersStale) markListeners();
    const phase = stats.ticks % radiantTicks, sky = new Map();
    const r = Math.ceil(rules.reach / PITCH), top = Math.floor(rules.reach / LAYER), flux = new Map();
    const old = phaseFlux[phase];
    for (const source of active) {
      if (source.id % radiantTicks !== phase) continue;
      if (!(source.radOut > 0) || !rules.reachUnderCover && !openToSky(source, sky)) continue;
      for (let dk = 0; dk <= top; dk++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj), dk) <= 1) continue;
        const distance = Math.hypot(di * PITCH, dj * PITCH, dk * LAYER);
        if (distance > rules.reach) continue;
        const target = tileAt(source.i + di, source.j + dj, source.k + dk);
        if (!target || !(target.listens || target.fuels.some(fuel => !fuel.lit && fuel.amount > 0))) continue;
        if (!rules.reachUnderCover && !openToSky(target, sky)) continue;
        if (!clear(source, target)) continue;
        flux.set(target, (flux.get(target) ?? 0) + source.radOut / distance ** 2);
      }
    }
    phaseFlux[phase] = flux;
    const touched = new Set(flux.keys());
    if (old) for (const [tile, amount] of old) { touched.add(tile); const v = totals.get(tile) - amount; if (v > 1e-9) totals.set(tile, v); else totals.delete(tile); }
    for (const [tile, amount] of flux) totals.set(tile, (totals.get(tile) ?? 0) + amount);
    for (const tile of touched) {
      const v = totals.get(tile) ?? 0;
      tile.rad = rules.radiantGain * v;
      if (v > 0) { active.add(tile); if (tile.listens) for (let axis = 0; axis < 3; axis++) for (const step of [-1, 1]) { const other = tileAt(tile.i + AX[axis][0] * step, tile.j + AX[axis][1] * step, tile.k + AX[axis][2] * step); if (other) active.add(other); } }
    }
  }
  function radiate() {`],
  ['    if (stats.ticks % radiantTicks === 0) radiate();',
    '    { const t0 = performance.now(); if (rules.xSpread) radiateSpread(); else if (stats.ticks % radiantTicks === 0) radiate(); stats.radiateMs += performance.now() - t0; }'],
  ['stats = {ticks: 0, visits: 0, ignitions: 0, relinks: 0, sightLines: 0};', 'stats = {ticks: 0, visits: 0, ignitions: 0, relinks: 0, sightLines: 0, radiateMs: 0, fluxTiles: 0};'],
  // xOrder: the order the active tiles are visited in. 'reverse' or 'shuffle' (a fixed scramble by tile id).
  ['    time += dt; stats.ticks++;',
    `    time += dt; stats.ticks++;
    if (rules.xOrder) {
      const list = [...active];
      if (rules.xOrder === 'reverse') list.reverse(); else list.sort((p, q) => (p.id * 2654435761 % 4294967296) - (q.id * 2654435761 % 4294967296));
      active.clear(); for (const t of list) active.add(t);
    }`],
  // count how many tiles reach warms, for reporting
  ['    for (const [tile, amount] of flux) {\n      tile.rad = rules.radiantGain * amount;', '    for (const [tile, amount] of flux) {\n      stats.fluxTiles++;\n      tile.rad = rules.radiantGain * amount;'],
  ['return {tiles, faces, active, events, ledger, stats, rules, fuels, dt, addTile, tileAt, setFace, addFuel, ignite, step, remaining, across, clear,',
    'return {tiles, faces, active, events, ledger, stats, rules, fuels, dt, addTile, tileAt, setFace, addFuel, ignite, step, remaining, across, clear, openToSky,']
]);
fs.writeFileSync(path.join(here, 'kernel-var.mjs'), '// GENERATED by make-var.mjs from ../kernel.mjs. Round 2 reviewer copy with switches (rules.x*).\n' + kernel);

let scene = fs.readFileSync(path.join(up, 'scene.mjs'), 'utf8');
scene = edit(scene, [
  ["import {PITCH} from './kernel.mjs';", "import {PITCH} from './kernel-var.mjs';"],
  ["path.resolve(import.meta.dirname, '../../../..')", "path.resolve(import.meta.dirname, '../../../../..')"],
  ['export const plan = id => HOUSING_PLANS[id];', "export const plan = id => typeof id === 'object' ? id : HOUSING_PLANS[id];"],
  ['export function house(world, name, planId, ox, oy, contents = {}) {', 'export function house(world, name, planId, ox, oy, contents = {}, opts = {}) {\n  const R = opts.ring ?? 1;'],
  // door: 'middle' (the author's), 'first' or 'last' shared face of the pair
  ['const middle = shared[Math.floor(shared.length / 2)];', "const middle = shared[opts.door === 'first' ? 0 : opts.door === 'last' ? shared.length - 1 : Math.floor(shared.length / 2)];"],
  ['for (const tile of houseTiles) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) for (let k = 0; k <= top; k++)\n    if (!world.tileAt(tile.i + di, tile.j + dj, k)) world.addTile(tile.i + di, tile.j + dj, k);',
    `for (const tile of houseTiles) for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) for (let k = 0; k <= top + (opts.airAbove ?? 0); k++)
    if (!world.tileAt(tile.i + di, tile.j + dj, k)) world.addTile(tile.i + di, tile.j + dj, k);
  // eave: a roof one tile wide over the ring tiles next to the house, at the top layer. 'roof' is timber that burns; 'masonry' never opens.
  if (opts.eave) {
    const done = new Set();
    for (const tile of houseTiles) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const air = world.tileAt(tile.i + di, tile.j + dj, top);
      if (!air || air.building || done.has(air)) continue;
      done.add(air);
      const object = world.setFace(air.i, air.j, top, 2, 1, opts.eave === 'roof' ? 'timber' : 'masonry');
      if (opts.eave === 'roof') world.addFuel(air, 'roof', 1, {face: {axis: 2, step: 1, object}});
    }
  }`],
  // contents: 'middle' (the author's), or the first cell of the room in raster order (a corner)
  ['const [ci, cj] = record.cells[Math.floor(record.cells.length / 2)];', "const [ci, cj] = record.cells[opts.contentsAt === 'corner' ? 0 : Math.floor(record.cells.length / 2)];"]
]);
fs.writeFileSync(path.join(here, 'scene-var.mjs'), '// GENERATED by make-var.mjs from ../scene.mjs. Round 2 reviewer copy with options (opts).\n' + scene);

let measure = fs.readFileSync(path.join(up, 'measure.mjs'), 'utf8');
measure = edit(measure, [
  ["import {createWorld, DEFAULT_FUELS, PITCH, LAYER} from './kernel.mjs';", "import {createWorld, DEFAULT_FUELS, PITCH, LAYER} from './kernel-var.mjs';"],
  ["import {house, lawn, paving, plan} from './scene.mjs';", "import {house, lawn, paving, plan} from './scene-var.mjs';"],
  ['export function strikesOf(planId) {\n  const world = make(), a = house(world, \'A\', planId, 6, 6, ALL),', 'export function strikesOf(planId, sceneOpts = {}) {\n  const world = make(), a = house(world, \'A\', planId, 6, 6, ALL, sceneOpts),'],
  ['origin = [6, 6], before, timed = false}) {', 'origin = [6, 6], before, timed = false, sceneOpts = {}, each = null}) {'],
  ['const a = house(world, \'A\', planId, origin[0], origin[1], contents);', 'const a = house(world, \'A\', planId, origin[0], origin[1], contents, sceneOpts);'],
  ['const others = neighbours.map(([name, x, y, id]) => house(world, name, id ?? planId, x, y));', 'const others = neighbours.map(([name, x, y, id]) => house(world, name, id ?? planId, x, y, {}, sceneOpts));'],
  ['    if (world.active.size > peakActive) peakActive = world.active.size;', '    if (world.active.size > peakActive) peakActive = world.active.size;\n    each?.(world, n);'],
  ['  return {world, a, others, struck, n: initial.length,', '  return {world, a, others, struck, initial, costs, n: initial.length,']
]);
fs.writeFileSync(path.join(here, 'measure-var.mjs'), '// GENERATED by make-var.mjs from ../measure.mjs. Round 2 reviewer copy.\n' + measure);
console.log('wrote kernel-var.mjs, scene-var.mjs, measure-var.mjs');
