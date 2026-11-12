// Cover: open to sky, porches, eaves, inferred windows.
//   node r07-cover.mjs sky                 house tiles and ring tiles open to the sky during a Hopkins 15 fire (and the others)
//   node r07-cover.mjs porch <plan|all>    add the porch roof the plan declares (plan.porch) and re-run that plan's front-wall strikes
//   node r07-cover.mjs eave                0.5 m eave of roof timber round both houses of a 2 m pair, six plans
//   node r07-cover.mjs windows             Ashland and Monroe with the windows the game infers for them (exteriorPlanEdges)
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {burn, strikesOf, plan, round, PLANS, PITCH, isOpenToSky, outsideWalls, here} from './lib.mjs';
import {pair} from '../pair.mjs';
const mode = process.argv[2] ?? 'sky';

// a roof-timber cover over air tiles at layer k: fuel in the air tile, face up. The air tile takes no label.
function cover(world, cells, k) {
  let n = 0;
  for (const [i, j] of cells) {
    const t = world.tileAt(i, j, k) ?? world.addTile(i, j, k);
    if (t.building) continue;
    for (let kk = 0; kk <= k + 1; kk++) if (!world.tileAt(i, j, kk)) world.addTile(i, j, kk);
    if (world.faceBetween(i, j, k, 2, 1)) continue;
    world.addFuel(t, 'roof', 1, {face: {axis: 2, step: 1, object: world.setFace(i, j, k, 2, 1, 'timber')}}); n++;
  }
  // a ring of air round the cover so its edges have tiles (Rule 1)
  for (const [i, j] of cells) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) for (let kk = 0; kk <= k + 1; kk++) if (!world.tileAt(i + di, j + dj, kk)) world.addTile(i + di, j + dj, kk);
  return n;
}
const porchCells = (a) => { const p = a.plan.porch, cells = []; for (let cj = Math.round(p.z / PITCH); cj < Math.round((p.z + p.depth) / PITCH); cj++) for (let ci = Math.round(p.x / PITCH); ci < Math.round((p.x + p.width) / PITCH); ci++) cells.push([a.origin[0] + ci, a.origin[1] + cj]); return cells; };
// eave: every non-house tile next to (8-neighbour) a house tile that carries a roof, at that roof's layer
function eave(world, a) {
  const cells = new Map();
  for (const rec of a.rooms.values()) for (const t of rec.tiles) if (t.fuels.some(f => f.cls === 'roof')) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const o = world.tileAt(t.i + di, t.j + dj, t.k); if (o && !o.building) cells.set(o.i + ':' + o.j + ':' + t.k, [o.i, o.j, t.k]);
  }
  let n = 0; for (const [i, j, k] of cells.values()) n += cover(world, [[i, j]], k);
  return n;
}

if (mode === 'sky') for (const planId of PLANS) {
  const r0 = burn({planId, at: 'room:0:kitchen', seconds: .04}), world = r0.world;
  const houseTiles = [...r0.a.rooms.values()].flatMap(x => x.tiles), log = [];
  for (let s = 1; s <= 120 * 30; s++) { world.step(); if (s % 300 === 0) log.push((s / 30) + ' s: ' + houseTiles.filter(t => isOpenToSky(world, t)).length); }
  console.log(planId.padEnd(15), 'house tiles ' + houseTiles.length + '; open to the sky at ' + log.join(', '));
}
if (mode === 'porch') for (const planId of process.argv[3] && process.argv[3] !== 'all' ? [process.argv[3]] : PLANS) {
  const p = plan(planId).porch;
  console.log(planId + ' porch ' + JSON.stringify(p));
  for (const at of strikesOf(planId).filter(s => s.startsWith('wall:y-'))) {
    const base = burn({planId, at, seconds: 200});
    let n = 0, under = null;
    const withPorch = burn({planId, at, seconds: 200, before: (world, a) => { n = cover(world, porchCells(a), 1); const [, , ci, cj] = at.split(':'); under = !isOpenToSky(world, world.tileAt(a.origin[0] + +ci, a.origin[1] + +cj - 1, 0)); }});
    console.log('   ' + at.padEnd(18) + ' as built: room ' + round(base.roomAll) + ' half ' + round(base.half) + ' flame ' + round(base.flameUntil) + ' || porch roof (' + n + ' tiles, strike tile under it: ' + under + '): room ' + round(withPorch.roomAll) + ' half ' + round(withPorch.half) + ' flame ' + round(withPorch.flameUntil));
  }
}
if (mode === 'eave') {
  const farWall = planId => strikesOf(planId).find(s => s.startsWith('wall:x-') && !s.endsWith(':in'));
  for (const planId of PLANS) {
    const base = pair(2, 'bare', farWall(planId), {}, {}, 200, planId);
    // same pair with eaves: pair() has no hook, so build it with burn() directly the way pair() does
    const width = plan(planId).width; let facing = null, n = 0;
    const r = burn({planId, at: farWall(planId), seconds: 200, neighbours: [['B', 6 + width + 2, 6]], before: (world, a) => {
      facing = [0, 1, 2, 3].flatMap(k => outsideWalls(world, a, k)).filter(w => w.side === 'x+');
      n = eave(world, a);
      // B is built by burn() before `before` runs; find its tiles by label and give it eaves too
      const bTiles = [...world.tiles.values()].filter(t => t.building === 'B');
      n += eave(world, {rooms: new Map([['b', {tiles: bTiles}]])});
    }});
    const facingLit = Math.min(...facing.map(w => w.fuel.litAt ?? Infinity));
    console.log(planId.padEnd(15) + ' 2 m bare: as built neighbour ' + round(base.neighbourLit) + ' s (' + round(base.afterFacing) + ' s after facing), half ' + round(base.half) + ' || 0.5 m eaves on both (' + n + ' tiles): neighbour ' + (r.neighbours.B === null ? 'never (200 s)' : round(r.neighbours.B) + ' s (' + round(r.neighbours.B - facingLit) + ' after facing)') + ', half ' + round(r.half));
  }
}
if (mode === 'windows') {
  const {exteriorPlanEdges} = await import(pathToFileURL(path.join(here, '../../../../../src/content/housing-envelope.js')).href);
  for (const planId of ['ashland-worker', 'monroe-row']) {
    const p = plan(planId);
    const glaze = (world, a) => {
      let n = 0;
      for (const [f, floor] of p.floors.entries()) for (const e of exteriorPlanEdges(floor)) {
        if (e.opening !== 'window' || Math.abs(e.length - 1) > 1e-6) continue;
        // the wall face whose midpoint lies on this 1 m edge, upper layer of the storey: same test as scene.mjs onSegment
        for (const rec of a.rooms.values()) if (rec.floor === f) for (const t of rec.tiles) if (t.k === 2 * f + 1) for (const fuel of [...t.fuels]) {
          if (fuel.cls !== 'clapboard' || fuel.face.axis === 2) continue;
          const ci = t.i - a.origin[0], cj = t.j - a.origin[1];
          const mx = (ci + .5 + (fuel.face.axis === 0 ? fuel.face.step / 2 : 0)) * PITCH, mz = (cj + .5 + (fuel.face.axis === 1 ? fuel.face.step / 2 : 0)) * PITCH;
          const [x0, z0] = e.a, [x1, z1] = e.b;
          const on = Math.abs(x0 - x1) < 1e-6 ? Math.abs(mx - x0) < 1e-6 && mz > Math.min(z0, z1) && mz < Math.max(z0, z1) : Math.abs(z0 - z1) < 1e-6 && Math.abs(mz - z0) < 1e-6 && mx > Math.min(x0, x1) && mx < Math.max(x0, x1);
          if (!on) continue;
          t.fuels.splice(t.fuels.indexOf(fuel), 1); world.ledger.laid -= fuel.amount;
          world.setFace(t.i, t.j, t.k, fuel.face.axis, fuel.face.step, 'glass'); n++;
        }
      }
      return n;
    };
    const rows = [];
    for (const at of strikesOf(planId)) {
      const base = burn({planId, at, seconds: 200}); let n = 0;
      const g = burn({planId, at, seconds: 200, before: (world, a) => { n = glaze(world, a); }});
      rows.push({at, base, g, n});
      console.log(planId.padEnd(15) + at.padEnd(20) + ' no windows (as built): room ' + round(base.roomAll) + ' half ' + round(base.half) + ' || ' + n + ' glass faces as the game infers: room ' + round(g.roomAll) + ' half ' + round(g.half) + ' ledger ' + g.ledger.toExponential(0));
    }
    const t4 = r => r.roomAll !== null && r.roomAll >= 10 && r.roomAll <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
    const w = rows.filter(r => r.at.startsWith('wall') && !r.at.endsWith(':in'));
    console.log('   ' + planId + ': target 4 outside-wall in range ' + w.filter(r => t4(r.base)).length + ' -> ' + w.filter(r => t4(r.g)).length + ' of ' + w.length + '; target 5 in range ' + rows.filter(r => t5(r.base)).length + ' -> ' + rows.filter(r => t5(r.g)).length + ' of ' + rows.length);
  }
}
