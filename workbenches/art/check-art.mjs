
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
console.log('PASS: 7 authored skins, exact prompt/source records, projected sheet dimensions and 8 adapter fingerprints.');
