import * as T from '../../../src/runtime/three.js';
import {createFireRealism} from '../../../assets/art/fire-realism/index.js';
import {resolveDischarge} from '../../../src/simulation/discharge.js';
import {diagnosticSnapshot, cameraRecord, applyFrozenCamera, saveCamera} from './diagnostic-data.js';
import {createFixtureStreamControl} from './diagnostic-stream.js';
import {createFramebufferBlendProbe} from './blend-probe.js';
import {createFrozenDiagnosticScene, prepareFixtureDepth} from './diagnostic-scene.js';
const status = document.querySelector('#status');
let renderer;
try {renderer = new T.WebGLRenderer({antialias: true, alpha: false, preserveDrawingBuffer: true});}
catch (error) {status.className = 'failure'; status.textContent = `WebGL unavailable: ${error.message}\nNo shader or visual acceptance is claimed.`; throw error;}
// Match the published host transform. Exposure/ACES changes cannot mask a
// mismatch between a flattering art preview and the actual runtime.
renderer.setPixelRatio(1); renderer.setSize(1280, 800); renderer.toneMapping = T.NoToneMapping; renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMappingExposure = 1;
renderer.info.autoReset = false; document.querySelector('#viewport').append(renderer.domElement);
const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
const hardware = {browser: navigator.userAgent, vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'unavailable', renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), timerQueries: !!gl.getExtension('EXT_disjoint_timer_query_webgl2'), contextAttributes: gl.getContextAttributes()};
let shaderFailure = null;
renderer.debug.onShaderError = (context, program, vertex, fragment) => {shaderFailure = [context.getProgramInfoLog(program), context.getShaderInfoLog(vertex), context.getShaderInfoLog(fragment)].join('\n');};
const scene = new T.Scene(); scene.background = new T.Color('#b4b69d');
const camera = new T.OrthographicCamera(-5.6, 5.6, 3.5, -3.5, .05, 100); camera.position.set(12, 12, 15); camera.lookAt(6, .4, 6);
scene.add(new T.HemisphereLight(0xf5e3c2, 0x625b45, 2.1));
const sun = new T.DirectionalLight(0xffe7bb, 2.3); sun.position.set(-5, 10, 5); scene.add(sun);
const resources = [], syntheticMeshes = [];
function box(w, h, d, color, x, y, z) {const g = new T.BoxGeometry(w, h, d), m = new T.MeshStandardMaterial({color, roughness: 1}); resources.push(g, m); const mesh = new T.Mesh(g, m); mesh.position.set(x, y, z); scene.add(mesh); syntheticMeshes.push(mesh); return mesh;}
box(12, .12, 12, 0x857b58, 6, -.06, 6);
for (let i = 0; i <= 12; i++) {box(.012, .006, 12, 0xa29773, i, .002, 6); box(12, .006, .012, 0xa29773, 6, .002, i);}
const wall = box(.16, 2, 5, 0x6c4930, 7.4, 1, 6); wall.visible = false;
const house = box(3, 4.24, 3, 0x7d593c, 8.5, 2.12, 6); house.visible = false;
const occluder = box(.56, 1.1, .36, 0x383f35, 6.25, .55, 6.25); occluder.visible = false;
box(.05, 1, .05, 0xe9dcc2, 2, .5, 4);
const head = document.createElement('p'); head.textContent = 'Synthetic fixtures. Grid / scale bar: 1 m. Wall: 2 m × 0.16 m. Building proxy: 3 m × 4.24 m × 3 m. Shared NoToneMapping / sRGB output.'; document.querySelector('#viewport').after(head);
const effect = createFireRealism(T, {quality: 'reference', maxCells: 64}); scene.add(effect.root);
const streamControl = createFixtureStreamControl(T, effect), lifetime = new AbortController();
let frozenData = null, frozenScene = null, frozenPromise = null, nativeLoading = false, frozenKey = null, frozenSnapshot = null, savedEnvironment = null, lastDiagnostic = null, lastProbe = null, blendProbe = null, closed = false, sourceVerification = null, shaderHashes = null, diagnosticDirty = true;
const isDiagnostic = () => document.querySelector('#fixture').value === 'actual-match-diagnostic';
const sha256 = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? new TextEncoder().encode(value) : value))].map(x => x.toString(16).padStart(2, '0')).join('');
const ownedFetch = async url => {const response = await fetch(url, {signal: lifetime.signal}); if (!response.ok) throw Error('Diagnostic source unavailable: ' + response.status); return response;};
async function ensureFrozen() {
  if (frozenPromise) return frozenPromise;
  nativeLoading = true; status.textContent = 'Loading exact frozen source data and existing native ground/bear assets…';
  frozenPromise = (async () => {
    const bytes = await (await ownedFetch(new URL('./fixtures/frozen-match-diagnostic.json', import.meta.url))).arrayBuffer(); frozenData = JSON.parse(new TextDecoder().decode(bytes));
    const manifestBytes = await (await ownedFetch(new URL('../../../assets/art/fire-realism/manifest.json', import.meta.url))).arrayBuffer();
    const manifestRawSha = await sha256(manifestBytes), canonicalManifestSha = await sha256(new TextDecoder().decode(manifestBytes).replaceAll('\r\n', '\n'));
    if (canonicalManifestSha !== frozenData.artistManifestSha256) throw Error('Diagnostic requires the unchanged13ad manifest');
    const files = [];
    for (const item of frozenData.artistManifest.runtimeFiles) {
      if (!item.path.startsWith('assets/art/fire-realism/')) throw Error('Invalid diagnostic runtime source path');
      const data = await (await ownedFetch(new URL('../../../' + item.path, import.meta.url))).arrayBuffer(), hash = await sha256(data);
      if (data.byteLength !== item.bytes || hash !== item.sha256) throw Error('Raw13ad fire source mismatch: ' + item.path);
      files.push({path: item.path, bytes: data.byteLength, sha256: hash, verified: true});
    }
    const backdrop = [];
    for (const [path, expected] of Object.entries(frozenData.backdropSources)) {
      const text = await (await ownedFetch(new URL('../../../' + path, import.meta.url))).text(), hash = await sha256(text.replaceAll('\r\n', '\n'));
      if (hash !== expected) throw Error('Pinned native backdrop source differs: ' + path);
      backdrop.push({path, canonicalLfSha256: hash, verified: true});
    }
    sourceVerification = {artistCommit: frozenData.artistCommit, fixtureDataSha256: await sha256(bytes), runtimeFiles: files, backdropSources: backdrop, manifestRawSha256: manifestRawSha, manifestCanonicalLfSha256: canonicalManifestSha, manifestRawMatches: manifestRawSha === frozenData.artistManifestSha256, manifestCanonicalMatches: true};
    shaderHashes = {original32ExpandedFragment: await sha256(streamControl.source32), diagnostic64ExpandedFragment: await sha256(streamControl.source64), associated32ExpandedFragment: await sha256(streamControl.sourceAssociated32), associated64ExpandedFragment: await sha256(streamControl.sourceAssociated64), hashBasis: 'ShaderMaterial.fragmentShader UTF8: noise/field templates expanded, before Three #include preprocessing', overrideScope: '64: exactly one regional march count/spacing override. Associated: one encoded-RGB multiply by final alpha after colorspace plus matching premultipliedAlpha:true/ONE. Original factory files unchanged'};
    frozenScene = await createFrozenDiagnosticScene(T, renderer, scene, lifetime.signal);
    if (closed) {frozenScene.dispose(); throw new DOMException('Fixture closed', 'AbortError');}
  })();
  try {await frozenPromise;} finally {nativeLoading = false;}
}
function enterFrozenEnvironment() {
  if (savedEnvironment) return;
  const hemi = scene.children.find(o => o.isHemisphereLight);
  savedEnvironment = {camera: saveCamera(camera), background: scene.background?.clone() || null, clear: renderer.getClearColor(new T.Color()).clone(), clearAlpha: renderer.getClearAlpha(), sunColor: sun.color.clone(), sunPosition: sun.position.clone(), sunIntensity: sun.intensity, hemiColor: hemi.color.clone(), hemiGround: hemi.groundColor.clone(), hemiIntensity: hemi.intensity, visibility: syntheticMeshes.map(o => o.visible)};
  for (const o of syntheticMeshes) o.visible = false;
  const env = frozenData.environment; scene.background = null; renderer.setClearColor(env.clearColor); hemi.color.setHex(env.hemi.sky); hemi.groundColor.setHex(env.hemi.ground); hemi.intensity = env.hemi.intensity; sun.color.setHex(env.sun.color); sun.position.fromArray(env.sun.position); sun.intensity = env.sun.intensity;
  frozenScene.root.visible = true;
}
function leaveFrozenEnvironment() {
  if (!savedEnvironment) return;
  const s = savedEnvironment, hemi = scene.children.find(o => o.isHemisphereLight); applyFrozenCamera(camera, s.camera); scene.background = s.background; renderer.setClearColor(s.clear, s.clearAlpha); sun.color.copy(s.sunColor); sun.position.copy(s.sunPosition); sun.intensity = s.sunIntensity; hemi.color.copy(s.hemiColor); hemi.groundColor.copy(s.hemiGround); hemi.intensity = s.hemiIntensity;
  syntheticMeshes.forEach((o, i) => {o.visible = s.visibility[i];}); frozenScene.root.visible = false; savedEnvironment = null; frozenKey = null;
}
const grid = 24, size = .5, mask = new Uint8Array(grid * grid * 4), field = new T.DataTexture(mask, grid, grid); field.minFilter = field.magFilter = T.NearestFilter; field.generateMipmaps = false;
const fieldUniforms = {field: {value: field}, grid: {value: new T.Vector2(grid, grid)}, cellSize: {value: size}};
const depthTexture = new T.DepthTexture(1280, 800, T.UnsignedIntType), depthTarget = new T.WebGLRenderTarget(1280, 800, {depthBuffer: true}); depthTarget.depthTexture = depthTexture;
let worldTime = 0, playerTime = 0, tick = 0, isPaused = true, powder = false, view = 0, dim = false, intersect = false, previous = performance.now(), lastReport = 0, autoPauseAt = null, pendingWorldStep = 0;
const pauseLabel = () => {document.querySelector('#pause').textContent = isPaused ? 'Resume' : 'Pause';};
function reset() {worldTime = playerTime = tick = 0; autoPauseAt = null; pendingWorldStep = 0; isPaused = true; effect.reset(); pauseLabel();}
document.querySelector('#fixture').onchange = async () => {
  reset(); lastProbe = null; lastDiagnostic = null; frozenKey = null; diagnosticDirty = true;
  const diagnostic = isDiagnostic(); document.querySelector('#diagnostic-controls').hidden = !diagnostic; document.querySelector('#diagnostic-output').hidden = !diagnostic;
  for (const id of ['pause', 'reset', 'run-two', 'step', 'powder', 'view', 'light', 'intersect']) document.getElementById(id).disabled = diagnostic;
  if (!diagnostic) {leaveFrozenEnvironment(); return;}
  document.querySelector('#diag-layer').value = 'all'; document.querySelector('#diag-steps').value = '32'; document.querySelector('#diag-association').value = 'straight';
  try {await ensureFrozen(); if (isDiagnostic() && !closed) enterFrozenEnvironment();}
  catch (error) {status.className = 'failure'; status.textContent = 'Diagnostic unavailable: ' + error.message;}
};
document.querySelector('#diag-phase').onchange = () => {frozenKey = null; effect.reset(); lastProbe = null; diagnosticDirty = true;};
for (const id of ['diag-layer', 'diag-steps', 'diag-view', 'diag-association']) document.getElementById(id).onchange = () => {diagnosticDirty = true;};
document.querySelector('#pause').onclick = () => {isPaused = !isPaused; autoPauseAt = null; pauseLabel();};
document.querySelector('#reset').onclick = reset;
document.querySelector('#run-two').onclick = () => {reset(); autoPauseAt = 2; isPaused = false; pauseLabel();};
document.querySelector('#step').onclick = () => {autoPauseAt = null; isPaused = true; pendingWorldStep += .25; pauseLabel();};
document.querySelector('#powder').onclick = e => {powder = !powder; e.target.textContent = `Powder: ${powder ? '.35 world / 1.5 player' : 'off'}`;};
document.querySelector('#view').onclick = e => {view = (view + 1) % 3; camera.position.set(...[[12, 12, 15], [12, 4.5, 14], [-.01, 12, -3]][view]); camera.lookAt(6, .4, 6); e.target.textContent = ['Oblique view', 'Reverse camera', 'Isometric view'][view];};
document.querySelector('#light').onclick = e => {dim = !dim; scene.background.set(dim ? '#292c2c' : '#b4b69d'); sun.intensity = dim ? .16 : 2.3; scene.children.find(o => o.isHemisphereLight).intensity = dim ? .34 : 2.1; e.target.textContent = dim ? 'Bright surroundings' : 'Dim surroundings';};
document.querySelector('#intersect').onclick = e => {intersect = !intersect; e.target.textContent = `Intersecting box: ${intersect ? 'on' : 'off'}`;};
function diagnosticName() {return `DIAGNOSTIC-match-f${document.querySelector('#diag-phase').value}-${document.querySelector('#diag-view').value}-${document.querySelector('#diag-layer').value}-s${document.querySelector('#diag-steps').value}-${document.querySelector('#diag-association').value}`;}
let captureSerial = 0;
async function captureDiagnostic() {
  const serial = ++captureSerial;
  try {
    drawFrozen(true);
    if (!lastDiagnostic || nativeLoading || !savedEnvironment || shaderFailure) throw Error('A valid rendered frozen diagnostic is required before capture');
    const metadata = structuredClone(lastDiagnostic), name = diagnosticName(), dataUrl = renderer.domElement.toDataURL('image/jpeg', .94), bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    metadata.capture = {name, capturedAt: new Date().toISOString(), mimeType: 'image/jpeg', width: renderer.domElement.width, height: renderer.domElement.height, bytes: bytes.byteLength, sha256: await sha256(bytes)};
    if (serial !== captureSerial || closed) return;
    const image = document.querySelector('#diag-capture-image'), link = document.querySelector('#diag-capture-link'); image.src = dataUrl; image.hidden = false; link.href = dataUrl; link.textContent = 'Actual JPEG data · ' + name; link.hidden = false;
    document.querySelector('#diag-capture-label').textContent = 'Frozen actual WebGL capture: ' + name + '. It does not change when controls change.';
    document.querySelector('#diag-capture-metadata').textContent = JSON.stringify(metadata, null, 2);
  } catch (error) {document.querySelector('#diag-capture-label').textContent = 'Capture unavailable: ' + error.message;}
}
document.querySelector('#save').onclick = () => {if (isDiagnostic()) {void captureDiagnostic(); return;} const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/jpeg', .94); a.download = `fire-reference-${document.querySelector('#fixture').value}-${worldTime.toFixed(3)}.jpg`; a.click();};
document.querySelector('#diag-capture').onclick = () => {void captureDiagnostic();};
document.querySelector('#diag-json').onclick = () => {drawFrozen(true); status.scrollIntoView({block: 'nearest'});};
document.querySelector('#diag-probe').onclick = async () => {
  if (!isDiagnostic() || !frozenScene || nativeLoading) return;
  const button = document.querySelector('#diag-probe'); button.disabled = true;
  try {if (shaderFailure) throw Error('A shader failure already exists; probe invalid'); blendProbe ||= createFramebufferBlendProbe(T, renderer); const bodies = Object.fromEntries(await Promise.all(Object.entries(blendProbe.shaderSources).map(async ([name, source]) => [name, await sha256(source)]))); lastProbe = blendProbe.run({redraw: () => drawFrozen(true)}); lastProbe.shaderBodySha256 = bodies; if (shaderFailure) throw Error('Probe shader failed: ' + shaderFailure);}
  catch (error) {lastProbe = {diagnosticOnly: true, status: 'failed', error: error.message, qualityAcceptance: false, performanceAcceptance: false};}
  finally {button.disabled = false;}
  drawFrozen(true);
  if (lastProbe?.rows) {
    const states = [], stateIds = new Map(), rows = lastProbe.rows.map(row => {const key = JSON.stringify(row.blend); if (!stateIds.has(key)) {stateIds.set(key, states.length); states.push(row.blend);} return [row.linearBackdrop, row.linearUnassociatedColor, row.finalAlpha, row.association, row.rgba, stateIds.get(key)];});
    document.querySelector('#diag-probe-result').textContent = JSON.stringify({diagnosticOnly: true, sourceEncoding: lastProbe.sourceEncoding, readbackFormat: lastProbe.readbackFormat, output: lastProbe.output, context: lastProbe.contextAttributes, bits: lastProbe.componentBits, encodingAndType: lastProbe.attachment, enumLegend: lastProbe.enumLegend, shaderBodySha256: lastProbe.shaderBodySha256, shaderHashes, runtime: sourceVerification, restoration: lastProbe.restoration, blendBefore: lastProbe.blendBefore, blendAfterRedraw: lastProbe.blendAfterRedraw, blendStates: states, rowColumns: ['linearBackdrop', 'linearColor', 'finalAlpha', 'association', 'actualRGBA', 'blendStateIndex'], rows}, null, 2);
  } else document.querySelector('#diag-probe-result').textContent = JSON.stringify(lastProbe, null, 2);
};
const complexObstacles = Array.from({length: 80}, (_, i) => ({id: `obstacle-${i}`, kind: 'wall', x: 5 + i % 10 * .11, y: 4.6 + Math.floor(i / 10) * .105, width: .032, depth: .028}));
function draw() {
  const now = performance.now(), dt = Math.min(.05, (now - previous) / 1000); previous = now;
  if (closed || nativeLoading) return;
  if (isDiagnostic()) {drawFrozen(); return;}
  const worldScale = powder ? .35 : 1, playerScale = powder ? 1.5 : 1;
  let framePaused = isPaused, worldDelta = 0, playerDelta = 0;
  if (pendingWorldStep > 0) {worldDelta = pendingWorldStep; pendingWorldStep = 0; framePaused = false;}
  else if (!isPaused) {worldDelta = dt * worldScale; if (autoPauseAt !== null) worldDelta = Math.max(0, Math.min(worldDelta, autoPauseAt - worldTime));}
  playerDelta = worldDelta / worldScale * playerScale;
  if (worldDelta > 0) {worldTime += worldDelta; playerTime += playerDelta; tick++;}
  if (autoPauseAt !== null && worldTime >= autoPauseAt - 1e-9) {worldTime = autoPauseAt; autoPauseAt = null; isPaused = true; pauseLabel();}
  const fixture = document.querySelector('#fixture').value; wall.visible = ['jet', 'short-jet'].includes(fixture); house.visible = fixture === 'building'; occluder.visible = intersect;
  const cells = [], buildingVisuals = []; let torch = null, discharge = null;
  const player = {x: 1, y: 1, elevation: 0, radius: .3, tool: fixture === 'torch' || fixture === 'overlap' ? 'torch' : fixture.includes('jet') ? 'flamethrower' : 'matches'};
  const anchors = {muzzle: {x: 3.5, y: .85, z: 6}, torchTip: {x: 6.25, y: .9, z: fixture === 'overlap' ? 8.25 : 6.25}};
  if (fixture === 'contact') cells.push({id: 'contact', x: 6.25, y: 6.25, size, intensity: .85, material: 'grass', depositedFuel: 0, phase: worldTime < 8 ? 'burning' : 'spent'});
  if (fixture === 'torch' || fixture === 'overlap') torch = {phase: worldTime < 8 ? 'lit' : 'spent', remainingSeconds: Math.max(0, 8 - worldTime)};
  if (fixture === 'overlap') cells.push({id: 'overlap-far', x: 7.25, y: 6.25, size, intensity: .85, depositedFuel: 0, phase: worldTime < 8 ? 'burning' : 'spent'});
  if (fixture === 'trail') for (let i = 0; i < 18; i++) {const age = worldTime - i * .35; cells.push({id: `trail-${i}`, x: 2.25 + i * .5, y: 6.25, size, intensity: .9, depositedFuel: 1, phase: age >= 0 && age < 3 ? 'burning' : 'spent'});}
  if (fixture === 'building') {
    for (let i = 0; i < 3; i++) cells.push({id: `house-${i}`, x: 8.25 + i * .5, y: 7.25, size, intensity: .9, material: 'wood', surfaceFuel: 1, depositedFuel: 0, phase: worldTime < 8 ? 'burning' : 'spent'});
    buildingVisuals.push({id: 'proxy-house', prefabId: 'fixture-only', destroyed: false, burnedFraction: .15, sourceBounds: {min: [7, 0, 4.5], max: [10, 4.24, 7.5]}, footprintCellIds: cells.map(c => c.id), burningCellIds: cells.filter(c => c.phase === 'burning').map(c => c.id), intensity: .9,
      fireSites: cells.filter(c => c.phase === 'burning').map(c => ({id: `proxy-front-${c.id}`, kind: 'facade', position: [c.x, 0, 7.5], normal: [0, 0, 1], baseElevation: 0, span: {width: .5, height: 2}, sourceCellIds: [c.id], sourcePartId: 'fixture-proxy-house/positive-z-face', sourceFaceIndex: 4}))});
  }
  mask.fill(0); for (const c of cells) if (c.phase === 'burning') {const i = (Math.floor(c.y / size) * grid + Math.floor(c.x / size)) * 4; mask.set([0, 0, 0, 255], i);} field.needsUpdate = true;
  if (fixture === 'jet' || fixture === 'short-jet') {
    const o = {x: fixture === 'short-jet' ? 7.22 : 3.5, y: 6, h: .85}, rays = [];
    for (let i = 0; i < 17; i++) {const angle = -.16 + i * .02, distance = (7.32 - o.x) / Math.cos(angle); rays.push({x: o.x + Math.cos(angle) * distance, y: o.y + Math.sin(angle) * distance, h: .85, angle, distance});}
    discharge = {version: 1, tool: 'flamethrower', active: true, origin: o, shapeOrigin: o, heading: 0, connectRays: true, rays};
    anchors.muzzle.x = o.x + (fixture === 'short-jet' ? .5301 : 0);
  }
  if (fixture === 'independent-jet') {
    discharge = resolveDischarge({tick, player: {x: 2, y: 5, tool: 'flamethrower', heading: 0}, obstacles: complexObstacles}, {tools: {presentationHeight: .85, flamethrower: {range: 5, halfAngle: .5}}}, {width: 12, height: 12}); anchors.muzzle = {x: 2.3, y: .85, z: 5};
  }
  camera.updateMatrixWorld(true);
  const cameraState = {kind: 'orthographic', position: {...camera.position}, quaternion: camera.quaternion.toArray(), matrixWorld: camera.matrixWorld.toArray(), matrixWorldInverse: camera.matrixWorldInverse.toArray(), projectionMatrix: camera.projectionMatrix.toArray(), near: camera.near, far: camera.far};
  renderer.info.reset();
  // Fixture objects are all opaque. The combined runtime additionally filters
  // actual transparency/alphaTest and includes this prepass inside GPU timings.
  const targetBefore = renderer.getRenderTarget(), visibleBefore = effect.root.visible;
  try {effect.root.visible = false; renderer.setRenderTarget(depthTarget); renderer.clear(); renderer.render(scene, camera);}
  finally {renderer.setRenderTarget(targetBefore); effect.root.visible = visibleBefore;}
  const opaqueDepth = {valid: true, texture: depthTexture, width: 1280, height: 800, convention: 'webgl-depth-0-1', viewProjectionMatrix: new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).toArray(), projectionMatrixInverse: camera.projectionMatrixInverse.toArray(), cameraWorldMatrix: camera.matrixWorld.toArray()};
  effect.update({version: 1, tick, worldTime, playerTime, worldDelta, playerDelta, paused: framePaused, player, camera: cameraState, viewport: {width: 1280, height: 800, pixelRatio: 1}, cells, discharge, anchors, torch, events: [], eventReceipts: {generation: 1, primed: true, highestId: null, events: [], reset: false}, fieldUniforms, opaqueDepth, buildingVisuals});
  renderer.render(scene, camera);
  if (now - lastReport > 500) {lastReport = now; status.textContent = JSON.stringify({fixture, shaderFailure, hardware, clocks: {worldTime, playerTime, paused: isPaused, powder}, output: {toneMapping: 'NoToneMapping', colorSpace: renderer.outputColorSpace, pixelRatio: renderer.getPixelRatio()}, callsIncludingDepth: renderer.info.render.calls, trianglesIncludingDepth: renderer.info.render.triangles, diagnostics: effect.diagnostics()}, null, 2);}
}
renderer.setAnimationLoop(draw);
function drawFrozen(force = false) {
  if (closed || nativeLoading || !frozenData || !frozenScene || !savedEnvironment) return;
  if (!force && !diagnosticDirty) return;
  const drawingBuffer = renderer.getDrawingBufferSize(new T.Vector2());
  if (drawingBuffer.x !== 1280 || drawingBuffer.y !== 800 || renderer.getPixelRatio() !== 1 || renderer.toneMapping !== T.NoToneMapping || renderer.outputColorSpace !== T.SRGBColorSpace) throw Error('Frozen diagnostic output state differs from pinned source');
  const phase = Number(document.querySelector('#diag-phase').value), chosenView = document.querySelector('#diag-view').value;
  if (frozenKey !== phase) {frozenSnapshot = diagnosticSnapshot(frozenData, phase); frozenScene.update(frozenSnapshot); effect.reset(); frozenKey = phase;}
  applyFrozenCamera(camera, frozenData.cameras[chosenView]); scene.updateMatrixWorld(true); renderer.info.reset();
  const opaqueDepth = prepareFixtureDepth(T, renderer, scene, camera, depthTarget, [effect.root, frozenScene.field.root]);
  const source = frozenSnapshot, cameraState = cameraRecord(camera);
  effect.update({version: 1, tick: source.tick, worldTime: source.clocks.world, playerTime: source.clocks.player, worldDelta: 0, playerDelta: 0, paused: true,
    player: {...source.player, elevation: source.player.elevation || 0}, cells: source.cells, anchors: frozenScene.anchors(), discharge: source.discharge, torch: source.player.torch, events: source.events,
    eventReceipts: {generation: 1, primed: true, highestId: null, events: [], reset: false}, camera: cameraState, viewport: frozenData.viewport, fieldUniforms: frozenScene.field.uniforms, opaqueDepth, buildingVisuals: []});
  const selection = {layer: document.querySelector('#diag-layer').value, steps: Number(document.querySelector('#diag-steps').value), association: document.querySelector('#diag-association').value};
  streamControl.withSelection(selection, () => renderer.render(scene, camera));
  lastDiagnostic = {diagnosticOnly: true, qualityAcceptance: false, performanceAcceptance: false, playedGameplay: false, sourceVerification, shaderHashes,
    selectedExpandedFragmentSha256: selection.association === 'associated' ? selection.steps === 64 ? shaderHashes.associated64ExpandedFragment : shaderHashes.associated32ExpandedFragment : selection.steps === 64 ? shaderHashes.diagnostic64ExpandedFragment : shaderHashes.original32ExpandedFragment,
    source: {commit: frozenData.sourceCommit, frameIndex: phase, tick: source.tick, clocks: source.clocks, originalPaused: source.paused, player: source.player, cells: source.cells.length, burningCellIds: source.cells.filter(c => c.phase === 'burning').map(c => c.id)},
    selection: streamControl.diagnostics(), camera: cameraState, cameraPolicy: frozenData.cameras[chosenView].policy, viewport: frozenData.viewport, environment: frozenData.environment, lightsHeldIdentical: true,
    opaqueDepth: {valid: true, width: opaqueDepth.width, height: opaqueDepth.height, excludes: 'All fire plus transparent/faded/non-depth-writing materials, including heat/char underlay; actual alpha-tested opaque materials retained'}, output: {toneMapping: 'NoToneMapping', colorSpace: renderer.outputColorSpace, exposure: renderer.toneMappingExposure, pixelRatio: renderer.getPixelRatio()},
    shaderFailure, hardware, originalFactoryDiagnostics: effect.diagnostics(), adaptations: [...frozenScene.adaptations, 'Art context retains preserveDrawingBuffer:true for readback/JPG; combined driver leaves that flag at defaultfalse. Actual context/framebuffer information is recorded, not presumed equivalent'], blendProbe: lastProbe};
  status.textContent = JSON.stringify(lastDiagnostic, null, 2);
  diagnosticDirty = false;
}
addEventListener('pagehide', () => {closed = true; lifetime.abort(); renderer.setAnimationLoop(null); blendProbe?.dispose(); streamControl.dispose(); frozenScene?.dispose(); effect.dispose(); field.dispose(); depthTarget.dispose(); for (const r of resources) r.dispose(); renderer.dispose();}, {once: true});
