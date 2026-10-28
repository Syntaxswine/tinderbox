import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const source = process.argv[process.argv.indexOf('--source') + 1];
if (!process.argv.includes('--source') || !source) throw Error('Usage: node tools/import-city.mjs --source PATH_TO_READ_ONLY_DONOR');
const pin = '30a3b8cae5f36bb0c1df3685b7fba16f701c2083', base = 'sites/tactical-animal/dist/aft/';
const vendor = 'vendor/farmyard-commando/' + pin + '/';
const modules = ['hybrid-geometry','clothing-weights','dog-motion','goat-worker','hen-motion','horse-graphic-paint','horse-grip-hand-data','horse-grip-hand','horse-light-model','horse-model-paint','horse-rifle','roof-mantle-equipment','worker-locomotion'];
const paths = [...modules.map(name => base + 'tactics/' + name + '.js'), ...['horse','goat'].map(name => base + 'tactics/' + name + '-10k-data.json'),
  ...['horse-worker','goat-worker'].map(name => base + 'assets/characters/lowpoly-proof/' + name + '-model-paint-v1.png'), ...['hybrid-surfaces/brick-factory-v1.png','hybrid-surfaces/wood-factory-v2.png','ground-concrete.png'].map(name => base + 'assets/environment/' + name)];
const read = p => execFileSync('git', ['-C', source, 'show', pin + ':' + p], {maxBuffer: 32 * 1024 * 1024});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ancestry = JSON.parse(read('sites/tactical-animal/aft-provenance.json'));
const records = paths.map(sourcePath => {
  const bytes = read(sourcePath), sha256 = hash(bytes), inherited = ancestry.files.find(file => base + file.path === sourcePath);
  if (!inherited || inherited.bytes !== bytes.length || inherited.sha256 !== sha256) throw Error('Inherited source mismatch: ' + sourcePath);
  const installedPath = vendor + sourcePath;
  if (fs.existsSync(installedPath) && hash(fs.readFileSync(installedPath)) !== sha256) throw Error('Refusing changed installed bytes: ' + installedPath);
  fs.mkdirSync(path.dirname(installedPath), {recursive: true}); fs.writeFileSync(installedPath, bytes);
  return {sourcePath, installedPath, sourceCommit: pin, inheritedSourceCommit: ancestry.sourceCommit, bytes: bytes.length, sha256,
    adaptations: [], license: 'Upstream game/art license not declared; user-directed project reuse; unresolved rights retained',
    ancestry: {manifest: 'sites/tactical-animal/aft-provenance.json', path: inherited.path, sha256: inherited.sha256}};
});
const recipeReferences = ['hybrid-geometry.js','hybrid-world.js','hybrid-room-art.js','hybrid-materials.js','climbable-roofs.js','animal-motion-catalog.js','animal-motion-paint.js','red-hat-model.js'].map(file => {
  const sourcePath = base + 'tactics/' + file, bytes = read(sourcePath);
  return {sourcePath, sourceCommit: pin, bytes: bytes.length, sha256: hash(bytes), imported: paths.includes(sourcePath)};
});
const manifest = {schemaVersion: 1, owner: 'coder', task: 'TB-008', sourceRepository: 'https://github.com/Syntaxswine/farmyard-commando.git',
  sourceCommit: pin, inheritedSourceCommit: ancestry.sourceCommit, files: records, recipeReferences,
  adapters: ['src/content/asset-scale.js', 'src/content/exterior-kit.js', 'src/reuse/walls.js', 'src/reuse/civilians.js'],
  notes: ['Raw bytes remain unchanged. Shared Three files are owned by engine.json.', 'Civilian adapter maps carry to neutral; no Red Hat, team gear, service caps or visible weapons.', 'Wall/opening construction places unchanged roomBoxes templates at native scale; roof forms reference EXPO-P02 plates53/97 as documented game adaptations.']};
fs.writeFileSync(vendor + 'provenance/city.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Imported ${records.length} pinned city files (${records.reduce((n, r) => n + r.bytes, 0)} bytes); all match inherited ancestry.`);