import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {encodeMapSources,packMapSourceIndex} from '../src/content/map-source-data.js';
import {encodeSourceContacts} from '../src/content/map-source-support-data.js';
import {applyFirstSupportControls} from '../src/content/map-source-support-overrides.js';

const root=fileURLToPath(new URL('../',import.meta.url)),pins=[],hash=b=>createHash('sha256').update(b).digest('hex');
async function read(relative,expected){
  const absolute=path.resolve(root,relative);if(!absolute.startsWith(root)||path.isAbsolute(relative))throw Error('Source path outside repository');
  const bytes=await fs.readFile(absolute),sha256=hash(bytes);if(expected&&sha256!==expected)throw Error('Pinned source changed '+relative);pins.push({path:relative,sha256,bytes:bytes.length});return JSON.parse(bytes);
}
const bindings=await read('assets/art/shared-map-fire-bindings/new-york-complete-v1.json','407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba');
const manifest=await read(bindings.sourceScene.indexPath,bindings.sourceScene.sha256),navigation=await read(bindings.sourceScene.navigationPath,bindings.sourceScene.navigationSha256),overlay=await read(bindings.effectiveGeometryOverlay.indexPath,bindings.effectiveGeometryOverlay.sha256),geometries={};
const controlPath='assets/art/shared-map-support-overrides/new-york-controls-v1.json',controls=await read(controlPath,'f3f28fda72742c6bc04d32f70331ab96e036662f953153952297fae9ce3bc915');
const replacements=new Map(overlay.replacements.map(r=>[r.sourcePartId,r]));
for(const binding of [...bindings.carriers.flatMap(c=>c.renderBindings),...bindings.visualOnlyBindings.map(v=>v.renderBinding)]){
  const replacement=replacements.get(binding.sourcePartId);if(replacement&&(replacement.after.geometryId!==binding.geometryId||replacement.after.geometryPath!==binding.geometryPath))throw Error('Effective overlay not authoritative '+binding.sourcePartId);
  if(!geometries[binding.geometryId])geometries[binding.geometryId]=await read(binding.geometryPath,replacement?.after.sha256);
}
const encoded=encodeMapSources({bindings,manifest,navigation,geometries});
applyFirstSupportControls(encoded.index,controls);
const verified=encodeSourceContacts(encoded.index,encoded.library);encoded.index.contacts=verified.contacts;encoded.index.contactEvidence=verified.evidence;
encoded.index.sourcePins={candidate:'82b7fc604eb183d65e7569366c47f45e5f07c1b5',supportControls:{candidate:'9a88959d2011d182377a9eeb95d5ed9d222e46b1',path:controlPath,sha256:'f3f28fda72742c6bc04d32f70331ab96e036662f953153952297fae9ce3bc915'},inputs:pins};
encoded.index=packMapSourceIndex(encoded.index);
const outputs={index:JSON.stringify(encoded.index)+'\n',library:JSON.stringify(encoded.library)+'\n'},directory=path.join(root,'assets/runtime/map-sources/new-york');
for(const [key,text]of Object.entries(outputs)){const target=path.join(directory,key+'.json');if(process.argv.includes('--check')){if(await fs.readFile(target,'utf8')!==text)throw Error('Compact map output stale '+key);}else{await fs.mkdir(directory,{recursive:true});await fs.writeFile(target,text);}}
console.log(JSON.stringify({placeId:encoded.index.placeId,carriers:encoded.index.carriers.length,sourceParts:encoded.index.parts.length,uniqueGeometries:Object.keys(encoded.library.geometries).length,outputs:Object.fromEntries(Object.entries(outputs).map(([k,text])=>[k,{bytes:Buffer.byteLength(text),sha256:hash(text)}])),authoringInputBytes:pins[0].bytes}));
