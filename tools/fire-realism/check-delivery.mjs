import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {FIRE_DELIVERY_PATH,canonicalFirePath,parseFireJson,verifyFireDeliveryDescriptor} from './delivery.js';
/** Read-only Git-blob proof. Does not import/evaluate an artist factory or create
 * a receipt. Browser verification alone cannot prove that a declared Git SHA
 * names an actual local commit; this mandatory configured-descriptor check can. */
export async function validateFireDeliveryRepository({root=process.cwd()}={}){
 const project=fs.realpathSync(root),descriptorFile=path.join(project,FIRE_DELIVERY_PATH);
 if(!fs.existsSync(descriptorFile))return {status:'unconfigured',descriptorPath:FIRE_DELIVERY_PATH,modes:[]};
 function currentBytes(file){canonicalFirePath(file);const absolute=path.join(project,...file.split('/')),relative=path.relative(project,fs.realpathSync(absolute));if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Delivery resource escapes repository');
  let walk=project;for(const part of file.split('/')){walk=path.join(walk,part);if(fs.lstatSync(walk).isSymbolicLink())throw Error('Delivery resources cannot be symbolic links');}if(!fs.statSync(absolute).isFile())throw Error('Expected delivery file');return new Uint8Array(fs.readFileSync(absolute));}
 const descriptor=parseFireJson(currentBytes(FIRE_DELIVERY_PATH),'descriptor'),verified=await verifyFireDeliveryDescriptor(descriptor,{readBytes:async file=>currentBytes(file),retainResources:false});
 const git=(...args)=>execFileSync('git',['-C',project,...args],{maxBuffer:32*1024*1024,windowsHide:true,stdio:['ignore','pipe','pipe']});
 function blob(commit,file){const row=git('ls-tree','-z',commit,'--',file).toString(),match=row.match(/^(100644|100755) blob [a-f0-9]{40}\t([^\0]+)\0$/);if(!match||match[2]!==file)throw Error('Named commit lacks a regular Git blob: '+file);return git('show',commit+':'+file);}
 const modes=[];
 for(const [mode,entry]of Object.entries(verified)){
  const commit=entry.record.sourceCommit;if(git('cat-file','-t',commit).toString().trim()!=='commit')throw Error('Delivery sourceCommit is not an actual Git commit');
  const files=[entry.record.manifestUrl,...entry.manifest.runtimeFiles.map(record=>record.path),...(entry.manifest.runtimeResources||[]).map(record=>record.path)];
  for(const file of files){const committed=blob(commit,file),current=currentBytes(file);if(!committed.equals(Buffer.from(current)))throw Error('Working bytes differ from named commit '+commit+':'+file);}
  modes.push({mode,sourceCommit:commit,manifest:entry.manifestRecord,runtimeFiles:entry.hashes,factoryModule:entry.record.factoryModule,factoryExport:entry.record.factoryExport,...(entry.resourceHashes?{prepareExport:entry.record.prepareExport,runtimeResources:entry.resourceHashes}:{}),receipt:entry.acceptance?{path:entry.record.acceptanceUrl,sha256:entry.record.acceptanceSha256,bytes:entry.record.acceptanceBytes}:null});
 }
 return {status:'configured-verified-git-blobs',descriptorPath:FIRE_DELIVERY_PATH,modes,limits:'Read-only byte/closure/commit proof, not factory execution, architect authorship, animated quality or GPU acceptance'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--root'))throw Error('Usage: node tools/fire-realism/check-delivery.mjs [--root PROJECT]');console.log(JSON.stringify(await validateFireDeliveryRepository({root:args[1]||process.cwd()}),null,2));}
 catch(error){console.error('Fire delivery Git-blob validation failed: '+error.message);process.exitCode=1;}
}
