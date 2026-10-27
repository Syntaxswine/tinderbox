// Tunable TB-004 prototype values. Metres, seconds, HP and litres (fuel).
export const DEFAULT_CONFIG = Object.freeze({
  step: 1 / 60, maxCatchUp: 0.25,
  player: {speed: 3, radius: 0.23, maxHp: 100},
  input: {cameraRelative: true, cameraX: 10, cameraY: 12},
  drugs: {duration: 8, playerScale: 1.5, worldScale: 0.35, healing: 35},
  fuel: {gasPerMetre: 0.08, gasBurnRate: 0.018, surfaceBurnRate: 0.025},
  fire: {frontSpeed: 4, heatRate: 40, cooling: 0.3, damagePerSecond: 18,
    ignition: {gas: 0.6, grass: 0.85, wood: 1.1}, maxHeat: 4},
  tools: {
    emissionClock: 'player', matches: {range: 0.85, radius: 0.3, heat: 1.8},
    torch: {range: 1.1, radius: 0.4, heatPerSecond: 9, fuelPerSecond: 0.12},
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
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? merge(base[key], value) : value;
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
  if (!['player', 'active'].includes(value.tools.emissionClock)) throw Error('Unsupported emission clock');
  return value;
}
