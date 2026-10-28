import {reusedWallParts} from '../reuse/walls.js';
import {ASSET_SCALE, wallStoryHeight} from './asset-scale.js';
export {ASSET_SCALE} from './asset-scale.js';
// TB-008: shared metre-based schema; walls come from the pinned Farmyard builder.
// Original builder bytes and ancestry: provenance/city.json. Native dimensions stay fixed.
export const KIT_VERSION = 1;
// Wall faces are 2m high; successive floor origins retain native 2.12m spacing.
export const DEFAULT_STORY_HEIGHT = ASSET_SCALE.wallHeight;
export const WALL_STORY_OPTIONS = Object.freeze([1, 2, 3, 4, 5].map(stories =>
  Object.freeze({stories, storyHeight: DEFAULT_STORY_HEIGHT, floorSpacing: ASSET_SCALE.floorSpacing, height: wallStoryHeight(stories)})));
export const OPENING_CLEARANCE = Object.freeze({width: ASSET_SCALE.doorWidth, height: ASSET_SCALE.doorHeight});
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
  const modules = [], obstacles = [], ids = new Set(), partIds = new Set();
  for (const source of input) {
    const m = structuredClone(source);
    if (typeof m.id !== 'string' || !m.id || ids.has(m.id)) throw Error('Duplicate/invalid module ID'); ids.add(m.id);
    if (!MODULE_FORMS.includes(m.form)) throw Error('Unsupported module form: ' + m.form);
    if (!m.form.startsWith('roof-')) {
      if (m.stories === undefined) m.stories = m.height === undefined ? 1 : WALL_STORY_OPTIONS.find(option => Math.abs(option.height - m.height) < 1e-8)?.stories;
      const height = wallStoryHeight(m.stories);
      if (m.height !== undefined && (!Number.isFinite(m.height) || Math.abs(m.height - height) > 1e-8)) throw Error('Wall height must use unchanged native story units');
      if (m.storyHeight !== undefined && m.storyHeight !== ASSET_SCALE.wallHeight || m.floorSpacing !== undefined && m.floorSpacing !== ASSET_SCALE.floorSpacing) throw Error('Native story height/floor spacing cannot be rescaled');
      m.height = height; m.storyHeight = ASSET_SCALE.wallHeight; m.floorSpacing = ASSET_SCALE.floorSpacing;
      const integral = n => Number.isFinite(n) && n > 0 && Math.abs(n / ASSET_SCALE.tile - Math.round(n / ASSET_SCALE.tile)) < 1e-9;
      if (!integral(m.width)) throw Error('Wall width must compose whole native 1m units');
      m.width = Math.round(m.width / ASSET_SCALE.tile) * ASSET_SCALE.tile;
      if (m.form === 'corner') {
        if (!integral(m.depth) || m.thickness !== ASSET_SCALE.wallThickness) throw Error('Corner requires native 1m legs and .16m thickness');
        m.depth = Math.round(m.depth / ASSET_SCALE.tile) * ASSET_SCALE.tile;
      } else if (m.depth !== ASSET_SCALE.wallThickness) throw Error('Native wall thickness must remain .16m');
    } else if (m.stories !== undefined || m.storyHeight !== undefined || m.floorSpacing !== undefined) throw Error('Story options apply only to walls');
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
    const part = (role, x, y, h, w, d, height, solid = true, skinSlot = 'facade', extra = {}) => {
      const wx = quarter === 0 ? x : quarter === 1 ? -y : quarter === 2 ? -x : y;
      const wy = quarter === 0 ? y : quarter === 1 ? x : quarter === 2 ? -y : -x;
      const p = {id: m.id + ':' + role, moduleId: m.id, role, x: m.x + wx, y: m.y + wy, h,
        width: swap ? d : w, depth: swap ? w : d, height, material: m.physicalMaterial, skinSlot, solid, blocksHeat: solid, ...extra};
      if (partIds.has(p.id)) throw Error('Duplicate resolved part ID: ' + p.id); partIds.add(p.id);
      m.parts.push(p);
      if (solid) obstacles.push({...p, kind: 'wall', baseHeight: h - height / 2});
    };
    if (m.form === 'doorway') {
      const o = m.opening;
      if (!o || !['open', 'closed'].includes(o.state)) throw Error('Doorway requires explicit open/closed state');
      positive(o.width, 'opening width'); positive(o.height, 'opening height');
      if (o.width !== OPENING_CLEARANCE.width || o.height !== OPENING_CLEARANCE.height || m.width < 3 || !Number.isInteger((m.width - o.width) / (2 * ASSET_SCALE.tile))) throw Error('Doorway must retain native 1m x1.65m opening and whole wall units');
    } else if (m.form === 'corner') {
      positive(m.thickness, 'corner thickness');
      if (m.thickness >= Math.min(m.width, m.depth)) throw Error('Corner thickness exceeds its legs');
    } else if (m.form.startsWith('roof-')) {
      // Elevated decorative roof envelope. No new climbing or volumetric fire model.
      if (!Number.isFinite(m.baseHeight) || m.baseHeight < ASSET_SCALE.wallHeight) throw Error('Roof must be overhead');
      part('roof-envelope', 0, 0, m.baseHeight + m.height / 2, m.width, m.depth, m.height, false, 'roof');
    }
    if (!m.form.startsWith('roof-')) for (const p of reusedWallParts(m)) part(p.role, p.x, p.y, p.h, p.width, p.depth, p.height, p.solid, p.skinSlot,
      {sourceAssetId: p.sourceAssetId, ...(p.supportRoles ? {supportPartIds: p.supportRoles.map(role => m.id + ':' + role)} : {})});
    m.colliderIds = m.parts.filter(p => p.solid).map(p => p.id); modules.push(m);
  }
  for (const m of modules) if (m.form.startsWith('roof-')) {
    if (!Array.isArray(m.supportModuleIds) || !m.supportModuleIds.length || new Set(m.supportModuleIds).size !== m.supportModuleIds.length ||
        m.supportModuleIds.some(id => !modules.some(p => p.id === id && p.colliderIds.length > 0))) throw Error('Roof requires existing solid supportModuleIds');
  }
  return {modules, obstacles};
}