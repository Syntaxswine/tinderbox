import {buildingPoint} from '../content/buildings.js';
import {heatSurfaceSite, surfaceOutput, surfaceTravel} from './surface-fire.js';

const EPS = 1e-7;
const SEAM_WARMUP_SECONDS = .5;
const HEAT_PER_METRE_SECOND = .58;

function worldEdge(roof, {a, b, site}) {
  function transform([x, height, z]) {
    const point = buildingPoint(roof.building, {x, y: z});
    return [point.x, height, point.y];
  }
  return {a: transform(a), b: transform(b), site};
}

function overlapLength(first, second) {
  const delta = first.b.map((value, i) => value - first.a[i]);
  const length = Math.hypot(...delta);
  if (length <= EPS) return 0;
  const direction = delta.map(value => value / length);
  function projection(point) {
    const offset = point.map((value, i) => value - first.a[i]);
    const along = offset.reduce((sum, value, i) => sum + value * direction[i], 0);
    if (Math.hypot(...offset.map((value, i) => value - along * direction[i])) > EPS) return NaN;
    return along;
  }
  const a = projection(second.a), b = projection(second.b);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.min(length, Math.max(a, b)) - Math.max(0, Math.min(a, b)));
}

function contacts(left, right) {
  const first = left.seams.right.map(edge => worldEdge(left, edge));
  const second = right.seams.left.map(edge => worldEdge(right, edge));
  const pairs = new Map();
  for (const a of first) for (const b of second) {
    const length = overlapLength(a, b);
    if (length <= EPS) continue;
    const key = a.site.publicId + '|' + b.site.publicId;
    // Several clipped facets can repeat a boundary. One panel pair contributes
    // once, using its largest observed overlap as a conservative contact span.
    if (length > (pairs.get(key)?.length ?? 0)) pairs.set(key, {a: a.site, b: b.site, length});
  }
  return pairs.values();
}

export function createJoinedRoofHeat(housing) {
  const links = [];
  for (const id of [...housing.keys()].sort()) {
    const left = housing.get(id).roof;
    const right = housing.get(left.building.partyWalls.right)?.roof;
    if (right?.building.partyWalls.left !== id) continue;
    for (const {a, b, length} of contacts(left, right)) {
      links.push(
        {donor: left, receiver: right, from: a, to: b, length,
          delay: SEAM_WARMUP_SECONDS + surfaceTravel(a.world, b.world)},
        {donor: right, receiver: left, from: b, to: a, length,
          delay: SEAM_WARMUP_SECONDS + surfaceTravel(b.world, a.world)}
      );
    }
  }

  return {
    exchange(dt, time) {
      // This pass adds heat before any house resolves ignition or removes a
      // section. Receivers cannot turn into donors partway through this pass.
      for (const {donor, receiver, from, to, length, delay} of links) {
        if (from.phase !== 'burning' || to.phase !== 'cold' || donor.building.destroyed ||
            receiver.building.destroyed || !donor.present(from) || !receiver.present(to) ||
            time - from.ignitedAt < delay) continue;
        const amount = dt * length * HEAT_PER_METRE_SECOND * surfaceOutput(from, time);
        heatSurfaceSite(to, amount, {kind: 'joined-roof', cellId: from.publicId});
      }
    }
  };
}
