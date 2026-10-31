/** Reproducible additive V5 assembly. No solver, input write, renderer or asset fetch.
 * Final generation refuses to start until the architect-reviewed codec is pinned.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {openRawFields} from '../../mantaflow-contact/read-fields.mjs';
import {prismGeometry,footprintContains,prismOwnsHeight} from '../../../../../assets/art/fire-realism/fluid-contact/support.js';
import {floorPrism} from './templates/floor.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../..');
const [configFile]=process.argv.slice(2);if(!configFile)throw Error('Usage: node assemble.mjs ABSOLUTE/assembly-input.json');
const inputPath=path.resolve(configFile),config=JSON.parse(fs.readFileSync(inputPath)),started=performance.now(),startedUtc=new Date().toISOString();
const sha=b=>createHash('sha256').update(b).digest('hex'),planBytes=fs.readFileSync(path.join(here,'assembly-plan.json')),plan=JSON.parse(planBytes),output=path.resolve(config.output),asset=path.resolve(root,plan.assetRoot);
const below=(base,p)=>p.startsWith(base+path.sep),hex=(s,n)=>typeof s==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(s);
if(!below(path.join(root,'artifacts','qa','fire-realism'),output)||fs.existsSync(output)||!below(root,asset)||fs.existsSync(asset))throw Error('Fresh own-QA output and separate new asset required; never overwrite a previous run');
if(config.planSha256!==sha(planBytes)||config.wallLimitMs!==180000||config.stopFile!==path.join(path.dirname(output),'stop'))throw Error('Frozen plan, private STOP path and checked180s deadline required');
const guard=()=>{if(performance.now()-started>=180000||fs.existsSync(config.stopFile))throw Error('Finite assembly deadline/STOP reached; partial outputs preserved');};
const record=(file)=>{const bytes=fs.readFileSync(file);return{bytes:bytes.length,sha256:sha(bytes)};};
function readBound(file,expected){guard();const bytes=fs.readFileSync(file);if(expected.bytes!==undefined&&bytes.length!==expected.bytes||sha(bytes)!==expected.sha256)throw Error('Pinned source changed: '+file);return bytes;}
function write(file,bytes){guard();fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});}
const review=plan.reviewedRuntime;
if(!review||!hex(review.sourceCommit,40)||!hex(review.architectApprovalCommit,40)||Object.keys(review.modules??{}).sort().join(',')!=='codec.js,payload.js,rgba-decode.js')throw Error('No exact architect-reviewed production codec intake: generation is not authorized');
const codecBytes={};
for(const [name,pin]of Object.entries(review.modules)){
 if(pin.source!=='assets/art/fire-realism/field-payload-v2/'+name||!hex(pin.sha256,64)||!Number.isSafeInteger(pin.bytes))throw Error('Invalid reviewed canonical module pin');
 const b=execFileSync('git',['show',review.sourceCommit+':'+pin.source],{cwd:root,maxBuffer:2*1024*1024});if(b.length!==pin.bytes||sha(b)!==pin.sha256||b.includes(13))throw Error('Reviewed Git codec bytes do not match exact raw LF pin');codecBytes[name]=b;
}
const rawFile=path.resolve(root,plan.rawManifest),rawRoot=path.dirname(rawFile);
readBound(rawFile,{sha256:plan.sourcePins.rawManifestSha256});
for(const [key,file]of Object.entries(plan.inputFiles))readBound(path.join(rawRoot,file),{sha256:plan.sourcePins[{settings:'settingsSha256',prepareReport:'prepareReportSha256',sourceBlend:'sourceBlendSha256'}[key]]});
const reportFile=path.resolve(root,plan.geometryReport),geometryReport=JSON.parse(readBound(reportFile,{sha256:plan.geometryReportSha256})),qaRoot=path.dirname(reportFile),source=openRawFields(rawFile);
if(source.manifestSha256!==plan.sourcePins.rawManifestSha256||source.manifest.terminalValidation?.rawGatesPassed!==true||geometryReport.pairCount!==192||plan.renderFloorNativeY!==0)throw Error('Exact193 source/terminal gates and approved floor0 geometry required');
for(const [name,pin]of Object.entries(plan.pureSources))readBound(path.join(root,pin.source),pin);
let floorAffected=0,floorMovedVertices=0,floorDiscarded=0,geometryBytes=0,peakPrisms=0,peakHull=0,peakVertices=0,peakTriangles=0;
const pairs=[];
for(let i=0;i<192;i++){
 const r=geometryReport.pairs[i];if(r.pair!==i)throw Error('QA pair order changed');const raw=JSON.parse(readBound(path.join(qaRoot,r.path),r));
 if(raw.pair!==i||JSON.stringify(raw.scalarGrid)!==JSON.stringify(source.grid))throw Error('QA geometry grid/clock changed');
 const prisms=[];
 for(const p of raw.prisms){
  const canonical={...p,lower:source.grid.origin[2]+p.band*source.grid.spacing[2],upper:source.grid.origin[2]+(p.band+1)*source.grid.spacing[2]};
  if(p.lower!==canonical.lower||p.upper!==canonical.upper)throw Error('Raw QA endpoints not exact scalar-index expressions');
  const clipped=floorPrism(canonical);if(!clipped){floorDiscarded++;continue;}
  if(clipped.lower!==p.lower){floorAffected++;floorMovedVertices+=p.hull.length;}
  if(clipped.lower<0||clipped.upper<=clipped.lower)throw Error('Floor clip failed');
  prisms.push(clipped);peakHull=Math.max(peakHull,p.hull.length);
 }
 for(let j=1;j<prisms.length;j++)if(prisms[j-1].upper>prisms[j].lower)throw Error('Overlapping integration height bands');
 const parts=prisms.map(prismGeometry),vertices=parts.reduce((n,p)=>n+p.vertices.length/3,0),triangles=parts.reduce((n,p)=>n+p.indices.length/3,0);
 if(parts.some(p=>p.vertices.filter((_,j)=>j%3===2).some(z=>z<0)))throw Error('Actual render mesh retains negative floor geometry');
 peakPrisms=Math.max(peakPrisms,prisms.length);peakVertices=Math.max(peakVertices,vertices);peakTriangles=Math.max(peakTriangles,triangles);
 pairs.push({pair:i,frames:[i+1,i+2],prisms});
}
if(floorAffected!==192||floorMovedVertices!==1769||floorDiscarded!==0||peakPrisms!==92||peakHull!==28)throw Error('Measured V5 geometry/floor witness changed');
// Create the new closure only after every pre-import pin has passed. It remains
// an unaccepted candidate if a later bounded packaging check fails.
fs.mkdirSync(output);write(path.join(output,'input.json'),fs.readFileSync(inputPath));write(path.join(output,'plan.json'),planBytes);
fs.mkdirSync(asset);write(path.join(asset,'.gitattributes'),'*.js text eol=lf\n*.json text eol=lf\n*.fzp.gz -text\n');
for(const [name,bytes]of Object.entries(codecBytes))write(path.join(asset,'payload',name),bytes);
for(const [name,pin]of Object.entries(plan.pureSources))write(path.join(asset,name),readBound(path.join(root,pin.source),pin));
for(const name of ['index.js','floor.js'])write(path.join(asset,name),fs.readFileSync(path.join(here,'templates',name==='index.js'?'index.js.txt':name)));
const {encodeZeroLiteral,decodeZeroLiteral,packetRawBytes}=await import(pathToFileURL(path.join(asset,'payload/codec.js')).href);
const records=[],chunks=[],resources=[],fieldChecks=[],coverage={sourceFrames:193,channels:['density','flame'],positiveCentres:0,nonemptyRows:0,pairRowWitnesses:0,allPositiveAboveFloorCovered:true,halfOpenOwnersExactlyOne:true};
let offset=0,compressedBytes=0,originalBytes=0,maxResident=0,peakFramePacketBytes=0,peakChunkGzipBytes=0;
function coverFrame(values,index){
 const [nx,ny,nz]=source.grid.resolution,[hx,hy,hz]=source.grid.spacing;
 const relevant=[...(index>0?[pairs[index-1]]:[]),...(index<192?[pairs[index]]:[])];
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++){
  let min=nx,max=-1,count=0;for(let x=0;x<nx;x++)if(values[x+nx*(y+ny*z)]>0){min=Math.min(min,x);max=Math.max(max,x);count++;}
  if(max<0)continue;coverage.positiveCentres+=count;coverage.nonemptyRows++;const height=source.grid.origin[2]+z*hz;
  if(height<0)throw Error('A positive centre would be excluded by floor0');
  for(const pair of relevant){
   const owning=pair.prisms.filter(p=>prismOwnsHeight(p,height));if(owning.length!==1)throw Error('Positive row does not have one strict half-open slab owner');const prism=owning[0];
   for(const x of [min,max])if(!footprintContains(prism,[source.grid.origin[0]+x*hx,source.grid.origin[1]+y*hy]))throw Error('Positive row escaped floor-clipped support');
   coverage.pairRowWitnesses++;
  }
 }
}
try{
 for(let i=0;i<193;i++){
  guard();const frame=source.manifest.samples[i],packets=[],recordIds=[],chunkOffset=offset;
  for(const channel of ['density','temperature','flame']){
   const {bytes,values,record:original}=source.read(i,channel),packet=encodeZeroLiteral(bytes),roundtrip=new Uint8Array(bytes.length);if(packetRawBytes(packet)!==bytes.length)throw Error('Scalar packet extent changed');
   decodeZeroLiteral(packet,roundtrip);if(sha(roundtrip)!==original.sha256||!Buffer.from(roundtrip).equals(bytes))throw Error('Original scalar bit roundtrip failed');
   if(channel!=='temperature')coverFrame(values,i);
   const id=records.length;records.push({id,frame:frame.frame,channel,offset,packetBytes:packet.byteLength,packetSha256:sha(packet),rawBytes:bytes.length,rawSha256:original.sha256});recordIds.push(id);packets.push(packet);offset+=packet.byteLength;originalBytes+=bytes.length;fieldChecks.push({frame:frame.frame,channel,bytes:bytes.length,sha256:original.sha256});
  }
  const sparse=Buffer.concat(packets),gzip=gzipSync(sparse,{level:9}),decoded=gunzipSync(gzip);if(!decoded.equals(sparse))throw Error('Whole-frame gzip roundtrip failed');
  const name='frame-'+String(i).padStart(3,'0')+'.fzp.gz',resourcePath=plan.assetRoot+'/data/'+name;
  if(sparse.length>plan.limits.chunkSparseBytes||gzip.length>plan.limits.chunkCompressedBytes)throw Error('Per-frame chunk budget failed; no precision/filter/cap workaround');
  chunks.push({id:i,offset:chunkOffset,sparseBytes:sparse.length,gzipBytes:gzip.length,gzipSha256:sha(gzip),resourcePath,recordIds,kind:'fzp2-gzip'});
  resources.push({path:resourcePath,kind:'fzp2-gzip',bytes:gzip.length,sha256:sha(gzip),uncompressedBytes:sparse.length});write(path.join(asset,'data',name),gzip);compressedBytes+=gzip.length;
  peakFramePacketBytes=Math.max(peakFramePacketBytes,sparse.length);peakChunkGzipBytes=Math.max(peakChunkGzipBytes,gzip.length);maxResident=Math.max(maxResident,process.memoryUsage().rss);
  if(offset>plan.limits.sparseBytes||compressedBytes>plan.limits.compressedBytes||chunks.length>plan.limits.chunks)throw Error('Aggregate payload ceiling failed; preserve failed sizing without changing fields');
  if(i%24===0)console.log(JSON.stringify({phase:'exact-V5-packaging',frame:i+1,roundtrips:records.length,sparseBytes:offset,compressedBytes,elapsedMs:performance.now()-started}));
 }
 const modules=[];
 for(let first=0;first<192;first+=4){const part=pairs.slice(first,first+4),name='part-'+String(modules.length).padStart(3,'0')+'.js',bytes=Buffer.from('export const pairs='+JSON.stringify(part)+';\n');write(path.join(asset,'geometry',name),bytes);geometryBytes+=bytes.length;modules.push(name);}
 const geometryMetrics={pairCount:192,maxHullVertices:peakHull,maxPrisms:peakPrisms,maxVertices:peakVertices,maxIndices:peakTriangles*3,sourceJsonBytes:geometryBytes,rawQaReportSha256:plan.geometryReportSha256,floor:{nativeY:0,affectedPairPrisms:floorAffected,movedNegativeVertices:floorMovedVertices,discardedPrisms:floorDiscarded,excludesReconstructedContributionBelowFloor:true,rawFieldsUnchanged:true},ownership:'Immutable current/next onevoxel hulls in disjoint height bands; explicitly floor-clipped mesh AND slab. One interval/ray/slab.'};
 const geometryIndex=modules.map((n,i)=>"import {pairs as p"+i+"} from "+String.fromCharCode(39)+"./geometry/"+n+String.fromCharCode(39)+";").join('\n')+'\nconst pairs=['+modules.map((_,i)=>'...p'+i).join(',')+'];\nexport function supportPair(index){if(!Number.isInteger(index)||index<0||index>=192)throw Error(\'Finite support pair outside asset\');return pairs[index];}\nexport const GEOMETRY_METRICS='+JSON.stringify(geometryMetrics)+';\n';write(path.join(asset,'geometry-data.js'),geometryIndex);
 const metadata={version:2,source:{...plan.sourcePins,provenance:{authoringCommit:'d40dafa3eef0796a15172300d528bc26c72f7f76',assemblyProposalCommit:plan.assemblyProposalCommit,codecCommit:review.sourceCommit,scope:plan.scope}},frames:source.manifest.samples.map(s=>({frame:s.frame,timeSeconds:s.ageSeconds,resolution:s.resolution})),records,chunks,sparseBytes:offset};
 const presentation={grid:source.grid,contactBandHeight:source.manifest.samples[0].contactBandHeight,translation:plan.translation,burnSeconds:3.2,tailSeconds:3.2,tailFadeSeconds:.4,floorNativeY:0,geometryQaReportSha256:plan.geometryReportSha256,scope:'All optics byte-identical; source/pair-specific approved upper overhang, lowerA/taper, floor0 and actual all-height burnout gate'};
 write(path.join(asset,'metadata.js'),'export const FIELD_METADATA='+JSON.stringify(metadata)+';\nexport const PRESENTATION='+JSON.stringify(presentation)+';\n');
 const files=[];function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())visit(f);else if(e.name.endsWith('.js'))files.push(f);}}visit(asset);
 const runtimeFiles=files.sort().map(file=>{const bytes=fs.readFileSync(file);if(bytes.includes(13))throw Error('Runtime code must be rawLF');return{path:path.relative(root,file).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};}),esmBytes=runtimeFiles.reduce((n,r)=>n+r.bytes,0),denseBytes=source.grid.resolution.reduce((a,b)=>a*b,1)*32,geometryPoolBytes=peakPrisms*(peakHull*2*3*4+(peakHull*4-4)*3*2);
 if(esmBytes>plan.limits.sourceBytes||records.length!==579||chunks.length!==193||originalBytes!==512262144)throw Error('Complete closure/data budget gate failed');
 const manifest={version:1,id:'tinderbox-fluid-surface-v5-contact-prototype',artistVersion:'0.1.0-finite-surface-fluid-contact-prototype',status:'unaccepted-finite-source-native-prototype',referenceFrozen:false,optimizedAvailable:false,factoryExport:'createFluidSurfaceContactReference',prepareExport:'prepareFluidSurfaceContactData',runtimeFiles,runtimeResources:resources,sourceRawManifestSha256:source.manifestSha256,sourcePins:plan.sourcePins,provenance:{assemblyProposalCommit:plan.assemblyProposalCommit,codec:{sourceCommit:review.sourceCommit,architectApprovalCommit:review.architectApprovalCommit,modules:review.modules},pureSources:plan.pureSources,rawQaReportSha256:plan.geometryReportSha256},sourceLifetime:'193actual samples0..6.4inclusive at30Hz; observed canonical four-cell birth/burnout world clocks;3.2s burn,<=3.2s smoke tail with declared final.4s fade; no sustained-source benchmark/loop',sourceOwnership:'Exact four grass source cells. Authoritative lowerA/inward taper; measured source/pair halos approved abovecontact. Actual burnout gates ALL reaction heights. No new heat, fuel or ignition.',nativeContract:'Shared caller Three, current same-camera opaque depth, native metres/NoToneMapping/sRGB. No renderer, asset fetch, dynamic import or async perframe.',pipeline:'Exact original f32LE bits through architect-reviewed FZP2; coldboot verified transfer+boundedprepare; two directRGBA slots, no planar frame cache',geometry:geometryMetrics,floorPresentation:'Explicit physical clip of mesh AND ray slabs at nativeY0. Raw scalar arrays and all positive centres retained; nonzero reconstructed interpolation belowfloor is deliberately excluded.',sourcePhotosUsedAtRuntime:false,limits:{esmBytes,compressedBytes,sparseBytes:offset,resources:resources.length,rgbaCpuBytes:denseBytes,rgbaGpuBytes:denseBytes,geometryCpuBytes:geometryPoolBytes,geometryGpuBytes:geometryPoolBytes},reviewLimitations:'This V5 surface-source candidate has not been rendered/reviewed. Prior fluid candidate failed4/10. No Rfreeze, optimized asset, cost acceptance, sustained-source matrix, promotion or publication.'};
 write(path.join(asset,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const report={version:1,status:'source-packaging-and-positive-coverage-pass-native-review-required',startedUtc,finishedUtc:new Date().toISOString(),elapsedMs:performance.now()-started,sourcePlanSha256:sha(planBytes),sourceEntrySha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),sourcePins:plan.sourcePins,codecReview:review,assetRoot:plan.assetRoot,all579OriginalScalarRoundtrips:true,all193GzipRoundtrips:true,originalScalarBytes:originalBytes,sparseBytes:offset,compressedBytes,peakFramePacketBytes,peakChunkGzipBytes,esmBytes,geometry:geometryMetrics,positiveCoverage:coverage,resources:{perFactoryDenseCpuBytes:denseBytes,perFactoryDenseGpuBytes:denseBytes,perFactoryGeometryCpuBytes:geometryPoolBytes,perFactoryGeometryGpuBytes:geometryPoolBytes,documentSharedSparseBytes:offset,documentGeometrySourceBytes:geometryBytes,observedGeneratorPeakSampledRssBytes:maxResident,unmeasured:'Engine/driver/JavaScript objects/crypto/GC; source compression scratch is generation-only, not factory ownership'},manifest:record(path.join(asset,'manifest.json')),limits:plan.limits,scope:plan.scope};
 write(path.join(output,'original-channel-roundtrips.json'),JSON.stringify({rawManifestSha256:source.manifestSha256,hashes:fieldChecks},null,2)+'\n');write(path.join(output,'assembly-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}catch(error){fs.writeFileSync(path.join(output,'FAILED.json'),JSON.stringify({error:String(error),stack:error.stack,elapsedMs:performance.now()-started,assetRoot:plan.assetRoot,partialOutputsPreserved:true},null,2)+'\n',{flag:'wx'});throw error;}
