// Round-3 reviewer helpers. Read-only against the checkout: probes use the public entry point or the
// modules directly, or re-run themselves under hook.mjs with in-memory patches (taps or mutants).
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const HEAD = new URL('../../../../../src/', import.meta.url).href;
// TB_TREES names a directory holding read-only exports: old/ (4fc97bb), m5/ (720f7b6), tip2/ (26931d9).
const EXPORTS = (process.env.TB_TREES ?? './').replace(/[\/]*$/, '/');
export const TIP2 = pathToFileURL(EXPORTS + 'tip2/src/').href;   // 26931d9: the tree round 2 reviewed
// TB_BASE3 names a read-only export of 968e88a (after the round-two corrections, before the floor pass).
export const BASE3 = process.env.TB_BASE3 ? pathToFileURL(process.env.TB_BASE3.replace(/[\/]*$/, '/') + 'src/').href : null;
export const OLD = pathToFileURL(EXPORTS + 'old/src/').href;     // 4fc97bb: before any fix
export const r = (v, n = 3) => v === null || v === undefined || !Number.isFinite(v) ? v : +v.toFixed(n);

// Read-only taps. They add a global reference and change no behaviour.
const TREE = 'src/simulation/';
export const TAPS = [
  {file: TREE + 'index.js', find: 'field = new HeatField(def, config, state.obstacles);',
    replace: 'field = new HeatField(def, config, state.obstacles);globalThis.__tb={get field(){return field},get state(){return state},get housing(){return housing},get cottages(){return cottages},get definition(){return definition}};'},
  {file: TREE + 'housing-fire.js', find: 'let groundField;',
    replace: 'let groundField;(globalThis.__lots??=[]).push({building,groundSites,sites,sections,panels,porch,porchPost,localBoxes,plan,grid,obstacles,lowPanels});'}
];

// Re-run the calling probe under the patch hook. Returns only inside the patched child.
export function underPatches(metaUrl, patches) {
  if (process.env.TB_PATCHES_ACTIVE) return;
  const result = spawnSync(process.execPath, ['--import', new URL('hook.mjs', import.meta.url).href, fileURLToPath(metaUrl), ...process.argv.slice(2)],
    {stdio: 'inherit', env: {...process.env, TB_PATCHES: JSON.stringify([...patches, ...JSON.parse(process.env.TB_EXTRA ?? '[]')]), TB_PATCHES_ACTIVE: '1'}});
  process.exit(result.status ?? 1);
}

export async function load(root = HEAD) {
  const sim = await import(root + 'simulation/index.js');
  const {NEIGHBORHOOD_SCENARIO, NEIGHBORHOOD_BASE} = await import(root + 'content/neighborhood.js');
  const {COTTAGE_PAIR_SCENARIO} = await import(root + 'content/cottage-pair.js');
  const {calmCottageWind} = await import(root + 'reuse/ashland/wind.js');
  const {HOUSING_PLANS} = await import(root + 'content/housing-plans.js');
  const buildings = await import(root + 'content/buildings.js');
  return {...sim, ...buildings, HOUSING_PLANS, NEIGHBORHOOD_SCENARIO, NEIGHBORHOOD_BASE, COTTAGE_PAIR_SCENARIO, calmCottageWind, STEP: sim.DEFAULT_CONFIG.step, root};
}

// A one-house (or one-row) world on bare paving unless `grass` is given. Scenario id 'neighborhood' selects the catalogue house model.
export function houseWorld(api, placements, {grass = false, player, size = 60} = {}) {
  return {id: 'neighborhood', width: size, height: size, buildings: placements, obstacles: [], actors: [], pickups: [],
    patches: grass ? [{x: 0, y: 0, width: size, depth: size, material: 'grass'}] : [], player};
}
