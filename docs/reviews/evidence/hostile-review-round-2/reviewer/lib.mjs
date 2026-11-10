// Round-2 reviewer helpers. Read-only against the checkout: probes either use the public entry point,
// or re-run themselves under hook.mjs with in-memory patches (instrumentation or mutants).
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const HEAD = new URL('../../../../../src/', import.meta.url).href;
// TB_TREES names a directory holding `old/` (git archive 4fc97bb) and `m5/` (git archive 720f7b6).
const EXPORTS = (process.env.TB_TREES ?? './').replace(/[\/]*$/, '/');
export const OLD = pathToFileURL(EXPORTS + 'old/src/').href;   // 4fc97bb: before both fixes
export const M5 = pathToFileURL(EXPORTS + 'm5/src/').href;     // 720f7b6: snapshot fix only
export const r = (v, n = 3) => v === null || v === undefined || !Number.isFinite(v) ? v : +v.toFixed(n);

// Read-only taps. They add a global reference and change no behaviour.
const TREE = 'tinderbox/src/simulation/';
export const TAPS = [
  {file: TREE + 'index.js', find: 'field = new HeatField(def, config, state.obstacles);',
    replace: 'field = new HeatField(def, config, state.obstacles);globalThis.__tb={get field(){return field},get state(){return state},get housing(){return housing},get cottages(){return cottages},get definition(){return definition}};'},
  {file: TREE + 'housing-fire.js', find: 'let groundField;',
    replace: 'let groundField;(globalThis.__lots??=[]).push({building,groundSites,sites,sections,panels,porch,porchPost,localBoxes,plan,grid,obstacles});'},
  {file: TREE + 'cottage-fire.js', find: 'const byBuilding=new Map(lots.map(l=>[l.building.id,l]));',
    replace: 'const byBuilding=new Map(lots.map(l=>[l.building.id,l]));globalThis.__cottageLots=lots;'}
];

// Re-run the calling probe under the patch hook. Returns only inside the patched child.
// TB_EXTRA (JSON array of patches) adds a mutant on top, to show what a surviving mutant does to the audit.
export function underPatches(metaUrl, patches) {
  if (process.env.TB_PATCHES_ACTIVE) return;
  const result = spawnSync(process.execPath, ['--import', new URL('hook.mjs', import.meta.url).href, fileURLToPath(metaUrl), ...process.argv.slice(2)],
    {stdio: 'inherit', env: {...process.env, TB_PATCHES: JSON.stringify([...patches, ...JSON.parse(process.env.TB_EXTRA ?? '[]')]), TB_PATCHES_ACTIVE: '1'}});
  process.exit(result.status ?? 1);
}

export async function load(root = HEAD) {
  const sim = await import(root + 'simulation/index.js');
  const {NEIGHBORHOOD_SCENARIO, NEIGHBORHOOD_BASE, SHOP_WITNESS_SCENARIO} = await import(root + 'content/neighborhood.js');
  const {COTTAGE_PAIR_SCENARIO} = await import(root + 'content/cottage-pair.js');
  const {calmCottageWind} = await import(root + 'reuse/ashland/wind.js');
  return {...sim, NEIGHBORHOOD_SCENARIO, NEIGHBORHOOD_BASE, SHOP_WITNESS_SCENARIO, COTTAGE_PAIR_SCENARIO, calmCottageWind, STEP: sim.DEFAULT_CONFIG.step, root};
}
