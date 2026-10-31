import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as T from '../../../src/runtime/three.js';
import {createFireRealism} from '../../../assets/art/fire-realism/index.js';
import {createGroundField} from '../../../src/art/ground-field.js';
import {diagnosticSnapshot, saveCamera, applyFrozenCamera, cameraRecord} from './diagnostic-data.js';
import {createFixtureStreamControl, regional64Shader} from './diagnostic-stream.js';
import {createFramebufferBlendProbe} from './blend-probe.js';
import {createFrozenDiagnosticScene, prepareFixtureDepth} from './diagnostic-scene.js';

const base = '13ad95c2d131e3dab28e775c1d33c121ea50d5ed';
const manifest = JSON.parse(fs.readFileSync('assets/art/fire-realism/manifest.json'));
for (const path of ['assets/art/fire-realism/manifest.json', ...manifest.runtimeFiles.map(f => f.path)]) assert.deepEqual(fs.readFileSync(path), execFileSync('git', ['show', `${base}:${path}`]), `Frozen runtime bytes changed:${path}`);
const data = JSON.parse(fs.readFileSync(new URL('./fixtures/frozen-match-diagnostic.json', import.meta.url))), frozenJson = JSON.stringify(data);
for (const phase of [15, 30, 60, 120]) {
  const s = diagnosticSnapshot(data, phase); assert.equal(s.cells.length, 1280); assert.equal(s.cells.filter(c => c.phase === 'burning').length, 4);
  assert.equal(s.player.x, 4.25); assert.equal(s.player.y, 8.25); assert.equal(s.player.radius, .56); assert.ok(Math.abs(s.clocks.world - phase / 60) < 1e-12);
  s.cells[0].heat = 999; s.player.x = 999; s.world.width = 999; assert.notEqual(diagnosticSnapshot(data, phase).cells[0].heat, 999);
}
assert.equal(JSON.stringify(data), frozenJson); assert.throws(() => diagnosticSnapshot(data, 999), /Unknown/);
const camera = new T.OrthographicCamera(-5, 5, 4, -4, .05, 100); camera.position.set(12, 12, 15); camera.lookAt(6, .4, 6); camera.updateMatrixWorld();
const prior = saveCamera(camera); applyFrozenCamera(camera, data.cameras.isometric); assert.ok(camera.matrixWorld.toArray().every((v, i) => v === data.cameras.isometric.matrixWorld[i])); assert.ok(camera.projectionMatrix.toArray().every((v, i) => v === data.cameras.isometric.projectionMatrix[i]), 'JSON signed-zero normalization has no projection effect'); applyFrozenCamera(camera, prior); assert.deepEqual(saveCamera(camera), prior);
applyFrozenCamera(camera, data.cameras.isometric);
const snapshot = diagnosticSnapshot(data, 60), field = createGroundField(T); field.update(snapshot);
assert.deepEqual(field.uniforms.grid.value.toArray(), [40, 32]); assert.equal(field.uniforms.cellSize.value, .5);
assert.equal([...field.uniforms.field.value.image.data].filter((v, i) => i % 4 === 3 && v === 1).length, 4);
const effect = createFireRealism(T, {maxCells: 64});
effect.update({version: 1, tick: snapshot.tick, worldTime: snapshot.clocks.world, playerTime: snapshot.clocks.player, paused: false, player: snapshot.player, cells: snapshot.cells, camera: cameraRecord(camera), fieldUniforms: field.uniforms});
const mesh = effect.root.children.find(o => o.isMesh), geometry = mesh.geometry, original = mesh.material, control = createFixtureStreamControl(T, effect);
const attrs = () => Object.fromEntries(Object.entries(geometry.attributes).map(([name, a]) => [name, [...a.array]]));
const initial = attrs(), ids = effect.diagnostics().sortedSemanticIds, count = geometry.instanceCount, lights = effect.root.children.filter(o => o.isPointLight).map(o => [o.position.toArray(), o.intensity]);
const expected64 = original.fragmentShader.replace('      float stepSize=(exit-entry)/32.;\n      for(int j=0;j<32;j++) {', '      float stepSize=(exit-entry)/64.;\n      for(int j=0;j<64;j++) {');
assert.equal(regional64Shader(original.fragmentShader), expected64); assert.throws(() => regional64Shader(original.fragmentShader + original.fragmentShader), /exactly one/);
assert.throws(() => regional64Shader(expected64), /exactly one/);
let originalDisposed = 0, borrowedDisposed = 0; original.addEventListener('dispose', () => originalDisposed++); field.uniforms.field.value.addEventListener('dispose', () => borrowedDisposed++);
const derivedMaterials = new Set(), derivedDisposal = new Map();
for (const layer of ['all', 'flame', 'smoke']) for (const steps of [32, 64]) {
  const versions = Object.fromEntries(Object.entries(geometry.attributes).map(([n, a]) => [n, a.version]));
  control.withSelection({layer, steps}, () => {
    const selected = control.diagnostics(); assert.equal(geometry.instanceCount, selected.submittedInstances); assert.equal(selected.originalInstances, count);
    assert.deepEqual(selected.selectedSemanticIds, ids.filter((_, i) => layer === 'all' || (layer === 'flame' ? initial.iPolicy[i * 3] < .5 : initial.iPolicy[i * 3] >= .5)));
    if (steps === 32) assert.equal(mesh.material, original);
    else {assert.notEqual(mesh.material, original); assert.equal(mesh.material.fragmentShader, expected64); assert.equal(mesh.material.uniforms, original.uniforms); if (!derivedMaterials.has(mesh.material)) {derivedMaterials.add(mesh.material); derivedDisposal.set(mesh.material, 0); const m = mesh.material; m.addEventListener('dispose', () => derivedDisposal.set(m, derivedDisposal.get(m) + 1));}}
  });
  assert.equal(mesh.material, original); assert.equal(geometry.instanceCount, count); assert.deepEqual(attrs(), initial); assert.deepEqual(effect.diagnostics().sortedSemanticIds, ids);
  assert.deepEqual(effect.root.children.filter(o => o.isPointLight).map(o => [o.position.toArray(), o.intensity]), lights);
  if (layer === 'all' && steps === 32) assert.deepEqual(Object.fromEntries(Object.entries(geometry.attributes).map(([n, a]) => [n, a.version])), versions, 'Default All32 does not even rewrite arrays/update hints');
}
assert.throws(() => control.withSelection({layer: 'smoke', steps: 64}, () => {throw Error('simulated draw failure');}), /draw failure/);
assert.equal(mesh.material, original); assert.equal(geometry.instanceCount, count); assert.deepEqual(attrs(), initial);
control.dispose(); control.dispose(); for (const value of derivedDisposal.values()) assert.equal(value, 1); assert.equal(originalDisposed, 0); assert.equal(borrowedDisposed, 0);
effect.dispose(); assert.equal(originalDisposed, 1); assert.equal(borrowedDisposed, 0); field.dispose(); assert.equal(borrowedDisposed, 1);

// No mocked pixel is visual evidence. This fake surface tests public-state
// restoration, material association scope and resource cleanup, including throw.
function fakeRenderer() {
  const state = {viewport: new T.Vector4(0, 0, 1280, 800), scissor: new T.Vector4(3, 4, 5, 6), scissorTest: false, material: null, readThrows: false, disposed: new Map(), seen: new Set()};
  const gl = {NO_ERROR: 0, FRAMEBUFFER: 1, BACK: 2, FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING: 3, FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE: 4, BLEND: 5, RGBA: 6, UNSIGNED_BYTE: 7,
    getError: () => 0, getContextAttributes: () => ({syntheticLifecycleTest: true}), getFramebufferAttachmentParameter: () => 0, isEnabled: () => state.material?.blending !== T.NoBlending,
    getParameter: () => 0, readPixels(x, y, w, h, format, type, bytes) {if (state.readThrows) throw Error('simulated read failure'); bytes.set([7, 8, 9, 255]);}};
  const renderer = {autoClear: true, toneMapping: T.NoToneMapping, outputColorSpace: T.SRGBColorSpace, toneMappingExposure: 1,
    getContext: () => gl, getRenderTarget: () => null, getPixelRatio: () => 1, getViewport: out => out.copy(state.viewport), getScissor: out => out.copy(state.scissor), getScissorTest: () => state.scissorTest,
    setViewport(v) {state.viewport.copy(v);}, setScissor(...args) {args.length === 1 ? state.scissor.copy(args[0]) : state.scissor.set(...args);}, setScissorTest(v) {state.scissorTest = v;},
    render(scene) {const mesh = scene.children[0]; state.material = mesh.material; for (const resource of [mesh.geometry, mesh.material]) if (!state.seen.has(resource)) {state.seen.add(resource); state.disposed.set(resource, 0); resource.addEventListener('dispose', () => state.disposed.set(resource, state.disposed.get(resource) + 1));}
      if (mesh.material.premultipliedAlpha) {assert.equal(mesh.material.blending, T.NormalBlending); assert.ok(mesh.material.fragmentShader.indexOf('gl_FragColor.rgb*=gl_FragColor.a') > mesh.material.fragmentShader.indexOf('colorspace_fragment'));}
    }};
  return {renderer, state};
}
const fake = fakeRenderer(), probe = createFramebufferBlendProbe(T, fake.renderer), beforeViewport = fake.state.viewport.toArray(), beforeScissor = fake.state.scissor.toArray(); let redrawn = 0;
const result = probe.run({redraw() {redrawn++;}, colors: [.25, 1.65], alphas: [.25], backgrounds: [.18]});
assert.equal(result.rows.length, 4); assert.equal(result.qualityAcceptance, false); assert.equal(result.performanceAcceptance, false); assert.equal(redrawn, 1);
assert.deepEqual(fake.state.viewport.toArray(), beforeViewport); assert.deepEqual(fake.state.scissor.toArray(), beforeScissor); assert.equal(fake.state.scissorTest, false); assert.equal(fake.renderer.autoClear, true);
fake.state.readThrows = true; assert.throws(() => probe.run({redraw() {redrawn++;}, colors: [.25], alphas: [.25], backgrounds: [0]}), /read failure/); assert.equal(redrawn, 2);
assert.deepEqual(fake.state.viewport.toArray(), beforeViewport); assert.deepEqual(fake.state.scissor.toArray(), beforeScissor); assert.equal(fake.state.scissorTest, false); assert.equal(fake.renderer.autoClear, true);
probe.dispose(); probe.dispose(); for (const count of fake.state.disposed.values()) assert.equal(count, 1);

const depthScene = new T.Scene(), excluded = new T.Group(), opaque = new T.MeshBasicMaterial({alphaTest: .5}), transparent = new T.MeshBasicMaterial({transparent: true}), faded = new T.MeshBasicMaterial({opacity: .18}), noDepth = new T.MeshBasicMaterial({depthWrite: false});
depthScene.add(excluded); for (const material of [opaque, transparent, faded, noDepth]) depthScene.add(new T.Mesh(new T.BoxGeometry(), material));
const ds = {target: null, viewport: new T.Vector4(1, 2, 3, 4), scissor: new T.Vector4(5, 6, 7, 8), test: true, fail: false};
const dr = {autoClear: false, shadowMap: {autoUpdate: true}, getDrawingBufferSize: out => out.set(1280, 800), getRenderTarget: () => ds.target, getViewport: out => out.copy(ds.viewport), getScissor: out => out.copy(ds.scissor), getScissorTest: () => ds.test,
  setRenderTarget(v) {ds.target = v;}, setViewport(...v) {v.length === 1 ? ds.viewport.copy(v[0]) : ds.viewport.set(...v);}, setScissor(v) {ds.scissor.copy(v);}, setScissorTest(v) {ds.test = v;}, clear() {}, render() {assert.equal(excluded.visible, false); assert.equal(opaque.visible, true); assert.equal(opaque.alphaTest, .5); for (const m of [transparent, faded, noDepth]) assert.equal(m.visible, false); if (ds.fail) throw Error('depth draw failed');}};
const depth = new T.DepthTexture(1280, 800), target = {depthTexture: depth};
assert.equal(prepareFixtureDepth(T, dr, depthScene, camera, target, [excluded]).texture, depth);
ds.fail = true; assert.throws(() => prepareFixtureDepth(T, dr, depthScene, camera, target, [excluded]), /depth draw failed/);
assert.equal(ds.target, null); assert.deepEqual(ds.viewport.toArray(), [1, 2, 3, 4]); assert.deepEqual(ds.scissor.toArray(), [5, 6, 7, 8]); assert.equal(ds.test, true); assert.equal(dr.autoClear, false); assert.equal(dr.shadowMap.autoUpdate, true); assert.equal(excluded.visible, true); for (const m of [opaque, transparent, faded, noDepth]) assert.equal(m.visible, true);
for (const o of depthScene.children) if (o.isMesh) o.geometry.dispose(); for (const m of [opaque, transparent, faded, noDepth]) m.dispose(); depth.dispose();

// Partial asset failure/abort must release already-owned and late textures.
const texture = () => {const value = new T.Texture(); value.releases = 0; value.addEventListener('dispose', () => value.releases++); return value;};
const failedTexture = texture(); let loads = 0;
class FailedLoader {loadAsync() {return ++loads === 1 ? Promise.resolve(failedTexture) : Promise.reject(Error('expected loader failure'));}}
await assert.rejects(createFrozenDiagnosticScene({...T, TextureLoader: FailedLoader}, {}, new T.Scene()), /textures unavailable/); assert.equal(failedTexture.releases, 1);
const first = texture(), late = texture(), abort = new AbortController(); let finishLate, index = 0;
class DelayedLoader {loadAsync() {return ++index === 1 ? Promise.resolve(first) : new Promise(resolve => {finishLate = resolve;});}}
const pending = createFrozenDiagnosticScene({...T, TextureLoader: DelayedLoader}, {}, new T.Scene(), abort.signal);
await Promise.resolve(); await Promise.resolve(); abort.abort(); finishLate(late); await assert.rejects(pending, /Fixture closed/); assert.equal(first.releases, 1); assert.equal(late.releases, 1);
console.log('PASS: exact six13ad files unchanged; lossless native phases/player/mask/camera; All32 zero-mutation path; filtered/64 roundtrip + throw restoration; override scope and borrowed texture ownership; blend probe association/state/cleanup guards; async native asset failure/abort cleanup. NO actual WebGL readback, shader, image, quality or performance acceptance.');
