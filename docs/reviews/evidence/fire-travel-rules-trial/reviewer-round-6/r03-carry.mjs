// Round 6. Rule 6's list, "How far that carries", bullet by bullet, on small scenes built for the purpose.
//   node reviewer-round-6/r03-carry.mjs
import {createWorld} from '../kernel.mjs';
const r = (v, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? 'never' : +v.toFixed(d);
const run = (w, s) => { for (let n = Math.round(s * 30); n > 0; n--) w.step(); };
const box = (w, i0, i1, j0, j1, k0, k1) => { for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) w.addTile(i, j, k); };
const wall = (w, i, j0, j1, k0, k1, step, cls = 'clapboard') => { const list = []; for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) { const tile = w.tileAt(i, j, k); list.push({tile, j, k, fuel: w.addFuel(tile, cls, 1, {face: {axis: 0, step, object: w.setFace(i, j, k, 0, step, 'timber')}})}); } return list; };
const sheet = (w, i0, i1, j0, j1, k, step, cls) => { const list = []; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const tile = w.tileAt(i, j, k); list.push({tile, i, j, fuel: w.addFuel(tile, cls, 1, {face: {axis: 2, step, object: w.setFace(i, j, k, 2, step, 'timber')}})}); } return list; };
const first = list => Math.min(...list.map(x => x.fuel.litAt ?? Infinity));
const grassAt = (w, i, j) => w.addFuel(w.tileAt(i, j, 0) ?? w.addTile(i, j, 0), 'grass', 1);

console.log('1. grass, n empty tiles, grass (square to the grid; lawn lit 4.5 m back)');
for (const n of [1, 2]) {
  const w = createWorld(), far = [];
  for (let j = 0; j <= 20; j++) for (let i = 0; i <= 20 + n + 10; i++) { w.addTile(i, j, 0); if (i < 20) grassAt(w, i, j); else if (i >= 20 + n) far.push({fuel: grassAt(w, i, j)}); }
  w.ignite(w.tileAt(10, 10, 0)); run(w, 40);
  console.log('   ' + n + ' empty: far lawn first lit ' + r(first(far)));
}

console.log('2. a burning wall (4 layers, 10.5 m) and grass n empty tiles from it; wall lit by a match at its foot');
for (const side of ['outside', 'inside']) for (const n of [0, 1, 2]) {
  const w = createWorld(); box(w, -1, n + 4, 0, 20, 0, 4);
  const A = wall(w, 0, 0, 20, 0, 3, 1), g = [];
  for (let j = 0; j <= 20; j++) for (const i of [1 + n, 2 + n]) g.push({fuel: grassAt(w, i, j)});
  w.ignite(w.tileAt(0, 10, 0), null, {fuel: A.find(x => x.j === 10 && x.k === 0).fuel, from: side === 'outside' ? w.tileAt(1, 10, 0) : null}); run(w, 60);
  console.log('   wall lit ' + side + ', ' + n + ' empty tiles: grass first lit ' + r(first(g)));
}

console.log('4. wall to wall: two parallel walls, B stands g tiles from A; A lit by a match at its foot');
for (const side of ['outside', 'inside']) for (const g of [1, 2, 3, 4]) {
  const w = createWorld(); box(w, -1, g + 2, 0, 20, 0, 4);
  const A = wall(w, 0, 0, 20, 0, 3, 1), B = wall(w, g + 1, 0, 20, 0, 3, -1);
  w.ignite(w.tileAt(0, 10, 0), null, {fuel: A.find(x => x.j === 10 && x.k === 0).fuel, from: side === 'outside' ? w.tileAt(1, 10, 0) : null}); run(w, 120);
  console.log('   A lit ' + side + ', gap ' + g * .5 + ' m: B first lit ' + r(first(B)) + ' s');
}
console.log('   the same with B set off along the wall so that no part of it is opposite A (corner to corner), gap 1 m and 0.5 m');
for (const g of [1, 2]) {
  const w = createWorld(); box(w, -1, g + 2, 0, 42, 0, 4);
  const A = wall(w, 0, 0, 20, 0, 3, 1), B = wall(w, g + 1, 21, 41, 0, 3, -1);
  w.ignite(w.tileAt(0, 10, 0), null, {fuel: A.find(x => x.j === 10 && x.k === 0).fuel, from: w.tileAt(1, 10, 0)}); run(w, 150);
  console.log('   gap ' + g * .5 + ' m, no overlap: B first lit ' + r(first(B)) + ' s');
}

console.log('5. upward: a 5 x 5 roof burning on top, and a deck (frame, face down) over it');
for (const gap of [1, 2, 3]) {
  const w = createWorld(); box(w, -1, 5, -1, 5, 0, 7);
  const roof = sheet(w, 0, 4, 0, 4, 1, 1, 'roof'), deck = sheet(w, 0, 4, 0, 4, 2 + gap, -1, 'frame');
  w.ignite(w.tileAt(2, 2, 1), null, {fuel: roof.find(x => x.i === 2 && x.j === 2).fuel, from: w.tileAt(2, 2, 2)}); run(w, 120);
  console.log('   deck ' + r(gap * 1.06) + ' m above the roof: first lit ' + r(first(deck)) + ' s');
}
console.log('   a wall beside that roof, its foot level with the roof top, g tiles from the roof edge');
for (const g of [1, 2]) for (const lift of [0, 1, 2]) {
  const w = createWorld(); box(w, -1, 8, -1, 5, 0, 7);
  const roof = sheet(w, 0, 4, 0, 4, 1, 1, 'roof'), B = wall(w, 5 + g, 0, 4, 2 + lift, 4 + lift, -1);
  w.ignite(w.tileAt(2, 2, 1), null, {fuel: roof.find(x => x.i === 2 && x.j === 2).fuel, from: w.tileAt(2, 2, 2)}); run(w, 150);
  console.log('   wall ' + g * .5 + ' m from the roof edge, foot ' + r(lift * 1.06) + ' m above the roof: first lit ' + r(first(B)) + ' s');
}

console.log('6. downward: an n x n ceiling burning on its underside at layer 1 (heat goes to the layer 1 tiles), one loose fuel on the ground under its middle, nothing else in the ground layer');
for (const [cls, k, step] of [['roof', 1, 1], ['frame', 2, -1]]) for (const n of [1, 3, 5]) {
  const out = [];
  let settled = 0;
  for (const under of ['lacquer', 'oil', 'oil can', 'cloth', 'grass', 'furniture']) {
    const w = createWorld({fuels: undefined}); box(w, -1, n, -1, n, 0, 3);
    const c = sheet(w, 0, n - 1, 0, n - 1, k, step, cls), mid = (n - 1) / 2, t = w.tileAt(mid, mid, 0);
    const f = under === 'oil can' ? w.addFuel(t, 'oil', 3, {store: 'oil'}) : w.addFuel(t, under, 1);
    for (const x of c) w.ignite(x.tile, null, {fuel: x.fuel, from: step < 0 ? w.across(x.tile, x.fuel.face) : null});
    let peak = 0, burst = null;
    for (let s = 0; s < 30 * 30; s++) { w.step(); if (f.litAt === null && f.amount > 0) peak = Math.max(peak, t.heat); }
    burst = w.events.find(e => e.type === 'burst')?.time ?? null; settled = Math.max(settled, under === 'furniture' ? peak : 0);
    out.push(under + ' ' + (burst !== null ? 'BURST at ' + r(burst) : f.litAt !== null ? 'LIT at ' + r(f.litAt) : 'not lit'));
  }
  console.log('   ' + (cls === 'roof' ? 'roof' : 'upstairs floor') + ' ' + n + ' x ' + n + ' (output ' + (cls === 'roof' ? 1 : 1.2) + ' a tile): ground tile settles at ' + r(settled, 3) + '; ' + out.join(', '));
}
console.log('   one burning wall (4 layers, lit inside at layer 1 by matches along its length, so the ground layer of it is not burning at first) and poured oil on the floor against it: see 6b');
{
  // 6b. A line of poured oil along the foot of a wall whose upper three layers are burning on the oil's side.
  const w = createWorld(); box(w, -1, 2, 0, 20, 0, 4);
  const A = wall(w, 0, 0, 20, 1, 3, 1), oil = [];
  for (let j = 0; j <= 20; j++) oil.push({fuel: w.addFuel(w.tileAt(1, j, 0), 'oil', 1)});
  for (const x of A) w.ignite(x.tile, null, {fuel: x.fuel, from: w.tileAt(1, x.j, x.k)});
  let peak = 0; for (let s = 0; s < 300; s++) { w.step(); if (!oil[10].fuel.lit) peak = Math.max(peak, w.tileAt(1, 10, 0).heat); }
  console.log('   6b. wall layers 1 to 3 burning on the outside, poured oil on the ground under that air: oil ' + (Number.isFinite(first(oil)) ? 'LIT at ' + r(first(oil)) : 'not lit') + '; ground tile peak ' + r(peak, 3));
}

console.log('7. an oil can in the first bare tile beside a lawn, lawn beyond n bare tiles');
for (const [n, can] of [[1, false], [3, true], [4, true], [5, true]]) {
  const w = createWorld(), far = [];
  for (let j = 0; j <= 10; j++) for (let i = 0; i <= 10 + n + 6; i++) { w.addTile(i, j, 0); if (i < 10) grassAt(w, i, j); else if (i >= 10 + n) far.push({fuel: grassAt(w, i, j)}); }
  if (can) w.addFuel(w.tileAt(10, 5, 0), 'oil', 3, {store: 'oil'});
  w.ignite(w.tileAt(1, 5, 0)); run(w, 60);
  console.log('   ' + n * .5 + ' m bare, ' + (can ? 'can' : 'no can') + ': far lawn first lit ' + r(first(far)) + ' s');
}

console.log('8. two porches (deck of loose frame on the ground, roof at layer 1), side by side, A lit at its deck');
for (const g of [0, 1]) {
  const w = createWorld(); box(w, -1, 9 + g, -1, 4, 0, 3);
  const mk = i0 => { const d = []; for (let j = 0; j <= 3; j++) for (let i = i0; i <= i0 + 3; i++) d.push({fuel: w.addFuel(w.tileAt(i, j, 0), 'frame', 1, {supports: true})}); return d.concat(sheet(w, i0, i0 + 3, 0, 3, 1, 1, 'roof')); };
  const A = mk(0), B = mk(4 + g);
  w.ignite(w.tileAt(1, 1, 0)); run(w, 300);
  console.log('   gap ' + g * .5 + ' m: B first lit ' + r(first(B)) + ' s; A all lit by ' + r(Math.max(...A.map(x => x.fuel.litAt ?? Infinity))) + ' s');
}
