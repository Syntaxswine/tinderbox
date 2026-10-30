import * as T from '../../../src/runtime/three.js';
import {createFireRealism} from '../../../assets/art/fire-realism/index.js';
const status = document.querySelector('#status');
let renderer;
try { renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true}); }
catch (error) {status.className = 'failure'; status.textContent = `WebGL unavailable: ${error.message}\nNo shader or visual acceptance is claimed.`; throw error;}
renderer.setPixelRatio(1); renderer.setSize(1280, 800); renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
document.querySelector('#viewport').append(renderer.domElement);
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
box(.05, 1, .05, 0xe9dcc2, 2, .5, 4); // Explicit one-metre scale bar.
const head = document.createElement('p'); head.textContent = 'Grid: 1 m. Scale bar: 1 m. Test wall: 2 m tall × 0.16 m thick.'; document.querySelector('#viewport').after(head);
const effect = createFireRealism(T, {quality: 'reference', maxCells: 64}); scene.add(effect.root);
const grid = 24, size = .5, mask = new Uint8Array(grid * grid * 4), field = new T.DataTexture(mask, grid, grid); field.minFilter = field.magFilter = T.NearestFilter; field.generateMipmaps = false;
const fieldUniforms = {field: {value: field}, grid: {value: new T.Vector2(grid, grid)}, cellSize: {value: size}};
let time = 0, tick = 0, isPaused = false, powder = false, oblique = false, dim = false, previous = performance.now(), lastReport = 0;
function reset() {time = tick = 0; effect.reset();}
document.querySelector('#fixture').onchange = reset;
document.querySelector('#pause').onclick = e => {isPaused = !isPaused; e.target.textContent = isPaused ? 'Resume' : 'Pause';};
document.querySelector('#reset').onclick = reset;
document.querySelector('#powder').onclick = e => {powder = !powder; e.target.textContent = `Powder clock: ${powder ? 'on (¼ world speed)' : 'off'}`;};
document.querySelector('#view').onclick = e => {oblique = !oblique; camera.position.set(...(oblique ? [12, 4.5, 14] : [12, 12, 15])); camera.lookAt(6, .4, 6); e.target.textContent = oblique ? 'Isometric view' : 'Oblique view';};
document.querySelector('#light').onclick = e => {dim = !dim; scene.background.set(dim ? '#292c2c' : '#b4b69d'); sun.intensity = dim ? .16 : 2.3; scene.children.find(o => o.isHemisphereLight).intensity = dim ? .34 : 2.1; e.target.textContent = dim ? 'Bright surroundings' : 'Dim surroundings';};
document.querySelector('#save').onclick = () => {const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/jpeg', .94); a.download = `fire-reference-${document.querySelector('#fixture').value}-${time.toFixed(3)}.jpg`; a.click();};
function frame() {
  const now = performance.now(), dt = Math.min(.05, (now - previous) / 1000); previous = now;
  if (!isPaused) {time += dt * (powder ? .25 : 1); tick++;}
  const fixture = document.querySelector('#fixture').value; wall.visible = fixture === 'jet';
  const cells = [], torch = {phase: time < 8 ? 'lit' : 'spent', remainingSeconds: Math.max(0, 8 - time), anchor: {x: 5.1, y: .9, z: 5.1}};
  if (fixture === 'contact') cells.push({id: 'contact', x: 6.25, y: 6.25, size, intensity: .85, depositedFuel: 0, phase: time < 8 ? 'burning' : 'spent'});
  if (fixture === 'trail') for (let i = 0; i < 18; i++) {const started = time - i * .35; cells.push({id: `trail-${i}`, x: 2.25 + i * .5, y: 6.25, size, intensity: .9, depositedFuel: 1, phase: started >= 0 && started < 3 ? 'burning' : 'spent'});}
  mask.fill(0); for (const c of cells) if (c.phase === 'burning') {const i = (Math.floor(c.y / size) * grid + Math.floor(c.x / size)) * 4; mask.set([0, 0, 0, 255], i);} field.needsUpdate = true;
  let discharge = null;
  if (fixture === 'jet') {
    const o = {x: 3.5, y: 6, h: .85}, rays = [];
    for (let i = 0; i < 17; i++) {const angle = -.16 + i * .02, distance = (7.32 - o.x) / Math.cos(angle); rays.push({x: o.x + Math.cos(angle) * distance, y: o.y + Math.sin(angle) * distance, h: .85, angle, distance});}
    discharge = {version: 1, tool: 'flamethrower', active: true, origin: o, shapeOrigin: o, heading: 0, connectRays: true, rays};
  }
  effect.update({version: 1, tick, worldTime: time, playerTime: now / 1000, paused: isPaused, player: {x: 1, y: 1, elevation: 0, radius: .3}, camera: {kind: 'orthographic', position: {x: camera.position.x, y: camera.position.y, z: camera.position.z}, quaternion: camera.quaternion.toArray(), matrixWorld: camera.matrixWorld.toArray(), matrixWorldInverse: camera.matrixWorldInverse.toArray(), projectionMatrix: camera.projectionMatrix.toArray(), near: camera.near, far: camera.far}, viewport: {width: 1280, height: 800, pixelRatio: 1}, cells, discharge, anchors: {muzzle: {x: 3.5, y: .85, z: 6}, torchTip: torch.anchor}, torch: fixture === 'contact' ? torch : null, events: [], fieldUniforms, buildingVisuals: []});
  renderer.render(scene, camera);
  if (now - lastReport > 500) {lastReport = now; status.textContent = JSON.stringify({shaderFailure, hardware, drawCalls: renderer.info.render.calls, renderTriangles: renderer.info.render.triangles, diagnostics: effect.diagnostics()}, null, 2);}
}
renderer.setAnimationLoop(frame);
addEventListener('pagehide', () => {renderer.setAnimationLoop(null); effect.dispose(); field.dispose(); for (const r of resources) r.dispose(); renderer.dispose();}, {once: true});
