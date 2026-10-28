import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from '../../src/runtime/three.js';
import {ASSET_SCALE} from '../../src/content/asset-scale.js';
import {HOUSING_PLANS, HOUSING_SOURCE_COMMIT} from '../../src/content/housing-plans.js';
import {compileBuildings, buildingPoint, localHousingFootprints} from '../../src/content/buildings.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {createSimulation, SCENARIOS} from '../../src/simulation/index.js';
import {freePoint, lineClear, inObstacle} from '../../src/simulation/geometry.js';
import {createNeighborhood, loadNeighborhoodKit} from '../../src/art/neighborhood.js';
import {createCameraRig} from '../../src/runtime/camera.js';
import {createArtScene} from '../../src/art/index.js';

const intake = JSON.parse(fs.readFileSync('assets/art/neighborhood-intake.json'));
const catalogue = {houses: ['gross', 'hopkins'].flatMap(name => JSON.parse(fs.readFileSync(`assets/art/${name}-housing-v1/houses.json`)).houses)};
const library = {catalogue, textures: {}};
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const advance = (simulation, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) simulation.advance(1 / 60); return simulation.snapshot(); };
const intersects = (cell, box) => Math.abs(cell.x - box.x) < (box.width + cell.size) / 2 && Math.abs(cell.y - box.y) < (box.depth + cell.size) / 2;
const footprintCells = snapshot => snapshot.cells.filter(cell => snapshot.world.buildings[0].footprints.some(box => intersects(cell, box)));
const burnScenario = extra => ({id: 'catalogue-burnout', width: 16, height: 16, player: {x: 14, y: 14}, obstacles: [], actors: [],
  buildings: [{id: 'test-house', prefabId: 'hopkins-4-12', x: 2, y: 5, quarterTurns: 0}],
  ignitions: [{x: 6, y: 7, radius: 20, heat: 4}, {x: 6, y: 4, radius: 20, heat: 4}, {x: 7.5, y: 2.67, radius: 20, heat: 4}], ...extra});

test('bounded intake preserves selected source bytes, catalogue identities and original plan values', () => {
  assert.equal(intake.sourceCommit, HOUSING_SOURCE_COMMIT);
  assert.equal(intake.runtimeFiles.length, 16);
  assert.equal(intake.runtimeFiles.filter(file => file.installedPath.endsWith('.png')).length, 6);
  assert.deepEqual(intake.selectedPrefabs, ['hopkins-4-12', 'hopkins-4-15', 'ashland-worker']);
  for (const file of [...intake.runtimeFiles, ...intake.evidenceFiles, ...intake.derivedFiles]) {
    const bytes = fs.readFileSync(file.installedPath);
    assert.equal(bytes.length, file.bytes, file.installedPath);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.installedPath);
  }
  for (const id of intake.selectedPrefabs) {
    const file = intake.runtimeFiles.find(file => file.originalPath.endsWith('/prefabs/' + id + '.json'));
    assert.deepEqual(HOUSING_PLANS[id], JSON.parse(fs.readFileSync(file.installedPath)));
    assert.deepEqual(HOUSING_PLANS[id], catalogue.houses.find(house => house.id === id));
  }
  assert.equal(catalogue.houses.length, 25);
  assert.deepEqual([ASSET_SCALE.tile, ASSET_SCALE.wallHeight, ASSET_SCALE.wallThickness, ASSET_SCALE.doorWidth, ASSET_SCALE.doorHeight,
    ASSET_SCALE.doorThickness, ASSET_SCALE.slab, ASSET_SCALE.floorSpacing], [1, 2, .16, 1, 1.65, .12, .12, 2.12]);
});

test('native descriptors reject unknown, stretched, overlapping and invalid placements', () => {
  const base = {id: 'one', prefabId: 'hopkins-4-12', x: 4, y: 5, quarterTurns: 0};
  for (const invalid of [{...base, id: undefined}, {...base, prefabId: 'constructor'}, {...base, scale: [.8, .8, .8]},
    {...base, quarterTurns: .5}, {...base, quarterTurns: 4}, {...base, x: NaN}]) assert.throws(() => compileBuildings([invalid]), /Invalid/);
  assert.throws(() => compileBuildings([base, {...base, id: 'two'}]), /Overlapping/);
  assert.throws(() => compileBuildings([{...base, x: 0}], {width: 16, height: 16}), /outside/);
  assert.throws(() => scenarioDefinition({...NEIGHBORHOOD_SCENARIO, actors: [{...NEIGHBORHOOD_SCENARIO.actors[0], id: 'hopkins-twelve'}]}), /unique/);
});

test('actual original prefab foundations, porch decks and stairs match colliders through all quarter turns (offline meshes)', () => {
  const before = JSON.stringify(catalogue);
  for (const prefabId of intake.selectedPrefabs) for (let quarterTurns = 0; quarterTurns < 4; quarterTurns++) {
    const {buildings} = compileBuildings([{id: 'review-house', prefabId, x: 15, y: 15, quarterTurns}]);
    const view = createNeighborhood(T, library);
    try {
      view.update({buildings}); view.root.updateMatrixWorld(true);
      const model = view.root.children[0], selected = {foundation: [], porch: [], stairs: []};
      assert.deepEqual(model.scale.toArray(), [1, 1, 1]);
      let lowestRim = Infinity;
      model.traverse(object => { if (object.name === 'Floor slab rim') lowestRim = Math.min(lowestRim, object.getWorldPosition(new T.Vector3()).y); });
      model.traverse(object => {
        if (!object.isMesh) return;
        const positions = object.geometry.attributes.position;
        for (const value of positions.array) assert.ok(Number.isFinite(value), prefabId + ' vertex');
        assert.deepEqual(object.scale.toArray(), [1, 1, 1]);
        if (object.name === 'Floor slab rim' && Math.abs(object.getWorldPosition(new T.Vector3()).y - lowestRim) < 1e-6) selected.foundation.push(object);
        if (object.name === 'Porch deck') selected.porch.push(object);
        if (['New entry stair', 'Entry stair rail'].includes(object.name)) selected.stairs.push(object);
      });
      for (const role of ['foundation', 'porch', 'stairs']) {
        assert.ok(selected[role].length, prefabId + ' ' + role);
        const bounds = new T.Box3(); for (const mesh of selected[role]) bounds.union(new T.Box3().setFromObject(mesh));
        const collider = buildings[0].footprints.find(box => box.role === role);
        const expected = [collider.x - collider.width / 2, collider.x + collider.width / 2, collider.y - collider.depth / 2, collider.y + collider.depth / 2];
        const actual = [bounds.min.x, bounds.max.x, bounds.min.z, bounds.max.z];
        actual.forEach((value, index) => near(value, expected[index], role === 'stairs' ? .03 : 1e-5));
        assert.ok(actual[0] >= expected[0] - 1e-5 && actual[1] <= expected[1] + 1e-5 && actual[2] >= expected[2] - 1e-5 && actual[3] <= expected[3] + 1e-5);
      }
      assert.equal(view.diagnostics().models[0].props, 0);
      assert.equal(view.diagnostics().models[0].mode, 'exterior');
    } finally { view.dispose(); view.dispose(); }
  }
  assert.equal(JSON.stringify(catalogue), before);
});

test('native bear clears street/gaps and is blocked by foundations, porches and narrow closed entries', () => {
  const simulation = createSimulation({scenario: 'neighborhood'});
  try {
    const snapshot = simulation.snapshot(), world = snapshot.world;
    assert.equal(snapshot.player.radius, .56);
    for (const point of [{x: 12.5, y: 7}, {x: 25.5, y: 7}, {x: 20, y: 18}, {x: 5.5, y: 13.3}, {x: 27.5, y: 14.3}]) assert.ok(freePoint(point, .56, world, world.obstacles), JSON.stringify(point));
    for (const building of world.buildings) {
      assert.deepEqual(building.door, {width: 1, height: 1.65, state: 'closed', traversable: false});
      for (const box of building.footprints) assert.equal(freePoint(box, .56, world, world.obstacles), false);
      const entry = HOUSING_PLANS[building.prefabId].floors[0].entry;
      const point = buildingPoint(building, {x: (entry[0] + entry[2]) / 2, y: (entry[1] + entry[3]) / 2});
      assert.equal(freePoint(point, .56, world, world.obstacles), false);
    }
    assert.equal(lineClear({x: 2, y: 6}, {x: 12, y: 6}, world.obstacles), false);
    assert.equal(lineClear({x: 2, y: 6}, {x: 3, y: 6, size: .5}, world.obstacles), true);
    assert.ok(freePoint({x: 24.2, y: 8}, .01, world, world.obstacles), 'elevated gambrel eave did not become a filled ground box');
  } finally { simulation.dispose(); }
});

test('snapshot building descriptors are detached and reset keeps the same native source placement', () => {
  const simulation = createSimulation({scenario: 'neighborhood'});
  try {
    const original = simulation.snapshot().world.buildings;
    const changed = simulation.snapshot(); changed.world.buildings[0].footprints[0].width = 999;
    changed.world.buildings[0].meshScale[0] = 5; changed.world.buildings[0].source.url = 'changed';
    assert.deepEqual(simulation.snapshot().world.buildings, original);
    simulation.dispatch({type: 'reset'}); simulation.advance(1 / 60);
    assert.deepEqual(simulation.snapshot().world.buildings, original);
  } finally { simulation.dispose(); }
});

test('powder street pouring uses accepted distance while civilians and fire use world time', () => {
  const ordinary = createSimulation({scenario: 'neighborhood', config: {input: {cameraRelative: false}}});
  const powder = createSimulation({scenario: 'neighborhood', config: {input: {cameraRelative: false}}});
  try {
    for (const simulation of [ordinary, powder]) {
      simulation.dispatch({type: 'primary', pressed: true}); simulation.dispatch({type: 'move', x: 1, y: 0});
    }
    powder.dispatch({type: 'drug', drug: 'powder'});
    const normal = advance(ordinary, 1), fast = advance(powder, 1);
    near(normal.player.travelled, 3); near(fast.player.travelled, 4.5);
    near(normal.diagnostics.fuel.pouredFuel, .24); near(fast.diagnostics.fuel.pouredFuel, .36);
    near(fast.clocks.player, 1.5); near(fast.clocks.world, .35);
    near(fast.actors[0].travelled, normal.actors[0].travelled * .35);
    for (const cell of fast.cells.filter(cell => cell.depositedFuel > 0)) assert.ok(cell.y > 16 && !fast.world.obstacles.some(box => inObstacle(cell, box)));
    powder.dispatch({type: 'pause', paused: true}); powder.advance(1 / 60);
    const paused = powder.snapshot(); advance(powder, 1); const later = powder.snapshot();
    assert.deepEqual(later.clocks, paused.clocks); assert.deepEqual(later.cells, paused.cells); assert.deepEqual(later.world.buildings, paused.world.buildings);
  } finally { ordinary.dispose(); powder.dispose(); }
});

test('pouring stops consuming stock when the native bear reaches the entry stairs', () => {
  const scenario = structuredClone(NEIGHBORHOOD_SCENARIO); scenario.player = {x: 5.5, y: 13.5, tool: 'jerry-can'};
  const simulation = createSimulation({scenario, config: {input: {cameraRelative: false}}});
  try {
    simulation.dispatch({type: 'primary', pressed: true}); simulation.dispatch({type: 'move', x: 0, y: -1});
    const stopped = advance(simulation, .5), later = advance(simulation, 1);
    assert.ok(stopped.player.travelled > .1 && stopped.player.travelled < .3);
    near(later.player.travelled, stopped.player.travelled); near(later.player.inventory.gas, stopped.player.inventory.gas);
    near(later.diagnostics.fuel.pouredFuel, later.player.travelled * .08);
  } finally { simulation.dispose(); }
});

test('partially spent ground cells retain every collider; group burnout removes the prefab atomically once', () => {
  const simulation = createSimulation({scenario: burnScenario(), config: {fuel: {surfaceBurnRate: 1}, fire: {damagePerSecond: 0}}});
  const view = createNeighborhood(T, library);
  try {
    const partial = advance(simulation, .15), building = partial.world.buildings[0], cells = footprintCells(partial);
    assert.ok(cells.some(cell => cell.phase === 'spent')); assert.ok(cells.some(cell => cell.surfaceFuel > 0));
    assert.ok(building.burnedFraction > 0 && building.burnedFraction < 1); assert.equal(building.destroyed, false);
    assert.deepEqual(partial.world.obstacles.map(box => box.id).sort(), [...building.colliderIds].sort());
    view.update(partial.world); assert.equal(view.diagnostics().active, 1);
    const charMaterial = view.root.children[0].getObjectByName('New raised plinth').material;
    const charColor = charMaterial.color.clone();
    view.update(partial.world); assert.equal(view.diagnostics().builds, 1); assert.ok(charMaterial.color.equals(charColor));
    const spent = advance(simulation, 3);
    assert.equal(spent.world.buildings[0].destroyed, true); assert.equal(spent.world.obstacles.length, 0);
    assert.equal(spent.events.filter(event => event.type === 'building-burnout').length, 1);
    view.update(spent.world); assert.equal(view.diagnostics().active, 0); assert.equal(view.root.children.length, 0);
    advance(simulation, 1); assert.equal(simulation.snapshot().events.filter(event => event.type === 'building-burnout').length, 1);
    simulation.dispatch({type: 'reset'}); const reset = simulation.advance(1 / 60); view.update(reset.world);
    assert.equal(reset.world.buildings[0].destroyed, false); assert.equal(view.diagnostics().active, 1);
  } finally { view.dispose(); view.dispose(); simulation.dispose(); }
});

test('deposited fuel keeps the whole charred building group solid until it too is spent', () => {
  const simulation = createSimulation({scenario: burnScenario({fuelLines: [{from: {x: 5, y: 7}, to: {x: 7, y: 7}, litresPerMetre: .1}]}),
    config: {fuel: {surfaceBurnRate: 10}, fire: {damagePerSecond: 0}}});
  try {
    const charred = advance(simulation, 1);
    near(charred.world.buildings[0].burnedFraction, 1); assert.equal(charred.world.buildings[0].destroyed, false);
    assert.equal(charred.world.obstacles.length, 3); assert.ok(footprintCells(charred).some(cell => cell.depositedFuel > 0));
    assert.equal(advance(simulation, 6).world.buildings[0].destroyed, true);
  } finally { simulation.dispose(); }
});

test('actual source geometry resources retire once during repeated scene rebuilds (offline API)', () => {
  const simulation = createSimulation({scenario: 'neighborhood'}), view = createNeighborhood(T, library);
  let disposedGeometry = 0, firstGeometry;
  try {
    const world = simulation.snapshot().world; view.update(world); assert.equal(view.diagnostics().active, 3);
    view.root.traverse(object => { if (!firstGeometry && object.isMesh) firstGeometry = object.geometry; });
    firstGeometry.addEventListener('dispose', () => disposedGeometry++);
    for (let i = 0; i < 3; i++) { view.update({buildings: []}); view.update(world); }
    assert.equal(disposedGeometry, 1); assert.equal(view.diagnostics().active, 3); assert.equal(view.diagnostics().builds, 12);
    view.dispose(); view.dispose(); assert.equal(view.root.children.length, 0); assert.equal(view.diagnostics().active, 0);
  } finally { view.dispose(); simulation.dispose(); }
});

test('catalogue loader shares six textures and releases them on partial source failure', async () => {
  const oldFetch = globalThis.fetch, oldLoad = T.TextureLoader.prototype.loadAsync;
  let releases = 0, loads = 0;
  T.TextureLoader.prototype.loadAsync = async () => { loads++; const texture = new T.Texture(); texture.addEventListener('dispose', () => releases++); return texture; };
  globalThis.fetch = async url => ({ok: !String(url).includes('hopkins'), status: 404, json: async () => ({houses: catalogue.houses.filter(house => !house.id.startsWith('hopkins-'))})});
  try { await assert.rejects(loadNeighborhoodKit(T), /Hopkins/); assert.equal(loads, 6); assert.equal(releases, 6); }
  finally { globalThis.fetch = oldFetch; T.TextureLoader.prototype.loadAsync = oldLoad; }
});

test('desktop and phone follow camera preserve native bear scale and ground aiming, with legacy overview intact (offline projection)', () => {
  const world = scenarioDefinition('neighborhood'), player = {x: 20, y: 18};
  // Include the actual production canvas after existing HUD/header reservations,
  // as well as full-frame diagnostics. The phone canvas is 390 x 420, not 844.
  for (const [width, height] of [[1280, 494], [390, 420], [1280, 800], [390, 844]]) {
    const container = {clientWidth: width, clientHeight: height};
    const renderer = {setSize() {}, domElement: {getBoundingClientRect: () => ({left: 0, top: 0, width, height})}};
    const rig = createCameraRig(container, renderer, world); rig.update(player);
    const aim = rig.screenToWorld(width / 2, height / 2); near(aim.x, player.x); near(aim.y, player.y);
    const foot = new T.Vector3(player.x, 0, player.y).project(rig.camera), head = new T.Vector3(player.x, 1.67, player.y).project(rig.camera);
    assert.ok(Math.abs(head.y - foot.y) * height / 2 > 45, 'native bear must be readable without rescaling');
    rig.update({x: 26, y: 18}); near(rig.screenToWorld(width / 2, height / 2).x, 26);
    rig.magnify(1.5); near(rig.screenToWorld(width / 2, height / 2).x, 26);
    assert.equal(rig.diagnostics().followPlayer, true);
    const legacy = createCameraRig(container, renderer, SCENARIOS.exposition); legacy.update(player);
    assert.deepEqual(legacy.diagnostics().target, [10, 0, 8]); assert.equal(legacy.diagnostics().followPlayer, false);
  }
});

test('source-bounds occlusion fades houses behind the bear and in gaps, restores them at the street, and never changes collision', () => {
  const simulation = createSimulation({scenario: 'neighborhood'}), view = createNeighborhood(T, library);
  const world = simulation.snapshot().world, before = JSON.stringify(world);
  const container = {clientWidth: 390, clientHeight: 844}, renderer = {setSize() {}};
  const rig = createCameraRig(container, renderer, world);
  try {
    for (const player of [{x: 7, y: 1.7}, {x: 19, y: 1.7}, {x: 30, y: 1.7}, {x: 12.5, y: 7}, {x: 25.5, y: 7}]) {
      rig.update(player); view.update(world, {camera: rig.camera, player, viewport: {width: 390, height: 844}});
      const diagnostics = view.diagnostics();
      assert.ok(diagnostics.occludingBuildingIds.length > 0, JSON.stringify(player));
      assert.ok(diagnostics.models.some(model => model.opacityScale === .18));
      assert.ok(diagnostics.projection.bearHeightPixels > 45);
      for (const house of view.root.children) if (diagnostics.occludingBuildingIds.includes(house.userData.buildingId)) {
        house.traverse(mesh => { if (mesh.isMesh) for (const material of [mesh.material].flat()) {
          near(material.opacity, .18); assert.equal(material.transparent, true); assert.equal(material.depthWrite, false);
        } });
      }
    }
    const player = {x: 20, y: 18}; rig.update(player); view.update(world, {camera: rig.camera, player});
    assert.deepEqual(view.diagnostics().occludingBuildingIds, []);
    view.root.traverse(mesh => { if (mesh.isMesh) for (const material of [mesh.material].flat()) {
      near(material.opacity, 1); assert.equal(material.transparent, false); assert.equal(material.depthWrite, true);
    } });
    assert.equal(JSON.stringify(world), before); assert.equal(view.diagnostics().builds, 3);
  } finally { view.dispose(); simulation.dispose(); }
});

test('production art composes the actual three houses, painted native bear and civilians, without generic duplicate boxes (renderer API fixture; no WebGL)', async () => {
  const oldFetch = globalThis.fetch, oldLoad = T.TextureLoader.prototype.loadAsync, oldDocument = globalThis.document;
  const renderer = Object.create(T.WebGLRenderer.prototype), rendererState = {target: null, projections: 0, disposed: 0};
  Object.defineProperty(renderer, 'outputColorSpace', {value: T.SRGBColorSpace, writable: true});
  Object.assign(renderer, {toneMapping: T.ACESFilmicToneMapping, capabilities: {getMaxAnisotropy: () => 8},
    getRenderTarget: () => rendererState.target, setRenderTarget: target => { rendererState.target = target; },
    getClearColor: color => color.set('#203028'), getClearAlpha: () => 1, getViewport: value => value.set(0, 0, 1280, 494),
    getScissor: value => value.set(0, 0, 1280, 494), getScissorTest: () => false, getPixelRatio: () => 1,
    setClearColor() {}, setViewport() {}, setScissor() {}, setScissorTest() {}, clear() {},
    render(scene, camera) { assert.ok(camera instanceof T.OrthographicCamera); rendererState.projections++; },
    dispose() { rendererState.disposed++; }});
  const context = new Proxy({getImageData: () => ({data: new Uint8ClampedArray(64).fill(220)})}, {get: (target, key) => key in target ? target[key] : () => {}});
  globalThis.document = {createElement: () => ({getContext: () => context})};
  globalThis.fetch = async resource => ({ok: true, json: async () => JSON.parse(fs.readFileSync(fileURLToPath(new URL(resource))))});
  const originals = [];
  T.TextureLoader.prototype.loadAsync = async () => { const texture = new T.Texture({width: 4, height: 4}); originals.push(texture); return texture; };
  const simulation = createSimulation({scenario: 'neighborhood'}), scene = new T.Scene();
  let art, geometryReleases = 0, originalReleases = 0;
  try {
    const snapshot = simulation.snapshot(), before = JSON.stringify(snapshot);
    art = await createArtScene({THREE: T, renderer, scene, world: snapshot.world});
    const rig = createCameraRig({clientWidth: 390, clientHeight: 420}, {setSize() {}}, snapshot.world); rig.update(snapshot.player);
    art.update(snapshot, {camera: rig.camera, viewport: {width: 390, height: 420}});
    const diagnostics = art.diagnostics();
    assert.equal(diagnostics.housing.active, 3); assert.equal(diagnostics.bearProtagonist.species, 'bear');
    assert.equal(diagnostics.bearProtagonist.paint, 'native-normal-projection');
    assert.deepEqual(diagnostics.civilianActors.map(actor => actor.species).sort(), ['goat', 'horse']);
    assert.ok(diagnostics.housing.projection.bearHeightPixels > 45); assert.equal(rendererState.projections, 12);
    const generic = scene.getObjectByName('Snapshot exterior');
    assert.deepEqual(generic.children.filter(child => child.name.startsWith('obstacle:')).map(child => child.name).sort(), ['obstacle:street-drum-east', 'obstacle:street-drum-west']);
    assert.equal(JSON.stringify(snapshot), before);
    for (const tool of ['matches', 'jerry-can', 'molotov', 'torch', 'flamethrower']) {
      simulation.dispatch({type: 'select-tool', tool}); const next = simulation.advance(1 / 60); art.update(next, {camera: rig.camera});
      assert.equal(art.diagnostics().bearProtagonist.selectedTool, tool); assert.ok(art.diagnostics().bearProtagonist.finiteAnchors);
    }
    const geometry = scene.getObjectByName('Catalogue neighborhood').children[0].getObjectByName('New raised plinth').geometry;
    geometry.addEventListener('dispose', () => geometryReleases++);
    for (const texture of originals) texture.addEventListener('dispose', () => originalReleases++);
    art.dispose(); art.dispose(); assert.equal(geometryReleases, 1); assert.equal(originalReleases, originals.length);
    assert.equal(scene.children.length, 0); assert.equal(rendererState.disposed, 0); assert.equal(rendererState.target, null);
  } finally {
    art?.dispose(); simulation.dispose(); globalThis.fetch = oldFetch; T.TextureLoader.prototype.loadAsync = oldLoad;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  }
});
