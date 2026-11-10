// Source mutants of the NEW code from both fixes, run in memory against every test file the gate runs
// (node tools/check.mjs runs `node --test` over tests/**/*.test.{js,mjs}; its syntax, provenance and art-manifest
// steps do not execute the mutated code and are not repeated here). The checkout is never edited.
// Usage: node r10-mutants.mjs [--jobs N] [name ...]      (no names = all)
import {spawn} from 'node:child_process';
import {readdirSync, readFileSync, writeFileSync, appendFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = fileURLToPath(new URL('../../../../../', import.meta.url)).replace(/[\\/]$/, '');
import {MUTANTS} from './mutants.mjs';

const args = process.argv.slice(2);
const jobs = args.includes('--jobs') ? Number(args.splice(args.indexOf('--jobs'), 2)[1]) : 3;
const names = args.length ? args : Object.keys(MUTANTS);
const files = ['tests/simulation', 'tests/integration', 'tests/ui', 'tests/content'].flatMap(dir => {
  try { return readdirSync(path.join(repo, dir)).filter(name => /\.test\.(?:m?js)$/.test(name)).map(name => dir + '/' + name); } catch { return []; }
});
for (const name of names) {
  const spec = MUTANTS[name];
  if (!spec) throw Error('Unknown mutant ' + name);
  const source = readFileSync(path.join(repo, spec.file.replace('tinderbox/', '')), 'utf8');
  const count = source.split(spec.find).length - 1;
  if (count !== 1) throw Error(`${name}: site occurs ${count} times`);
}
mkdirSync(path.join(here, 'results', 'mutants'), {recursive: true});
const summary = path.join(here, 'results', 'r10-mutants.txt');
function run(name) {
  return new Promise(resolve => {
    const started = Date.now(), chunks = [];
    const child = spawn(process.execPath, ['--import', new URL('hook.mjs', import.meta.url).href, '--test', '--test-concurrency=4', '--test-reporter=tap', ...files],
      {cwd: repo, env: {...process.env, TB_PATCHES: JSON.stringify([MUTANTS[name]])}});
    child.stdout.on('data', d => chunks.push(d)); child.stderr.on('data', d => chunks.push(d));
    child.on('close', status => {
      const out = Buffer.concat(chunks).toString();
      writeFileSync(path.join(here, 'results', 'mutants', name + '.tap'), out);
      const number = key => Number(out.match(new RegExp('^# ' + key + ' (\\d+)', 'm'))?.[1] ?? NaN);
      const failed = [...out.matchAll(/^not ok \d+ - (.+)$/gm)].map(m => m[1]);
      const line = `${name} | tests ${number('tests')} pass ${number('pass')} fail ${number('fail')} | exit ${status} | ${Math.round((Date.now() - started) / 1000)} s | ` +
        (failed.length ? 'KILLED by: ' + failed.slice(0, 3).join(' ;; ') : status === 0 ? 'SURVIVED' : 'ERROR (no failing test parsed)');
      appendFileSync(summary, line + '\n'); console.log(line); resolve();
    });
  });
}
const queue = [...names];
await Promise.all(Array.from({length: jobs}, async () => { while (queue.length) await run(queue.shift()); }));
