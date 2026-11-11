import {ASSET_SCALE as scale} from '../content/asset-scale.js';
import {buildingPoint} from '../content/buildings.js';
import {exteriorPlanEdges, inRoom} from '../content/housing-envelope.js';
import {clipConvexPolygon, setElevatedBlockers} from './geometry.js';

const EPS = 1e-8;
const hasSetbacks = prefabId => prefabId === 'hopkins-4-09' || prefabId === 'hopkins-4-13';
const rectangle = (x0, z0, x1, z1) =>
  [{x: x0, y: z0}, {x: x1, y: z0}, {x: x1, y: z1}, {x: x0, y: z1}];
const twiceArea = points => points.reduce((sum, p, i) => {
  const q = points[(i + 1) % points.length];
  return sum + p.x * q.y - p.y * q.x;
}, 0);

function planes(points) {
  const sign = Math.sign(twiceArea(points));
  return points.map((p, i) => {
    const q = points[(i + 1) % points.length], nx = sign * (p.y - q.y), ny = sign * (q.x - p.x);
    return [nx, ny, nx * p.x + ny * p.y];
  });
}

function roomSlab(polygon) {
  const points = polygon.map(([x, y]) => ({x, y}));
  if (planes(points).every(([nx, ny, k]) => points.every(p => nx * p.x + ny * p.y >= k - EPS))) return [points];
  // The concave rooms in these plans are orthogonal. Split at their own corners.
  const xs = [...new Set(points.map(p => p.x))].sort((a, b) => a - b);
  const zs = [...new Set(points.map(p => p.y))].sort((a, b) => a - b);
  const pieces = [];
  for (let i = 1; i < xs.length; i++) for (let j = 1; j < zs.length; j++) {
    const x0 = xs[i - 1], x1 = xs[i], z0 = zs[j - 1], z1 = zs[j];
    if (inRoom([(x0 + x1) / 2, (z0 + z1) / 2], polygon)) pieces.push(rectangle(x0, z0, x1, z1));
  }
  return pieces;
}

function wallRuns(floor) {
  const lines = new Map();
  for (const {a, b, nx, nz} of exteriorPlanEdges(floor)) {
    const k = a[0] * nx + a[1] * nz;
    const key = [nx, nz, k].map(value => Math.round(value / EPS)).join(',');
    if (!lines.has(key)) lines.set(key, {nx, nz, k, spans: []});
    const u = a[1] * nx - a[0] * nz, v = b[1] * nx - b[0] * nz;
    lines.get(key).spans.push([Math.min(u, v), Math.max(u, v)]);
  }
  const runs = [];
  for (const {nx, nz, k, spans} of lines.values()) {
    const merged = [];
    for (const span of spans.sort((a, b) => a[0] - b[0])) {
      const last = merged.at(-1);
      if (last && span[0] <= last[1] + EPS) last[1] = Math.max(last[1], span[1]);
      else merged.push(span);
    }
    for (const [lo, hi] of merged) runs.push({nx, nz, k, lo, hi});
  }
  return runs;
}

function wallStrip({nx, nz, k, lo, hi}, half) {
  return rectangle(lo, k - half, hi, k + half)
    .map(({x: t, y: normal}) => ({x: nx * normal - nz * t, y: nz * normal + nx * t}));
}

// Movement and ground heat still see the authored rectangular collider. Only
// elevated tools see the physical raised plinth, floor rims and exterior walls.
function porchVolumes(plan) {
  const porch = [], stairs = [], p = plan.porch, y = plan.plinth;
  if (!p) return {porch, stairs};
  function cover(x0, z0, x1, z1, bottom, top) {
    porch.push({vertices: rectangle(x0, z0, x1, z1), bottom, top, surface: 'porch-cover'});
  }
  porch.push({vertices: rectangle(p.x, p.z, p.x + p.width, p.z + p.depth),
    bottom: y - scale.slab, top: y, surface: 'deck'});

  const entry = plan.floors[0].entry;
  const entryX = entry ? (entry[0] + entry[2]) / 2 : p.x + p.width / 2;
  const railZ = p.z + .12;
  for (const x of [p.x + .12, p.x + p.width - .12]) {
    cover(x - .09, railZ - .09, x + .09, railZ + .09, y, y + .2);
    cover(x - .085, railZ - .085, x + .085, railZ + .085, y + .2, y + 1.8);
  }
  for (let x = p.x + .2; x < p.x + p.width - .1; x += .22) {
    if (Math.abs(x - entryX) < .65) continue;
    cover(x - .0225, railZ - .0225, x + .0225, railZ + .0225, y + .09, y + .71);
  }
  for (const [lo, hi] of [[p.x, Math.max(p.x, entryX - .65)],
    [Math.min(p.x + p.width, entryX + .65), p.x + p.width]]) {
    if (hi > lo) cover(lo, railZ - .0375, hi, railZ + .0375, y + .72, y + .78);
  }
  const count = Math.max(3, Math.ceil(y / .18));
  for (let index = 0; index < count; index++) {
    const z = p.z - (count - index) * .22;
    stairs.push({vertices: rectangle(entryX - .58, z, entryX + .58, z + .22),
      bottom: 0, top: y * (index + 1) / count, surface: 'deck'});
  }
  return {porch, stairs};
}

export function catalogueHeatVolumes(building, plan) {
  if (!hasSetbacks(building.prefabId)) return null;
  const volumes = [];
  function add(vertices, bottom, top, surface) { volumes.push({vertices, bottom, top, surface}); }
  add(rectangle(0, 0, plan.width, plan.depth), 0, plan.plinth - scale.slab, 'plinth');
  for (const [level, floor] of plan.floors.entries()) {
    const base = plan.plinth + level * scale.floorSpacing;
    for (const room of floor.rooms) for (const slab of roomSlab(room.polygon)) {
      add(slab, base - scale.slab, base, 'slab');
    }
    for (const run of wallRuns(floor)) {
      add(wallStrip(run, .09), base - scale.slab, base, 'rim');
      add(wallStrip(run, scale.wallThickness / 2), base, base + scale.wallHeight, 'wall');
    }
  }
  return {foundation: volumes, ...porchVolumes(plan)};
}

export function attachCatalogueHeatVolumes(box, building, byRole, bounds) {
  const volumes = byRole?.[box.role];
  if (!volumes) return;
  const clips = bounds ? [[1, 0, bounds.minX], [-1, 0, -bounds.maxX],
    [0, 1, bounds.minZ], [0, -1, -bounds.maxZ]].filter(plane => Number.isFinite(plane[2])) : [];
  const shapes = [];
  for (const volume of volumes) {
    const local = clipConvexPolygon(volume.vertices, clips);
    if (local.length < 3 || Math.abs(twiceArea(local)) <= EPS) continue;
    const vertices = local.map(point => buildingPoint(building, point));
    const xs = vertices.map(p => p.x), ys = vertices.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    shapes.push({id: box.id, owner: box, surface: volume.surface, bottom: volume.bottom, top: volume.top,
      x: (x0 + x1) / 2, y: (y0 + y1) / 2, width: x1 - x0, depth: y1 - y0, vertices, planes: planes(vertices)});
  }
  setElevatedBlockers(box, shapes);
}
