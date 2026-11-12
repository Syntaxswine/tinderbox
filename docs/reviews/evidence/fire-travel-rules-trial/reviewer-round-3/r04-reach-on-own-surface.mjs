// Does Rule 6 (reach across a gap) drive spread along a continuous surface that has no gap in it?
//   node r04-reach-on-own-surface.mjs slab     roof slab lit from above, with reach on / off
//   node r04-reach-on-own-surface.mjs wall     the author's bare wall (wall.mjs) with reach on / off
//   node r04-reach-on-own-surface.mjs panel    ten-strike panel with reach on / off: room, half, roofs lit from the air side
import {make, burn, PANEL, round, PITCH} from './lib.mjs';
import {bareWall} from '../wall.mjs';
const mode = process.argv[2] ?? 'slab';
if (mode === 'slab') for (const rules of [{}, {reach: .1}, {radiantGain: .25}, {reach: 2}, {reach: 1.5}]) {
  const world = make(rules), fuelAt = new Map();
  for (let j = 0; j <= 10; j++) for (let i = 0; i <= 60; i++) {
    world.addTile(i, j, 0); const t = world.addTile(i, j, 1); world.addTile(i, j, 2);
    fuelAt.set(i + ':' + j, world.addFuel(t, 'roof', 1, {face: {axis: 2, step: 1, object: world.setFace(i, j, 1, 2, 1, 'timber')}}));
  }
  for (let j = 4; j <= 6; j++) for (let i = 0; i <= 2; i++) world.ignite(world.tileAt(i, j, 1), null, {fuel: fuelAt.get(i + ':' + j), from: world.tileAt(i, j, 2)});
  let radLit = 0;
  for (let n = Math.round(200 / world.dt); n > 0; n--) world.step();
  const a = fuelAt.get('10:5').litAt, b = fuelAt.get('50:5').litAt;
  console.log(JSON.stringify(rules).padEnd(22), 'roof top, lit from above: 5 m at ' + round(a) + ' s, 25 m at ' + round(b) + ' s, speed ' + (a && b ? round(40 * PITCH / (b - a), 3) : null) + ' m/s; sight lines ' + world.stats.sightLines);
}
if (mode === 'wall') for (const rules of [{}, {reach: .1}]) { const w = bareWall(rules); console.log(JSON.stringify(rules).padEnd(14), 'bare wall: up ' + round(w.up, 3) + ' m/s, along ' + round(w.along, 3) + ' m/s, ratio ' + round(w.ratio, 2)); }
if (mode === 'panel') for (const [planId, at] of PANEL) {
  const row = [];
  for (const rules of [{}, {reach: .1}]) {
    const r = burn({planId, at, seconds: 200, rules});
    let roofs = 0, fromAir = 0, wallsOut = 0, walls = 0;
    for (const rec of r.a.rooms.values()) for (const t of rec.tiles) for (const f of t.fuels) { if (f.cls === 'roof') { roofs++; if (f.near && f.near.k > t.k) fromAir++; } if (f.cls === 'clapboard') { walls++; if (f.near) wallsOut++; } }
    row.push((rules.reach ? 'no reach' : 'as built') + ': room ' + round(r.roomAll) + ' half ' + round(r.half) + ' fall ' + round(r.fall?.time) + ' flame ' + round(r.flameUntil) + ' | roofs lit from air ' + fromAir + '/' + roofs + ', clapboard lit from outside ' + wallsOut + '/' + walls);
  }
  console.log(planId.padEnd(15), at.padEnd(16), row.join('  ||  '));
}
