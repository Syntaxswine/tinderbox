// Round 6. Builds scene-var.mjs and measure-var.mjs in this folder by exact text replacement from the author's
// scene.mjs and measure.mjs. One switch, off unless the environment sets it:
//   MIDDLE=1   the furniture (and the oil and coal beside it) goes in the room tile nearest the middle of the
//              room, which is what the record says the scene does; without it, the author's choice
//              (scene.mjs:143, the first tile of the room's middle row) is kept.
//   node reviewer-round-6/r15-make-var.mjs
import fs from 'node:fs';
import path from 'node:path';
const here = import.meta.dirname, up = path.join(here, '..');
const swap = (text, from, to) => { if (!text.includes(from)) throw new Error('not found: ' + from); return text.replace(from, to); };
let scene = fs.readFileSync(path.join(up, 'scene.mjs'), 'utf8');
scene = swap(scene, "import {PITCH} from './kernel.mjs';", "import {PITCH} from '../kernel.mjs';");
scene = swap(scene, "path.resolve(import.meta.dirname, '../../../..')", "path.resolve(import.meta.dirname, '../../../../..')");
scene = swap(scene, 'const [ci, cj] = record.cells[Math.floor(record.cells.length / 2)];',
  'const [ci, cj] = process.env.MIDDLE ? middleCell(record.cells) : record.cells[Math.floor(record.cells.length / 2)];');
scene += `
// Round 6 switch: the cell nearest the mean of the room's cells (the first such, in raster order).
function middleCell(cells) {
  const mi = cells.reduce((s, c) => s + c[0], 0) / cells.length, mj = cells.reduce((s, c) => s + c[1], 0) / cells.length;
  let best = cells[0], d = Infinity;
  for (const c of cells) { const e = Math.hypot(c[0] - mi, c[1] - mj); if (e < d - 1e-9) { d = e; best = c; } }
  return best;
}
`;
fs.writeFileSync(path.join(here, 'scene-var.mjs'), scene);
let measure = fs.readFileSync(path.join(up, 'measure.mjs'), 'utf8');
measure = swap(measure, "from './kernel.mjs';", "from '../kernel.mjs';");
measure = swap(measure, "from './scene.mjs';", "from './scene-var.mjs';");
fs.writeFileSync(path.join(here, 'measure-var.mjs'), measure);
console.log('wrote scene-var.mjs and measure-var.mjs');
