/** Exact-data sizing only. No runtime import, Blender, fetch or source writes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {encodeZeroLiteral,decodeZeroLiteral,PAYLOAD_LIMITS} from '../../../../assets/art/fire-realism/fluid-contact/codec.js';
const input=process.argv[2];if(!input)throw Error('Usage: node size-payload.mjs ACTUAL/raw-manifest.json');
const manifestPath=path.resolve(input),root=path.dirname(manifestPath),manifestBytes=fs.readFileSync(manifestPath),m=JSON.parse(manifestBytes),run=JSON.parse(fs.readFileSync(path.join(root,'run.json'),'utf8'));
if(!run.rawExportComplete||m.sampleCount!==193)throw Error('Actual193-sample raw export required');
const output=path.join(root,'payload-sizing');if(fs.existsSync(output))throw Error('Preserve prior sizing evidence');fs.mkdirSync(output);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),targetSparseBytes=1024*1024,records=[],chunks=[];let sparseBytes=0,rawBytes=0,gzipBytes=0,chunkSourceBytes=0,group=[],groupBytes=0,peakPacketBytes=0,peakVerificationBytes=0;
const guard=()=>{if(Date.now()/1000>=run.deadlineEpoch)throw Error('Original authoring deadline expired');};
function flush(){
 if(!group.length)return;guard();const index=chunks.length,packets=Buffer.concat(group.map(x=>x.packet)),compressed=gzipSync(packets,{level:9}),encoded=compressed.toString('base64');
 const source=Buffer.from("im"+"port {payload} fr"+"om './registry.js';\nawait payload.append("+index+",'"+encoded+"');\n");
 fs.writeFileSync(path.join(output,'chunk-'+String(index).padStart(3,'0')+'.js'),source);
 fs.writeFileSync(path.join(output,'chunk-'+String(index).padStart(3,'0')+'.gz'),compressed);
 const chunk={id:index,offset:sparseBytes-packets.length,sparseBytes:packets.length,gzipBytes:compressed.length,gzipSha256:sha(compressed),sourceBytes:source.length,sourceSha256:sha(source),recordIds:group.map(x=>x.id)};
 chunks.push(chunk);gzipBytes+=compressed.length;chunkSourceBytes+=source.length;group=[];groupBytes=0;
}
for(const sample of m.samples){
 guard();const count=sample.resolution.reduce((a,b)=>a*b,1);
 for(const channel of ['density','temperature','flame']){
  const r=sample.channels[channel],file=path.resolve(root,r.path);if(!file.startsWith(root+path.sep))throw Error('Raw path escaped');const bytes=fs.readFileSync(file);
  if(bytes.length!==count*4||bytes.length!==r.bytes||sha(bytes)!==r.sha256)throw Error('Original float source changed');
  const packet=encodeZeroLiteral(bytes),decoded=new Uint8Array(bytes.length);decodeZeroLiteral(packet,decoded);if(sha(decoded)!==r.sha256)throw Error('Exact original scalar packet roundtrip failed');
  if(group.length&&groupBytes+packet.length>targetSparseBytes)flush();
  const id=sample.frame+':'+channel,record={id,frame:sample.frame,channel,offset:sparseBytes,packetBytes:packet.length,packetSha256:sha(packet),rawBytes:bytes.length,rawSha256:r.sha256};
  records.push(record);group.push({id,packet});groupBytes+=packet.length;sparseBytes+=packet.length;rawBytes+=bytes.length;peakPacketBytes=Math.max(peakPacketBytes,packet.length);peakVerificationBytes=Math.max(peakVerificationBytes,decoded.length);
 }
 if(sample.frame%32===0)console.log(JSON.stringify({sizedFrame:sample.frame,total:193,sparseBytes,flushedChunks:chunks.length}));
}
flush();
const metadata={version:1,source:{rawManifestSha256:sha(manifestBytes),scope:'Finite193-sample original field payload, not visual acceptance'},frames:m.samples.map(f=>({frame:f.frame,timeSeconds:f.ageSeconds,resolution:f.resolution})),records,chunks:chunks.map(({sourceBytes,sourceSha256,...rest})=>rest),sparseBytes};
fs.writeFileSync(path.join(output,'metadata.json'),JSON.stringify(metadata)+'\n');
const geometryReport=JSON.parse(fs.readFileSync(path.join(root,'support-derived/support-manifest.json'),'utf8')),metadataBytes=Buffer.byteLength(JSON.stringify(metadata)),baseSourceBytes=['codec.js','rgba-decode.js','space.js','support.js'].reduce((sum,name)=>sum+fs.statSync(new URL('../../../../assets/art/fire-realism/fluid-contact/'+name,import.meta.url)).size,0);
const knownSourcePlusUncompressedGeometry=chunkSourceBytes+metadataBytes+geometryReport.geometryJsonBytes+baseSourceBytes;
const failures=[];if(sparseBytes>PAYLOAD_LIMITS.sparseBytes)failures.push('96MiB shared sparse ceiling');if(chunks.length>PAYLOAD_LIMITS.chunks)failures.push('256 chunk ceiling');if(chunks.some(c=>c.sourceBytes>PAYLOAD_LIMITS.chunkSourceBytes))failures.push('2MiB chunk source ceiling');if(chunks.some(c=>c.sparseBytes>PAYLOAD_LIMITS.chunkSparseBytes))failures.push('4MiB chunk sparse ceiling');if(knownSourcePlusUncompressedGeometry>PAYLOAD_LIMITS.sourceBytes)failures.push('64MiB source ceiling already exceeded before remaining factory/boot code');
const report={version:1,status:failures.length?'actual-payload-sizing-failed':'actual-payload-sizing-within-known-limits-final-closure-pending',scope:'Exact579-scalar packet proof and measured sizing only; complete Stage2 factory/static closure/browser/visual gates still pending',rawManifestSha256:sha(manifestBytes),toolSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),frames:193,scalarRecords:records.length,allScalarPacketRoundtrips:true,rawBytes,sparseBytes,gzipBytes,payloadChunks:chunks.length,chunkSourceBytes,metadataBytes,uncompressedGeometryJsonBytes:geometryReport.geometryJsonBytes,knownCoreSourceBytes:baseSourceBytes,knownSourcePlusUncompressedGeometry,remainingSourceBudget:PAYLOAD_LIMITS.sourceBytes-knownSourcePlusUncompressedGeometry,targetChunkSparseBytes:targetSparseBytes,largestChunkSparseBytes:Math.max(...chunks.map(c=>c.sparseBytes)),largestChunkSourceBytes:Math.max(...chunks.map(c=>c.sourceBytes)),peakPacketBytes,peakOneChannelOfflineVerificationBytes:peakVerificationBytes,runtimeDenseStorage:'Future factory must decode directly into TWO RGBA32F upload slots; no planar fixture cache',limits:PAYLOAD_LIMITS,failures};
fs.writeFileSync(path.join(output,'sizing-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
