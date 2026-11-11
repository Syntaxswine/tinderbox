import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../../src/runtime/three.js';
import {createNeighborhood} from '../../src/art/neighborhood.js';
import {createWallShroud} from '../../src/reuse/ashland/wall-shroud.js';
import {createSimulation, DEFAULT_CONFIG, SCENARIOS} from '../../src/simulation/index.js';
import {createHousingTopology} from '../../src/simulation/housing-topology.js';
import {createCottageTopology} from '../../src/simulation/cottage-topology.js';
import {compileBuildings, buildingPoint, localHousingFootprints} from '../../src/content/buildings.js';
import {HOUSING_PLANS} from '../../src/content/housing-plans.js';
import {housingSectionAt, housingSectionGrid} from '../../src/content/housing-sections.js';

const library = {catalogue: {houses: ['gross', 'hopkins'].flatMap(name => JSON.parse(readFileSync(
  new URL('../../assets/art/' + name + '-housing-v1/houses.json', import.meta.url))).houses)}, textures: {}};
const floorMeshes = (house, level) => house.getObjectByName('Level ' + level).children
  .filter(mesh => mesh.name.startsWith('Room floor: '));
const down = new T.Vector3(0, -1, 0);
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-6, message ?? (a + ' != ' + b));
const floorBelow = (meshes, x, y, z) => new T.Raycaster(new T.Vector3(x, y + .1, z), down, 0, .2)
  .intersectObjects(meshes)[0]?.point.y;

function readNativeCoverage(house, level) {
  const inverse = house.matrixWorld.clone().invert(), samples = new Set();
  let height;
  for (const mesh of floorMeshes(house, level)) {
    const transform = new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
    const {position} = mesh.geometry.attributes, index = mesh.geometry.index;
    for (let i = 0; i < (index?.count ?? position.count); i += 3) {
      const points = [0, 1, 2].map(j => new T.Vector3()
        .fromBufferAttribute(position, index ? index.getX(i + j) : i + j).applyMatrix4(transform));
      height ??= points[0].y;
      for (const point of points) near(point.y, height);
      const x = Math.round(2 * Math.min(...points.map(p => p.x))) / 2;
      const z = Math.round(2 * Math.min(...points.map(p => p.z))) / 2;
      const corners = [[x, z], [x + .5, z], [x + .5, z + .5], [x, z + .5]];
      const triangle = new T.Triangle(...points);
      for (let n = 0; n < 4; n++) {
        const a = corners[n], b = corners[(n + 1) % 4];
        const p = new T.Vector3((a[0] + b[0] + x + .25) / 3, height, (a[1] + b[1] + z + .25) / 3);
        if (triangle.containsPoint(p)) samples.add(sampleKey(p.x, p.z));
      }
    }
  }
  return {height, samples};
}
const sampleKey = (x, z) => Math.round(x * 12) + ',' + Math.round(z * 12);

test('Hopkins 9 floor fire from the published east-side strike stays on actual oak', () => {
  const sim = createSimulation({scenario: {...SCENARIOS.neighborhood, actors: [], pickups: [], patches: [],
    player: {x: 10.68, y: 34.5, heading: Math.PI, tool: 'matches'}},
  seed: 1893, config: {fire: {damagePerSecond: 0}, events: {capacity: 4096}}});
  const view = createNeighborhood(T, library);
  try {
    view.update(sim.snapshot().world);
    view.root.updateMatrixWorld(true);
    const house = view.root.children.find(child => child.userData.buildingId === 'hopkins-nine');
    const meshes = floorMeshes(house, 0), active = new Map();
    sim.dispatch({type: 'aim', x: 10.02, y: 34.5});
    sim.dispatch({type: 'primary', pressed: true});
    const struck = sim.advance(DEFAULT_CONFIG.step);
    assert.deepEqual(struck.events.find(event => event.type === 'tool-use').cellIds,
      ['hopkins-nine/wall:0:7,4|7,5:0']);
    sim.dispatch({type: 'primary', pressed: false});
    for (let i = 0; i < 40; i++) {
      const snapshot = sim.advance(.25);
      for (const site of snapshot.structureFire) {
        if (site.id.startsWith('hopkins-nine/floor:0:') && site.flame > 0) active.set(site.id, site);
      }
    }
    assert.ok(active.size >= 10, 'the strike needs to burn real floor fuel');
    const unsupported = [...active.values()].filter(site => floorBelow(meshes, site.x, site.y, site.z) === undefined);
    assert.deepEqual(unsupported.map(({id, x, y, z}) => [id, x, y, z]), []);
    for (const site of active.values()) {
      near(floorBelow(meshes, site.x, site.y, site.z), site.y);
      assert.ok(site.floorRadius > 0);
    }
  } finally { view.dispose(); sim.dispose(); }
});

test('floor patches match native oak coverage across prefabs, turns, stair openings and joins', async () => {
  const {compileFloorSupport} = await import('../../src/content/housing-floors.js');
  const variants = Object.keys(HOUSING_PLANS).flatMap(id => id === 'monroe-row'
    ? [{id, joined: false}, {id, joined: true}] : [{id, joined: false}]);
  let projections = 0, stairLinks = 0, splits = 0;
  for (const {id: prefabId, joined} of variants) for (let quarterTurns = 0; quarterTurns < 4; quarterTurns++) {
    const plan = HOUSING_PLANS[prefabId], origin = {id: 'first', prefabId, x: 16, y: 16, quarterTurns};
    const other = {id: 'second', prefabId, ...buildingPoint(origin, {x: plan.width, y: 0}), quarterTurns};
    const {buildings: [building, neighbor]} = compileBuildings(joined ? [origin, other] : [origin]);
    const grid = housingSectionGrid(prefabId), view = createNeighborhood(T, library);
    try {
      view.update({buildings: neighbor ? [building, neighbor] : [building]});
      view.root.updateMatrixWorld(true);
      const house = view.root.children[0];
      const {sites} = createHousingTopology(building, plan, localHousingFootprints(prefabId, building.partyWalls), DEFAULT_CONFIG);
      assert.equal(new Set(sites.map(site => site.section)).size, grid.cols * grid.rows, prefabId + ' support');
      for (const group of house.children.filter(child => child.name.startsWith('Level '))) {
        const level = Number(group.name.slice(6)), {patches} = compileFloorSupport(plan, level, grid);
        const native = readNativeCoverage(house, level);
        const samples = patches.flatMap(patch => patch.triangles.map(points => sampleKey(
          points.reduce((sum, p) => sum + p[0], 0) / 3, points.reduce((sum, p) => sum + p[1], 0) / 3)));
        assert.deepEqual(samples.sort(), [...native.samples].sort(), prefabId + ' level ' + level);
        assert.equal(patches.reduce((sum, patch) => sum + patch.area, 0), native.samples.size / 16);
        for (const patch of patches) {
          near(patch.y, native.height);
          if (patch.triangles.some(points => points.some(([x, z]) => x < 0 || z < 0 || x > plan.width || z > plan.depth))) projections++;
        }
        if (level < 0) continue;
        const floorSites = sites.filter(site => site.id.startsWith('floor:' + level + ':'));
        assert.equal(floorSites.length, patches.length);
        const meshes = floorMeshes(house, level);
        for (const site of floorSites) {
          assert.ok(site.floorRadius > 0);
          // Interior rays avoid floating-point ties on a shared triangle vertex.
          for (let i = 0; i < 8; i++) {
            const angle = (i + .19) * Math.PI / 4, radius = site.floorRadius * .999;
            const x = site.world.x + Math.cos(angle) * radius, z = site.world.z + Math.sin(angle) * radius;
            near(floorBelow(meshes, x, site.world.y, z), native.height,
              [prefabId, quarterTurns, site.id, x, site.world.y, z].join(' '));
          }
          for (const {target} of site.links) {
            if (!target.id.startsWith('floor:') || target.level <= level) continue;
            assert.equal(target.level, level + 1);
            stairLinks++;
          }
          if (site.id.split(':').length === 4) splits++;
        }
        const shaft = plan.floors[0].stairs;
        if (level > 0 && shaft) {
          const point = buildingPoint(building, {x: shaft.x + .5, y: shaft.z + 1.25});
          assert.equal(floorBelow(meshes, point.x, native.height, point.y), undefined);
        }
      }
    } finally { view.dispose(); }
  }
  assert.ok(projections > 0 && splits > 0);
  assert.equal(stairLinks, 24);
});

test('both Ashland floor layers use their native metre slabs and elevations', () => {
  const plan = HOUSING_PLANS['ashland-worker'];
  const {buildings: [building]} = compileBuildings([{id: 'ashland', prefabId: plan.id, x: 11, y: 10, quarterTurns: 0}]);
  const {sites} = createCottageTopology(building, (x, y, z, target) => target);
  const view = createNeighborhood(T, library);
  try {
    view.update({buildings: [building]});
    view.root.updateMatrixWorld(true);
    for (const [layer, level] of [['lower', -1], ['upper', 0]]) {
      const floor = sites.filter(site => site.layer === layer), meshes = floorMeshes(view.root.children[0], level);
      assert.equal(floor.length, 42);
      for (const site of floor) {
        near(floorBelow(meshes, building.x + site.x, site.y, building.y + site.z), site.y);
        near(site.floorRadius, .5);
        assert.equal(site.area, 1);
        assert.equal(site.tile, Math.floor(site.z) * plan.width + Math.floor(site.x));
      }
    }
  } finally { view.dispose(); }
});

test('the submitted floor flame splats fit inside a narrow native support in strong wind', async () => {
  const {compileFloorSupport} = await import('../../src/content/housing-floors.js');
  const plan = HOUSING_PLANS['monroe-row'];
  const patch = compileFloorSupport(plan, 1, housingSectionGrid(plan.id)).patches.reduce((a, b) => a.floorRadius < b.floorRadius ? a : b);
  assert.ok(patch.floorRadius < .3);
  const fx = createWallShroud(T, {maxCells: 1, profile: 'house'});
  const camera = new T.PerspectiveCamera(42, 1, .1, 30);
  camera.position.set(patch.x + 2, patch.y + 4, patch.z + 6);
  camera.lookAt(patch.x, patch.y, patch.z);
  camera.updateMatrixWorld(true);
  const floor = {id: 'live-floor', part: 'ground', ...patch, nx: 0, ny: 1, nz: 0, flame: 1, smoke: 0, ignitionTime: 0};
  try {
    for (const time of [.25, .5, 1.23, 2.6]) {
      fx.update({time, cells: [floor], camera, sampleWind: () => [2, .4, -2]});
      const geometry = fx.root.children[0].geometry;
      const {splatCenter: center, splatSigma: sigma, splatDirection: direction} = geometry.attributes;
      assert.ok(geometry.instanceCount >= 6);
      for (let i = 0; i < geometry.instanceCount; i++) {
        const offset = Math.hypot(center.getX(i) - patch.x, center.getZ(i) - patch.z);
        const spread = 2.6 * Math.hypot(sigma.getX(i), sigma.getZ(i),
          sigma.getY(i) * Math.hypot(direction.getX(i), direction.getY(i)));
        assert.ok(offset + spread <= patch.floorRadius + 1e-6);
      }
    }
  } finally { fx.dispose(); }
});
