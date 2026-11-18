import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {preflightSharedMapSourcePreparation,prepareSharedMapSourceInputs} from '../src/content/shared-map-source-preparation.js';
import {compileSharedMap} from '../src/content/shared-map.js';
import {sceneCompileDiagnostics} from '../workbenches/furnished-house/scene.js';
import {trialDiagnostics} from '../workbenches/furnished-house/simulation.js';
const dir='docs/engineering/shared-maps/new-york-source-preparation-v1/',runtime='assets/runtime/map-inputs/new-york/saddle6-01-v1/',grantCommit='b7958c76',grantPath='docs/engineering/shared-maps/new-york-source-preparation.md',budget={owners:38,parts:38,physicalTriangles:456},sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p)),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const pins={plan:'6c343fc882ce2b1f7b1b4225249519f9539c504cfeef3c7725dddad7df08448f',policy:'04106ad387ed05cced8cdbcc18204e4ca940c76b1a8131071824b3788cbd1a4b',index:'e9bee63a5a4afb0f8513d083b7e5f1ce83f25c0441ea543e14901b70e4e0cdab',library:'1e93eb730de7a978b01069df5401ea80d4ddebcff7d101010714e8b4643fc296'};
function metadata(){
  for(const [key,path]of [['plan',runtime+'pilot-plan.json'],['policy',runtime+'admission-policy.json'],['index','assets/runtime/map-sources/new-york/index.json'],['library','assets/runtime/map-sources/new-york/library.json']])if(sha(read(path))!==pins[key])throw Error('Pinned source preparation input changed: '+key);
  const descriptor=json(runtime+'pilot-plan.json'),policy=json(runtime+'admission-policy.json'),inventory=json('docs/engineering/shared-maps/existing-host-inputs-v1/metadata-inventory.json'),pendingBondIds=descriptor.support.bonds.slice(0,3).map(b=>b.id),preflight=preflightSharedMapSourcePreparation({descriptor,policy,inventory,budget,pendingBondIds});
  if(preflight.status!=='PREFLIGHT_READY'||Object.keys(budget).some(k=>preflight.counts[k]!==budget[k]))throw Error('Exact38-owner/part,456-triangle source preflight failed');
  const cells=descriptor.parts.map(p=>p.bounds.max.reduce((n,v,i)=>{const pitch=descriptor.grid.pitch[i],lo=Math.floor(p.bounds.min[i]/pitch+1e-7),hi=v-p.bounds.min[i]<1e-7?lo:Math.ceil(v/pitch-1e-7)-1;return n*(hi-lo+1);},1));if(Math.max(...cells)>288)throw Error('Selected metadata source span changed');
  return {descriptor,policy,pendingBondIds,preflight:{...preflight,admission:undefined,maxMetadataCells:Math.max(...cells)}};
}
async function child(){
  const allowance=json(dir+'actual-allowance.json');if(process.argv[3]!==allowance.token||!allowance.permitted)throw Error('Exact single-source allowance required');const lock=fs.openSync(dir+'actual-child-started.json','wx');fs.writeFileSync(lock,JSON.stringify({pid:process.pid,creationTime:new Date(performance.timeOrigin).toISOString(),startedAt:new Date().toISOString()}));fs.closeSync(lock);
  let compiled,result,failure;const outputs=[];
  const persist=(path,value)=>{write(path,value);outputs.push({path,bytes:fs.statSync(path).size,sha256:sha(read(path))});};
  try{
    const input=metadata(),index=json('assets/runtime/map-sources/new-york/index.json'),library=json('assets/runtime/map-sources/new-york/library.json'),navigation=json('assets/art/place-scenes/new-york/navigation.json');
    compiled=compileSharedMap(index,library,navigation);
    const loadProjection=async(ref,signal)=>{signal?.throwIfAborted();const raw=read(ref.path);if(sha(raw)!==ref.sha256)throw Error('Projection pin mismatch');return JSON.parse(raw);};
    result=await prepareSharedMapSourceInputs({compiled,descriptor:input.descriptor,policy:input.policy,budget,pendingBondIds:input.pendingBondIds,loadProjection,onWorldTable:table=>persist(dir+'selected-world.json',table),onBlueprints:b=>persist(dir+'selected-blueprints.json',b)});
    const {proposedDescriptor,admission,...mapping}=result;persist(dir+'proposed-plan.json',proposedDescriptor);const {plan,...report}=admission;persist(dir+'admission.json',report);persist(dir+'mapping.json',mapping);
  }catch(error){failure={message:error.message,stack:error.stack,preparation:error.preparation};persist(dir+'failure.json',failure);process.exitCode=1;}
  finally{
    const sourceMetrics=compiled?.metrics();compiled?.dispose();const metrics=compiled?.metrics(),compiler=sceneCompileDiagnostics(),trial=trialDiagnostics(),receipt={phase:'ACTUAL_SOURCE_ONLY',finished:!failure,status:result?.status??'FAILED_STOP_FOR_REVIEW',failure:failure??null,compiler,trial,geometry:metrics?.geometry,query:sourceMetrics?.query,outputs,actualSourceTransforms:metrics?.geometry.transformedQueries??0,maxTransforms:38,maxOriginalPhysicalTriangles:456,producers:0,supportEvaluations:0,clockSteps:0,rendererCalls:0,builds:0,ports:[],retainedHelpers:[]};write(dir+'actual-child-result.json',receipt);if(compiler.calls||trial.created||trial.steps||receipt.actualSourceTransforms>38||result&&result.resources.originalTriangles!==456){process.exitCode=1;throw Error('Actual source-only execution budget violation');}console.log(JSON.stringify({finished:receipt.finished,status:receipt.status,actualSourceTransforms:receipt.actualSourceTransforms,compiler,trial,outputs:outputs.map(o=>({path:o.path,bytes:o.bytes}))}));
  }
}

if(process.argv.includes('--source-child'))await child();
else{
  const input=metadata(),grant=execFileSync('git',['show',grantCommit+':'+grantPath],{windowsHide:true,maxBuffer:1024*1024});write(dir+'preflight.json',{...input.preflight,pins,grant:{commit:grantCommit,path:grantPath,sha256:sha(grant)},nativeCompiles:0,sourceTransforms:0});
  if(process.argv.includes('--actual-source-once')){
    const ready=json(dir+'synthetic-ready.json');if(!ready.passed||ready.groups!==30)throw Error('Passing finite synthetic preflight required');for(const p of ready.sourcePins)if(sha(read(p.path).toString().replace(/\r\n/g,'\n'))!==p.lfSha256)throw Error('Synthetic checked source changed: '+p.path);
    const token=randomUUID(),startedAt=new Date().toISOString(),allowance=fs.openSync(dir+'actual-allowance.json','wx');fs.writeFileSync(allowance,JSON.stringify({owner:'Coder Tinderbox',purpose:'One permitted source-only38-part preparation',permitted:true,token,grantCommit,grantPath,budget,startedAt,timeoutMs:30000}));fs.closeSync(allowance);
    const args=[fileURLToPath(import.meta.url),'--source-child',token],processResult=spawnSync(process.execPath,args,{windowsHide:true,timeout:30000,maxBuffer:1024*1024,encoding:'utf8'}),log=(processResult.stdout||'')+(processResult.stderr||'');fs.writeFileSync(dir+'actual.log',log);write(dir+'actual.json',{owner:'Coder Tinderbox',purpose:'One permitted38-part source-only preparation; no retry',pid:processResult.pid,creationTime:startedAt,startedAt,endedAt:new Date().toISOString(),executable:process.execPath,args:args.slice(0,2),exitCode:processResult.status,error:processResult.error?.message,timeoutMs:30000,maxTransforms:38,maxOriginalPhysicalTriangles:456,nativeAllowance:0,ports:[],retainedHelpers:[]});console.log(log.trim());process.exitCode=processResult.status||processResult.error?processResult.status||1:0;
  }else console.log(JSON.stringify({status:input.preflight.status,counts:input.preflight.counts,maxMetadataCells:input.preflight.maxMetadataCells,actualAttempted:false}));
}
