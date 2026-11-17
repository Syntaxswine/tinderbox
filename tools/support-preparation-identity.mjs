// Offline audited closure. Never imported by runtime graph/lookup modules.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const defaultRoot=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const hash=b=>createHash('sha256').update(b).digest('hex');
export function supportPreparationDependencies({root=defaultRoot,entries=['tools/prepare-source-support.mjs']}={}){
  root=fs.realpathSync(root);const records=new Map(),builtins=new Set(),entryPaths=[...new Set(entries)].sort();
  function visit(relative){
    const absolute=path.resolve(root,relative);if(!absolute.startsWith(root+path.sep)||!fs.statSync(absolute).isFile()||fs.lstatSync(absolute).isSymbolicLink()||fs.realpathSync(absolute)!==absolute)throw Error('Unpinned/unsafe preparation dependency '+relative);
    const name=path.relative(root,absolute).split(path.sep).join('/');if(records.has(name))return;
    const raw=fs.readFileSync(absolute),code=/\.(?:mjs|cjs|js)$/.test(name),text=code?raw.toString('utf8').replace(/\r\n/g,'\n'):null,imports=[];
    records.set(name,{path:name,kind:code?'module':'data',sha256:hash(code?text:raw),imports});
    if(!code)return;
    const pattern=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g;
    for(const [,specifier]of text.matchAll(pattern)){
      if(specifier.startsWith('node:')){builtins.add(specifier);continue;}
      if(!specifier.startsWith('.'))throw Error('Unresolved preparation package dependency '+name+' -> '+specifier);
      const target=path.relative(root,path.resolve(path.dirname(absolute),specifier.split(/[?#]/)[0])).split(path.sep).join('/');imports.push(target);visit(target);
    }
    for(const match of text.matchAll(/\bimport\s*\(([^)]*)\)/g))if(!/^\s*['"][^'"]+['"]\s*$/.test(match[1]))throw Error('Nonliteral preparation dependency in '+name);
    imports.sort();
  }
  for(const entry of entryPaths)visit(entry);
  const descriptor={version:1,producerSchema:'tinderbox-source-calculation-reference-v1',nodeRuntime:process.version,entries:entryPaths,files:[...records.values()].sort((a,b)=>a.path.localeCompare(b.path)),nodeBuiltins:[...builtins].sort(),externalInputRule:'Selected source index/library/navigation bytes are hashed separately before compilation; no runtime file I/O.'};
  return {...descriptor,digest:hash(JSON.stringify(descriptor))};
}
export function verifySupportPreparationDependencies(expected,options={}){
  try{const actual=supportPreparationDependencies({...options,entries:expected.entries});return JSON.stringify(actual)===JSON.stringify(expected);}catch{return false;}
}
