// Finite offline source-fixture capture. Reads exact immutable Git objects;
// creates no renderer/server and never changes simulation or another checkout.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

if (!vm.SourceTextModule) throw Error('Run with node --experimental-vm-modules');
const sourceCommit = execFileSync('git', ['rev-parse', 'aca30cd910a326918b1599ce6665803cf64739e0^{commit}'], {encoding: 'utf8'}).trim();
const modules = new Map(), sourceHashes = {};
function frozen(file) {
  if (!modules.has(file)) {
    const raw = execFileSync('git', ['show', `${sourceCommit}:${file}`]);
    sourceHashes[file] = createHash('sha256').update(raw).digest('hex');
    modules.set(file, new vm.SourceTextModule(raw.toString('utf8'), {identifier: file}));
  }
  return modules.get(file);
}
const source = frozen('tools/fire-realism/scenarios.js');
await source.link((specifier, parent) => {
  if (!specifier.startsWith('.')) throw Error(`Unexpected nonrelative source dependency: ${specifier}`);
  return frozen(path.posix.normalize(path.posix.join(path.posix.dirname(parent.identifier), specifier)));
});
await source.evaluate();
const fixtures = [];
for (const scenario of ['match-contact', 'gasoline-front', 'gasoline-front-powder']) {
  const simulation = source.namespace.createFireReviewSimulation({scenario, seed: 1893, characterId: 'bear'});
  try {
    for (let frame = 0; frame < 60; frame++) simulation.advance();
    const snapshot = simulation.snapshot();
    fixtures.push({scenario, frameIndex: simulation.frameIndex, worldTime: snapshot.clocks.world, playerTime: snapshot.clocks.player,
      tick: snapshot.tick, cells: snapshot.cells.filter(c => c.phase === 'burning'), clocks: snapshot.clocks,
      adaptation: 'Only current authoritative burning cells retained for an offline art-source test; not a played capture or new simulation.'});
  } finally {simulation.dispose();}
}
const target = new URL('./fixtures/edge-source-snapshots.json', import.meta.url);
fs.mkdirSync(new URL('./fixtures/', import.meta.url), {recursive: true});
fs.writeFileSync(target, JSON.stringify({version: 1, sourceCommit, sourceHashes, frames: 60, fixedStep: '1/60 real second', fixtures}, null, 2) + '\n');
console.log(JSON.stringify({sourceCommit, sources: Object.keys(sourceHashes).length, fixtures: fixtures.map(f => ({scenario: f.scenario, burningCells: f.cells.length, worldTime: f.worldTime, playerTime: f.playerTime})), visualEvidence: false}, null, 2));
