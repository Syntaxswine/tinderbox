// TB-008: metre-based exterior recipes adapted from the pinned Farmyard hybrid
// geometry/world/room-art recipes. Recipe hashes and ancestry: provenance/city.json.
export const KIT_VERSION = 1;
export const OPENING_CLEARANCE = Object.freeze({width: 1.4, height: 2.3});
export const MODULE_FORMS = Object.freeze(['wall', 'doorway', 'pilaster', 'corner', 'roof-gable', 'roof-hip']);
export const SKIN_IDS = Object.freeze(['inherited-plaster', 'inherited-brick', 'inherited-wood', 'inherited-cream', 'inherited-roof']);
export const SKIN_SLOTS = Object.freeze(['facade', 'trim', 'door', 'roof']);
export const CIVILIAN_PROFILES = Object.freeze({
  horse: Object.freeze({species: 'horse', appearance: 'normal', radius: 0.62, height: 1.7,
    model: '../tactics/horse-10k-data.json', paint: 'characters/lowpoly-proof/horse-worker-model-paint-v1.png', sourceRef: 'farmyard:normal-horse'}),
  goat: Object.freeze({species: 'goat', appearance: 'normal', radius: 0.62, height: 1.7,
    model: '../tactics/goat-10k-data.json', paint: 'characters/lowpoly-proof/goat-worker-model-paint-v1.png', sourceRef: 'farmyard:normal-goat'})
});
function positive(n, name) { if (!Number.isFinite(n) || n <= 0) throw Error('Invalid module ' + name); }
export function validateCivilian(actor) {
  const profile = CIVILIAN_PROFILES[actor.species];
  if (!profile || actor.appearance !== 'normal' || actor.team !== 'civilian' || actor.headgear !== 'none' || actor.equipment !== 'none') throw Error('Civilian identity must be allowlisted normal horse/goat, civilian team, no headgear/equipment');
  if (!Number.isFinite(actor.radius) || actor.radius < profile.radius) throw Error('Civilian radius is smaller than measured envelope');
  return profile;
}
export function compileModules(input = [], world) {
  if (!Array.isArray(input) || input.length > 128) throw Error('Invalid module list');
  const modules = [], obstacles = [], ids = new Set();
  for (const source of input) {
    const m = structuredClone(source);
    if (typeof m.id !== 'string' || !m.id || ids.has(m.id)) throw Error('Duplicate/invalid module ID'); ids.add(m.id);
    if (!MODULE_FORMS.includes(m.form)) throw Error('Unsupported module form: ' + m.form);
    for (const key of ['width', 'depth', 'height']) positive(m[key], key);
    if (![m.x, m.y, m.heading].every(Number.isFinite) || Math.abs(m.heading / (Math.PI / 2) - Math.round(m.heading / (Math.PI / 2))) > 1e-9) throw Error('Modules require finite positions and quarter-turn headings');
    m.heading = ((Math.round(m.heading / (Math.PI / 2)) % 4 + 4) % 4) * Math.PI / 2;
    if (!['wood', 'masonry', 'steel'].includes(m.physicalMaterial)) throw Error('Unknown physical material');
    if (!m.skinSlots || Object.keys(m.skinSlots).some(key => !SKIN_SLOTS.includes(key)) || SKIN_SLOTS.some(key => !SKIN_IDS.includes(m.skinSlots[key]))) throw Error('Invalid module skin slots');
    if (!Array.isArray(m.sourceRefs) || !m.sourceRefs.length || m.sourceRefs.some(r => typeof r !== 'string' || !r)) throw Error('Module sourceRefs required');
    const quarter = Math.round(m.heading / (Math.PI / 2)), swap = quarter % 2;
    const width = swap ? m.depth : m.width, depth = swap ? m.width : m.depth;
    if (m.x - width / 2 < 0 || m.y - depth / 2 < 0 || m.x + width / 2 > world.width || m.y + depth / 2 > world.height) throw Error('Module outside world');
    m.version = KIT_VERSION; m.parts = [];
    const part = (role, x, y, h, w, d, height, solid = true, skinSlot = 'facade') => {
      const wx = quarter === 0 ? x : quarter === 1 ? -y : quarter === 2 ? -x : y;
      const wy = quarter === 0 ? y : quarter === 1 ? x : quarter === 2 ? -y : -x;
      const p = {id: m.id + ':' + role, moduleId: m.id, role, x: m.x + wx, y: m.y + wy, h,
        width: swap ? d : w, depth: swap ? w : d, height, material: m.physicalMaterial, skinSlot, solid, blocksHeat: solid};
      m.parts.push(p);
      if (solid) obstacles.push({...p, kind: 'wall', baseHeight: h - height / 2});
    };
    if (m.form === 'doorway') {
      const o = m.opening;
      if (!o || !['open', 'closed'].includes(o.state)) throw Error('Doorway requires explicit open/closed state');
      positive(o.width, 'opening width'); positive(o.height, 'opening height');
      if (o.width < OPENING_CLEARANCE.width || o.height < OPENING_CLEARANCE.height || o.width >= m.width || o.height >= m.height) throw Error('Doorway needs >=1.4m x2.3m clear opening inside its frame');
      const pier = (m.width - o.width) / 2;
      part('pier-left', -(o.width + pier) / 2, 0, m.height / 2, pier, m.depth, m.height);
      part('pier-right', (o.width + pier) / 2, 0, m.height / 2, pier, m.depth, m.height);
      part('lintel', 0, 0, (o.height + m.height) / 2, o.width, m.depth, m.height - o.height, false, 'trim');
      if (o.state === 'closed') part('closed-door', 0, 0, o.height / 2, o.width, Math.min(m.depth, 0.12), o.height, true, 'door');
    } else if (m.form === 'corner') {
      positive(m.thickness, 'corner thickness');
      if (m.thickness >= Math.min(m.width, m.depth)) throw Error('Corner thickness exceeds its legs');
      part('leg-x', 0, -(m.depth - m.thickness) / 2, m.height / 2, m.width, m.thickness, m.height);
      part('leg-y', -(m.width - m.thickness) / 2, m.thickness / 2, m.height / 2, m.thickness, m.depth - m.thickness, m.height);
    } else if (m.form.startsWith('roof-')) {
      // Elevated decorative roof envelope. No new climbing or volumetric fire model.
      if (!Number.isFinite(m.baseHeight) || m.baseHeight < OPENING_CLEARANCE.height) throw Error('Roof must be overhead');
      part('roof-envelope', 0, 0, m.baseHeight + m.height / 2, m.width, m.depth, m.height, false, 'roof');
    } else part(m.form, 0, 0, m.height / 2, m.width, m.depth, m.height);
    m.colliderIds = m.parts.filter(p => p.solid).map(p => p.id); modules.push(m);
  }
  for (const m of modules) if (m.form.startsWith('roof-')) {
    if (!Array.isArray(m.supportModuleIds) || !m.supportModuleIds.length || new Set(m.supportModuleIds).size !== m.supportModuleIds.length ||
        m.supportModuleIds.some(id => !modules.some(p => p.id === id && p.colliderIds.length > 0))) throw Error('Roof requires existing solid supportModuleIds');
  }
  return {modules, obstacles};
}