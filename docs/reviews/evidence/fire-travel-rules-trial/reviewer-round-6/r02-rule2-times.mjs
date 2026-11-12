// Round 6. Rule 2's new sentence: "Beside a steady fire a tile settles at 2.71, so a floor catches in about
// 1.5 s, a clapboard wall in 1.8 s, a partition in 2.0 s and a roof in 3.3 s."
//   node reviewer-round-6/r02-rule2-times.mjs small
//   node reviewer-round-6/r02-rule2-times.mjs houses ['<fuels json>']
import {createWorld, DEFAULT_FUELS} from '../kernel.mjs';
import {make, house, strike, ALL, quantile, median} from '../measure.mjs';
const dt = 1 / 30, r = (v, d = 3) => v === null || v === undefined ? null : +v.toFixed(d);
const CLASSES = ['frame', 'clapboard', 'door', 'partition', 'roof', 'furniture', 'coal'];
const mode = process.argv[2] ?? 'small';

if (mode === 'small') {
  // A. A tile held at the ceiling.
  console.log('A. held at the ceiling (heat reads 2.707 after the loss)');
  for (const cls of CLASSES) {
    const w = createWorld(), t = w.addTile(0, 0, 0), f = w.addFuel(t, cls, 1);
    let n = 0; while (!f.lit && n < 3000) { t.heat = 2.9; w.active.add(t); w.step(); n++; }
    console.log('  ' + cls.padEnd(10) + r(n * dt) + ' s   (delay x lightAt / 2.707 = ' + r(DEFAULT_FUELS[cls].delay * DEFAULT_FUELS[cls].lightAt / 2.7067) + ')');
  }
  // B. Beside ONE steady burning tile: what the tiles round it settle at, and how long a fuel there takes.
  console.log('B. one steady burning tile of each source (a loose fuel that does not run out); heat settled in: its own tile, the level neighbour, the level diagonal, the tile above');
  for (const src of ['clapboard', 'frame', 'furniture', 'grass', 'coal', 'oil']) {
    const w = createWorld(fuelsLong()), s = w.addTile(0, 0, 0), n1 = w.addTile(1, 0, 0), d1 = w.addTile(1, 1, 0), up = w.addTile(0, 0, 1);
    w.addFuel(s, src, 1, {lit: true});
    for (let n = 0; n < 300; n++) w.step();
    console.log('  source ' + src.padEnd(10) + 'out ' + DEFAULT_FUELS[src].out + ': own ' + r(s.heat) + ', level ' + r(n1.heat) + ', diagonal ' + r(d1.heat) + ', above ' + r(up.heat));
  }
  console.log('   time for a loose fuel in the level neighbour / the diagonal / above to light, from the moment the source is lit');
  for (const src of ['clapboard', 'frame', 'furniture']) for (const cls of CLASSES) {
    const times = [[1, 0, 0], [1, 1, 0], [0, 0, 1]].map(([i, j, k]) => {
      const w = createWorld(fuelsLong()), s = w.addTile(0, 0, 0), t = w.addTile(i, j, k), f = w.addFuel(t, cls, 1);
      w.addFuel(s, src, 1, {lit: true});
      let n = 0; while (!f.lit && n < 1800) { w.step(); n++; }
      return f.lit ? r(n * dt, 2) : 'never';
    });
    console.log('  ' + src.padEnd(10) + '-> ' + cls.padEnd(10) + times.join(' / '));
  }
  // C. One burning SURFACE and the like surface next to it. A row of wall faces (fuel in tile (0,j), face +x,
  // air on both sides), the middle one lit outside. And a row of roof faces lit above, and below.
  console.log('C. a surface beside one burning surface of its own kind (lit by a match, nothing else burning): heat in the air tile the next one stands against, and when the next one lights');
  for (const [cls, axis, side] of [['clapboard', 0, 'outside'], ['clapboard', 0, 'inside'], ['partition', 0, 'outside'], ['roof', 2, 'above'], ['roof', 2, 'below'], ['frame', 2, 'below'], ['frame', 2, 'above']]) {
    const w = createWorld(), fs = [];
    for (let j = -6; j <= 6; j++) for (const [di, dk] of [[-1, 0], [0, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]]) w.addTile(di, j, 1 + dk);
    for (let j = -6; j <= 6; j++) {
      const t = w.tileAt(0, j, 1);
      fs[j + 6] = w.addFuel(t, cls, 1, {face: {axis, step: 1, object: w.setFace(0, j, 1, axis, 1, 'timber')}});
    }
    const far = axis === 0 ? w.tileAt(1, 0, 1) : w.tileAt(0, 0, 2), own = w.tileAt(0, 0, 1);
    const lit = side === 'outside' || side === 'above' ? far : null;
    w.ignite(own, null, {fuel: fs[6], from: lit});
    const watch = lit ? (axis === 0 ? w.tileAt(1, 1, 1) : w.tileAt(0, 1, 2)) : w.tileAt(0, 1, 1);
    let peak = 0, n = 0;
    while (n < 3000 && !(fs[7].lit && fs[8].lit && fs[9].lit)) { w.step(); n++; if (!fs[7].lit) peak = Math.max(peak, watch.heat); }
    console.log('  ' + cls.padEnd(10) + ('lit ' + side).padEnd(12) + ' air beside settles at ' + r(peak) + '; next lights at ' + r(fs[7].litAt, 2) + ' s, then ' + r(fs[8].litAt, 2) + ', ' + r(fs[9].litAt, 2) + ' (0.5 m each ' + r(fs[9].litAt - fs[8].litAt, 2) + ' s = ' + r(.5 / (fs[9].litAt - fs[8].litAt)) + ' m/s)');
  }
}
function fuelsLong() { return {fuels: Object.fromEntries(Object.entries(DEFAULT_FUELS).map(([k, v]) => [k, {...v, burnFor: 1e6}]))}; }

if (mode === 'houses') {
  // D. In house burns: for every surface or loose fuel that lights, the time from the first step its exposure was
  // at or above its lighting point (round 5's measure) and from the first step it was warmer than 0.3, to lighting.
  const fuels = JSON.parse(process.argv[3] ?? '{}');
  const all = {};
  for (const [planId, at] of [['hopkins-4-15', 'room:0:kitchen'], ['hopkins-4-12', 'wall:x+:15:7'], ['ashland-worker', 'room:0:kitchen'], ['monroe-row', 'room:0:parlor'], ['hopkins-4-09', 'room:1:bed-a'], ['hopkins-4-13', 'wall:y+:8:15']]) {
    const w = make({}, fuels), a = house(w, 'A', planId, 6, 6, ALL), items = [];
    for (const record of a.rooms.values()) for (const tile of record.tiles) for (const fuel of tile.fuels) items.push({tile, fuel, other: fuel.face ? w.across(tile, fuel.face) : null, above: null, warm: null, seenAtLight: null});
    strike(w, a, at);
    for (let n = 0; n < 150 * 30; n++) {
      w.step();
      for (const it of items) {
        if (it.fuel.lit || it.fuel.litAt !== null) { if (it.seenAtLight === null) it.seenAtLight = it.last ?? 0; continue; }
        const e = Math.max(it.tile.heat, it.other ? it.other.heat : 0);
        it.last = e;
        if (it.above === null && e >= w.fuels[it.fuel.cls].lightAt) it.above = w.time;
        if (it.warm === null && e >= .3) it.warm = w.time;
      }
    }
    for (const it of items) if (it.fuel.litAt !== null && it.above !== null && it.fuel.litAt > .1) {
      const g = all[it.fuel.cls] ??= {wait: [], fromWarm: [], heat: []};
      g.wait.push(it.fuel.litAt - it.above + dt); g.fromWarm.push(it.fuel.litAt - it.warm + dt); g.heat.push(it.seenAtLight);
    }
  }
  console.log('D. six house burns, fuels ' + JSON.stringify(fuels) + ': wait from first exposure at or above the lighting point; wait from first exposure 0.3; exposure the step before lighting');
  for (const cls of ['roof', 'clapboard', 'partition', 'door', 'frame', 'furniture']) {
    const g = all[cls]; if (!g) continue;
    const q = (list, p) => r(quantile(list, p), 2);
    console.log('  ' + cls.padEnd(10) + 'n ' + String(g.wait.length).padEnd(5) + ' wait median ' + r(median(g.wait), 2) + ' (10th ' + q(g.wait, .1) + ', 90th ' + q(g.wait, .9) + ', max ' + r(Math.max(...g.wait), 2) + '); from warm median ' + r(median(g.fromWarm), 2) + ' (90th ' + q(g.fromWarm, .9) + '); exposure at lighting median ' + r(median(g.heat), 2) + ', share under 2.6: ' + r(g.heat.filter(h => h < 2.6).length / g.heat.length, 2));
  }
}
