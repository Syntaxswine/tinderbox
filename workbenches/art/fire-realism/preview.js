import * as T from '../../../src/runtime/three.js';
import {createFireRealism} from '../../../assets/art/fire-realism/index.js';
import {resolveDischarge} from '../../../src/simulation/discharge.js';
const status = document.querySelector('#status');
let renderer;
try {renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});}
catch (error) {status.className = 'failure'; status.textContent = `WebGL unavailable: ${error.message}\nNo shader or visual acceptance is claimed.`; throw error;}
// Match the published host transform. Exposure/ACES changes cannot mask a
// mismatch between a flattering art preview and the actual runtime.
renderer.setPixelRatio(1); renderer.setSize(1280, 800); renderer.toneMapping = T.NoToneMapping; renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMappingExposure = 1;
renderer.info.autoReset = false; document.querySelector('#viewport').append(renderer.domElement);
const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
const hardware = {browser: navigator.userAgent, vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'unavailable', renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), timerQueries: !!gl.getExtension('EXT_disjoint_timer_query_webgl2')};
let shaderFailure = null;
renderer.debug.onShaderError = (context, program, vertex, fragment) => {shaderFailure = [context.getProgramInfoLog(program), context.getShaderInfoLog(vertex), context.getShaderInfoLog(fragment)].join('\n');};
const scene = new T.Scene(); scene.background = new T.Color('#b4b69d');
const camera = new T.OrthographicCamera(-5.6, 5.6, 3.5, -3.5, .05, 100); camera.position.set(12, 12, 15); camera.lookAt(6, .4, 6);
scene.add(new T.HemisphereLight(0xf5e3c2, 0x625b45, 2.1));
const sun = new T.DirectionalLight(0xffe7bb, 2.3); sun.position.set(-5, 10, 5); scene.add(sun);
const resources = [];
function box(w, h, d, color, x, y, z) {const g = new T.BoxGeometry(w, h, d), m = new T.MeshStandardMaterial({color, roughness: 1}); resources.push(g, m); const mesh = new T.Mesh(g, m); mesh.position.set(x, y, z); scene.add(mesh); return mesh;}
box(12, .12, 12, 0x857b58, 6, -.06, 6);
for (let i = 0; i <= 12; i++) {box(.012, .006, 12, 0xa29773, i, .002, 6); box(12, .006, .012, 0xa29773, 6, .002, i);}
const wall = box(.16, 2, 5, 0x6c4930, 7.4, 1, 6); wall.visible = false;
const house = box(3, 4.24, 3, 0x7d593c, 8.5, 2.12, 6); house.visible = false;
const occluder = box(.56, 1.1, .36, 0x383f35, 6.25, .55, 6.25); occluder.visible = false;
box(.05, 1, .05, 0xe9dcc2, 2, .5, 4);
const head = document.createElement('p'); head.textContent = 'Synthetic fixtures. Grid / scale bar: 1 m. Wall: 2 m × 0.16 m. Building proxy: 3 m × 4.24 m × 3 m. Shared NoToneMapping / sRGB output.'; document.querySelector('#viewport').after(head);
const effect = createFireRealism(T, {quality: 'reference', maxCells: 64}); scene.add(effect.root);
const grid = 24, size = .5, mask = new Uint8Array(grid * grid * 4), field = new T.DataTexture(mask, grid, grid); field.minFilter = field.magFilter = T.NearestFilter; field.generateMipmaps = false;
const fieldUniforms = {field: {value: field}, grid: {value: new T.Vector2(grid, grid)}, cellSize: {value: size}};
const depthTexture = new T.DepthTexture(1280, 800, T.UnsignedIntType), depthTarget = new T.WebGLRenderTarget(1280, 800, {depthBuffer: true}); depthTarget.depthTexture = depthTexture;
let worldTime = 0, playerTime = 0, tick = 0, isPaused = true, powder = false, view = 0, dim = false, intersect = false, previous = performance.now(), lastReport = 0, autoPauseAt = null, pendingWorldStep = 0;
const pauseLabel = () => {document.querySelector('#pause').textContent = isPaused ? 'Resume' : 'Pause';};
function reset() {worldTime = playerTime = tick = 0; autoPauseAt = null; pendingWorldStep = 0; isPaused = true; effect.reset(); pauseLabel();}
document.querySelector('#fixture').onchange = reset;
document.querySelector('#pause').onclick = () => {isPaused = !isPaused; autoPauseAt = null; pauseLabel();};
document.querySelector('#reset').onclick = reset;
document.querySelector('#run-two').onclick = () => {reset(); autoPauseAt = 2; isPaused = false; pauseLabel();};
document.querySelector('#step').onclick = () => {autoPauseAt = null; isPaused = true; pendingWorldStep += .25; pauseLabel();};
document.querySelector('#powder').onclick = e => {powder = !powder; e.target.textContent = `Powder: ${powder ? '.35 world / 1.5 player' : 'off'}`;};
document.querySelector('#view').onclick = e => {view = (view + 1) % 3; camera.position.set(...[[12, 12, 15], [12, 4.5, 14], [-.01, 12, -3]][view]); camera.lookAt(6, .4, 6); e.target.textContent = ['Oblique view', 'Reverse camera', 'Isometric view'][view];};
document.querySelector('#light').onclick = e => {dim = !dim; scene.background.set(dim ? '#292c2c' : '#b4b69d'); sun.intensity = dim ? .16 : 2.3; scene.children.find(o => o.isHemisphereLight).intensity = dim ? .34 : 2.1; e.target.textContent = dim ? 'Bright surroundings' : 'Dim surroundings';};
document.querySelector('#intersect').onclick = e => {intersect = !intersect; e.target.textContent = `Intersecting box: ${intersect ? 'on' : 'off'}`;};
document.querySelector('#save').onclick = () => {const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/jpeg', .94); a.download = `fire-reference-${document.querySelector('#fixture').value}-${worldTime.toFixed(3)}.jpg`; a.click();};
const complexObstacles = Array.from({length: 80}, (_, i) => ({id: `obstacle-${i}`, kind: 'wall', x: 5 + i % 10 * .11, y: 4.6 + Math.floor(i / 10) * .105, width: .032, depth: .028}));
function draw() {
  const now = performance.now(), dt = Math.min(.05, (now - previous) / 1000); previous = now;
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
addEventListener('pagehide', () => {renderer.setAnimationLoop(null); effect.dispose(); field.dispose(); depthTarget.dispose(); for (const r of resources) r.dispose(); renderer.dispose();}, {once: true});
