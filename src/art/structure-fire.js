import {clamp} from './resources.js';

const PARTS = new Set(['walls', 'roof', 'ground']);

export function groupStructureFire(samples) {
  const buildings = new Map(), seen = new Set();
  if (!Array.isArray(samples)) return buildings;
  for (const site of samples) {
    if (!site || typeof site.id !== 'string' || seen.has(site.id) ||
        typeof site.buildingId !== 'string' || !PARTS.has(site.part) ||
        ![site.x, site.y, site.z, site.nx, site.ny, site.nz, site.area].every(Number.isFinite) || site.area <= 0) continue;
    const length = Math.hypot(site.nx, site.ny, site.nz);
    if (!Number.isFinite(length) || length < 1e-5) continue;
    const flame = clamp(site.flame), smoke = clamp(site.smoke);
    if (!flame && !smoke) continue;
    const record = {...site, flame, smoke, nx: site.nx / length, ny: site.ny / length, nz: site.nz / length};
    seen.add(site.id);
    if (!buildings.has(site.buildingId)) buildings.set(site.buildingId, []);
    buildings.get(site.buildingId).push(record);
  }
  return buildings;
}
