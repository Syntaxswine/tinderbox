// Reproducible, read-only donor extraction. Run with an explicit donor checkout.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const donor = process.argv[2];
if (!donor) throw Error('Usage: node workbenches/ui/import-ui.mjs <read-only-donor-checkout>');
const revision = '30a3b8cae5f36bb0c1df3685b7fba16f701c2083';
const sourceRoot = 'sites/tactical-animal/dist/';
const files = ['assets/ui/industrial-switches/switch-skins-v2.webp', 'assets/ui/industrial-switches/map-frame-v1.webp', 'assets/ui/industrial-switches/symbols.svg', 'assets/ui/industrial-switches/manifest.json', 'industrial-switches.css', 'map-frame.css'];
const vendorRoot = 'vendor/farmyard-commando/' + revision + '/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const generation = JSON.parse(execFileSync('git', ['-C', donor, 'show', revision + ':' + sourceRoot + files[3]], {maxBuffer: 4e6}));
const entries = files.map(file => {
  const sourcePath = sourceRoot + file;
  const bytes = execFileSync('git', ['-C', donor, 'show', revision + ':' + sourcePath], {maxBuffer: 8e6});
  const installedPath = vendorRoot + sourcePath;
  mkdirSync(path.dirname(path.join(root, installedPath)), {recursive: true});
  writeFileSync(path.join(root, installedPath), bytes);
  const dependencies = file === 'industrial-switches.css' ? [sourceRoot + files[0]] : file === 'map-frame.css' ? [sourceRoot + files[1]] : [];
  const expected = file === files[0] ? generation.image : file === files[1] ? generation.mapFrame : null;
  if (expected && (hash(bytes) !== expected.sha256 || bytes.length !== expected.bytes)) throw Error('Generation-manifest mismatch: ' + sourcePath);
  return {sourcePath, installedPath, sourceRevision: revision, sha256: hash(bytes), bytes: bytes.length,
    installedSha256: hash(readFileSync(path.join(root, installedPath))), dependencies,
    ancestry: file.endsWith('symbols.svg') ? {sourceRevision: generation.symbols.sourceRevision, sourcePath: generation.symbols.sourcePath, note: 'M includes later symbols; these bytes are from the approved M pin.'} : {source: 'Farmyard project-authored UI', generationManifest: sourceRoot + files[3]},
    notices: 'No per-file license header; original comments/metadata retained.',
    adaptations: 'None to this upstream copy. Tinderbox overrides size, layout and labels in src/ui/styles.css.'};
});
const inventory = {schemaVersion: 1, task: 'TB-006', sourceRepository: 'https://github.com/Syntaxswine/farmyard-commando.git', sourceRevision: revision,
  extraction: 'git show from explicit pinned Git objects; no donor checkout writes or builds',
  rightsStatus: 'User-authorized reuse; no general Farmyard/AFT code or art license was found. Third-party rights remain unresolved for architect review.',
  sourceMetadata: 'Generation prompts, atlas cells, hashes and symbol ancestry preserved in the imported manifest.json.',
  runtimeDependencies: 'Both CSS files retain their original relative URLs; all resolved assets are installed here. No donor runtime code, external fonts or external network requests.',
  adapters: ['src/ui/index.js', 'src/ui/model.js', 'src/ui/styles.css'],
  originalTinderboxArt: {path: 'assets/art/ui/control-symbols.svg', note: 'Original editable 32-unit vector tool/drug/menu symbols, not donor pixels.'},
  files: entries};
const output = path.join(root, vendorRoot, 'provenance/ui.json');
mkdirSync(path.dirname(output), {recursive: true});
writeFileSync(output, JSON.stringify(inventory, null, 2) + '\n');
console.log('Imported and hashed ' + entries.length + ' pinned UI files; both raster hashes match generation metadata.');
