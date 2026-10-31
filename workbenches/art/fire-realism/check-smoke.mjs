import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import * as T from '../../../src/runtime/three.js';
import {createFireRealism} from '../../../assets/art/fire-realism/index.js';
import {prepareSmokeBillows, smokeBillowFade, smokeBillowHalfHeight} from '../../../assets/art/fire-realism/smoke-billows.js';

if (!vm.SourceTextModule) throw Error('Run with node --experimental-vm-modules');
const frozen = '1505c87f6e251450961283b979941742306b8377', modules = new Map();
function oldModule(file) {
  if (!modules.has(file)) modules.set(file, new vm.SourceTextModule(execFileSync('git', ['show', `${frozen}:${file}`], {encoding: 'utf8'}), {identifier: file}));
  return modules.get(file);
}
const original = oldModule('assets/art/fire-realism/index.js');
await original.link((specifier, source) => oldModule(path.posix.normalize(path.posix.join(path.posix.dirname(source.identifier), specifier))));
await original.evaluate();
const oldEffect = original.namespace.createFireRealism(T, {maxCells: 16}), effect = createFireRealism(T, {maxCells: 16});
const camera = new T.OrthographicCamera(-6, 6, 4, -4, .1, 100); camera.position.set(12, 12, 15); camera.lookAt(6, 0, 6); camera.updateMatrixWorld(true);
const cameraRecord = {kind: 'orthographic', matrixWorldInverse: camera.matrixWorldInverse.toArray()};
const cell = (id, phase = 'burning') => ({id, phase, x: 3.25, y: 3.25, size: .5, intensity: .8, depositedFuel: 0});
const origin = {x: 2, y: 5, h: .85};
const discharge = {version: 1, active: true, tool: 'flamethrower', origin, shapeOrigin: origin, heading: 0, connectRays: true,
  rays: [-.2, 0, .2].map(angle => ({angle, x: 5, y: 5 + Math.tan(angle) * 3, h: .85, distance: 3 / Math.cos(angle)}))};
const building = {id: 'actual', prefabId: 'fixture', destroyed: false, intensity: .8, burnedFraction: .1, sourceBounds: {min: [3, 0, 3], max: [5, 4.24, 6]}, footprintCellIds: ['a'], burningCellIds: ['a'], fireSites: [{id: 'native-front', kind: 'facade', position: [3, 0, 3.25], normal: [-1, 0, 0], baseElevation: 0, span: {width: 1, height: 2}, sourceCellIds: ['a'], sourcePartId: 'fixture-native-wall/front', sourceFaceIndex: 0}]};
const frame = (time, extra = {}) => ({version: 1, tick: Math.round(time * 60), worldTime: time, playerTime: time, paused: false, cells: [cell('a')], camera: cameraRecord,
  player: {x: -5, y: -5, tool: 'torch', radius: .3}, anchors: {muzzle: {x: 2, y: .85, z: 5}, torchTip: {x: 1, y: 1, z: 1}}, torch: {phase: 'lit', remainingSeconds: 4}, discharge, buildingVisuals: [building], events: [], ...extra});
const mesh = e => e.root.children.find(o => o.isMesh);
function sources(e, keep) {
  const g = mesh(e).geometry, ids = e.diagnostics().sortedSemanticIds, result = {};
  for (let i = 0; i < g.instanceCount; i++) {
    const kind = g.attributes.iPolicy.array[i * 3]; if (!keep(kind)) continue;
    if (ids[i].startsWith('building:')) continue; // Native facade contact is the separately accepted0.6 correction.
    result[ids[i]] = Object.fromEntries(['iOrigin', 'iAxis', 'iShape', 'iPolicy'].map(name => {const a = g.attributes[name]; return [name, [...a.array.slice(i * a.itemSize, (i + 1) * a.itemSize)]];}));
  }
  return result;
}
function billows(e) {
  const g = mesh(e).geometry, ids = e.diagnostics().sortedSemanticIds, result = {};
  for (let i = 0; i < g.instanceCount; i++) if ([1, 3].includes(g.attributes.iPolicy.array[i * 3])) {
    result[ids[i]] = Object.fromEntries(['iBillow0', 'iBillow1', 'iBillow2', 'iBillow3', 'iBillowAges'].map(name => [name, [...g.attributes[name].array.slice(i * 4, i * 4 + 4)]]));
  }
  return result;
}
const lightState = e => e.root.children.filter(o => o.isPointLight).map(l => ({p: l.position.toArray(), i: l.intensity}));
try {
  for (const time of [0, .1, .5, 1, 2]) {
    const f = frame(time); oldEffect.update(f); effect.update(f);
    assert.deepEqual(sources(effect, k => k === 0 || k === 2), sources(oldEffect, k => k === 0 || k === 2), 'isolated ground/torch/jet/jet-soot supports remain identical to frozen0.4; regional fronts checked separately');
    assert.deepEqual(lightState(effect), lightState(oldEffect), 'light placement/energy unchanged');
  }
  assert.ok(effect.diagnostics().layers.some(l => l.name === 'Legitimate building smoke'));
  assert.equal(effect.diagnostics().nativeFacadeSites, 1, 'only actual supplied burning building sites receive facade presentation');
  const g = mesh(effect).geometry; assert.ok(Object.keys(g.attributes).length <= 16, 'attributes fit the WebGL2 minimum vertex-attribute budget');
  const ids = effect.diagnostics().sortedSemanticIds;
  for (let i = 0; i < g.instanceCount; i++) {
    const kind = g.attributes.iPolicy.array[i * 3];
    if (kind !== 1 && kind !== 3) {assert.deepEqual([...g.attributes.iBillowAges.array.slice(i * 4, i * 4 + 4)], [0, 0, 0, 0]); continue;}
    const expected = prepareSmokeBillows(g.attributes.iShape.array[i * 4 + 3], effect.diagnostics().worldTime, kind);
    // The uploaded seed has Float32 precision. Both preparation paths must stay
    // within bounded data; visibility/motion still needs the actual shader.
    assert.equal(expected.length, 4);
    for (let j = 0; j < 4; j++) {const age = g.attributes.iBillowAges.array[i * 4 + j]; assert.ok(age >= 0 && age < 1); assert.ok(g.attributes[`iBillow${j}`].array[i * 4 + 3] > 0);}
    if (kind === 1) assert.ok(g.attributes.iShape.array[i * 4 + 1] < 2.2, 'small surface source is not a giant building plume');
  }
  const at2 = billows(effect), resources = effect.diagnostics().resources;
  effect.update(frame(3, {paused: true})); assert.deepEqual(billows(effect), at2, 'pause freezes actual uploaded billow centres/radii/ages');
  effect.update(frame(2, {playerTime: 100})); assert.deepEqual(billows(effect), at2, 'player time cannot accelerate smoke');
  effect.update(frame(2.1)); assert.notDeepEqual(billows(effect), at2, 'world time advances the actual smoke support, not only its opacity/noise');
  effect.reset(); effect.update(frame(2)); assert.deepEqual(billows(effect), at2, 'reset/re-entry reproduces actual parameters at the same clock');
  effect.update(frame(1)); const at1 = billows(effect); effect.reset(); effect.update(frame(1)); assert.deepEqual(billows(effect), at1, 'rewind reproduces support');
  effect.update(frame(2, {cells: [cell('a', 'spent')], buildingVisuals: [], discharge: null, torch: null}));
  effect.update(frame(5.3, {cells: [], buildingVisuals: [], discharge: null, torch: null})); assert.equal(effect.diagnostics().triangles, 0, 'all3.2-second tails expire');
  for (let i = 0; i < 20; i++) {effect.reset(); effect.update(frame(1)); assert.deepEqual(effect.diagnostics().resources, resources);}
  for (const kind of [1, 3]) for (const seed of [0, .137, .5, .999999]) for (const time of [0, .001, .25, 1, 2, 3.2, 37, 3600]) {
    const b = prepareSmokeBillows(seed, time, kind); assert.deepEqual(b, prepareSmokeBillows(seed, time, kind));
    assert.ok(b.some(p => smokeBillowFade(p.age) > .8), 'staggered phases retain a substantial active billow');
    for (const p of b) {assert.ok(p.y + smokeBillowHalfHeight(p.age) <= 1); assert.ok(Math.hypot(p.x, p.z) + p.radius < 1.5);}
  }
  assert.equal(smokeBillowFade(0), 0); assert.equal(smokeBillowFade(1), 0, 'birth wrap has no nonzero-density discontinuity');
  assert.ok(smokeBillowFade(1e-6) < 1e-8 && smokeBillowFade(1 - 1e-6) < 1e-8);
  assert.throws(() => prepareSmokeBillows(NaN, 1), /finite/); assert.throws(() => prepareSmokeBillows(.1, 1, 2), /kind/);
  console.log('PASS: actual uploaded moving smoke support; frozen0.4 isolated flame/torch/jet-soot/light compatibility; bounded typed-source billows; world/pause/reset/rewind; finite tails and stable resources. Regional fronts checked separately; no shader/visual/GPU approval.');
} finally {oldEffect.dispose(); effect.dispose();}
