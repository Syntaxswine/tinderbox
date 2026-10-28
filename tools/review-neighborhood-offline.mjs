// Source-mesh/projection diagnostics only. This never creates a GPU context.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../src/runtime/three.js';
import {HOUSING_SOURCE_COMMIT} from '../src/content/housing-plans.js';
import {createSimulation, SCENARIOS} from '../src/simulation/index.js';
import {scenarioDefinition} from '../src/simulation/fixtures.js';
import {createNeighborhood} from '../src/art/neighborhood.js';
import {createCameraRig} from '../src/runtime/camera.js';
const catalogue = {houses: ['gross', 'hopkins'].flatMap(name => JSON.parse(fs.readFileSync(`assets/art/${name}-housing-v1/houses.json`)).houses)};
const simulation = createSimulation({scenario: 'neighborhood'}), world = simulation.snapshot().world;
const view = createNeighborhood(T, {catalogue, textures: {}}), samples = [];
let models;
try {
  for (const frame of [{width: 1280, height: 800, canvasWidth: 1280, canvasHeight: 494}, {width: 390, height: 844, canvasWidth: 390, canvasHeight: 420}]) {
    const rig = createCameraRig({clientWidth: frame.canvasWidth, clientHeight: frame.canvasHeight}, {setSize() {}}, world);
    for (const [position, player] of Object.entries({street: {x: 20, y: 18}, backTwelve: {x: 7, y: 1.7}, backFifteen: {x: 19, y: 1.7},
      backAshland: {x: 30, y: 1.7}, gapWest: {x: 12.5, y: 7}, gapEast: {x: 25.5, y: 7},
      frontNine: {x: 4.5, y: 27.5}, frontThirteen: {x: 18.5, y: 27.5}, frontMonroe: {x: 28.5, y: 26.9},
      southGapWest: {x: 12.5, y: 35}, southGapEast: {x: 25.5, y: 35}, southBackRoute: {x: 20, y: 45.5}})) {
      rig.update(player); view.update(world, {camera: rig.camera, player, viewport: {width: frame.canvasWidth, height: frame.canvasHeight}});
      const d = view.diagnostics();
      if (d.projection.bearHeightPixels < 45 || (!['street', 'southBackRoute'].includes(position) && !d.occludingBuildingIds.length)) throw Error('Readability fixture failed: ' + position);
      samples.push({frame, position, projection: d.projection, occludingBuildingIds: d.occludingBuildingIds, camera: rig.diagnostics()});
    }
  }
  models = view.diagnostics().models.map(({id, instanceId, sourceMeshCount, sourceTriangleCount, sourceBounds, nativeScale, resources}) =>
    ({id, instanceId, sourceMeshCount, sourceTriangleCount, sourceBounds, nativeScale, resources}));
} finally { view.dispose(); simulation.dispose(); }
const burn = structuredClone(SCENARIOS.neighborhood);
burn.ignitions = scenarioDefinition('neighborhood').buildings.flatMap(building => building.footprints.map(point => ({x: point.x, y: point.y, radius: 60, heat: 4})));
const fire = createSimulation({scenario: burn, config: {fuel: {surfaceBurnRate: .1}, fire: {damagePerSecond: 0}}});
try {
  for (let i = 0; i < 360; i++) fire.advance(1 / 60);
  const spent = fire.snapshot();
  if (spent.world.buildings.some(building => !building.destroyed) || spent.world.obstacles.some(obstacle => obstacle.buildingId)) throw Error('Review burnout fixture failed');
} finally { fire.dispose(); }
const sources = ['src/content/neighborhood.js', 'src/content/buildings.js', 'src/art/neighborhood.js', 'src/runtime/camera.js'].map(file =>
  ({path: file, sha256: createHash('sha256').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex')}));
const report = {task: 'TB-016', kind: 'Offline native source mesh/projection review; no WebGL', sourceCommit: HOUSING_SOURCE_COMMIT,
  rendered: false, sourceHashEncoding: 'UTF-8 with CRLF normalized to LF; immutable intake hashes remain raw bytes', sources,
  models, samples, burnoutFixture: {surfaceBurnRate: .1, worldSeconds: 6, allSixGroupsRemoved: true}, passed: true};
if (process.argv.includes('--write')) {
  fs.writeFileSync('docs/engineering/catalogue-block-two/offline-review.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`PASS: ${models.length} original prefabs, ${samples.length} projection/occlusion samples and six-group burnout; no WebGL rendering.`);
} else console.log(JSON.stringify(report, null, 2));
