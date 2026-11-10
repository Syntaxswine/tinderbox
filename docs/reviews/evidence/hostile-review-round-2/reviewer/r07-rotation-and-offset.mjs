// Fix B away from the shipped placements. The street only uses quarterTurns 0 and 2 on whole-metre origins. Place every
// prefab alone on bare paving at all four rotations and at three origins (whole metre, quarter metre, and 0.04 m which
// puts the 0.38 m band exactly on a cell edge), read the shipped frontage table through the read-only taps, and check
// for every ground-storey wall site that is not behind its own porch or plinth:
//   strength  : the couplings actually used (strongest clear path per cell, as the exchange applies them) sum to 0.084
//               per metre of panel (0.024 + 0.018 per half-metre). Less than that means part of the edge is not counted.
// Usage: node r07-rotation-and-offset.mjs
import {underPatches, TAPS, load, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const api = await load();
const {lineClear, inObstacle} = await import(api.root + 'simulation/geometry.js');
const prefabs = ['hopkins-4-09', 'hopkins-4-12', 'hopkins-4-13', 'hopkins-4-15', 'ashland-worker', 'monroe-row'];
const rows = [];
let weakest = null;
for (const prefabId of prefabs) for (const quarterTurns of [0, 1, 2, 3]) for (const offset of [0, .25, .04]) {
  globalThis.__lots = [];
  let sim;
  try {
    sim = api.createSimulation({scenario: {id: 'neighborhood', width: 48, height: 48, buildings: [{id: 'house', prefabId, x: 24 + offset, y: 24 + offset, quarterTurns}],
      obstacles: [], actors: [], player: {x: 2, y: 2}}});
  } catch (error) { rows.push(`${prefabId} q${quarterTurns} +${offset}: could not build (${error.message})`); continue; }
  sim.advance(api.STEP);
  const lot = globalThis.__lots[0], obstacles = globalThis.__tb.state.obstacles;
  let sites = 0, covered = 0, full = 0, short = 0, minRatio = Infinity;
  for (const {site, fronts, frontage} of lot.groundSites) {
    if (!site.id.startsWith('wall:')) continue;
    sites++;
    const {x, z, nx, nz, span} = fronts[0];
    const outside = {x: x + nx * .2, y: z + nz * .2};
    if (obstacles.some(o => inObstacle(outside, o))) { covered++; continue; }
    let used = 0;
    for (const {cell, probes} of frontage) {
      const clear = probes.find(p => lineClear(cell, p.edge, obstacles));
      if (!clear) continue;
      used += clear.coupling;
    }
    const expected = .084 * span, ratio = used / expected;

    if (Math.abs(ratio - 1) < 1e-9) full++; else { short++; if (ratio < minRatio) minRatio = ratio; if (!weakest || ratio < weakest.ratio) weakest = {ratio, where: `${prefabId} q${quarterTurns} +${offset} ${site.id}`}; }
  }
  rows.push(`${prefabId.padEnd(14)} q${quarterTurns} origin +${String(offset).padEnd(4)}: wall sites ${String(sites).padStart(2)} | behind own porch/plinth ${String(covered).padStart(2)} | open-air sites at full strength ${String(full).padStart(2)}, ` +
    `BELOW full strength ${String(short).padStart(2)}${short ? ' (weakest ' + r(minRatio * 100, 1) + '% of 0.084/m)' : ''}`);
  sim.dispose();
}
console.log(rows.join('\n'));
console.log(weakest ? `\nRESULT: weakest open-air wall site keeps ${r(weakest.ratio * 100, 1)}% of the full-edge coupling: ${weakest.where}` : '\nRESULT: every open-air wall site has the full-edge coupling at every rotation and origin tried');
