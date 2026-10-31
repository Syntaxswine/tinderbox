/** Package existing verified lossless chunks. No bake, scalar edits or import. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PAYLOAD_LIMITS} from '../../../../assets/art/fire-realism/fluid-contact/codec.js';
const file=process.argv[2];if(!file)throw Error('Usage: node package-binary.mjs ACTUAL/raw-manifest.json');
const rawPath=path.resolve(file),root=path.dirname(rawPath),rawBytes=fs.readFileSync(rawPath),raw=JSON.parse(rawBytes),sourceMetadata=JSON.parse(fs.readFileSync(path.join(root,'payload-sizing/metadata.json'),'utf8')),sourceSizing=JSON.parse(fs.readFileSync(path.join(root,'payload-sizing/sizing-report.json'),'utf8')),support=JSON.parse(fs.readFileSync(path.join(root,'support-derived/support-manifest.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),asset=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../assets/art/fire-realism/fluid-contact'),base='assets/art/fire-realism/fluid-contact/';
if(raw.sampleCount!==193||raw.boundaryReactionFailed||sourceMetadata.source.rawManifestSha256!==sha(rawBytes)||!sourceSizing.allScalarPacketRoundtrips)throw Error('Actual verified fields/bounds/packet proof required');
if(sourceMetadata.sparseBytes>PAYLOAD_LIMITS.sparseBytes||sourceMetadata.chunks.length>PAYLOAD_LIMITS.chunks||sourceSizing.gzipBytes>96*1024*1024)throw Error('Actual binary budget failed');
for(const dir of ['data','geometry'])if(fs.existsSync(path.join(asset,dir)))throw Error('Preserve existing package output: '+dir);
fs.mkdirSync(path.join(asset,'data'));fs.mkdirSync(path.join(asset,'geometry'));const resources=[];
for(const chunk of sourceMetadata.chunks){
 const name='chunk-'+String(chunk.id).padStart(3,'0'),bytes=fs.readFileSync(path.join(root,'payload-sizing',name+'.gz'));
 if(bytes.length!==chunk.gzipBytes||sha(bytes)!==chunk.gzipSha256||bytes.length>2*1024*1024||chunk.sparseBytes>4*1024*1024)throw Error('Verified gzip chunk mismatch');
 const relative=base+'data/'+name+'.fzp.gz';fs.writeFileSync(path.join(asset,'data',name+'.fzp.gz'),bytes);resources.push({path:relative,kind:'fzp1-gzip',bytes:bytes.length,sha256:sha(bytes),uncompressedBytes:chunk.sparseBytes});
}
const geometryModules=[],allPairs=[];let maxHullVertices=0,maxVertices=0,maxIndices=0;
for(let first=0;first<192;first+=4){
 const pairs=[];
 for(let i=first;i<Math.min(192,first+4);i++){
  const record=support.pairs[i],bytes=fs.readFileSync(path.join(root,record.path));if(bytes.length!==record.bytes||sha(bytes)!==record.sha256)throw Error('Derived geometry hash mismatch');
  const pair=JSON.parse(bytes);
  // Common integer-index endpoints avoid tiny gaps/overlaps from (lo+h).
  for(const prism of pair.prisms){prism.lower=pair.scalarGrid.origin[2]+prism.band*pair.scalarGrid.spacing[2];prism.upper=pair.scalarGrid.origin[2]+(prism.band+1)*pair.scalarGrid.spacing[2];maxHullVertices=Math.max(maxHullVertices,prism.hull.length);}
  maxVertices=Math.max(maxVertices,pair.vertices);maxIndices=Math.max(maxIndices,pair.triangles*3);pairs.push(pair);allPairs.push(pair);
 }
 const name='part-'+String(geometryModules.length).padStart(3,'0')+'.js',text='export const pairs='+JSON.stringify(pairs)+';\n';fs.writeFileSync(path.join(asset,'geometry',name),text);geometryModules.push(name);
}
const geometryIndex=geometryModules.map((name,i)=>"im"+"port {pairs as p"+i+"} fr"+"om './geometry/"+name+"';").join('\n')+'\nconst pairs=['+geometryModules.map((_,i)=>'...p'+i).join(',')+'];\nexport function supportPair(index){if(!Number.isInteger(index)||index<0||index>=pairs.length)throw Error(\'Finite support pair outside asset\');return pairs[index];}\nexport const GEOMETRY_METRICS='+JSON.stringify({pairCount:192,maxHullVertices,maxVertices,maxIndices,maxPrisms:support.peakPrisms,sourceJsonBytes:support.geometryJsonBytes,ownership:'Borrowed immutable document-lived grid-derived hull data; current pair GPU buffers owned by factory'})+';\n';
fs.writeFileSync(path.join(asset,'geometry-data.js'),geometryIndex);
const grid={resolution:raw.samples[0].resolution,origin:raw.samples[0].scalarCentreOriginBlender,spacing:raw.samples[0].voxelSize},metadata={...sourceMetadata,source:{...sourceMetadata.source,originalAuthoringTool:raw.tool,settingsSha256:raw.settingsSha256,sourceBlendSha256:raw.sourceBlendSha256,scope:'Finite CFD contact only; no R, appearance, sustained-loop or cost acceptance'},chunks:sourceMetadata.chunks.map((chunk,i)=>({...chunk,resourcePath:resources[i].path})),grid,burnSeconds:3.2,tailSeconds:3.2,tailFadeSeconds:.4,contactBandHeight:raw.samples[0].contactBandHeight,translation:[5.5,0,8.5],resourceLimits:{compressedBytes:96*1024*1024,chunkCompressedBytes:2*1024*1024,chunkSparseBytes:4*1024*1024},runtimeResources:resources};
fs.writeFileSync(path.join(asset,'metadata.js'),'export const FIELD_METADATA='+JSON.stringify(metadata)+';\n');
const sourceFiles=[];function collect(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())collect(p);else if(item.name.endsWith('.js'))sourceFiles.push(p);}}collect(asset);
const esmBytes=sourceFiles.reduce((sum,p)=>sum+fs.statSync(p).size,0),compressedBytes=resources.reduce((sum,r)=>sum+r.bytes,0);
if(esmBytes>PAYLOAD_LIMITS.sourceBytes)throw Error('Current source package already exceeds64MiB before final factory');
const report={version:1,status:'binary-data-packaged-final-closure-pending',scope:'New resource contract packaging only; no bootstrap/import/native visual acceptance',rawManifestSha256:sha(rawBytes),allScalarBitsUnchanged:true,scalarRecords:sourceMetadata.records.length,sparseBytes:sourceMetadata.sparseBytes,binaryResources:resources.length,compressedBytes,esmBytesSoFar:esmBytes,remainingSourceBudget:PAYLOAD_LIMITS.sourceBytes-esmBytes,geometryModules:geometryModules.length,geometryMetrics:{maxHullVertices,maxVertices,maxIndices,peakPrisms:support.peakPrisms},resources,packetFormat:'Verified unchanged FZP1; exact original gzip chunks copied without reencoding',geometryAdaptation:'Shared integer scalar-height endpoints only; no scalar shift or VolumeToMesh adapter',originalFailedEsmReport:'payload-sizing/sizing-report.json',limits:{...PAYLOAD_LIMITS,compressedBytes:96*1024*1024}};
const output=path.join(root,'binary-package-report.json');if(fs.existsSync(output))throw Error('Preserve previous binary package evidence');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,resources:'116 exact resource records in report'},null,2));
