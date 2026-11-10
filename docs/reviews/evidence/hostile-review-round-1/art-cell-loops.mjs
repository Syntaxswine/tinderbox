// How much of a frame the two art modules that re-read the whole ground grid cost,
// measured headless with the game's own Three.js build. Idle street: nothing is lit.
//   node docs/reviews/evidence/hostile-review-round-1/art-cell-loops.mjs
import * as T from '../../../../src/runtime/three.js';
import {createGroundField} from '../../../../src/art/ground-field.js';
import {createFire} from '../../../../src/art/fire.js';
import {createSimulation, street, table, round, STEP} from './lib.mjs';

const cpuMs = () => { const {user, system} = process.cpuUsage(); return (user + system) / 1000; };
const rows = [];
for (const [label, scenario, seed] of [['Catalogue Street, idle', street({player: {x: 30, y: 14}}), 1893], ['opening test street, idle (control)', 'street', 1947]]) {
  const sim = createSimulation({scenario, seed});
  const field = createGroundField(T), blank = () => new T.Texture();
  const fire = createFire(T, {flame: blank(), smoke: blank(), burst: blank()}, field.uniforms);
  let snapshot = sim.advance(STEP);
  const time = (work, frames = 600) => { for (let i = 0; i < 100; i++) work(); const c = cpuMs(); for (let i = 0; i < frames; i++) work(); return (cpuMs() - c) / frames; };
  const ground = time(() => field.update(snapshot));
  const flames = time(() => fire.update(snapshot, snapshot.clocks.world));
  const trail = time(() => snapshot.cells.filter(cell => cell.depositedFuel > 0 && Math.hypot(cell.x - snapshot.player.x, cell.y - snapshot.player.y) < 2.5));
  const publish = time(() => { snapshot = sim.snapshot(); });
  rows.push({scene: label, cells: snapshot.cells.length, 'simulation snapshot': round(publish, 2), 'ground-field.js update': round(ground, 2), 'fire.js update': round(flames, 2),
    'trail filter in art/index.js': round(trail, 2), 'sum ms per frame': round(publish + ground + flames + trail, 2)});
  fire.dispose(); field.dispose(); sim.dispose();
}
console.log('CPU ms per frame spent publishing the ground grid and re-reading all of it, with nothing burning.\n');
console.log(table(rows, Object.keys(rows[0])));
