// REVIEWER COPY (round 1) of ../scene.mjs: house() also takes a plan OBJECT, and options {doorsOpen}.
// Builds test scenes for the trial kernel: lawns, paving, and houses made from a real catalogue plan
// (rooms, windows, doors, stairs read from src/content/housing-plans.js; nothing else of the game is used).
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {PITCH} from '../kernel.mjs';

const root = path.resolve(import.meta.dirname, '../../../../..');
const {HOUSING_PLANS} = await import(pathToFileURL(path.join(root, 'src/content/housing-plans.js')).href);
export const plan = id => typeof id === 'string' ? HOUSING_PLANS[id] : id;
export {HOUSING_PLANS};

const inside = (polygon, x, z) => {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
};
const hash = text => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function lawn(world, i0, j0, i1, j1) {
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    if (world.tileAt(i, j, 0)) continue;
    const tile = world.addTile(i, j, 0);
    world.addFuel(tile, 'grass', 1);
    tile.radiantTarget = true;
  }
}
export function paving(world, i0, j0, i1, j1) {
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (!world.tileAt(i, j, 0)) world.addTile(i, j, 0);
}

// contents: {furniture, lacquer, oil, coal}. Returns the rooms and their tiles.
export function house(world, name, planId, ox, oy, contents = {}, options = {}) {
  const p = plan(planId), oi = Math.round(ox / PITCH), oj = Math.round(oy / PITCH);
  const rooms = new Map(), cellRoom = new Map();
  const cellKey = (f, ci, cj) => f + ':' + ci + ':' + cj;
  // Rooms, rasterised at the tile pitch.
  for (const [f, floor] of p.floors.entries()) for (let cj = -4; cj < p.depth / PITCH + 2; cj++) for (let ci = -2; ci < p.width / PITCH + 2; ci++) {
    const x = (ci + .5) * PITCH, z = (cj + .5) * PITCH;
    const room = floor.rooms.find(r => inside(r.polygon, x, z));
    if (room) cellRoom.set(cellKey(f, ci, cj), room);
  }
  const roomOf = (f, ci, cj) => cellRoom.get(cellKey(f, ci, cj));
  for (const [key, room] of cellRoom) {
    const [f, ci, cj] = key.split(':').map(Number), label = name + '/' + f + ':' + room.id;
    if (!rooms.has(label)) rooms.set(label, {label, floor: f, id: room.id, type: room.type, tiles: [], cells: []});
    const record = rooms.get(label);
    record.cells.push([ci, cj]);
    for (const k of [2 * f, 2 * f + 1]) record.tiles.push(world.addTile(oi + ci, oj + cj, k, {inside: true, room: label, building: name}));
  }
  const onSegment = (segments, mx, mz) => segments?.some(([x0, z0, x1, z1]) =>
    Math.abs(x0 - x1) < 1e-6 ? Math.abs(mx - x0) < 1e-6 && mz > Math.min(z0, z1) && mz < Math.max(z0, z1)
      : Math.abs(mz - z0) < 1e-6 && mx > Math.min(x0, x1) && mx < Math.max(x0, x1));
  // Doors: for each connected pair of rooms, the shared face nearest the middle of their boundary.
  const doorFaces = new Set(), openPairs = new Set();
  for (const [f, floor] of p.floors.entries()) {
    for (const [a, b] of floor.openConnections ?? []) openPairs.add(f + ':' + [a, b].sort().join('|'));
    for (const [a, b] of floor.connections ?? []) {
      const shared = [];
      for (const [key, room] of cellRoom) {
        const [ff, ci, cj] = key.split(':').map(Number);
        if (ff !== f || room.id !== a) continue;
        for (const [axis, step] of [[0, 1], [0, -1], [1, 1], [1, -1]]) {
          const other = roomOf(f, ci + (axis === 0 ? step : 0), cj + (axis === 1 ? step : 0));
          if (other?.id === b) shared.push({ci, cj, axis, step});
        }
      }
      if (!shared.length) continue;
      const middle = shared[Math.floor(shared.length / 2)];
      doorFaces.add([f, middle.ci, middle.cj, middle.axis, middle.step].join(':'));
      doorFaces.add([f, middle.ci + (middle.axis === 0 ? middle.step : 0), middle.cj + (middle.axis === 1 ? middle.step : 0), middle.axis, -middle.step].join(':'));
    }
  }
  for (const [key, room] of cellRoom) {
    const [f, ci, cj] = key.split(':').map(Number), floor = p.floors[f];
    const i = oi + ci, j = oj + cj, k0 = 2 * f, low = world.tileAt(i, j, k0), high = world.tileAt(i, j, k0 + 1);
    // Floor: frame timber that supports what stands on it. The stair opening has none above ground.
    const stairs = floor.stairs, x = (ci + .5) * PITCH, z = (cj + .5) * PITCH;
    const stairwell = f > 0 && stairs && x > stairs.x && x < stairs.x + stairs.width && z > stairs.z && z < stairs.z + stairs.run;
    if (!stairwell) {
      const object = f > 0 ? world.setFace(i, j, k0, 2, -1, 'timber') : null;
      world.addFuel(low, 'frame', 1, {supports: true, face: object ? {axis: 2, step: -1, object} : null});
    }
    // Roof over any cell with nothing above it.
    if (!roomOf(f + 1, ci, cj)) {
      const object = world.setFace(i, j, k0 + 1, 2, 1, 'timber');
      world.addFuel(high, 'roof', 1, {face: {axis: 2, step: 1, object}});
    }
    for (const [axis, step] of [[0, 1], [0, -1], [1, 1], [1, -1]]) {
      const ni = ci + (axis === 0 ? step : 0), nj = cj + (axis === 1 ? step : 0), other = roomOf(f, ni, nj);
      const mx = (ci + .5 + (axis === 0 ? step / 2 : 0)) * PITCH, mz = (cj + .5 + (axis === 1 ? step / 2 : 0)) * PITCH;
      if (!other) {
        // Outside wall: clapboard on both layers, glass in the upper layer at a window.
        for (const [tile, k] of [[low, k0], [high, k0 + 1]]) {
          if (k === k0 + 1 && onSegment(floor.windows, mx, mz)) { world.setFace(i, j, k, axis, step, 'glass'); continue; }
          const object = world.setFace(i, j, k, axis, step, 'timber');
          world.addFuel(tile, 'clapboard', 1, {face: {axis, step, object}});
          tile.radiantTarget = true;
        }
      } else if (other !== room && step > 0) {
        // Partition between two rooms, built once from the lower-numbered side.
        if (openPairs.has(f + ':' + [room.id, other.id].sort().join('|'))) continue;
        const door = doorFaces.has([f, ci, cj, axis, step].join(':'));
        if (door && options.doorsOpen) continue;
        for (const [tile, k] of [[low, k0], [high, k0 + 1]]) {
          // A door starts shut: thinner timber than the partition round it, so it burns through sooner.
          const object = world.setFace(i, j, k, axis, step, 'timber');
          world.addFuel(tile, 'clapboard', door && k === k0 ? .5 : 1, {face: {axis, step, object}});
        }
      }
    }
  }
  // Contents, by room type, at the room's middle cell.
  for (const record of rooms.values()) {
    const [ci, cj] = record.cells[Math.floor(record.cells.length / 2)];
    const tile = world.tileAt(oi + ci, oj + cj, 2 * record.floor), next = world.tileAt(oi + ci + 1, oj + cj, 2 * record.floor) ?? tile;
    record.centre = tile;
    record.fuelCount = record.tiles.reduce((n, t) => n + t.fuels.length, 0);
    if (contents.furniture) {
      world.addFuel(tile, 'furniture', 1);
      if (record.type === 'bedroom') world.addFuel(tile, 'cloth', .6);
      if (contents.lacquer === 'all' || contents.lacquer === 'some' && hash(p.id + record.id) % 4 === 0) world.addFuel(tile, 'lacquer', .3);
    }
    if (contents.oil && (record.type === 'kitchen' || record.type === 'pantry')) world.addFuel(next, 'oil', 3, {store: 'oil'});
    if (contents.coal && record.type === 'kitchen') world.addFuel(next, 'coal', 1);
  }
  return {name, plan: p, rooms, origin: [oi, oj], doorFaces};
}
