// Round 2. "Reach is for fire in the open": edge cases of open-to-the-sky, on the smallest scene that shows them.
// Nine tiles of burning furniture in a row on the ground. A clapboard wall 1.5 m away (its outside air tile is 1.5 m from the fire).
// Then one thing is changed: a roof face over the fire, over the wall's air tiles, over the gap between, or high above.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r17-sky-edge.mjs
import {make, round} from './measure-var.mjs';
function scene({roofOver = null, roofLayer = 0, kind = 'masonry', rules = {}, wallAt = 4} = {}) {
  const world = make(rules);
  const wall = [];
  for (let j = -6; j <= 6; j++) {
    for (let i = 0; i <= wallAt; i++) world.addTile(i, j, 0);
    const tile = world.tileAt(wallAt, j, 0);
    wall.push(world.addFuel(tile, 'clapboard', 1, {face: {axis: 0, step: -1, object: world.setFace(wallAt, j, 0, 0, -1, 'timber')}}));
  }
  for (let j = -4; j <= 4; j++) world.addFuel(world.tileAt(0, j, 0), 'furniture', 1);
  const cols = roofOver === 'fire' ? [0] : roofOver === 'wall air' ? [wallAt - 1] : roofOver === 'gap' ? [1, 2].filter(i => i < wallAt - 1) : roofOver === 'all' ? [0, 1, 2, 3] : [];
  for (const i of cols) for (let j = -6; j <= 6; j++) world.setFace(i, j, roofLayer, 2, 1, kind);
  for (let j = -4; j <= 4; j++) world.ignite(world.tileAt(0, j, 0), 'furniture');
  let peak = 0;
  for (let n = Math.round(40 / world.dt); n > 0; n--) { world.step(); for (let j = -6; j <= 6; j++) peak = Math.max(peak, world.tileAt(wallAt - 1, j, 0).rad); }
  const lit = wall.map(f => f.litAt).filter(t => t !== null);
  return {first: lit.length ? Math.min(...lit) : null, n: lit.length, peak};
}
const show = (label, r) => console.log(label.padEnd(86), r.first === null ? 'wall never lights' : 'wall lights at ' + round(r.first) + ' s (' + r.n + ' of 13 tiles)', '| peak reach warmth at the wall', round(r.peak, 3));
show('open ground, wall 1.5 m from the fire', scene());
show('a roof one tile deep over the fire only (a porch, a shed with open sides)', scene({roofOver: 'fire'}));
show('a roof over the air tile against the wall only (an eave on the house that is reached)', scene({roofOver: 'wall air'}));
show('a roof over the gap only, over neither the fire nor the wall (an awning, a tree)', scene({roofOver: 'gap'}));
show('a roof over the fire, 8 layers up (8.5 m above it)', scene({roofOver: 'fire', roofLayer: 8}));
show('a roof over the fire, 9 layers up (9.5 m above it): past the 8-layer look-up in openToSky', scene({roofOver: 'fire', roofLayer: 9}));
show('a pane of GLASS over the fire (a skylight, a conservatory): glass passes 0.05, so "closed"', scene({roofOver: 'fire', kind: 'glass'}));
show('roof over the fire, reachUnderCover on (what the rule replaced)', scene({roofOver: 'fire', rules: {reachUnderCover: true}}));
