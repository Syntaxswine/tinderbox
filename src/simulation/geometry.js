const EPS = 1e-10;
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
export function inObstacle(p, o, inset = 0) {
  if (o.kind === 'barrel') return distance(p, o) <= (o.radius ?? o.width / 2) + inset;
  return Math.abs(p.x - o.x) <= o.width / 2 + inset && Math.abs(p.y - o.y) <= o.depth / 2 + inset;
}
export function freePoint(p, radius, world, obstacles) {
  if (![p.x, p.y, radius].every(Number.isFinite) || radius <= 0 || p.x < radius || p.y < radius || p.x > world.width - radius || p.y > world.height - radius) return false;
  for (const o of obstacles) {
    if (o.destroyed || o.solid === false) continue;
    if (o.kind === 'barrel') { if (distance(p, o) < radius + (o.radius ?? o.width / 2) - EPS) return false; }
    else {
      const dx = Math.max(Math.abs(p.x - o.x) - o.width / 2, 0);
      const dy = Math.max(Math.abs(p.y - o.y) - o.depth / 2, 0);
      if (Math.hypot(dx, dy) < radius - EPS) return false;
    }
  }
  return true;
}
function pointSegmentDistance(p, a, b) {
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
export function boxInterval(a, b, o) {
  let lo = 0, hi = 1;
  for (const [key, half] of [['x', o.width / 2], ['y', o.depth / 2]]) {
    const delta = b[key] - a[key], min = o[key] - half, max = o[key] + half;
    if (Math.abs(delta) < EPS) { if (a[key] < min || a[key] > max) return null; }
    else { const t0 = (min - a[key]) / delta, t1 = (max - a[key]) / delta;
      lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1)); if (lo > hi) return null; }
  }
  return [lo, hi];
}
export function lineClear(a, b, obstacles, {ignoreBarrels = true} = {}) {
  for (const o of obstacles) {
    if (o.destroyed || o.blocksHeat === false || ignoreBarrels && o.kind === 'barrel') continue;
    for (const barrier of o.heatBarriers || []) {
      const span = boxInterval(a, b, barrier);
      if (span && span[1] > EPS && span[0] < 1 - EPS) return false;
    }
    // A combustible obstacle can be heated at its own surface, then become a source.
    if (o.material === 'wood' && (inObstacle(a, o, (a.size ?? 0) / 2) || inObstacle(b, o, (b.size ?? 0) / 2))) continue;
    const span = boxInterval(a, b, o);
    if (span && span[1] > EPS && span[0] < 1 - EPS) return false;
  }
  return true;
}
export function impactPoint(a, b, obstacles, {startHeight = 0, endHeight = startHeight} = {}) {
  let reach = 1;
  for (const o of obstacles.flatMap(object => object.destroyed || object.blocksHeat === false ? [] : [object, ...(object.heatBarriers || [])])) {
    if (o.destroyed || o.blocksHeat === false) continue;
    const span = boxInterval(a, b, o);
    if (span && span[1] > EPS) {
      const low = Math.min(startHeight + (endHeight - startHeight) * span[0], startHeight + (endHeight - startHeight) * span[1]);
      if (low <= o.height + 0.05) reach = Math.min(reach, Math.max(0, span[0] - 0.002));
    }
  }
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
