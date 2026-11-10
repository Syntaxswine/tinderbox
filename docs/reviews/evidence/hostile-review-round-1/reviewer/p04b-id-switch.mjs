// 4a refined: identical one-house scene, only scenario.id differs. Two aims, because the legacy model lights a ground tile, not a wall site.
import {createSimulation, NEIGHBORHOOD_SCENARIO, press, lastTool, r} from './lib.mjs';
const hopkins9 = NEIGHBORHOOD_SCENARIO.buildings.find(b => b.id === 'hopkins-nine');
for (const id of ['neighborhood', 'my-new-street']) for (const aimX of [9.9, 10.3]) {
  const sim = createSimulation({scenario: {id, width: 16, height: 44, buildings: [hopkins9], obstacles: [], actors: [],
    player: {x: 10.82, y: 34.63, tool: 'matches', heading: Math.PI}}, config: {fire: {damagePerSecond: 0}}});
  const before = sim.snapshot();
  let s = press(sim, aimX, 34.63);
  const tool = lastTool(s), t0 = s.clocks.world;
  let peakSites = 0, maxSiteY = 0, destroyedAt = null, peakCells = 0, firstLoss = null, partial = false;
  for (let i = 0; i < 1200; i++) {
    s = sim.advance(.25);
    peakSites = Math.max(peakSites, s.structureFire.filter(x => x.flame > 0).length);
    for (const x of s.structureFire) maxSiteY = Math.max(maxSiteY, x.y);
    peakCells = Math.max(peakCells, s.diagnostics.burningCells);
    const boxes = s.world.obstacles.length;
    if (firstLoss === null && boxes !== before.world.obstacles.length) firstLoss = r(s.clocks.world - t0, 2);
    if (boxes && boxes !== before.world.obstacles.length) partial = true;
    if (s.world.buildings[0].destroyed) { destroyedAt = r(s.clocks.world - t0, 2); break; }
    if (!s.diagnostics.burningCells && !s.structureFire.length && i > 8) break;
  }
  console.log(id.padEnd(14), 'aim x=' + aimX, '| footprint cells:', [...new Set(before.cells.filter(c => Math.abs(c.x - 6.5) < 3 && Math.abs(c.y - 35) < 4).map(c => c.material))].join('/'),
    '| sections:', before.world.buildings[0].sections?.length ?? 'none', '| match:', tool.result, (tool.cellIds ?? []).join(' ').slice(0, 60),
    '| peak flaming sites', peakSites, 'max site height', r(maxSiteY, 2), '| peak burning ground cells', peakCells,
    '| partial collapse seen', partial, '| first collider change +' + firstLoss, '| destroyed +' + destroyedAt, '| burnedFraction', r(s.world.buildings[0].burnedFraction, 3));
  sim.dispose();
}
