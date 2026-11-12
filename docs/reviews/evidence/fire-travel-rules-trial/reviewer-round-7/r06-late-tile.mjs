// Round 7. kernel.mjs addTile: the six-neighbour update of listens/facing for a tile laid late.
// Builds one small scene two ways: everything before the first step (reference; lists come from markListeners),
// and in pieces after steps. The listens flags and facing lists must agree, with no duplicates, and each
// surface must light when the tile it stands against is held at the heat ceiling.
//   node r06-late-tile.mjs
import {createWorld} from '../kernel.mjs';
const surf = (world, tile, cls, axis, step) => world.addFuel(tile, cls, 1, {face: {axis, step, object: world.setFace(tile.i, tile.j, tile.k, axis, step, 'timber')}});
const steps = (world, n) => { for (let s = 0; s < n; s++) world.step(); };
// pieces: [kind, ...]. 'tile' i j k ; 'surf' i j k cls axis step ; 'step' n
const SCENE = [
  ['tile', 0, 0, 0], ['surf', 0, 0, 0, 'clapboard', 0, 1], ['surf', 0, 0, 0, 'clapboard', 1, -1], ['surf', 0, 0, 0, 'roof', 2, 1],
  ['tile', 1, 0, 0], ['tile', 0, -1, 0], ['tile', 0, 0, 1], ['tile', -1, 0, 0], ['surf', -1, 0, 0, 'partition', 0, 1], ['tile', 0, 1, 0], ['surf', 0, 1, 0, 'door', 1, -1],
  ['tile', 0, 0, 2], ['surf', 0, 0, 2, 'frame', 2, -1]
];
function build(order) {
  const world = createWorld();
  for (const p of order) {
    if (p[0] === 'tile') world.addTile(p[1], p[2], p[3]);
    else if (p[0] === 'surf') surf(world, world.tileAt(p[1], p[2], p[3]), p[4], p[5], p[6]);
    else steps(world, p[1]);
  }
  steps(world, 2);
  return world;
}
const snapshot = world => [...world.tiles.values()].map(t => [t.i, t.j, t.k].join(',') + ' listens ' + !!t.listens + ' facing [' + (t.facing ?? []).map(h => [h.i, h.j, h.k].join(',')).sort().join(' ') + ']').sort().join('\n');
const dups = world => [...world.tiles.values()].filter(t => t.facing && new Set(t.facing).size !== t.facing.length).length;
const ref = snapshot(build(SCENE));
const S = n => ['step', n];
const CASES = {
  'a. air tiles laid after the holders have been stepped': [SCENE[0], SCENE[1], SCENE[2], SCENE[3], SCENE[7], SCENE[8], S(5), SCENE[4], SCENE[5], SCENE[6], S(5), SCENE[9], SCENE[10], SCENE[11], SCENE[12]],
  'b. air tile laid while lists are stale (a surface added just before it)': [SCENE[0], SCENE[1], S(5), SCENE[2], SCENE[5], SCENE[3], SCENE[6], SCENE[4], S(3), ...SCENE.slice(7)],
  'c. a late tile that itself holds a surface against an old tile': [SCENE[0], SCENE[1], SCENE[2], SCENE[3], SCENE[4], SCENE[5], SCENE[6], S(5), SCENE[7], SCENE[8], S(5), SCENE[9], SCENE[10], S(5), SCENE[11], SCENE[12]],
  'd. a surface added to an old tile after the tile it faces was laid late': [SCENE[0], S(5), SCENE[4], SCENE[5], SCENE[6], S(5), SCENE[1], SCENE[2], SCENE[3], S(5), ...SCENE.slice(7)],
  'e. every tile first, stepped, then every surface': [...SCENE.filter(p => p[0] === 'tile'), S(5), ...SCENE.filter(p => p[0] === 'surf')],
  'f. a late tile laid twice': [SCENE[0], SCENE[1], SCENE[2], SCENE[3], SCENE[7], SCENE[8], S(5), SCENE[4], SCENE[4], SCENE[5], SCENE[5], SCENE[6], S(5), SCENE[4], SCENE[9], SCENE[10], SCENE[11], SCENE[12]]
};
let bad = 0;
for (const [name, order] of Object.entries(CASES)) {
  const world = build(order), same = snapshot(world) === ref, d = dups(world);
  if (!same || d) bad++;
  console.log((same && !d ? 'ok   ' : 'FAIL ') + name + (same ? '' : ': lists differ from the reference') + (d ? ': ' + d + ' tiles with a duplicate in facing' : ''));
  if (!same) console.log(snapshot(world) + '\n-- reference --\n' + ref);
}
// Function: in case a, hold each facing tile at the ceiling in turn and time the surface.
for (const [name, at, holder, cls] of [['wall +x', [1, 0, 0], [0, 0, 0], 'clapboard'], ['roof', [0, 0, 1], [0, 0, 0], 'roof'], ['floor above, from below', [0, 0, 1], [0, 0, 2], 'frame'], ['door -y of (0,1,0), from (0,0,0)', [0, 0, 0], [0, 1, 0], 'door']]) {
  const world = build(CASES['a. air tiles laid after the holders have been stepped']), hot = world.tileAt(...at), fuel = world.tileAt(...holder).fuels.find(f => f.cls === cls && world.across(world.tileAt(...holder), f.face) === hot);
  const t0 = world.time;
  for (let n = 0; n < 600 && fuel.litAt === null; n++) { hot.heat = world.rules.maxHeat; world.active.add(hot); world.step(); }
  const expect = world.fuels[cls].delay * world.fuels[cls].lightAt / (world.rules.maxHeat * (1 - world.rules.loss * world.dt));
  const got = fuel.litAt === null ? null : fuel.litAt - t0;
  if (got === null || Math.abs(got - expect) > .07) bad++;
  console.log((got !== null && Math.abs(got - expect) <= .07 ? 'ok   ' : 'FAIL ') + name + ': lit after ' + (got === null ? 'never' : got.toFixed(3)) + ' s, expected ' + expect.toFixed(3));
}
// A spent surface: a tile laid late against a surface that has already burnt out. markListeners would list it too.
{
  const mk = late => { const w = createWorld(); const h = w.addTile(0, 0, 0); const f = surf(w, h, 'clapboard', 0, 1); if (!late) w.addTile(1, 0, 0); w.ignite(h, null, {fuel: f}); steps(w, 30 * 25); if (late) w.addTile(1, 0, 0); steps(w, 2); return w; };
  const a = snapshot(mk(false)), b = snapshot(mk(true));
  console.log((a === b ? 'ok   ' : 'DIFF ') + 'tile laid late against a spent surface' + (a === b ? '' : '\n' + b + '\n-- reference --\n' + a));
}
console.log(bad ? bad + ' FAILED' : 'all agree');
