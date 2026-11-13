import fs from 'node:fs';
import path from 'node:path';
import {composeSandbox} from './compose.js';
export function loadSandbox(file){
  const manifest=JSON.parse(fs.readFileSync(file)),directory=path.dirname(path.resolve(file)),sources=new Map();
  for(const spec of manifest.instances){const source=path.resolve(directory,spec.source);if(!source.startsWith(path.resolve(directory,'..')+path.sep))throw Error('Physical sources must remain inside workbenches');if(!sources.has(spec.source))sources.set(spec.source,JSON.parse(fs.readFileSync(source)));}
  return {...composeSandbox(manifest,sources),manifest};
}
