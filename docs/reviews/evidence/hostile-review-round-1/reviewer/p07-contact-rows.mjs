// D: ground<->siding contact samples one point per 1 m panel (surface-fire.js:117-135).
// Panel centres sit on a 0.5 m cell boundary, so only one of the two cells in front of a panel is coupled.
// Fixture = the repo's own fire-exposure geometry (tests/simulation/fire-exposure.test.js): Hopkins 9 east wall,
// receiver hopkins-nine/wall:0:7,4|7,5:0, one gas-filled 0.5 m cell. Row 69 is the repo's case (control).
import {createSimulation, NEIGHBORHOOD_SCENARIO, COTTAGE_PAIR_SCENARIO, calmCottageWind, DEFAULT_CONFIG, r, STEP} from './lib.mjs';
const {id, ...hopkins} = NEIGHBORHOOD_SCENARIO.buildings.find(b => b.id === 'hopkins-nine');
const fuel = DEFAULT_CONFIG.fuel;

function hopkinsCase(col, row, passes = 4) {
  const x = col * .5, y = row * .5;
  const scenario = {id: 'neighborhood', width: 16, height: 44, buildings: [{id, ...hopkins}], obstacles: [], actors: [], pickups: [],
    player: {x: 14, y: 20, tool: 'matches'},
    fuelLines: [{from: {x: x + .01, y: y + .25}, to: {x: x + .49, y: y + .25}, litresPerMetre: passes * fuel.gasPerMetre}],
    ignitions: [{x: x + .25, y: y + .25, radius: .01, heat: 3}]};
  const sim = createSimulation({scenario, config: {fire: {damagePerSecond: 0}}});
  let s, peak = 0, peakSite = null, first = null, burn = 0;
  for (let i = 0; i < 15 * 60; i++) {
    s = sim.advance(STEP);
    if (s.diagnostics.burningCells) burn = s.clocks.world;
    for (const site of s.structureFire) if (site.ignitionTime === null && site.heatFraction > peak) { peak = site.heatFraction; peakSite = site.id; }
    first ??= s.events.find(e => e.type === 'structure-ignition');
    if (first) break;
  }
  sim.dispose();
  return {cell: `cell:${col},${row}`, cellSpanY: [y, y + .5], sourceBurn: r(burn, 2), peakPreheatFraction: r(peak, 3), peakSite: peakSite?.split('/')[1] ?? null,
    ignition: first ? first.siteId.split('/')[1] + ' @' + r(first.worldTime, 2) + ' parent ' + first.parentSiteId : 'NONE'};
}
console.log('== Hopkins 9 east wall (plan x=7, world x=10.08). Panel 7,4|7,5 spans world y 34..35; panel 7,3|7,4 spans 33..34 ==');
for (const [col, row] of [[20, 69], [20, 68], [20, 67], [20, 66], [21, 69], [21, 68]]) console.log(JSON.stringify(hopkinsCase(col, row)));

console.log('\n== Whole east wall of Hopkins 9: which first-contact cells (col 20) can light the siding at all? ==');
const coupled = [], dead = [];
for (let row = 60; row < 80; row++) { const result = hopkinsCase(20, row); (result.ignition === 'NONE' ? dead : coupled).push(row + (result.peakPreheatFraction ? '' : '(0 heat)')); }
console.log('rows that ignite siding:', coupled.join(' '));
console.log('rows that never ignite :', dead.join(' '));
