import {ASSET_SCALE as scale} from './asset-scale.js';

const EPS = 1e-7;
const edgeKey = (a, b) => [a.join(','), b.join(',')].sort().join('|');

export function inRoom([x, z], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[j], [bx, bz] = polygon[i];
    if (Math.abs((x - ax) * (bz - az) - (z - az) * (bx - ax)) < EPS &&
      x >= Math.min(ax, bx) - EPS && x <= Math.max(ax, bx) + EPS && z >= Math.min(az, bz) - EPS && z <= Math.max(az, bz) + EPS) return true;
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

export const inFloor = (floor, x, z) => floor.rooms.some(room => inRoom([x, z], room.polygon));

export function exteriorPlanEdges(floor) {
  const edges = new Map(), inside = new Set();
  for (const {polygon} of floor.rooms) for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], dx = b[0] - a[0], dz = b[1] - a[1];
    const units = Math.max(Math.abs(dx), Math.abs(dz));
    for (let n = 0; n < units; n++) {
      const u = [a[0] + dx * n / units, a[1] + dz * n / units], v = [a[0] + dx * (n + 1) / units, a[1] + dz * (n + 1) / units];
      const id = edgeKey(u, v);
      if (edges.has(id)) inside.add(id);
      else edges.set(id, {id, a: u, b: v, polygon});
    }
  }
  const entry = floor.entry && edgeKey(floor.entry.slice(0, 2), floor.entry.slice(2));
  const windows = new Set(floor.windows?.map(w => edgeKey(w.slice(0, 2), w.slice(2))) ?? []);
  return [...edges.values()].filter(edge => !inside.has(edge.id)).map(edge => {
    const {id, a, b, polygon} = edge, x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const nx = dz / length, nz = -dx / length;
    const sign = inRoom([x + nx * .1, z + nz * .1], polygon) ? -1 : 1;
    const front = !dz && z <= 0;
    // The Gross plan's inferred windows use the same rule as the native assembler.
    const inferred = !floor.windows && (dx && dz || (front ? Math.min(a[0], b[0]) % 2 === 0 : Math.round(x + z) % 3 === 1));
    const bay = floor.windowBays?.some(({a: u, b: v}) =>
      x >= Math.min(u[0], v[0]) - EPS && x <= Math.max(u[0], v[0]) + EPS && z >= Math.min(u[1], v[1]) - EPS && z <= Math.max(u[1], v[1]) + EPS);
    return {id, a, b, x, z, nx: nx * sign, nz: nz * sign, length, opening: id === entry ? 'entry' : windows.has(id) || inferred || bay ? 'window' : null};
  });
}

function clip(poly, plane) {
  const result = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = plane(a), db = plane(b);
    if (da >= 0) result.push(a);
    if ((da >= 0) !== (db >= 0)) result.push(a.map((v, k) => v + (b[k] - v) * da / (da - db)));
  }
  return result;
}

function roofBox(cx, cz, width, depth, base, rise, hip) {
  const x0 = cx - width / 2, x1 = cx + width / 2, z0 = cz - depth / 2, z1 = cz + depth / 2;
  const a = [x0, base, z0], b = [x1, base, z0], c = [x1, base, z1], d = [x0, base, z1];
  const inset = hip ? Math.min(width, depth) / 2 : 0;
  const l = [cx, base + rise, z0 + inset], r = [cx, base + rise, z1 - inset];
  return [[a, l, r], [a, r, d], [b, c, r], [b, r, l], ...(hip ? [[a, b, l], [d, r, c]] : [])];
}

function customHeight(piece, x, z) {
  const dx = Math.abs(x - piece.x), dz = Math.abs(z - piece.z);
  if (dx > piece.width / 2 + .0001 || dz > piece.depth / 2 + .0001) return -Infinity;
  const u = piece.axis === 'x' ? 2 * dz / piece.depth : 2 * dx / piece.width;
  if (piece.form === 'gambrel') return piece.base + piece.rise * (u <= .7 ? 1 - u * .4 : .72 * (1 - u) / .3);
  if (piece.form === 'hip') return piece.base + piece.rise * Math.max(0, Math.min(piece.width / 2 - dx, piece.depth / 2 - dz) / (Math.min(piece.width, piece.depth) / 2));
  return piece.base + piece.rise * Math.max(0, 1 - u);
}

// The same half-metre triangulation and height recipes as the native Hopkins roofs.
function customFacets(house, add) {
  for (const [level, floor] of house.floors.entries()) {
    const base = level * scale.floorSpacing + scale.wallHeight;
    const pieces = house.roofPieces.filter(piece => Math.abs(piece.base - base) < .2);
    const height = (x, z) => {
      const top = Math.max(...pieces.map(piece => customHeight(piece, x, z)));
      return house.plinth + (Number.isFinite(top) ? top : base + .12);
    };
    function facet(points) {
      const x = points.reduce((n, p) => n + p[0], 0) / 3, z = points.reduce((n, p) => n + p[1], 0) / 3;
      if (!house.floors.slice(level + 1).some(f => inFloor(f, x, z))) add(points.map(([x, z]) => [x, height(x, z), z]), level, 'main');
    }
    for (const {polygon} of floor.rooms) {
      const xs = polygon.map(p => p[0]), zs = polygon.map(p => p[1]);
      for (let x = Math.min(...xs); x < Math.max(...xs); x += .5) for (let z = Math.min(...zs); z < Math.max(...zs); z += .5) {
        const points = [[x, z], [x + .5, z], [x + .5, z + .5], [x, z + .5]].filter(p => inRoom(p, polygon));
        if (points.length >= 3) facet(points.slice(0, 3));
        if (points.length === 4) facet([points[0], points[2], points[3]]);
      }
    }
  }
}

function gambrelFacets(house, add) {
  const roofs = house.roofAssembly.pieces.map(piece => {
    const {axis, x, z, span, kneeRun, kneeRise, upperPitch, runStart, runEnd} = piece;
    const half = span / 2, knee = half - kneeRun, base = house.plinth + piece.base;
    const profile = [[-half, 0], [-knee, kneeRise], [0, kneeRise + knee * upperPitch], [knee, kneeRise], [half, 0]];
    const run = v => axis === 'x' ? v[0] : v[2], across = v => axis === 'x' ? v[2] - z : v[0] - x;
    const point = (r, q, h) => axis === 'x' ? [r, base + h, z + q] : [x + q, base + h, r];
    const planes = [v => run(v) - runStart, v => runEnd - run(v), v => across(v) + half, v => half - across(v), v => v[1] - base];
    const facets = [];
    for (let i = 0; i < 4; i++) {
      const a = profile[i], b = profile[i + 1], pitch = (b[1] - a[1]) / (b[0] - a[0]);
      planes.push(v => base + a[1] + pitch * (across(v) - a[0]) - v[1]);
      facets.push([point(runStart, ...a), point(runEnd, ...a), point(runEnd, ...b), point(runStart, ...b)]);
    }
    return {facets, planes};
  });
  // Subtract the adjacent roof volume to keep only the visible valley surfaces.
  function outside(poly, planes) {
    const visible = [];
    for (const plane of planes) {
      if (poly.length < 3) break;
      const piece = clip(poly, v => -plane(v) - EPS);
      if (piece.length >= 3) visible.push(piece);
      poly = clip(poly, v => plane(v) + EPS);
    }
    return visible;
  }
  for (const [i, roof] of roofs.entries()) for (const polygon of roof.facets) {
    let visible = [polygon];
    for (const [j, other] of roofs.entries()) if (i !== j) visible = visible.flatMap(poly => outside(poly, other.planes));
    for (const poly of visible) add(poly, house.floors.length - 1, 'main');
  }
  for (const p of house.roofPieces.filter(piece => piece.form === 'hip')) {
    for (const facet of roofBox(p.x, p.z, p.width, p.depth, house.plinth + p.base, p.rise, true)) {
      add(facet, 0, 'rear');
    }
  }
}

function planeArea(poly) {
  const [a, ...rest] = poly;
  const sum = [0, 0, 0];
  for (let i = 1; i < rest.length; i++) {
    const [x, y, z] = rest[i - 1].map((v, k) => v - a[k]), [u, v, w] = rest[i].map((p, k) => p - a[k]);
    sum[0] += y * w - z * v;
    sum[1] += z * u - x * w;
    sum[2] += x * v - y * u;
  }
  const magnitude = Math.hypot(...sum), sign = sum[1] < 0 ? -1 : 1;
  return magnitude > EPS ? {area: magnitude / 2, normal: sum.map(n => n * sign / magnitude)} : null;
}

// One bounded sample per native square metre. Its point and normal lie on an
// actual planar facet, including where a square straddles a ridge or valley.
export function roofPanels(house, partyWalls) {
  const result = new Map();
  function add(poly, level, group) {
    if (partyWalls.left) poly = clip(poly, p => p[0]);
    if (partyWalls.right) poly = clip(poly, p => house.width - p[0]);
    if (poly.length < 3) return;
    const xs = poly.map(p => p[0]), zs = poly.map(p => p[2]);
    for (let u = Math.floor(Math.min(...xs)); u < Math.ceil(Math.max(...xs)); u++) for (let v = Math.floor(Math.min(...zs)); v < Math.ceil(Math.max(...zs)); v++) {
      const part = [p => p[0] - u, p => u + 1 - p[0], p => p[2] - v, p => v + 1 - p[2]].reduce(clip, poly);
      if (part.length < 3) continue;
      const metric = planeArea(part);
      if (!metric) continue;
      const id = `${group}:${level}:${u},${v}`;
      if (!result.has(id)) result.set(id, {id, level, u, v, area: 0, largest: 0, vertices: []});
      const panel = result.get(id);
      panel.area += metric.area;
      panel.vertices.push(...part);
      if (metric.area > panel.largest) {
        const [x, y, z] = part.reduce((sum, p) => sum.map((n, k) => n + p[k] / part.length), [0, 0, 0]);
        const [nx, ny, nz] = metric.normal;
        Object.assign(panel, {x, y, z, nx, ny, nz, largest: metric.area});
      }
    }
  }
  if (house.roofAssembly) gambrelFacets(house, add);
  else if (house.roofPieces) customFacets(house, add);
  else {
    const level = house.floors.length - 1, top = house.plinth + level * scale.floorSpacing + scale.wallHeight;
    const rise = house.style.form === 'row' ? 1 : Math.min(2.1, house.width * .24);
    for (const poly of roofBox(house.width / 2, house.depth / 2, house.width + .5, house.depth + .5, top + .08, rise, house.style.form === 'hip')) add(poly, level, 'main');
  }
  const p = house.porch;
  if (p && house.id !== 'ashland-worker' && !house.frontBalcony) {
    const custom = Boolean(house.roofPieces), rim = custom ? .30 : .35;
    for (const poly of roofBox(p.x + p.width / 2, p.z + p.depth / 2, p.width + rim, p.depth + rim,
      house.plinth + (custom ? 2.04 : 2.02), custom ? p.roofRise ?? .42 : .35, true)) add(poly, 0, 'porch');
  }
  return [...result.values()];
}
