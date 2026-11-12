// What each mutant that SURVIVED the full test gate (r10) does to the game. A surviving mutant only counts against the
// tests if it changes behaviour, so each survivor is re-run here against an instrument that is not in the gate:
//   simulation survivors : the publication audit (r01) on scripts that reach the mutated line; reports mismatch kinds
//   art survivors        : a small headless replay through the shared cell reader, mutant against unmutated control
// Usage: node r11-survivor-behaviour.mjs [mutant-name ...]   (default: every survivor listed in results/r10-mutants.txt)
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {HEAD} from './lib.mjs';

if (process.env.TB_ART_CHILD) {
  // Child: runs under the hook with or without the mutant in TB_PATCHES.
  const T = await import(HEAD + 'runtime/three.js');
  const {createCellReader} = await import(HEAD + 'art/cell-publication.js');
  const {createGroundField} = await import(HEAD + 'art/ground-field.js');
  const {createStreetFirelight} = await import(HEAD + 'art/street-firelight.js');
  const frozen = items => Object.freeze(items.map(item => Object.freeze(item)));
  const cell = (id, x, y, extra) => ({id, x, y, size: .5, phase: 'cold', material: 'grass', heat: 0, intensity: 0, depositedFuel: 0, surfaceFuel: .08, ...extra});
  const world = {width: 1, height: 1, fireCellSize: .5};
  const base = [cell('a', .25, .25), cell('b', .75, .25), cell('c', .25, .75), cell('d', .75, .75)];
  if (process.env.TB_ART_CHILD === 'ground') {
    // The ground mask and another consumer share one reader. The other consumer sees generation B; the mask does not.
    const read = createCellReader(), field = createGroundField(T, read);
    const A = frozen(base.map(c => ({...c})));
    const B = Object.freeze([Object.freeze({...A[0], phase: 'burning', intensity: 1}), A[1], A[2], A[3]]);
    const C = Object.freeze([B[0], Object.freeze({...A[1], phase: 'heating', heat: .2}), A[2], A[3]]);
    field.update({world, cells: A}); read(B); field.update({world, cells: C});
    const data = Array.from(field.uniforms.field.value.image.data.subarray(0, 8)).map(v => +v.toFixed(3));
    console.log(`texels for cell a (burning in C) and b (heating in C): ${JSON.stringify(data)}  expected [0,0.75,0.27,1, 0,0.35,0,0]`);
  } else {
    // Same frozen cell list, cell size reported by the world changes while the cells carry no size of their own.
    const light = createStreetFirelight(T);
    const cells = frozen([{id: 'a', x: .25, y: .25, phase: 'burning', intensity: 1, depositedFuel: 0, surfaceFuel: .08, material: 'grass'}]);
    const player = {x: 0, y: 0};
    light.update({world: {...world, fireCellSize: .5}, player, cells}, new Map(), 0, []); const small = light.diagnostics().lights[0]?.intensity;
    light.update({world: {...world, fireCellSize: 1}, player, cells}, new Map(), 0, []); const large = light.diagnostics().lights[0]?.intensity;
    console.log(`terrain light intensity with 0.5 m cells ${small?.toFixed(3)}, then the same list with 1 m cells ${large?.toFixed(3)} (a real snapshot always carries cell.size, so the simulation cannot produce this)`);
  }
  process.exit(0);
}

const here = fileURLToPath(new URL('./', import.meta.url));
const {MUTANTS} = await import('./mutants.mjs');
const listed = process.argv.slice(2);
const survivors = listed.length ? listed : readFileSync(here + 'results/r10-mutants.txt', 'utf8').split('\n')
  .filter(line => line.includes('SURVIVED') && !line.startsWith('control-')).map(line => line.split(' | ')[0]);
// Which instrument reaches each mutated line.
const SIM_SCRIPTS = {default: ['lantern-on-siding', 'odd-grids', 'small-fixtures', 'catalogue-death-and-reset']};
const ART = {'A20-ground-texture-trusts-any-change-list': 'ground', 'A21-firelight-ignores-cell-size-change': 'light'};
const ELSEWHERE = {
  'A25-map-keeps-box-of-moved-cell': 'only differs when a cell keeps its list index and changes x or y; the simulation never moves a cell (r09: 29,800 real frames identical). Equivalent on real snapshots.',
  'B04-collapsed-section-still-takes-ground-heat': 'measured by r13-support-gate.mjs: the gate is the deciding check 0 times in a whole-street burn to total collapse.',
  'B05-collapsed-section-still-lights-ground': 'measured by r13-support-gate.mjs: the gate is the deciding check 0 times in a whole-street burn to total collapse.'
};
const node = (args, env) => spawnSync(process.execPath, args, {encoding: 'utf8', env: {...process.env, ...env}, maxBuffer: 1 << 26});
for (const name of survivors) {
  const spec = MUTANTS[name];
  if (!spec) { console.log(`== ${name}: not in the mutant table ==`); continue; }
  console.log(`\n== ${name} (${spec.file.split('/').slice(-2).join('/')}) ==`);
  if (ELSEWHERE[name]) { console.log('   ' + ELSEWHERE[name]); continue; }
  if (ART[name]) {
    for (const [label, patches] of [['mutant ', [spec]], ['control', []]]) {
      const out = node(['--import', new URL('hook.mjs', import.meta.url).href, here + 'r11-survivor-behaviour.mjs'], {TB_ART_CHILD: ART[name], TB_PATCHES: JSON.stringify(patches)});
      console.log(`   ${label}: ${(out.stdout + out.stderr).trim()}`);
    }
    continue;
  }
  const out = node([here + 'r01-publication-audit.mjs', ...(SIM_SCRIPTS[name] ?? SIM_SCRIPTS.default)], {TB_EXTRA: JSON.stringify([spec])});
  const text = out.stdout + out.stderr;
  const kinds = [...text.matchAll(/"([a-z.A-Z-]+)": \{\s*"count": (\d+),\s*"first": \[\s*"([^"]+)"/g)].map(m => `${m[1]} x${m[2]} (first: ${m[3]})`);
  console.log(kinds.length ? '   audit mismatches under the mutant:\n     ' + kinds.join('\n     ') : '   audit: no mismatch on ' + (SIM_SCRIPTS[name] ?? SIM_SCRIPTS.default).join(', ') + ' => equivalent on these scripts');
  console.log('   ' + text.trim().split('\n').at(-1));
}
