// D (fuel that disappears): a wooden prop standing on the wooden shop floor replaces, rather than adds to, the cell's fuel (field.js:18-27).
import {createSimulation, r} from './lib.mjs';
const sim = createSimulation({scenario: 'neighborhood', seed: 1893});
const s = sim.snapshot();
const floor = s.cells.filter(c => c.x > 36 && c.x < 44 && c.y > 9 && c.y < 17 && c.material === 'wood');
const full = .25 * 1.2, less = floor.filter(c => c.surfaceFuel < full - 1e-9);
console.log('shop floor cells', floor.length, '| bare-floor fuel per cell', full, '| cells holding LESS than bare floor because a wood prop overlaps them:', less.length,
  '| their fuel min/median/max', r(Math.min(...less.map(c => c.surfaceFuel)), 4), r(less.map(c => c.surfaceFuel).sort((a, b) => a - b)[Math.floor(less.length / 2)], 4), r(Math.max(...less.map(c => c.surfaceFuel)), 4),
  '| cells holding more:', floor.filter(c => c.surfaceFuel > full + 1e-9).length);
sim.dispose();
