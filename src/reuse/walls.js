import {roomBoxes} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/hybrid-geometry.js';
// Reuse the donor builder itself. This adapter only places/resizes returned boxes;
// it does not define a second wall, jamb, lintel or closed-leaf construction recipe.
const fit = (value, fromMin, fromMax, toMin, toMax) => toMin + (value - fromMin) / (fromMax - fromMin) * (toMax - toMin);
function resize(box, center, size, role, solid = true, skinSlot = 'facade') {
  const scale = box.size.map((n, i) => size[i] / n);
  const min = box.min.map((n, i) => center[i] + (n - box.center[i]) * scale[i]);
  const max = box.max.map((n, i) => center[i] + (n - box.center[i]) * scale[i]);
  return {role, x: (min[0] + max[0]) / 2, y: (min[2] + max[2]) / 2, h: (min[1] + max[1]) / 2,
    width: max[0] - min[0], depth: max[2] - min[2], height: max[1] - min[1], solid, skinSlot};
}
export function reusedWallParts(module) {
  const native = roomBoxes({doorClosed: module.opening?.state === 'closed'});
  const get = name => { const box = native.find(b => b.name === name); if (!box) throw Error('Pinned wall builder missing ' + name); return box; };
  const wall = get('Center wall');
  if (module.form === 'wall' || module.form === 'pilaster') return [resize(wall, [0, module.height / 2, 0], [module.width, module.height, module.depth], module.form)];
  if (module.form === 'corner') {
    const t = module.thickness;
    return [resize(get('Rear wall'), [0, module.height / 2, -(module.depth - t) / 2], [module.width, module.height, t], 'leg-x'),
      resize(get('Left wall'), [-(module.width - t) / 2, module.height / 2, t / 2], [t, module.height, module.depth - t], 'leg-y')];
  }
  if (module.form !== 'doorway') throw Error('Unsupported reused wall form');
  const left = get('Left pier'), lintel = get('Door lintel'), right = wall, opening = module.opening;
  // Fit the original left/opening/right spans and lower/lintel heights separately.
  // This changes architectural dimensions without scaling characters or rebuilding gaps.
  const cuts = [left.min[0], lintel.min[0], lintel.max[0], right.max[0]];
  const targets = [-module.width / 2, -opening.width / 2, opening.width / 2, module.width / 2];
  const x = value => { const i = value <= cuts[1] ? 0 : value <= cuts[2] ? 1 : 2; return fit(value, cuts[i], cuts[i + 1], targets[i], targets[i + 1]); };
  const h = value => value <= lintel.min[1] ? fit(value, left.min[1], lintel.min[1], 0, opening.height) : fit(value, lintel.min[1], left.max[1], opening.height, module.height);
  const roles = new Map([['Left pier', ['pier-left', true, 'facade']], ['Center wall', ['pier-right', true, 'facade']], ['Door lintel', ['lintel', false, 'trim']], ['Closed door', ['closed-door', true, 'door']]]);
  return native.filter(b => roles.has(b.name)).map(box => {
    const [role, solid, slot] = roles.get(box.name), min = [x(box.min[0]), h(box.min[1])], max = [x(box.max[0]), h(box.max[1])];
    return resize(box, [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, 0],
      [max[0] - min[0], max[1] - min[1], role === 'closed-door' ? Math.min(module.depth, box.size[2]) : module.depth], role, solid, slot);
  }).sort((a, b) => ['pier-left', 'pier-right', 'lintel', 'closed-door'].indexOf(a.role) - ['pier-left', 'pier-right', 'lintel', 'closed-door'].indexOf(b.role));
}