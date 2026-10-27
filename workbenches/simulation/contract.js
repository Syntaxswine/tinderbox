import {createRuntime, THREE} from '../../src/runtime/index.js';
const root = document.getElementById('probe'), output = document.getElementById('result');
const check = (condition, label) => { if (!condition) throw Error(label); };
let artDisposals = 0, uiDisposals = 0, updates = 0;
try {
  for (let i = 0; i < 6; i++) {
    const runtime = await createRuntime({root, scenario: 'tiny', autoStart: false,
      createArtScene: async ({THREE: shared, scene}) => {
        check(shared === THREE && scene instanceof THREE.Scene, 'Shared Three factory contract');
        const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3), material = new THREE.MeshBasicMaterial({color: 0xffffff});
        const mesh = new THREE.Mesh(geometry, material); scene.add(mesh);
        return {update(snapshot, timing) { check(snapshot.version === 1 && Number.isFinite(timing.worldTime), 'Snapshot/timing contract'); mesh.position.set(snapshot.player.x, 0.5, snapshot.player.y); updates++; },
          dispose() { artDisposals++; mesh.removeFromParent(); geometry.dispose(); material.dispose(); }};
      },
      mountUI: ({root: given, onCommand}) => {
        check(given === root && typeof onCommand === 'function', 'UI factory contract');
        check(onCommand({type: 'move', x: 1, y: 0}), 'UI queues a raw movement command');
        return {update(snapshot) { check(snapshot.version === 1, 'UI receives v1'); }, dispose() { uiDisposals++; }};
      }});
    check(root.querySelectorAll('canvas').length === 1, 'One owned canvas');
    const before = runtime.snapshot(); runtime.advance(1 / 60); const after = runtime.snapshot();
    check(after.player.travelled > before.player.travelled, 'Command changes the authoritative model');
    runtime.dispatch({type: 'select-tool', tool: 'jerry-can'}); runtime.dispatch({type: 'primary', pressed: true});
    runtime.advance(1 / 60); check(runtime.snapshot().player.pouring, 'Pour active before scripted blur');
    window.dispatchEvent(new Event('blur'));
    const blurred = runtime.snapshot();
    check(blurred.paused && !blurred.player.pouring && !blurred.player.moving, 'Window blur wiring pauses and clears input');
    runtime.advance(0.25); check(runtime.snapshot().clocks.active === blurred.clocks.active, 'Paused browser clocks freeze');
    runtime.dispatch({type: 'pause', paused: false}); runtime.advance(1 / 60);
    check(runtime.snapshot().player.x === blurred.player.x && runtime.snapshot().player.y === blurred.player.y, 'Resume does not restore held movement');
    check(runtime.metrics().threeRevision === '180', 'Pinned r180 renderer');
    runtime.dispose(); runtime.dispose(); check(root.querySelectorAll('canvas').length === 0, 'Canvas retired');
    check(artDisposals === i + 1 && uiDisposals === i + 1, 'Factories disposed exactly once');
  }
  let rejected = false;
  try { await createRuntime({root, scenario: 'tiny', autoStart: false, createArtScene: async () => { throw Error('intentional factory failure'); }}); }
  catch { rejected = true; }
  check(rejected && root.querySelectorAll('canvas').length === 0, 'Rejected async factory cleans up');
  let failedUpdateDisposals = 0, updateRejected = false;
  try {
    await createRuntime({root, scenario: 'tiny', autoStart: false,
      createArtScene: async () => ({update() { throw Error('intentional update failure'); }, dispose() { failedUpdateDisposals++; }}),
      mountUI: () => ({update() {}, dispose() { failedUpdateDisposals++; }})});
  } catch { updateRejected = true; }
  check(updateRejected && failedUpdateDisposals === 2 && root.querySelectorAll('canvas').length === 0, 'Failed view update cleans both factories and canvas');
  output.dataset.status = 'pass'; output.textContent = `PASS · 6 real WebGL create/update/dispose cycles\nArt disposals ${artDisposals} · UI disposals ${uiDisposals} · updates ${updates}\nOne Three r180 instance · raw movement · v1 snapshots/timing\nScripted window blur pauses/stops pour · frozen clocks · safe resume\nIdempotent disposal · failed factory + update cleanup · no owned canvas left`;
} catch (error) { output.dataset.status = 'fail'; output.textContent = error.stack || String(error); }
