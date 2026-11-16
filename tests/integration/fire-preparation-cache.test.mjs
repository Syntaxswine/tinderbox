import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../src/runtime/three.js';
import {createCatalogueStructureArt} from '../../art/source/catalogue-modular/thermal-art.js';
import {createWallShroud} from '../../art/source/furnished-house/shroud.js';
import {createSupportGeometryCache} from '../../art/source/furnished-house/visibility.js';
import {createOwnedPublicationGeometry,isOwnedPublicationGeometry} from '../../src/reuse/publication-geometry.js';

// Small presentation-only fixtures, not gameplay trajectories or timing evidence.
// The shared coder session supplies actual production motion and visual acceptance.
const repository = new URL('../../', import.meta.url);
const referenceRoot = new URL('art/source/catalogue-modular/controls/fire-half-cost/reference/', repository);
const reference = JSON.parse(readFileSync(new URL('reference.json', referenceRoot), 'utf8'));
const records = new Map(reference.files.map(record => [new URL(record.path, repository).href, record]));
const modules = new Map();
function referenceModule(url) {
  if (modules.has(url)) return modules.get(url);
  const record = records.get(url);
  if (!record) return url;
  const bytes = readFileSync(new URL(record.file, referenceRoot));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, record.path + ' reference bytes');
  const source = bytes.toString('utf8').replace(/import\.meta\.url/g, JSON.stringify(url))
    .replace(/from (['"])([^'"]+)\1/g, (_, quote, specifier) =>
      'from ' + JSON.stringify(referenceModule(new URL(specifier, url).href)));
  const result = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  modules.set(url, result);
  return result;
}
const {createCatalogueStructureArt: createReference} = await import(referenceModule(
  new URL('art/source/catalogue-modular/thermal-art.js', repository).href));

const copy = value => structuredClone(value);
const rectangle = (x0, x1, z0, z1, y = .12) => [
  [[x0, y, z0], [x1, y, z0], [x1, y, z1]],
  [[x0, y, z0], [x1, y, z1], [x0, y, z1]],
];
const bounds = triangles => {
  const points = triangles.flat();
  return {min: [0, 1, 2].map(i => Math.min(...points.map(p => p[i]))),
    max: [0, 1, 2].map(i => Math.max(...points.map(p => p[i])))};
};
function fixture() {
  const surface = (id, kind, triangles, normal, level = 0) => ({
    id, kind, triangles, normal, level, thickness: kind === 'wall' ? .16 : .12,
    material: 'timber', fuelClass: 'timber', bounds: bounds(triangles), sourceMeshBindings: [],
  });
  const surfaces = [
    surface('floor-a', 'floor', rectangle(0, 1, 0, 1), [0, 1, 0]),
    surface('floor-b', 'floor', rectangle(1, 2, 0, 1), [0, 1, 0]),
    surface('upper', 'floor', rectangle(0, 1, 0, 1, 2.24), [0, 1, 0], 1),
    surface('wall', 'wall', [[[0, .12, 0], [0, 2.12, 0], [0, 2.12, 1]],
      [[0, .12, 0], [0, 2.12, 1], [0, .12, 1]]], [1, 0, 0]),
    surface('roof', 'roof', [[[0, 3.12, 0], [1, 3.87, 0], [1, 3.87, 1]],
      [[0, 3.12, 0], [1, 3.87, 1], [0, 3.12, 1]]], [-.6, .8, 0], 1),
    surface('door', 'door', [[[0, .12, 2], [1, .12, 2], [1, 1.77, 2]],
      [[0, .12, 2], [1, 1.77, 2], [0, 1.77, 2]]], [0, 0, 1]),
  ];
  return {version: 1, prefabId: 'fire-preparation-control', buildingId: 'control',
    module: [1, 1, 2.12], gridOrigin: [0, 0, 0], thermalCell: [.5, .5, .5],
    levels: [{index: 0, floorY: .12, wallTop: 2.12, floorTriangles: rectangle(0, 2, 0, 1)},
      {index: 1, floorY: 2.24, wallTop: 4.24, floorTriangles: rectangle(0, 1, 0, 1, 2.24)}],
    surfaces, items: [], furnitureParts: [], stores: [], sourceMeshes: [],
    openings: [{id: 'door', surfaceId: 'door', kind: 'door', level: 0,
      sourceMeshBindings: [], pivot: [0, .12, 2], initialOpenFraction: 0, maxOpenAngle: Math.PI / 2}],
    render: {geometry: [], materials: [{id: 'oak', name: 'Oak boards', color: 0x8a7251, roughness: 1, metalness: 0}]}};
}
function camera(x = 6, y = 6, z = -7, target = [1, 1.7, 1]) {
  const result = new T.OrthographicCamera(-5, 5, 5, -5, .1, 100);
  result.position.set(x, y, z); result.lookAt(...target); result.updateMatrixWorld(true);
  return result;
}
const wind = (x, y, z, out) => {out.set([.8, 0, -.2]); return out;};
const view = {mode: 'exterior', camera: camera(), sampleWind: wind,
  windMetadata: {kind: 'ambient-control', speed: Math.hypot(.8, -.2), direction: [1, 0, 0]}};
function sample(data, surfaceId, extra = {}) {
  const s = data.surfaces.find(s => s.id === surfaceId);
  const p = s.bounds.min.map((v, i) => (v + s.bounds.max[i]) / 2);
  return {id: 'fuel:' + surfaceId, sourceSurfaceId: surfaceId, part: s.kind,
    x: p[0], y: p[1], z: p[2], nx: s.normal[0], ny: s.normal[1], nz: s.normal[2],
    area: .25, flame: .9, smoke: .7, ignitionTime: 0,
    ...(s.kind === 'floor' ? {floorFootprint: copy(s.triangles)} : {}), ...extra};
}
function assertPreparationEntries(art, limit, label) {
  const stats = art.diagnostics().preparationCache;
  assert.ok(stats, label + ' needs explicit preparation-cache ownership counters');
  assert.ok(Number.isInteger(stats.effectBoundsEntries) && stats.effectBoundsEntries >= 0 && stats.effectBoundsEntries <= limit * 2, label + ' two envelope entries per live source');
  assert.ok(Number.isInteger(stats.immutableEntries) && stats.immutableEntries >= 0 && stats.immutableEntries <= limit * 4, label + ' active immutable geometry retention');
  for (const key of ['sourceEntries', 'groupEntries', 'phaseEntries']) {
    assert.ok(Number.isInteger(stats[key]) && stats[key] >= 0 && stats[key] <= limit,
      label + ' ' + key + ': ' + stats[key] + ' exceeds live-source bound ' + limit);
  }
}
const frame = (fireSamples, changes = {}) => ({version: 1, revision: 10, worldTime: 1,
  full: false, boundaries: [], supports: [], items: [], parts: [], falls: [], rubble: [],
  tombstones: [], events: [], occupancy: [], fireSamples, ...changes});
function capture(art) {
  const inspect = art.inspect(), diagnostics = art.diagnostics(), buffers = [];
  art.root.traverse(object => {
    const geometry = object.geometry, attribute = geometry?.attributes.splatCenter;
    if (attribute) buffers.push({visible: object.visible, count: geometry.instanceCount,
      stride: attribute.data.stride,
      values: Array.from(attribute.data.array.subarray(0, geometry.instanceCount * attribute.data.stride))});
  });
  return {inspect, buffers, door: art.root.getObjectByName('door').quaternion.toArray(),
    counts: Object.fromEntries(['missingSamples', 'representedSamples', 'visibleSamples', 'fireSamples',
      'retiredPatches', 'charredIntactPatches'].map(key => [key, diagnostics[key]])),
    effects: diagnostics.effects, lights: diagnostics.actualLights};
}
async function paired(body) {
  const data = fixture(), before = JSON.stringify(data);
  const candidate = await createCatalogueStructureArt(T, {data: copy(data)});
  const uncached = await createReference(T, {data: copy(data)});
  const compare = (label, input, settings = view) => {
    const inputBefore = JSON.stringify(input);
    candidate.update(input, settings); uncached.update(input, settings);
    const result = capture(candidate);
    assert.deepEqual(result, capture(uncached), label);
    assert.equal(JSON.stringify(input), inputBefore, label + ' mutated its input');
    return result;
  };
  try {await body({data, candidate, uncached, compare});}
  finally {
    candidate.dispose(); uncached.dispose(); candidate.dispose();
    assert.equal(JSON.stringify(data), before, 'fixture source mutated');
    assert.deepEqual(candidate.diagnostics().resources, {geometries: 0, materials: 0, textures: 0});
    assertPreparationEntries(candidate, 0, 'disposed cache');
  }
}

test('M27 reference closure preserves all five exact uncached modules', () => {
  assert.equal(reference.commit, '55cff1109d57842e169c5dcef04bfad7b0dd1f04');
  assert.equal(modules.size, 5);
});

test('advancing and cloned records preserve exact anchors, envelopes, splats and packed submission', async () => {
  await paired(({data, compare}) => {
    const samples = ['floor-a', 'floor-b', 'wall', 'roof', 'upper', 'door'].map(id => sample(data, id));
    let previous;
    for (let step = 0; step < 5; step++) {
      const result = compare('advancing native-style delta ' + step,
        frame(copy(samples), {worldTime: 1 + step / 30, revision: 10 + step}));
      assert.ok(result.buffers.some(buffer => buffer.count > 0));
      if (previous) assert.notDeepEqual(result.inspect.splats, previous.inspect.splats, 'animation must keep advancing');
      previous = result;
    }
  });
});

test('reused records detect coordinates, normals, footprint content and same-ID active neighbors', async () => {
  await paired(({data, compare}) => {
    const a = sample(data, 'floor-a'), b = sample(data, 'floor-b'), input = frame([a, b]);
    const first = compare('initial joined floor', input);
    b.flame = 0; input.revision++;
    const unjoined = compare('same neighbor ID stops flaming', input);
    assert.notDeepEqual(unjoined.inspect.emitters[0], first.inspect.emitters[0]);
    b.flame = .9; input.revision++;
    assert.deepEqual(compare('same neighbor ID resumes flaming', input), first);
    a.x = .4; input.revision++;
    assert.notDeepEqual(compare('source coordinate changed in place', input).inspect.emitters[0], first.inspect.emitters[0]);
    a.nx = .6; a.ny = .8; input.revision++;
    compare('normal changed in place', input);
    a.nx = 0; a.ny = 1;
    for (const triangle of a.floorFootprint) for (const p of triangle) if (p[0] === 1) p[0] = .75;
    input.revision++;
    compare('footprint coordinates changed under same array identity', input);
    a.floorFootprint = copy(a.floorFootprint); input.revision++;
    compare('equal footprint cloned to a different array', input);
    input.fireSamples.reverse(); input.revision++;
    compare('source order reversed', input);
    input.fireSamples = [input.fireSamples[0]]; input.revision++;
    compare('source removed', input);
  });
});

test('camera, cutaway and wind remain live at fixed and advancing world times', async () => {
  await paired(({data, compare}) => {
    const input = frame(['floor-a', 'wall', 'upper', 'roof'].map(id => sample(data, id)));
    const initial = compare('normal camera', input);
    const away = camera(1000, 6, -7, [1000, 1.7, 1]);
    const hidden = compare('camera leaves all sources', input, {...view, camera: away});
    assert.equal(hidden.counts.visibleSamples, 0);
    assert.deepEqual(compare('camera returns without a cold start', input), initial);
    const cut = compare('lower-level cutaway', input, {...view, mode: 'cutaway', level: 0});
    assert.ok(cut.inspect.emitters.filter(q => q.flames).length < initial.inspect.emitters.filter(q => q.flames).length);
    compare('upper-level cutaway', input, {...view, mode: 'cutaway', level: 1});
    const reverseWind = (x, y, z, out) => {out.set([-.8, .1, .2]); return out;};
    const changed = compare('wind changes while time is fixed', input, {...view, sampleWind: reverseWind});
    assert.notDeepEqual(changed.inspect.splats, initial.inspect.splats);
    input.worldTime += 1 / 30; input.revision++;
    compare('time resumes after camera and wind changes', input);
    for (let mask = 0; mask < 8; mask++) compare('effect mask ' + mask, input,
      {...view, effects: {flames: !!(mask & 1), smoke: !!(mask & 2), lighting: !!(mask & 4)}});
  });
});

test('door geometry, airborne fuel, landing and collapsed support invalidate preparation', async () => {
  await paired(({data, compare}) => {
    const leaf = data.surfaces.find(s => s.id === 'door');
    const door = sample(data, 'door', {id: 'fuel:door-runtime', boundaryId: 'door-runtime'});
    const closed = {id: 'door-runtime', sourceSurfaceId: 'door', intact: true, openFraction: 0,
      triangles: copy(leaf.triangles)};
    const initial = compare('closed actual leaf', frame([door], {boundaries: [closed]}));
    const turned = copy(closed); turned.openFraction = 1;
    for (const triangle of turned.triangles) for (const p of triangle) {
      const x = p[0], z = p[2] - 2; p[0] = z; p[2] = 2 - x;
    }
    door.x = 0; door.z = 1.5; door.nx = 1; door.nz = 0;
    const opened = compare('door pose and triangles change together', frame([door], {revision: 11, boundaries: [turned]}));
    assert.notDeepEqual(opened.door, initial.door);
    const floor = sample(data, 'floor-a'), shape = data.surfaces.find(s => s.id === 'floor-a');
    const flight = {id: 'flight-a', fuelIds: [floor.id], position: [.5, 1.3, .5],
      origin: [.5, .12, .5], quaternion: [0, 0, 0, 1], geometry: {...copy(shape)}};
    const airborne = {...floor, fallId: flight.id, y: 1.3};
    let result = compare('fuel starts falling', frame([airborne], {revision: 12, falls: [flight]}));
    assert.equal(result.inspect.emitters[0].supportOrigin, 'airborne');
    airborne.y = .7; flight.position[1] = .7;
    compare('same flight and sample records move', frame([airborne], {revision: 13, falls: [flight]}));
    const rubble = {id: 'rubble-a', fuelIds: [floor.id], floorFootprint: rectangle(.1, .9, .1, .9),
      heatFraction: .7, phase: 'burning', remainingFraction: .6};
    result = compare('fuel lands on an authoritative footprint', frame([{...floor, rubbleId: rubble.id}],
      {revision: 14, falls: [], completeCollections: ['falls'], rubble: [rubble]}));
    assert.equal(result.inspect.emitters[0].supportOrigin, 'landed');
    result = compare('original support collapses', frame([sample(data, 'floor-b')],
      {revision: 15, boundaries: [{id: 'retired-floor-b', sourceSurfaceId: 'floor-b', intact: false}]}));
    assert.equal(result.counts.missingSamples, 1);
  });
});

test('rewind, full reset, malformed footprints, repeated ownership and disposal stay bounded', async () => {
  await paired(({data, candidate, compare}) => {
    const a = sample(data, 'floor-a'), input = frame([a]);
    const initial = compare('initial state', input);
    for (let step = 1; step <= 24; step++) {
      input.revision++; input.worldTime += 1 / 30;
      a.floorFootprint = rectangle(0, 1 - (step % 4) * .025, 0, 1);
      a.x = .45 + (step % 3) * .025;
      a.id = 'fuel:rotating-owner-' + (step % 4);
      const neighbor = sample(data, 'floor-b', {flame: step % 2 ? .9 : 0});
      input.fireSamples = step % 3 ? [a, neighbor] : [a];
      compare('bounded positions, membership and footprints ' + step, input);
      assertPreparationEntries(candidate, input.fireSamples.length, 'update ' + step);
    }
    compare('rewind and full reset', frame([sample(data, 'floor-a')], {revision: 1, worldTime: .4, full: true}));
    assert.deepEqual(compare('restored after reset', frame([sample(data, 'floor-a')])), initial);
    const bad = sample(data, 'floor-a'); bad.floorFootprint[0][0][0] = NaN;
    assert.equal(compare('invalid footprint cannot become a cache hit', frame([bad], {revision: 11})).counts.missingSamples, 1);
    compare('empty active set releases connected preparation', frame([], {revision: 12}));
    assertPreparationEntries(candidate, 0, 'empty current source set');
    compare('full reset without sources clears every preparation owner',
      frame([], {revision: 0, worldTime: 0, full: true}));
    assertPreparationEntries(candidate, 0, 'full reset');
    assert.ok(candidate.diagnostics().resources.geometries > 0);
  });
});


test('shared wall and house shrouds retain exact animation and active-only phase ownership', async () => {
  const {createWallShroud: createReferenceShroud} = await import(referenceModule(
    new URL('art/source/furnished-house/shroud.js', repository).href));
  for (const profile of ['wall', 'house']) {
    const a = createWallShroud(T, {profile, maxCells: 2});
    const b = createReferenceShroud(T, {profile, maxCells: 2});
    const cell = {id: 'reused-wall-owner', x: 0, y: 1, z: 0, nx: 1, ny: 0, nz: 0,
      part: 'walls', flame: .9, smoke: .7, ignitionTime: 0, area: .25,
      tangentRadius: .3, supportBounds: {min: [0, .12, -.5], max: [0, 2.12, .5]}};
    try {
      for (let step = 0; step < 6; step++) {
        const cells = [{...cell, id: 'owner-' + step % 3, x: step * .015}];
        const input = {time: .3 + step * .15, cells, camera: view.camera, sampleWind: wind};
        a.root.visible = b.root.visible = true; a.update(input); b.update(input);
        assert.deepEqual(a.inspect(), b.inspect(), profile + ' animated splats ' + step);
        assert.equal(a.stats().flameSplats, b.stats().flameSplats);
        assert.equal(a.stats().smokeSplats, b.stats().smokeSplats);
        assert.equal(a.stats().phaseEntries, cells.length, 'old stable IDs must be pruned');
      }
      a.clear(); assert.equal(a.stats().phaseEntries, 0);
      a.update({time: 2, cells: [], camera: view.camera});
      assert.equal(a.stats().phaseEntries, 0);
    } finally {a.dispose(); b.dispose();}
    assert.equal(a.stats().phaseEntries, 0);
  }
});


test('empty runtime geometry preserves the exact Catalogue reference fallback/rejection behavior', async () => {
  await paired(({data, compare}) => {
    const floor = sample(data, 'floor-a', {boundaryId: 'empty-floor'});
    const emptyFloor = {id: 'empty-floor', sourceSurfaceId: 'floor-a', triangles: [], intact: true};
    // The frozen Catalogue reference checks well-formed runtime triangles first,
    // then requires a nonempty effective support footprint. A floor's explicit
    // valid footprint remains usable; a wall still needs runtime support bounds.
    let result = compare('empty runtime floor with valid explicit footprint',
      frame([floor], {boundaries: [emptyFloor]}));
    assert.equal(result.counts.missingSamples, 0);
    assert.equal(result.counts.representedSamples, 1);
    const withoutFootprint = {...floor}; delete withoutFootprint.floorFootprint;
    result = compare('empty runtime floor without a nonempty fallback is rejected',
      frame([withoutFootprint], {revision: 11, boundaries: [emptyFloor]}));
    assert.equal(result.counts.missingSamples, 1);
    const wall = sample(data, 'wall', {boundaryId: 'empty-wall', floorFootprint: copy(floor.floorFootprint)});
    result = compare('empty runtime wall is rejected despite a valid fallback footprint',
      frame([wall], {revision: 12, boundaries: [{id: 'empty-wall', sourceSurfaceId: 'wall', triangles: [], intact: true}]}));
    assert.equal(result.counts.missingSamples, 1);
  });
});


function freezeArrays(value) {
  if (Array.isArray(value)) {for (const child of value) freezeArrays(child); Object.freeze(value);}
  return value;
}

test('certified persistent and cloned frozen footprints preserve exact animated output', async () => {
  await paired(({data, candidate, compare}) => {
    const a = sample(data, 'floor-a'), b = sample(data, 'floor-b');
    a.floorFootprint = freezeArrays(a.floorFootprint); b.floorFootprint = freezeArrays(b.floorFootprint);
    const input = frame([a, b]);
    for (let step = 0; step < 4; step++) {
      input.revision++; input.worldTime += 1 / 30;
      compare('persistent recursively frozen DTO ' + step, input);
      assert.equal(candidate.diagnostics().preparationCache.immutableEntries, 2);
    }
    a.floorFootprint = freezeArrays(copy(a.floorFootprint)); input.revision++;
    compare('equal cloned immutable geometry', input);
    a.floorFootprint = freezeArrays(rectangle(0, .8, 0, 1)); input.revision++;
    compare('different cloned immutable geometry', input);
    compare('old immutable identities are pruned', frame([], {revision: input.revision + 1}));
    assertPreparationEntries(candidate, 0, 'no immutable owners');
  });
});

test('frozen outer arrays with mutable descendants retain exact in-place invalidation', async () => {
  await paired(({data, candidate, compare}) => {
    const a = sample(data, 'floor-a'); Object.freeze(a.floorFootprint);
    const input = frame([a]), first = compare('frozen outer only', input);
    assert.equal(candidate.diagnostics().preparationCache.immutableEntries, 0);
    for (const t of a.floorFootprint) for (const p of t) if (p[0] === 1) p[0] = .7;
    input.revision++;
    const changed = compare('mutable point changes below frozen parent', input);
    assert.notDeepEqual(changed.inspect.emitters, first.inspect.emitters);
    assert.equal(candidate.diagnostics().preparationCache.immutableEntries, 0);
  });
});

test('frozen accessor-valued points are value-checked rather than trusted by identity', async () => {
  await paired(({data, candidate, compare}) => {
    let right = 1;
    const footprint = rectangle(0, 1, 0, 1);
    for (const t of footprint) for (const p of t) {
      if (p[0] === 1) Object.defineProperty(p, '0', {enumerable: true, configurable: true, get: () => right});
      Object.freeze(p);
    }
    for (const t of footprint) Object.freeze(t); Object.freeze(footprint);
    const a = sample(data, 'floor-a', {floorFootprint: footprint}), input = frame([a]);
    const first = compare('fully frozen arrays with numeric accessor', input);
    assert.equal(candidate.diagnostics().preparationCache.immutableEntries, 0);
    right = .7; input.revision++;
    assert.notDeepEqual(compare('getter result changes without identity change', input).inspect.emitters, first.inspect.emitters);
    assert.equal(candidate.diagnostics().preparationCache.immutableEntries, 0);
  });
});

test('immutable preparation is shared across live sources and pruned without historical geometry retention', () => {
  const cache = createSupportGeometryCache(), input = freezeArrays(rectangle(0, 1, 0, 1));
  cache.begin(); const first = cache.source('one'), second = cache.source('two');
  const a = cache.geometry(first, 'support', input), b = cache.geometry(second, 'support', input);
  assert.equal(a, b, 'the same immutable array gets one preparation across source entries');
  assert.equal(cache.immutableSize, 1); cache.prune();
  for (let step = 0; step < 16; step++) {
    cache.begin(); const owner = cache.source('one');
    cache.geometry(owner, 'support', freezeArrays(rectangle(0, 1 - step * .01, 0, 1)));
    cache.prune(); assert.equal(cache.size, 1); assert.equal(cache.immutableSize, 1);
  }
  // A frozen Proxy is not an ordinary immutable DTO; it must stay on the
  // descriptor/value-checked path even if it mirrors a frozen array target.
  cache.begin(); cache.geometry(cache.source('proxy'), 'support', new Proxy(input, {})); cache.prune();
  assert.equal(cache.immutableSize, 0);
  cache.begin(); cache.prune(); assert.equal(cache.size, 0); assert.equal(cache.immutableSize, 0);
  cache.clear(); assert.equal(cache.size, 0); assert.equal(cache.immutableSize, 0);
});


test('producer-owned boundary/footprint DTOs preserve exact output, input ownership and pruning', async () => {
  await paired(({data, candidate, compare}) => {
    const raw = rectangle(0, 1, 0, 1), owned = createOwnedPublicationGeometry(raw);
    assert.equal(isOwnedPublicationGeometry(owned), true);
    assert.equal(isOwnedPublicationGeometry(raw), false);
    assert.notEqual(owned, raw); assert.notEqual(owned[0][0], raw[0][0]);
    assert.deepEqual(Reflect.ownKeys(owned), Reflect.ownKeys(raw), 'no trust fields added');
    assert.ok(!Object.isFrozen(raw) && !Object.isFrozen(raw[0][0]));
    const a = sample(data, 'floor-a', {boundaryId: 'owned-a', floorFootprint: owned});
    const other = createOwnedPublicationGeometry(rectangle(1, 2, 0, 1));
    const b = sample(data, 'floor-b', {boundaryId: 'owned-b', floorFootprint: other});
    const input = frame([a, b], {boundaries: [
      {id: 'owned-a', sourceSurfaceId: 'floor-a', intact: true, triangles: owned},
      {id: 'owned-b', sourceSurfaceId: 'floor-b', intact: true, triangles: other},
    ]});
    for (let step = 0; step < 4; step++) {
      input.revision++; input.worldTime += 1 / 30;
      compare('same owned support/footprint at a new native-style state ' + step, input);
      assert.equal(candidate.diagnostics().preparationCache.immutableEntries, 2);
    }
    raw[0][0][0] = -99; assert.notEqual(owned[0][0][0], -99, 'source mutation cannot reach owned output');
    const identical = createOwnedPublicationGeometry(rectangle(0, 1, 0, 1));
    a.floorFootprint = input.boundaries[0].triangles = identical; input.revision++;
    compare('equal geometry from a new factory identity', input);
    const changed = createOwnedPublicationGeometry(rectangle(0, .8, 0, 1));
    a.floorFootprint = input.boundaries[0].triangles = changed; input.revision++;
    compare('changed owned coordinates under the same source IDs', input);
    b.flame = 0; input.revision++;
    compare('same-ID neighbor change still invalidates a connected owned group', input);
    compare('empty reset releases owned geometry', frame([], {full: true, revision: 0, worldTime: 0}));
    assertPreparationEntries(candidate, 0, 'owned empty reset');
  });
});

test('only private factory membership bypasses redundant clone/descriptor certification; shape validation remains', () => {
  const raw = rectangle(0, 1, 0, 1), owned = createOwnedPublicationGeometry(raw);
  const generic = freezeArrays(copy(owned)), proxy = new Proxy(owned, {});
  assert.equal(isOwnedPublicationGeometry(generic), false);
  assert.equal(isOwnedPublicationGeometry(proxy), false);
  assert.equal(isOwnedPublicationGeometry(copy(owned)), false);
  assert.equal(isOwnedPublicationGeometry({owned: true, geometry: owned}), false);
  const cache = createSupportGeometryCache(), clone = globalThis.structuredClone;
  const descriptor = Object.getOwnPropertyDescriptor; let clones = 0, descriptors = 0;
  try {
    globalThis.structuredClone = (...args) => {clones++; return clone(...args);};
    Object.getOwnPropertyDescriptor = (...args) => {descriptors++; return descriptor(...args);};
    cache.begin(); const a = cache.geometry(cache.source('first'), 'support', owned);
    assert.equal(clones, 0); assert.equal(descriptors, 0);
    const b = cache.geometry(cache.source('second'), 'support', owned);
    assert.equal(a, b); assert.equal(clones, 0); assert.equal(descriptors, 0);
    cache.geometry(cache.source('generic'), 'support', generic);
    assert.equal(clones, 1, 'unowned fully frozen data still uses the original certificate');
    assert.ok(descriptors > 0);
  } finally {globalThis.structuredClone = clone; Object.getOwnPropertyDescriptor = descriptor;}
  for (let step = 0; step < 8; step++) {
    cache.begin(); cache.geometry(cache.source('current'), 'support', createOwnedPublicationGeometry(rectangle(0, 1 - step * .025, 0, 1)));
    cache.prune(); assert.equal(cache.size, 1); assert.equal(cache.immutableSize, 1);
  }
  const malformed = createOwnedPublicationGeometry([[[NaN, 0, 0], [1, 0, 0], [0, 0, 1]]]);
  assert.equal(isOwnedPublicationGeometry(malformed), true, 'ownership does not promise a triangle shape');
  cache.begin(); assert.equal(cache.geometry(cache.source('invalid'), 'support', malformed).valid, false); cache.prune();
  cache.begin(); cache.prune(); assert.equal(cache.size, 0); assert.equal(cache.immutableSize, 0);
  cache.clear(); assert.equal(cache.size, 0); assert.equal(cache.immutableSize, 0);
});


test('static envelopes avoid helper calls across fresh animated frames while camera, wind and inspection stay live', async () => {
  await paired(({data, candidate, compare}) => {
    const samples = ['floor-a', 'wall', 'roof', 'upper'].map(id => sample(data, id));
    const input = frame(samples), first = compare('cold conservative envelopes', input);
    const cold = candidate.diagnostics().effectWork.work.effectBoundsComputations;
    assert.equal(cold, samples.length * 2);
    input.fireSamples = copy(samples); input.revision++; input.worldTime += 1 / 30;
    const second = compare('fresh records advance animation with the same envelopes', input);
    assert.equal(candidate.diagnostics().effectWork.work.effectBoundsComputations, 0);
    assert.equal(candidate.diagnostics().effectWork.work.effectBoundsCacheHits, cold);
    assert.notDeepEqual(second.inspect.splats, first.inspect.splats);
    const exposed = candidate.inspect().emitters.find(q => q.flameBounds && q.smokeBounds);
    exposed.flameBounds.min.fill(1e9); exposed.smokeBounds.max.fill(-1e9);
    exposed.anchor[0] = 1e9; exposed.omissions.disabled = true;
    assert.deepEqual(capture(candidate), second, 'inspection cannot change private cached bounds or diagnostics');
    input.revision++; input.worldTime += 1 / 30;
    compare('cached envelopes survive caller mutation of an earlier inspection', input);
    assert.equal(candidate.diagnostics().effectWork.work.effectBoundsComputations, 0);
    const away = camera(1000, 6, -7, [1000, 1.7, 1]);
    assert.equal(compare('new camera still culls using cached envelopes', input, {...view, camera: away}).counts.visibleSamples, 0);
    assert.equal(candidate.diagnostics().effectWork.work.effectBoundsComputations, 0);
    const unknown = compare('unknown wind remains conservative with null envelopes', input, {...view, windMetadata: undefined});
    assert.ok(unknown.inspect.emitters.every(q => q.flameBounds === null && q.smokeBounds === null));
    assert.equal(candidate.diagnostics().effectWork.work.effectBoundsComputations, 0);
    assert.equal(candidate.diagnostics().effectWork.work.effectBoundsCacheHits, 0);
    const cut = compare('cutaway remains current without rebuilding static bounds', input, {...view, mode: 'cutaway', level: 0});
    assert.ok(cut.inspect.emitters.filter(q => q.flames).length < second.inspect.emitters.filter(q => q.flames).length);
    assert.equal(candidate.diagnostics().effectWork.work.effectBoundsComputations, 0);
    compare('empty reset clears both channels', frame([], {full: true, revision: 0, worldTime: 0}));
    assertPreparationEntries(candidate, 0, 'empty envelope reset');
  });
});

test('same-ID position, normal and in-place support-bound changes rebuild exact reference envelopes', async () => {
  await paired(({data, candidate, compare}) => {
    const a = sample(data, 'floor-a'), input = frame([a]);
    const check = label => {
      input.revision++; compare(label, input);
      assert.equal(candidate.diagnostics().effectWork.work.effectBoundsComputations, 2, label);
      assert.equal(candidate.diagnostics().preparationCache.effectBoundsEntries, 2);
    };
    check('initial two channels');
    a.x = .4; check('source X changes under the same ID');
    a.y += .1; check('source elevation changes under the same ID');
    a.z = .4; check('source Z changes under the same ID');
    a.nx = .6; a.ny = .8; check('normal changes in place');
    a.nx = 0; a.ny = 1;
    for (const triangle of a.floorFootprint) for (const point of triangle) if (point[0] === 1) point[0] = .75;
    check('selected anchor bounds change in place');
    const wall = sample(data, 'wall', {id: a.id, boundaryId: 'envelope-wall'});
    const boundary = {id: 'envelope-wall', sourceSurfaceId: 'wall', intact: true,
      triangles: copy(data.surfaces.find(s => s.id === 'wall').triangles)};
    input.fireSamples = [wall]; input.boundaries = [boundary]; check('part and selected support bounds change');
    for (const triangle of boundary.triangles) for (const point of triangle) if (point[1] === 2.12) point[1] = 2.32;
    check('runtime wall support span changes in the same array');
    input.fireSamples = copy(input.fireSamples); input.boundaries = copy(input.boundaries); input.revision++;
    compare('equal cloned records retain the latest exact envelope', input);
    assert.equal(candidate.diagnostics().effectWork.work.effectBoundsComputations, 0);
    assert.equal(candidate.diagnostics().effectWork.work.effectBoundsCacheHits, 2);
  });
});

test('envelope keys include selected bounds lengths and every coordinate checked by the frozen helper', async () => {
  const {houseEffectBounds: originalBounds} = await import(referenceModule(
    new URL('art/source/furnished-house/visibility.js', repository).href));
  const cache = createSupportGeometryCache(), q = {part: 'ground', x: .5, y: .12, z: .5,
    nx: 0, ny: 1, nz: 0, supportBounds: {min: [0, .12, 0], max: [1, .12, 1]}};
  const check = computations => {
    cache.begin(); const owner = cache.source('bounds');
    for (const channel of ['flames', 'smoke']) assert.deepEqual(cache.effectBounds(owner, q, channel), originalBounds(q, channel));
    cache.prune(); assert.equal(cache.effectBoundsComputations, computations);
  };
  check(2); check(0);
  q.nx = -0; check(2);
  q.supportBounds.min.push(0); q.supportBounds.max.push(1); check(2); check(0);
  q.supportBounds.min[3] = 2; check(2); assert.equal(cache.effectBoundsSize, 0);
  q.supportBounds.min[3] = 0; check(2);
  q.anchorBounds = {min: [-.1, 0, -.1], max: [1.1, .2, 1.1]}; check(2);
  q.supportBounds.min[0] = -100; check(0); // The helper selects anchorBounds.
  q.anchorBounds.max[2] = 1.2; check(2);
  q.part = 'roof'; q.nx = .6; q.ny = .8; check(2);
  cache.begin(); assert.equal(cache.effectBounds(cache.source('bounds'), q, 'lighting'), null);
  assert.equal(cache.effectBoundsSize, 2, 'unknown channel cannot reuse or replace a smoke entry'); cache.prune();
  cache.begin(); cache.prune(); assert.equal(cache.size, 0); assert.equal(cache.effectBoundsSize, 0);
  cache.clear(); assert.equal(cache.effectBoundsSize, 0);
});
