import {boxInterval} from './geometry.js';
const SKIN = 0.0001, ANGLE_EPS = 1e-7, MAX_RAYS = 256;
export function inactiveDischarge(tick) {
  return {version: 1, tick, active: false, tool: null, origin: null, shapeOrigin: null,
    heading: 0, range: 0, radius: 0, halfAngle: 0, connectRays: false, rays: [], lead: null};
}
function corners(o) {
  return [-1, 1].flatMap(sx => [-1, 1].map(sy => ({x: o.x + sx * o.width / 2, y: o.y + sy * o.depth / 2})));
}
function resolveRay(origin, angle, reach, world, obstacles) {
  const ux = Math.cos(angle), uy = Math.sin(angle);
  let length = reach, obstacleId = null;
  // The world is convex; the source is always inside it.
  for (const [key, unit, maximum] of [['x', ux, world.width], ['y', uy, world.height]]) {
    if (Math.abs(unit) > 1e-12) length = Math.min(length, Math.max(0, (unit > 0 ? maximum - origin[key] : -origin[key]) / unit));
  }
  const end = {x: origin.x + ux * length, y: origin.y + uy * length};
  let hit = length;
  for (const o of obstacles) {
    const span = boxInterval(origin, end, o);
    if (!span || span[1] <= 0) continue;
    const d = Math.max(0, span[0] * length);
    if (d <= hit) { hit = d; obstacleId = o.id; }
  }
  if (obstacleId !== null) length = Math.max(0, hit - SKIN);
  return {angle, x: origin.x + ux * length, y: origin.y + uy * length, h: origin.h, distance: length, obstacleId};
}
// Clip a triangle against an AABB. Positive area means a filled fan would enter it.
function fanEntersBox(origin, a, b, box) {
  let polygon = [origin, a, b];
  for (const [key, edge, sign] of [['x', box.x - box.width / 2, 1], ['x', box.x + box.width / 2, -1],
    ['y', box.y - box.depth / 2, 1], ['y', box.y + box.depth / 2, -1]]) {
    const next = [];
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i], q = polygon[(i + 1) % polygon.length];
      const pin = (p[key] - edge) * sign >= 0, qin = (q[key] - edge) * sign >= 0;
      if (pin) next.push(p);
      if (pin !== qin) {
        const t = (edge - p[key]) / (q[key] - p[key]);
        next.push({x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t});
      }
    }
    polygon = next; if (polygon.length < 3) return false;
  }
  const first = polygon[0]; let area2 = 0;
  for (let i = 1; i < polygon.length - 1; i++) area2 +=
    (polygon[i].x - first.x) * (polygon[i + 1].y - first.y) - (polygon[i].y - first.y) * (polygon[i + 1].x - first.x);
  return Math.abs(area2) > 1e-16;
}
function trimCornerTriangles(origin, rays, blockers) {
  for (let i = 1; i < rays.length; i++) for (const o of blockers) {
    const a = rays[i - 1], b = rays[i];
    if (!fanEntersBox(origin, a, b, o)) continue;
    // A circle ending before the closest solid point is safe for every angle.
    const limit = Math.max(0, Math.hypot(Math.max(Math.abs(origin.x - o.x) - o.width / 2, 0),
      Math.max(Math.abs(origin.y - o.y) - o.depth / 2, 0)) - SKIN);
    for (const r of [a, b]) if (r.distance > limit) {
      r.distance = limit; r.x = origin.x + Math.cos(r.angle) * limit; r.y = origin.y + Math.sin(r.angle) * limit; r.obstacleId = o.id;
    }
    // Radial shortening only removes triangle area, including from neighboring fans.
  }
}
function resolvedFan(origin, heading, halfAngle, reach, world, obstacles) {
  const blockers = obstacles.filter(o => !o.destroyed && o.blocksHeat !== false && o.kind !== 'barrel');
  const count = halfAngle === Math.PI ? 32 : 24;
  const regular = Array.from({length: count + 1}, (_, i) => -halfAngle + 2 * halfAngle * i / count);
  const angles = [...regular];
  const bounds = {x: world.width / 2, y: world.height / 2, width: world.width, depth: world.height};
  for (const o of [...blockers, bounds]) for (const corner of corners(o)) {
    const absolute = Math.atan2(corner.y - origin.y, corner.x - origin.x);
    const relative = Math.atan2(Math.sin(absolute - heading), Math.cos(absolute - heading));
    for (const offset of [-ANGLE_EPS, 0, ANGLE_EPS]) {
      const angle = relative + offset;
      if (angle >= -halfAngle && angle <= halfAngle) angles.push(angle);
    }
  }
  angles.sort((a, b) => a - b);
  const distinct = angles.filter((a, i) => i === 0 || a - angles[i - 1] > 1e-10);
  // A complex fixture gets independent clipped rays, never an unsafe coarse fan.
  const connectRays = distinct.length <= MAX_RAYS;
  const samples = connectRays ? distinct : regular;
  const rays = samples.map(a => resolveRay(origin, heading + a, reach, world, blockers));
  if (connectRays) trimCornerTriangles(origin, rays, blockers);
  return {connectRays, rays};
}
// This shape describes the heat source emitted this tick. It never applies heat.
export function resolveDischarge(state, config, world, torchPoint = null) {
  const p = state.player, tool = p.tool, spec = config.tools[tool];
  const origin = {x: p.x, y: p.y, h: config.tools.presentationHeight};
  const shapeOrigin = torchPoint ? {...torchPoint, h: origin.h} : {...origin};
  const radius = tool === 'torch' ? spec.radius : 0;
  const halfAngle = tool === 'torch' ? Math.PI : spec.halfAngle;
  const fan = resolvedFan(shapeOrigin, p.heading, halfAngle, tool === 'torch' ? radius : spec.range, world, state.obstacles);
  return {version: 1, tick: state.tick, active: true, tool, origin, shapeOrigin, heading: p.heading,
    range: spec.range, radius, halfAngle, ...fan,
    lead: torchPoint ? {from: {...origin}, to: {...shapeOrigin}} : null};
}