// r10: run the test gate against each in-memory mutant of the code added since 26931d9.
// "The gate" here is what tools/check.mjs executes after its static checks: `node --test <every *.test.(m)js>`
// and then `node workbenches/art/check-art.mjs`. The static syntax, import and provenance checks read bytes from
// disk and cannot see an in-memory patch, so they are skipped.
// A mutant is KILLED when either command exits non-zero; it SURVIVES when both pass.
// Run from the worktree root: node docs/reviews/evidence/hostile-review-round-3/reviewer/r10-mutants.mjs [name filter] [parallel=3]
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MUTANTS} from './mutants.mjs';

const root = process.cwd(), filter = process.argv[2] && process.argv[2] !== '-' ? new RegExp(process.argv[2]) : null, parallel = +process.argv[3] || 3;
const files = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const tests = files('tests').filter(p => /\.test\.(?:m?js)$/.test(p));
const hook = new URL('hook.mjs', import.meta.url).href;
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'results', 'r10-mutants.txt');

// Refuse a mutant whose patch site is missing or ambiguous before spending a gate run on it.
for (const [name, spec] of Object.entries(MUTANTS)) {
  const file = path.join(root, spec.file.replace(/^tinderbox\//, '')), source = fs.readFileSync(file, 'utf8');
  const count = source.split(spec.find).length - 1;
  if (count !== 1) throw Error(`${name}: patch site occurs ${count} times in ${spec.file}`);
}
function exec(args, env) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, args, {cwd: root, env, stdio: ['ignore', 'pipe', 'pipe']});
    let text = ''; child.stdout.on('data', d => text += d); child.stderr.on('data', d => text += d);
    child.on('close', code => resolve({code, text}));
  });
}
async function gate(name, spec) {
  const env = {...process.env, NODE_OPTIONS: `--import ${hook}`, TB_PATCHES: JSON.stringify([spec])};
  const t0 = Date.now();
  const a = await exec(['--test', '--test-reporter=tap', ...tests], env);
  const fails = [...a.text.matchAll(/^\s*not ok \d+ - (.*)$/gm)].map(m => m[1]).filter(n => !/\.test\.m?js$/.test(n));
  const counts = Object.fromEntries([...a.text.matchAll(/^# (pass|fail|cancelled) (\d+)$/gm)].map(m => [m[1], +m[2]]));
  let b = {code: 0, text: ''};
  if (a.code === 0) b = await exec(['workbenches/art/check-art.mjs'], env);
  const killed = a.code !== 0 || b.code !== 0;
  const line = `${killed ? 'KILLED  ' : 'SURVIVED'} ${name.padEnd(46)} ${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s tests pass=${counts.pass ?? '?'} fail=${counts.fail ?? '?'}` +
    (killed ? `  by: ${a.code !== 0 ? (fails.slice(0, 3).join(' | ') || 'test process error') + (fails.length > 3 ? ` (+${fails.length - 3} more)` : '') : 'art check'}` : '');
  fs.appendFileSync(out, line + '\n');
  console.log(line);
  return {name, killed};
}
const queue = Object.entries(MUTANTS).filter(([name]) => !filter || filter.test(name));
fs.appendFileSync(out, `# run ${new Date().toISOString()} filter=${filter?.source ?? 'all'} parallel=${parallel} tests=${tests.length} files\n`);
const results = [];
await Promise.all(Array.from({length: parallel}, async () => {
  for (let job; (job = queue.shift());) results.push(await gate(...job));
}));
const killed = results.filter(x => x.killed).length;
const summary = `# ${results.length} mutants: ${killed} killed, ${results.length - killed} survived: ${results.filter(x => !x.killed).map(x => x.name).join(', ')}`;
fs.appendFileSync(out, summary + '\n'); console.log(summary);
