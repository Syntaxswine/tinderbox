// Round 2. Target 3: fire up a wall against along it, 2.5 to 3.5 to 1.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r08-climb.mjs <bare|house>
import {make, burn, outsideWalls, strikesOf, round, PLANS, LAYER, PITCH} from './measure-var.mjs';
import {bareWall} from '../wall.mjs';
const part = process.argv[2];
const inRange = v => v >= 2.5 && v <= 3.5 ? 'in' : 'OUT';
// The author's bare wall, with the height, the side the match is held on and what is timed all free.
function wall({rules = {}, fuels = {}, layers = 6, inside = false, air = true} = {}) {
  const world = make(rules, fuels);
  for (let j = 0; j <= 40; j++) for (let k = 0; k < layers; k++) {
    const tile = world.addTile(0, j, k); if (air) { world.addTile(1, j, k); world.addTile(-1, j, k); }
    world.addFuel(tile, 'clapboard', 1, {face: {axis: 0, step: 1, object: world.setFace(0, j, k, 0, 1, 'timber')}});
  }
  const f = (j, k) => world.tileAt(0, j, k).fuels[0];
  world.ignite(world.tileAt(0, 20, 0), null, {fuel: f(20, 0), from: inside ? null : world.tileAt(1, 20, 0)});
  for (let n = Math.round(120 / world.dt); n > 0; n--) world.step();
  const top = layers - 1, t = k => f(20, k).litAt, a = d => Math.max(f(20 + d, 0).litAt ?? Infinity, f(20 - d, 0).litAt ?? Infinity);
  return {up: top * LAYER / t(top), along: 3 / a(6), ratio: top * LAYER / t(top) / (3 / a(6)),
    upSteady: top >= 3 ? (top - 1) * LAYER / (t(top) - t(1)) : null, alongSteady: 2 / (a(8) - a(4)), ratioSteady: top >= 3 ? (top - 1) * LAYER / (t(top) - t(1)) / (2 / (a(8) - a(4))) : null,
    upTimes: Array.from({length: layers}, (_, k) => round(t(k))), alongTimes: [1, 2, 4, 6, 8].map(d => round(a(d)))};
}
if (part === 'bare') {
  const a = bareWall(), c = wall();
  console.log('control: author', round(a.up, 4), round(a.along, 4), round(a.ratio, 3), '| mine', round(c.up, 4), round(c.along, 4), round(c.ratio, 3), a.ratio === c.ratio ? 'AGREE' : 'DISAGREE');
  console.log('as tuned: layer light times', c.upTimes.join(', '), 's | along at 0.5, 1, 2, 3, 4 m:', c.alongTimes.join(', '), 's | steady (past the first tile): up', round(c.upSteady, 3), 'along', round(c.alongSteady, 3), 'ratio', round(c.ratioSteady, 2), inRange(c.ratioSteady));
  for (const [name, o] of [['wall 4 layers tall (a two-storey house)', {layers: 4}], ['wall 2 layers tall (one storey)', {layers: 2}], ['wall 8 layers', {layers: 8}], ['match held on the other side (near = the wall\'s own tile)', {inside: true}],
    ['maxHeat 2.7', {rules: {maxHeat: 2.7}}], ['maxHeat 3.15', {rules: {maxHeat: 3.15}}], ['maxHeat 3.3', {rules: {maxHeat: 3.3}}], ['maxHeat 3.6', {rules: {maxHeat: 3.6}}], ['up 2.4, upDiagonal 1.6', {rules: {up: 2.4, upDiagonal: 1.6}}], ['up 3.6, upDiagonal 2.4', {rules: {up: 3.6, upDiagonal: 2.4}}], ['up 1, upDiagonal 1 (no upward rule at all)', {rules: {up: 1, upDiagonal: 1}}],
    ['rate 3.6', {rules: {rate: 3.6}}], ['rate 4.4', {rules: {rate: 4.4}}], ['loss 1.8', {rules: {loss: 1.8}}], ['loss 2.2', {rules: {loss: 2.2}}], ['clapboard delay 4.5', {fuels: {clapboard: {delay: 4.5}}}], ['clapboard delay 5.5', {fuels: {clapboard: {delay: 5.5}}}], ['falloff 1.35', {rules: {falloff: 1.35}}], ['falloff 1.65', {rules: {falloff: 1.65}}],
    ['step 1/60', {rules: {step: 1 / 60}}], ['step 1/15', {rules: {step: 1 / 15}}]]) {
    const w = wall(o);
    console.log(name.padEnd(58), 'up', round(w.up, 3), 'along', round(w.along, 3), 'ratio', round(w.ratio, 2), inRange(w.ratio), '| steady ratio', round(w.ratioSteady, 2));
  }
}
if (part === 'house') {
  // In a real plan: a match held outside each survey wall. Up = the clapboard straight above it on the top layer that has one
  // (or the highest layer with clapboard in that column); along = the same wall 3 m either side, ground layer, the slower side (the author's way).
  let n = 0, ok = 0; const ratios = [];
  for (const planId of PLANS) for (const at of strikesOf(planId).filter(s => s.startsWith('wall') && !s.endsWith(':in'))) {
    let col = null, row = null;
    const r = burn({planId, at, seconds: 120, before: (world, a) => {
      const [, s, ci, cj] = at.split(':'), i = a.origin[0] + +ci, j = a.origin[1] + +cj;
      const walls = [0, 1, 2, 3].flatMap(k => outsideWalls(world, a, k)).filter(w => w.side === s);
      col = walls.filter(w => w.tile.i === i && w.tile.j === j).sort((p, q) => p.tile.k - q.tile.k);
      row = d => walls.find(w => w.tile.k === 0 && (s[0] === 'x' ? w.tile.i === i && w.tile.j === j + d : w.tile.j === j && w.tile.i === i + d));
      row = [row(6), row(-6)];
    }});
    const topWall = col.at(-1), tUp = topWall.fuel.litAt, tAlong = row.map(w => w ? w.fuel.litAt : undefined).filter(t => t !== undefined);
    const up = topWall.tile.k * LAYER / tUp, along = tAlong.length ? 3 / Math.max(...tAlong.map(t => t ?? Infinity)) : null, ratio = along ? up / along : null;
    if (topWall.tile.k > 0 && ratio !== null && Number.isFinite(ratio)) { n++; ratios.push(ratio); if (ratio >= 2.5 && ratio <= 3.5) ok++; }
    console.log(planId.padEnd(15), at.padEnd(16), 'column has clapboard on layers', col.map(w => w.tile.k).join(''), '| top lit', round(tUp), 's, up', round(up, 3), 'm/s | 3 m along lit', tAlong.map(t => round(t)).join(' and ') || 'no wall there', 's, along', round(along, 3), '| ratio', round(ratio, 2), ratio === null ? '' : inRange(ratio));
  }
  ratios.sort((p, q) => p - q);
  console.log('measurable: ' + n + ' of 24; in 2.5 to 3.5: ' + ok + '; ratio ' + round(ratios[0], 2) + ' to ' + round(ratios.at(-1), 2) + ', median ' + round(ratios[Math.floor(ratios.length / 2)], 2));
}
