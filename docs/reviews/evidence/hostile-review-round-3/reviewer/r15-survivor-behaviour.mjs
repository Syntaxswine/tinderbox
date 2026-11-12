// r15: what does each mutant that the test gate let through actually change? Each survivor is applied in memory
// and one or more of this reviewer's probes are re-run on this tree only (no control tree); the lines that differ
// from the unmutated run are printed, unmutated first. "no difference" means the probe cannot see the mutant.
// Run: node r15-survivor-behaviour.mjs [mutant-name filter]
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MUTANTS} from './mutants.mjs';
const here = fileURLToPath(new URL('.', import.meta.url)), hook = new URL('hook.mjs', import.meta.url).href;
const PROBES = {
  deck: ['r12-deck-sections.mjs'], dud: ['r07-lantern-dud-repro.mjs'], panels: ['r18-lantern-panel-census.mjs'],
  flame9: ['r05-flame-sweep.mjs', 'hopkins-4-09'], flame13: ['r05-flame-sweep.mjs', 'hopkins-4-13'], lantern13: ['r04-lantern-sweep.mjs', 'hopkins-4-13'], lantern9: ['r04-lantern-sweep.mjs', 'hopkins-4-09'],
  census: ['r01-topology-census.mjs'], speeds: ['r08-spread-speeds.mjs'], collapse: ['r11-collapse-blockers.mjs'], grazing: ['r17-grazing-flame.mjs'],
  floors: ['r02-floor-vs-art.mjs'], links: ['r14-wall-floor-links.mjs'], burned: ['r21-burned-fraction.mjs'], ashland: ['r13-ashland-pair-differential.mjs']
};
const PLAN = {
  'D02-cut-edges-exchange-ground-heat': ['deck'],
  'D05-stairs-not-linked-to-deck': ['deck'],
  'D06-entry-door-not-linked-to-deck': ['deck', 'speeds'],
  'D08-post-linked-to-far-deck-end': ['deck'],
  'D09-each-section-claims-whole-deck-area': ['deck', 'burned'],
  'F02-post-or-rail-hit-heats-deck': ['dud', 'lantern13'],
  'F03-plinth-or-slab-hit-may-heat-wall': ['dud', 'lantern13', 'panels'],
  'F04-rim-hit-heats-wall-half-metre-back': ['dud', 'lantern13', 'panels'],
  'F07-rim-hit-picks-band-by-height': ['dud', 'lantern13', 'panels'],
  'H04-no-posts-rails-balusters': ['dud', 'lantern13', 'flame13'],
  'H06-every-stair-tread-full-height': ['lantern13', 'flame13'],
  'H08-no-floor-slabs': ['lantern13', 'lantern9', 'panels'],
  'G01-shapes-tested-as-bounding-boxes': ['panels', 'flame9', 'lantern9'],
  'T03-flame-end-height-always-drops': ['flame9', 'flame13', 'grazing'],
  'T04-lantern-volume-hit-also-asks-cottages': ['dud', 'panels'],
  'X03-corner-trim-uses-box-distance': ['flame9', 'flame13'],
  'P02-floor-patches-not-linked': ['census', 'speeds'],
  'P05-every-patch-area-four': ['burned', 'speeds'],
  'P10-ashland-debris-lands-at-zero': ['ashland'],
  'P11-any-collinear-edge-borders': ['census', 'links', 'speeds'],
  'P12-nearest-helper-picks-farthest': ['census', 'deck', 'speeds'],
  'P13-anchor-is-first-triangle': ['floors', 'speeds'],
  'P15-stair-foot-anywhere-on-lower-floor': ['census', 'speeds'],
  'M03-mutable-list-not-remembered': []
};
for (const extra of (process.env.R15_EXTRA ?? '').split(';').filter(Boolean)) { const [name, probes] = extra.split('='); PLAN[name] = probes.split(','); }
const filter = process.argv[2] ? new RegExp(process.argv[2]) : null;
const cache = new Map();
function run(probe, mutant) {
  const [file, ...args] = PROBES[probe];
  const env = {...process.env};
  delete env.TB_TREES; delete env.TB_PATCHES_ACTIVE; env.R04_TURNS = '0'; env.R18_TURNS = '0';
  if (mutant) { env.TB_PATCHES = JSON.stringify([mutant]); env.TB_EXTRA = JSON.stringify([mutant]); } else { delete env.TB_PATCHES; delete env.TB_EXTRA; }
  const result = spawnSync(process.execPath, ['--import', hook, here + file, ...args], {env, encoding: 'utf8', maxBuffer: 1 << 26});
  return (result.stdout + (result.status ? `\n[exit ${result.status}] ${result.stderr.split('\n').slice(0, 4).join(' | ')}` : '')).split('\n').map(line => line.replace(/\((HEAD|tip2) \d+s, tip2 \d+s wall\)/, '').trimEnd()).filter(Boolean);
}
for (const [name, probes] of Object.entries(PLAN)) {
  if (filter && !filter.test(name)) continue;
  if (!MUTANTS[name]) { console.log(`?? unknown mutant ${name}`); continue; }
  console.log(`\n### ${name}`);
  for (const probe of probes) {
    if (!cache.has(probe)) cache.set(probe, run(probe, null));
    const base = cache.get(probe), mutated = run(probe, MUTANTS[name]);
    const changed = [];
    for (let i = 0; i < Math.max(base.length, mutated.length); i++) if (base[i] !== mutated[i]) changed.push(i);
    console.log(`  probe ${PROBES[probe].join(' ')}: ${changed.length ? changed.length + ' of ' + base.length + ' output lines differ' : 'no difference'}`);
    for (const i of changed.slice(0, 6)) console.log(`      was: ${(base[i] ?? '(none)').trim().slice(0, 330)}\n      now: ${(mutated[i] ?? '(none)').trim().slice(0, 330)}`);
  }
}
