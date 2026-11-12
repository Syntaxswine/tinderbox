// Builds the reviewer's copies from the author's files, by exact text replacement (each must match once):
//   kernel-var.mjs  = ../kernel.mjs + rules.shuffle (seeded visiting order in the output and fuel phases) + rules.noWake (the round-4 fix off)
//   measure-var.mjs = ../measure.mjs with the kernel chosen by the KERNEL environment variable (default ../kernel.mjs)
import fs from 'node:fs';
import path from 'node:path';
const here = import.meta.dirname, read = f => fs.readFileSync(path.join(here, f), 'utf8');
const swap = (text, from, to) => { if (text.split(from).length !== 2) throw new Error('expected exactly one match of: ' + from); return text.replace(from, to); };
let k = read('../kernel.mjs');
k = swap(k, "const dt = rules.step, radiantTicks = Math.max(1, Math.round(rules.radiantEvery / dt));",
  "const dt = rules.step, radiantTicks = Math.max(1, Math.round(rules.radiantEvery / dt));\n  let seed = (rules.shuffle | 0) || 1; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;\n  const order = list => { if (!rules.shuffle) return list; for (let n = list.length - 1; n > 0; n--) { const m = Math.floor(rnd() * (n + 1)); [list[n], list[m]] = [list[m], list[n]]; } return list; };");
k = swap(k, "for (const tile of [...active]) for (const fuel of tile.fuels) if (fuel.lit) {", "for (const tile of order([...active])) for (const fuel of tile.fuels) if (fuel.lit) {");
k = swap(k, "for (const tile of [...active]) {\n      let alive", "for (const tile of order([...active])) {\n      let alive");
k = swap(k, "if (tile.facing && tile.heat > 1e-3) for", "if (!rules.noWake && tile.facing && tile.heat > 1e-3) for");
// rules.fadeAsleep: Rule 2's char fade applied for the time a tile spent asleep (the author's kernel freezes char while a tile sleeps)
k = swap(k, "if (!alive) { active.delete(tile); tile.out = 0; tile.radOut = 0; tile.heat = 0; }", "if (!alive) { active.delete(tile); tile.out = 0; tile.radOut = 0; tile.heat = 0; tile.sleptAt = time; }");
k = swap(k, "let alive = tile.heat > 1e-3 || tile.rad > 0 || tile.out > 0;", "let alive = tile.heat > 1e-3 || tile.rad > 0 || tile.out > 0;\n      if (rules.fadeAsleep && tile.sleptAt != null) for (const f of tile.fuels) if (!f.lit && f.char > 0) f.char = Math.max(0, f.char - (time - dt - tile.sleptAt) * rules.charFades);\n      tile.sleptAt = null;");
fs.writeFileSync(path.join(here, 'kernel-var.mjs'), k);
let s = read('../survey.mjs');
s = swap(s, "from './measure.mjs';", "from './measure-var.mjs';");
s = swap(s, "path.join(import.meta.dirname, outDir)", "path.join(import.meta.dirname, '..', outDir)");
fs.writeFileSync(path.join(here, 'r12-survey-var.mjs'), '// A copy of survey.mjs, run through measure-var.mjs (kernel chosen by KERNEL). Written by r00-make-var.mjs.\n' + s);
let m = read('../measure.mjs');
m = swap(m, "import {createWorld, DEFAULT_FUELS, PITCH, LAYER} from './kernel.mjs';", "const {createWorld, DEFAULT_FUELS, PITCH, LAYER} = await import(process.env.KERNEL ?? '../kernel.mjs');");
m = swap(m, "from './scene.mjs';", "from '../scene.mjs';");
fs.writeFileSync(path.join(here, 'measure-var.mjs'), m);
console.log('wrote kernel-var.mjs and measure-var.mjs');
