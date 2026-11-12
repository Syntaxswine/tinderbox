// Round 4. Margins of targets 2, 3 and 10 on the CURRENT numbers (heat ceiling 2.9): each of rate, loss and the
// heat ceiling moved 5 % and 10 % each way. Target 1 is swept with grass.mjs from the shell (r08-grass.sh).
//   node r08-fragile.mjs
import {make, house, lawn, paving, outsideWalls, PITCH, round} from '../measure.mjs';
import {DEFAULT_RULES, DEFAULT_FUELS} from '../kernel.mjs';
import {bareWall} from '../wall.mjs';
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
// Target 2 on every ground wall face of Hopkins 09 that grass touches (the plan with the longest wait, r02), lawn lit at one corner.
function target2(rules) {
  const world = make(rules), a = house(world, 'A', 'hopkins-4-09', 8, 8, {});
  lawn(world, 0, 0, Math.round((16 + a.plan.width) / PITCH), Math.round((16 + a.plan.depth) / PITCH));
  world.ignite(world.tileAt(2, 2, 0));
  run(world, 25);
  const waits = outsideWalls(world, a).filter(w => w.outside.fuels[0]?.cls === 'grass').map(w => w.fuel.litAt !== null && w.outside.fuels[0].litAt !== null ? w.fuel.litAt - w.outside.fuels[0].litAt : Infinity);
  return {min: Math.min(...waits), max: Math.max(...waits), over: waits.filter(w => w >= 2).length, n: waits.length};
}
function target10(rules) {
  const crossed = (build, far) => { const world = make(rules); build(world); world.ignite(world.tileAt(2, 10, 0)); run(world, 40); return world.events.find(e => e.type === 'lit' && far(e.at))?.time ?? null; };
  const straight = crossed(world => { lawn(world, 0, 0, 20, 21); paving(world, 20, 0, 21, 21); lawn(world, 21, 0, 41, 21); }, at => at[0] >= 21);
  const diagonal = n => crossed(world => { for (let j = 0; j < 41; j++) for (let i = 0; i < 41; i++) { const t = world.addTile(i, j, 0); if (i + j < 40 || i + j >= 40 + n) world.addFuel(t, 'grass', 1); } }, at => at[0] + at[1] >= 40 + n);
  return {straight, d1: diagonal(1), d2: diagonal(2)};
}
const variants = [['as proposed', {}]];
for (const [name, base] of [['rate', DEFAULT_RULES.rate], ['loss', DEFAULT_RULES.loss], ['maxHeat', DEFAULT_RULES.maxHeat]]) for (const f of [.9, .95, 1.05, 1.1]) variants.push([name + ' x' + f, {[name]: +(base * f).toFixed(4)}]);
variants.push(['maxHeat 3 (round 3 value)', {maxHeat: 3}]);
const c = (v, lo, hi) => v >= lo && v <= hi ? 'ok  ' : 'FAIL';
for (const [name, rules] of variants) {
  const t2 = target2(rules), w = bareWall(rules), t10 = target10(rules);
  console.log(name.padEnd(26) + ' T2 wait ' + t2.min.toFixed(3) + ' to ' + (Number.isFinite(t2.max) ? t2.max.toFixed(3) : 'never') + ' s, ' + t2.over + ' of ' + t2.n + ' at 2 s or more ' + (t2.over ? 'FAIL' : 'ok  ')
    + ' | T3 bare wall ' + round(w.up) + ' up ' + round(w.along) + ' along ' + round(w.ratio, 2) + ' ' + c(w.ratio, 2.5, 3.5)
    + ' | T10 square ' + (t10.straight === null ? 'holds' : 'CROSSES ' + round(t10.straight)) + ', diagonal 1 tile ' + (t10.d1 === null ? 'holds' : 'CROSSES ' + round(t10.d1)) + ', 2 tiles ' + (t10.d2 === null ? 'holds' : 'CROSSES ' + round(t10.d2)));
}
// Target 10's own margin: the grass output at which the square strip is first crossed.
for (const out of [.7, .72, .74, .76, .78, .8, .85]) {
  const world = make({}, {grass: {out}}); lawn(world, 0, 0, 20, 21); paving(world, 20, 0, 21, 21); lawn(world, 21, 0, 41, 21); world.ignite(world.tileAt(2, 10, 0)); run(world, 40);
  let peak = 0; // not tracked per step; report crossing only
  console.log('grass output ' + out + ' (' + round(100 * (out / DEFAULT_FUELS.grass.out - 1), 0) + ' %): 0.5 m square strip ' + (world.events.find(e => e.type === 'lit' && e.at[0] >= 21) ? 'CROSSED' : 'holds'));
}
