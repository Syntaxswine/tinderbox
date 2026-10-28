
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
    // This frozen window adapter injects the host Three namespace; its filename
    // is not a second engine. tools/check.mjs verifies the actual import graph.
    const injectedRenderer='../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/window-kit/three.js';
    for(const dependency of text.matchAll(/(?:from|import)\s*['"]([^'"]*three[^'"]*)['"]/g))assert(dependency[1]===injectedRenderer,'Production art imported a second THREE instance: '+dependency[1]);
    assert(!/Tactical Animal|C:\\|https?:\/\//.test(text),'External runtime dependency in '+file);
  }
  for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
    assert(fs.existsSync(path.resolve(path.dirname(file),match[1])),'Missing relative import '+file+' -> '+match[1]);
  }
}
console.log('PASS: '+manifest.files.length+' byte-preserved imports; '+code.length+' syntax/dependency checks; injected shared THREE.');
