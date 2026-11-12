// Reviewer round 1 helpers: plan transforms and one measured house burn.
import {PITCH, LAYER} from '../kernel.mjs';
import {createWorld as createVar} from './kernel-var.mjs';
import {house, lawn, paving, HOUSING_PLANS} from './scene-var.mjs';
import fs from 'node:fs';
import path from 'node:path';

export {PITCH, LAYER, createVar, house, lawn, paving, HOUSING_PLANS};
export const ALL = {furniture: true, lacquer: 'some', oil: true, coal: true};
export const round = (v, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(d);
export const out = (name, lines) => {
  const text = lines.join('\n') + '\n';
  fs.mkdirSync(path.join(import.meta.dirname, 'results'), {recursive: true});
  fs.writeFileSync(path.join(import.meta.dirname, 'results', name), text);
  process.stdout.write(text);
};

// Transform a plan's geometry by a point map. kind: 'mirror' (x -> W - x), 'transpose' (swap x and z), 'shift' (x += dx, z += dz).
export function transformPlan(p, kind, dx = 0, dz = 0) {
  const W = p.width, pt = ([x, z]) => kind === 'mirror' ? [W - x, z] : kind === 'transpose' ? [z, x] : [x + dx, z + dz];
  const seg = ([x0, z0, x1, z1]) => [...pt([x0, z0]), ...pt([x1, z1])];
  const stairs = s => {
    if (!s) return s;
    if (kind === 'mirror') return {...s, x: W - s.x - s.width};
    if (kind === 'transpose') return {...s, x: s.z, z: s.x, width: s.run, run: s.width};
    return {...s, x: s.x + dx, z: s.z + dz};
  };
  return {...p, id: p.id, width: kind === 'transpose' ? p.depth : p.width + (kind === 'shift' ? Math.ceil(dx) : 0), depth: kind === 'transpose' ? p.width : p.depth + (kind === 'shift' ? Math.ceil(dz) : 0),
    floors: p.floors.map(f => ({...f, rooms: f.rooms.map(r => ({...r, polygon: r.polygon.map(pt)})), windows: f.windows?.map(seg), stairs: stairs(f.stairs)}))};
}

// One house (name 'A'), optional neighbours, one strike. Returns stricter measures than trial.mjs.
// strike(world, a) must light something and may return the room label whose "fully alight" time is wanted.
export function burn({planId = 'hopkins-4-15', contents = ALL, seconds = 300, strike, neighbours = [], create = createVar, world: opts = {}, options = {}, origin = [6, 6], each, before}) {
  const world = create(opts), DT = world.dt ?? 1 / 30;
  const a = house(world, 'A', planId, origin[0], origin[1], contents, options);
  for (const [name, x, y, id] of neighbours) house(world, name, id ?? planId, x, y);
  before?.(world, a);
  // Every fuel object the house starts with, and the room it starts in.
  const initial = [];
  for (const record of a.rooms.values()) for (const tile of record.tiles) for (const fuel of tile.fuels) initial.push({fuel, room: record.label, tile, cls: fuel.cls});
  const laid0 = world.ledger.laid;
  const roomLabel = strike(world, a);
  let flameUntil = 0, peakActive = 0, peakBurning = 0, halfBurningAt = null, activeAtEnd = 0;
  const steps = Math.round(seconds / DT);
  const began = performance.now();
  for (let n = 0; n < steps; n++) {
    world.step();
    if (world.active.size > peakActive) peakActive = world.active.size;
    if (world.stats.ticks % Math.round(.5 / DT) === 0) {
      let burning = 0, flame = false;
      for (const item of initial) if (item.fuel.lit) { burning++; if (item.cls !== 'coal') flame = true; }
      if (flame) flameUntil = world.time;
      if (burning > peakBurning) peakBurning = burning;
      if (halfBurningAt === null && burning >= initial.length / 2) halfBurningAt = world.time;
    }
    each?.(world, a);
  }
  const ms = (performance.now() - began) / steps;
  const litTimes = initial.filter(x => x.fuel.litAt !== null).map(x => x.fuel.litAt).sort((x, y) => x - y);
  const half = litTimes.length >= initial.length / 2 ? litTimes[Math.ceil(initial.length / 2) - 1] : null;
  // the oil can never 'lights' (it bursts) and coal is a store; neither is counted in the room.
  const roomItems = roomLabel ? initial.filter(x => x.room === roomLabel && x.fuel.store !== 'oil' && x.cls !== 'coal') : [];
  const roomAll = roomItems.length && roomItems.every(x => x.fuel.litAt !== null) ? Math.max(...roomItems.map(x => x.fuel.litAt)) : null;
  const roomLit = roomItems.filter(x => x.fuel.litAt !== null).length;
  const falls = world.events.filter(e => e.type === 'fall' && e.building === 'A');
  const fall = falls.find(e => e.cause === 'roof' || e.cause === 'floor' && e.from[2] > 0);
  const firstOf = name => world.events.find(e => e.type === 'lit' && e.building === name)?.time ?? null;
  const never = initial.filter(x => x.fuel.litAt === null && x.fuel.amount > 0);
  const neverBy = {}; for (const x of never) neverBy[x.cls] = (neverBy[x.cls] ?? 0) + 1;
  return {world, a, initial, laid0, n: initial.length, half, halfBurningAt, peakBurningShare: peakBurning / initial.length, room: roomLabel, roomN: roomItems.length, roomLit, roomAll,
    flameUntil, fall, falls, ms, peakActive, litCount: litTimes.length, never: never.length, neverBy,
    neighbours: Object.fromEntries(neighbours.map(([name]) => [name, firstOf(name)])),
    ledger: world.ledger.laid - world.ledger.burnt - world.remaining(), activeAtEnd: world.active.size};
}

// Outside-wall strike points of house A: every clapboard-bearing ground tile, with its wall side.
export function wallTiles(a, world, k = 0) {
  const list = [];
  for (const record of a.rooms.values()) for (const tile of record.tiles) if (tile.k === k) for (const fuel of tile.fuels) {
    if (fuel.cls !== 'clapboard' || !fuel.face) continue;
    const other = world.tileAt(tile.i + (fuel.face.axis === 0 ? fuel.face.step : 0), tile.j + (fuel.face.axis === 1 ? fuel.face.step : 0), tile.k);
    if (other?.inside) continue;
    list.push({tile, fuel, room: record.label, side: (fuel.face.axis === 0 ? 'x' : 'y') + (fuel.face.step > 0 ? '+' : '-')});
  }
  return list;
}
export function lightFuel(world, tile, fuel) {
  fuel.lit = true; fuel.litAt = world.time; world.active.add(tile);
  world.events.push({type: 'lit', time: world.time, at: [tile.i, tile.j, tile.k], cls: fuel.cls, building: tile.building, room: tile.room, cause: 'match'});
}
