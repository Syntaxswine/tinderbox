import {ASSET_SCALE} from './asset-scale.js';
import {HOUSING_PLANS, HOUSING_SOURCE_COMMIT} from './housing-plans.js';

const finite = value => Number.isFinite(value);
const EPS = 1e-8;
// Coordinates follow the source prefab: X/Z on the ground, front toward -Z.
// Selected houses have a full rectangular source plinth or basement foundation.
// In particular the Hopkins 9/13 low plinths fill the irregular room-plan bounds;
// Monroe's projecting upper bay does not enlarge its ground basement rectangle.
// The .09m exterior slab/wall rim allowance is the retained coarse envelope.
export function localHousingFootprints(prefabId, partyWalls = {left: null, right: null}) {
  const plan = HOUSING_PLANS[prefabId];
  if (!Object.hasOwn(HOUSING_PLANS, prefabId)) throw Error('Unreviewed house prefab: ' + prefabId);
  const rim = Math.max(ASSET_SCALE.wallThickness, .18) / 2;
  const left = prefabId === 'monroe-row' && partyWalls.left ? 0 : rim;
  const right = prefabId === 'monroe-row' && partyWalls.right ? 0 : rim;
  const result = [{role: 'foundation', x: (plan.width + right - left) / 2, y: plan.depth / 2,
    width: plan.width + left + right, depth: plan.depth + rim * 2,
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
  }
  const joins = new Map(instances.map(instance => [instance.id, {left: null, right: null}]));
  for (let i = 0; i < instances.length; i++) for (let j = i + 1; j < instances.length; j++) {
    const a = instances[i], b = instances[j];
    if (a.prefabId !== 'monroe-row' || b.prefabId !== a.prefabId || a.quarterTurns !== b.quarterTurns) continue;
    const [c, s] = [[1, 0], [0, 1], [-1, 0], [0, -1]][a.quarterTurns];
    const dx = (b.x - a.x) * c + (b.y - a.y) * s, dz = -(b.x - a.x) * s + (b.y - a.y) * c;
    if (Math.abs(Math.abs(dx) - HOUSING_PLANS[a.prefabId].width) > EPS || Math.abs(dz) > EPS) continue;
    const sideA = dx > 0 ? 'right' : 'left', sideB = dx > 0 ? 'left' : 'right';
    if (joins.get(a.id)[sideA] || joins.get(b.id)[sideB]) throw Error('Conflicting row neighbors');
    joins.get(a.id)[sideA] = b.id; joins.get(b.id)[sideB] = a.id;
  }
  for (const input of instances) {
    const plan = HOUSING_PLANS[input.prefabId], instance = {...input};
    const partyWalls = joins.get(instance.id);
    const footprints = localHousingFootprints(input.prefabId, partyWalls).map(local => {
      const center = buildingPoint(instance, local), odd = instance.quarterTurns % 2;
      const box = {id: instance.id + ':' + local.role, buildingId: instance.id, role: local.role, ...center,
        width: odd ? local.depth : local.width, depth: odd ? local.width : local.depth, height: local.height,
        material: 'wood', kind: 'building-foundation', solid: true, blocksHeat: true};
      if (local.role === 'foundation') {
        box.heatBarriers = ['left', 'right'].filter(side => partyWalls[side]).map(side => {
          const point = buildingPoint(instance, {x: side === 'left' ? 0 : plan.width, y: plan.depth / 2});
          return {id: instance.id + ':party-' + side, ...point, width: odd ? plan.depth : ASSET_SCALE.wallThickness,
            depth: odd ? ASSET_SCALE.wallThickness : plan.depth, height: local.height, material: 'masonry', blocksHeat: true};
        });
      }
      if (world && (box.x - box.width / 2 < -EPS || box.y - box.depth / 2 < -EPS ||
          box.x + box.width / 2 > world.width + EPS || box.y + box.depth / 2 > world.height + EPS)) throw Error('Building footprint outside world: ' + instance.id);
      if (obstacles.some(other => other.buildingId !== instance.id && Math.abs(box.x - other.x) < (box.width + other.width) / 2 - EPS &&
          Math.abs(box.y - other.y) < (box.depth + other.depth) / 2 - EPS)) throw Error('Overlapping building foundations');
      return box;
    });
    obstacles.push(...footprints);
    buildings.push({...instance, partyWalls: {...partyWalls}, collection: input.prefabId.startsWith('hopkins-') ? 'hopkins' : 'gross', label: plan.label,
      material: 'wood', meshScale: [1, 1, 1], sourceCommit: HOUSING_SOURCE_COMMIT, source: structuredClone(plan.source),
      windowBays: plan.floors.flatMap((floor, level) => (floor.windowBays || []).map(bay => ({...structuredClone(bay), level}))),
      door: {width: ASSET_SCALE.doorWidth, height: ASSET_SCALE.doorHeight, state: 'closed', traversable: false},
      footprints: structuredClone(footprints), colliderIds: footprints.map(box => box.id)});
  }
  return {buildings, obstacles};
}
