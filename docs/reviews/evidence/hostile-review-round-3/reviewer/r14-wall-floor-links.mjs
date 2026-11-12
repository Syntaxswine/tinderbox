// r14: wall panels that lost their floor link. tip2 linked every wood wall panel to the nearest floor site within
// 2.2 m; this tree links a panel only to a floor patch whose edge lies on the panel's wall line. For every wood
// panel with no floor link, look 0.25 m inside the wall at five points along the panel: is there oak there?
//   oak present  -> a real floor edge the new rule failed to link (a miss)
//   no oak       -> the panel stands beside a void (stair opening, or an upper wall over a lower roof), no link is right
// Also reports how the panel still catches fire: its links to other sites.
// Run: node r14-wall-floor-links.mjs
import {HEAD, r} from './lib.mjs';
const {HOUSING_PLANS} = await import(HEAD + 'content/housing-plans.js');
const {compileBuildings, localHousingFootprints} = await import(HEAD + 'content/buildings.js');
const {createHousingTopology} = await import(HEAD + 'simulation/housing-topology.js');
const {compileFloorSupport, floorPatchContains} = await import(HEAD + 'content/housing-floors.js');
const {housingSectionGrid} = await import(HEAD + 'content/housing-sections.js');
const {DEFAULT_CONFIG} = await import(HEAD + 'simulation/config.js');
let panels = 0, unlinked = 0, misses = 0, partial = 0;
for (const prefabId of Object.keys(HOUSING_PLANS)) {
  const plan = HOUSING_PLANS[prefabId], [building] = compileBuildings([{id: 'a', prefabId, x: 24, y: 24, quarterTurns: 0}]).buildings;
  const topo = createHousingTopology(building, plan, localHousingFootprints(prefabId, building.partyWalls), DEFAULT_CONFIG);
  const grid = housingSectionGrid(prefabId);
  for (const panel of topo.panels) {
    if (!panel.low) continue; panels++;
    const {patches} = compileFloorSupport(plan, panel.level, grid);
    const tx = (panel.b[0] - panel.a[0]) / panel.length, tz = (panel.b[1] - panel.a[1]) / panel.length;
    const oak = [-.4, -.2, 0, .2, .4].map(u => [panel.x + tx * u * panel.length - panel.nx * .25, panel.z + tz * u * panel.length - panel.nz * .25])
      .filter(point => patches.some(patch => floorPatchContains(patch, point))).length;
    const linked = panel.low.links.some(({target}) => target.id.startsWith('floor:'));
    if (linked && oak < 5) partial++;
    if (linked) continue;
    unlinked++;
    if (oak) misses++;
    console.log(`${prefabId} ${panel.low.id}: oak behind the wall at ${oak}/5 points -> ${oak ? 'MISS' : 'void behind, no link is right'}; other links: ${panel.low.links.map(l => l.target.id.split(':').slice(0, 2).join(':')).join(' ')}`);
  }
}
console.log(`${panels} wood wall panels (6 plans, both storeys): ${unlinked} without a floor link, of which ${misses} have oak directly behind them; ${partial} linked panels have oak behind only part of their length`);
