import * as THREE from './three.js';
import {createSimulation} from '../simulation/index.js';
import {configuration} from '../simulation/config.js';
import {createCameraRig} from './camera.js';
import {createDiagnosticScene} from './diagnostics.js';
export {THREE};
// Composition adapter. Supplied factories use the public milestone v1 API.
export async function createRuntime({root, uiRoot = root, createArtScene, mountUI, assetBaseUrl,
  simulation, seed, scenario, config, autoStart = true, onSnapshot = () => {}, onError = error => console.error(error)} = {}) {
  if (!root) throw Error('A viewport root is required');
  const settings = configuration(config);
  const sim = simulation ?? createSimulation({seed, scenario, config});
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x172126); root.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff1d1, 0x334852, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5); sun.position.set(-8, 16, 6); scene.add(sun);
  let snapshot = sim.snapshot(), art, ui, animation, disposed = false, lastTime = null;
  const controller = new AbortController(), signal = controller.signal;
  const camera = createCameraRig(root, renderer, snapshot.world, {x: settings.input.cameraX, h: 14, y: settings.input.cameraY});
  const observer = new ResizeObserver(() => {
    camera.resize();
    if (art && !disposed) try { present(snapshot, 0); } catch (error) { dispose(); onError(error); }
  }); observer.observe(root);
  const cpuSamples = [], simulationSamples = [], frameSamples = [];
  const gl = renderer.getContext(), debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const rendererDescription = String(gl.getParameter(debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  let lastMetrics = {}, frames = 0;
  function dispatch(command) { return sim.dispatch(command); }
  try {
    art = createArtScene ? await createArtScene({THREE, scene, renderer, assetBaseUrl, world: snapshot.world}) : createDiagnosticScene({THREE, scene, config: configuration(config)});
    ui = mountUI?.({root: uiRoot, onCommand: dispatch});
  } catch (error) { dispose(); throw error; }
  function present(next, delta, simulationMs = 0) {
    const before = performance.now(), previous = snapshot; snapshot = next;
    const timing = {alpha: snapshot.diagnostics.alpha, playerDelta: Math.max(0, snapshot.clocks.player - previous.clocks.player),
      worldDelta: Math.max(0, snapshot.clocks.world - previous.clocks.world), playerTime: snapshot.clocks.player, worldTime: snapshot.clocks.world,
      camera: camera.camera, viewport: {width: root.clientWidth, height: root.clientHeight}};
    camera.update(snapshot.player); art.update(snapshot, timing); ui?.update(snapshot); renderer.render(scene, camera.camera); frames++;
    cpuSamples.push(performance.now() - before); simulationSamples.push(simulationMs); frameSamples.push(delta * 1000);
    if (cpuSamples.length > 240) { cpuSamples.shift(); simulationSamples.shift(); frameSamples.shift(); }
    const sorted = [...cpuSamples].sort((a, b) => a - b), simSorted = [...simulationSamples].sort((a, b) => a - b), intervals = frameSamples.filter(v => v > 0);
    lastMetrics = {frames, simulationMs, rendererDescription, userAgent: navigator.userAgent,
      simulationCpuP95Ms: simSorted[Math.floor((simSorted.length - 1) * 0.95)] ?? 0,
      observedHz: intervals.length ? 1000 * intervals.length / intervals.reduce((n, v) => n + v, 0) : 0, renderCpuP95Ms: sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0,
      drawCalls: renderer.info.render.calls, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
      viewport: {width: root.clientWidth, height: root.clientHeight}, threeRevision: THREE.REVISION, camera: camera.diagnostics()};
    onSnapshot(snapshot, lastMetrics);
    return snapshot;
  }
  function advance(delta) { if (disposed) throw Error('Runtime disposed'); const t = performance.now();
    const next = sim.advance(delta), simulationMs = performance.now() - t;
    try { return present(next, delta, simulationMs); } catch (error) { dispose(); throw error; } }
  function frame(now) {
    if (disposed) return;
    const delta = lastTime === null ? 0 : Math.max(0, (now - lastTime) / 1000); lastTime = now;
    try { advance(delta); } catch (error) { onError(error); return; } animation = requestAnimationFrame(frame);
  }
  renderer.domElement.addEventListener('pointermove', e => { const point = camera.screenToWorld(e.clientX, e.clientY); if (point) dispatch({type: 'aim', ...point}); }, {signal});
  renderer.domElement.addEventListener('pointerdown', e => { if (e.button !== 0) return; const point = camera.screenToWorld(e.clientX, e.clientY); if (point) dispatch({type: 'aim', ...point}); }, {signal});
  function loseFocus() { dispatch({type: 'cancel-input'}); dispatch({type: 'pause', paused: true}); lastTime = null; advance(settings.step); }
  globalThis.addEventListener('blur', loseFocus, {signal});
  document.addEventListener('visibilitychange', () => { if (document.hidden) loseFocus(); lastTime = null; }, {signal});
  try { present(snapshot, 0); } catch (error) { dispose(); throw error; } if (autoStart) animation = requestAnimationFrame(frame);
  return {dispatch, advance, snapshot: () => sim.snapshot(), metrics: () => ({...lastMetrics}),
    screenToWorld: camera.screenToWorld, zoom: camera.magnify,
    dispose};
  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(animation); controller.abort(); observer.disconnect();
    try { ui?.dispose(); } finally {
      try { art?.dispose(); } finally {
        sim.dispose(); scene.clear();
        try { renderer.forceContextLoss(); renderer.dispose(); } finally { renderer.domElement.remove(); }
      }
    }
  }
}
