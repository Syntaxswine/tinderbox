// Control for the fadeAsleep switch of kernel-var.mjs: the r02 "D" case with the switch off and on.
//   node reviewer-round-5/r13-fade-check.mjs
const {createWorld} = await import('./kernel-var.mjs');
for (const fadeAsleep of [false, true]) {
  const world = createWorld({rules: {fadeAsleep}}), H = world.addTile(0, 0, 0), T = world.addTile(1, 0, 0);
  const fuel = world.addFuel(H, 'clapboard', 1, {face: {axis: 0, step: 1, object: world.setFace(0, 0, 0, 0, 1, 'timber')}});
  const hold = seconds => { for (let n = Math.round(seconds * 30); n > 0; n--) { T.heat = 2.9; world.active.add(T); world.step(); } };
  hold(1); for (let n = 0; n < 30 * 124; n++) world.step();
  const t0 = world.time; hold(6);
  console.log('fadeAsleep ' + fadeAsleep + ': wall heated 1 s, cold 124 s, reheated: lights after ' + (fuel.litAt - t0).toFixed(3) + ' s (fresh wall 1.833 s)');
}
