const EPS = 1e-10;
const elevatedByOwner = new WeakMap(), elevatedShapes = new WeakSet();
export function setElevatedBlockers(box, volumes) {
  for (const shape of volumes) elevatedShapes.add(shape);
  elevatedByOwner.set(box, volumes);
}
export const elevatedBlockers = box => elevatedByOwner.get(box);
export const isElevatedBlocker = box => elevatedShapes.has(box);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function normalized(x, y) {
  const n = Math.max(1, Math.hypot(x, y));
  return {x: x / n, y: y / n};
}
// Raw screen-stick +Y is up. Invert once, before the camera projection.
export function movementVector(raw, inverted, input) {
  let {x, y} = normalized(raw.x, raw.y);
  if (inverted) { x = -x; y = -y; }
  if (!input.cameraRelative) return {x, y};
  const n = Math.hypot(input.cameraX, input.cameraY) || 1;
  return {x: (x * input.cameraY - y * input.cameraX) / n,
    y: (-x * input.cameraX - y * input.cameraY) / n};
}
export function worldToStick(vector, input) {
  if (!input.cameraRelative) return normalized(vector.x, vector.y);
  const n = Math.hypot(input.cameraX, input.cameraY) || 1;
  return normalized((vector.x * input.cameraY - vector.y * input.cameraX) / n,
    (-vector.x * input.cameraX - vector.y * input.cameraY) / n);
}
export function worldRayTarget(from, direction, reach, world) {
  const {x, y} = direction;
  const edgeX = x === 0 ? Infinity : ((x > 0 ? world.width : 0) - from.x) / x;
  const edgeY = y === 0 ? Infinity : ((y > 0 ? world.height : 0) - from.y) / y;
  const length = Math.min(reach, edgeX, edgeY);
  return {x: clamp(from.x + x * length, 0, world.width), y: clamp(from.y + y * length, 0, world.height)};
}
export function inObstacle(p, o, inset = 0) {
  if (o.kind === 'barrel') return distance(p, o) <= (o.radius ?? o.width / 2) + inset;
  return Math.abs(p.x - o.x) <= o.width / 2 + inset && Math.abs(p.y - o.y) <= o.depth / 2 + inset;
}
export function freePoint(p, radius, world, obstacles) {
  if (![p.x, p.y, radius].every(Number.isFinite) || radius <= 0 || p.x < radius || p.y < radius || p.x > world.width - radius || p.y > world.height - radius) return false;
  for (const o of obstacles) {
    if (!o.destroyed && o.solid !== false && discOverlapsObstacle(p, radius, o)) return false;
  }
  return true;
}
export function discOverlapsObstacle(p, radius, o) {
  return o.kind === 'barrel' ? distance(p, o) < radius + (o.radius ?? o.width / 2) - EPS
    : pointBoxDistance(p, o) < radius - EPS;
}
export function pointSegmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  const t = length2 > EPS * EPS ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / length2, 0, 1) : 0;
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
function pointBoxDistance(p, o) {
  return Math.hypot(Math.max(Math.abs(p.x - o.x) - o.width / 2, 0), Math.max(Math.abs(p.y - o.y) - o.depth / 2, 0));
}
// Exact swept-disc clearance: endpoint tests alone can shave a rounded corner.
export function sweptDiscClear(a, b, radius, world, obstacles) {
  if (!freePoint(a, radius, world, obstacles) || !freePoint(b, radius, world, obstacles)) return false;
  for (const o of obstacles) {
    if (o.destroyed || o.solid === false) continue;
    if (o.kind === 'barrel') {
      if (pointSegmentDistance(o, a, b) < radius + (o.radius ?? o.width / 2) - EPS) return false;
    } else {
      if (boxInterval(a, b, o)) return false;
      let gap = Math.min(pointBoxDistance(a, o), pointBoxDistance(b, o));
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        gap = Math.min(gap, pointSegmentDistance({x: o.x + sx * o.width / 2, y: o.y + sy * o.depth / 2}, a, b));
      }
      if (gap < radius - EPS) return false;
    }
  }
  return true;
}
// Return every accepted segment. Fuel accounting never uses requested distance.
export function moveDisc(start, dx, dy, radius, world, obstacles, cellSize) {
  const length = Math.hypot(dx, dy), points = [{x: start.x, y: start.y}];
  const count = Math.max(1, Math.ceil(length / Math.min(0.04, cellSize / 5)));
  const sx = dx / count, sy = dy / count;
  for (let i = 0; i < count; i++) {
    const p = points.at(-1); let next = {x: p.x + sx, y: p.y + sy};
    if (!sweptDiscClear(p, next, radius, world, obstacles)) {
      if (sweptDiscClear(p, {x: next.x, y: p.y}, radius, world, obstacles)) next.y = p.y;
      else if (sweptDiscClear(p, {x: p.x, y: next.y}, radius, world, obstacles)) next.x = p.x;
      else continue;
    }
    if (distance(p, next) > EPS) points.push(next);
  }
  return points;
}
export function clipConvexPolygon(polygon, planes) {
  for (const [nx, ny, k] of planes) {
    const next = [];
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i], q = polygon[(i + 1) % polygon.length];
      const a = nx * p.x + ny * p.y - k, b = nx * q.x + ny * q.y - k;
      if (a >= 0) next.push(p);
      if ((a >= 0) !== (b >= 0)) {
        const t = a / (a - b);
        next.push({x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t});
      }
    }
    polygon = next;
    if (polygon.length < 3) return [];
  }
  return polygon;
}

export function boxInterval(a, b, o) {
  let lo = 0, hi = 1;
  for (const [key, half] of [['x', o.width / 2], ['y', o.depth / 2]]) {
    const delta = b[key] - a[key], min = o[key] - half, max = o[key] + half;
    if (Math.abs(delta) < EPS) { if (a[key] < min || a[key] > max) return null; }
    else { const t0 = (min - a[key]) / delta, t1 = (max - a[key]) / delta;
      lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1)); if (lo > hi) return null; }
  }
  if (isElevatedBlocker(o)) for (const [nx, ny, k] of o.planes) {
    const start = nx * a.x + ny * a.y - k, end = nx * b.x + ny * b.y - k;
    if (start < -EPS && end < -EPS) return null;
    if (start < -EPS) lo = Math.max(lo, start / (start - end));
    if (end < -EPS) hi = Math.min(hi, start / (start - end));
    if (lo > hi) return null;
  }
  return [lo, hi];
}

function heightInterval(span, from, to, bottom, top) {
  let [lo, hi] = span;
  const delta = to - from;
  if (Math.abs(delta) < 1e-8) return from >= bottom && from <= top ? span : null;
  const a = (bottom - from) / delta, b = (top - from) / delta;
  lo = Math.max(lo, Math.min(a, b));
  hi = Math.min(hi, Math.max(a, b));
  return lo <= hi ? [lo, hi] : null;
}

function* toolBlockers(a, b, obstacles, elevated) {
  for (const box of obstacles) {
    if (box.destroyed || box.blocksHeat === false) continue;
    const volumes = elevated && elevatedBlockers(box);
    if (volumes) {
      if (boxInterval(a, b, box)) yield* volumes;
    } else yield box;
    yield* box.heatBarriers ?? [];
  }
}

export function firstHeatContact(from, to, obstacles, startHeight = 0, endHeight = startHeight) {
  let first = null;
  for (const box of toolBlockers(from, to, obstacles, startHeight > 0 || endHeight > 0)) {
    const span = boxInterval(from, to, box);
    if (!span || span[1] <= 1e-8) continue;
    const elevated = isElevatedBlocker(box);
    const interval = heightInterval(span, startHeight, endHeight, elevated ? box.bottom : 0, elevated ? box.top : box.height + .05);
    if (!interval || interval[1] <= 1e-8 || first && interval[0] >= first.t) continue;
    first = elevated ? {t: interval[0], box: box.owner, volume: box} : {t: interval[0], box};
  }
  return first;
}
export function inHeatCone(origin, target, ux, uy, range, cosine) {
  const dx = target.x - origin.x, dy = target.y - origin.y, distance = Math.hypot(dx, dy);
  return distance >= .15 && distance <= range && (dx * ux + dy * uy) / distance >= cosine;
}

export function lineClear(a, b, obstacles, {ignoreBarrels = true, allowWoodEndpoints = true} = {}) {
  for (const o of obstacles) {
    if (o.destroyed || o.blocksHeat === false || ignoreBarrels && o.kind === 'barrel') continue;
    for (const barrier of o.heatBarriers || []) {
      const span = boxInterval(a, b, barrier);
      if (span && span[1] > EPS && span[0] < 1 - EPS) return false;
    }
    // A combustible obstacle can be heated at its own surface, then become a source.
    if (allowWoodEndpoints && o.material === 'wood' &&
        (inObstacle(a, o, (a.size ?? 0) / 2) || inObstacle(b, o, (b.size ?? 0) / 2))) continue;
    const span = boxInterval(a, b, o);
    if (span && span[1] > EPS && span[0] < 1 - EPS) return false;
  }
  return true;
}
export function impactContact(a, b, obstacles, startHeight, endHeight) {
  let first = null;
  for (const box of toolBlockers(a, b, obstacles, startHeight > 0 || endHeight > 0)) {
    if (box.destroyed || box.blocksHeat === false) continue;
    const span = boxInterval(a, b, box);
    if (!span || span[1] <= EPS) continue;
    let t = span[0];
    const elevated = isElevatedBlocker(box);
    if (elevated) {
      const interval = heightInterval(span, startHeight, endHeight, box.bottom, box.top);
      if (!interval || interval[1] <= EPS) continue;
      t = interval[0];
    } else {
      // Keep the legacy swept hit for other obstacles and the ground field.
      const delta = endHeight - startHeight;
      const low = Math.min(startHeight + delta * span[0], startHeight + delta * span[1]);
      if (low > box.height + .05) continue;
    }
    if (first && t >= first.t) continue;
    first = {t, travel: Math.max(0, t - .002), box: elevated ? box.owner : box, volume: elevated ? box : null};
  }
  return first;
}

export function impactPoint(a, b, obstacles, {startHeight = 0, endHeight = startHeight} = {}) {
  const reach = impactContact(a, b, obstacles, startHeight, endHeight)?.travel ?? 1;
  return {x: a.x + (b.x - a.x) * reach, y: a.y + (b.y - a.y) * reach};
}
// Exact line/grid intersection lengths. Handles diagonals and negative travel.
export function rasterSegments(a, b, size) {
  const length = distance(a, b); if (length < EPS) return [];
  const cuts = [0, 1];
  for (const key of ['x', 'y']) {
    const delta = b[key] - a[key]; if (Math.abs(delta) < EPS) continue;
    const min = Math.min(a[key], b[key]), max = Math.max(a[key], b[key]);
    for (let edge = Math.floor(min / size) + 1; edge * size < max - EPS; edge++) {
      const t = (edge * size - a[key]) / delta; if (t > EPS && t < 1 - EPS) cuts.push(t);
    }
  }
  cuts.sort((x, y) => x - y);
  const spans = [];
  for (let i = 1; i < cuts.length; i++) {
    const t0 = cuts[i - 1], t1 = cuts[i]; if (t1 - t0 < EPS) continue;
    const t = (t0 + t1) / 2;
    spans.push({col: Math.floor((a.x + (b.x - a.x) * t) / size),
      row: Math.floor((a.y + (b.y - a.y) * t) / size), length: (t1 - t0) * length});
  }
  return spans;
}
