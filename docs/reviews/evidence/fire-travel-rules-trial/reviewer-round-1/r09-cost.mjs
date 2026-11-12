// Round 1, probe 9: cost. One, three and eight furnished Hopkins 15 houses in a row 2 m apart, a match on each at t = 0
// (the worst case) and a match on the first only. ms per step, tiles touched per step, and where the time goes.
// Run with nothing else running.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r09-cost.mjs [quick]
import {ALL, round, out, createVar, house} from './lib.mjs';
const lines = [], pad = (s, n) => String(s ?? '-').padEnd(n);
function street(count, all, seconds = 150, time = true) {
  const world = createVar({variant: {time}});
  const houses = []; for (let n = 0; n < count; n++) houses.push(house(world, 'H' + n, 'hopkins-4-15', 6 + 12 * n, 6, ALL));
  for (const [n, h] of houses.entries()) if (all || n === 0) world.ignite(world.tileAt(h.origin[0] + 19, h.origin[1] + 4, 0), 'clapboard');
  const ms = [], steps = seconds * 30; let peakActive = 0, peakBurning = 0, sumActive = 0, sumBurning = 0, sumWarm = 0, samples = 0;
  for (let s = 0; s < steps; s++) {
    const t0 = performance.now(); world.step(); ms.push(performance.now() - t0);
    if (world.active.size > peakActive) peakActive = world.active.size;
    if (s % 30 === 0) { let burning = 0, warm = 0; for (const t of world.active) { if (t.fuels.some(f => f.lit)) burning++; else if (t.heat > .05) warm++; } samples++; sumActive += world.active.size; sumBurning += burning; sumWarm += warm; if (burning > peakBurning) peakBurning = burning; }
  }
  const sorted = [...ms].sort((a, b) => a - b), total = ms.reduce((a, b) => a + b, 0), st = world.stats;
  return {tiles: world.tiles.size, mean: total / steps, p50: sorted[Math.floor(steps / 2)], p95: sorted[Math.floor(steps * .95)], p99: sorted[Math.floor(steps * .99)], max: sorted.at(-1), over8: ms.filter(x => x > 8.33).length, over16: ms.filter(x => x > 16.7).length,
    peakActive, peakBurning, meanActive: sumActive / samples, meanBurning: sumBurning / samples, meanWarm: sumWarm / samples,
    linkOps: st.linkOps / steps, phase2: st.phase2 / steps, relinks: st.relinks / steps, relinkShare: st.relinkMs / total, radiateShare: st.radiateMs / total, radiateMsPerCall: st.radiateMs / st.radiateCalls, radiateScans: st.radiateScans / st.radiateCalls, faceChanges: world.events.filter(e => e.type === 'opened' || e.type === 'glass').length, steps, world};
}
lines.push('ms per step of 1/30 s. The game\'s figure today is 3 to 5 ms per FRAME of 1/60 s; a 1/30 s step lands on every second frame, so a step IS a frame\'s cost when it runs.');
lines.push(pad('houses', 8) + pad('struck', 8) + pad('tiles', 7) + pad('mean', 7) + pad('p50', 7) + pad('p95', 7) + pad('p99', 7) + pad('max', 8) + pad('>8.3ms', 8) + pad('>16.7ms', 9) + pad('peak active', 13) + pad('peak burning', 14) + pad('relinks/step', 14) + pad('relink %', 10) + pad('radiate %', 11) + pad('ms/radiate', 12) + 'tiles scanned per radiate');
const keep = {};
// quick mode: 'quick' as the first argument runs only one house, 150 s (a few seconds).
const quick = process.argv[2] === 'quick';
for (const [count, all] of quick ? [[1, true]] : [[1, true], [3, true], [3, false], [8, true], [8, false]]) {
  const r = street(count, all, quick ? 150 : all ? 150 : 300); keep[count + (all ? 'all' : 'first')] = r;
  lines.push(pad(count, 8) + pad(all ? 'all' : 'first', 8) + pad(r.tiles, 7) + pad(round(r.mean), 7) + pad(round(r.p50), 7) + pad(round(r.p95), 7) + pad(round(r.p99), 7) + pad(round(r.max, 1), 8) + pad(r.over8, 8) + pad(r.over16, 9) + pad(r.peakActive, 13) + pad(r.peakBurning, 14) + pad(round(r.relinks, 1), 14) + pad(round(100 * r.relinkShare, 1), 10) + pad(round(100 * r.radiateShare, 1), 11) + pad(round(r.radiateMsPerCall, 1), 12) + round(r.radiateScans));
}
if (quick) { out('r09-cost-quick.txt', lines); process.exit(0); }
const r8 = keep['8all'];
lines.push('', 'eight houses, all struck: mean active tiles ' + round(r8.meanActive) + ', of which burning ' + round(r8.meanBurning) + ', unlit but warm (heat > 0.05) ' + round(r8.meanWarm) + ', neither ' + round(r8.meanActive - r8.meanBurning - r8.meanWarm) + '; link sends per step ' + round(r8.linkOps) + '; tiles processed in phase 2 per step ' + round(r8.phase2) + '; face changes over the run ' + r8.faceChanges);
lines.push('every face change bumps one global faceVersion, and every active tile rebuilds its 26 links the next time it is touched: relinks per step ' + round(r8.relinks, 1) + ' = ' + round(100 * r8.relinks / r8.meanActive, 1) + ' % of the mean active set, every step.');
lines.push('radiate() resets tile.rad by walking ALL ' + r8.tiles + ' tiles (' + round(r8.radiateScans) + ' per call), burning or not, every 0.5 s.');
// timing overhead control
const plain = street(3, true, 150, false);
lines.push('CONTROL three houses all struck with the relink timer off: mean ' + round(plain.mean) + ' ms (timer on: ' + round(keep['3all'].mean) + ' ms)');
out('r09-cost.txt', lines);
