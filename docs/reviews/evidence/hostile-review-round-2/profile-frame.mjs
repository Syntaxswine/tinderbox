// Where the per-frame CPU goes on Catalogue Street. Uses V8's sampling profiler in-process
// and prints self-time shares, which stay meaningful on a busy host (they are ratios).
//   node docs/reviews/evidence/hostile-review-round-1/profile-frame.mjs
import {Session} from 'node:inspector/promises';
import {createSimulation, street, press, table, round, STEP} from './lib.mjs';

async function profile(label, work) {
  const session = new Session(); session.connect();
  await session.post('Profiler.enable');
  await session.post('Profiler.setSamplingInterval', {interval: 200});
  await session.post('Profiler.start');
  work();
  const {profile} = await session.post('Profiler.stop');
  session.disconnect();
  const self = new Map(); let total = 0;
  for (const node of profile.nodes) {
    const {functionName, url, lineNumber} = node.callFrame;
    if (functionName === '(idle)' || functionName === '(program)' && !url) continue;
    const file = url.replace(/^.*\/(src|docs)\//, '$1/');
    const key = (functionName || '(anonymous)') + '  ' + (file ? file + ':' + (lineNumber + 1) : '[native]');
    self.set(key, (self.get(key) ?? 0) + node.hitCount); total += node.hitCount;
  }
  const rows = [...self].sort((a, b) => b[1] - a[1]).slice(0, 14)
    .map(([where, hits]) => ({'self %': round(100 * hits / total, 1), where}));
  console.log('\n' + label + '  (' + total + ' samples)');
  console.log(table(rows, ['self %', 'where']));
}

{
  const sim = createSimulation({scenario: street({player: {x: 30, y: 14}}), seed: 1893});
  for (let i = 0; i < 200; i++) sim.advance(STEP);
  await profile('IDLE street: 1500 frames of advance(1/60) with nothing lit', () => { for (let i = 0; i < 1500; i++) sim.advance(STEP); });
  sim.dispose();
}
{
  const sim = createSimulation({scenario: street({player: {x: 30, y: 14}}), seed: 1893});
  for (let i = 0; i < 200; i++) sim.advance(STEP);
  press(sim, 30.8, 14);
  await profile('LAWN FIRE: the first 24 world seconds after one match (1440 frames)', () => { for (let i = 0; i < 1440; i++) sim.advance(STEP); });
  sim.dispose();
}
