/** ONE future source-specific derivation/assembly; not execution authority.
 * Original cfe01 fields are read once; no solver, repair, old store or renderer.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {openRawFields,positiveAudit} from '../mantaflow-contact/read-fields.mjs';
import {plain,exactInventory,createOutputDirectory} from '../half-rate-assessment/assess.mjs';
import {encodeZeroLiteral,decodeZeroLiteral,packetRawBytes} from '../../../../assets/art/fire-realism/fluid-contact-surface/payload/codec.js';
import {validateEligibility,verifyPinnedBytes,verifyPayloadSizing,STUDY} from './eligibility.mjs';
import {pairSupport} from './support.mjs';
import {diagnosticFactorySource,localNormalizationSource} from './factory-source.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
export function generate(configFile){
 const started=performance.now(),utc=Date.now(),planRaw=fs.readFileSync(path.join(here,'plan.json')),plan=JSON.parse(planRaw),inputRaw=fs.readFileSync(configFile),config=JSON.parse(inputRaw);
 if(!path.isAbsolute(config.output??'')||Object.keys(config).sort().join(',')!=='output,planSha256,stopFile,wallLimitMs'||config.planSha256!==sha(planRaw)||config.wallLimitMs!==180000||!process.execArgv.includes('--max-old-space-size=512'))throw Error('Exact plan, fixed512MiB oldspace and180s generation proposal required');
 const qa=path.join(root,'artifacts/qa/fire-realism/half-rate-diagnostic-asset'),output=path.resolve(config.output),asset=path.join(root,plan.assetRoot);
 if(plan.assetRoot!=='assets/art/fire-realism/fluid-contact-half-rate-diagnostic'||config.stopFile!==path.join(output,'stop'))throw Error('Exact separate asset/private STOP required');
 let peakRss=0;
 const guard=()=>{if(performance.now()-started>=180000||Date.now()-utc>=180000||fs.existsSync(config.stopFile))throw Error('Finite180s generation deadline/STOP; no retry');const rss=process.memoryUsage().rss;peakRss=Math.max(peakRss,rss);if(rss>536870912)throw Error('512MiB polled generation RSS limit');};
 const readPin=pin=>{guard();const p=path.resolve(root,pin.path);if(!p.startsWith(root+path.sep)||plain(p).size!==pin.bytes||pin.bytes>8*1024**2)throw Error('Bounded pinned source/input required');const b=fs.readFileSync(p);verifyPinnedBytes(b,pin);return b;};
 const documents={};for(const [name,pin]of Object.entries(plan.inputs)){const b=readPin(pin);if(name!=='scene')documents[name]=JSON.parse(b);}
 for(const pin of plan.extraInputPins)readPin(pin);
 const eligible=validateEligibility(documents,plan),rawRoot=path.dirname(path.join(root,plan.inputs.manifest.path));
 exactInventory(path.join(rawRoot,'fields'),eligible.names);
 const copied={};for(const [name,pin]of Object.entries(plan.runtimeCopies))copied[name]=readPin(pin);
 for(const pin of Object.values(plan.reuseSources))readPin(pin);
 // No raw source-stage output, old run.json/rawExportComplete, expired authoring
 // deadline, successful-gate spoof or old geometry witness is used here.
 const source=openRawFields(path.join(root,plan.inputs.manifest.path));
 if(source.manifestSha256!==STUDY.manifestSha256||JSON.stringify(source.grid)!==JSON.stringify(plan.grid))throw Error('Frozen source/grid mismatch');
 createOutputDirectory(qa,output);createOutputDirectory(path.dirname(asset),asset);
 let qaBytes=0,sourceBytes=0,sparseBytes=0,compressedBytes=0,originalBytes=0,framePacketPeak=0,gzipPeak=0;
 const counters={frames:0,originalChannels:0,pairs:0};
 function write(file,data){guard();if(!file.startsWith(output+path.sep)&&!file.startsWith(asset+path.sep))throw Error('Derived output escaped new owned trees');const b=typeof data==='string'?Buffer.from(data):data;const isQa=file.startsWith(output+path.sep);if(isQa){if(qaBytes+b.length>plan.limits.qaBytes-65536)throw Error('QA evidence ceiling');qaBytes+=b.length;}else if(file.endsWith('.js')){if(sourceBytes+b.length>plan.limits.sourceBytes)throw Error('Runtime64MiB source ceiling');sourceBytes+=b.length;}fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,b,{flag:'wx'});}
 const json=(file,data)=>write(file,JSON.stringify(data,null,2)+'\n');
 const records=[],chunks=[],resources=[],hashes=[],pairRecords=[],geometryNames=[],sourceAudits=[],inputIdentities=[];
 let batch=[],maxPrisms=0,maxHull=0,maxVertices=0,maxTriangles=0,floorMoved=0,floorDiscarded=0,geometryBytes=0,rawGeometryBytes=0;
 const geometryMetrics=()=>({pairCount:pairRecords.length,maxPrisms,maxHullVertices:maxHull,maxVertices,maxIndices:maxTriangles*3,sourceJsonBytes:geometryBytes,rawQaJsonBytes:rawGeometryBytes,floor:{nativeY:0,movedNegativeVertices:floorMoved,discardedPrisms:floorDiscarded,rawFieldsUnchanged:true,excludesReconstructedContributionBelowFloor:true},upperOverhangApproved:false,ownership:'Actual temporal D/F union plus onevoxel; convex disjoint half-open bands; one interval/ray/slab, no duplicate whole-volume integration'});
 const flushGeometry=()=>{if(!batch.length)return;const name='part-'+String(geometryNames.length).padStart(3,'0')+'.js',text='export const pairs='+JSON.stringify(batch)+';\n';write(path.join(asset,'geometry',name),text);geometryBytes+=Buffer.byteLength(text);geometryNames.push(name);batch=[];};
 try{
  json(path.join(output,'input.json'),config);write(path.join(output,'plan.json'),planRaw);
  write(path.join(asset,'.gitattributes'),'*.js text eol=lf\n*.json text eol=lf\n*.fzp.gz -text\n');
  for(const [name,b]of Object.entries(copied)){
   const bytes=name==='normalization-transfer.js'?Buffer.from(localNormalizationSource(b.toString('utf8'))):b;
   write(path.join(asset,name),bytes);
  }
  write(path.join(asset,'index.js'),diagnosticFactorySource(readPin(plan.reuseSources.factoryTemplate).toString('utf8')));
  function readFrame(index){
   guard();const sample=source.manifest.samples[index],frame={},packets=[],ids=[],offset=sparseBytes,observations={frame:sample.frame,age:sample.ageSeconds};
   for(const channel of ['density','temperature','flame']){
    guard();const expected=eligible.expected.get(sample.frame+':'+channel),p=path.join(rawRoot,expected.path),before=plain(p);
    if(before.size!==884736)throw Error('Full original field extent changed');
    const {bytes,values,record}=source.read(index,channel),after=plain(p);
    if(before.ino!==after.ino||before.dev!==after.dev||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||record.sha256!==expected.sha256)throw Error('Frozen original field changed while read');
    inputIdentities.push({file:p,stat:before});
    const packet=encodeZeroLiteral(bytes),back=new Uint8Array(bytes.length);if(packetRawBytes(packet)!==bytes.length)throw Error('Packet extent mismatch');decodeZeroLiteral(packet,back);
    if(sha(back)!==expected.sha256||!Buffer.from(back).equals(bytes))throw Error('Exact original scalar roundtrip failed');
    const id=records.length;records.push({id,frame:sample.frame,channel,offset:sparseBytes,packetBytes:packet.length,packetSha256:sha(packet),rawBytes:bytes.length,rawSha256:expected.sha256});ids.push(id);packets.push(packet);sparseBytes+=packet.length;originalBytes+=bytes.length;hashes.push({frame:sample.frame,channel,bytes:bytes.length,sha256:expected.sha256});counters.originalChannels++;
    if(channel!=='temperature'){
     frame[channel]=values;const a=positiveAudit(values,source.grid,plan.contactBandHeight),saved=documents.assessment.frames[index].channels[channel];
     if(a.positive!==saved.positive||JSON.stringify(a.boundsBlender)!==JSON.stringify(saved.positiveCentreBoundsBlender))throw Error('Assessed positive support changed');observations[channel]=a;
    }
   }
   const sparse=Buffer.concat(packets),gzip=gzipSync(sparse,{level:9}),back=gunzipSync(gzip);
   if(!back.equals(sparse))throw Error('Whole-frame gzip roundtrip failed');
   framePacketPeak=Math.max(framePacketPeak,sparse.length);gzipPeak=Math.max(gzipPeak,gzip.length);compressedBytes+=gzip.length;
   verifyPayloadSizing({sourceBytes,sparseBytes,compressedBytes,chunks:chunks.length+1,frameSparseBytes:sparse.length,frameCompressedBytes:gzip.length},plan.limits);
   const name='frame-'+String(index).padStart(3,'0')+'.fzp.gz',resourcePath=plan.assetRoot+'/data/'+name;
   chunks.push({id:index,offset,sparseBytes:sparse.length,gzipBytes:gzip.length,gzipSha256:sha(gzip),resourcePath,recordIds:ids,kind:'fzp2-gzip'});
   resources.push({path:resourcePath,kind:'fzp2-gzip',bytes:gzip.length,sha256:sha(gzip),uncompressedBytes:sparse.length});write(path.join(asset,'data',name),gzip);
   sourceAudits.push(observations);counters.frames++;peakRss=Math.max(peakRss,process.memoryUsage().rss);return frame;
  }
  let current=readFrame(0);
  for(let index=0;index<192;index++){
   guard();const next=readFrame(index+1),pair=pairSupport(current,next,source.grid,guard);
   const raw={pair:index,frames:[index+1,index+2],ageInterval:[index/30,(index+1)/30],scalarGrid:source.grid,prisms:pair.raw,metrics:pair.metrics,rawGatesPassed:false,study:STUDY};
   const rel='raw-geometry/pair-'+String(index).padStart(3,'0')+'.json',text=JSON.stringify(raw)+'\n';write(path.join(output,rel),text);rawGeometryBytes+=Buffer.byteLength(text);
   pairRecords.push({pair:index,path:rel,bytes:Buffer.byteLength(text),sha256:sha(text),metrics:pair.metrics});
   batch.push({pair:index,frames:raw.frames,prisms:pair.render});if(batch.length===4)flushGeometry();
   maxPrisms=Math.max(maxPrisms,pair.metrics.renderPrisms);maxHull=Math.max(maxHull,pair.metrics.maxHullVertices);maxVertices=Math.max(maxVertices,pair.metrics.vertices);maxTriangles=Math.max(maxTriangles,pair.metrics.triangles);floorMoved+=pair.metrics.floor.movedVertices;floorDiscarded+=pair.metrics.floor.discardedPrisms;
   current=next;counters.pairs++;if(index%24===0)console.log(JSON.stringify({phase:'half-rate-exact-derivation',frames:counters.frames,pairs:counters.pairs,channels:counters.originalChannels,sparseBytes,compressedBytes,elapsedMs:performance.now()-started}));
  }
  flushGeometry();if(counters.frames!==193||counters.pairs!==192||counters.originalChannels!==579||originalBytes!==512262144||!maxPrisms||maxHull<3)throw Error('Incomplete measured dataset/geometry');
  const geometry=geometryMetrics(),quote=String.fromCharCode(39),moduleImports=geometryNames.map((n,i)=>'import {pairs as p'+i+'} from '+quote+'./geometry/'+n+quote+';').join('\n');
  const geometryIndex=moduleImports+'\nconst pairs=['+geometryNames.map((_,i)=>'...p'+i).join(',')+'];\nexport function supportPair(index){if(!Number.isInteger(index)||index<0||index>=192)throw Error("Finite diagnostic support index");return pairs[index];}\nexport const GEOMETRY_METRICS='+JSON.stringify(geometry)+';\n';
  write(path.join(asset,'geometry-data.js'),geometryIndex);
  const metadata={version:2,source:{...plan.sourcePins,provenance:{study:STUDY,authoringCommit:plan.authoringCommit,sourceProposalCommit:plan.proposalCommit,opticalControlCommit:plan.opticalControlCommit,rawValidity:false,nativeAdmission:false}},frames:source.manifest.samples.map(s=>({frame:s.frame,timeSeconds:s.ageSeconds,resolution:s.resolution})),records,chunks,sparseBytes};
  const presentation={grid:source.grid,contactBandHeight:plan.contactBandHeight,translation:plan.translation,burnSeconds:3.2,tailSeconds:3.2,tailFadeSeconds:.4,floorNativeY:0,study:STUDY,overhangStatus:'Measured but unapproved until architect review',nativeComparisonUnderlay:plan.nativeComparisonUnderlay};
  write(path.join(asset,'metadata.js'),'export const FIELD_METADATA='+JSON.stringify(metadata)+';\nexport const PRESENTATION='+JSON.stringify(presentation)+';\n');
  const files=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Generated closure reparse');if(e.isDirectory())walk(f);else if(e.name.endsWith('.js'))files.push(f);}};walk(asset);
  const runtimeFiles=files.sort().map(f=>{const b=fs.readFileSync(f);if(b.includes(13))throw Error('Raw runtime LF required');return{path:path.relative(root,f).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};});
  const denseBytes=7077888,poolBytes=maxPrisms*(maxHull*2*3*4+(maxHull*4-4)*3*2);
  if(runtimeFiles.reduce((n,r)=>n+r.bytes,0)!==sourceBytes)throw Error('Runtime closure accounting mismatch');
  const manifest={version:1,id:'tinderbox-exact-half-rate-terminal-diagnostic',artistVersion:'0.1.0-half-rate-failed-terminal-diagnostic',status:'unaccepted-exact-failed-terminal-diagnostic',rawGatesPassed:false,admitted:false,study:STUDY,referenceFrozen:false,optimizedAvailable:false,factoryExport:'createHalfRateContactDiagnostic',prepareExport:'prepareHalfRateDiagnosticData',runtimeFiles,runtimeResources:resources,sourceRawManifestSha256:STUDY.manifestSha256,sourcePins:plan.sourcePins,sourceQualification:'Exact failed cfe01 source, independently byte-reconciled; eligibility is not raw validity or native admission.',opticalControl:{commit:plan.opticalControlCommit,variant:'fixed6r-smoke-only',unchangedGenerators:true,normalization:'Author source normalization, not radiometry'},geometry,limits:{esmBytes:sourceBytes,sparseBytes,compressedBytes,resources:resources.length,rgbaCpuBytes:denseBytes,rgbaGpuBytes:denseBytes,geometryCpuBytes:poolBytes,geometryGpuBytes:poolBytes},nativeComparisonUnderlay:plan.nativeComparisonUnderlay,provenance:{proposalCommit:plan.proposalCommit,codec:plan.codecReview,runtimeCopies:plan.runtimeCopies,reuseSources:plan.reuseSources},reviewLimitations:'No new source/cost/quality acceptance. New measured overhang unapproved. Actual burnout reaction0 and original3.2s tail/final.4 retirement retained; residual ungained F smoke clearing needs native192-196 review.'};
  json(path.join(asset,'manifest.json'),manifest);
  for(const p of Object.values(plan.inputs))readPin(p);for(const p of plan.extraInputPins)readPin(p);exactInventory(path.join(rawRoot,'fields'),eligible.names);
  for(const {file,stat}of inputIdentities){const now=plain(file);for(const k of ['dev','ino','size','mtimeMs','ctimeMs'])if(now[k]!==stat[k])throw Error('Original field identity changed after derivation');}
  const report={version:1,status:'diagnostic-derivation-roundtrips-complete-unadmitted',rawGatesPassed:false,admitted:false,study:STUDY,sourcePlanSha256:sha(planRaw),entrySha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),elapsedMs:performance.now()-started,counters,all579OriginalScalarRoundtrips:true,all193GzipRoundtrips:true,originalBytes,sparseBytes,compressedBytes,sourceBytes,framePacketPeak,gzipPeak,geometry,pairs:pairRecords,sourceAudits,upperOverhangApproved:false,resources:{sampledGeneratorRss:peakRss,generatorDenseCurrentNextDandFBytes:3538944,factoryRgbaCpuBytes:denseBytes,factoryRgbaGpuLogicalBytes:denseBytes,factoryGeometryCpuLogicalBytes:poolBytes,factoryGeometryGpuLogicalBytes:poolBytes,documentSharedSparseBytes:sparseBytes,documentGeometrySourceBytes:geometryBytes,unmeasured:'JS objects/crypto/GC/engine/driver residency. Generation gzip/roundtrip scratch is not factory ownership.'},futureRGBAProof:'Required separately through exact strict-loader verified prepare/audit exports; not claimed by scalar/gzip roundtrips.',limits:plan.limits};
  json(path.join(output,'original-channel-roundtrips.json'),{study:STUDY,hashes});
  json(path.join(output,'derivation-report.json'),report);
  console.log(JSON.stringify({status:report.status,rawGatesPassed:false,admitted:false,counters,sparseBytes,compressedBytes,sourceBytes,qaBytes,elapsedMs:performance.now()-started}));
 }catch(error){
  // Own new QA only; original raw status/manifest/arrays/cache are never written.
  const failure=Buffer.from(JSON.stringify({status:'diagnostic-generation-failed-partials-preserved',error:String(error).slice(0,2048),stack:String(error.stack).slice(0,4096),rawGatesPassed:false,admitted:false,study:STUDY,counters,sparseBytes,compressedBytes,sourceBytes,qaBytes,geometry:geometryMetrics(),framePacketPeak,gzipPeak,elapsedMs:performance.now()-started},null,2)+'\n');
  if(failure.length>65536||qaBytes+failure.length>plan.limits.qaBytes)throw new AggregateError([error,new Error('Reserved failure receipt cap')]);
  fs.writeFileSync(path.join(output,'FAILED.json'),failure,{flag:'wx'});throw error;
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||!path.isAbsolute(process.argv[2]))throw Error('Usage: node --max-old-space-size=512 assemble.mjs ABSOLUTE_INPUT.json');
 generate(process.argv[2]);
}
