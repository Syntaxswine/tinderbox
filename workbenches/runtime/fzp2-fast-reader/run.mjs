import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import v8 from 'node:v8';
import {PAYLOAD_LIMITS} from './candidate.js';
import {ORIGINAL_PINS,inside,readExact,sha256,loadOriginalV5} from './dataset.mjs';
import {executeFixedProtocol,summarizeProtocol,WARMUP_FRAME} from './protocol.mjs';

export const SOURCE_FILES=Object.freeze(['candidate.js','protocol.mjs','dataset.mjs','run.mjs']);
const CODEC={path:'assets/art/fire-realism/field-payload-v2/codec.js',bytes:6418,sha256:'5a3fa557caa064097405e55f0fe6b56af1a034520be4aaf5cdc8bf75fd5793d0'};
export function validateSpec(spec){
 const keys=['version','sourceCommit','projectRoot','outputDirectory','dossierPath','stopPath','expectedSources'];
 if(!spec||Object.getPrototypeOf(spec)!==Object.prototype||Object.keys(spec).length!==keys.length||keys.some(k=>!Object.hasOwn(spec,k))||spec.version!==1||!/^[a-f0-9]{40}$/.test(spec.sourceCommit))throw Error('Exact bounded probe specification required');
 for(const key of ['projectRoot','outputDirectory','dossierPath','stopPath'])if(typeof spec[key]!=='string'||!spec[key])throw Error('Nonempty probe paths required');
 if(!spec.expectedSources||Object.keys(spec.expectedSources).length!==SOURCE_FILES.length)throw Error('Complete source pin inventory required');
 for(const name of SOURCE_FILES){const r=spec.expectedSources[name];if(!r||Object.keys(r).length!==2||!Number.isSafeInteger(r.bytes)||r.bytes<1||r.bytes>PAYLOAD_LIMITS.sourceBytes||!/^[a-f0-9]{64}$/.test(r.sha256||''))throw Error('Invalid exact source pin: '+name);}
 if(CODEC.bytes+SOURCE_FILES.reduce((n,name)=>n+spec.expectedSources[name].bytes,0)>PAYLOAD_LIMITS.sourceBytes)throw Error('QA source aggregate exceeds ceiling');
 return spec;
}
export function sparsitySummary(protocol,workloads){
 const bins=[['all-positive-zero',w=>w.nonPositiveZeroWords===0],['(0,25%]',w=>w.nonPositiveZeroFraction>0&&w.nonPositiveZeroFraction<=.25],['(25%,75%]',w=>w.nonPositiveZeroFraction>.25&&w.nonPositiveZeroFraction<=.75],['(75%,100%]',w=>w.nonPositiveZeroFraction>.75]];
 return {definition:'Fraction of all three scalar streams that is not the positive-zero uint32 word. Includes signed zero/special bits if present. Fixed bins declared before actual data execution.',bins:Object.fromEntries(bins.map(([name,contains])=>{const ids=workloads.filter(contains).map(w=>w.frame),frames=protocol.frames.filter(f=>ids.includes(f.frame));return [name,{frames:ids,timings:summarizeProtocol({...protocol,frames}).bins.all}];}))};
}

/** Does not run on import. Actual use additionally needs the architect's reviewed
 * launch/spec/source pins and finite identity-owning wrapper; source flag is not
 * itself authorization. No self-spawn, artist import, browser or OS Job exists. */
export async function main(args=process.argv.slice(2)){
 if(args.length!==3||args[0]!=='--execute-approved-probe'||!/^[a-f0-9]{64}$/.test(args[2]||''))throw Error('Usage after separate root approval: node --max-old-space-size=512 run.mjs --execute-approved-probe SPEC.json SPEC_SHA256');
 const began=performance.now(),sampledPeaks={rss:0,heapUsed:0,external:0,arrayBuffers:0,checkpoints:0};
 let stopPath=null,output=null,dataset=null,result=null,stage='spec',ownedOutput=false;
 const observeMemory=()=>{const m=process.memoryUsage();for(const key of ['rss','heapUsed','external','arrayBuffers'])sampledPeaks[key]=Math.max(sampledPeaks[key],m[key]||0);sampledPeaks.checkpoints++;};
 const check=()=>{observeMemory();if(performance.now()-began>180000)throw Error('Finite180-second probe deadline exceeded');if(stopPath&&existsSync(stopPath))throw Error('Owned probe STOP requested');};
 try{
  const oldSpace=process.execArgv.find(a=>/^--max-old-space-size=/.test(a));if(oldSpace!=='--max-old-space-size=512')throw Error('Approved512MiB old-space flag required; it is not a total-RSS limit');
  const specPath=path.resolve(args[1]),stat=await fs.stat(specPath);if(!stat.isFile()||stat.size<1||stat.size>65536)throw Error('Bounded specification byte limit');
  const specRaw=await readExact(specPath,{bytes:stat.size,sha256:args[2]},{maxBytes:65536,check}),spec=validateSpec(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(specRaw)));
  const root=await fs.realpath(spec.projectRoot),here=fileURLToPath(new URL('.',import.meta.url)),codeRoot=await fs.realpath(path.resolve(here,'../../..'));
  if(root!==codeRoot)throw Error('Run only the reviewed source intake in its declared project root');
  const qa=inside(root,'artifacts/qa');output=inside(qa,inside(root,spec.outputDirectory));stopPath=inside(qa,inside(root,spec.stopPath));
  const sources={};let codeBytes=CODEC.bytes;
  for(const name of SOURCE_FILES){const raw=await readExact(path.join(here,name),spec.expectedSources[name],{maxBytes:PAYLOAD_LIMITS.sourceBytes,check});sources[name]={bytes:raw.length,sha256:sha256(raw)};codeBytes+=raw.length;}
  await readExact(inside(root,CODEC.path),CODEC,{maxBytes:PAYLOAD_LIMITS.sourceBytes,check});if(codeBytes>PAYLOAD_LIMITS.sourceBytes)throw Error('QA source aggregate exceeds ceiling');
  // Parent must prepare the task area; never adopt/overwrite an old result dir.
  await fs.mkdir(output);ownedOutput=true;const framesPath=path.join(output,'frames.jsonl');await fs.writeFile(framesPath,'',{flag:'wx'});
  result={version:1,kind:'actual-original-V5-fixed-reader-CPU-probe',status:'running',sourceCommit:spec.sourceCommit,sourceCommitScope:'Declared by reviewed exact launch spec; this runner spawns no Git process.',sourcePins:sources,canonicalCodec:CODEC,spec:{bytes:specRaw.length,sha256:args[2]},runtime:{node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,pid:process.pid,requestedOldSpaceMiB:512,heapSizeLimitBytes:v8.getHeapStatistics().heap_size_limit},limits:PAYLOAD_LIMITS,warmupFrame:WARMUP_FRAME,stage};
  stage='staging';dataset=await loadOriginalV5({projectRoot:root,dossierPath:spec.dossierPath,sourceOverheadBytes:codeBytes,check,onProgress:p=>console.log(JSON.stringify(p))});check();
  result.originalInputs=dataset.inputPins;result.staging=dataset.metrics;
  stage='fixed-comparison';const protocol=await executeFixedProtocol({frames:dataset.metadata.frames,records:dataset.metadata.records,packetStore:dataset.packetStore,check,onFrame:async row=>{await fs.appendFile(framesPath,JSON.stringify(row)+'\n');console.log(JSON.stringify({stage:'compared',frame:row.frame}));}});
  result.protocol=protocol;result.summary=summarizeProtocol(protocol);result.sparsity=sparsitySummary(protocol,dataset.metrics.frameWorkloads);
  if(protocol.status!=='complete'||protocol.frames.length!==193||protocol.verifiedHashes.baseline!==579||protocol.verifiedHashes.candidate!==579||protocol.ownership.peakRGBABytes!==7077888||protocol.ownership.verificationScratchBytes!==884736)throw Error('Complete193-frame/579-per-implementation proof failed');
  result.status='complete';result.decision='Exact CPU protocol completion only. Slower/ambiguous data stays unaccepted; no automatic speedup or integration decision.';
 }catch(error){
  result={...(result||{version:1,kind:'actual-original-V5-fixed-reader-CPU-probe'}),status:'failed',stage,error:{name:error.name,message:error.message},...(error.stageMetrics?{partialStaging:error.stageMetrics}:{})};
 }finally{
  if(dataset)dataset.packetStore=null;dataset=null;observeMemory();
  result.elapsedWallMs=performance.now()-began;result.sampledProcessPeaks=sampledPeaks;
  result.memoryScope='Discrete process.memoryUsage samples, not kernel high-water or hard RSS limit.512MiB limits old space only. Wrapper owns native PID/creation/peak/exit receipts; native gzip/crypto/compiler/GC are not explicit-buffer accounting.';
  result.explicitOwnedPacketStoreBytesAfter=0;result.scope='One original packet store/read/inflation pass; full validation-before-writes and both decoding passes; no artist factory, GPU, source/field change, browser or quality/cost acceptance.';
  if(ownedOutput)try{await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});}catch(error){result.outputError={name:error.name,message:error.message};result.status='failed';console.error(JSON.stringify(result.outputError));}
 }
 console.log(JSON.stringify({status:result.status,stage:result.stage||stage,elapsedWallMs:result.elapsedWallMs,output:ownedOutput?output:null}));
 process.exitCode=result.status==='complete'?0:2;return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
