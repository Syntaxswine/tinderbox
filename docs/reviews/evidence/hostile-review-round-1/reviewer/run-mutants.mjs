// Runs the repo's own tests against in-memory mutants. Usage: node run-mutants.mjs <fire|rest|all> <name>[,<name>...]
import {spawnSync} from 'node:child_process';
import {readdirSync, writeFileSync, appendFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = fileURLToPath(new URL('../../../../../', import.meta.url)).replace(/[\/]$/, '');
const FIRE = ['tests/simulation/model.test.js', 'tests/simulation/sensitivity.test.js', 'tests/simulation/fire-exposure.test.js', 'tests/simulation/row-ignition.test.js',
  'tests/simulation/close-tools.test.js', 'tests/simulation/safety.test.js', 'tests/simulation/siding-preheat.test.js', 'tests/simulation/lantern.test.js',
  'tests/simulation/discharge.test.js', 'tests/simulation/body.test.js', 'tests/simulation/pickups.test.js', 'tests/integration/catalogue-floor-fire.test.mjs',
  'tests/integration/cottage-fire-interactions.test.mjs', 'tests/integration/joined-roof-fire.test.mjs', 'tests/integration/ashland-radiation.test.mjs',
  'tests/integration/house-rubble.test.mjs', 'tests/integration/cottage-pair.test.mjs'];
const every = ['tests/simulation', 'tests/integration', 'tests/ui', 'tests/content'].flatMap(dir =>
  readdirSync(path.join(repo, dir)).filter(name => /\.test\.(?:m?js)$/.test(name)).map(name => dir + '/' + name));
const REST = every.filter(file => !FIRE.includes(file));

export const MUTANTS = {
  // --- harness controls ---
  'control-identity': {file: '/src/simulation/combustion.js', find: 'return fuel > 0 && heat >= threshold;', replace: 'return fuel > 0 && heat >= threshold ;'},
  'control-never-ignite': {file: '/src/simulation/combustion.js', find: 'return fuel > 0 && heat >= threshold;', replace: 'return false;'},
  // --- ground field ---
  'ground-no-cooling': {file: '/src/simulation/field.js', find: 'cell.heat = storedHeat(preTransfer, incoming, fire.cooling, delta, fire.maxHeat);', replace: 'cell.heat = storedHeat(preTransfer, incoming, 0, delta, fire.maxHeat);'},
  'ground-all-fuels-ignite-at-gas-threshold': {file: '/src/simulation/field.js', find: 'fire.ignition[cell.material] ?? Infinity', replace: 'fire.ignition.gas'},
  'ground-receiver-scale-ignored': {file: '/src/simulation/field.js', find: 'output * targetPolicy.receiveScale / neighbour.distance * delta', replace: 'output / neighbour.distance * delta'},
  'ground-source-output-ignores-fuel': {file: '/src/simulation/field.js', find: 'const output = this.heatOutput(material);', replace: "const output = this.heatOutput('gas');"},
  'ground-burning-cell-holds-no-heat': {file: '/src/simulation/field.js', find: 'cell.heat = Math.max(cell.heat, fire.burnHeat); cell.intensity', replace: 'cell.intensity'},
  'ground-no-diagonal-neighbours': {file: '/src/simulation/field.js', find: 'if ((!dx && !dy) || col + dx < 0', replace: 'if ((!dx && !dy) || (dx && dy) || col + dx < 0'},
  'ground-no-travel-gate': {file: '/src/simulation/field.js', find: 'worldTime + EPS < source.ignitedAt + neighbour.distance / speed || ', replace: ''},
  'ground-speed-scale-ignored': {file: '/src/simulation/field.js', find: 'const speed = fire.frontSpeed * Math.min(sourcePolicy.speedScale, targetPolicy.speedScale);', replace: 'const speed = fire.frontSpeed;'},
  // --- ground <-> structure ---
  'house-never-lights-the-ground': {file: '/src/simulation/housing-fire.js', find: 'for(const site of groundSites)if(present(site)){', replace: "for(const site of groundSites)if(present(site)&&site.phase!=='burning'){"},
  'contact-second-row-removed': {file: '/src/simulation/surface-fire.js', find: 'const contacts = [[.38, .024], [.84, .018]];', replace: 'const contacts = [[.38, .024]];'},
  'grass-siding-gain-removed': {file: '/src/simulation/surface-fire.js', find: 'const grassSidingCoupling = 2.5;', replace: 'const grassSidingCoupling = 1;'},
  // --- structure graph / vertical axis ---
  'structure-no-downward-spread': {file: '/src/simulation/surface-fire.js', find: 'if (present(target)) heatSurfaceSite(target, dt / seconds * activity * gain', replace: 'if (present(target) && target.y >= site.y - 1e-6) heatSurfaceSite(target, dt / seconds * activity * gain'},
  'structure-no-stair-link': {file: '/src/simulation/housing-topology.js', find: 'link(nearest(floors[level]), nearest(floors[level + 1]), {gain: 1.4});', replace: ''},
  'structure-no-wall-to-floor-link': {file: '/src/simulation/housing-topology.js', find: 'if (nearest && planar(panel.low, nearest) <= 2.2) link(panel.low, nearest, {gain: 1.65});', replace: ''},
  'structure-upward-bias-removed': {file: '/src/simulation/surface-fire.js', find: 'slope * (slope >= 0 ? .95 : .42)', replace: '0'},
  'structure-no-cooling': {file: '/src/simulation/surface-fire.js', find: 'site.heat = storedHeat(site.heat, 0, site.fuel.cooling, dt, site.fuel.limit);', replace: 'site.heat = storedHeat(site.heat, 0, 0, dt, site.fuel.limit);'},
  'molotov-always-low-band': {file: '/src/simulation/housing-fire.js', find: 'else if(height>ASSET_SCALE.wallHeight/2)site=panel.high;', replace: ''},
  'structure-fire-ignores-powder-dt': {file: '/src/simulation/index.js', find: 'for(const lot of housing?.values()??[])lot.step(worldDelta,state.clocks.world,event);', replace: 'for(const lot of housing?.values()??[])lot.step(config.step,state.clocks.world,event);'},
  'house-burn-time-halved': {file: '/src/simulation/housing-topology.js', find: 'const burnSeconds = {floor: 10, wall: 8, joinery: 7, fascia: 7, roof: 10, porch: 8};', replace: 'const burnSeconds = {floor: 5, wall: 4, joinery: 3.5, fascia: 3.5, roof: 5, porch: 4};'},
  // --- Ashland ---
  'ashland-interior-floor-links-removed': {file: '/src/simulation/cottage-topology.js', find: "link(id,layer+':'+previous);", replace: ''},
  'radiation-source-angle-ignored': {file: '/src/simulation/cottage-radiation.js', find: 'GAIN * Math.max(0, outgoing) * Math.max(0, incident)', replace: 'GAIN * (outgoing > 0 ? 1 : 0) * Math.max(0, incident)'},
  'radiation-area-ignored': {file: '/src/simulation/cottage-radiation.js', find: 'from.site.area * surfaceOutput(from.site, time)', replace: 'surfaceOutput(from.site, time)'}
};

const [, , scope = 'fire', names = Object.keys(MUTANTS).join(',')] = process.argv;
const files = scope === 'fire' ? FIRE : scope === 'rest' ? REST : [...FIRE, ...REST];
mkdirSync(path.join(here, 'mutants'), {recursive: true});
const summary = path.join(here, 'mutants', 'summary-' + scope + '.txt');
for (const name of names.split(',')) {
  const spec = MUTANTS[name];
  if (!spec) throw Error('Unknown mutant ' + name);
  const cpu = process.cpuUsage();
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(path.join(here, 'mutant-hook.mjs')).href, '--test', '--test-concurrency=4', '--test-reporter=tap', ...files],
    {cwd: repo, env: {...process.env, TB_MUTANT: JSON.stringify(spec)}, encoding: 'utf8', maxBuffer: 1 << 28});
  const out = result.stdout + '\n' + result.stderr;
  writeFileSync(path.join(here, 'mutants', scope + '-' + name + '.tap'), out);
  const number = key => Number(out.match(new RegExp('^# ' + key + ' (\\d+)', 'm'))?.[1] ?? NaN);
  const failed = [...out.matchAll(/^not ok \d+ - (.+)$/gm)].map(m => m[1]);
  const line = `${name} | scope=${scope} | tests ${number('tests')} pass ${number('pass')} fail ${number('fail')} | exit ${result.status} | ${failed.length ? 'KILLED by: ' + failed.slice(0, 4).join(' ;; ') : 'SURVIVED'}`;
  appendFileSync(summary, line + '\n');
  console.log(line);
}
