import {PALETTE} from '../../../src/art/materials.js';
import {MARKS} from './marks.js';

export const MEDICINE_KINDS = Object.freeze(['powder', 'healing', 'inversion']);
export const APPEARANCE_SLOTS = Object.freeze(['shirt', 'leather', 'brass', 'steel', 'ivory', 'dark', 'glass']);
const defaults = Object.freeze({
  shirt: {color: PALETTE.shirt, roughness: .96},
  leather: {color: PALETTE.leather, roughness: .92},
  brass: {color: PALETTE.brass, roughness: .62, metalness: .28},
  steel: {color: PALETTE.steel, roughness: .78, metalness: .15},
  ivory: {color: 0xf3e7c6, roughness: .8},
  dark: {color: 0x202724, roughness: .85},
  glass: {color: 0x638372, roughness: .3, metalness: .2}
});

/** Grounded art only. x/y in a world record becomes X/Z in the shared scene. */
export function createMedicinePickups(T, {materials = {}, textures = {}} = {}) {
  for (const slot of APPEARANCE_SLOTS) {
    if (materials[slot] && !materials[slot].isMaterial) throw new TypeError('Expected a shared Three material in ' + slot);
    if (textures[slot] && !textures[slot].isTexture) throw new TypeError('Expected a shared Three texture in ' + slot);
  }
  const root = new T.Group();
  root.name = 'medicine-pickups';
  root.userData = {
    assetId: 'medicine-pickups-v1', units: 'metres',
    presentation: 'Static ground props. The complete snapshot alone controls visibility; radius never scales the prop.',
    maximumPhysicalRadius: .22
  };
  const geometries = new Set(), ownedMaterials = new Map(), templates = new Map(), live = new Map();
  let disposed = false;

  function material(slot) {
    if (ownedMaterials.has(slot)) return ownedMaterials.get(slot);
    const borrowed = materials[slot];
    if (borrowed && !borrowed.isMaterial) throw new TypeError('Expected a shared Three material in ' + slot);
    if (textures[slot] && !textures[slot].isTexture) throw new TypeError('Expected a shared Three texture in ' + slot);
    const m = borrowed ? borrowed.clone() : new T.MeshStandardMaterial(defaults[slot]);
    if (borrowed) {
      m.onBeforeCompile = borrowed.onBeforeCompile;
      m.customProgramCacheKey = borrowed.customProgramCacheKey;
    }
    if (textures[slot]) m.map = textures[slot];
    m.name = 'Medicine / ' + slot;
    ownedMaterials.set(slot, m);
    return m;
  }
  function mesh(parent, name, geometry, slot, position = [0, 0, 0]) {
    geometries.add(geometry);
    const m = new T.Mesh(geometry, material(slot));
    m.name = name;
    m.position.set(...position);
    m.castShadow = !m.material.transparent;
    m.receiveShadow = true;
    m.userData = {componentId: name, appearanceSlot: slot};
    parent.add(m);
    return m;
  }
  const box = (p, n, w, h, d, x, y, z, s) => mesh(p, n, new T.BoxGeometry(w, h, d), s, [x, y, z]);
  const cylinder = (p, n, r, h, y, s, sides = 20) => mesh(p, n, new T.CylinderGeometry(r, r, h, sides), s, [0, y, 0]);
  function rounded(p, n, w, d, h, bottom, radius, slot) {
    const s = new T.Shape(), x = -w / 2, y = -d / 2, r = radius;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r);
    s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d);
    s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y); s.closePath();
    const g = new T.ExtrudeGeometry(s, {depth: h, bevelEnabled: false, curveSegments: 3});
    g.rotateX(-Math.PI / 2);
    return mesh(p, n, g, slot, [0, bottom, 0]);
  }
  function glyph(p, kind, width, depth, top, slot) {
    const contours = MARKS[kind].contours, points = contours.flat();
    const xs = points.map(v => v[0]), ys = points.map(v => v[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min(width / (maxX - minX), depth / (maxY - minY));
    for (const [i, contour] of contours.entries()) {
      const s = new T.Shape();
      contour.forEach(([x, y], j) => {
        const a = (x - (minX + maxX) / 2) * scale, b = ((minY + maxY) / 2 - y) * scale;
        if (j) s.lineTo(a, b); else s.moveTo(a, b);
      });
      s.closePath();
      const g = new T.ExtrudeGeometry(s, {depth: .0025, bevelEnabled: false, curveSegments: 1});
      g.rotateX(-Math.PI / 2);
      const m = mesh(p, kind + '/existing-mark-' + i, g, slot, [0, top, 0]);
      m.userData.sourceSymbol = MARKS[kind].sourceSymbol;
    }
  }
  function template(kind) {
    if (templates.has(kind)) return templates.get(kind);
    const p = new T.Group(); p.name = 'medicine/' + kind;
    if (kind === 'powder') {
      rounded(p, 'powder/folded-packet', .34, .23, .075, .005, .025, 'shirt');
      rounded(p, 'powder/top-fold', .30, .21, .025, .08, .022, 'shirt');
      for (const sign of [-1, 1]) {
        box(p, 'powder/crimp-' + sign, .022, .093, .24, sign * .167, .0465, 0, 'ivory');
        box(p, 'powder/end-seam-' + sign, .003, .007, .21, sign * .168, .0965, 0, 'leather');
      }
      rounded(p, 'powder/label-border', .19, .19, .005, .105, .012, 'brass');
      rounded(p, 'powder/paper-label', .18, .18, .004, .11, .009, 'ivory');
      glyph(p, kind, .12, .16, .114, 'dark');
    } else if (kind === 'healing') {
      cylinder(p, 'healing/jar-body', .16, .22, .11, 'glass');
      cylinder(p, 'healing/foot', .17, .018, .009, 'steel');
      cylinder(p, 'healing/shoulder', .172, .026, .22, 'glass');
      cylinder(p, 'healing/lid-rim', .18, .032, .25, 'brass');
      cylinder(p, 'healing/porcelain-lid', .173, .025, .2775, 'ivory');
      glyph(p, kind, .19, .19, .29, 'dark');
    } else {
      cylinder(p, 'inversion/octagonal-base', .202, .018, .009, 'steel', 8);
      cylinder(p, 'inversion/octagonal-tin', .195, .068, .052, 'leather', 8);
      cylinder(p, 'inversion/lid-rim', .202, .018, .095, 'brass', 8);
      cylinder(p, 'inversion/dark-lid', .185, .014, .111, 'dark', 8);
      glyph(p, kind, .275, .275, .118, 'ivory');
    }
    p.updateMatrixWorld(true);
    templates.set(kind, p);
    return p;
  }

  function update(pickups, {worldTime, paused} = {}) {
    if (disposed) throw new Error('Medicine pickups disposed');
    if (!Array.isArray(pickups) || pickups.length > 64) throw new TypeError('Expected at most 64 authoritative pickups');
    const seen = new Set();
    // Validate before modifying the last complete visual snapshot.
    for (const p of pickups) {
      if (!p || typeof p.id !== 'string' || !p.id || seen.has(p.id) || !MEDICINE_KINDS.includes(p.kind) ||
          ![p.x, p.y, p.radius].every(Number.isFinite) || p.radius <= 0 ||
          (p.consumed !== undefined && typeof p.consumed !== 'boolean')) throw new TypeError('Invalid medicine pickup record');
      seen.add(p.id);
    }
    const active = new Set();
    for (const p of pickups) {
      if (p.consumed) continue;
      active.add(p.id);
      let record = live.get(p.id);
      if (record && record.kind !== p.kind) { root.remove(record.group); live.delete(p.id); record = null; }
      if (!record) {
        const group = template(p.kind).clone(true);
        group.name = 'pickup/' + p.id;
        record = {kind: p.kind, group};
        live.set(p.id, record); root.add(group);
      }
      record.group.position.set(p.x, 0, p.y);
      record.group.userData = {pickupId: p.id, kind: p.kind, authoritativeRadius: p.radius};
    }
    for (const [id, r] of live) if (!active.has(id)) { root.remove(r.group); live.delete(id); }
    // Props remain on the ground; no independent clock, bob, timeout or paused-state use.
    void worldTime; void paused;
    root.updateMatrixWorld(true);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent(); root.clear(); live.clear(); templates.clear();
    for (const g of geometries) g.dispose(); geometries.clear();
    for (const m of ownedMaterials.values()) m.dispose(); ownedMaterials.clear();
  }
  function diagnostics() {
    let meshes = 0; root.traverse(o => { if (o.isMesh) meshes++; });
    return {disposed, visiblePickups: live.size, meshes, templates: templates.size,
      ownedGeometries: geometries.size, ownedMaterials: ownedMaterials.size, ownedTextures: 0};
  }
  return {root, update, dispose, diagnostics};
}
