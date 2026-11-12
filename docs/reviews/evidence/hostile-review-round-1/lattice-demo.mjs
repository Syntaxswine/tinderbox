// Measurements on the reference lattice kernel (lattice-kernel.mjs). Four questions:
//   A. On flat ground with the shipped constants, does it reproduce the shipped ground field?
//   B. In a solid block of fuel, is spread the same along every axis, and what do `up`/`down` do?
//   C. On the real Catalogue Street layout, what does one match do, including through houses?
//   D. What does a tick cost, and how many tiles change per tick?
//   node docs/reviews/evidence/hostile-review-round-1/lattice-demo.mjs [A] [B] [C] [D]
import fs from 'node:fs';
import {createLattice} from './lattice-kernel.mjs';
import {createSimulation, DEFAULT_CONFIG, NEIGHBORHOOD_SCENARIO, table, round, STEP} from './lib.mjs';
import {HOUSING_PLANS} from '../../../../src/content/housing-plans.js';
import {buildingPoint} from '../../../../src/content/buildings.js';
import {exteriorPlanEdges, inFloor} from '../../../../src/content/housing-envelope.js';
import {boxInterval} from '../../../../src/simulation/geometry.js';

const {fire, fuel} = DEFAULT_CONFIG;
const policy = kind => ({speed: fire.frontSpeed * fire.propagation[kind].speedScale, out: fire.heatRate * fire.propagation[kind].heatScale,
  receive: fire.propagation[kind].receiveScale, ignition: fire.ignition[kind]});
// The shipped ground constants, unchanged. Burn times are those of one 0.5 m cell.
const GROUND = {gas: policy('gas'), grass: policy('grass'), wood: policy('wood')};
const SECONDS = {gas: fuel.gasPerMetre * .5 / fuel.gasBurnRate, grass: fuel.surfaceDensity.grass * .25 / fuel.surfaceBurnRate, wood: fuel.surfaceDensity.wood * .25 / fuel.surfaceBurnRate};
const wanted = process.argv.slice(2), run = name => !wanted.length || wanted.includes(name);
const results = {};
const cpuMs = () => { const {user, system} = process.cpuUsage(); return (user + system) / 1000; };

function slope(points) {                              // least-squares metres per second
  const mt = points.reduce((n, p) => n + p.t, 0) / points.length, mr = points.reduce((n, p) => n + p.r, 0) / points.length;
  const sxx = points.reduce((n, p) => n + (p.t - mt) ** 2, 0), sxy = points.reduce((n, p) => n + (p.t - mt) * (p.r - mr), 0);
  return sxx > 0 ? sxy / sxx : null;
}

if (run('A')) {
  const shipped = JSON.parse(fs.readFileSync(new URL('./results/ground-front.json', import.meta.url)));
  const rows = [];
  for (const kind of ['gas', 'grass', 'wood']) {
    const lattice = createLattice({pitch: .5, fuels: GROUND, cooling: fire.cooling, maxHeat: fire.maxHeat, burnHeat: fire.burnHeat});
    for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) lattice.add(i, j, 0, {fuel: kind, seconds: SECONDS[kind]});
    const origin = lattice.at(16, 16, 0), ignited = new Map();
    lattice.heat(origin, 3, 'fixture');
    for (let tick = 1; tick < 60 * 40; tick++) {
      lattice.step(STEP, tick * STEP, (type, tile) => { if (type === 'ignition') ignited.set(tile, tick * STEP); });
      if (tick > 30 && !lattice.burning.size) break;
    }
    const t0 = ignited.get(origin);
    const cells = [...ignited].map(([tile, t]) => ({r: Math.hypot(tile.x - origin.x, tile.y - origin.y), t: t - t0,
      angle: Math.atan2(Math.abs(tile.y - origin.y), Math.abs(tile.x - origin.x)) * 180 / Math.PI}));
    const speeds = shipped.angles.map(angle => { const near = cells.filter(c => c.r >= 2 && c.r <= 6.5 && Math.abs(c.angle - angle) <= 3.5); return near.length >= 3 ? slope(near) : null; });
    const reference = shipped.results.find(r => r.kind === kind && r.cellSize === .5);
    const worst = Math.max(...speeds.map((v, i) => v === null || reference.speeds[i] === null ? 0 : Math.abs(v / reference.speeds[i] - 1)));
    rows.push({fuel: kind, 'lattice 0°': round(speeds[0], 3), 'shipped 0°': round(reference.speeds[0], 3), 'lattice 22.5°': round(speeds[2], 3), 'shipped 22.5°': round(reference.speeds[2], 3),
      'lattice 45°': round(speeds[4], 3), 'shipped 45°': round(reference.speeds[4], 3), 'worst difference over 9 directions': round(100 * worst, 2) + '%', reached: ignited.size + '/1024'});
  }
  results.A = rows;
  console.log('A. Flat ground, shipped constants. Front speed in m/s: lattice kernel against the shipped ground field (results/ground-front.json).\n');
  console.log(table(rows, Object.keys(rows[0])));
}

if (run('B')) {
  const rows = [];
  const DIRECTIONS = {'+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], 'up': [0, 0, 1], 'down': [0, 0, -1],
    'level diagonal': [1, 1, 0], 'diagonal up': [1, 0, 1], 'diagonal down': [1, 0, -1], 'corner up': [1, 1, 1], 'corner down': [1, 1, -1]};
  for (const [up, down] of [[1, 1], [2, .5], [3, .35]]) {
    const lattice = createLattice({pitch: .5, layer: .5, fuels: GROUND, up, down, cooling: fire.cooling});
    const N = 27, c = 13;
    for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) lattice.add(i, j, k, {fuel: 'wood', seconds: SECONDS.wood});
    const origin = lattice.at(c, c, c), ignited = new Map();
    lattice.heat(origin, 3, 'fixture');
    for (let tick = 1; tick < 60 * 60 && ignited.size < N ** 3; tick++) lattice.step(STEP, tick * STEP, (type, tile) => { if (type === 'ignition') ignited.set(tile, tick * STEP); });
    const row = {'up setting': up, 'down setting': down};
    for (const [name, [dx, dy, dz]] of Object.entries(DIRECTIONS)) {
      const points = [];
      for (let n = 3; n <= 12; n++) { const tile = lattice.at(c + dx * n, c + dy * n, c + dz * n); if (tile && ignited.has(tile)) points.push({r: Math.hypot(dx, dy, dz) * n * .5, t: ignited.get(tile)}); }
      row[name] = round(slope(points), 3);
    }
    const level = (row['+x'] + row['-x'] + row['+y'] + row['-y']) / 4;
    row['up : level : down'] = round(row.up / level, 2) + ' : 1 : ' + round(row.down / level, 2);
    rows.push(row);
  }
  results.B = rows;
  console.log('\nB. A solid 13.5 m cube of timber tiles (0.5 m cubes) lit at its centre. Front speed in m/s along each direction.\n');
  console.log(table(rows, Object.keys(rows[0])));
}

// The real Catalogue Street, rebuilt as lattice tiles from the game's own data:
// ground cells from the simulation snapshot, houses from the native plans, masonry from the obstacle list.
const HOUSE = {speed: 1.5, out: 44, receive: .5, ignition: 1.1}, HOUSE_SECONDS = 9;
function buildStreet({lawn = true, reach = 0, radiantGain = 0, up = 1.6, down = .5} = {}) {
  const sim = createSimulation({scenario: NEIGHBORHOOD_SCENARIO, seed: 1893});
  const snapshot = sim.snapshot(); sim.dispose();
  const lattice = createLattice({pitch: .5, layer: 1.06, fuels: {...GROUND, house: HOUSE}, up, down, cooling: fire.cooling, bareReceive: .05, reach, radiantGain});
  const index = v => Math.floor(v / .5), houses = [];
  for (const cell of snapshot.cells) {
    const kind = cell.material === 'grass' ? (lawn ? 'grass' : null) : cell.material === 'wood' ? 'wood' : null;
    lattice.add(index(cell.x), index(cell.y), 0, kind ? {fuel: kind, seconds: SECONDS[kind]} : {});
  }
  for (const building of snapshot.world.buildings) {
    const plan = HOUSING_PLANS[building.prefabId], storeys = plan.floors.length, brick = plan.style.wall === 'brick', own = new Set();
    const house = {id: building.id, tiles: [], roof: [], firstIgnition: null, roofIgnition: null, upperIgnition: null, lastIgnition: null, gone: null};
    const place = (u, v, k, roof) => {
      const p = buildingPoint(building, {x: u + .25, y: v + .25});
      const tile = lattice.add(index(p.x), index(p.y), k, {fuel: 'house', seconds: HOUSE_SECONDS, solid: true, tag: house});
      tile.fuel = 'house'; tile.seconds = HOUSE_SECONDS; tile.roof = roof; own.add(tile); house.tiles.push(tile); if (roof) house.roof.push(tile);
    };
    for (let level = 0; level < storeys; level++) for (let u = 0; u < plan.width; u += .5) for (let v = 0; v < plan.depth; v += .5) {
      if (level && !inFloor(plan.floors[level], u + .25, v + .25)) continue;
      place(u, v, 2 * level, false); place(u, v, 2 * level + 1, false);
      if (level === storeys - 1 || !inFloor(plan.floors[level + 1], u + .25, v + .25)) place(u, v, 2 * level + 2, true);
    }
    // Faces. Outside faces: clapboard passes heat and opens when it burns; brick is closed.
    for (const tile of house.tiles) {
      for (const [face, [dx, dy]] of [[0, [-1, 0]], [1, [1, 0]], [2, [0, -1]], [3, [0, 1]]]) {
        const other = lattice.at(tile.i + dx, tile.j + dy, tile.k);
        if (other && own.has(other)) continue;
        lattice.add(tile.i, tile.j, tile.k, {radiates: true});      // only the outer shell radiates and receives
        const party = other?.tag && other.tag !== house;
        if (tile.roof) lattice.setFace(tile, face, 1);              // roofs meet in the open air above a party wall
        else if (party || brick) lattice.setFace(tile, face, 0);
        else lattice.setFace(tile, face, .5, true);
      }
      const above = lattice.at(tile.i, tile.j, tile.k + 1);
      if (above && own.has(above) && tile.k % 2 === 1) lattice.setFace(tile, 5, .6, true);   // timber deck or ceiling between storeys
    }
    // Brick fronts burn at their timber openings: the plan's own window and door edges.
    if (brick) for (let level = 0; level < storeys; level++) for (const edge of exteriorPlanEdges(plan.floors[level])) {
      if (!edge.opening) continue;
      const side = edge.nx === -1 && edge.x === 0 ? 'left' : edge.nx === 1 && edge.x === plan.width ? 'right' : null;
      if (side && building.partyWalls[side]) continue;
      for (const along of [-.25, .25]) {
        const inside = buildingPoint(building, {x: edge.x - edge.nx * .25 - edge.nz * along, y: edge.z - edge.nz * .25 + edge.nx * along});
        const outside = buildingPoint(building, {x: edge.x + edge.nx * .25 - edge.nz * along, y: edge.z + edge.nz * .25 + edge.nx * along});
        const di = index(outside.x) - index(inside.x), dj = index(outside.y) - index(inside.y);
        const face = di < 0 ? 0 : di > 0 ? 1 : dj < 0 ? 2 : 3;
        for (const k of [2 * level, 2 * level + 1]) { const tile = lattice.at(index(inside.x), index(inside.y), k); if (tile && own.has(tile)) lattice.setFace(tile, face, .5, true); }
      }
    }
    houses.push(house);
  }
  // Masonry walls and glass on the ground layer (the shop): close every face their boxes cross.
  for (const wall of snapshot.world.obstacles.filter(o => (o.kind === 'wall' && o.material === 'masonry') || o.material === 'glass')) {
    for (let j = index(wall.y - wall.depth / 2) - 1; j <= index(wall.y + wall.depth / 2) + 1; j++) for (let i = index(wall.x - wall.width / 2) - 1; i <= index(wall.x + wall.width / 2) + 1; i++) {
      const tile = lattice.at(i, j, 0); if (!tile) continue;
      for (const [face, [dx, dy]] of [[1, [1, 0]], [3, [0, 1]]]) {
        const other = lattice.at(i + dx, j + dy, 0);
        if (other && boxInterval(tile, other, wall)) lattice.setFace(tile, face, 0);
      }
    }
  }
  const drums = snapshot.world.obstacles.filter(o => o.kind === 'barrel').map(o => ({...o, tile: lattice.at(index(o.x), index(o.y), 0), exploded: null}));
  return {lattice, houses, drums, index, snapshot};
}
function burn(street, {strike, seconds = 200, bystander, onTick} = {}) {
  const {lattice, houses, drums} = street;
  for (const tile of strike) lattice.heat(tile, 1.8, 'matches');
  let time = 0, quiet = 0, exposureSeconds = 0, changedTotal = 0, peakChanged = 0, peakBurning = 0;
  const cpu0 = cpuMs();
  while (time < seconds && quiet < 6) {
    time += STEP;
    const changed = lattice.step(STEP, time, (type, tile) => {
      const house = tile.tag;
      if (!house) return;
      if (type === 'ignition') {
        house.firstIgnition ??= time; house.lastIgnition = time;
        if (tile.roof) house.roofIgnition ??= time; else if (tile.k >= 2) house.upperIgnition ??= time;
      } else if (house.tiles.every(t => t.phase === 'spent')) house.gone = time;
    });
    for (const drum of drums) if (drum.exploded === null && drum.tile.heat >= DEFAULT_CONFIG.barrel.ignitionHeat) {
      drum.exploded = time; lattice.emit(drum, DEFAULT_CONFIG.barrel.blastRadius, DEFAULT_CONFIG.barrel.heat, 'drum');
    }
    if (bystander) exposureSeconds += lattice.exposure(bystander) * STEP;
    changedTotal += changed.length; peakChanged = Math.max(peakChanged, changed.length); peakBurning = Math.max(peakBurning, lattice.burning.size);
    quiet = lattice.burning.size || lattice.warm.size ? 0 : quiet + STEP;
    onTick?.(time);
  }
  const ticks = lattice.stats.ticks;
  return {fireOut: round(time - quiet, 2), cpuPerTick: round((cpuMs() - cpu0) / ticks, 3), changedPerTick: round(changedTotal / ticks, 1), peakChanged, peakBurning, exposureSeconds: round(exposureSeconds, 2)};
}
// Radiation in this demo runs house shell to house shell only (and to tiles explicitly watched). Gain scales the
// heat one burning tile sends at 1 m; it falls with distance squared, and the sum must beat the 0.3/s cooling
// before anything warms at all. That floor is what lets a street act as a firebreak.
const RADIANT = [['contact only', {}], ['contact + weak radiation (gain 0.012, 10 m)', {reach: 10, radiantGain: .012}], ['contact + strong radiation (gain 0.06, 20 m)', {reach: 20, radiantGain: .06}]];
const tileOf = (street, x, y) => { const i0 = Math.floor(x) * 2, j0 = Math.floor(y) * 2; return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => street.lattice.at(i0 + a, j0 + b, 0)); };
const ground = (street, test) => { const cells = [...street.lattice.tiles.values()].filter(t => t.k === 0 && !t.tag && test(t)); return cells; };

if (run('C')) {
  const rows = [];
  // C1. One match on the north lawn, beside the shipped game's result for the same strike (one-match-census.mjs).
  {
    const street = buildStreet();
    const north = ground(street, t => t.y < 16 && t.fuel === 'grass'), south = ground(street, t => t.y > 25 && t.fuel === 'grass');
    const result = burn(street, {strike: tileOf(street, 30.8, 14)});
    const side = id => street.snapshot.world.buildings.find(b => b.id === id).y < 20 ? 'north' : 'south';
    const census = JSON.parse(fs.readFileSync(new URL('./results/one-match-census.json', import.meta.url))).find(r => r.id === 'north-lawn');
    const caught = (list, where) => list.filter(h => side(h.id) === where && h.firstIgnition !== null).length;
    rows.push({model: 'shipped game', 'flames out s': census.flamesOutAt, 'north lawn': Math.round(100 * census.burnedShare.northLawn) + '%', 'south lawn': Math.round(100 * census.burnedShare.southLawn) + '%',
      'north houses caught': caught(census.houses, 'north') + '/3', 'south houses caught': caught(census.houses, 'south') + '/5', drums: census.drums.length});
    rows.push({model: 'lattice kernel, contact only', 'flames out s': result.fireOut, 'north lawn': Math.round(100 * north.filter(t => t.phase === 'spent').length / north.length) + '%',
      'south lawn': Math.round(100 * south.filter(t => t.phase === 'spent').length / south.length) + '%',
      'north houses caught': caught(street.houses, 'north') + '/3', 'south houses caught': caught(street.houses, 'south') + '/5',
      drums: street.drums.filter(d => d.exploded !== null).length});
  }
  results.C1 = rows;
  console.log('\nC1. The real street, one match on the north lawn at (30.8, 14).\n');
  console.log(table(rows, Object.keys(rows[0])));

  // C2. One match on a house with the lawn removed: the three axes inside a building.
  const shipped = Object.fromEntries(JSON.parse(fs.readFileSync(new URL('./results/structure-spread.json', import.meta.url))).map(r => [r.house, r]));
  const houseRows = [];
  for (const [id, x, y] of [['hopkins-nine', 9.9, 34.63], ['hopkins-fifteen', 23.9, 8.5], ['monroe-row-middle', 38.5, 31.15]]) {
    const street = buildStreet({lawn: false});
    const house = street.houses.find(h => h.id === id);
    // The struck tile: the nearest house tile on the ground layer to the aim point.
    const target = house.tiles.filter(t => t.k === 0).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    burn(street, {strike: [target], seconds: 120});
    const others = street.houses.filter(h => h !== house && h.firstIgnition !== null).map(h => h.id + ' @' + round(h.firstIgnition, 1));
    const ref = shipped[id];
    houseRows.push({house: id, tiles: house.tiles.length, 'upper storey s': round(house.upperIgnition, 2) + ' (' + ref.firstUpperWall + ')', 'roof s': round(house.roofIgnition, 2) + ' (' + ref.firstRoof + ')',
      'last ignition s': round(house.lastIgnition, 2) + ' (' + ref.lastIgnition + ')', 'flames out s': round(house.gone, 2) + ' (' + ref.flamesOut + ')', 'other houses lit': others.join(', ') || 'none'});
  }
  results.C2 = houseRows;
  console.log('\nC2. One match on a low wall, lawn removed. Lattice time, with the shipped game\'s time in brackets.\n');
  console.log(table(houseRows, Object.keys(houseRows[0])));

  // C3. Does a burning house reach across a gap, hurt a bystander, set off a drum? (Shipped: no, no, no.)
  const gapRows = [];
  for (const [label, options] of RADIANT) {
    const street = buildStreet({lawn: false, ...options});
    const house = street.houses.find(h => h.id === 'hopkins-nine');
    const target = house.tiles.filter(t => t.k === 0).sort((a, b) => Math.hypot(a.x - 9.9, a.y - 34.63) - Math.hypot(b.x - 9.9, b.y - 34.63))[0];
    // Watched bare tiles east of the wall (the wall face is at x = 10): one touching it, one a tile further out.
    const watch = (x, y) => street.lattice.add(street.index(x), street.index(y), 0, {radiates: true});
    const near = watch(10.25, 34.63), far = watch(10.82, 34.63);
    const drum = {x: 10.75, y: 37.5, tile: watch(10.75, 37.5), exploded: null};
    street.drums.push(drum);
    let nearSeconds = 0, farSeconds = 0;
    burn(street, {strike: [target], seconds: 160, onTick: () => { nearSeconds += street.lattice.exposure(near) * STEP; farSeconds += street.lattice.exposure(far) * STEP; }});
    const lit = id => { const h = street.houses.find(h => h.id === id); return h.firstIgnition === null ? 'no' : 'at ' + round(h.firstIgnition, 1) + ' s'; };
    gapRows.push({rule: label, 'Hopkins 13, 5 m east': lit('hopkins-thirteen'), 'Monroe row, 4 m beyond that': lit('monroe-row-house'), 'Hopkins 12, across the street': lit('hopkins-twelve'),
      'bystander touching the wall: damage': Math.round(DEFAULT_CONFIG.fire.damagePerSecond * nearSeconds) + ' hp', 'bystander 0.8 m out: damage': Math.round(DEFAULT_CONFIG.fire.damagePerSecond * farSeconds) + ' hp',
      'drum 0.75 m from the wall': drum.exploded === null ? 'never' : 'at ' + round(drum.exploded, 1) + ' s'});
  }
  results.C3 = gapRows;
  console.log('\nC3. Hopkins 9 lit on bare paving (no lawn anywhere). The shipped game\'s result for this scene is experiment 2-3 of pathways.mjs.\n');
  console.log(table(gapRows, Object.keys(gapRows[0])));
}

if (run('D')) {
  const street = buildStreet();
  const fuelled = [...street.lattice.tiles.values()].filter(t => t.fuel).length;
  const result = burn(street, {strike: tileOf(street, 30.8, 14)});
  const shipped = JSON.parse(fs.readFileSync(new URL('./results/tick-cost.json', import.meta.url)));
  const fireRows = shipped.rows.filter(r => r.phase.startsWith('lawn fire'));
  const mean = key => fireRows.reduce((n, r) => n + r[key], 0) / fireRows.length;
  results.D = {tiles: street.lattice.tiles.size, fuelledTiles: fuelled, latticeCpuPerTick: result.cpuPerTick, changedPerTick: result.changedPerTick, peakChanged: result.peakChanged, peakBurning: result.peakBurning,
    shippedStepCpu: round(mean('step cpu'), 2), shippedSnapshotCpu: round(mean('snapshot cpu'), 2), shippedPublishedPerTick: 9588, linkVisitsPerTick: round(street.lattice.stats.visits / street.lattice.stats.ticks, 0)};
  console.log('\nD. Cost of the same north-lawn fire (CPU ms per tick, user + system).\n');
  console.log(table([
    {model: 'shipped game', 'tracked units': '9588 cells + 2218 sites', 'step cpu ms': results.D.shippedStepCpu, 'publish cpu ms': results.D.shippedSnapshotCpu + ' (whole grid copied)', 'units published per tick': '9588 cells, every tick'},
    {model: 'lattice kernel', 'tracked units': results.D.tiles + ' tiles (' + fuelled + ' with fuel)', 'step cpu ms': results.D.latticeCpuPerTick, 'publish cpu ms': 'not built (change list only)', 'units published per tick': results.D.changedPerTick + ' mean, ' + results.D.peakChanged + ' peak'}
  ], ['model', 'tracked units', 'step cpu ms', 'publish cpu ms', 'units published per tick']));
}
if (!wanted.length) fs.writeFileSync(new URL('./results/lattice-demo.json', import.meta.url), JSON.stringify(results, null, 1) + '\n');
