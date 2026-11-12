// What a frame spends publishing the ground grid and the map tiles and then re-reading them.
// Round 2: every row now calls the game's own function, with one shared cell reader as in
// src/art/index.js. Round 1 used hand copies for three rows, which would not see the fix.
// Two states: nothing burning, and a lawn fire (so the "changed cells only" paths do real work).
//   node docs/reviews/evidence/hostile-review-round-2/art-cell-loops.mjs
import fs from 'node:fs';
import * as T from '../../../../src/runtime/three.js';
import {createGroundField} from '../../../../src/art/ground-field.js';
import {createFire} from '../../../../src/art/fire.js';
import {createStreetFirelight} from '../../../../src/art/street-firelight.js';
import {createWorld} from '../../../../src/art/world.js';
import {createCellReader, createTrailReader} from '../../../../src/art/cell-publication.js';
import {mountMap} from '../../../../src/ui/map.js';
import {BELL_AND_ALDER} from '../../../../src/content/bell-and-alder-layout.js';
import {createSimulation, street, table, round, STEP} from './lib.mjs';

// Wall clock on a quiet host. process.cpuUsage() ticks in 15.6 ms steps on Windows, too coarse for passes this small.
const cpuMs = () => performance.now();
// A stand-in DOM, enough for mountMap to run its real update path.
const node = () => ({dataset: {}, children: [], hidden: false, setAttribute() {}, removeAttribute() {}, append() {}, prepend() {}, replaceChildren() {}});
const mapElement = () => Object.assign(node(), {ownerDocument: {createElementNS: node}});
const material = new T.MeshBasicMaterial();
const materials = new Proxy({}, {get: () => material});

function scene(scenario, seed) {
  const sim = createSimulation({scenario, seed});
  const readCells = createCellReader(), nearbyTrail = createTrailReader(readCells);
  const field = createGroundField(T, readCells), blank = () => new T.Texture();
  const fire = createFire(T, {flame: blank(), smoke: blank(), burst: blank()}, field.uniforms, readCells);
  const firelight = createStreetFirelight(T, readCells);
  const world = createWorld(T, materials), map = mountMap(mapElement());
  // art/index.js hands world.js the map without module, house and shop obstacles, cached by identity.
  let lastObstacles, plain;
  const groundObstacles = obstacles => {
    if (Object.isFrozen(obstacles) && obstacles === lastObstacles) return plain;
    plain = Object.freeze((obstacles || []).filter(o => !o.moduleId && !o.buildingId && o.shopId !== BELL_AND_ALDER.id));
    lastObstacles = obstacles; return plain;
  };
  const passes = {
    'simulation: snapshot()': s => sim.snapshot(),
    'art/fire.js update': s => fire.update(s, s.clocks.world),
    'art/ground-field.js update': s => field.update(s),
    'art/street-firelight.js update': s => firelight.update(s, new Map(), s.clocks.world),
    'art/index.js nearby trail': s => nearbyTrail(s.cells, s.player),
    'art/world.js update': s => world.update({...s.world, obstacles: groundObstacles(s.world.obstacles)}),
    'ui/map.js update': s => map.update(s)
  };
  // One frame = one simulation step, then every pass once on that frame's snapshot.
  function measure(frames) {
    const totals = Object.fromEntries(Object.keys(passes).map(name => [name, 0]));
    let stepCpu = 0, burning = 0;
    for (let i = 0; i < frames; i++) {
      let c = cpuMs(); sim.advance(STEP); stepCpu += cpuMs() - c;
      let snapshot;
      for (const [name, pass] of Object.entries(passes)) {
        c = cpuMs(); const out = pass(snapshot); totals[name] += cpuMs() - c;
        if (name === 'simulation: snapshot()') snapshot = out;
      }
      burning = Math.max(burning, snapshot.diagnostics.burningCells);
    }
    // advance() includes its own snapshot; the row above re-takes one, which is the cheap "nothing changed" path.
    return {stepAndSnapshot: stepCpu / frames, peakBurningCells: burning, parts: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / frames]))};
  }
  return {sim, measure, dispose() { fire.dispose(); field.dispose(); world.dispose(); sim.dispose(); }};
}

const results = [];
for (const [label, scenario, seed, light] of [
  ['Catalogue Street, nothing lit', street({player: {x: 30, y: 14}}), 1893, false],
  ['Catalogue Street, lawn fire', street({player: {x: 30, y: 14}}), 1893, true],
  ['opening test street, nothing lit (control)', 'street', 1947, false]]) {
  const s = scene(scenario, seed);
  s.measure(120);
  if (light) {
    s.sim.dispatch({type: 'pause', paused: false});
    s.sim.dispatch({type: 'select-tool', tool: 'flamethrower'}); s.sim.dispatch({type: 'aim', x: 20, y: 13.5});
    s.sim.dispatch({type: 'primary', pressed: true}); s.measure(45); s.sim.dispatch({type: 'primary', pressed: false});
  }
  const m = s.measure(600);
  results.push({scene: label, ...m, artAndUi: Object.entries(m.parts).filter(([k]) => !k.startsWith('simulation')).reduce((n, [, v]) => n + v, 0)});
  s.dispose();
}
console.log('Wall ms per frame, means over 600 frames. "step + snapshot" is one advance(); the other rows re-read that snapshot.\n');
const names = Object.keys(results[0].parts).filter(k => !k.startsWith('simulation'));
console.log(table([
  {'per-frame work': 'simulation: one advance() (step + snapshot)', ...Object.fromEntries(results.map(r => [r.scene, round(r.stepAndSnapshot, 2)]))},
  ...names.map(name => ({'per-frame work': name, ...Object.fromEntries(results.map(r => [r.scene, round(r.parts[name], 3)]))})),
  {'per-frame work': 'art and UI passes, total', ...Object.fromEntries(results.map(r => [r.scene, round(r.artAndUi, 2)]))},
  {'per-frame work': 'peak burning cells', ...Object.fromEntries(results.map(r => [r.scene, r.peakBurningCells]))}],
  ['per-frame work', ...results.map(r => r.scene)]));
fs.mkdirSync(new URL('./results/', import.meta.url), {recursive: true});
fs.writeFileSync(new URL('./results/art-cell-loops.json', import.meta.url), JSON.stringify(results, null, 1) + '\n');
