// Claim 3: "direction spread about 3.08%" (docs/engineering/milestone-01.md:74).
// Part 1 reproduces the repo's own sensitivity fixture (control), then adds headings the repo did not test.
// Part 2 measures an AREA front on grass (the fuel that actually carries fire on Catalogue Street).
import {createSimulation, r, STEP} from './lib.mjs';

function gasLine(cellSize, headingDeg) {
  const heading = headingDeg * Math.PI / 180;
  const origin = {x: 1.25, y: 1.25}, d = {x: Math.cos(heading), y: Math.sin(heading)};
  const sim = createSimulation({scenario: {id: 'sensitivity', width: 12, height: 12, fireCellSize: cellSize,
    player: {x: 10.5, y: 1}, obstacles: [], actors: [],
    fuelLines: [{from: origin, to: {x: origin.x + d.x * 8, y: origin.y + d.y * 8}, litresPerMetre: 0.08}],
    ignitions: [{...origin, radius: 0.01, heat: 3}]}});
  let arrival = null, ignited = new Map(), spentAt = new Map();
  for (let tick = 1; tick <= 900; tick++) {
    const s = sim.advance(STEP);
    for (const c of s.cells) {
      if (c.phase === 'burning' && !ignited.has(c.id)) ignited.set(c.id, s.clocks.world);
      if (c.phase === 'spent' && !spentAt.has(c.id)) spentAt.set(c.id, s.clocks.world);
    }
    const front = Math.max(0, ...s.cells.filter(c => c.phase === 'burning').map(c => (c.x - origin.x) * d.x + (c.y - origin.y) * d.y));
    if (arrival === null && front >= 4) arrival = s.clocks.world;
    if (arrival !== null && s.diagnostics.burningCells === 0) break;
  }
  const durations = [...spentAt].map(([id, t]) => t - ignited.get(id)).filter(Number.isFinite);
  sim.dispose();
  return {cellSize, headingDeg, arrival: r(arrival, 4), cellsLit: ignited.size,
    burnMin: r(Math.min(...durations), 3), burnMedian: r(durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)], 3), burnMax: r(Math.max(...durations), 3)};
}

console.log('== Part 1: gas line on paving (repo fixture; 0 and 45 deg are the repo\'s own cases = control) ==');
const rows = [];
for (const cellSize of [0.5, 0.25]) for (const h of [0, 45, 26.565, 22.5, 14.036, 63.435]) rows.push(gasLine(cellSize, h));
for (const row of rows) console.log(JSON.stringify(row));
const repo = rows.filter(x => x.headingDeg === 0 || x.headingDeg === 45).map(x => x.arrival);
const all = rows.map(x => x.arrival);
console.log('repo cases only: max/min =', r(Math.max(...repo) / Math.min(...repo), 4), ' | all headings: max/min =', r(Math.max(...all) / Math.min(...all), 4));

function grassArea(cellSize) {
  const size = 20, centre = {x: 10 + cellSize / 2, y: 10 + cellSize / 2};
  const sim = createSimulation({scenario: {id: 'area', width: size, height: size, fireCellSize: cellSize,
    player: {x: 1, y: 1}, obstacles: [], actors: [], patches: [{x: 0, y: 0, width: size, depth: size, material: 'grass'}],
    ignitions: [{...centre, radius: 0.01, heat: 3}]}, config: {fire: {damagePerSecond: 0}}});
  const lit = new Map();
  for (let tick = 1; tick <= 420; tick++) {
    const s = sim.advance(STEP);
    for (const c of s.cells) if (c.phase !== 'cold' && c.phase !== 'heating' && !lit.has(c.id)) lit.set(c.id, {t: s.clocks.world, x: c.x, y: c.y});
  }
  sim.dispose();
  const at = (deg, dist) => {
    const a = deg * Math.PI / 180, px = centre.x + dist * Math.cos(a), py = centre.y + dist * Math.sin(a);
    const id = 'cell:' + Math.floor(px / cellSize) + ',' + Math.floor(py / cellSize);
    return lit.get(id)?.t ?? null;
  };
  // Isochrone spread: arrival time of every cell whose centre is 5.9..6.1 m from the origin.
  const ring = [...lit.values()].filter(c => { const d = Math.hypot(c.x - centre.x, c.y - centre.y); return d >= 5.9 && d <= 6.1; });
  const times = ring.map(c => c.t / Math.hypot(c.x - centre.x, c.y - centre.y)); // seconds per metre
  const slow = ring.reduce((a, b) => b.t / Math.hypot(b.x - centre.x, b.y - centre.y) > a.t / Math.hypot(a.x - centre.x, a.y - centre.y) ? b : a);
  return {cellSize, arrival6m: Object.fromEntries([0, 90, 180, 45, 26.565, 22.5, 63.435].map(deg => [deg, r(at(deg, 6), 4)])),
    ringCells: ring.length, secondsPerMetre: {min: r(Math.min(...times), 4), max: r(Math.max(...times), 4), ratio: r(Math.max(...times) / Math.min(...times), 4)},
    slowestBearingDeg: r(Math.atan2(slow.y - centre.y, slow.x - centre.x) * 180 / Math.PI, 1)};
}
console.log('\n== Part 2: grass area front, single-cell ignition (0/90/180 deg equal = symmetry control) ==');
for (const cellSize of [0.5, 0.25]) console.log(JSON.stringify(grassArea(cellSize)));
