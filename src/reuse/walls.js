import {roomBoxes} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/hybrid-geometry.js';
import {ASSET_SCALE as S} from '../content/asset-scale.js';
// Place unchanged native templates. Taller/wider facades repeat those templates;
// no source wall, lintel, door leaf or character is resized to fit a building.
export function reusedWallParts(module) {
  const native = roomBoxes({doorClosed: module.opening?.state === 'closed'});
  const get = name => { const box = native.find(b => b.name === name); if (!box) throw Error('Pinned wall builder missing ' + name); return box; };
  const parts = [], wall = get('Left pier');
  const copy = (box, role, x, y, base = 0, solid = true, skinSlot = 'facade', turn = false) => {
    const [width, height, depth] = box.size;
    const p = {role, x, y, h: base + box.center[1], width: turn ? depth : width,
      depth: turn ? width : depth, height, solid, skinSlot,
      sourceAssetId: 'aft:' + (box === wall ? 'wall-1m' : box.name === 'Door lintel' ? 'door-lintel-1m' : 'door-leaf-1m')};
    parts.push(p); return p;
  };
  const row = (role, count, startX, y, turn = false) => {
    for (let i = 0; i < count; i++) copy(wall, role + (i ? '-' + i : ''), turn ? startX : startX + i * S.tile,
      turn ? y + i * S.tile : y, 0, true, module.form === 'pilaster' ? 'trim' : 'facade', turn);
  };
  if (module.form === 'wall' || module.form === 'pilaster') row(module.form, module.width / S.tile, -module.width / 2 + S.tile / 2, 0);
  else if (module.form === 'corner') {
    row('leg-x', module.width / S.tile, -module.width / 2 + S.tile / 2, -(module.depth - S.wallThickness) / 2);
    row('leg-y', module.depth / S.tile, -(module.width - S.wallThickness) / 2, -module.depth / 2 + S.tile / 2, true);
  } else if (module.form === 'doorway') {
    const count = (module.width - S.doorWidth) / (2 * S.tile);
    row('pier-left', count, -module.width / 2 + S.tile / 2, 0);
    row('pier-right', count, S.doorWidth / 2 + S.tile / 2, 0);
    copy(get('Door lintel'), 'lintel', 0, 0, 0, false, 'trim');
    if (module.opening.state === 'closed') copy(get('Closed door'), 'closed-door', 0, 0, 0, true, 'door');
  } else throw Error('Unsupported reused wall form');
  const structural = parts.filter(p => p.solid && p.role !== 'closed-door').map(p => p.role);
  const ground = parts.filter(p => p.role !== 'lintel' && p.role !== 'closed-door');
  for (const p of parts) if (p.role === 'lintel') p.supportRoles = structural;
  for (let level = 1; level < module.stories; level++) {
    const base = level * S.floorSpacing;
    // New compatible trim fills only the native .12m slab interval; native wall
    // meshes stay 1 x 2 x .16, with their floor origins exactly 2.12m apart.
    for (const p of ground) {
      parts.push({...p, role: 'story-' + level + ':' + p.role, h: base + S.wallHeight / 2, solid: false, supportRoles: structural});
      parts.push({...p, role: 'floor-' + level + ':' + p.role, h: base - S.slab / 2, height: S.slab,
        solid: false, skinSlot: 'trim', sourceAssetId: 'tinderbox:facade-slab-band-1m', supportRoles: structural});
    }
    if (module.form === 'doorway') {
      copy(wall, 'story-' + level + ':above-door', 0, 0, base, false).supportRoles = structural;
      parts.push({role: 'floor-' + level + ':above-door', x: 0, y: 0, h: base - S.slab / 2,
        width: S.tile, depth: S.wallThickness, height: S.slab, solid: false, skinSlot: 'trim',
        sourceAssetId: 'tinderbox:facade-slab-band-1m', supportRoles: structural});
    }
  }
  return parts;
}
