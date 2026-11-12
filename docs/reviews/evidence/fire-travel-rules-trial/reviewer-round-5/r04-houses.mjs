// The two results the record claims from the kernel fix, on houses, and what lies either side of them.
//   node reviewer-round-5/r04-houses.mjs pairs      six plan pairs on bare ground at 0.5, 1, 1.5 and 2 m
//   node reviewer-round-5/r04-houses.mjs paths      a bare path of 0.5 m and of 1 m round each plan, lawn beyond, lawn lit
//   node reviewer-round-5/r04-houses.mjs street     two houses 3 m apart, each with a bare path round it, lawn between; A struck in its kitchen
import {make, burn, house, outsideWalls, strikesOf, round, PLANS, PITCH} from '../measure.mjs';
const mode = process.argv[2] ?? 'pairs';
const t = v => v === null || v === undefined || !Number.isFinite(v) ? 'never' : round(v) + ' s';
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
// Keep bare every ground tile within `w` tiles of a structure (a house tile, or a porch deck if porchToo); lawn on the rest.
function pathAndLawn(world, w, W, D, porchToo) {
  const structure = [...world.tiles.values()].filter(tile => tile.k === 0 && (tile.building || porchToo && tile.fuels.length));
  const bare = new Set();
  for (const s of structure) for (let dj = -w; dj <= w; dj++) for (let di = -w; di <= w; di++) { const o = world.tileAt(s.i + di, s.j + dj, 0) ?? world.addTile(s.i + di, s.j + dj, 0); if (!o.building && !o.fuels.length) bare.add(o); }
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) { const tile = world.tileAt(i, j, 0) ?? world.addTile(i, j, 0); if (!tile.building && !tile.fuels.length && !bare.has(tile)) world.addFuel(tile, 'grass', 1); }
  return bare;
}
if (mode === 'pairs') {
  const farWall = planId => strikesOf(planId).find(s => s.startsWith('wall:x-') && !s.endsWith(':in'));
  for (const planId of PLANS) for (const gap of [.5, 1, 1.5, 2]) {
    let facing = null;
    const r = burn({planId, at: farWall(planId), seconds: 200, neighbours: [['B', 6 + r0(planId) + gap, 6]], before: (world, a) => { facing = [0, 1, 2, 3].flatMap(k => outsideWalls(world, a, k)).filter(w => w.side === 'x+'); }});
    const B = r.neighbours.B, lit = facing.filter(w => w.fuel.litAt !== null), firstAny = lit.length ? Math.min(...lit.map(w => w.fuel.litAt)) : null;
    const outside = lit.filter(w => w.fuel.near === w.outside), firstOutside = outside.length ? Math.min(...outside.map(w => w.fuel.litAt)) : null;
    const bEvent = r.world.events.find(e => e.type === 'lit' && e.building === 'B');
    console.log(planId.padEnd(15) + ' gap ' + String(gap).padEnd(4) + ' B lit ' + t(B).padEnd(9) + (B !== null ? ' (' + bEvent.cls + ' on layer ' + bEvent.at[2] + '); ' + t(B - firstAny) + ' after A\'s facing wall first burnt (' + t(firstAny) + '); A\'s facing faces burning on their OUTSIDE before B lit: ' + outside.filter(w => w.fuel.litAt < B).length + ' of ' + lit.filter(w => w.fuel.litAt < B).length + ' lit, the first outside-burning at ' + t(firstOutside) : ''));
  }
}
function r0(planId) { const world = make(), a = house(world, 'A', planId, 6, 6, {}); return a.plan.width; }
if (mode === 'paths') {
  for (const porchToo of [false, true]) for (const w of [1, 2]) for (const planId of PLANS) {
    const world = make(), a = house(world, 'A', planId, 8, 8, {}), W = Math.round((16 + a.plan.width) / PITCH), D = Math.round((16 + a.plan.depth) / PITCH);
    pathAndLawn(world, w, W, D, porchToo);
    world.ignite(world.tileAt(1, D >> 1, 0));
    run(world, 60);
    const walls = outsideWalls(world, a).filter(x => !x.outside.fuels.length), lit = walls.filter(x => x.fuel.litAt !== null);
    // wait after the grass straight out across the path from the face
    const waits = [];
    for (const x of lit) { const ax = x.fuel.face.axis, st = x.fuel.face.step, g = world.tileAt(x.tile.i + (ax === 0 ? st * (w + 1) : 0), x.tile.j + (ax === 1 ? st * (w + 1) : 0), 0)?.fuels.find(f => f.cls === 'grass'); if (g && g.litAt !== null && g.litAt <= x.fuel.litAt) waits.push(x.fuel.litAt - g.litAt); }
    const deckLit = a.porch.filter(p => p.k === 0).map(p => p.fuels[0]?.litAt).filter(v => v != null), firstHouse = world.events.find(e => e.type === 'lit' && e.building === 'A');
    console.log((porchToo ? 'path also round the porch' : 'path round the walls only ').padEnd(26) + ' ' + (w * .5).toFixed(1) + ' m  ' + planId.padEnd(15) + lit.length + ' of ' + walls.length + ' faces behind the path lit in 60 s; first ' + t(lit.length ? Math.min(...lit.map(x => x.fuel.litAt)) : null)
      + (waits.length ? '; wait after the grass straight across the path lit: ' + t(Math.min(...waits)) + ' to ' + t(Math.max(...waits)) + ' on ' + waits.length + ' faces' : '') + '; porch deck first lit ' + t(deckLit.length ? Math.min(...deckLit) : null) + '; first thing of the house lit: ' + (firstHouse ? firstHouse.cls + ' at ' + t(firstHouse.time) : 'nothing'));
  }
}
if (mode === 'street') {
  for (const planId of ['hopkins-4-12', 'hopkins-4-15', 'ashland-worker']) for (const w of [0, 1, 2]) {
    const width = r0(planId); let grassCount = 0;
    const r = burn({planId, at: 'room:0:kitchen', seconds: 200, neighbours: [['B', 6 + width + 3, 6]], before: world => {
      const W = Math.round((12 + 2 * width + 3) / PITCH), D = Math.round(22 / PITCH);
      if (w) pathAndLawn(world, w, W, D, true); else for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) { const tile = world.tileAt(i, j, 0) ?? world.addTile(i, j, 0); if (!tile.building && !tile.fuels.length) world.addFuel(tile, 'grass', 1); }
    }});
    const g = r.world.events.find(e => e.type === 'lit' && e.cls === 'grass');
    console.log(planId.padEnd(15) + ' two houses 3 m apart, lawn between, ' + (w ? 'a bare path ' + (w * .5).toFixed(1) + ' m wide round each (and its porch)' : 'grass up to the walls').padEnd(52) + ': first grass lit ' + t(g?.time).padEnd(9) + ' neighbour lit ' + t(r.neighbours.B) + '; A half alight ' + t(r.half));
  }
}
