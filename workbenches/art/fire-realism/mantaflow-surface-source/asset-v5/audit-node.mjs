/** Bounded precommit WORKING-BYTE diagnostic through reviewed verification and
 * once-only preparation APIs. Not a descriptor/Git/browser/GPU acceptance claim.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,webcrypto} from 'node:crypto';
import {Readable} from 'node:stream';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../..'),inputFile=path.resolve(process.argv[2]??'');
const input=JSON.parse(fs.readFileSync(inputFile)),output=path.resolve(input.output),started=performance.now(),controller=new AbortController(),sha=b=>createHash('sha256').update(b).digest('hex');
if(!output.startsWith(path.join(root,'artifacts','qa','fire-realism')+path.sep)||fs.existsSync(output)||input.stopFile!==path.join(path.dirname(output),'stop')||input.wallLimitMs!==180000)throw Error('Fresh own-QA output, private STOP and checked180s deadline required');
const timer=setTimeout(()=>controller.abort(new DOMException('Finite node audit deadline','TimeoutError')),180000);
function guard(){if(performance.now()-started>=180000||fs.existsSync(input.stopFile))controller.abort(new Error('Finite node audit STOP/deadline'));if(controller.signal.aborted)throw controller.signal.reason;}
let scratch=null,prepared=null;const cleanupErrors=[];
try{
 guard();for(const r of input.verificationTools){const b=fs.readFileSync(path.join(input.verificationRoot,r.path));if(b.length!==r.bytes||sha(b)!==r.sha256)throw Error('Reviewed verification source changed:'+r.path);}
 const tools=await import(pathToFileURL(path.join(input.verificationRoot,'tools/fire-realism/delivery.js')).href),resources=await import(pathToFileURL(path.join(input.verificationRoot,'tools/fire-realism/resources.js')).href);
 const manifestPath='assets/art/fire-realism/fluid-contact-surface/manifest.json',entryPath='assets/art/fire-realism/fluid-contact-surface/index.js';if(fs.statSync(path.join(root,manifestPath)).size!==input.manifestBytes||input.manifestBytes>1024*1024)throw Error('Bounded manifest extent changed');const manifestBytes=fs.readFileSync(path.join(root,manifestPath));
 if(sha(manifestBytes)!==input.manifestSha256||manifestBytes.length!==input.manifestBytes)throw Error('Frozen candidate manifest changed');
 const verified=await tools.verifyFireRuntimeManifest({mode:'reference',manifestPath,entryPath,expectedManifest:{bytes:manifestBytes.length,sha256:sha(manifestBytes)},prepareExport:'prepareFluidSurfaceContactData',readBytes:async(relative,options={})=>{guard();const p=path.resolve(root,relative);if(!p.startsWith(root+path.sep))throw Error('Source escaped assigned tree');return resources.readBoundedFireResponse({body:Readable.toWeb(fs.createReadStream(p))},{...options,signal:options.signal??controller.signal});},cryptoImpl:webcrypto,signal:controller.signal});
 // EVERY candidate source/resource passes before the first asset import.
 guard();const namespace=await import(pathToFileURL(path.join(root,entryPath)).href),exports=Object.keys(namespace).sort();
 if(JSON.stringify(exports)!==JSON.stringify(['auditFluidSurfaceContactRGBA','createFluidSurfaceContactReference','fluidSurfaceContactPayloadEvidence','prepareFluidSurfaceContactData']))throw Error('Exact four-export ABI changed');
 prepared=await resources.prepareFireResources({prepare:namespace.prepareFluidSurfaceContactData,prepareExport:'prepareFluidSurfaceContactData',records:verified.manifest.runtimeResources,buffers:verified.resourceBuffers,signal:controller.signal,onCleanupError:c=>cleanupErrors.push(String(c))});
 const dossierFile=path.join(here,'expected-f32-hashes.json');if(fs.statSync(dossierFile).size!==96953)throw Error('Root-approved original dossier byte count changed');const dossier=fs.readFileSync(dossierFile);if(sha(dossier)!=='8b54b57824cb43d216015f85c2a454b482509d5241a6d221a8f6680d535e4c8e')throw Error('Root-approved original dossier hash changed');const original=JSON.parse(dossier),expected=new Map();if(original.hashes?.length!==579)throw Error('Original dossier requires exactly579 records');for(let i=0;i<579;i++){const r=original.hashes[i],channel=['density','temperature','flame'][i%3],frame=Math.floor(i/3)+1,key=frame+':'+channel;if(!r||r.frame!==frame||r.channel!==channel||r.bytes!==884736||!/^([a-f0-9]{64})$/.test(r.sha256)||expected.has(key))throw Error('Original dossier must contain exact193Ã—D/T/F keys');expected.set(key,r);}
 if(original.rawManifestSha256!==verified.manifest.sourceRawManifestSha256||expected.size!==579)throw Error('Original579 source dossier mismatch');
 const hashes=[],seen=new Set();let frames=0;
 await namespace.auditFluidSurfaceContactRGBA(async frame=>{
  guard();if(frame.frame!==frames+1||frame.timeSeconds!==frames/30||JSON.stringify(frame.resolution)!=='[48,48,96]')throw Error('Unexpected source frame/time/resolution order');const count=frame.resolution.reduce((a,b)=>a*b,1);if(!scratch)scratch=new Uint8Array(count*4);if(scratch.byteLength!==count*4||frame.rgba.byteLength!==count*16)throw Error('Unexpected two-slot RGBA extent');
  const data=new DataView(frame.rgba.buffer,frame.rgba.byteOffset,frame.rgba.byteLength),out=new DataView(scratch.buffer);
  for(const [lane,channel]of ['density','temperature','flame'].entries()){
   for(let i=0;i<count;i++)out.setUint32(i*4,data.getUint32(i*16+lane*4,true),true);
   const key=frame.frame+':'+channel;if(seen.has(key))throw Error('Repeated channel key');seen.add(key);const hash=sha(scratch),expectedRecord=expected.get(key);if(hash!==expectedRecord?.sha256||scratch.length!==expectedRecord.bytes)throw Error('Actual RGBA channel mismatch:'+frame.frame+':'+channel);hashes.push({frame:frame.frame,channel,bytes:scratch.length,sha256:hash});
  }
  frames++;if(frame.frame%32===0)console.log(JSON.stringify({phase:'actual-original579-RGBA-proof',frames,hashes:hashes.length,elapsedMs:performance.now()-started}));
 },{signal:controller.signal});
 const evidence=namespace.fluidSurfaceContactPayloadEvidence();if(frames!==193||hashes.length!==579||seen.size!==579||evidence.metrics.denseBytes!==0||evidence.metrics.peakDenseBytes!==7077888)throw Error('Incomplete193/two-slot release proof');
 const report={version:1,status:'precommit-working-byte-V5-579-RGBA-audit-pass',scope:'Actual dataset through reviewed source/resource verification and once-only prepare seam. No configured descriptor/Git identity/browser/GPU/visual/cost acceptance.',elapsedMs:performance.now()-started,manifest:verified.manifestRecord,sourceVerification:verified.hashes,resourceVerification:verified.resourceHashes,verificationTools:input.verificationTools,preparation:prepared.metadata,all579Matches:true,dossierPin:{bytes:96953,sha256:'8b54b57824cb43d216015f85c2a454b482509d5241a6d221a8f6680d535e4c8e',architectSourceCommit:'84b9dd05cbb77ade7f0d9ac753a2ee88b3abd7ed'},frames,hashes,resources:{sharedSparseBytes:evidence.metrics.sharedSparseBytes,denseBytesAfterAudit:evidence.metrics.denseBytes,peakDenseBytes:evidence.metrics.peakDenseBytes,independentVerificationScratchBytes:scratch.length,ownedEngineGpuMemory:'No GPU or renderer allocated; actual texture proof is separate',unmeasured:'Native crypto/JavaScript/GC residency'},evidence};
 prepared.cleanup();prepared=null;report.afterCleanup=namespace.fluidSurfaceContactPayloadEvidence().metrics;report.cleanupErrors=cleanupErrors;if(report.afterCleanup.sharedSparseBytes!==0||cleanupErrors.length)throw Error('Staged shared data not released at finite diagnostic end');
 fs.mkdirSync(output);fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,frames,hashes:hashes.length,sharedSparseBytes:report.resources.sharedSparseBytes,peakDenseBytes:report.resources.peakDenseBytes,denseBytesAfterAudit:report.resources.denseBytesAfterAudit,afterCleanup:report.afterCleanup,reportSha256:sha(fs.readFileSync(path.join(output,'audit.json'))),elapsedMs:performance.now()-started}));
}catch(error){prepared?.cleanup();fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'FAILED.json'),JSON.stringify({error:String(error),stack:error.stack,cleanupErrors,elapsedMs:performance.now()-started},null,2)+'\n');throw error;}
finally{scratch=null;clearTimeout(timer);}
