import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {diagnosticSnapshot, saveCamera} from './diagnostic-data.js';

if (!vm.SourceTextModule) throw Error('Run with node --experimental-vm-modules');
const sourceCommit = 'aca30cd910a326918b1599ce6665803cf64739e0', modules = new Map(), sourceHashes = {};
const raw = file => execFileSync('git', ['show', `${sourceCommit}:${file}`]);
function frozen(file) {
  if (!modules.has(file)) {const bytes = raw(file); sourceHashes[file] = createHash('sha256').update(bytes).digest('hex'); modules.set(file, new vm.SourceTextModule(bytes.toString('utf8'), {identifier: file}));}
  return modules.get(file);
}
const source = frozen('tools/fire-realism/scenarios.js');
await source.link((specifier, parent) => frozen(path.posix.normalize(path.posix.join(path.posix.dirname(parent.identifier), specifier)))); await source.evaluate();
const policy = frozen('tools/fire-realism/camera.js'); await policy.link(() => {throw Error('Unexpected camera dependency');}); await policy.evaluate();
const driver = raw('workbenches/fire-realism/driver.js').toString('utf8');
if (!driver.includes('new T.HemisphereLight(0xfff1d1,0x334852,2.3)') || !driver.includes('new T.DirectionalLight(0xffffff,2.5)')) throw Error('Frozen environment literals no longer match source');
sourceHashes['workbenches/fire-realism/driver.js'] = createHash('sha256').update(driver).digest('hex');
const backdropSources = {};
for (const file of ['src/art/world.js', 'src/art/materials.js', 'src/art/ground-field.js', 'src/art/resources.js', 'src/reuse/characters.js', 'src/reuse/bear.js']) {
  const pinned = raw(file), actualPath = file === 'src/art/ground-field.js' ? 'workbenches/art/fire-realism/control-08/native-underlay/ground-field.js' : file, current = fs.readFileSync(actualPath).toString('utf8').replaceAll('\r\n', '\n');
  if (pinned.toString('utf8') !== current) throw Error(`Diagnostic backdrop source differs: ${file}`);
  backdropSources[file] = createHash('sha256').update(pinned).digest('hex');
}
const viewport = {width: 1280, height: 800, pixelRatio: 1}, cameras = {};
for (const view of ['isometric', 'oblique']) {
  const camera = new T.OrthographicCamera(-10, 10, 10, -10, .1, 300);
  const policyRecord = policy.namespace.placeFireReviewCamera(T, camera, {scenario: 'match-contact', view, viewport});
  cameras[view] = {...saveCamera(camera), policy: policyRecord, matrixWorld: camera.matrixWorld.toArray(), projectionMatrix: camera.projectionMatrix.toArray()};
}
const simulation = source.namespace.createFireReviewSimulation({scenario: 'match-contact', seed: 1893, characterId: 'bear'}), snapshots = [];
try {for (let i = 1; i <= 120; i++) {simulation.advance(); if ([15, 30, 60, 120].includes(i)) snapshots.push({frameIndex: i, snapshot: simulation.snapshot()});}}
finally {simulation.dispose();}
const baseCells = snapshots[0].snapshot.cells, world = snapshots[0].snapshot.world;
const phases = snapshots.map(({frameIndex, snapshot}) => {
  if (JSON.stringify(snapshot.world) !== JSON.stringify(world)) throw Error('Frozen match world changed');
  const {cells, world: ignored, ...rest} = snapshot;
  return {frameIndex, snapshot: rest, cellChanges: cells.flatMap((cell, index) => JSON.stringify(cell) === JSON.stringify(baseCells[index]) ? [] : [[index, cell]])};
});
const artistCommit = '13ad95c2d131e3dab28e775c1d33c121ea50d5ed';
const artistManifestBytes = execFileSync('git', ['show', `${artistCommit}:assets/art/fire-realism/manifest.json`]);
const data = {version: 1, sourceCommit, sourceHashes, backdropSources, viewport, cameras, artistCommit,
  artistManifest: JSON.parse(artistManifestBytes), artistManifestSha256: createHash('sha256').update(artistManifestBytes).digest('hex'),
  environment: {clearColor: 0x35281e, hemi: {sky: 0xfff1d1, ground: 0x334852, intensity: 2.3}, sun: {color: 0xffffff, intensity: 2.5, position: [-8, 16, 6]}},
  world, baseCells, phases, adaptation: 'Lossless base-cells plus per-phase complete-cell patches. Actual old-engine source states, not a played fixture or quality/performance acceptance.'};
for (const item of snapshots) if (JSON.stringify(diagnosticSnapshot(data, item.frameIndex)) !== JSON.stringify({...item.snapshot, world: item.snapshot.world, cells: item.snapshot.cells})) {
  // Object insertion order is irrelevant; compare each authoritative field.
  const rebuilt = diagnosticSnapshot(data, item.frameIndex);
  for (const key of Object.keys(item.snapshot)) if (JSON.stringify(rebuilt[key]) !== JSON.stringify(item.snapshot[key])) throw Error(`Lossy source reconstruction: ${key}`);
}
fs.writeFileSync(new URL('./fixtures/frozen-match-diagnostic.json', import.meta.url), JSON.stringify(data) + '\n');
console.log(JSON.stringify({sourceCommit, modules: Object.keys(sourceHashes).length, cells: baseCells.length, phases: phases.map(p => ({frameIndex: p.frameIndex, world: p.snapshot.clocks.world, player: p.snapshot.player, burning: diagnosticSnapshot(data, p.frameIndex).cells.filter(c => c.phase === 'burning').length})), bytes: fs.statSync(new URL('./fixtures/frozen-match-diagnostic.json', import.meta.url)).size, webgl: false}, null, 2));
