import {ASSET_SCALE} from './asset-scale.js';
import {inRoom} from './housing-envelope.js';
import {housingSectionAt} from './housing-sections.js';

const EPS = 1e-8, TILE = .5;
const supportByPlan = new WeakMap();
const pointKey = point => point.join(',');
const edgeKey = (a, b) => [pointKey(a), pointKey(b)].sort().join('|');
const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

// The pinned Gross assembler emits these oak triangles on every selected
// prefab, including Hopkins and the derived Monroe variants. Its raised
// stone rectangle, slab rims and decorative exterior trim are separate meshes.
function floorTriangles(plan, level) {
  const floor = level === -1 ? plan.basementFloor : plan.floors[level];
  const shaft = level > 0 ? plan.floors[0].stairs : null;
  const tiles = new Map();
  function cover(corners, indices) {
    const points = indices.map(index => corners[index]);
    const x = points.reduce((sum, p) => sum + p[0], 0) / 3;
    const z = points.reduce((sum, p) => sum + p[1], 0) / 3;
    if (shaft && x > shaft.x && x < shaft.x + 1 && z > shaft.z && z < shaft.z + 3) return;
    const key = pointKey(corners[0]);
    if (!tiles.has(key)) tiles.set(key, {corners, mask: 0});
    const tile = tiles.get(key);
    // Each three-corner art triangle covers two of the four wedges. A union
    // counts coincident room meshes once, even across opposing diagonals.
    for (let i = 0; i < 4; i++) if (indices.includes(i) && indices.includes((i + 1) % 4)) tile.mask |= 1 << i;
  }
  for (const {polygon} of floor?.rooms ?? []) {
    const xs = polygon.map(p => p[0]), zs = polygon.map(p => p[1]);
    const maxX = Math.max(...xs), maxZ = Math.max(...zs);
    for (let x = Math.min(...xs); x < maxX; x += TILE) {
      for (let z = Math.min(...zs); z < maxZ; z += TILE) {
        const corners = [[x, z], [x + TILE, z], [x + TILE, z + TILE], [x, z + TILE]];
        const inside = [0, 1, 2, 3].filter(index => inRoom(corners[index], polygon));
        if (inside.length === 4) {
          cover(corners, [0, 1, 2]);
          cover(corners, [0, 2, 3]);
        } else if (inside.length === 3) cover(corners, inside);
      }
    }
  }
  const triangles = [];
  for (const {corners, mask} of tiles.values()) {
    const center = [corners[0][0] + TILE / 2, corners[0][1] + TILE / 2];
    for (let i = 0; i < 4; i++) {
      if (!(mask & (1 << i))) continue;
      const points = [corners[i], corners[(i + 1) % 4], center];
      const x = points.reduce((sum, p) => sum + p[0], 0) / 3;
      const z = points.reduce((sum, p) => sum + p[1], 0) / 3;
      triangles.push({points, x, z, area: TILE ** 2 / 4, neighbors: []});
    }
  }
  return triangles;
}

export function floorPatchContains(patch, point) {
  return patch.triangles.some(points =>
    points.every((a, index) => cross(a, points[(index + 1) % 3], point) >= -EPS));
}

export function floorPatchBorders(patch, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  const project = p => ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / length;
  return patch.edges.some(([p, q]) => {
    if (Math.abs(cross(a, b, p)) > EPS || Math.abs(cross(a, b, q)) > EPS) return false;
    const u = project(p), v = project(q);
    return Math.min(length, Math.max(u, v)) - Math.max(0, Math.min(u, v)) > EPS;
  });
}

function edgeDistance([x, z], [[ax, az], [bx, bz]]) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}

function placeAnchor(patch, triangles) {
  const area = triangles.reduce((sum, triangle) => sum + triangle.area, 0);
  const center = axis => triangles.reduce((sum, t) => sum + t[axis] * t.area, 0) / area;
  const candidates = [[center('x'), center('z')], ...triangles.map(t => [t.x, t.z])];
  let point, radius = 0;
  for (const candidate of candidates) {
    if (!floorPatchContains(patch, candidate)) continue;
    const clearance = Math.min(...patch.edges.map(edge => edgeDistance(candidate, edge)));
    if (clearance > radius + EPS) { point = candidate; radius = clearance; }
  }
  return {x: point[0], z: point[1], area, floorRadius: radius - EPS};
}

// A connected oak patch belongs to one live section. Authored half-metre
// triangles align with the one- and two-metre section grids, including the
// outer sections which also own any projections beyond the nominal plan.
export function compileFloorSupport(plan, level, grid) {
  let cache = supportByPlan.get(plan);
  if (!cache) supportByPlan.set(plan, cache = new Map());
  const key = [level, grid.cols, grid.rows, grid.metres].join('/');
  if (cache.has(key)) return cache.get(key);

  const triangles = floorTriangles(plan, level), uses = new Map();
  for (const triangle of triangles) {
    triangle.section = housingSectionAt(grid, triangle.x, triangle.z);
    for (const [i, a] of triangle.points.entries()) {
      const b = triangle.points[(i + 1) % 3], key = edgeKey(a, b);
      if (!uses.has(key)) uses.set(key, {edge: [a, b], triangles: []});
      uses.get(key).triangles.push(triangle);
    }
  }
  for (const {triangles: [a, b]} of uses.values()) if (b && a.section === b.section) {
    a.neighbors.push(b);
    b.neighbors.push(a);
  }

  const patchOf = new Map(), members = new Map(), bySection = new Map();
  for (const triangle of triangles) {
    if (patchOf.has(triangle)) continue;
    const patch = {section: triangle.section, y: plan.plinth + level * ASSET_SCALE.floorSpacing,
      triangles: [], edges: [], neighbors: new Set()};
    const connected = [triangle];
    patchOf.set(triangle, patch);
    for (const member of connected) for (const neighbor of member.neighbors) {
      if (patchOf.has(neighbor)) continue;
      patchOf.set(neighbor, patch);
      connected.push(neighbor);
    }
    patch.triangles = connected.map(t => t.points);
    members.set(patch, connected);
    if (!bySection.has(patch.section)) bySection.set(patch.section, []);
    bySection.get(patch.section).push(patch);
  }
  for (const {edge, triangles: [a, b]} of uses.values()) {
    const from = patchOf.get(a), to = b && patchOf.get(b);
    if (from === to) continue;
    from.edges.push(edge);
    if (to) {
      to.edges.push(edge);
      from.neighbors.add(to);
      to.neighbors.add(from);
    }
  }
  for (const [patch, connected] of members) Object.assign(patch, placeAnchor(patch, connected));
  const patches = [...bySection.keys()].sort((a, b) => a - b).flatMap(section => bySection.get(section));
  const support = {patches, bySection};
  cache.set(key, support);
  return support;
}
