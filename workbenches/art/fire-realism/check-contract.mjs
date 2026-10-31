import assert from 'node:assert/strict';
import * as T from '../../../src/runtime/three.js';
import {createFireRealism} from '../../../assets/art/fire-realism/index.js';
import {resolveDischarge} from '../../../src/simulation/discharge.js';
import {createDischarge} from '../../../src/art/discharge.js';

const camera = new T.OrthographicCamera(-5.6, 5.6, 3.5, -3.5, .05, 100);
function cameraRecord(reverse = false) {
  camera.position.set(reverse ? -12 : 12, 12, reverse ? -15 : 15); camera.lookAt(6, .4, 6); camera.updateMatrixWorld(true);
  return {kind: 'orthographic', position: {...camera.position}, quaternion: camera.quaternion.toArray(), matrixWorld: camera.matrixWorld.toArray(), matrixWorldInverse: camera.matrixWorldInverse.toArray(), projectionMatrix: camera.projectionMatrix.toArray(), near: camera.near, far: camera.far};
}
const base = (time, cells = [], extra = {}) => ({version: 1, tick: Math.round(time * 60), worldTime: time, playerTime: time * 3, paused: false,
  camera: cameraRecord(), viewport: {width: 1280, height: 800, pixelRatio: 1},
  anchors: {muzzle: {x: 2, y: .8, z: 2}, torchTip: {x: 1, y: 1, z: 1}}, player: {x: -5, y: -5, elevation: 0, radius: .3, tool: 'matches'}, cells, events: [], buildingVisuals: [], ...extra});
const cell = (id, phase = 'burning', x = 2.25) => ({id, phase, x, y: 2.25, size: .5, intensity: .9, depositedFuel: 1});
const instances = (effect, name) => effect.diagnostics().layers.find(l => l.name === name)?.instances || 0;
const mesh = effect => effect.root.children.find(o => o.isMesh);
const data = effect => Object.fromEntries(['iOrigin', 'iAxis', 'iShape', 'iPolicy'].map(n => [n, [...mesh(effect).geometry.getAttribute(n).array.slice(0, mesh(effect).geometry.instanceCount * mesh(effect).geometry.getAttribute(n).itemSize)]]));
const lights = effect => effect.root.children.filter(o => o.isPointLight).map(l => ({position: l.position.toArray(), intensity: l.intensity}));

assert.throws(() => createFireRealism(T, {quality: 'optimized'}), /unavailable/);
assert.throws(() => createFireRealism(T, {maxCells: 4097}), /capacity/);
const fullGrid = Array.from({length: 65536}, (_, i) => ({id: `full-${i}`, phase: i === 65535 ? 'burning' : 'spent', x: (i % 256) * .5 + .25, y: Math.floor(i / 256) * .5 + .25, intensity: .8, size: .5}));
const sparse = createFireRealism(T, {maxCells: 1}); sparse.update(base(1, fullGrid)); assert.equal(sparse.diagnostics().burningCells, 1); sparse.dispose();
const bounded = createFireRealism(T, {maxCells: 1}); assert.throws(() => bounded.update(base(1, [cell('a'), cell('b')])), /capacity/); bounded.dispose();

const effect = createFireRealism(T, {maxCells: 16}), ownedResources = new Set();
for (const child of effect.root.children) if (child.isMesh) {ownedResources.add(child.geometry); ownedResources.add(child.material); for (const u of Object.values(child.material.uniforms)) if (u.value?.isTexture) ownedResources.add(u.value);}
const disposal = new Map([...ownedResources].map(r => [r, 0])); for (const r of ownedResources) r.addEventListener('dispose', () => disposal.set(r, disposal.get(r) + 1));
const field = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1), depth = new T.DepthTexture(1280, 800);
let borrowedDisposals = 0; for (const t of [field, depth]) t.addEventListener('dispose', () => borrowedDisposals++);
const fieldUniforms = {field: {value: field}, grid: {value: new T.Vector2(1, 1)}, cellSize: {value: .5}};
function depthFrame(record) {return {valid: true, texture: depth, width: 1280, height: 800, convention: 'webgl-depth-0-1', viewProjectionMatrix: new T.Matrix4().fromArray(record.projectionMatrix).multiply(new T.Matrix4().fromArray(record.matrixWorldInverse)).toArray(), projectionMatrixInverse: new T.Matrix4().fromArray(record.projectionMatrix).invert().toArray(), cameraWorldMatrix: [...record.matrixWorld]};}
const frozen = Object.freeze(cell('a')), source = Object.freeze([frozen]);
effect.update(base(1, source, {fieldUniforms}));
assert.equal(effect.diagnostics().burningCells, 1); assert.equal(effect.diagnostics().triangles, 8064); assert.equal(effect.diagnostics().borrowedField, true);
const first = data(effect), resources = effect.diagnostics().resources;
effect.update(base(1, source)); assert.deepEqual(data(effect), first);
effect.update(base(2, [], {paused: true})); assert.equal(effect.diagnostics().worldTime, 1); assert.equal(effect.diagnostics().burningCells, 1);
effect.update(base(2, [cell('a', 'spent')])); assert.equal(effect.diagnostics().burningCells, 0); assert.equal(effect.diagnostics().smokeColumns, 1);
effect.update(base(5.3)); assert.equal(effect.diagnostics().smokeColumns, 0); assert.equal(effect.diagnostics().triangles, 0);
effect.update(base(.5, [cell('a')])); assert.deepEqual(data(effect), first, 'rewind clears and deterministically reconstructs observed sources');

const config = {tools: {presentationHeight: .85, flamethrower: {range: 5, halfAngle: .5}, torch: {radius: 1}}};
const resolverState = {tick: 1, player: {x: 2, y: 5, tool: 'flamethrower', heading: 0}, obstacles: Array.from({length: 80}, (_, i) => ({id: `obstacle-${i}`, kind: 'wall', x: 5 + i % 10 * .11, y: 4.6 + Math.floor(i / 10) * .105, width: .032, depth: .028}))};
const disconnected = resolveDischarge(resolverState, config, {width: 12, height: 12});
assert.equal(disconnected.connectRays, false, 'real existing resolver produces independent clipped rays in a complex fixture'); assert.equal(disconnected.rays.length, 25);
const control = createDischarge(T, field), anchors = {muzzle: {x: 2.3, y: .85, z: 5}}, immutable = JSON.stringify(disconnected);
control.update(disconnected, 1, anchors); assert.equal(control.diagnostics().triangles, 500);
effect.reset(); effect.update(base(1, [], {discharge: disconnected, anchors}));
assert.equal(instances(effect, 'Resolved liquid-fuel jet'), 25); assert.equal(effect.diagnostics().independentRayRibbons, 25); assert.ok(effect.diagnostics().jetSmokeColumns > 0);
assert.equal(JSON.stringify(disconnected), immutable, 'resolved endpoints and gameplay shape remain immutable');
const g = mesh(effect).geometry, ids = effect.diagnostics().sortedSemanticIds;
for (let i = 0; i < ids.length; i++) if (ids[i].startsWith('ray:')) {
  const rayIndex = Number(ids[i].split(':')[1]), r = disconnected.rays[rayIndex], o = disconnected.shapeOrigin;
  assert.equal(ids[i], `ray:${rayIndex}:0`, 'one continuous curved support per ray cannot restart an axial cone lattice');
  assert.ok(Math.abs(g.attributes.iOrigin.array[i * 3] - o.x) < 1e-6 && Math.abs(g.attributes.iOrigin.array[i * 3 + 2] - o.y) < 1e-6);
  assert.ok(Math.abs(g.attributes.iShape.array[i * 4 + 1] - r.distance) < 1e-5, 'continuous ribbon spans its complete authoritative clipped ray');
  assert.equal(g.attributes.iPolicy.array[i * 3 + 1], 2, 'independent rays use surface support, never a filled fan');
  for (const t of [0, 1]) {
    const p = [g.attributes.iOrigin.array[i * 3], g.attributes.iOrigin.array[i * 3 + 2]], length = g.attributes.iShape.array[i * 4 + 1];
    p[0] += g.attributes.iAxis.array[i * 3] * length * t; p[1] += g.attributes.iAxis.array[i * 3 + 2] * length * t;
    const distance = Math.hypot(p[0] - o.x, p[1] - o.y);
    assert.ok(distance <= r.distance + 1e-5); assert.ok(Math.abs((p[0] - o.x) * Math.sin(r.angle) - (p[1] - o.y) * Math.cos(r.angle)) < 1e-5);
  }
}
const origin = {x: 2, y: 5, h: .85}, short = {version: 1, active: true, tool: 'flamethrower', origin, shapeOrigin: origin, heading: 0, connectRays: true, rays: [-.2, 0, .2].map(angle => ({angle, x: 2 + Math.cos(angle) * .1, y: 5 + Math.sin(angle) * .1, h: .85, distance: .1}))};
for (const x of [2.3, 2.5301]) {
  const anchors = {muzzle: {x, y: .85, z: 5}}; effect.reset(); effect.update(base(1, [], {discharge: short, anchors})); control.update(short, 1, anchors);
  assert.ok(control.diagnostics().triangles > 0); assert.equal(instances(effect, 'Resolved liquid-fuel jet'), 3); assert.equal(effect.diagnostics().muzzleInsideShape, false); assert.equal(effect.diagnostics().visualForwardStart, 0);
  assert.match(effect.diagnostics().discharge, /outside-muzzle/);
}
effect.update(base(2, [], {discharge: {...short, connectRays: false, lead: {from: origin, to: {x: 2.05, y: 5, h: .85}}}, anchors}));
assert.ok(instances(effect, 'Authoritative discharge lead') > 0);
effect.update(base(5.3)); assert.equal(effect.diagnostics().jetSmokeColumns, 0, 'isolated stopped jet has a finite smoke tail'); control.dispose();

effect.reset(); effect.update(base(1, [], {torch: {phase: 'lit', remainingSeconds: 1}})); assert.equal(instances(effect, 'Finite carried torch'), 0, 'retained lit inventory state does not render an unequipped torch');
effect.update(base(2, [], {player: {...base(2).player, tool: 'torch'}, anchors: {}, torch: {phase: 'lit', remainingSeconds: 1}})); assert.match(effect.diagnostics().torch, /missing/);
effect.update(base(3, [], {player: {...base(3).player, tool: 'torch'}, torch: {phase: 'lit', remainingSeconds: 1}})); assert.equal(instances(effect, 'Finite carried torch'), 3);
effect.update(base(4, [], {player: {...base(4).player, tool: 'torch'}, torch: {phase: 'lit', remainingSeconds: 0}})); assert.equal(instances(effect, 'Finite carried torch'), 0);

const nativeSite = {id: 'front-wall', kind: 'facade', position: [2.5, 0, 2], normal: [0, 0, -1], baseElevation: 0, span: {width: 1, height: 2}, sourceCellIds: ['a'], sourcePartId: 'fixture-native-wall/front', sourceFaceIndex: 4};
const building = {id: 'actual-house', prefabId: 'test-only', destroyed: false, burnedFraction: .1, sourceBounds: {min: [1.7, -.12, 1.7], max: [4.3, 4.24, 8]}, footprintCellIds: ['a'], burningCellIds: ['a'], intensity: .9, fireSites: [nativeSite]};
effect.reset(); effect.update(base(1, [cell('a')], {buildingVisuals: [building]})); assert.equal(effect.diagnostics().buildingGroups, 1); assert.ok(instances(effect, 'Legitimate ground-floor facade tongues') > 0);
assert.equal(effect.diagnostics().nativeFacadeSites, 1);
const contactIndex = effect.diagnostics().sortedSemanticIds.indexOf('building:actual-house:front-wall:flame'), contactData = mesh(effect).geometry.attributes.iOrigin.array;
assert.ok(contactData[contactIndex * 3 + 1] >= 0 && contactData[contactIndex * 3 + 1] < .03, 'attachment uses actual native wall base, never slab/stair aggregate minY');
assert.ok(contactData[contactIndex * 3 + 2] < 2, 'attachment is just outside the actual outward wall face');
const audit = effect.diagnostics(); audit.selectedFacadeSites[0].sourcePartId = 'mutated'; assert.equal(effect.diagnostics().selectedFacadeSites[0].sourcePartId, nativeSite.sourcePartId);
effect.update(base(1.1, [cell('a')], {buildingVisuals: [{...building, fireSites: undefined}]})); assert.equal(instances(effect, 'Legitimate ground-floor facade tongues'), 0); assert.equal(effect.diagnostics().unavailableFacadeGroups, 1); assert.match(effect.diagnostics().warnings.join(' '), /no aggregate-AABB substitute/);
for (const patch of [{sourcePartId: null}, {sourceFaceIndex: -1}, {normal: [0, 0, -2]}, {kind: 'roofline'}, {sourceCellIds: ['foreign']}]) {
  effect.update(base(1.2, [cell('a')], {buildingVisuals: [{...building, fireSites: [{...nativeSite, ...patch}]}]})); assert.equal(effect.diagnostics().nativeFacadeSites, 0); assert.equal(effect.diagnostics().invalidFacadeSites, 1);
}
const distributed = Array.from({length: 32}, (_, i) => {const side = Math.floor(i / 8), t = i % 8 * .25; return {...nativeSite, id: `native-${String(i).padStart(2, '0')}`, sourcePartId: `wall-${i}`, position: [[2 + t, 0, 2], [4, 0, 2 + t], [2 + t, 0, 4], [2, 0, 2 + t]][side], normal: [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]][side]};});
effect.reset(); effect.update(base(1, [cell('a')], {buildingVisuals: [{...building, fireSites: distributed}]})); const chosen = effect.diagnostics().selectedFacadeSites;
assert.equal(chosen.length, 8); const sides = new Set(chosen.map(s => Math.floor(Number(s.id.slice(7)) / 8))); assert.equal(sides.size, 4, 'representative choice retains exterior normal/spatial coverage');
effect.reset(); effect.update(base(1, [cell('a')], {buildingVisuals: [{...building, fireSites: [...distributed].reverse()}]})); assert.deepEqual(effect.diagnostics().selectedFacadeSites, chosen, 'equivalent native site ordering cannot move emission');
assert.throws(() => effect.update(base(1.1, [cell('a')], {buildingVisuals: [{...building, fireSites: [...distributed, {...nativeSite, id: 'excess'}]}]})), /candidate capacity/);
effect.update(base(2, [cell('a')], {buildingVisuals: [{...building, footprintCellIds: []}]})); assert.equal(effect.diagnostics().buildingGroups, 0, 'unrelated burning grass cannot ignite a facade');
effect.update(base(3, [cell('a', 'spent')], {buildingVisuals: [building]})); assert.equal(effect.diagnostics().buildingGroups, 0);
effect.update(base(4, [], {buildingVisuals: [{id: 'old-placeholder', burning: true}]})); assert.equal(effect.diagnostics().unsupportedBuildingGroups, 1);

const ordered = [cell('a', 'burning', 2.25), cell('b', 'burning', 8.25), {...cell('c', 'burning', 2.75), intensity: .43}];
effect.reset(); effect.update(base(1, ordered)); const sortedData = data(effect), sortedIds = effect.diagnostics().sortedSemanticIds, sortedLights = lights(effect);
effect.reset(); effect.update(base(1, [...ordered].reverse())); assert.deepEqual(data(effect), sortedData); assert.deepEqual(effect.diagnostics().sortedSemanticIds, sortedIds); assert.deepEqual(lights(effect), sortedLights, 'equivalent source order cannot alter spill-light selection or smoke summation');
const reversed = cameraRecord(true), opaque = depthFrame(reversed);
effect.update(base(5, [], {paused: true, camera: reversed, opaqueDepth: opaque}));
assert.equal(effect.diagnostics().worldTime, 1); assert.notDeepEqual(effect.diagnostics().sortedSemanticIds, sortedIds); assert.equal(effect.diagnostics().borrowedOpaqueDepth, true, 'paused camera receives fresh depth and resorts existing sources');
assert.equal(mesh(effect).material.uniforms.opaqueDepth.value, depth); assert.deepEqual(mesh(effect).material.uniforms.opaqueViewProjection.value.toArray(), opaque.viewProjectionMatrix);
effect.update(base(5, [], {paused: true, camera: reversed, opaqueDepth: {...opaque, width: 1279}})); assert.equal(effect.diagnostics().borrowedOpaqueDepth, false, 'mismatched physical depth dimensions cannot masquerade as valid occlusion');
const fractionalDepth = new T.DepthTexture(682, 1477);
effect.update(base(5, [], {paused: true, camera: reversed, viewport: {width: 390, height: 844, pixelRatio: 1.75}, opaqueDepth: {...opaque, texture: fractionalDepth, width: 682, height: 1477}})); assert.equal(effect.diagnostics().borrowedOpaqueDepth, true, 'physical dimensions use the real renderer floor convention at fractional DPR');
effect.update(base(5, [], {paused: true, camera: reversed, opaqueDepth: {...opaque, viewProjectionMatrix: new T.Matrix4().toArray()}})); assert.equal(effect.diagnostics().borrowedOpaqueDepth, false, 'mismatched camera depth cannot masquerade as valid occlusion');
effect.update(base(5, [], {paused: true, camera: reversed})); assert.match(effect.diagnostics().opaqueOcclusion, /unavailable/);
effect.update(base(1.1, [], {eventReceipts: {generation: 2, reset: true, primed: true, highestId: 99, events: []}})); assert.equal(effect.diagnostics().triangles, 0, 'explicit receipt reset clears historical tails even without time rewind');
for (let i = 0; i < 30; i++) {effect.reset(); effect.update(base(1, [cell('a')], {fieldUniforms})); assert.deepEqual(effect.diagnostics().resources, resources);}
effect.reset(); assert.equal(effect.diagnostics().triangles, 0); effect.dispose(); effect.dispose();
for (const n of disposal.values()) assert.equal(n, 1, 'owned resources dispose exactly once'); assert.equal(borrowedDisposals, 0); assert.equal(effect.root.children.length, 0); field.dispose(); depth.dispose(); fractionalDepth.dispose();
console.log('PASS: actual shared-Three lifecycle, 65536-cell input/4096-source bound, pause/rewind/reset, finite world-clock smoke, real25-ray compatibility, outside-native-muzzle short fans, finite selected torch, native facade provenance/base/contact/coverage/limits, equivalent-site ordering, detached audit and borrowed current-camera depth. Shader compilation, actual visual correctness, GPU cost and acceptance remain unperformed.');
