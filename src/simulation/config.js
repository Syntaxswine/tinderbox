// Tunable TB-004 prototype values. Metres, seconds, HP and litres (fuel).
export const DEFAULT_CONFIG = Object.freeze({
  step: 1 / 60, maxCatchUp: 0.25,
  player: {speed: 9, radius: 0.56, maxHp: 100},
  input: {cameraRelative: true, cameraX: 10, cameraY: 12},
  drugs: {duration: 8, playerScale: 1.5, worldScale: 0.35, healing: 35},
  fuel: {gasPerMetre: 0.08, gasBurnRate: 0.018, surfaceBurnRate: 0.025, surfaceDensity: {grass: 0.32, wood: 1.2}},
  fire: {frontSpeed: 4, heatRate: 40, cooling: 0.3, damagePerSecond: 18,
    propagation: {gas: {speedScale: 1, heatScale: 1}, grass: {speedScale: .5, heatScale: .65}, wood: {speedScale: .2, heatScale: .35}},
    ignition: {gas: 0.6, grass: 0.85, wood: 1.1}, maxHeat: 4, burnHeat: 1.5, minIntensity: 0.5, intensityRise: 3, damageHeatStart: 0.4, damageHeatSpan: 1.6},
  tools: {
    emissionClock: 'player', presentationHeight: 1.05, matches: {range: 0.85, heat: 1.8},
    torch: {range: 1.1, radius: 0.4, heat: 1.8, fuelPerSecond: 0.12},
    flamethrower: {range: 4.5, halfAngle: Math.PI / 8, heatPerSecond: 12, fuelPerSecond: 0.3},
    molotov: {range: 6, speed: 7, radius: 0.9, fuel: 0.3, heat: 2.2}
  },
  barrel: {radius: 0.328, height: 0.8, ignitionHeat: 1.4, blastRadius: 2.5, heat: 2.8, damage: 50, wallsProtect: true},
  inventory: {matches: 12, gas: 4, molotovs: 4, torchFuel: 5,
    flamethrowerFuel: 6, powder: 4, healing: 3, inversion: 3},
  events: {capacity: 256}
});
export const TOOLS = Object.freeze(['matches', 'jerry-can', 'molotov', 'torch', 'flamethrower']);
export const DRUGS = Object.freeze(['powder', 'healing', 'inversion']);
function merge(base, override) {
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(override || {})) {
    if (!Object.hasOwn(base, key)) throw Error('Unknown config key: ' + key);
    const expected = base[key];
    if (expected && typeof expected === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid config object: ' + key);
      result[key] = merge(expected, value);
    } else {
      if (typeof value !== typeof expected || typeof value === 'number' && !Number.isFinite(value)) throw Error('Invalid config type: ' + key);
      result[key] = value;
    }
  }
  return result;
}
export function configuration(override) {
  const value = merge(DEFAULT_CONFIG, override);
  function check(object, prefix = '') {
    for (const [key, entry] of Object.entries(object)) {
      if (entry && typeof entry === 'object') check(entry, prefix + key + '.');
      else if (typeof entry === 'number' && (!Number.isFinite(entry) || entry < 0)) throw Error('Invalid config: ' + prefix + key);
    }
  }
  check(value);
  if (value.step <= 0 || value.step > 0.1 || value.maxCatchUp < value.step || value.maxCatchUp > 1 || value.player.radius <= 0 || value.fire.frontSpeed <= 0) throw Error('Invalid fixed-step/geometry configuration');
  if (value.fire.minIntensity <= 0 || value.fire.minIntensity > 1 || value.fire.damageHeatSpan <= 0 || value.fire.burnHeat > value.fire.maxHeat) throw Error('Invalid thermal bounds');
  if (!Number.isInteger(value.events.capacity) || value.events.capacity < 1 || value.events.capacity > 4096) throw Error('Invalid event capacity');
  if (!['player', 'active'].includes(value.tools.emissionClock)) throw Error('Unsupported emission clock');
  if (value.tools.torch.fuelPerSecond <= 0 || Object.values(value.fire.propagation).some(policy => policy.speedScale <= 0)) throw Error('Invalid torch/material timing');
  return value;
}
