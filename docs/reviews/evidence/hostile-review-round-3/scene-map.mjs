// Prints the compiled Catalogue Street as the fire model sees it: one character per
// 1 m authoring tile, plus the fuel census of the 0.5 m ground field and the
// per-house structural fire graph.
//   node docs/reviews/evidence/hostile-review-round-1/scene-map.mjs
import {createSimulation, scenarioDefinition, NEIGHBORHOOD_SCENARIO, table, round} from './lib.mjs';
import {HOUSING_PLANS} from '../../../../src/content/housing-plans.js';
import {createHousingTopology} from '../../../../src/simulation/housing-topology.js';
import {localHousingFootprints} from '../../../../src/content/buildings.js';
import {DEFAULT_CONFIG} from '../../../../src/simulation/config.js';

const def = scenarioDefinition(NEIGHBORHOOD_SCENARIO);
const sim = createSimulation({scenario: NEIGHBORHOOD_SCENARIO, seed: 1893});
const s = sim.snapshot();
const {width, height} = s.world;

const glyph = {grass: '.', road: '=', paving: ' ', wood: 'w', masonry: 'M'};
const rows = [];
for (let y = 0; y < height; y++) {
  let line = '';
  for (let x = 0; x < width; x++) {
    const tile = s.world.tiles.find(t => t.x === x + .5 && t.y === y + .5);
    let c = glyph[tile.material] ?? '?';
    for (const o of s.world.obstacles) {
      if (Math.abs(x + .5 - o.x) <= o.width / 2 && Math.abs(y + .5 - o.y) <= o.depth / 2) {
        c = o.kind === 'barrel' ? 'o' : o.kind === 'building-foundation' ? (o.role === 'foundation' ? '#' : '+') :
          o.kind === 'shop-prop' ? 'p' : o.kind === 'wall' ? 'M' : c;
      }
    }
    line += c;
  }
  rows.push(String(y).padStart(2) + ' ' + line);
}
console.log('Catalogue Street, 1 char = 1 m tile.  . grass  = road  (blank) paving  w wood floor  # house footprint  + porch/stairs  M masonry wall  p shop prop  o drum');
console.log('   ' + Array.from({length: width}, (_, x) => x % 10 === 0 ? String(x / 10) : ' ').join(''));
console.log(rows.join('\n'));

const census = {};
for (const cell of s.cells) {
  const key = cell.material;
  census[key] ??= {material: key, cells: 0, fuelCells: 0, surfaceFuel: 0};
  census[key].cells++;
  if (cell.surfaceFuel > 0) census[key].fuelCells++;
  census[key].surfaceFuel += cell.surfaceFuel;
}
console.log('\nGround field: ' + s.cells.length + ' cells of ' + s.world.fireCellSize + ' m');
console.log(table(Object.values(census).map(c => ({...c, surfaceFuel: round(c.surfaceFuel, 2), share: round(100 * c.cells / s.cells.length, 1) + '%'})),
  ['material', 'cells', 'share', 'fuelCells', 'surfaceFuel']));

console.log('\nStructural fire graph per house (sites are the only fire state a house has):');
const houseRows = [];
for (const building of s.world.buildings) {
  const plan = HOUSING_PLANS[building.prefabId];
  const boxes = localHousingFootprints(building.prefabId, building.partyWalls);
  const {sites} = createHousingTopology(building, plan, boxes, DEFAULT_CONFIG, undefined);
  const by = layer => sites.filter(site => site.layer === layer);
  const links = sites.reduce((n, site) => n + site.links.length, 0) / 2;
  // connected components of the link graph
  const seen = new Set(); let components = 0, largest = 0;
  for (const site of sites) {
    if (seen.has(site)) continue;
    components++; let size = 0; const stack = [site]; seen.add(site);
    while (stack.length) { const a = stack.pop(); size++; for (const {target} of a.links) if (!seen.has(target)) { seen.add(target); stack.push(target); } }
    largest = Math.max(largest, size);
  }
  const heights = sites.map(site => site.y);
  houseRows.push({house: building.id, prefab: building.prefabId, plan: plan.width + 'x' + plan.depth + ' m', storeys: plan.floors.length,
    wall: plan.style.wall, sites: sites.length, floor: by('floor').length, walls: by('walls').length, roof: by('roof').length,
    links, components, isolated: sites.filter(site => !site.links.length).length, largest,
    yRange: round(Math.min(...heights), 2) + '..' + round(Math.max(...heights), 2)});
}
console.log(table(houseRows, ['house', 'prefab', 'plan', 'storeys', 'wall', 'sites', 'floor', 'walls', 'roof', 'links', 'components', 'isolated', 'largest', 'yRange']));
console.log('\nObstacles: ' + def.obstacles.length + ' (' + [...new Set(def.obstacles.map(o => o.kind))].map(kind => kind + ' ' + def.obstacles.filter(o => o.kind === kind).length).join(', ') + ')');
sim.dispose();
