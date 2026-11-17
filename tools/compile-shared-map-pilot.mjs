import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {extractSharedMapPilot} from '../src/content/shared-map-pilot.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const pins=[];
async function read(relative,expected){
  const bytes=await fs.readFile(path.join(root,relative)),sha256=hash(bytes);
  if(expected&&expected!==sha256)throw Error('Pinned physical source changed: '+relative);
  pins.push({path:relative,sha256,bytes:bytes.length});return JSON.parse(bytes);
}
const bindings=await read('assets/art/shared-map-fire-bindings/new-york.json');
const manifest=await read(bindings.sourceScene.indexPath,bindings.sourceScene.sha256);
const navigation=await read(bindings.sourceScene.navigationPath,bindings.sourceScene.navigationSha256);
const geometries={};
for(const carrier of bindings.carriers.filter(c=>bindings.pilotCarrierIds.includes(c.id)))for(const binding of carrier.renderBindings.filter(b=>b.physicalContribution==='carrier-solid')){
  if(!geometries[binding.geometryId])geometries[binding.geometryId]=await read(binding.geometryPath);
}
const data={...extractSharedMapPilot({manifest,navigation,bindings,geometries}),sourcePins:pins};
const output=path.join(root,'assets/runtime/shared-map-pilots/new-york.json'),bytes=JSON.stringify(data)+'\n';
if(process.argv.includes('--check')){
  if(await fs.readFile(output,'utf8')!==bytes)throw Error('Shared-map pilot extraction is stale');
}else{await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,bytes);}
console.log(JSON.stringify({placeId:data.placeId,carriers:data.carriers.length,active:data.activeCarrierIds.length,surfaces:data.surfaces.length,outputBytes:Buffer.byteLength(bytes),sha256:hash(bytes),limitations:data.limitations}));
