// Round 1 found eleven source mutants that every test let through (record, S4).
// This re-runs those eleven against the whole test suite on the fixed tree. The checkout is
// never edited: the round-1 loader hook swaps one string in memory.
//   node docs/reviews/evidence/hostile-review-round-2/mutants-round-1-survivors.mjs
import {spawnSync} from 'node:child_process';
import {readdirSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/[\\/]$/, '');
const hook = pathToFileURL(path.join(here, '../hostile-review-round-1/reviewer/mutant-hook.mjs')).href;
const tests = ['tests/simulation', 'tests/integration', 'tests/ui', 'tests/content'].flatMap(dir =>
  readdirSync(path.join(repo, dir)).filter(name => /\.test\.(?:m?js)$/.test(name)).map(name => dir + '/' + name));

// Two search strings moved since round 1 (rubble heat, the new frontage loop); the change each makes is the same.
const MUTANTS = {
  'control-identity': {file: '/src/simulation/combustion.js', find: 'return fuel > 0 && heat >= threshold;', replace: 'return fuel > 0 && heat >= threshold ;'},
  'control-never-ignite': {file: '/src/simulation/combustion.js', find: 'return fuel > 0 && heat >= threshold;', replace: 'return false;'},
  'ground-no-cooling': {file: '/src/simulation/field.js', find: 'cell.heat = storedHeat(preTransfer, incoming + rubbleHeat, fire.cooling, delta, fire.maxHeat);', replace: 'cell.heat = storedHeat(preTransfer, incoming + rubbleHeat, 0, delta, fire.maxHeat);'},
  'ground-all-fuels-ignite-at-gas-threshold': {file: '/src/simulation/field.js', find: 'fire.ignition[cell.material] ?? Infinity', replace: 'fire.ignition.gas'},
  'ground-receiver-scale-ignored': {file: '/src/simulation/field.js', find: 'output * targetPolicy.receiveScale / neighbour.distance * delta', replace: 'output / neighbour.distance * delta'},
  'ground-source-output-ignores-fuel': {file: '/src/simulation/field.js', find: 'const output = this.heatOutput(material);', replace: "const output = this.heatOutput('gas');"},
  'ground-burning-cell-holds-no-heat': {file: '/src/simulation/field.js', find: 'cell.heat = Math.max(cell.heat, fire.burnHeat); cell.intensity', replace: 'cell.intensity'},
  'ground-speed-scale-ignored': {file: '/src/simulation/field.js', find: 'const speed = fire.frontSpeed * Math.min(sourcePolicy.speedScale, targetPolicy.speedScale);', replace: 'const speed = fire.frontSpeed;'},
  'house-never-lights-the-ground': {file: '/src/simulation/housing-fire.js', find: 'for(const {site,frontage} of groundSites)if(present(site)){', replace: "for(const {site,frontage} of groundSites)if(present(site)&&site.phase!=='burning'){"},
  'structure-no-stair-link': {file: '/src/simulation/housing-topology.js', find: 'link(nearest(floors[level]), nearest(floors[level + 1]), {gain: 1.4});', replace: ''},
  'molotov-always-low-band': {file: '/src/simulation/housing-fire.js', find: 'else if(height>ASSET_SCALE.wallHeight/2)site=panel.high;', replace: ''},
  'structure-fire-ignores-powder-dt': {file: '/src/simulation/index.js', find: 'for(const lot of housing?.values()??[])lot.step(worldDelta,state.clocks.world,event);', replace: 'for(const lot of housing?.values()??[])lot.step(config.step,state.clocks.world,event);'},
  'ashland-interior-floor-links-removed': {file: '/src/simulation/cottage-topology.js', find: "link(id,layer+':'+previous);", replace: ''}
};

const lines = [];
for (const [name, spec] of Object.entries(MUTANTS)) {
  // A search string that no longer matches would make the hook throw and look like a kill.
  const count = readFileSync(path.join(repo, spec.file), 'utf8').split(spec.find).length - 1;
  if (count !== 1) { lines.push(`${name} | NOT RUN: search string occurs ${count} times in ${spec.file}`); console.log(lines.at(-1)); continue; }
  const result = spawnSync(process.execPath, ['--import', hook, '--test', '--test-concurrency=4', '--test-reporter=tap', ...tests],
    {cwd: repo, env: {...process.env, TB_MUTANT: JSON.stringify(spec)}, encoding: 'utf8', maxBuffer: 1 << 28});
  const out = result.stdout + '\n' + result.stderr;
  const number = key => Number(out.match(new RegExp('^# ' + key + ' (\\d+)', 'm'))?.[1] ?? NaN);
  const failed = [...out.matchAll(/^not ok \d+ - (.+)$/gm)].map(m => m[1]);
  lines.push(`${name} | tests ${number('tests')} pass ${number('pass')} fail ${number('fail')} | ${failed.length ? 'KILLED by: ' + failed.slice(0, 3).join(' ;; ') : 'SURVIVED'}`);
  console.log(lines.at(-1));
}
mkdirSync(path.join(here, 'results'), {recursive: true});
writeFileSync(path.join(here, 'results', 'mutants-round-1-survivors.txt'), lines.join('\n') + '\n');
