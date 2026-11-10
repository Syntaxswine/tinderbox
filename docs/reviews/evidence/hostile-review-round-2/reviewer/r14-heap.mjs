// Fix A, retention. The publication, the shared cell reader, the fire-card list and the map keep references to earlier
// snapshots. Burn the Catalogue north lawn TB_CYCLES times over (default 6) (reset between), feeding this tree's art consumers and mounted
// map every frame, and read the heap after a forced collection at the end of each cycle. A leak shows as growth per cycle.
// CONTROL: the same loop on the round-1 tree (4fc97bb), simulation and consumers both: node r14-heap.mjs old
// Usage: node r14-heap.mjs [old]   (re-runs itself with --expose-gc)
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {load, HEAD as THIS, OLD, r} from './lib.mjs';
const old = process.argv[2] === 'old', HEAD = old ? OLD : THIS;
if (!globalThis.gc) process.exit(spawnSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {stdio: 'inherit'}).status ?? 1);
const api = await load(HEAD);
console.log(old ? 'tree: round-1 4fc97bb (control)' : 'tree: this tree');
const T = await import(HEAD + 'runtime/three.js');
const {createCellReader, createTrailReader} = old ? {createCellReader: () => undefined, createTrailReader: () => () => []} : await import(HEAD + 'art/cell-publication.js');
const {createGroundField} = await import(HEAD + 'art/ground-field.js');
const {createFire} = await import(HEAD + 'art/fire.js');
const {createStreetFirelight} = await import(HEAD + 'art/street-firelight.js');
const {groupStructureFire} = await import(HEAD + 'art/structure-fire.js');
const {mountMap} = await import(HEAD + 'ui/map.js');
const read = createCellReader(), trail = createTrailReader(read), atlas = new T.Texture();
const field = createGroundField(T, read), fire = createFire(T, {flame: atlas, smoke: atlas, burst: atlas}, field.uniforms, read), light = createStreetFirelight(T, read);
const element = () => { const attributes = new Map(), children = []; return {attributes, children, dataset: {}, setAttribute: (k, v) => attributes.set(k, v), removeAttribute: k => attributes.delete(k),
  append: (...n) => children.push(...n), prepend: n => children.unshift(n), replaceChildren: () => { children.length = 0; }}; };
const host = element(); host.ownerDocument = {createElementNS: element};
const map = mountMap(host, {}), muzzle = new T.Vector3();
const sim = api.createSimulation({scenario: {...api.NEIGHBORHOOD_SCENARIO, actors: []}, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
function frame() {
  const s = sim.advance(api.STEP), time = s.clocks.world;
  field.update(s); light.update(s, groupStructureFire(s.structureFire), time, []); trail(s.cells, s.player);
  muzzle.set(s.player.x, 1, s.player.y); fire.update(s, time, {muzzle}); map.update(s);
  return s;
}
const heap = () => { globalThis.gc(); globalThis.gc(); return process.memoryUsage().heapUsed / 1048576; };
for (let i = 0; i < 120; i++) frame();
const samples = [heap()];
const CYCLES = Number(process.env.TB_CYCLES ?? 6);
for (let cycle = 1; cycle <= CYCLES; cycle++) {
  sim.dispatch({type: 'select-tool', tool: 'matches'}); sim.dispatch({type: 'aim', x: 20, y: 15.5});
  sim.dispatch({type: 'move', x: 0, y: -1}); for (let i = 0; i < 12; i++) frame(); sim.dispatch({type: 'move', x: 0, y: 0});
  sim.dispatch({type: 'aim', x: 20, y: 15.2}); sim.dispatch({type: 'primary', pressed: true}); frame(); sim.dispatch({type: 'primary', pressed: false});
  let peak = 0, s;
  for (let i = 0; i < 45 * 60; i++) { s = frame(); peak = Math.max(peak, s.diagnostics.burningCells); }
  sim.dispatch({type: 'reset'}); for (let i = 0; i < 60; i++) frame();
  samples.push(heap());
  console.log(`cycle ${cycle}: peak burning cells ${peak}, spent cells before reset ${s.cells.filter(c => c.phase === 'spent').length}, heap after reset + collection ${r(samples.at(-1), 2)} MB`);
}
console.log(`heap before the first fire ${r(samples[0], 2)} MB; after cycles 2..${CYCLES}: ${samples.slice(2).map(v => r(v, 2)).join(', ')} MB; growth from cycle 2 to cycle ${CYCLES}: ${r(samples.at(-1) - samples[2], 2)} MB`);
