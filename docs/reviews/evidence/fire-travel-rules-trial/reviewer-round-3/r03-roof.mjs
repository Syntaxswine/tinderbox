// What the air layer above roofs does.
//   node r03-roof.mjs slab        a flat roof slab 20 m x 5 m: how fast fire runs over its top, and under it
//   node r03-roof.mjs panel       the ten-strike panel: as built, +1 air layer, +2, ring 2 wide; roofs lit from the air side
//   node r03-roof.mjs heat        peak and mean heat of the air tiles above a burning Hopkins 15
import {make, burn, PANEL, moreAir, widerRing, round, LAYER, PITCH, hashEvents} from './lib.mjs';
const mode = process.argv[2] ?? 'slab';
if (mode === 'slab') {
  // roof fuel in tiles (i,j,0), face up; air below is the tile itself (k=0, standing on the ground is wrong:
  // lift the slab to k=1 with an empty tile at k=0 so it is a roof over a room with no walls). Air above at k=2 [and k=3].
  for (const [label, airAbove, lightFrom, delay] of [['air above (1 layer), lit from above', 1, 'above', 8], ['air above (2 layers), lit from above', 2, 'above', 8], ['air above, lit from below', 1, 'below', 8], ['no air above, lit from below', 0, 'below', 8],
    ['air above, lit from above, roof delay 3 s (round 2 value)', 1, 'above', 3], ['air above, lit from above, clapboard-like delay 4.5', 1, 'above', 4.5]]) {
    const world = make({}, {roof: {delay}});
    const fuelAt = new Map();
    for (let j = 0; j <= 10; j++) for (let i = 0; i <= 60; i++) {
      world.addTile(i, j, 0); const t = world.addTile(i, j, 1);
      for (let n = 1; n <= airAbove; n++) world.addTile(i, j, 1 + n);
      fuelAt.set(i + ':' + j, world.addFuel(t, 'roof', 1, {face: {axis: 2, step: 1, object: world.setFace(i, j, 1, 2, 1, 'timber')}}));
    }
    // light a strip of 3 x 3 at one end
    for (let j = 4; j <= 6; j++) for (let i = 0; i <= 2; i++) world.ignite(world.tileAt(i, j, 1), null, {fuel: fuelAt.get(i + ':' + j), from: lightFrom === 'above' ? world.tileAt(i, j, 2) : null});
    for (let n = Math.round(120 / world.dt); n > 0; n--) world.step();
    const a = fuelAt.get('10:5').litAt, b = fuelAt.get('50:5').litAt, c = fuelAt.get('20:5').litAt;
    const fromAbove = [...fuelAt.values()].filter(f => f.near && f.near.k === 2).length, lit = [...fuelAt.values()].filter(f => f.litAt !== null).length;
    console.log(label.padEnd(60), 'lit at 5 m: ' + round(a) + ' s, 10 m: ' + round(c) + ' s, 25 m: ' + round(b) + ' s; speed 5 to 25 m: ' + (a && b ? round(40 * PITCH / (b - a), 3) : null) + ' m/s; roof tiles lit ' + lit + '/' + fuelAt.size + ', from the air side ' + fromAbove);
  }
  // for scale: clapboard wall along (wall.mjs gives 0.16 m/s along), grass 1.5 m/s
}
if (mode === 'panel') {
  const variants = {base: null, air1: w => moreAir(w, 1), air2: w => moreAir(w, 2), ring2: w => widerRing(w, 1), ring3: w => widerRing(w, 2)};
  for (const [planId, at] of PANEL) {
    const row = [];
    for (const [name, fn] of Object.entries(variants)) {
      const r = burn({planId, at, seconds: 200, before: fn ? (w => fn(w)) : undefined});
      let roofs = 0, fromAir = 0; for (const rec of r.a.rooms.values()) for (const t of rec.tiles) for (const f of t.fuels) if (f.cls === 'roof') { roofs++; if (f.near && f.near.k > t.k) fromAir++; }
      row.push(name + ': room ' + round(r.roomAll) + ' half ' + round(r.half) + ' fall ' + round(r.fall?.time) + ' flame ' + round(r.flameUntil) + ' roofs from air ' + fromAir + '/' + roofs + ' ev ' + hashEvents(r.world.events));
    }
    console.log(planId, at + '\n   ' + row.join('\n   '));
  }
}
if (mode === 'heat') {
  for (const [planId, at] of [['hopkins-4-15', 'room:0:kitchen'], ['ashland-worker', 'room:0:kitchen']]) {
    const r0 = burn({planId, at, seconds: 0.04});
    const world = r0.world, air = [...world.tiles.values()].filter(t => !t.building);
    const topK = Math.max(...air.map(t => t.k));
    let peak = 0, peakAt = 0, log = [];
    for (let s = 1; s <= 200 * 30; s++) {
      world.step();
      if (s % 300 === 0) {
        const top = air.filter(t => t.k === topK), hot = top.filter(t => t.heat >= 1.1).length, max = Math.max(...top.map(t => t.heat)), mean = top.reduce((x, t) => x + t.heat, 0) / top.length;
        let roofBurning = 0, roofLit = 0, roofs = 0; for (const rec of r0.a.rooms.values()) for (const t of rec.tiles) for (const f of t.fuels) if (f.cls === 'roof') { roofs++; if (f.lit) roofBurning++; if (f.litAt !== null) roofLit++; }
        log.push('t=' + (s / 30) + ' top-air tiles at or above 1.1: ' + hot + '/' + top.length + ' max ' + round(max) + ' mean ' + round(mean) + ' | roofs ever lit ' + roofLit + '/' + roofs + ' burning ' + roofBurning);
      }
    }
    console.log(planId, at + '\n  ' + log.join('\n  '));
  }
}
