// Fix A against the round-1 tree: run the same input script on two source trees and compare the COMPLETE serialized
// snapshot of every advance and every extra snapshot (md5 of JSON.stringify; a second digest without cells/tiles/obstacles
// localises a difference). old = 4fc97bb (before both fixes), m5 = 720f7b6 (snapshot fix only), head = this tree.
// old vs m5 isolates Fix A: fire outcomes are the same, so every byte must match.
// Usage: node r02-cross-tree-differential.mjs <old|m5|head> <old|m5|head> [script-name ...]
import {createHash} from 'node:crypto';
import {load, OLD, M5, HEAD, r} from './lib.mjs';
const {SCRIPTS} = await import('./scripts.mjs');
const roots = {old: OLD, m5: M5, head: HEAD};
const [a = 'old', b = 'm5', ...rest] = process.argv.slice(2);
const names = rest.length ? rest : Object.keys(SCRIPTS);
const md5 = text => createHash('md5').update(text).digest('base64');

async function record(tree, name) {
  const api = await load(roots[tree]), frames = [];
  const digest = (s, how) => {
    const {cells, world: {tiles, obstacles, ...world}, ...other} = s;
    frames.push({how, tick: s.tick, full: md5(JSON.stringify(s)), rest: md5(JSON.stringify({world, other})),
      cells: md5(JSON.stringify(cells)), obstacles: md5(JSON.stringify(obstacles)), tiles: md5(JSON.stringify(tiles)),
      diagnostics: JSON.stringify(s.diagnostics.fuel) + ' burning ' + s.diagnostics.burningCells + ' frontX ' + s.diagnostics.frontX});
    return s;
  };
  SCRIPTS[name](api, (sim, dt) => digest(sim.advance(dt), 'advance'), sim => digest(sim.snapshot(), 'snapshot'));
  return frames;
}
let different = 0;
for (const name of names) {
  const started = Date.now(), fa = await record(a, name), fb = await record(b, name);
  let first = -1;
  for (let i = 0; i < Math.max(fa.length, fb.length); i++) if (fa[i]?.full !== fb[i]?.full) { first = i; break; }
  console.log(`== ${name}: ${a} ${fa.length} snapshots, ${b} ${fb.length} snapshots, ${r((Date.now() - started) / 1000, 1)} s ==`);
  if (first < 0) console.log('   every complete snapshot is byte-identical');
  else {
    different++;
    const x = fa[first], y = fb[first], parts = ['rest', 'cells', 'obstacles', 'tiles'].filter(k => x?.[k] !== y?.[k]);
    const count = fa.filter((f, i) => f.full !== fb[i]?.full).length;
    console.log(`   FIRST DIFFERENCE at snapshot #${first} (${x?.how} tick ${x?.tick}); parts that differ: ${parts.join(', ')}; ${count} of ${fa.length} snapshots differ`);
    console.log(`   ${a}: ${x?.diagnostics}\n   ${b}: ${y?.diagnostics}`);
  }
}
console.log(different ? `\nRESULT: ${different} script(s) differ between ${a} and ${b}` : `\nRESULT: ${a} and ${b} publish identical snapshots for every script run`);
