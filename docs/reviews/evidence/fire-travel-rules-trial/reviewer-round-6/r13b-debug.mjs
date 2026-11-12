// Round 6 debugging aid for r13: which tile's walk burns the fallen sofa the second time.
import {createWorld} from '../kernel.mjs';
const w = createWorld(); for (let k = 0; k <= 3; k++) w.addTile(0, 0, k);
const U = w.tileAt(0, 0, 2), G = w.tileAt(0, 0, 0);
const sofa = w.addFuel(U, 'furniture', 1);
const floor = w.addFuel(U, 'frame', .02, {supports: true, face: {axis: 2, step: -1, object: w.setFace(0, 0, 2, 2, -1, 'timber')}});
w.ignite(U, 'furniture'); w.ignite(U, 'frame');
for (let n = 1; n <= 40; n++) w.step();
let v = sofa.amount, sets = 0;
Object.defineProperty(sofa, 'amount', {get: () => v, set: x => { sets++; console.log('set ' + sets + ': sofa is in tile layer ' + [...w.tiles.values()].find(t => t.fuels.includes(sofa)).k + ', G in active ' + w.active.has(G)); v = x; }});
w.step();
