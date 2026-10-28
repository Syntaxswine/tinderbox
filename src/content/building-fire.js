import {ASSET_SCALE} from './asset-scale.js';
const skins = {facade: 'inherited-wood', trim: 'inherited-cream', door: 'inherited-wood', roof: 'inherited-roof'};
// Two native frontages isolate exterior transfer without inventing room contents.
export function buildingFireScenario({gap = 0.75, moisture = 0, barrier = false, stories = 3, wind = {x: 0, y: 0}} = {}) {
  if (!Number.isFinite(gap) || gap < 0.5 || gap > 5) throw Error('Fixture gap must be 0.5–5 m');
  const wall = (id, y, physicalMaterial, count) => ({id, buildingId: id, form: 'wall', x: 6, y, width: 3,
    depth: ASSET_SCALE.wallThickness, stories: count, heading: 0, physicalMaterial, fireMoisture: moisture,
    skinSlots: {...skins}, sourceRefs: ['farmyard:hybrid-wall-opening', 'game:exterior-heat-transfer-fixture']});
  const targetY = 4 + ASSET_SCALE.wallThickness + gap;
  return {id: 'building-fire', width: 16, height: 12, player: {x: 11, y: 9, tool: 'flamethrower'},
    modules: [wall('source', 4, 'wood', stories), wall('receiver', targetY, 'wood', Math.min(stories, 2)),
      ...(barrier ? [wall('firebreak', (4 + targetY) / 2, 'masonry', 5)] : [])], obstacles: [], actors: [],
    structureFire: {moisture, wind: {...wind}, exposures: [
      {buildingId: 'source', x: 6, y: 4.12, h: 0.25, radius: 1.1, flux: 80000, duration: 30, pilot: true}
    ]}};
}
