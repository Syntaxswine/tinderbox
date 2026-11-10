// What a frame spends publishing the ground grid and the map tiles and then re-reading all of
// them, with nothing burning. Measured headless with the game's own Three.js build.
// Each row is one piece of per-frame work that touches every cell or every tile.
//   node docs/reviews/evidence/hostile-review-round-1/art-cell-loops.mjs
import fs from 'node:fs';
import * as T from '../../../../src/runtime/three.js';
import {createGroundField} from '../../../../src/art/ground-field.js';
import {createFire} from '../../../../src/art/fire.js';
import {createStreetFirelight} from '../../../../src/art/street-firelight.js';
import {mapView} from '../../../../src/ui/map.js';
import {BELL_AND_ALDER} from '../../../../src/content/bell-and-alder-layout.js';
import {createSimulation, street, table, round, STEP} from './lib.mjs';

const cpuMs = () => { const {user, system} = process.cpuUsage(); return (user + system) / 1000; };
const time = (work, frames = 400) => { for (let i = 0; i < 60; i++) work(); const c = cpuMs(); for (let i = 0; i < frames; i++) work(); return (cpuMs() - c) / frames; };
// The same string the ground-plan map builds to compare with last frame (src/ui/map.js:33-39).
const boxPath = boxes => boxes.map(b => 'M' + b.x + ' ' + b.y + 'h' + b.width + 'v' + b.height + 'h' + (-b.width) + 'Z').join('');
function mapSignature(snapshot) {
  const map = mapView(snapshot), grouped = new Map();
  for (const tile of map.tiles) { if (!grouped.has(tile.color)) grouped.set(tile.color, []); grouped.get(tile.color).push(tile); }
  return JSON.stringify([...grouped]).length + boxPath(map.obstacles).length + boxPath(map.fire).length;
}

const results = [];
for (const [label, scenario, seed] of [['Catalogue Street, idle', street({player: {x: 30, y: 14}}), 1893], ['opening test street, idle (control)', 'street', 1947]]) {
  const sim = createSimulation({scenario, seed});
  const field = createGroundField(T), blank = () => new T.Texture();
  const fire = createFire(T, {flame: blank(), smoke: blank(), burst: blank()}, field.uniforms);
  const firelight = createStreetFirelight(T);
  let snapshot = sim.advance(STEP);
  const world = snapshot.world;
  // art/index.js hands world.js the map without module, house and shop obstacles.
  const plain = (world.obstacles || []).filter(o => !o.moduleId && !o.buildingId && o.shopId !== BELL_AND_ALDER.id);
  const parts = {
    'simulation: snapshot() (field.js:178, index.js:336-368)': time(() => { snapshot = sim.snapshot(); }),
    'art/fire.js: every cell, id hash and history map (fire.js:90-108)': time(() => fire.update(snapshot, snapshot.clocks.world)),
    'art/ground-field.js: every cell into a texture (ground-field.js:59-69)': time(() => field.update(snapshot)),
    'art/street-firelight.js: every cell (street-firelight.js:59)': time(() => firelight.update(snapshot, new Map(), snapshot.clocks.world)),
    'art/index.js: trail filter over every cell (index.js:99)': time(() => snapshot.cells.filter(cell => cell.depositedFuel > 0 && Math.hypot(cell.x - snapshot.player.x, cell.y - snapshot.player.y) < 2.5)),
    'art/world.js: JSON of every tile to detect change (world.js:74)': time(() => JSON.stringify([world.width, world.height, world.tiles, plain])),
    'ui/map.js: every tile and cell, JSON of every tile (map.js:12-39)': time(() => mapSignature(snapshot))
  };
  results.push({scene: label, cells: snapshot.cells.length, tiles: world.tiles.length, parts, total: Object.values(parts).reduce((n, v) => n + v, 0)});
  fire.dispose(); field.dispose(); sim.dispose();
}
const [street9588, control] = results;
console.log('CPU ms per frame, nothing burning. ' + street9588.scene + ': ' + street9588.cells + ' cells, ' + street9588.tiles + ' tiles. Control: ' + control.cells + ' cells, ' + control.tiles + ' tiles.\n');
console.log(table([...Object.keys(street9588.parts).map(name => ({'per-frame work': name, 'Catalogue Street': round(street9588.parts[name], 2), 'opening test street': round(control.parts[name], 2)})),
  {'per-frame work': 'TOTAL', 'Catalogue Street': round(street9588.total, 2), 'opening test street': round(control.total, 2)}],
  ['per-frame work', 'Catalogue Street', 'opening test street']));
fs.mkdirSync(new URL('./results/', import.meta.url), {recursive: true});
fs.writeFileSync(new URL('./results/art-cell-loops.json', import.meta.url), JSON.stringify(results, null, 1) + '\n');
