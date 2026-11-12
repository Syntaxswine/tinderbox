// Fix A, simulation side, on THIS tree (after both fixes): after every advance and every extra snapshot, compare what
// the simulation PUBLISHED with what it HOLDS. The live state is read through read-only taps (lib.mjs TAPS).
//   cells       : all ten published fields of all cells, Object.is, against the live HeatField cells
//   diagnostics : remainingDepositedFuel / burningCells / frontX against the round-1 formulas over the live cells
//   obstacles   : JSON of world.obstacles against the round-1 expression over the live obstacle list
//   tiles       : JSON against a fresh materialAt sweep, whenever the tiles array identity changes (and at start)
//   frozen      : the cell list, every newly published cell, the obstacle list and its records
// Usage: node r01-publication-audit.mjs [script-name ...]
import {underPatches, TAPS, load, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const api = await load();
const {SCRIPTS} = await import('./scripts.mjs');
const {materialAt} = await import(api.root + 'simulation/field.js');
const FIELDS = ['id', 'x', 'y', 'size', 'material', 'surfaceFuel', 'depositedFuel', 'heat', 'phase', 'intensity'];

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCRIPTS);
let grand = 0;
for (const name of names) {
  const fail = {}, seen = new Set(), stats = {frames: 0, peeks: 0, listReused: 0, recordsRepublished: 0, needless: 0, obstacleListReused: 0, maxBurning: 0};
  const note = (kind, text) => { (fail[kind] ??= {count: 0, first: []}).count++; if (fail[kind].first.length < 4) fail[kind].first.push(text); };
  let prevCells, prevObstacles, prevTiles, prevSim;
  function audit(sim, s, how) {
    const {field, state, definition} = globalThis.__tb, live = field.cells, pub = s.cells, at = `${how} tick ${s.tick} gen ${s.diagnostics.generation}`;
    if (sim !== prevSim) { prevSim = sim; prevCells = prevObstacles = prevTiles = undefined; }
    for (const e of s.events) seen.add(e.type);
    if (pub.length !== live.length) note('cells.length', at);
    if (!Object.isFrozen(pub)) note('cells.list-not-frozen', at);
    if (pub === prevCells) stats.listReused++;
    for (let i = 0; i < live.length; i++) {
      const a = pub[i], b = live[i];
      if (prevCells?.[i] !== a) {
        if (prevCells) {
          stats.recordsRepublished++;
          if (FIELDS.every(k => Object.is(prevCells[i][k], a[k]))) stats.needless++;
        }
        if (!Object.isFrozen(a)) note('cells.record-not-frozen', at + ' ' + a.id);
        if (Object.keys(a).join() !== FIELDS.join()) note('cells.keys', at + ' ' + Object.keys(a).join());
      }
      for (const k of FIELDS) if (!Object.is(a[k], b[k])) { note('cells.' + k + '-stale', `${at} ${b.id} published ${a[k]} live ${b[k]}`); break; }
    }
    prevCells = pub;
    const dg = s.diagnostics, remaining = live.reduce((sum, c) => sum + c.depositedFuel, 0);
    const burning = live.filter(c => c.phase === 'burning'), frontX = Math.max(0, ...burning.map(c => c.x));
    stats.maxBurning = Math.max(stats.maxBurning, burning.length);
    if (!Object.is(dg.fuel.remainingDepositedFuel, remaining)) note('diag.remainingDepositedFuel', `${at} published ${dg.fuel.remainingDepositedFuel} expected ${remaining}`);
    if (dg.burningCells !== burning.length) note('diag.burningCells', `${at} published ${dg.burningCells} expected ${burning.length}`);
    if (!Object.is(dg.frontX, frontX)) note('diag.frontX', `${at} published ${dg.frontX} expected ${frontX}`);
    const expected = JSON.stringify(state.obstacles.filter(o => !o.destroyed).map(({destroyed, ...o}) => structuredClone(o)));
    if (JSON.stringify(s.world.obstacles) !== expected) note('obstacles.stale', at);
    if (s.world.obstacles === prevObstacles) stats.obstacleListReused++;
    else if (!Object.isFrozen(s.world.obstacles) || s.world.obstacles.some(o => !Object.isFrozen(o) || (o.heatBarriers && (!Object.isFrozen(o.heatBarriers) || o.heatBarriers.some(b => !Object.isFrozen(b)))))) note('obstacles.not-frozen', at);
    prevObstacles = s.world.obstacles;
    if (s.world.tiles !== prevTiles) {
      const tiles = [];
      for (let y = 0; y < definition.height; y += definition.tileSize) for (let x = 0; x < definition.width; x += definition.tileSize) {
        const point = {x: x + definition.tileSize / 2, y: y + definition.tileSize / 2};
        tiles.push({...point, size: definition.tileSize, material: materialAt(definition, point)});
      }
      if (JSON.stringify(tiles) !== JSON.stringify(s.world.tiles)) note('tiles.stale', at);
      prevTiles = s.world.tiles;
    }
    return s;
  }
  const tick = (sim, dt) => { stats.frames++; return audit(sim, sim.advance(dt), 'advance'); };
  const peek = sim => { stats.peeks++; return audit(sim, sim.snapshot(), 'snapshot'); };
  const started = Date.now();
  SCRIPTS[name](api, tick, peek);
  const kinds = Object.keys(fail);
  grand += kinds.length;
  console.log(`== ${name}: ${stats.frames} advances + ${stats.peeks} extra snapshots audited in ${r((Date.now() - started) / 1000, 1)} s ==`);
  console.log('   peak burning cells', stats.maxBurning, '| cell list reused', stats.listReused, 'times | records republished', stats.recordsRepublished,
    '(value-identical republish:', stats.needless + ')', '| obstacle list reused', stats.obstacleListReused);
  console.log('   event types exercised:', [...seen].sort().join(' '));
  console.log(kinds.length ? '   MISMATCHES ' + JSON.stringify(fail, null, 1) : '   no mismatch of any kind');
}
console.log(grand ? `\nRESULT: ${grand} mismatch kind(s)` : '\nRESULT: published == live in every audited frame');
