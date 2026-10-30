// Offline source inspection only. These immutable Git extracts are never runtime dependencies.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const pin='f75499a3ef60d6446a3885d0eb5c21882f27466b';
const root=path.resolve('artifacts/landmark-interiors/fisheries-source');
fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'package.json'),'{"type":"module","private":true}\n');
const manifest=JSON.parse(execFileSync('git',['show',pin+':assets/art/exposition-fisheries/manifest.json']));
const paths=[...new Set([...manifest.runtimeFiles,...manifest.dependencies].map(f=>f.path))],records=[];
for(const relative of paths){const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error('Invalid fixture path');const data=execFileSync('git',['show',pin+':'+relative],{maxBuffer:10*1024*1024});fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);records.push({path:relative,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
fs.writeFileSync('artifacts/landmark-interiors/fisheries-source.json',JSON.stringify({sourceCommit:pin,purpose:'Original Fisheries structural model, private offline comparison only; not a new game intake.',root,files:records},null,2)+'\n');
console.log('Prepared '+records.length+' exact Git-blob source files.');
