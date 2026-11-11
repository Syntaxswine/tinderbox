// Shape and speed of a ground fire front on a uniform field, per fuel, per direction,
// per cell size. One centre ignition, then the ignition tick of every cell is read
// from the simulation's own `ignition` events.
//   node docs/reviews/evidence/hostile-review-round-1/ground-front.mjs
import fs from 'node:fs';
import {createSimulation, DEFAULT_CONFIG, eventLog, table, round, STEP} from './lib.mjs';

const WORLD = 16, CENTRE = WORLD / 2;
const ANGLES = [0, 11.25, 22.5, 33.75, 45, 56.25, 67.5, 78.75, 90];
const {fire, fuel} = DEFAULT_CONFIG;

function field(kind, cellSize) {
  const scenario = {id: 'front-' + kind, width: WORLD, height: WORLD, fireCellSize: cellSize,
    player: {x: .8, y: .8}, obstacles: [], actors: [],
    patches: kind === 'gas' ? [] : [{x: 0, y: 0, width: WORLD, depth: WORLD, material: kind}],
    // A uniform film of gas: one pour line through every cell row.
    fuelLines: kind === 'gas' ? Array.from({length: Math.round(WORLD / cellSize)}, (_, row) =>
      ({from: {x: 0.001, y: (row + .5) * cellSize}, to: {x: WORLD - .001, y: (row + .5) * cellSize}, litresPerMetre: fuel.gasPerMetre})) : [],
    ignitions: [{x: CENTRE + cellSize / 2, y: CENTRE + cellSize / 2, radius: .01, heat: 3}]};
  const sim = createSimulation({scenario, config: {events: {capacity: 4096}, fire: {damagePerSecond: 0}}});
  const log = eventLog(), ignitedAt = new Map(), burnoutAt = new Map();
  let snapshot;
  for (let tick = 0; tick < 60 * 40; tick++) {
    snapshot = sim.advance(STEP);
    for (const event of log.take(snapshot)) {
      if (event.type === 'ignition' && !ignitedAt.has(event.cellId)) ignitedAt.set(event.cellId, event.tick * STEP);
      if (event.type === 'burnout' && !burnoutAt.has(event.cellId)) burnoutAt.set(event.cellId, event.tick * STEP);
    }
    if (tick > 30 && snapshot.diagnostics.burningCells === 0) break;
  }
  const origin = {x: CENTRE + cellSize / 2, y: CENTRE + cellSize / 2};
  const t0 = Math.min(...ignitedAt.values());
  const cells = snapshot.cells.filter(cell => ignitedAt.has(cell.id)).map(cell => ({
    r: Math.hypot(cell.x - origin.x, cell.y - origin.y),
    angle: Math.atan2(Math.abs(cell.y - origin.y), Math.abs(cell.x - origin.x)) * 180 / Math.PI,
    t: ignitedAt.get(cell.id) - t0, burn: burnoutAt.has(cell.id) ? burnoutAt.get(cell.id) - ignitedAt.get(cell.id) : null}));
  sim.dispose();
  // Steady front speed per direction: least-squares slope of radius against arrival time for 2 m <= r <= 6.5 m.
  const speed = angle => {
    const near = cells.filter(c => c.r >= 2 && c.r <= 6.5 && Math.abs(c.angle - angle) <= 3.5);
    if (near.length < 3) return null;
    const mt = near.reduce((n, c) => n + c.t, 0) / near.length, mr = near.reduce((n, c) => n + c.r, 0) / near.length;
    const sxx = near.reduce((n, c) => n + (c.t - mt) ** 2, 0), sxy = near.reduce((n, c) => n + (c.t - mt) * (c.r - mr), 0);
    return sxx > 0 ? sxy / sxx : null;
  };
  const speeds = ANGLES.map(speed);
  const valid = speeds.filter(v => v !== null);
  const burns = cells.map(c => c.burn).filter(v => v !== null);
  return {kind, cellSize, reached: cells.length, total: snapshot.cells.length, speeds,
    mean: valid.reduce((n, v) => n + v, 0) / valid.length, min: Math.min(...valid), max: Math.max(...valid),
    burnSeconds: burns.length ? burns.reduce((n, v) => n + v, 0) / burns.length : null};
}

const stated = kind => fire.frontSpeed * fire.propagation[kind].speedScale;
const results = [];
for (const kind of ['gas', 'grass', 'wood']) for (const cellSize of [1, .5, .25]) results.push(field(kind, cellSize));
console.log('Front speed in m per world second, by direction from the grid axis (0 deg = along a row, 45 deg = diagonal).');
console.log('"cap" is config fire.frontSpeed x the fuel\'s speedScale, the figure the config calls the front speed.\n');
console.log(table(results.map(r => ({fuel: r.kind, 'cell m': r.cellSize, cap: stated(r.kind),
  ...Object.fromEntries(ANGLES.map((a, i) => [a + '°', r.speeds[i] === null ? '-' : round(r.speeds[i], 2)])),
  mean: round(r.mean, 2), 'max/min': round(r.max / r.min, 3), '% of cap': round(100 * r.mean / stated(r.kind), 0),
  'burn s': round(r.burnSeconds, 2), reached: r.reached + '/' + r.total})),
  ['fuel', 'cell m', 'cap', ...ANGLES.map(a => a + '°'), 'mean', 'max/min', '% of cap', 'burn s', 'reached']));
fs.mkdirSync(new URL('./results/', import.meta.url), {recursive: true});
fs.writeFileSync(new URL('./results/ground-front.json', import.meta.url), JSON.stringify({angles: ANGLES, results}, null, 1) + '\n');
