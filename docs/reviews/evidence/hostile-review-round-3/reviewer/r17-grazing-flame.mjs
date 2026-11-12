// r17: flamethrower held at a shallow angle along a house wall. One house alone on paving; the bear stands 1 m off
// the wall face, level with one end of a long straight wall, and fires along it. The angle between the aim and
// the wall runs from 0 to 60 degrees. For each angle: how many ground-storey panels of THAT wall gained heat in
// 0.2 s (read-only tap), and how many of them a ray inside the 22.5-degree cone can geometrically reach within 4.5 m.
// Flush plan: Hopkins 15's 10 m east wall. Set-back plan with height-aware blockers: Hopkins 13's 4 m west wall
// (x = 0, z 0..4) which is flush to the box, so both collision models are compared on a flush face.
// Control: tip2 (26931d9). Run: TB_TREES=<dir with tip2/> node r17-grazing-flame.mjs
import {HEAD, TIP2, TAPS, underPatches, load, houseWorld, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const WALLS = [
  {prefabId: 'hopkins-4-15', label: 'Hopkins 15 east wall (flush plan, coarse box)', x: 10, z0: 0, z1: 10, n: 1},
  {prefabId: 'hopkins-4-13', label: 'Hopkins 13 west wall z 0..4 (set-back plan, authored blockers on this tree)', x: 0, z0: 0, z1: 4, n: -1}
];
for (const [label, root] of [['HEAD', HEAD], ...(process.env.TB_TREES ? [['tip2', TIP2]] : [])]) {
  const api = await load(root);
  for (const wall of WALLS) {
    const plan = api.HOUSING_PLANS[wall.prefabId], placement = {id: 'house', prefabId: wall.prefabId, x: 20 - plan.width / 2, y: 20 - plan.depth / 2, quarterTurns: 0};
    console.log(`${label} ${wall.label}`);
    for (const degrees of [0, 5, 10, 15, 20, 25, 30, 35, 45, 60]) {
      const face = wall.x + wall.n * .08, local = [face + wall.n * 1.0, wall.z0 + .5];
      const player = {x: placement.x + local[0], y: placement.y + local[1], tool: 'flamethrower'};
      const heading = Math.atan2(Math.cos(degrees * Math.PI / 180), -wall.n * Math.sin(degrees * Math.PI / 180));   // along +z, turned toward the wall
      globalThis.__lots = [];
      const sim = api.createSimulation({scenario: houseWorld(api, [placement], {player, size: 40}), config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
      const lot = globalThis.__lots.at(-1);
      sim.dispatch({type: 'aim', x: player.x + Math.cos(heading) * 3, y: player.y + Math.sin(heading) * 3}); sim.dispatch({type: 'primary', pressed: true});
      for (let i = 0; i < 12; i++) sim.advance(api.STEP);
      let heated = 0, reachable = 0;
      for (let z = Math.floor(wall.z0); z < wall.z1; z++) {
        const id = wall.n > 0 ? `wall:0:${wall.x},${z}|${wall.x},${z + 1}:0` : `wall:0:${wall.x},${z}|${wall.x},${z + 1}:0`;
        const site = lot.sites.find(s => s.id === id || s.id === `wall:0:${wall.x},${z + 1}|${wall.x},${z}:0`);
        if (!site) continue;
        if (site.heat > 0) heated++;
        let can = false;
        for (let k = 0; k <= 20 && !can; k++) {
          const dx = face - local[0], dz = z + k / 20 - local[1], d = Math.hypot(dx, dz);
          let a = Math.atan2(dz, dx) - heading; a = Math.atan2(Math.sin(a), Math.cos(a));
          can = d <= 4.45 && Math.abs(a) <= Math.PI / 8 - .01;
        }
        if (can) reachable++;
      }
      console.log(`    aim ${String(degrees).padStart(2)} deg to the wall: panels heated ${heated}, panels inside the cone and range ${reachable}`);
      sim.dispose();
    }
  }
}
