
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const manifestPath='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/art.json';
const manifest=JSON.parse(fs.readFileSync(path.join(root,manifestPath)));
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
assert(manifest.files.length===5,'Expected the five selected raw imports');
for(const file of manifest.files){
  const bytes=fs.readFileSync(path.join(root,file.installedPath)),hash=createHash('sha256').update(bytes).digest('hex');
  assert(hash===file.sha256&&bytes.length===file.bytes,'Import byte mismatch '+file.installedPath);
  assert(hash===file.ancestry.sha256&&file.adaptations.length===0,'Unchanged-source ancestry mismatch');
}
const code=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.(m?js)$/.test(file))code.push(file);}}
walk(path.join(root,'src/art'));walk(path.join(root,'workbenches/art'));
for(const file of code){
  const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert(check.status===0,'Syntax failure '+file+'\n'+check.stderr);
  const text=fs.readFileSync(file,'utf8');
  if(file.includes(path.join('src','art'))){
    assert(!/(?:from|import)\s*['"][^'"]*three[^'"]*['"]/.test(text),'Production art imported a second THREE instance');
    assert(!/Tactical Animal|C:\\|https?:\/\//.test(text),'External runtime dependency in '+file);
  }
  for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
    assert(fs.existsSync(path.resolve(path.dirname(file),match[1])),'Missing relative import '+file+' -> '+match[1]);
  }
}
console.log('PASS: '+manifest.files.length+' byte-preserved imports; '+code.length+' syntax/dependency checks; injected shared THREE.');

const authoredPath='assets/art/exposition-skins-v1/manifest.json';
const authored=JSON.parse(fs.readFileSync(path.join(root,authoredPath),'utf8'));
assert(authored.assets.length===7&&authored.appearanceSet==='exposition-v1','Expected the bounded Exposition skin set');
const generation=JSON.parse(fs.readFileSync(path.join(root,authored.generationRecord),'utf8').replace(/^\uFEFF/,''));
for(const asset of authored.assets){
  assert(asset.path.startsWith('assets/art/exposition-skins-v1/'),'Authored art must remain separate from vendor');
  const bytes=fs.readFileSync(path.join(root,asset.path)),digest=createHash('sha256').update(bytes).digest('hex');
  assert(digest===asset.sha256&&bytes.length===asset.bytes,'Authored skin bytes changed '+asset.path);
  assert(bytes.readUInt32BE(16)===asset.width&&bytes.readUInt32BE(20)===asset.height,'Skin dimensions changed '+asset.id);
  assert(generation.assets.some(a=>a.id===asset.id&&a.file===asset.path&&a.prompt),'Missing exact built-in generation prompt');
  if(asset.source){
    const source=fs.readFileSync(path.join(root,asset.source.path));
    assert(createHash('sha256').update(source).digest('hex')===asset.source.sha256,'Original paint source changed');
    assert(asset.width===source.readUInt32BE(16)&&asset.height===source.readUInt32BE(20),'Projected paint layout dimensions changed');
  }
}
for(const adapted of manifest.adaptations)assert(createHash('sha256').update(fs.readFileSync(path.join(root,adapted.path))).digest('hex')===adapted.sha256,'Art adapter fingerprint mismatch '+adapted.path);
console.log('PASS: 7 authored skins, exact prompts/source records and '+manifest.adaptations.length+' adapter fingerprints.');

const named=JSON.parse(fs.readFileSync(path.join(root,'assets/art/exposition-buildings-v1/manifest.json'),'utf8'));
const namedPrompts=JSON.parse(fs.readFileSync(path.join(root,named.generationRecord),'utf8'));
assert(named.assets.length===6&&named.profiles.length===3,'Expected three named facade pairs');
for(const asset of named.assets){
  assert(asset.path.startsWith('assets/art/exposition-buildings-v1/'),'Named facades must stay separate from vendor');
  const bytes=fs.readFileSync(path.join(root,asset.path));
  assert(createHash('sha256').update(bytes).digest('hex')===asset.sha256&&bytes.length===asset.bytes,'Named facade byte mismatch');
  assert(bytes.readUInt32BE(16)===asset.width&&bytes.readUInt32BE(20)===asset.height,'Named facade dimensions mismatch');
  assert(namedPrompts.assets.some(p=>p.id===asset.id&&p.prompt&&p.referenceImages.length),'Named facade missing prompt/primary reference');
}
console.log('PASS: 6 named-building textures, 3 facade profiles and exact primary-reference/prompt bindings.');

const expanded=JSON.parse(fs.readFileSync(path.join(root,'assets/art/exposition-buildings-v2/manifest.json'),'utf8'));
const expandedPrompts=JSON.parse(fs.readFileSync(path.join(root,expanded.generationRecord),'utf8'));
assert(expanded.assets.length===6&&expanded.profiles.length===3,'Expected three additional facade pairs');
for(const asset of expanded.assets){
  const bytes=fs.readFileSync(path.join(root,asset.path));
  assert(asset.path.startsWith('assets/art/exposition-buildings-v2/'),'Expanded art must stay outside vendor');
  assert(createHash('sha256').update(bytes).digest('hex')===asset.sha256&&bytes.length===asset.bytes,'Expanded facade bytes changed '+asset.id);
  assert(bytes.readUInt32BE(16)===asset.width&&bytes.readUInt32BE(20)===asset.height,'Expanded facade dimensions changed');
  const prompt=expandedPrompts.assets.find(p=>p.id===asset.id);
  assert(prompt?.prompt&&prompt.referenceImages.length===2,'Missing exact prompt and primary/style references');
  for(const ref of prompt.referenceImages)if(ref.path.startsWith('assets/'))assert(createHash('sha256').update(fs.readFileSync(path.join(root,ref.path))).digest('hex')===ref.sha256,'Generated style reference changed');
}
assert(expanded.nativeScale.wallHeight===2&&expanded.nativeScale.wallThickness===.16&&expanded.nativeScale.doorWidth===1&&expanded.nativeScale.doorHeight===1.65&&expanded.nativeScale.floorSpacing===2.12,'Native source proportion record changed');
console.log('PASS: 6 additional facade textures, 3 repeating profiles, exact prompts and native-scale provenance.');

const nativePack=JSON.parse(fs.readFileSync(path.join(root,'assets/art/exposition-buildings-v3/manifest.json'),'utf8'));
const nativePrompts=JSON.parse(fs.readFileSync(path.join(root,nativePack.generationRecord),'utf8'));
const {ASSET_SCALE}=await import('../../src/content/asset-scale.js');
const {BUILDING_FACADES,BUILDING_FACADE_ASSETS}=await import('../../src/art/building-facades.js');
assert(nativePack.assets.length===6&&nativePack.profiles.length===3,'Expected three native Farmyard facade pairs');
for(const [key,value]of Object.entries(nativePack.nativeScale))assert(value===ASSET_SCALE[key],'Farmyard native contract differs: '+key);
assert(createHash('sha256').update(fs.readFileSync(path.join(root,nativePack.geometryContract.path))).digest('hex')===nativePack.geometryContract.sha256,'Native source template fingerprint changed');
for(const asset of nativePack.assets){
 const bytes=fs.readFileSync(path.join(root,asset.path));
 assert(createHash('sha256').update(bytes).digest('hex')===asset.sha256&&bytes.length===asset.bytes,'Native skin byte mismatch '+asset.id);
 assert(bytes.readUInt32BE(16)===asset.width&&bytes.readUInt32BE(20)===asset.height,'Native skin pixel dimensions changed');
 assert(Math.abs(asset.width/asset.height-asset.physicalRegion[0]/asset.physicalRegion[1])<.01,'Native skin region aspect changed');
 const prompt=nativePrompts.assets.find(p=>p.id===asset.id);
 assert(prompt?.prompt&&prompt.referenceImages.length===2,'Native skin missing exact prompt and references');
 for(const ref of prompt.referenceImages)if(ref.path.startsWith('assets/'))assert(createHash('sha256').update(fs.readFileSync(path.join(root,ref.path))).digest('hex')===ref.sha256,'Native style source changed');
}
for(const profile of nativePack.profiles){
 assert(JSON.stringify(profile)===JSON.stringify(BUILDING_FACADES[profile.id]),'Runtime native profile differs from art manifest');
 assert(profile.portalStories===1&&profile.portalWidth===3&&profile.bayWidth/profile.baysPerRepeat===ASSET_SCALE.tile,'Skin is not composed at the original wall/door cadence');
 assert(profile.openingUV.every(Number.isFinite)&&profile.openingUV[0]<profile.openingUV[1]&&profile.openingUV[2]<profile.openingUV[3],'Invalid native door image mask');
 for(const key of [profile.bay,profile.portal])assert(BUILDING_FACADE_ASSETS[key].includes('/exposition-buildings-v3/'),'Native profile loads an earlier art revision');
}
console.log('PASS: 6 native Farmyard facade textures, source dimensions, 1m bay cadence, single-story entrances and matching runtime profiles.');
