import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as T from '../../../src/runtime/three.js';
import {createFireRealism} from './control-08/index.js';
import {createGroundField} from './control-08/native-underlay/ground-field.js';
import {diagnosticSnapshot, saveCamera, applyFrozenCamera, cameraRecord} from './diagnostic-data.js';
import {createFixtureStreamControl, regional64Shader, associatedFieldShader} from './diagnostic-stream.js';
import {createFramebufferBlendProbe} from './blend-probe.js';
import {createFrozenDiagnosticScene, prepareFixtureDepth} from './diagnostic-scene.js';

const base = '13ad95c2d131e3dab28e775c1d33c121ea50d5ed';
const controlRoot = 'workbenches/art/fire-realism/control-08/';
const manifest = JSON.parse(fs.readFileSync(controlRoot + 'manifest.json'));
const provenance = JSON.parse(fs.readFileSync(controlRoot + 'provenance.json')); assert.equal(provenance.sourceCommit, base); assert.equal(provenance.files.length, 6);
for (const path of ['assets/art/fire-realism/manifest.json', ...manifest.runtimeFiles.map(f => f.path)]) assert.deepEqual(fs.readFileSync(controlRoot + path.split('/').at(-1)), execFileSync('git', ['show', `${base}:${path}`]), `Immutable control bytes changed:${path}`);
for (const record of provenance.files) {
  assert.equal(record.localPath, controlRoot + record.sourcePath.split('/').at(-1));
  const bytes = fs.readFileSync(record.localPath); assert.equal(bytes.length, record.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256);
  if (record.localPath.endsWith('.js')) for (const match of bytes.toString('utf8').matchAll(/from ['"]([^'"]+)['"]/g)) {assert.ok(match[1].startsWith('./')); assert.ok(fs.existsSync(controlRoot + match[1].slice(2)));}
}
const underlayRoot = controlRoot + 'native-underlay/', underlay = JSON.parse(fs.readFileSync(underlayRoot + 'provenance.json'));
assert.equal(underlay.sourceCommit, base); assert.equal(underlay.files.length, 2);
for (const record of underlay.files) {
  const bytes = fs.readFileSync(record.actualPath); assert.deepEqual(bytes, execFileSync('git', ['show', `${base}:${record.historicalPath}`]));
  assert.equal(execFileSync('git', ['hash-object', '--stdin'], {input: bytes, encoding: 'utf8'}).trim(), record.sourceGitBlob);
  assert.equal(bytes.length, record.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256);
  for (const match of bytes.toString('utf8').matchAll(/from ['"]([^'"]+)['"]/g)) {assert.ok(match[1].startsWith('./')); assert.ok(fs.existsSync(underlayRoot + match[1].slice(2)));}
}
assert.equal(underlay.files[0].sourceGitBlob, '70e52816a31a74909478bd29464a04f7668329e4');
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
const nativeUnderlayMesh = field.root.children.find(o => o.isMesh); assert.equal(nativeUnderlayMesh.renderOrder, 1, 'Immutable08 keeps the historical stage, independent of the active runtime order correction');
const underlayGeometry = nativeUnderlayMesh.geometry, underlayMaterial = nativeUnderlayMesh.material; let underlayGeoDisposed = 0, underlayMatDisposed = 0;
underlayGeometry.addEventListener('dispose', () => underlayGeoDisposed++); underlayMaterial.addEventListener('dispose', () => underlayMatDisposed++);
for (const phase of [15, 30, 120]) {const before = field.uniforms.field.value; field.update(diagnosticSnapshot(data, phase)); assert.equal(field.uniforms.field.value, before); assert.equal(nativeUnderlayMesh.renderOrder, 1);}
field.update(snapshot);
assert.deepEqual(field.uniforms.grid.value.toArray(), [40, 32]); assert.equal(field.uniforms.cellSize.value, .5);
assert.equal([...field.uniforms.field.value.image.data].filter((v, i) => i % 4 === 3 && v === 1).length, 4);
const effect = createFireRealism(T, {maxCells: 64});
effect.update({version: 1, tick: snapshot.tick, worldTime: snapshot.clocks.world, playerTime: snapshot.clocks.player, paused: false, player: snapshot.player, cells: snapshot.cells, camera: cameraRecord(camera), fieldUniforms: field.uniforms});
const mesh = effect.root.children.find(o => o.isMesh), geometry = mesh.geometry, original = mesh.material, control = createFixtureStreamControl(T, effect);
const attrs = () => Object.fromEntries(Object.entries(geometry.attributes).map(([name, a]) => [name, [...a.array]]));
let fieldAfterCalls = 0; const priorAfterRender = function() {fieldAfterCalls++;}; mesh.onAfterRender = priorAfterRender;
const initial = attrs(), ids = effect.diagnostics().sortedSemanticIds, count = geometry.instanceCount, lights = effect.root.children.filter(o => o.isPointLight).map(o => [o.position.toArray(), o.intensity]);
const expected64 = original.fragmentShader.replace('      float stepSize=(exit-entry)/32.;\n      for(int j=0;j<32;j++) {', '      float stepSize=(exit-entry)/64.;\n      for(int j=0;j<64;j++) {');
assert.equal(regional64Shader(original.fragmentShader), expected64); assert.throws(() => regional64Shader(original.fragmentShader + original.fragmentShader), /exactly one/);
assert.throws(() => regional64Shader(expected64), /exactly one/);
const insertion = '#include <colorspace_fragment>\n    gl_FragColor.rgb*=gl_FragColor.a;', expectedAssociated32 = original.fragmentShader.replace('#include <colorspace_fragment>', insertion), expectedAssociated64 = expected64.replace('#include <colorspace_fragment>', insertion);
assert.equal(associatedFieldShader(original.fragmentShader), expectedAssociated32); assert.equal(associatedFieldShader(expected64), expectedAssociated64);
assert.equal(regional64Shader(expectedAssociated32), expectedAssociated64, 'The two narrowly scoped overrides commute');
assert.equal(expectedAssociated32.replace(insertion, '#include <colorspace_fragment>'), original.fragmentShader);
assert.throws(() => associatedFieldShader(original.fragmentShader + original.fragmentShader), /Unknown final/);
assert.throws(() => associatedFieldShader(expectedAssociated32), /Unknown final/, 'Already-associated output cannot be associated twice');
assert.throws(() => associatedFieldShader(original.fragmentShader.replace('alpha*legibility);', 'alpha);')), /Unknown final/);
assert.throws(() => control.withSelection({association: 'state-only'}, () => {}), /Unknown fixture/);
assert.equal(original.blending, T.NormalBlending); assert.equal(original.premultipliedAlpha, false);
const fakeFieldGL = {BLEND: 3042, BLEND_SRC_RGB: 32969, BLEND_DST_RGB: 32968, BLEND_SRC_ALPHA: 32971, BLEND_DST_ALPHA: 32970, BLEND_EQUATION_RGB: 32777, BLEND_EQUATION_ALPHA: 34877, ONE: 1, SRC_ALPHA: 770, ONE_MINUS_SRC_ALPHA: 771, FUNC_ADD: 32774,
  isEnabled: () => true, getParameter(name) {return name === this.BLEND_SRC_RGB ? mesh.material.premultipliedAlpha ? this.ONE : this.SRC_ALPHA : name === this.BLEND_DST_RGB || name === this.BLEND_DST_ALPHA ? this.ONE_MINUS_SRC_ALPHA : name === this.BLEND_SRC_ALPHA ? this.ONE : this.FUNC_ADD;}};

let originalDisposed = 0, borrowedDisposed = 0; original.addEventListener('dispose', () => originalDisposed++); field.uniforms.field.value.addEventListener('dispose', () => borrowedDisposed++);
const derivedMaterials = new Set(), derivedDisposal = new Map();
for (const layer of ['all', 'flame', 'smoke']) for (const steps of [32, 64]) for (const association of ['straight', 'associated']) {
  const versions = Object.fromEntries(Object.entries(geometry.attributes).map(([n, a]) => [n, a.version]));
  control.withSelection({layer, steps, association}, () => {
    const selected = control.diagnostics(); assert.equal(geometry.instanceCount, selected.submittedInstances); assert.equal(selected.originalInstances, count);
    assert.deepEqual(selected.selectedSemanticIds, ids.filter((_, i) => layer === 'all' || (layer === 'flame' ? initial.iPolicy[i * 3] < .5 : initial.iPolicy[i * 3] >= .5)));
    if (steps === 32 && association === 'straight') assert.equal(mesh.material, original);
    else {assert.notEqual(mesh.material, original); assert.equal(mesh.material.fragmentShader, association === 'associated' ? steps === 64 ? expectedAssociated64 : expectedAssociated32 : expected64); assert.equal(mesh.material.uniforms, original.uniforms); if (!derivedMaterials.has(mesh.material)) {derivedMaterials.add(mesh.material); derivedDisposal.set(mesh.material, 0); const m = mesh.material; m.addEventListener('dispose', () => derivedDisposal.set(m, derivedDisposal.get(m) + 1));}}
    assert.equal(mesh.material.premultipliedAlpha, association === 'associated'); assert.equal(mesh.material.blending, original.blending);
    for (const key of ['vertexShader', 'name', 'transparent', 'depthWrite', 'depthTest', 'side', 'toneMapped', 'forceSinglePass', 'blendSrc', 'blendDst', 'blendEquation', 'blendSrcAlpha', 'blendDstAlpha', 'blendEquationAlpha']) assert.equal(mesh.material[key], original[key], `Unchanged render property:${key}`);
    assert.deepEqual(mesh.material.defines, original.defines);
    mesh.onAfterRender({getContext: () => fakeFieldGL});
    assert.equal(control.diagnostics().fieldDraw.values[0].value, association === 'associated' ? 1 : 770, 'Recorder samples actual provided draw state; this fake is lifecycle evidence only');
  });
  assert.equal(mesh.onAfterRender, priorAfterRender); assert.equal(mesh.material, original); assert.equal(geometry.instanceCount, count); assert.deepEqual(attrs(), initial); assert.deepEqual(effect.diagnostics().sortedSemanticIds, ids);
  assert.deepEqual(effect.root.children.filter(o => o.isPointLight).map(o => [o.position.toArray(), o.intensity]), lights);
  if (layer === 'all' && steps === 32 && association === 'straight') assert.deepEqual(Object.fromEntries(Object.entries(geometry.attributes).map(([n, a]) => [n, a.version])), versions, 'Default All32 does not even rewrite arrays/update hints');
}
assert.throws(() => control.withSelection({layer: 'smoke', steps: 64, association: 'associated'}, () => {throw Error('simulated draw failure');}), /draw failure/);
assert.equal(mesh.material, original); assert.equal(geometry.instanceCount, count); assert.deepEqual(attrs(), initial);
assert.equal(fieldAfterCalls, 12); assert.equal(derivedMaterials.size, 3); assert.equal(control.diagnostics().maximumDerivedMaterials, 3); assert.equal(control.diagnostics().cachedDerivedMaterials, 3); assert.equal(mesh.onAfterRender, priorAfterRender);
control.dispose(); control.dispose(); for (const value of derivedDisposal.values()) assert.equal(value, 1); assert.equal(originalDisposed, 0); assert.equal(borrowedDisposed, 0);
effect.dispose(); assert.equal(originalDisposed, 1); assert.equal(borrowedDisposed, 0); field.dispose(); field.dispose(); assert.equal(borrowedDisposed, 1); assert.equal(underlayGeoDisposed, 1); assert.equal(underlayMatDisposed, 1); assert.deepEqual(field.counts(), {geometries: 0, materials: 0, textures: 0, objects: 0});

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
console.log('PASS: exact six13ad control +two archived native underlay blobs/closure unchanged; original order1, native RGBA/mask and one-time disposal; lossless native phases/player/mask/camera; All32 zero-mutation path; all12 layer/sample/association roundtrips + throw/hook restoration; exact sampling + final-alpha association override scope and borrowed texture ownership; blend probe association/state/cleanup guards; async native asset failure/abort cleanup. NO actual WebGL readback, shader, image, quality or performance acceptance.');
