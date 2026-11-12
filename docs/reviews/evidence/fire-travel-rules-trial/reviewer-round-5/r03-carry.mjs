// Rule 6's "how far fire carries" bullets, each on a small scene, with the author's kernel and default numbers.
//   node reviewer-round-5/r03-carry.mjs
const {createWorld} = await import(process.env.KERNEL ?? '../kernel.mjs');
const t = v => v === null || v === undefined || !Number.isFinite(v) ? 'never' : (+v.toFixed(2)) + ' s';
const run = (world, seconds) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) world.step(); };
const box = (world, i0, i1, j0, j1, k0, k1) => { for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) world.addTile(i, j, k); };
const wall = (world, i, j, k, step, cls = 'clapboard') => world.addFuel(world.tileAt(i, j, k), cls, 1, {face: {axis: 0, step, object: world.setFace(i, j, k, 0, step, 'timber')}});
const grass = (world, i, j) => world.addFuel(world.tileAt(i, j, 0), 'grass', 1);
const first = list => { const v = list.map(f => f.litAt).filter(x => x !== null); return v.length ? Math.min(...v) : null; };

console.log('1. grass to grass across empty tiles, straight front (lawn 10 m, then the gap, then lawn)');
for (const n of [1, 2]) {
  const world = createWorld(); box(world, 0, 45, 0, 20, 0, 0); const far = [];
  for (let j = 0; j <= 20; j++) for (let i = 0; i <= 45; i++) if (i < 20) grass(world, i, j); else if (i >= 20 + n) far.push(grass(world, i, j));
  for (let j = 0; j <= 20; j++) world.ignite(world.tileAt(0, j, 0));
  run(world, 40); let warm = 0;
  console.log('   ' + n + ' empty tile(s) (' + n * .5 + ' m): grass beyond lit ' + t(first(far)));
}
console.log('2. grass to a wall across empty tiles (lawn 10 m, the gap, a clapboard wall one layer tall facing the lawn)');
for (const mode of ['front', 'point']) for (const n of [0, 1, 2]) {
  const world = createWorld(); box(world, 0, 22 + n, 0, 20, 0, 0); const faces = [];
  for (let j = 0; j <= 20; j++) { for (let i = 0; i < 20; i++) grass(world, i, j); faces.push(wall(world, 20 + n, j, 0, -1)); }
  if (mode === 'front') for (let j = 0; j <= 20; j++) world.ignite(world.tileAt(0, j, 0)); else world.ignite(world.tileAt(0, 10, 0));
  run(world, 40);
  const near = j => world.tileAt(19, j, 0).fuels[0].litAt, waits = faces.map((f, j) => f.litAt === null ? null : f.litAt - near(j)), ok = waits.filter(v => v !== null);
  console.log('   ' + mode.padEnd(6) + n + ' empty tile(s): ' + ok.length + ' of ' + faces.length + ' faces lit' + (ok.length ? '; wait after the nearest grass in its row lit: ' + t(Math.min(...ok)) + ' to ' + t(Math.max(...ok)) : ''));
}
console.log('3. wall to wall across a gap (two clapboard walls 10.5 m long, four layers tall, facing each other; one face of wall 1 lit at its foot, mid-length)');
for (const side of ['outside (toward the gap)', 'inside (away from the gap)']) for (const g of [1, 2, 3, 4]) {
  const world = createWorld(); box(world, -1, g + 2, 0, 20, 0, 4); const w1 = [], w2 = [];
  for (let k = 0; k <= 3; k++) for (let j = 0; j <= 20; j++) { w1.push(wall(world, 0, j, k, 1)); w2.push(wall(world, g + 1, j, k, -1)); }
  const struck = world.tileAt(0, 10, 0).fuels[0];
  world.ignite(world.tileAt(0, 10, 0), null, {fuel: struck, from: side.startsWith('outside') ? world.tileAt(1, 10, 0) : null});
  run(world, 150);
  const f2 = first(w2), firstFace = w2.find(f => f.litAt === f2), idx = w2.indexOf(firstFace), opposite = idx >= 0 ? w1[idx].litAt : null;
  console.log('   lit ' + side.padEnd(27) + ' gap ' + (g * .5).toFixed(1) + ' m: wall 2 first lit ' + t(f2) + (f2 !== null ? ', ' + t(f2 - opposite) + ' after the face of wall 1 opposite it lit; wall 2 faces lit by 150 s: ' + w2.filter(f => f.litAt !== null).length + ' of ' + w2.length : ''));
}
console.log('3b. one burning face only (wall 1 is a single face; wall 2 as before), lit outside');
for (const g of [1, 2]) {
  const world = createWorld(); box(world, -1, g + 2, 0, 20, 0, 4); const w2 = [];
  for (let k = 0; k <= 3; k++) for (let j = 0; j <= 20; j++) w2.push(wall(world, g + 1, j, k, -1));
  const struck = wall(world, 0, 10, 0, 1); world.ignite(world.tileAt(0, 10, 0), null, {fuel: struck, from: world.tileAt(1, 10, 0)});
  run(world, 60);
  console.log('   gap ' + (g * .5).toFixed(1) + ' m: wall 2 first lit ' + t(first(w2)));
}
console.log('3c. up and down: wall 1 on some layers only, wall 2 on others; every face of wall 1 lit outside at once');
for (const [name, k1, k2] of [['wall 1 on layer 0, wall 2 on layers 2-3 (its foot 2.12 m above the ground)', [0], [2, 3]], ['wall 1 on layer 0, wall 2 on layers 1-3', [0], [1, 2, 3]], ['wall 1 on layer 3, wall 2 on layers 0-2 (below it)', [3], [0, 1, 2]], ['wall 1 on layer 3, wall 2 on layers 0-1', [3], [0, 1]]]) for (const g of [1, 2, 3]) {
  const world = createWorld(); box(world, -1, g + 2, 0, 20, 0, 5); const w1 = [], w2 = [];
  for (let j = 0; j <= 20; j++) { for (const k of k1) w1.push([wall(world, 0, j, k, 1), j, k]); for (const k of k2) w2.push(wall(world, g + 1, j, k, -1)); }
  for (const [f, j, k] of w1) world.ignite(world.tileAt(0, j, k), null, {fuel: f, from: world.tileAt(1, j, k)});
  run(world, 60);
  console.log('   ' + name.padEnd(74) + ' gap ' + (g * .5).toFixed(1) + ' m: wall 2 first lit ' + t(first(w2)));
}
console.log('4. a surface above a burning roof (a 3.5 m square roof at the top of layer 0, lit on top at its middle; a timber deck above it, exposed underneath)');
for (const m of [2, 3, 4]) {
  const world = createWorld(); box(world, -1, 7, -1, 7, 0, m + 1); const roof = [], deck = [];
  for (let j = 0; j <= 6; j++) for (let i = 0; i <= 6; i++) {
    roof.push(world.addFuel(world.tileAt(i, j, 0), 'roof', 1, {face: {axis: 2, step: 1, object: world.setFace(i, j, 0, 2, 1, 'timber')}}));
    deck.push(world.addFuel(world.tileAt(i, j, m), 'frame', 1, {supports: true, face: {axis: 2, step: -1, object: world.setFace(i, j, m, 2, -1, 'timber')}}));
  }
  world.ignite(world.tileAt(3, 3, 0), null, {fuel: roof[24], from: world.tileAt(3, 3, 1)});
  run(world, 120);
  console.log('   ' + (m - 1) + ' air tile(s) between (' + ((m - 1) * 1.06).toFixed(2) + ' m): deck first lit ' + t(first(deck)) + '; roof faces lit ' + roof.filter(f => f.litAt !== null).length + ' of 49');
}
console.log('5. a burning wall to grass across empty tiles (wall 10.5 m long, two layers; the gap; lawn)');
for (const side of ['outside', 'inside']) for (const n of [0, 1, 2]) {
  const world = createWorld(); box(world, -1, 12 + n, 0, 20, 0, 2); const lawn = [];
  for (let j = 0; j <= 20; j++) { for (const k of [0, 1]) wall(world, 0, j, k, 1); for (let i = n + 1; i <= n + 10; i++) lawn.push(grass(world, i, j)); }
  const struck = world.tileAt(0, 10, 0).fuels[0];
  world.ignite(world.tileAt(0, 10, 0), null, {fuel: struck, from: side === 'outside' ? world.tileAt(1, 10, 0) : null});
  run(world, 80);
  console.log('   wall lit ' + side.padEnd(8) + n + ' empty tile(s) (' + n * .5 + ' m): grass first lit ' + t(first(lawn)));
}
console.log('6. Rule 8 on the ground: lawn, a bare strip, lawn; an oil can (3 tile-fulls, a store) in the first bare tile; the first lawn lit as a front');
for (const n of [3, 4, 5, 6]) {
  const world = createWorld(); box(world, 0, 40, 0, 20, 0, 0); const far = [];
  for (let j = 0; j <= 20; j++) for (let i = 0; i <= 40; i++) if (i < 10) grass(world, i, j); else if (i >= 10 + n) far.push(grass(world, i, j));
  world.addFuel(world.tileAt(10, 10, 0), 'oil', 3, {store: 'oil'});
  for (let j = 0; j <= 20; j++) world.ignite(world.tileAt(0, j, 0));
  run(world, 40);
  const burst = world.events.find(e => e.type === 'burst');
  console.log('   bare strip ' + (n * .5).toFixed(1) + ' m: can burst ' + t(burst?.time) + ' over ' + (burst?.tiles ?? 0) + ' tiles; lawn beyond lit ' + t(first(far)));
}
