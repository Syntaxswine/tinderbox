import {clamp} from './resources.js';

const PARTS = new Set(['walls', 'roof', 'ground']);

export function groupStructureFire(samples, {nativeFrame} = {}) {
  const buildings = new Map(), seen = new Set();
  if (!Array.isArray(samples)) return buildings;
  // Only the versioned physical frame's own canonical array has this contract.
  // Legacy/unknown producers keep their existing explicit exposure semantics.
  const metadata=nativeFrame?.catalogueModules??nativeFrame?.scene;
  const nativeOwners=nativeFrame?.fireSamples===samples&&metadata?.version===1&&Array.isArray(metadata.instances)
    ?new Set(['terrain',...metadata.instances.map(instance=>instance.id)]):null;
  for (const site of samples) {
    if (!site || typeof site.id !== 'string' || seen.has(site.id) ||
        typeof site.buildingId !== 'string' || !PARTS.has(site.part) ||
        ![site.x, site.y, site.z, site.nx, site.ny, site.nz, site.area].every(Number.isFinite) || site.area <= 0) continue;
    const length = Math.hypot(site.nx, site.ny, site.nz);
    if (!Number.isFinite(length) || length < 1e-5) continue;
    const flame = clamp(site.flame), smoke = clamp(site.smoke);
    if (!flame && !smoke) continue;
    const record = {...site, flame, smoke, nx: site.nx / length, ny: site.ny / length, nz: site.nz / length};
    if(nativeOwners?.has(site.ownerInstanceId)&&site.buildingId===site.ownerInstanceId&&Object.hasOwn(site,'fuelClass')&&flame>0&&!Object.hasOwn(site,'exposed'))record.exposed=true;
    seen.add(site.id);
    if (!buildings.has(site.buildingId)) buildings.set(site.buildingId, []);
    buildings.get(site.buildingId).push(record);
  }
  return buildings;
}
