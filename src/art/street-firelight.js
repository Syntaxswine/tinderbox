import {clamp, seedOf} from './resources.js';

const LIGHT_COUNT = 6;
const TOTAL_POWER = 215;
const CLUSTER_METRES = 2.75;

function bin(value) {
  return Math.floor(value / CLUSTER_METRES);
}

function add(clusters, key, kind, buildingId, site, energy) {
  let cluster = clusters.get(key);
  if (!cluster) {
    cluster = {key, kind, buildingId, energy: 0, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0};
    clusters.set(key, cluster);
  }
  cluster.energy += energy;
  cluster.x += site.x * energy;
  cluster.y += site.y * energy;
  cluster.z += site.z * energy;
  cluster.nx += site.nx * energy;
  cluster.ny += site.ny * energy;
  cluster.nz += site.nz * energy;
}

function source(cluster, lotEnergy, player) {
  const {key, kind, buildingId, energy, nx, ny, nz} = cluster;
  const terrain = kind === 'terrain', growth = Math.sqrt(energy);
  const normalLength = Math.hypot(nx, ny, nz);
  const offset = terrain ? .72 + Math.min(.56, .26 * growth)
    : kind === 'walls' ? 1.0 + Math.min(1.32, .42 * growth) : .70 + Math.min(.95, .29 * growth);
  const x = cluster.x / energy + offset * nx / normalLength;
  const y = cluster.y / energy + offset * ny / normalLength + (terrain ? 0 : .36);
  const z = cluster.z / energy + offset * nz / normalLength;
  const power = terrain ? Math.min(44, 22 * energy ** .8) : Math.min(84, 19 * energy ** .82);
  const reach = terrain ? Math.min(7.5, 3.8 + 1.8 * growth)
    : Math.min(16, 5.5 + 2.0 * growth + Math.min(6, 1.27 * Math.sqrt(lotEnergy.get(buildingId))));
  const distance = Math.hypot(x - player.x, y - 1, z - player.y);
  const falloff = Math.max(.05, 1 - (distance / reach) ** 2);
  const score = power * falloff / (1 + .19 * distance ** 2);
  return {key, kind, buildingId, x, y, z, power, reach, distance, score};
}

export function createStreetFirelight(T) {
  const root = new T.Group();
  root.name = 'Shared street firelight';
  const lights = Array.from({length: LIGHT_COUNT}, (_, i) => {
    const light = new T.PointLight(0xffab63, 0, 0, 2);
    light.name = 'Street fire spill ' + (i + 1);
    root.add(light);
    return light;
  });
  let selected = [], terrainSites = 0, surfaceSites = 0, candidates = 0, disposed = false;

  function update(snapshot, buildings, time) {
    if (disposed) return;
    const clusters = new Map(), lotEnergy = new Map();
    terrainSites = surfaceSites = 0;
    for (const cell of snapshot.cells || []) {
      if (cell.phase !== 'burning' || !(cell.intensity > 0) || ![cell.x, cell.y].every(Number.isFinite)) continue;
      const size = cell.size ?? snapshot.world.fireCellSize;
      if (!Number.isFinite(size) || size <= 0) continue;
      const area = size ** 2;
      const fuel = cell.surfaceFuel + cell.depositedFuel;
      // Fade the last fraction of fuel, because the field's active intensity stays high until burnout.
      const fuelFade = Number.isFinite(fuel) ? T.MathUtils.smoothstep(fuel / area, 0, .04) : 1;
      const energy = area * clamp(cell.intensity) * fuelFade;
      if (!(energy > 0)) continue;
      const site = {x: cell.x, y: 0, z: cell.y, nx: 0, ny: 1, nz: 0};
      add(clusters, 'terrain/' + bin(site.x) + '/' + bin(site.z), 'terrain', null, site, energy);
      terrainSites++;
    }
    for (const [buildingId, sites] of buildings) {
      for (const site of sites) {
        if (site.exposed !== true || site.flame <= 0) continue;
        const energy = site.area * site.flame;
        const face = Math.hypot(site.nx, site.nz) < .15 ? 'top'
          : Math.round(4 + 4 * Math.atan2(site.nz, site.nx) / Math.PI) % 8;
        const key = [buildingId, site.part, face, bin(site.x), bin(site.y), bin(site.z)].join('/');
        add(clusters, key, site.part, buildingId, site, energy);
        lotEnergy.set(buildingId, (lotEnergy.get(buildingId) || 0) + energy);
        surfaceSites++;
      }
    }
    const ranked = [...clusters.values()].map(cluster => source(cluster, lotEnergy, snapshot.player));
    candidates = ranked.length;
    ranked.sort((a, b) => b.score - a.score || b.power - a.power || a.key.localeCompare(b.key));
    // Keep the closest local pool and give an involved roof a slot when nearby wall clusters dominate.
    const local = ranked.reduce((closest, item) => item.distance < (closest?.distance ?? 3) ? item : closest, null);
    const roof = ranked.find(item => item.kind === 'roof' && item.distance < item.reach && item.power >= 5);
    const reserved = new Set([local, roof].filter(Boolean));
    const chosen = [...reserved, ...ranked.filter(item => !reserved.has(item))].slice(0, LIGHT_COUNT);
    const scale = Math.min(1, TOTAL_POWER / chosen.reduce((sum, item) => sum + item.power, 0));
    selected = [];
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i], item = chosen[i];
      light.intensity = 0;
      if (!item) continue;
      const flicker = .96 + .04 * Math.sin(time * 7.1 + seedOf(item.key) * 17);
      light.intensity = item.power * scale * flicker;
      light.distance = item.reach;
      light.position.set(item.x, item.y, item.z);
      selected.push({kind: item.kind, buildingId: item.buildingId, position: light.position.toArray(), intensity: light.intensity, reach: light.distance});
    }
  }

  return {
    root, update,
    diagnostics: () => ({terrainSites, surfaceSites, candidates, capacity: LIGHT_COUNT, powerCap: TOTAL_POWER,
      lights: selected.map(item => ({...item, position: [...item.position]}))}),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const light of lights) { light.intensity = 0; light.dispose(); }
      selected = [];
      root.removeFromParent();
      root.clear();
    }
  };
}
