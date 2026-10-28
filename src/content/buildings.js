import {ASSET_SCALE} from './asset-scale.js';
import {HOUSING_PLANS, HOUSING_SOURCE_COMMIT} from './housing-plans.js';

const finite = value => Number.isFinite(value);
const EPS = 1e-8;
// Coordinates follow the source prefab: X/Z on the ground, front toward -Z.
// These three source foundations are rectangular, including the full low plinth
// on the two Hopkins houses. No roof or upper-storey bounding box is used here.
export function localHousingFootprints(prefabId) {
  const plan = HOUSING_PLANS[prefabId];
  if (!Object.hasOwn(HOUSING_PLANS, prefabId)) throw Error('Unreviewed house prefab: ' + prefabId);
  const rim = Math.max(ASSET_SCALE.wallThickness, .18) / 2;
  const result = [{role: 'foundation', x: plan.width / 2, y: plan.depth / 2,
    width: plan.width + rim * 2, depth: plan.depth + rim * 2,
    height: plan.plinth + (plan.floors.length - 1) * ASSET_SCALE.floorSpacing + ASSET_SCALE.wallHeight}];
  if (plan.porch) {
    const p = plan.porch, entry = plan.floors[0].entry;
    const entryX = entry ? (entry[0] + entry[2]) / 2 : p.x + p.width / 2;
    const run = Math.max(3, Math.ceil(plan.plinth / .18)) * .22;
    result.push({role: 'porch', x: p.x + p.width / 2, y: p.z + p.depth / 2,
      width: p.width, depth: p.depth, height: plan.plinth});
    // Native artist stair recipe: 1.16m treads; rails at +/- .61m, .055m thick.
    result.push({role: 'stairs', x: entryX, y: p.z - run / 2,
      width: 1.22 + .055, depth: run + .055, height: plan.plinth});
  }
  return result;
}

export function buildingPoint(instance, point) {
  const [c, s] = [[1, 0], [0, 1], [-1, 0], [0, -1]][instance.quarterTurns];
  return {x: instance.x + point.x * c - point.y * s, y: instance.y + point.x * s + point.y * c};
}

export function compileBuildings(instances = [], world) {
  if (!Array.isArray(instances) || instances.length > 32) throw Error('Invalid building instances');
  const buildings = [], obstacles = [], ids = new Set();
  for (const input of instances) {
    if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['id', 'prefabId', 'x', 'y', 'quarterTurns'].includes(key)) ||
        typeof input.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(input.id) || ids.has(input.id) || !Object.hasOwn(HOUSING_PLANS, input.prefabId) ||
        ![input.x, input.y].every(finite) || !Number.isInteger(input.quarterTurns) || input.quarterTurns < 0 || input.quarterTurns > 3) throw Error('Invalid native building instance');
    ids.add(input.id);
    const plan = HOUSING_PLANS[input.prefabId], instance = {...input};
    const footprints = localHousingFootprints(input.prefabId).map(local => {
      const center = buildingPoint(instance, local), odd = instance.quarterTurns % 2;
      const box = {id: instance.id + ':' + local.role, buildingId: instance.id, role: local.role, ...center,
        width: odd ? local.depth : local.width, depth: odd ? local.width : local.depth, height: local.height,
        material: 'wood', kind: 'building-foundation', solid: true, blocksHeat: true};
      if (world && (box.x - box.width / 2 < -EPS || box.y - box.depth / 2 < -EPS ||
          box.x + box.width / 2 > world.width + EPS || box.y + box.depth / 2 > world.height + EPS)) throw Error('Building footprint outside world: ' + instance.id);
      if (obstacles.some(other => other.buildingId !== instance.id && Math.abs(box.x - other.x) < (box.width + other.width) / 2 - EPS &&
          Math.abs(box.y - other.y) < (box.depth + other.depth) / 2 - EPS)) throw Error('Overlapping building foundations');
      return box;
    });
    obstacles.push(...footprints);
    buildings.push({...instance, collection: input.prefabId.startsWith('hopkins-') ? 'hopkins' : 'gross', label: plan.label,
      material: 'wood', meshScale: [1, 1, 1], sourceCommit: HOUSING_SOURCE_COMMIT, source: structuredClone(plan.source),
      door: {width: ASSET_SCALE.doorWidth, height: ASSET_SCALE.doorHeight, state: 'closed', traversable: false},
      footprints: structuredClone(footprints), colliderIds: footprints.map(box => box.id)});
  }
  return {buildings, obstacles};
}
