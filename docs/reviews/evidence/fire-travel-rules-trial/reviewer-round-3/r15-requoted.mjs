// Sentences the record quotes from round 2 (measured on the old kernel), re-measured on the current one.
//   node r15-requoted.mjs sky      "A fire in the open lights a wall 1.5 m away in 3.3 s. With a roof one tile deep over the fire, or over the air against the wall, never." + the sky look-up to the top of the world
//   node r15-requoted.mjs climb    "Round 2 measured 3.30 to 3.49 on 19 real house walls with the match outside" (clapboard delay was 5 s then; it is 4.5 s now)
//   node r15-requoted.mjs strip    "Grass on a strip narrower than 2 m is slower: 0.75 m/s on 0.5 m, 1.36 on 1.5 m"
//   node r15-requoted.mjs step     the record's time-step line (27.2/27.8/29.3 and 35.1/36.0/38.2)
import {make, burn, outsideWalls, strikesOf, lawn, round, PLANS, LAYER, PITCH} from './lib.mjs';
const part = process.argv[2];
if (part === 'sky') {
  function scene({roofOver = null, roofLayer = 0, kind = 'masonry', rules = {}, wallAt = 4} = {}) {
    const world = make(rules), wall = [];
    for (let j = -6; j <= 6; j++) { for (let i = 0; i <= wallAt; i++) world.addTile(i, j, 0); wall.push(world.addFuel(world.tileAt(wallAt, j, 0), 'clapboard', 1, {face: {axis: 0, step: -1, object: world.setFace(wallAt, j, 0, 0, -1, 'timber')}})); }
    for (let j = -4; j <= 4; j++) world.addFuel(world.tileAt(0, j, 0), 'furniture', 1);
    const cols = roofOver === 'fire' ? [0] : roofOver === 'wall air' ? [wallAt - 1] : roofOver === 'gap' ? [1, 2] : [];
    // Rule 1: a surface has a tile on both sides, so the cover gets tiles up to and above it
    for (const i of cols) for (let j = -6; j <= 6; j++) { for (let k = 1; k <= roofLayer + 1; k++) world.addTile(i, j, k); world.setFace(i, j, roofLayer, 2, 1, kind); }
    for (let j = -4; j <= 4; j++) world.ignite(world.tileAt(0, j, 0), 'furniture');
    for (let n = Math.round(40 / world.dt); n > 0; n--) world.step();
    const lit = wall.map(f => f.litAt).filter(t => t !== null);
    return lit.length ? 'wall lights at ' + round(Math.min(...lit)) + ' s (' + lit.length + ' of 13 tiles)' : 'wall never lights (40 s)';
  }
  console.log('open ground, wall 1.5 m from nine burning furniture tiles:', scene());
  console.log('roof one tile deep over the fire only:                     ', scene({roofOver: 'fire'}));
  console.log('roof over the air tile against the wall only:              ', scene({roofOver: 'wall air'}));
  console.log('roof over the gap only:                                    ', scene({roofOver: 'gap'}));
  console.log('roof over the fire 9 layers up (was past the old look-up): ', scene({roofOver: 'fire', roofLayer: 9}));
  console.log('roof over the fire 20 layers up:                           ', scene({roofOver: 'fire', roofLayer: 20}));
  console.log('glass over the fire:                                       ', scene({roofOver: 'fire', kind: 'glass'}));
}
if (part === 'climb') {
  const ratios = []; let n = 0, ok = 0;
  for (const planId of PLANS) for (const at of strikesOf(planId).filter(s => s.startsWith('wall') && !s.endsWith(':in'))) {
    let col = null, row = null;
    burn({planId, at, seconds: 120, before: (world, a) => {
      const [, s, ci, cj] = at.split(':'), i = a.origin[0] + +ci, j = a.origin[1] + +cj;
      const walls = [0, 1, 2, 3].flatMap(k => outsideWalls(world, a, k)).filter(w => w.side === s);
      col = walls.filter(w => w.tile.i === i && w.tile.j === j).sort((p, q) => p.tile.k - q.tile.k);
      const at_ = d => walls.find(w => w.tile.k === 0 && (s[0] === 'x' ? w.tile.i === i && w.tile.j === j + d : w.tile.j === j && w.tile.i === i + d));
      row = [at_(6), at_(-6)];
    }});
    const topWall = col.at(-1), tUp = topWall.fuel.litAt, tAlong = row.filter(Boolean).map(w => w.fuel.litAt ?? Infinity);
    const up = topWall.tile.k * LAYER / tUp, along = tAlong.length ? 3 / Math.max(...tAlong) : null, ratio = along ? up / along : null;
    if (topWall.tile.k > 0 && ratio !== null && Number.isFinite(ratio) && ratio > 0) { n++; ratios.push(ratio); if (ratio >= 2.5 && ratio <= 3.5) ok++; }
    console.log(planId.padEnd(15), at.padEnd(16), 'clapboard on layers ' + col.map(w => w.tile.k).join('') + ' | top lit ' + round(tUp) + ' s, up ' + round(up, 3) + ' m/s | 3 m along lit ' + tAlong.map(t => round(t)).join(' and ') + ' s, along ' + round(along, 3) + ' | ratio ' + round(ratio, 2) + (ratio === null ? '' : ratio >= 2.5 && ratio <= 3.5 ? ' in' : ' OUT'));
  }
  ratios.sort((p, q) => p - q);
  console.log('measurable ' + n + ' of 24; in 2.5 to 3.5: ' + ok + '; ratio ' + round(ratios[0], 2) + ' to ' + round(ratios.at(-1), 2) + ', median ' + round(ratios[Math.floor(ratios.length / 2)], 2));
}
if (part === 'strip') for (const widthTiles of [1, 2, 3, 4, 6, 8, 41]) {
  const world = make(); lawn(world, 0, 0, 101, widthTiles);
  for (let j = 0; j < widthTiles; j++) world.ignite(world.tileAt(0, j, 0));
  for (let n = Math.round(80 / world.dt); n > 0; n--) world.step();
  const j = Math.floor(widthTiles / 2), a = world.tileAt(30, j, 0).fuels[0].litAt, b = world.tileAt(90, j, 0).fuels[0].litAt;
  console.log('grass strip ' + (widthTiles * PITCH) + ' m wide: ' + (a && b ? round(60 * PITCH / (b - a), 3) + ' m/s' : 'front died (15 m lit: ' + (a !== null) + ', 45 m lit: ' + (b !== null) + ')'));
}
if (part === 'step') for (const s of [60, 30, 15]) { const r = burn({at: 'wall:x+:19:4', seconds: 150, rules: {step: 1 / s}}); console.log('step 1/' + s + ': room ' + round(r.roomAll) + ' s, half ' + round(r.half) + ' s, first fall ' + round(r.fall?.time) + ', flame ' + r.flameUntil); }
