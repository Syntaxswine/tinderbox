import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {TILE_PLAN} from '../assets/art/exposition-new-york-tile/index.js';
import {PLAN as ADMIN} from '../assets/art/exposition-administration/index.js';
import {PLAN as HORT} from '../assets/art/exposition-horticulture/index.js';
import {exteriorOutline} from './ghost-outline.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const output=path.resolve('assets/art/exterior-ghost');
if(path.dirname(output)!==path.resolve('assets/art')||fs.existsSync(output)&&(fs.lstatSync(output).isSymbolicLink()||fs.realpathSync(output)!==output))throw Error('Unsafe ghost output');
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'.gitattributes'),'* -text\n');const reports=[];
for(const [placeId,plan]of [['new-york',TILE_PLAN],['administration',ADMIN],['horticulture',HORT]]){
  const root=path.resolve('assets/art/place-scenes',placeId),indexPath=path.join(root,'index.json'),manifest=JSON.parse(fs.readFileSync(indexPath)),navigation=JSON.parse(fs.readFileSync(path.join(root,manifest.navigation)));
  const {exteriorGhost:old,...sourceManifest}=manifest;
  const parts=manifest.chunks.flatMap(chunk=>JSON.parse(fs.readFileSync(path.join(root,chunk.url))).parts),cache=new Map();
  const geometry=id=>{if(!cache.has(id))cache.set(id,JSON.parse(fs.readFileSync(path.join(root,manifest.geometries[id]))));return cache.get(id);};
  const outline=exteriorOutline({plan,offset:navigation.sourceOffset,parts,geometry});
  const data={version:1,placeId,sourceManifestSha256:hash(sourceManifest),sourcePins:manifest.sourcePins,sourceAccess:manifest.sourceAccess,policy:'Sparse original wall runs, deck perimeters and selected original roof edges/parametric mesh curves. Native dimensions and source origins preserved; no collision or detailed scene geometry included.',...outline};
  const bytes=Buffer.from(JSON.stringify(data)+'\n');fs.writeFileSync(path.join(output,placeId+'.json'),bytes);
  manifest.exteriorGhost={url:'../../exterior-ghost/'+placeId+'.json',sha256:hash(data)};fs.writeFileSync(indexPath,JSON.stringify(manifest)+'\n');
  reports.push({placeId,segments:outline.segments,bytes:bytes.length,groups:outline.groups.length,bounds:outline.bounds,sourceManifestSha256:data.sourceManifestSha256,canonicalSha256:hash(data)});
}
fs.mkdirSync('docs/engineering/exterior-ghost',{recursive:true});fs.writeFileSync('docs/engineering/exterior-ghost/compile.json',JSON.stringify({purpose:'Global lightweight exterior context while detailed native sections stream independently',reports,passed:true},null,2)+'\n');console.log(JSON.stringify(reports));
