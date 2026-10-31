/** Bounded precommit WORKING-BYTE diagnostic through reviewed verification and
 * once-only preparation APIs. Not a descriptor/Git/browser/GPU acceptance claim.
 */
import fs from 'node:fs';
import {createOutputDirectory,plain} from '../half-rate-assessment/assess.mjs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,webcrypto} from 'node:crypto';
import {Readable} from 'node:stream';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),inputFile=path.resolve(process.argv[2]??'');
const input=JSON.parse(fs.readFileSync(inputFile)),output=path.resolve(input.output),started=performance.now(),controller=new AbortController(),sha=b=>createHash('sha256').update(b).digest('hex');
if(input.stopFile!==path.join(output,'stop')||input.wallLimitMs!==180000)throw Error('New diagnostic private STOP/180s required');
createOutputDirectory(path.join(root,'artifacts/qa/fire-realism/half-rate-diagnostic-asset'),output);
const timer=setTimeout(()=>controller.abort(new DOMException('Finite node audit deadline','TimeoutError')),180000);
function guard(){if(performance.now()-started>=180000||fs.existsSync(input.stopFile))controller.abort(new Error('Finite node audit STOP/deadline'));if(controller.signal.aborted)throw controller.signal.reason;}
const saveAudit=(name,value)=>{const b=Buffer.from(JSON.stringify(value,null,2)+'\n');if(b.length>2*1024**2)throw Error('Bounded2MiB audit report');fs.writeFileSync(path.join(output,name),b,{flag:'wx'});};
let scratch=null,prepared=null;const cleanupErrors=[];
try{
 guard();for(const r of input.verificationTools){const b=fs.readFileSync(path.join(input.verificationRoot,r.path));if(b.length!==r.bytes||sha(b)!==r.sha256)throw Error('Reviewed verification source changed:'+r.path);}
 const tools=await import(pathToFileURL(path.join(input.verificationRoot,'tools/fire-realism/delivery.js')).href),resources=await import(pathToFileURL(path.join(input.verificationRoot,'tools/fire-realism/resources.js')).href);
 const manifestPath='assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/manifest.json',entryPath='assets/art/fire-realism/fluid-contact-half-rate-diagnostic-02/index.js';if(fs.statSync(path.join(root,manifestPath)).size!==input.manifestBytes||input.manifestBytes>1024*1024)throw Error('Bounded manifest extent changed');const manifestBytes=fs.readFileSync(path.join(root,manifestPath));
 if(sha(manifestBytes)!==input.manifestSha256||manifestBytes.length!==input.manifestBytes)throw Error('Frozen candidate manifest changed');
 const verified=await tools.verifyFireRuntimeManifest({mode:'reference',manifestPath,entryPath,expectedManifest:{bytes:manifestBytes.length,sha256:sha(manifestBytes)},prepareExport:'prepareHalfRateDiagnosticData',readBytes:async(relative,options={})=>{guard();const p=path.resolve(root,relative);if(!p.startsWith(root+path.sep))throw Error('Source escaped assigned tree');return resources.readBoundedFireResponse({body:Readable.toWeb(fs.createReadStream(p))},{...options,signal:options.signal??controller.signal});},cryptoImpl:webcrypto,signal:controller.signal});
 // EVERY candidate source/resource passes before the first asset import.
 guard();const namespace=await import(pathToFileURL(path.join(root,entryPath)).href),exports=Object.keys(namespace).sort();
 if(JSON.stringify(exports)!==JSON.stringify(['auditHalfRateDiagnosticRGBA','createHalfRateContactDiagnostic','halfRateDiagnosticPayloadEvidence','prepareHalfRateDiagnosticData']))throw Error('Exact four-export ABI changed');
 prepared=await resources.prepareFireResources({prepare:namespace.prepareHalfRateDiagnosticData,prepareExport:'prepareHalfRateDiagnosticData',records:verified.manifest.runtimeResources,buffers:verified.resourceBuffers,signal:controller.signal,onCleanupError:c=>cleanupErrors.push(String(c))});
 const dossierFile=path.join(root,'artifacts/qa/fire-realism/half-rate-assessment/assessment-01/hashes.json');if(fs.statSync(dossierFile).size!==172625)throw Error('Accepted failed-study ledger extent changed');const dossier=fs.readFileSync(dossierFile);if(sha(dossier)!=='5447a6b8ce8b42f5043fe8bd4ced73c5e1260b1c44802197e91e87285f192f81')throw Error('Accepted ledger pin mismatch');const original=JSON.parse(dossier),expected=new Map();if(original.candidateFields?.length!==579||original.all579RawHashesVerified!==true)throw Error('Complete assessed original ledger required');for(let i=0;i<579;i++){const r=original.candidateFields[i],channel=['density','temperature','flame'][i%3],frame=Math.floor(i/3)+1,key=frame+':'+channel;if(r.frame!==frame||r.channel!==channel||r.bytes!==884736||!/^([a-f0-9]{64})$/.test(r.sha256)||expected.has(key))throw Error('Exact193 D/T/F ledger keys');expected.set(key,r);}
 if(verified.manifest.sourceRawManifestSha256!=='1a3bb8d2af92f6a9c7017ad37a49b76977baa227d94ae3a0cded781229a2c77e'||verified.manifest.rawGatesPassed!==false||verified.manifest.admitted!==false||verified.manifest.study?.id!=='cfe01-half-rate-terminal-diagnostic'||expected.size!==579)throw Error('Exact unadmitted failed-study candidate required');
 const hashes=[],seen=new Set();let frames=0;
 await namespace.auditHalfRateDiagnosticRGBA(async frame=>{
  guard();if(frame.frame!==frames+1||frame.timeSeconds!==frames/30||JSON.stringify(frame.resolution)!=='[48,48,96]')throw Error('Unexpected source frame/time/resolution order');const count=frame.resolution.reduce((a,b)=>a*b,1);if(!scratch)scratch=new Uint8Array(count*4);if(scratch.byteLength!==count*4||frame.rgba.byteLength!==count*16)throw Error('Unexpected two-slot RGBA extent');
  const data=new DataView(frame.rgba.buffer,frame.rgba.byteOffset,frame.rgba.byteLength),out=new DataView(scratch.buffer);
  for(const [lane,channel]of ['density','temperature','flame'].entries()){
   for(let i=0;i<count;i++)out.setUint32(i*4,data.getUint32(i*16+lane*4,true),true);
   const key=frame.frame+':'+channel;if(seen.has(key))throw Error('Repeated channel key');seen.add(key);const hash=sha(scratch),expectedRecord=expected.get(key);if(hash!==expectedRecord?.sha256||scratch.length!==expectedRecord.bytes)throw Error('Actual RGBA channel mismatch:'+frame.frame+':'+channel);hashes.push({frame:frame.frame,channel,bytes:scratch.length,sha256:hash});
  }
  frames++;if(frame.frame%32===0)console.log(JSON.stringify({phase:'actual-original579-RGBA-proof',frames,hashes:hashes.length,elapsedMs:performance.now()-started}));
 },{signal:controller.signal});
 const evidence=namespace.halfRateDiagnosticPayloadEvidence();if(frames!==193||hashes.length!==579||seen.size!==579||evidence.metrics.denseBytes!==0||evidence.metrics.peakDenseBytes!==7077888)throw Error('Incomplete193/two-slot release proof');
 const report={version:1,status:'precommit-half-rate-diagnostic-579-RGBA-pass-raw-gates-false',rawGatesPassed:false,admitted:false,scope:'Actual dataset through reviewed source/resource verification and once-only prepare seam. No configured descriptor/Git identity/browser/GPU/visual/cost acceptance.',elapsedMs:performance.now()-started,manifest:verified.manifestRecord,sourceVerification:verified.hashes,resourceVerification:verified.resourceHashes,verificationTools:input.verificationTools,preparation:prepared.metadata,all579Matches:true,dossierPin:{bytes:172625,sha256:'5447a6b8ce8b42f5043fe8bd4ced73c5e1260b1c44802197e91e87285f192f81',scope:'Accepted original failed-study assessment ledger, never a raw-validity receipt'},frames,hashes,resources:{sharedSparseBytes:evidence.metrics.sharedSparseBytes,denseBytesAfterAudit:evidence.metrics.denseBytes,peakDenseBytes:evidence.metrics.peakDenseBytes,independentVerificationScratchBytes:scratch.length,ownedEngineGpuMemory:'No GPU or renderer allocated; actual texture proof is separate',unmeasured:'Native crypto/JavaScript/GC residency'},evidence};
 prepared.cleanup();prepared=null;report.afterCleanup=namespace.halfRateDiagnosticPayloadEvidence().metrics;report.cleanupErrors=cleanupErrors;if(report.afterCleanup.sharedSparseBytes!==0||cleanupErrors.length)throw Error('Staged shared data not released at finite diagnostic end');
 saveAudit('audit.json',report);console.log(JSON.stringify({status:report.status,frames,hashes:hashes.length,sharedSparseBytes:report.resources.sharedSparseBytes,peakDenseBytes:report.resources.peakDenseBytes,denseBytesAfterAudit:report.resources.denseBytesAfterAudit,afterCleanup:report.afterCleanup,reportSha256:sha(fs.readFileSync(path.join(output,'audit.json'))),elapsedMs:performance.now()-started}));
}catch(error){prepared?.cleanup();saveAudit('FAILED.json',{error:String(error).slice(0,2048),stack:String(error.stack).slice(0,4096),cleanupErrors,elapsedMs:performance.now()-started});throw error;}
finally{scratch=null;clearTimeout(timer);}
