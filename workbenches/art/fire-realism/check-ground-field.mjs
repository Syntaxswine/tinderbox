import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../../../src/runtime/three.js';
import {createFireRealism} from '../../../assets/art/fire-realism/index.js';
import {prepareGroundSources, sampleGroundSources, groundEdgeCoverage, groundDomainInterval, prepareSmokeRegions, GROUND_SOURCE_SIDE, GROUND_DOMAIN_HEIGHT} from '../../../assets/art/fire-realism/ground-field.js';

const camera = new T.OrthographicCamera(-9, 9, 6, -6, .1, 100); camera.position.set(15, 14, 18); camera.lookAt(4, 0, 2); camera.updateMatrixWorld(true);
const cam = {kind: 'orthographic', matrixWorldInverse: camera.matrixWorldInverse.toArray()};
const cell = (id, x, y, extra = {}) => ({id, x, y, elevation: 0, size: .5, intensity: .8, material: 'grass', depositedFuel: 0, surfaceFuel: 1, phase: 'burning', ...extra});
const frame = (time, cells, extra = {}) => ({version: 1, tick: Math.round(time * 60), worldTime: time, playerTime: time, camera: cam, cells, player: {x: -5, y: -5, tool: 'matches'}, events: [], ...extra});
const mesh = e => e.root.children.find(o => o.isMesh);
function uploaded(e) {
  const g = mesh(e).geometry;
  return Object.fromEntries(Object.entries(g.attributes).filter(([k]) => k.startsWith('i')).map(([k, a]) => [k, [...a.array.slice(0, g.instanceCount * a.itemSize)]]));
}
const lightState = e => e.root.children.filter(o => o.isPointLight).map(o => [o.position.toArray(), o.intensity]);
const grid = Array.from({length: 128}, (_, i) => cell(`source-${i}`, (i % 16) * .5 + .25, Math.floor(i / 16) * .5 + .25, {intensity: .45 + (i % 9) * .06, material: i % 3 ? 'grass' : 'wood', depositedFuel: i % 7 ? 0 : 1}));
const frozenInput = JSON.stringify(grid), effect = createFireRealism(T, {maxCells: 256});
try {
  effect.update(frame(1, grid));
  const d = effect.diagnostics(), g = mesh(effect).geometry, u = mesh(effect).material.uniforms;
  assert.equal(d.burningCells, 128); assert.equal(d.coherentCells, 128); assert.equal(d.isolatedCells, 0);
  assert.equal(d.settings.groundDomainDensitySteps, 32, 'unfrozen sampling pilot does not retain the unproved64 setting');
  assert.equal(d.layers.find(l => l.name === 'Coherent ground domains')?.instances, 128, 'every active cell retains a real integration domain');
  assert.ok(!d.layers.some(l => l.name === 'Connected ground tongues'), 'broad fire no longer restarts three tapered crowns per source');
  assert.equal(d.groundField.encodedCells, 128); assert.equal(u.groundSources.value.image.width, GROUND_SOURCE_SIDE);
  assert.equal(u.groundSources.value.image.data.byteLength, 1048576); assert.equal(d.resources.textures, 3, 'one bounded additional owned texture');
  const field = {origin: u.groundOrigin.value.toArray(), extent: u.groundExtent.value.toArray(), cellSize: u.groundCellSize.value}, data = u.groundSources.value.image.data;
  assert.equal([...data].filter((v, i) => i % 4 === 3 && v === 1).length, 128, 'no duplicate, omitted or invented source texel');
  for (const c of grid) {
    const px = Math.floor((c.x - field.origin[0]) / c.size), pz = Math.floor((c.y - field.origin[1]) / c.size), at = (pz * GROUND_SOURCE_SIDE + px) * 4;
    assert.ok(Math.abs(data[at] - c.intensity) < 1e-6); assert.equal(data[at + 1], Number(c.material === 'wood') + Number(c.depositedFuel > 0) * 2); assert.equal(data[at + 2], c.elevation); assert.equal(data[at + 3], 1);
    assert.equal(d.sortedSemanticIds.filter(id => id === `cell:${c.id}:domain`).length, 1);
  }
  assert.equal(d.smokeSourceCount, 128); assert.equal(d.smokeRegions.reduce((n, r) => n + r.sourceCount, 0), 128);
  assert.ok(Math.abs(d.smokeSourceWeight - grid.reduce((n, c) => n + c.intensity, 0)) < 1e-10, 'regional plumes retain all actual source burden');
  assert.ok(d.smokeRegions.some(r => r.sourceCount > 4), 'regional rolls replace the1m post bins');
  assert.ok(d.smokeRegions.some(r => r.woodFraction > 0 && r.woodFraction < 1));
  assert.ok(d.smokeRegions.some(r => r.gasFraction > 0));
  const actual = uploaded(effect), sourceBytes = [...data], lights = lightState(effect), regions = d.smokeRegions;
  effect.update(frame(1, [...grid].reverse())); assert.deepEqual(uploaded(effect), actual); assert.deepEqual([...data], sourceBytes); assert.deepEqual(effect.diagnostics().smokeRegions, regions); assert.deepEqual(lightState(effect), lights);
  effect.update(frame(2, [], {paused: true, playerTime: 100})); assert.deepEqual(uploaded(effect), actual); assert.deepEqual([...data], sourceBytes); assert.equal(effect.diagnostics().worldTime, 1);
  effect.update(frame(1, grid, {playerTime: 100})); assert.deepEqual(uploaded(effect), actual, 'player clock cannot advance common fire or billows');
  effect.update(frame(1.2, grid)); assert.notDeepEqual(uploaded(effect), actual, 'world time advances actual uploaded billows');
  effect.reset(); effect.update(frame(1, grid)); assert.deepEqual(uploaded(effect), actual, 'reset reproduces regional identities and shared source storage');
  effect.update(frame(.5, grid)); const rewound = uploaded(effect); effect.reset(); effect.update(frame(.5, grid)); assert.deepEqual(uploaded(effect), rewound);
  const snapshot = effect.diagnostics(); snapshot.smokeRegions[0].weight = 999; snapshot.groundField.extent[0] = 999; assert.notEqual(effect.diagnostics().smokeRegions[0].weight, 999); assert.equal(effect.diagnostics().groundField.extent[0], 16);
  const resources = effect.diagnostics().resources, ownedTexture = u.groundSources.value; let disposed = 0; ownedTexture.addEventListener('dispose', () => disposed++);
  for (let i = 0; i < 12; i++) {effect.reset(); effect.update(frame(1, grid)); assert.deepEqual(effect.diagnostics().resources, resources); assert.equal(u.groundSources.value, ownedTexture);}
  effect.update(frame(1.1, grid.map(c => ({...c, phase: 'spent', intensity: 0})))); assert.equal(effect.diagnostics().burningCells, 0); assert.equal(effect.diagnostics().coherentCells, 0); assert.equal(effect.diagnostics().smokeSourceCount, 128); assert.equal(u.groundFieldEnabled.value, 0);
  effect.update(frame(4.3, [])); assert.equal(effect.diagnostics().smokeSourceCount, 0); assert.equal(g.instanceCount, 0, 'finite3.2s source tails do not become permanent regional emitters');
  assert.equal(JSON.stringify(grid), frozenInput);
  // These are source guards, not a shader compiler or rendered-seam approval.
  assert.match(mesh(effect).material.fragmentShader, /groundInterval\(cameraInside\?cameraPosition:world/);
  assert.match(mesh(effect).material.fragmentShader, /groundReaction\(wp\)/); assert.match(mesh(effect).material.fragmentShader, /den\*stepSize\*7\.4/);
  assert.match(mesh(effect).material.fragmentShader, /opaqueStops\(wp,sceneDepth\)/);
  assert.match(mesh(effect).material.fragmentShader, /float stepSize=\(exit-entry\)\/32\.;/);
  assert.match(mesh(effect).material.fragmentShader, /groundEdgeCoverage\(source\.a\)/, 'unnormalized occupancy shapes the optical envelope before final mask clipping');
  assert.match(mesh(effect).material.vertexShader, /groundHeight\(contact\.xz,groundSample\(contact\.xz\)\)/, 'detailed cap vertices follow the real common front instead of an undeformed conservative box');
  const glslTokens = `${mesh(effect).material.vertexShader}\n${mesh(effect).material.fragmentShader}`.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  assert.doesNotMatch(glslTokens, /\bcoherent\b/, 'actual WebGL rejected coherent as a reserved GLSL identifier; comments do not count as identifier use');
  effect.dispose(); effect.dispose(); assert.equal(disposed, 1, 'owned field texture disposed exactly once');
} finally {effect.dispose();}

// Adjacent domains filter the SAME uploaded field at their shared boundary.
const storage = new Float32Array(GROUND_SOURCE_SIDE ** 2 * 4), adjacent = [cell('a', .25, .25, {intensity: .4}), cell('b', .75, .25, {intensity: .9, material: 'wood', depositedFuel: 1})];
const h = adjacent.map(c => ({...c, gas: c.depositedFuel > 0})), field = prepareGroundSources(h, storage);
for (const x of [.5 - 1e-7, .5, .5 + 1e-7]) assert.ok(sampleGroundSources(field, storage, x, .25)[0] > .6);
const left = sampleGroundSources(field, storage, .5 - 1e-7, .25), right = sampleGroundSources(field, storage, .5 + 1e-7, .25);
for (let i = 0; i < 4; i++) assert.ok(Math.abs(left[i] - right[i]) < 1e-6, 'intensity/material/liquid coverage is continuous across the shared transverse boundary');

// Entry/exit integration: compare exact interval unions and physical-distance
// Beer-Lambert composition, including reverse/oblique and a boundary-parallel ray.
const centers = [[.25, .018, .25], [.75, .018, .25]], height = GROUND_DOMAIN_HEIGHT * .85;
const rays = [
  {o: [-1, .6, .25], d: [1, 0, 0]}, {o: [2, .6, .25], d: [-1, 0, 0]},
  {o: [-1, .8, .08], d: new T.Vector3(1, -.1, .17).normalize().toArray()},
  {o: [2, .4, .59], d: new T.Vector3(-1, .1, -.17).normalize().toArray()},
  {o: [.5, .6, -1], d: [0, 0, 1]}
];
for (const {o, d} of rays) {
  const segments = centers.map(c => groundDomainInterval(o, d, c, .5, height)).filter(Boolean).sort((a, b) => a[0] - b[0]);
  assert.ok(segments.length); for (let i = 1; i < segments.length; i++) assert.ok(Math.abs(segments[i - 1][1] - segments[i][0]) < 1e-10, 'no transverse gap/overlap between adjacent source intervals');
  const total = segments.reduce((n, [a, b]) => n + b - a, 0), span = segments.at(-1)[1] - segments[0][0]; assert.ok(Math.abs(total - span) < 1e-10);
  const expected = 1 - Math.exp(-3.7 * span); let alpha = 0;
  for (const [a, b] of segments) for (let j = 0; j < 64; j++) {const step = (b - a) / 64, optical = 1 - Math.exp(-3.7 * step); alpha += (1 - alpha) * optical;}
  assert.ok(Math.abs(alpha - expected) < 1e-12, 'physical entry/exit integration is independent of cell partition, not an overlapping volume sum');
}
assert.equal(groundDomainInterval([.5, .5, .25], [0, 1, 0], centers[0], .5), null, 'parallel shared face has one half-open owner');
assert.ok(groundDomainInterval([.5, .5, .25], [0, 1, 0], centers[1], .5));
const elevated = prepareGroundSources([{...h[0], elevation: 0}, {...h[1], elevation: 2.12}], storage);
assert.equal(elevated.enabled, true); assert.equal(elevated.coherentIds.length, 0, 'adjacent XZ does not merge different elevations into one fire field');
assert.ok(Math.abs(sampleGroundSources(elevated, storage, .5, .25, 0)[0] - .4) < 1e-6);
assert.ok(Math.abs(sampleGroundSources(elevated, storage, .5, .25, 2.12)[0] - .9) < 1e-6);
prepareGroundSources([{...h[0], material: 'wood', surfaceFuel: 0, gas: true}, {...h[1], material: 'grass'}], storage);
assert.equal(storage[1], 2, 'exhausted wood beneath burning deposited liquid is not counted as active wood burden');

// Smoke: every retained source contributes once, independent of traversal order,
// with actual wood/liquid flags and no imposed metre-spaced emitter coordinates.
const history = new Map(grid.map(c => [c.id, {...c, gas: c.depositedFuel > 0, lastBurn: 1}]));
const regions = prepareSmokeRegions(history, 1.5, 3.2), allIds = regions.flatMap(r => r.sourceIds);
assert.equal(allIds.length, history.size); assert.deepEqual(new Set(allIds), new Set(history.keys()));
assert.deepEqual(regions, prepareSmokeRegions(new Map([...history].reverse()), 1.5, 3.2));
assert.ok(regions.some(r => Math.abs(r.x - Math.round(r.x)) > .1 && r.count > 1), 'plumes derive weighted actual sources, not a world-metre bucket lattice');
assert.ok(Math.abs(regions.reduce((n, r) => n + r.weight, 0) - grid.reduce((n, c) => n + c.intensity * (1 - .5 / 3.2), 0)) < 1e-10);
assert.equal(prepareSmokeRegions(history, 4.3, 3.2).length, 0);

// The accepted facade correction changes only source-derived smoke burden at
// the SAME proven native anchors. Duplicate IDs cannot inflate linked area.
const woodCells = [cell('wa', .25, .25, {material: 'wood'}), cell('wb', .75, .25, {material: 'wood'})];
const building = {id: 'native-house', destroyed: false, intensity: .8, sourceBounds: {min: [0, -.12, 0], max: [1, 4, 1]}, footprintCellIds: ['wa', 'wb'], burningCellIds: ['wa', 'wb'],
  fireSites: [{id: 'real-front', kind: 'facade', position: [.5, 0, 0], normal: [0, 0, -1], baseElevation: 0, span: {width: 1, height: 2}, sourceCellIds: ['wa', 'wb', 'wa'], sourcePartId: 'native-wall/front', sourceFaceIndex: 11}]};
const facade = createFireRealism(T, {maxCells: 4});
const attributesAt = (e, id) => {const g = mesh(e).geometry, i = e.diagnostics().sortedSemanticIds.indexOf(id); assert.ok(i >= 0); return Object.fromEntries(['iOrigin', 'iAxis', 'iShape', 'iPolicy'].map(name => {const a = g.attributes[name]; return [name, [...a.array.slice(i * a.itemSize, (i + 1) * a.itemSize)]];}));};
try {
  facade.update(frame(1, woodCells, {buildingVisuals: [building]}));
  const d = facade.diagnostics(), area = 2 * .25 * .8, burden = Math.sqrt(area);
  assert.ok(Math.abs(d.selectedFacadeSites[0].woodArea - area) < 1e-12); assert.ok(Math.abs(d.selectedFacadeSites[0].smokeBurden - burden) < 1e-12);
  const smoky = attributesAt(facade, 'building:native-house:real-front:smoke'), flame = attributesAt(facade, 'building:native-house:real-front:flame');
  assert.equal(smoky.iPolicy[0], 3); assert.equal(d.nativeFacadeSites, 1);
  facade.update(frame(1, woodCells.map(c => ({...c, surfaceFuel: 0, depositedFuel: 1})), {buildingVisuals: [building]}));
  const gasOnly = attributesAt(facade, 'building:native-house:real-front:smoke');
  assert.equal(facade.diagnostics().selectedFacadeSites[0].woodArea, 0);
  assert.deepEqual(smoky.iOrigin, gasOnly.iOrigin); assert.deepEqual(smoky.iAxis, gasOnly.iAxis); assert.deepEqual(attributesAt(facade, 'building:native-house:real-front:flame'), flame, 'actual facade flame and native anchor remain unchanged');
  assert.ok(Math.abs(smoky.iShape[0] - gasOnly.iShape[0] - .27 * burden) < 1e-6); assert.ok(Math.abs(smoky.iShape[1] - gasOnly.iShape[1] - .40 * burden) < 1e-6); assert.ok(Math.abs(smoky.iShape[2] - gasOnly.iShape[2] - .8 * .22 * burden) < 1e-6);
  facade.update(frame(1, woodCells.map(c => ({...c, size: 2})), {buildingVisuals: [building]})); assert.equal(facade.diagnostics().selectedFacadeSites[0].smokeBurden, 1.8, 'source-burden adjustment has an explicit finite bound');
} finally {facade.dispose();}

// Real source cases captured from immutable architect aca30cd, not invented
// square proxies: one match's four cells and thin normal/powder gasoline fronts.
const actualEdges = JSON.parse(fs.readFileSync(new URL('./fixtures/edge-source-snapshots.json', import.meta.url)));
assert.equal(actualEdges.sourceCommit, 'aca30cd910a326918b1599ce6665803cf64739e0');
assert.deepEqual(actualEdges.fixtures.map(f => f.cells.length), [4, 8, 3]);
const powderCase = actualEdges.fixtures.find(f => f.scenario === 'gasoline-front-powder');
assert.ok(Math.abs(powderCase.worldTime - .35) < 1e-12 && Math.abs(powderCase.playerTime - 1.5) < 1e-12);
for (const fixture of actualEdges.fixtures) {
  const e = createFireRealism(T, {maxCells: 16}), mask = new Uint8Array(40 * 32 * 4), borrowed = new T.DataTexture(mask, 40, 32); let borrowedDisposed = 0;
  borrowed.addEventListener('dispose', () => borrowedDisposed++);
  for (const c of fixture.cells) mask[(Math.floor(c.y / .5) * 40 + Math.floor(c.x / .5)) * 4 + 3] = 255;
  const before = JSON.stringify(fixture), cellIds = new Set(fixture.cells.map(c => `${c.x}:${c.y}`));
  try {
    e.update(frame(fixture.worldTime, fixture.cells, {tick: fixture.tick, playerTime: fixture.playerTime, fieldUniforms: {field: {value: borrowed}, grid: {value: new T.Vector2(40, 32)}, cellSize: {value: .5}}}));
    const d = e.diagnostics(), u = mesh(e).material.uniforms, field = {origin: u.groundOrigin.value.toArray(), extent: u.groundExtent.value.toArray(), cellSize: .5}, data = u.groundSources.value.image.data;
    assert.equal(d.coherentCells, fixture.cells.length); assert.equal(d.burningCells, fixture.cells.length); assert.equal(d.smokeSourceCount, fixture.cells.length);
    assert.equal(u.field.value, borrowed); assert.deepEqual(u.grid.value.toArray(), [40, 32]); assert.equal(u.cellSize.value, .5);
    let outerFaces = 0, internalFaces = 0;
    for (const c of fixture.cells) {
      const center = sampleGroundSources(field, data, c.x, c.y);
      assert.equal(groundEdgeCoverage(center[3]), 1); assert.ok(center[0] > 0, 'every actual source retains a positive full-coverage interior/contact domain');
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = c.x + dx * .25, z = c.y + dz * .25, value = sampleGroundSources(field, data, x, z), internal = cellIds.has(`${c.x + dx * .5}:${c.y + dz * .5}`);
        if (internal) {
          internalFaces++; assert.ok(Math.abs(value[3] - 1) < 1e-12); assert.equal(groundEdgeCoverage(value[3]), 1, 'fully burning internal joins never acquire edge taper');
          const a = sampleGroundSources(field, data, x - dx * 1e-6, z - dz * 1e-6), b = sampleGroundSources(field, data, x + dx * 1e-6, z + dz * 1e-6);
          for (let j = 0; j < 4; j++) assert.ok(Math.abs(a[j] - b[j]) < 1e-4, 'real normal/powder/material/intensity field is smooth across an internal join');
        } else {
          outerFaces++; assert.ok(Math.abs(value[3] - .5) < 1e-12); assert.equal(groundEdgeCoverage(value[3]), 0, 'outer luminous envelope reaches ZERO, not half opacity, at the true mask boundary');
          const inward = [0, .02, .05, .10, .20].map(distance => groundEdgeCoverage(sampleGroundSources(field, data, x - dx * distance, z - dz * distance)[3]));
          for (let j = 1; j < inward.length; j++) assert.ok(inward[j] > inward[j - 1], 'outer taper grows continuously inside the legitimate source footprint');
        }
      }
    }
    assert.ok(outerFaces > 0 && internalFaces > 0);
    assert.equal(JSON.stringify(fixture), before, 'actual source states and powder clocks stay immutable');
  } finally {e.dispose(); assert.equal(borrowedDisposed, 0); borrowed.dispose();}
}
assert.equal(groundEdgeCoverage(0), 0); assert.equal(groundEdgeCoverage(.5), 0); assert.equal(groundEdgeCoverage(1), 1);
assert.ok(groundEdgeCoverage(.500001) < 1e-9, 'edge has no positive coverage jump just inside the safety cutoff');

// Unsupported layouts keep EVERY source through an explicit old-envelope path.
for (const cells of [[cell('a', .25, .25), cell('b', 200.25, .25)], [cell('a', .25, .25), cell('b', .25, .25, {elevation: 2.12})], [cell('a', .25, .25), cell('b', 1, .25, {size: 1})]]) {
  const e = createFireRealism(T, {maxCells: 4});
  try {e.update(frame(1, cells)); const d = e.diagnostics(); assert.equal(d.burningCells, 2); assert.equal(d.coherentCells, 0); assert.equal(d.layers.find(l => l.name === 'Connected ground tongues')?.instances, 6); assert.equal(d.groundField.enabled, false); assert.equal(d.smokeSourceCount, 2); assert.ok(d.warnings.some(w => /fallback/.test(w)));}
  finally {e.dispose();}
}
const wide = Array.from({length: 65536}, (_, i) => cell(`wide-${i}`, (i % 1024) * .5 + .25, Math.floor(i / 1024) * .5 + .25, {phase: i === 0 || i === 1023 || i === 65535 ? 'burning' : 'spent'}));
const wideMaskData = new Uint8Array(1024 * 64 * 4); for (const i of [0, 1023, 65535]) wideMaskData[i * 4 + 3] = 255;
const wideMask = new T.DataTexture(wideMaskData, 1024, 64), wideEffect = createFireRealism(T, {maxCells: 4}); let borrowedDisposals = 0; wideMask.addEventListener('dispose', () => borrowedDisposals++);
try {
  const fieldUniforms = {field: {value: wideMask}, grid: {value: new T.Vector2(1024, 64)}, cellSize: {value: .5}};
  wideEffect.update(frame(1, wide, {fieldUniforms})); const before = uploaded(wideEffect), u = mesh(wideEffect).material.uniforms;
  assert.equal(wideEffect.diagnostics().burningCells, 3); assert.equal(wideEffect.diagnostics().smokeSourceCount, 3);
  assert.equal(wideEffect.diagnostics().groundField.enabled, false); assert.match(wideEffect.diagnostics().groundField.reason, /extent/);
  assert.equal(wideEffect.diagnostics().layers.find(l => l.name === 'Connected ground tongues')?.instances, 9);
  assert.equal(u.field.value, wideMask); assert.deepEqual(u.grid.value.toArray(), [1024, 64]); assert.equal(u.cellSize.value, .5);
  assert.equal(wideMaskData[1023 * 4 + 3], 255); assert.equal(wideMaskData[65535 * 4 + 3], 255, 'far-edge native mask retains actual live cells');
  wideEffect.update(frame(1, [...wide].reverse(), {fieldUniforms})); assert.deepEqual(uploaded(wideEffect), before, 'thin-wide fallback remains source-order deterministic');
} finally {wideEffect.dispose(); assert.equal(borrowedDisposals, 0); wideMask.dispose();}
console.log('PASS: all128 sources uploaded/accounted; shared transverse field continuity + exact adjacent ray entry/exit/physical integration; irregular all-source material-weighted catchments; deterministic order/world/pause/reset/rewind; finite tails; bounded owned storage/exact disposal; complete1024x64/far-edge fallback with unchanged native borrowed mask; elevation-separated adjacency; actual4-cell match/8-cell normal/3-cell powder zero-outer/full-internal coverage and32-sample pilot. Actual shader/motion/seam/realism/GPU acceptance still required.');
