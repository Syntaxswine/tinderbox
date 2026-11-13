import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root = fs.realpathSync(process.cwd()), output = path.resolve(root, 'dist'), marker = '.tinderbox-build';
const intake = JSON.parse(fs.readFileSync(path.join(root, 'assets/art/neighborhood-intake.json'), 'utf8'));
const imported = new Set([...intake.runtimeFiles, ...(intake.supportFiles || [])].map(file => file.installedPath));
const cottages=JSON.parse(fs.readFileSync('docs/engineering/playable-cottage-pair/intake.json','utf8'));
for(const file of cottages.files){
  const bytes=fs.readFileSync(file.installedPath);
  if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Changed Ashland pair intake: '+file.installedPath);
  imported.add(file.installedPath);
}
const places=JSON.parse(fs.readFileSync('assets/art/places-intake.json','utf8'));
const landmarkFiles=new Set(places.publicFiles),landmarkDirectories=[...places.sources.map(source=>'assets/art/'+source.directory+'/'),'assets/art/exposition-new-york/','assets/art/exploration-access/','assets/art/medicine-pickups/'];
for(const file of places.files)imported.add(file.installedPath);
if(!places.accessSource?.commit)throw Error('Freeze the exact artist access intake before building playable places');
if(!places.medicineSource?.commit)throw Error('Freeze the exact artist medicine pickup presentation before building Catalogue Street');
for(const id of ['new-york','administration','horticulture']){
  const index='assets/art/place-scenes/'+id+'/index.json';if(!fs.existsSync(index))throw Error('Compile the frozen access/provider sections before building '+id);
  const scene=JSON.parse(fs.readFileSync(index));
  if(scene.version!==1||scene.placeId!==id||scene.diagnostic||scene.sourceAccess?.commit!==places.accessSource.commit||JSON.stringify(scene.sourcePins)!==JSON.stringify(places.sources))throw Error('Recompile mismatched or diagnostic place data before building '+id);
}
if (path.dirname(output) !== root || output === root) throw Error('Unsafe build destination');
if (fs.existsSync(output)) {
  if (fs.lstatSync(output).isSymbolicLink() || ![marker, '.tinderbox-diagnostic-build'].some(name => fs.existsSync(path.join(output, name)))) throw Error('Refusing to replace an unowned dist directory');
  if (fs.realpathSync(output) !== output) throw Error('Unexpected resolved output path');
  fs.rmSync(output, {recursive: true});
}
fs.mkdirSync(output);
// Explicit public distribution: no workbenches, evidence, helper records or docs.
for (const directory of ['src', 'assets', 'vendor']) fs.cpSync(path.join(root, directory), path.join(output, directory), {recursive: true, dereference: false,
  filter:source => {
    if(path.basename(source).startsWith('.'))return false;
    const relative=path.relative(root,source).split(path.sep).join('/');
    if(landmarkDirectories.some(directory=>relative.startsWith(directory))&&!fs.statSync(source).isDirectory())return landmarkFiles.has(relative);
    return true;
  }});
// The selectable Catalogue adapter reuses this bounded runtime closure. Do not
// publish workbench HTML, recorders, replays, evidence or unrelated source data.
const moduleRuntimeFiles=new Set(),runtimeSeen=new Set(),runtimeImports=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g;
function copyRuntime(relative){
  const source=path.resolve(root,relative);if(!source.startsWith(root+path.sep)||!fs.existsSync(source)||fs.lstatSync(source).isSymbolicLink())throw Error('Missing or unsafe module runtime '+relative);
  if(runtimeSeen.has(source))return;runtimeSeen.add(source);
  const targetRelative=path.relative(root,source).split(path.sep).join('/');
  if(!/^(?:src|assets|vendor)\//.test(targetRelative)){
    if(!/^(?:workbenches\/(?:furnished-house|bell-and-alder-sandbox|catalogue-modular)\/|workbenches\/bell-and-alder-closing\/(?:visibility|smoke)\.js$|art\/source\/(?:furnished-house|bell-and-alder-sandbox|bell-and-alder-closing|catalogue-modular)\/)/.test(targetRelative)||! /\.(?:js|json)$/.test(targetRelative))throw Error('Unapproved module runtime path '+targetRelative);
    const destination=path.join(output,targetRelative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);moduleRuntimeFiles.add(targetRelative);
  }
  if(!source.endsWith('.js')||targetRelative.startsWith('vendor/'))return;
  for(const match of fs.readFileSync(source,'utf8').matchAll(runtimeImports))copyRuntime(path.relative(root,path.resolve(path.dirname(source),match[1].split(/[?#]/)[0])));
}
for(const entry of ['src/simulation/catalogue-thermal.js','src/content/catalogue-modules.js','workbenches/catalogue-modular/art.js'])copyRuntime(entry);
const moduleManifest='workbenches/catalogue-modular/scene-data.json';copyRuntime(moduleManifest);
for(const instance of JSON.parse(fs.readFileSync(moduleManifest)).instances)copyRuntime(path.join(path.dirname(moduleManifest),instance.source));
fs.copyFileSync(path.join(root, 'index.html'), path.join(output, 'index.html'));
fs.writeFileSync(path.join(output, marker), 'Generated by Tinderbox tools/build.mjs\n');
fs.writeFileSync(path.join(output, '.nojekyll'), '');
function inventory(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw Error('Public distribution cannot contain symbolic links');
    if (entry.isDirectory()) return inventory(file);
    const relative = path.relative(output,file).split(path.sep).join('/');
    let bytes = fs.readFileSync(file);
    // Git checkouts use different line endings on Windows and Linux. Canonicalize
    // our packaged text so a reviewed local artifact matches CI; preserve vendor bytes.
    if (!relative.startsWith('vendor/') && !imported.has(relative) && /\.(?:html|js|css|json|svg)$/.test(relative)) {
      const canonical = Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
      if (!canonical.equals(bytes)) fs.writeFileSync(file,canonical);
      bytes = canonical;
    }
    return [{path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}];
  });
}
const files = inventory(output);
fs.writeFileSync(path.join(output, 'build-manifest.json'), JSON.stringify({game:'Tinderbox',milestone:'23-catalogue-modular-experiment',experimental:{backend:'catalogue-trial',selection:'?catalogue=modules',legacyControl:true,productionAccepted:false},moduleRuntimeFiles:[...moduleRuntimeFiles].sort(),files},null,2)+'\n');
console.log(`Built playable Tinderbox in dist/: ${files.length} files, ${files.reduce((n,file)=>n+file.bytes,0)} bytes. All resource URLs are relative to the project path.`);
