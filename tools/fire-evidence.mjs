import fs from 'node:fs';
import path from 'node:path';
import {StructureFire} from '../src/simulation/structure-fire.js';
import {scenarioDefinition} from '../src/simulation/fixtures.js';
import {configuration} from '../src/simulation/config.js';
import {buildingFireScenario} from '../src/content/building-fire.js';
const cases = [
  ['dry-calm', {}], ['dry-downwind', {wind: {x: 0, y: 6}}],
  ['dry-upwind', {wind: {x: 0, y: -6}}], ['dry-wide-gap', {gap: 3}],
  ['shield-test', {barrier: true}], ['wet-control-only', {moisture: 0.3}]
];
const results = [];
for (const [name, options] of cases) {
  const def = scenarioDefinition(buildingFireScenario(options)), before = performance.now();
  const fire = new StructureFire(def, configuration(), def.obstacles); const initMs = performance.now() - before;
  let receiverIgnition = null; const samples = [];
  for (let tick = 1; tick <= 900; tick++) {
    fire.step(0.1, tick / 10);
    if (receiverIgnition === null && fire.patches.some(p => p.buildingId === 'receiver' && p.phase === 'burning')) receiverIgnition = tick / 10;
    if (tick % 300 === 0) {
      const s = fire.snapshot(); samples.push({worldSeconds: tick / 10, frontages: Object.fromEntries(['source', 'receiver'].map(id => {
        const surfaces = s.surfaces.filter(p => p.buildingId === id);
        return [id, {burningPatches: surfaces.filter(p => p.phase === 'burning').length,
          hottestC: Math.round(Math.max(...surfaces.map(p => p.temperatureK)) - 273.15),
          highestBurningM: Math.max(0, ...surfaces.filter(p => p.phase === 'burning').map(p => p.h))}];
      }))});
    }
  }
  const d = fire.snapshot().diagnostics;
  results.push({name, options, patches: fire.patches.length, links: d.linkCount, initMs: Math.round(initMs), receiverIgnitionSeconds: receiverIgnition,
    samples, initialFuelKg: d.initialFuelKg, burnedFuelKg: d.burnedFuelKg,
    energyResidualJ: d.externalJ + d.groundAbsorbedJ + d.releasedJ - d.storedHeatJ - d.evaporationJ - d.gasificationJ - d.coolingJ - d.escapedJ});
}
const report = {model: 'Tinderbox exterior fire v1', units: 'SI; world seconds', sourcePin: '30a3b8cae5f36bb0c1df3685b7fba16f701c2083',
  defaultMaterial: 'dry wood (0% moisture by dry mass)', method: 'Finite-volume heat balance, limited radiative and plume transfer; qualitative checks, not experimental validation', results};
const output = process.argv[2] ?? 'artifacts/fire/physics.json';
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
