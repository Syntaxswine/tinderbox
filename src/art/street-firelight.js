import {clamp, seedOf} from './resources.js';

const LIGHT_COUNT = 6;
const TOTAL_POWER = 215;
const CLUSTER_METRES = 2.75;
const ROOF_LIGHTS = 4;
const ROOF_REACH = 3.7;
const ROOF_POWER = 28;
const ROOF_SPACING = 1.9;
const WALL_LIGHT_HEIGHT = 2.7;
const SPILL_REACH = 13;
const SPILL_POWER = 229;
const SWAP_INTENSITY = .35;

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

function source(cluster, lotEnergy, player, catalogue) {
  const {key, kind, buildingId, energy, nx, ny, nz} = cluster;
  const terrain = kind === 'terrain', growth = Math.sqrt(energy);
  const normalLength = Math.hypot(nx, ny, nz);
  const offset = terrain ? .72 + Math.min(.56, .26 * growth)
    : kind === 'walls' ? 1.0 + Math.min(1.32, .42 * growth) : .70 + Math.min(.95, .29 * growth);
  const x = cluster.x / energy + offset * nx / normalLength;
  const sourceHeight = cluster.y / energy + offset * ny / normalLength + (terrain ? 0 : .36);
  // Keep the street contribution below the shingles until local roof fire takes over.
  const y = catalogue && kind === 'walls' ? Math.min(sourceHeight, WALL_LIGHT_HEIGHT) : sourceHeight;
  const z = cluster.z / energy + offset * nz / normalLength;
  const power = terrain ? Math.min(44, 22 * energy ** .8) : Math.min(84, 19 * energy ** .82);
  const reach = terrain ? Math.min(7.5, 3.8 + 1.8 * growth)
    : Math.min(16, 5.5 + 2.0 * growth + Math.min(6, 1.27 * Math.sqrt(lotEnergy.get(buildingId))));
  const distance = Math.hypot(x - player.x, y - 1, z - player.y);
  const falloff = Math.max(.05, 1 - (distance / reach) ** 2);
  const score = power * falloff / (1 + .19 * distance ** 2);
  const roof = catalogue && kind === 'roof';
  return {key, kind, buildingId, x, y, z, power: roof ? Math.min(ROOF_POWER, power) : power,
    reach: roof ? ROOF_REACH : catalogue ? reach * .81 : reach, distance, score};
}

function roofLights(ranked) {
  const selected = [];
  for (const item of ranked) {
    if (item.kind !== 'roof' || selected.some(other => other.buildingId === item.buildingId &&
        Math.hypot(other.x - item.x, other.z - item.z) < ROOF_SPACING)) continue;
    selected.push(item);
    if (selected.length === ROOF_LIGHTS) break;
  }
  return selected;
}

function wallSpill(facades, player, heldKey, smoothstep) {
  let best = null;
  for (const {key, buildingId, energy, x, y, z, nx, nz} of facades.values()) {
    const power = SPILL_POWER * smoothstep(energy, .10, 6);
    if (power <= 0) continue;
    const centreX = x / energy, centreZ = z / energy;
    const distance = Math.hypot(centreX - player.x, centreZ - player.y);
    const score = power / (1 + .19 * distance ** 2) * (key === heldKey ? 1.18 : 1);
    if (best && (score < best.score || score === best.score && key >= best.key)) continue;
    const normal = Math.hypot(nx, nz), dx = nx / normal, dz = nz / normal;
    // Keep the cone outside the facade and aim it along and down onto the street.
    best = {key, kind: 'walls', buildingId, score, power, reach: SPILL_REACH,
      x: centreX + .95 * dx + .35 * dz, y: Math.max(3.1, y / energy + .9), z: centreZ + .95 * dz - .35 * dx,
      aimX: centreX + 4.4 * dx - 1.9 * dz, aimZ: centreZ + 4.4 * dz + 1.9 * dx};
  }
  return best;
}

function dim(slot, sources, keep) {
  slot.light.intensity *= sources.has(slot.source?.key) ? keep : 0;
  if (slot.light.intensity <= SWAP_INTENSITY) {
    slot.light.intensity = 0;
    slot.source = null;
  }
}

function move(point, x, y, z, blend) {
  point.set(point.x + (x - point.x) * blend, point.y + (y - point.y) * blend, point.z + (z - point.z) * blend);
}

function follow(slot, item, intensity, blend) {
  const {light} = slot, settle = slot.source ? blend : 1;
  move(light.position, item.x, item.y, item.z, settle);
  if (light.isSpotLight) move(light.target.position, item.aimX, 0, item.aimZ, settle);
  else light.color.setHex(item.kind === 'roof' ? 0xffa15c : 0xff9c59);
  light.distance = item.reach;
  light.intensity += (intensity - light.intensity) * blend;
  slot.source = item;
}

const flicker = (item, time) => .96 + .04 * Math.sin(time * 7.1 + seedOf(item.key) * 17);
const reading = (light, {kind, buildingId}) => ({kind, buildingId, position: light.position.toArray(),
  intensity: light.intensity, reach: light.distance});

export function createStreetFirelight(T, {catalogue = false} = {}) {
  const root = new T.Group();
  root.name = 'Shared street firelight';
  const lights = Array.from({length: LIGHT_COUNT}, (_, i) => {
    const light = new T.PointLight(0xffab63, 0, 0, 2);
    light.name = 'Street fire spill ' + (i + 1);
    root.add(light);
    return light;
  });
  const slots = lights.map(light => ({light, source: null}));
  // One shadowless cone adds direction without adding a shadow-map pass.
  const spot = catalogue ? new T.SpotLight(0xffcb96, 0, SPILL_REACH, .94, .79, 2) : null;
  const spill = spot ? {light: spot, source: null} : null;
  if (spot) {
    spot.name = 'Outward wall fire spill';
    root.add(spot, spot.target);
  }
  let selected = [], terrainSites = 0, surfaceSites = 0, candidates = 0, disposed = false;
  let lastTime = -Infinity, lastGeneration;

  function updateCatalogue(snapshot, clusters, facades, chosen, scale, time) {
    const generation = snapshot.diagnostics?.generation, elapsed = time - lastTime;
    const instant = elapsed < 0 || elapsed > .5 || generation !== lastGeneration;
    lastTime = time;
    lastGeneration = generation;
    const blend = instant ? 1 : 1 - Math.exp(-elapsed / .085);
    const keep = instant ? 0 : Math.exp(-elapsed / .055);
    const wanted = new Set(chosen.map(item => item.key));
    for (const slot of slots) if (!wanted.has(slot.source?.key)) dim(slot, clusters, keep);
    // Keep a surviving cluster in its own slot. An outgoing cluster darkens
    // before that slot can move, so a replacement cannot flash across the street.
    let roofRoom = ROOF_LIGHTS - slots.filter(slot => slot.source?.kind === 'roof').length;
    for (const item of chosen) {
      let slot = slots.find(slot => slot.source?.key === item.key);
      if (!slot) {
        if (item.kind === 'roof' && roofRoom <= 0) continue;
        slot = slots.find(slot => !slot.source);
        if (!slot) continue;
        if (item.kind === 'roof') roofRoom--;
      }
      follow(slot, item, item.power * scale * flicker(item, time), blend);
    }
    const power = lights.reduce((sum, light) => sum + light.intensity, 0);
    if (power > TOTAL_POWER) for (const light of lights) light.intensity *= TOTAL_POWER / power;
    selected = slots.filter(({light}) => light.intensity > 0).map(({light, source}) => reading(light, source));

    const target = wallSpill(facades, snapshot.player, spill.source?.key, T.MathUtils.smoothstep);
    if (spill.source?.key !== target?.key) dim(spill, facades, keep);
    if (target && (!spill.source || spill.source.key === target.key)) {
      follow(spill, target, target.power * flicker(target, time), blend);
    }
  }

  function update(snapshot, buildings, time) {
    if (disposed) return;
    const clusters = new Map(), lotEnergy = new Map(), facades = catalogue ? new Map() : null;
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
        const horizontal = Math.hypot(site.nx, site.nz);
        const face = horizontal < .15 ? 'top'
          : Math.round(4 + 4 * Math.atan2(site.nz, site.nx) / Math.PI) % 8;
        const key = [buildingId, site.part, face, bin(site.x), bin(site.y), bin(site.z)].join('/');
        add(clusters, key, site.part, buildingId, site, energy);
        if (facades && site.part === 'walls' && horizontal >= .8) {
          const across = ((site.z - snapshot.player.y) * site.nx - (site.x - snapshot.player.x) * site.nz) / horizontal;
          const upper = Math.max(0, site.y - 3.5);
          const weight = energy / ((1 + .18 * across ** 2) * (1 + 2.5 * upper ** 2));
          add(facades, buildingId + '/' + face, site.part, buildingId, site, weight);
        }
        lotEnergy.set(buildingId, (lotEnergy.get(buildingId) || 0) + energy);
        surfaceSites++;
      }
    }
    const ranked = [...clusters.values()].map(cluster => source(cluster, lotEnergy, snapshot.player, catalogue));
    if (catalogue) {
      const held = new Set(slots.map(slot => slot.source?.key));
      for (const item of ranked) if (held.has(item.key)) item.score *= 1.18;
    }
    candidates = ranked.length;
    ranked.sort((a, b) => b.score - a.score || b.power - a.power || a.key.localeCompare(b.key));
    // Keep the closest local pool and give an involved roof a slot when nearby wall clusters dominate.
    const street = catalogue ? ranked.filter(item => item.kind !== 'roof') : ranked;
    const local = street.reduce((closest, item) => item.distance < (closest?.distance ?? 3) ? item : closest, null);
    const roofs = catalogue ? roofLights(ranked)
      : [ranked.find(item => item.kind === 'roof' && item.distance < item.reach && item.power >= 5)];
    const reserved = new Set([local, ...roofs].filter(Boolean));
    const chosen = [...reserved, ...street.filter(item => !reserved.has(item))].slice(0, LIGHT_COUNT);
    const scale = Math.min(1, TOTAL_POWER / chosen.reduce((sum, item) => sum + item.power, 0));
    if (catalogue) { updateCatalogue(snapshot, clusters, facades, chosen, scale, time); return; }
    selected = [];
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i], item = chosen[i];
      light.intensity = 0;
      if (!item) continue;
      light.intensity = item.power * scale * flicker(item, time);
      light.distance = item.reach;
      light.position.set(item.x, item.y, item.z);
      selected.push(reading(light, item));
    }
  }

  return {
    root, update,
    diagnostics: () => ({terrainSites, surfaceSites, candidates, capacity: LIGHT_COUNT, powerCap: TOTAL_POWER,
      lights: selected.map(item => ({...item, position: [...item.position]})),
      ...(spill ? {spill: spill.source ? {...reading(spot, spill.source), target: spot.target.position.toArray()} : null,
        spillPowerCap: SPILL_POWER} : {})}),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const light of lights) { light.intensity = 0; light.dispose(); }
      if (spot) { spot.intensity = 0; spill.source = null; spot.dispose(); }
      selected = [];
      root.removeFromParent();
      root.clear();
    }
  };
}
