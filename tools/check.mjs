import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root = process.cwd();
function files(directory) { return fs.existsSync(directory) ? fs.readdirSync(directory, {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(path.join(directory, e.name)) : [path.join(directory, e.name)]) : []; }
const own = [...files('src'), ...files('workbenches'), ...files('tools'), ...files('tests')].filter(p => /\.(?:m?js)$/.test(p));
for (const file of own) execFileSync(process.execPath, ['--check', file]);
const visited = new Set(), imports = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g;
function visit(file) {
  file = path.resolve(file); if (visited.has(file)) return; visited.add(file);
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(imports)) {
    const dependency = path.resolve(path.dirname(file), match[1].split(/[?#]/)[0]);
    if (!dependency.startsWith(root + path.sep) || !fs.existsSync(dependency)) throw Error(`Unresolved local import ${file}: ${match[1]}`);
    if (dependency.endsWith('.js')) visit(dependency);
  }
}
for (const file of own.filter(p => !p.startsWith('tools'))) visit(file);
for (const file of ['index.html', ...files('workbenches'), ...files('tests')].filter(p => p.endsWith('.html'))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    if (/^(?:https?:|data:)/.test(match[1])) continue;
    const target = path.resolve(path.dirname(file), match[1]);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) throw Error('Missing workbench resource: ' + match[1]);
  }
}
const vendor = 'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083';
for (const name of ['engine', 'code', 'art', 'ui', 'city', 'native-units']) {
  const manifest = JSON.parse(fs.readFileSync(`${vendor}/provenance/${name}.json`, 'utf8'));
  for (const record of manifest.files) {
    const bytes = fs.readFileSync(record.installedPath);
    if (bytes.length !== record.bytes || createHash('sha256').update(bytes).digest('hex') !== record.sha256) throw Error('Changed vendor bytes: ' + record.installedPath);
  }
}
const housingIntake = JSON.parse(fs.readFileSync('assets/art/neighborhood-intake.json', 'utf8'));
for (const file of [...housingIntake.runtimeFiles, ...(housingIntake.supportFiles || []), ...housingIntake.evidenceFiles, ...housingIntake.derivedFiles]) {
  const bytes = fs.readFileSync(file.installedPath);
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw Error('Changed housing intake bytes: ' + file.installedPath);
}
const bearManifest=JSON.parse(fs.readFileSync('vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/provenance/bear.json','utf8'));
const placeIntake=JSON.parse(fs.readFileSync('assets/art/places-intake.json','utf8'));
for(const file of placeIntake.files){const bytes=fs.readFileSync(file.installedPath);if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Changed frozen landmark/checker bytes: '+file.installedPath);}
for(const file of [...bearManifest.files,...bearManifest.adaptations]){const bytes=fs.readFileSync(file.installedPath);if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Changed bear intake bytes: '+file.installedPath);}
const facade=path.resolve(bearManifest.adaptations.find(a=>a.kind==='three-facade').installedPath);
const three = [...visited].filter(p => /three\.(?:module|core)\.js$/.test(p)&&p!==facade);
if (three.length !== 2 || three.some(p => !p.includes(path.normalize(vendor + '/sites/tactical-animal/dist/aft/tactics/vendor/')))) throw Error('Expected exactly one shared Three implementation pair');
const [alias,shared]=await Promise.all([import(pathToFileURL(facade)),import(pathToFileURL(path.resolve('src/runtime/three.js')))]);
if(Object.keys(shared).some(key=>shared[key]!==alias[key]))throw Error('Bear facade must re-export the same shared Three objects');
const sample = JSON.parse(fs.readFileSync('workbenches/simulation/example-snapshot.json', 'utf8'));
if (sample.version !== 1 || !sample.player?.inventory || !sample.cells.length || !sample.world.tiles.length) throw Error('Incomplete example snapshot');
console.log(`${own.length} own scripts pass syntax; ${visited.size} static modules resolve; one shared Three pair and provenance pass.`);
execFileSync(process.execPath, ['--test', ...files('tests').filter(p => /\.test\.(?:m?js)$/.test(p))], {stdio: 'inherit'});
execFileSync(process.execPath, ['workbenches/art/check-art.mjs'], {stdio:'inherit'});
