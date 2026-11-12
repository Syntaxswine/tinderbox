// The round-4 kernel fix, tested directly. A tile T is held at the heat ceiling from outside the kernel
// (T.heat = max, active.add(T), before every step); nothing burns. The tile H that holds a surface against
// T starts asleep. Rule 2 says the surface chars and lights.
//   node reviewer-round-5/r02-wake.mjs            (author's kernel)
//   KERNEL=./kernel-06061b0.mjs node reviewer-round-5/r02-wake.mjs   (round 4's kernel: control, nothing should light)
const K = await import(process.env.KERNEL ?? '../kernel.mjs');
const {createWorld, DEFAULT_RULES, DEFAULT_FUELS} = K;
const r2 = v => v === null || v === undefined ? 'never' : (+v.toFixed(3)) + ' s';
const hold = (world, T, seconds, hot = true) => { for (let n = Math.round(seconds / world.dt); n > 0; n--) { if (hot) { T.heat = world.rules.maxHeat; world.active.add(T); } world.step(); } };
console.log('kernel: ' + (process.env.KERNEL ?? '../kernel.mjs'));

// A. Every surface kind, holder asleep, facing tile held hot for 12 s.
const KINDS = [
  ['clapboard wall, level', 'clapboard', [0, 0, 0], 0, 1],
  ['partition, level', 'partition', [0, 0, 0], 1, -1],
  ['door, level', 'door', [0, 0, 0], 0, -1],
  ['floor (frame), hot tile below', 'frame', [0, 0, 2], 2, -1],
  ['roof, hot tile above', 'roof', [0, 0, 1], 2, 1]
];
for (const [name, cls, [i, j, k], axis, step] of KINDS) {
  const world = createWorld(), H = world.addTile(i, j, k), d = [0, 0, 0]; d[axis] = step;
  const T = world.addTile(i + d[0], j + d[1], k + d[2]);
  const fuel = world.addFuel(H, cls, 1, {face: {axis, step, object: world.setFace(i, j, k, axis, step, 'timber')}, supports: cls === 'frame'});
  hold(world, T, 12);
  const expected = Math.ceil(DEFAULT_FUELS[cls].delay * DEFAULT_FUELS[cls].lightAt / (DEFAULT_RULES.maxHeat * (1 - DEFAULT_RULES.loss * DEFAULT_RULES.step)) * 30 - 1e-9) / 30;
  console.log('A  ' + name.padEnd(32) + ' lit ' + r2(fuel.litAt).padEnd(9) + ' (delay x lightAt / 2.707 = ' + r2(expected) + '); burns on the side of ' + (fuel.near === T ? 'the hot tile' : fuel.near ? 'another tile' : 'its own tile'));
}
// B. Does the active set drain? Hold for 1 s (no lighting), release, count steps to an empty set.
{
  const world = createWorld(), H = world.addTile(0, 0, 0), T = world.addTile(1, 0, 0);
  const fuel = world.addFuel(H, 'clapboard', 1, {face: {axis: 0, step: 1, object: world.setFace(0, 0, 0, 0, 1, 'timber')}});
  hold(world, T, 1);
  const charThen = fuel.char; let n = 0;
  while (world.active.size && n < 3000) { world.step(); n++; }
  console.log('B  held 1 s, released: char then ' + charThen.toFixed(3) + '; active set empty after ' + (n / 30).toFixed(2) + ' s; char left when asleep ' + fuel.char.toFixed(3));
  // D. Char while asleep. Rule 2: "Below its lighting point the char fades, by half a second\'s worth each second."
  for (let m = 0; m < 30 * 120; m++) world.step();
  const charAfter = fuel.char, t0 = world.time;
  hold(world, T, 6);
  console.log('D  after 120 s more with everything cold: char ' + charAfter.toFixed(3) + ' (Rule 2 as written gives 0). Reheated: lights after ' + r2(fuel.litAt === null ? null : fuel.litAt - t0) + ' (a fresh wall: 1.833 s)');
}
// D2. The same for coal lying in a tile (not a surface): heat 8 s, let cool for 10 minutes, heat again.
{
  const world = createWorld(), T = world.addTile(0, 0, 0), coal = world.addFuel(T, 'coal', 1);
  hold(world, T, 8); const c0 = coal.char;
  for (let m = 0; m < 30 * 600; m++) world.step();
  const c1 = coal.char, t0 = world.time; hold(world, T, 12);
  console.log('D2 coal heated 8 s: char ' + c0.toFixed(2) + ' of 15; after 600 s cold: ' + c1.toFixed(2) + '; reheated, lights after ' + r2(coal.litAt === null ? null : coal.litAt - t0) + ' (fresh coal: ' + r2(Math.ceil(15 * 1.6 / 2.7067 * 30) / 30) + ')');
}
// C. A tile laid after the first step. Rule 1: "A surface always has a tile on both sides", laid by the scene builder.
{
  const world = createWorld(), H = world.addTile(0, 0, 0);
  const fuel = world.addFuel(H, 'clapboard', 1, {face: {axis: 0, step: 1, object: world.setFace(0, 0, 0, 0, 1, 'timber')}});
  world.addTile(5, 5, 0); world.step();
  const T = world.addTile(1, 0, 0);
  hold(world, T, 12);
  console.log('C  air tile laid AFTER the first step, then held hot 12 s: wall lit ' + r2(fuel.litAt) + ', char ' + fuel.char.toFixed(3) + ' (the facing lists are rebuilt only when a surface is added)');
}
// E. A single pulse (what a fall or an oil burst leaves): does the surface against the tile get looked at?
{
  const world = createWorld(), H = world.addTile(0, 0, 0), T = world.addTile(1, 0, 0);
  const fuel = world.addFuel(H, 'clapboard', 1, {face: {axis: 0, step: 1, object: world.setFace(0, 0, 0, 0, 1, 'timber')}});
  world.step(); T.heat = 2.5; world.active.add(T); let peak = 0;
  for (let m = 0; m < 90; m++) { world.step(); peak = Math.max(peak, fuel.char); }
  console.log('E  one pulse of 2.5 on the facing tile: peak char ' + peak.toFixed(3) + ' (0 would mean the surface was never looked at)');
}
// F. A spent surface stays in the facing list. Count wake-ups that find nothing.
{
  const world = createWorld(), H = world.addTile(0, 0, 0), T = world.addTile(1, 0, 0);
  const fuel = world.addFuel(H, 'clapboard', 1, {face: {axis: 0, step: 1, object: world.setFace(0, 0, 0, 0, 1, 'timber')}});
  fuel.amount = 0; fuel.spentAt = 0;
  let woken = 0; for (let m = 0; m < 300; m++) { T.heat = 2.9; world.active.add(T); world.step(); }
  console.log('F  spent surface, facing tile held hot 10 s: holder in the active set at the end: ' + world.active.has(H) + '; facing list still names it: ' + (T.facing?.includes(H) ?? false));
}
