// Shared measuring code for the trial: one burning house, measured the strict way review round 1 asked for.
// Every count is over the fuel objects the house starts with, wherever they later fall.
const {createWorld, DEFAULT_FUELS, PITCH, LAYER} = await import(process.env.KERNEL ?? '../kernel.mjs');
import {house, lawn, paving, plan} from '../scene.mjs';

export {PITCH, LAYER, house, lawn, paving, plan};
export const PLANS = ['hopkins-4-15', 'hopkins-4-12', 'hopkins-4-09', 'hopkins-4-13', 'ashland-worker', 'monroe-row'];
export const ALL = {furniture: true, lacquer: 'some', oil: true, coal: true};
export const round = (v, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(d);
export const make = (rules = {}, fuelOverrides = {}) => createWorld({rules, fuels: Object.fromEntries(Object.entries(DEFAULT_FUELS).map(([name, spec]) => [name, {...spec, ...fuelOverrides[name]}]))});
export const quantile = (list, q) => { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
export const median = list => { const s = [...list].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

// Every outside-wall surface of a house on layer k, with the outside tile it faces.
export function outsideWalls(world, a, k = 0) {
  const list = [];
  for (const record of a.rooms.values()) for (const tile of record.tiles) if (tile.k === k) for (const fuel of tile.fuels) {
    if (fuel.cls !== 'clapboard' && fuel.cls !== 'door' || !fuel.face || fuel.face.axis === 2) continue;   // the front door is part of the outside wall
    const outside = world.across(tile, fuel.face);
    if (!outside || outside.building) continue;
    list.push({tile, fuel, outside, room: record.label, side: (fuel.face.axis === 0 ? 'x' : 'y') + (fuel.face.step > 0 ? '+' : '-')});
  }
  return list;
}
// The strikes used by the survey: the middle of the longest straight run of each outside wall, once with
// the match held outside and once held inside (":in"), and the furniture in every room.
export function strikesOf(planId) {
  const world = make(), a = house(world, 'A', planId, 6, 6, ALL), walls = outsideWalls(world, a), strikes = [];
  for (const side of ['x+', 'x-', 'y+', 'y-']) {
    const groups = {};
    for (const w of walls.filter(w => w.side === side)) (groups[side[0] === 'x' ? w.tile.i : w.tile.j] ??= []).push(w);
    const runs = Object.values(groups).sort((p, q) => q.length - p.length);
    if (!runs.length) continue;
    const line = runs[0].sort((p, q) => side[0] === 'x' ? p.tile.j - q.tile.j : p.tile.i - q.tile.i), mid = line[Math.floor(line.length / 2)];
    const at = 'wall:' + side + ':' + (mid.tile.i - a.origin[0]) + ':' + (mid.tile.j - a.origin[1]);
    strikes.push(at, at + ':in');
  }
  for (const record of a.rooms.values()) strikes.push('room:' + record.floor + ':' + record.id);
  return strikes;
}
export function strike(world, a, spec) {
  const parts = spec.split(':');
  if (parts[0] === 'room') { const label = a.name + '/' + parts[1] + ':' + parts[2]; world.ignite(a.rooms.get(label).centre, 'furniture'); return {room: label, floor: +parts[1]}; }
  const tile = world.tileAt(a.origin[0] + +parts[2], a.origin[1] + +parts[3], 0);
  const wall = outsideWalls(world, a).find(w => w.tile === tile && w.side === parts[1]);
  if (!wall) throw new Error('no outside wall at ' + spec);
  // 'in' holds the match inside the room; the default is outside, where the bear stands.
  world.ignite(tile, null, {fuel: wall.fuel, from: parts[4] === 'in' ? null : wall.outside});
  return {room: tile.room, floor: 0, wall, what: wall.fuel.cls, behindPorch: wall.outside.fuels.length > 0};
}

export function burn({planId = 'hopkins-4-15', contents = ALL, seconds = 300, at = 'room:0:kitchen', neighbours = [], rules = {}, fuels = {}, origin = [6, 6], before, timed = false}) {
  const world = make(rules, fuels), dt = world.dt;
  const a = house(world, 'A', planId, origin[0], origin[1], contents);
  const others = neighbours.map(([name, x, y, id]) => house(world, name, id ?? planId, x, y));
  before?.(world, a);
  const initial = [];
  for (const record of a.rooms.values()) for (const tile of record.tiles) for (const fuel of tile.fuels) initial.push({fuel, room: record.label, cls: fuel.cls});
  const struck = strike(world, a, at);
  let flameUntil = 0, burningUntil = 0, peakActive = 0, shareAtPeak = 0;
  const steps = Math.round(seconds / dt), every = Math.round(.5 / dt), costs = timed ? new Float64Array(steps) : null;
  for (let n = 0; n < steps; n++) {
    const began = timed ? performance.now() : 0;
    world.step();
    if (timed) costs[n] = performance.now() - began;
    if (world.active.size > peakActive) peakActive = world.active.size;
    if (world.stats.ticks % every === 0) {
      let burning = 0, flame = false;
      for (const item of initial) if (item.fuel.lit) { burning++; if (item.cls !== 'coal') flame = true; }
      if (flame) flameUntil = world.time;
      if (burning) burningUntil = world.time;
      shareAtPeak = Math.max(shareAtPeak, burning / initial.length);
    }
  }
  const litTimes = initial.filter(x => x.fuel.litAt !== null).map(x => x.fuel.litAt).sort((p, q) => p - q);
  const half = litTimes.length >= initial.length / 2 ? litTimes[Math.ceil(initial.length / 2) - 1] : null;
  // The oil can bursts and never "lights"; coal is a store. Neither counts toward the room.
  const items = initial.filter(x => x.room === struck.room && x.fuel.store !== 'oil' && x.cls !== 'coal');
  const roomAll = items.every(x => x.fuel.litAt !== null) ? Math.max(...items.map(x => x.fuel.litAt)) : null;
  const ev = world.events, mine = e => e.building === 'A';
  const fall = ev.find(e => mine(e) && e.type === 'fall' && (e.cause === 'roof' || e.cause === 'floor' && e.from[2] > 0));
  const fallToGround = ev.find(e => mine(e) && e.type === 'fall' && e.from[2] >= 2 && e.to[2] < 2);
  const groundLit = ev.find(e => mine(e) && e.type === 'lit' && e.at[2] < 2 && e.cls !== 'roof' && e.cause !== 'match');   // a low roof lit from the wall above it is not the ground floor
  const groundRoofLit = ev.find(e => mine(e) && e.type === 'lit' && e.at[2] < 2 && e.cls === 'roof');
  const upstairsLit = ev.find(e => mine(e) && e.type === 'lit' && e.at[2] >= 2 && e.cause !== 'match');
  const firstOf = name => ev.find(e => e.type === 'lit' && e.building === name)?.time ?? null;
  // Target 3 on this wall, for an outside-wall strike: up the struck column to its top against 3 m along it, each way.
  let climb = null;
  if (struck.wall) {
    const {tile, fuel} = struck.wall, same = t => t?.fuels.find(f => (f.cls === 'clapboard' || f.cls === 'door') && f.face && f.face.axis === fuel.face.axis && f.face.step === fuel.face.step);
    let top = 0; while (same(world.tileAt(tile.i, tile.j, top + 1))) top++;
    const up = same(world.tileAt(tile.i, tile.j, top))?.litAt, along = [6, -6].map(d => same(fuel.face.axis === 0 ? world.tileAt(tile.i, tile.j + d, 0) : world.tileAt(tile.i + d, tile.j, 0))?.litAt).filter(v => v != null && v > 0);
    if (top > 0 && up > 0) climb = along.map(v => (top * LAYER / up) / (3 / v));
  }
  const sorted = timed ? [...costs].sort((p, q) => p - q) : null;
  return {world, a, others, struck, climb, burningUntil, n: initial.length, half, roomAll, roomLit: items.filter(x => x.fuel.litAt !== null).length, roomN: items.length,
    flameUntil, fall, fallToGround, groundLit, groundRoofLit, upstairsLit, peakActive, shareAtPeak, never: initial.filter(x => x.fuel.litAt === null && x.fuel.amount > 0).length,
    neighbours: Object.fromEntries(neighbours.map(([name]) => [name, firstOf(name)])),
    ledger: world.ledger.laid - world.ledger.burnt - world.remaining(),
    cost: timed ? {mean: costs.reduce((s, v) => s + v, 0) / steps, p95: sorted[Math.floor(.95 * steps)], max: sorted[steps - 1]} : null};
}
