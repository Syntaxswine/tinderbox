import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='artifacts/qa/shared-map-runtime/contact-live-retirement-v1/',archive='docs/engineering/shared-maps/contact-live-v1/';
const baseline=['source-continuity','source-support','source-activation','source-carriers','source-partition-error','shared-map-support-controls','shared-map','actor-support','shared-map-host-diff'].map(n=>'tests/integration/'+n+'.test.mjs');
const archived=[archive+'candidate-payload/tests/integration/source-contact-reach.test.mjs',archive+'candidate-payload/tests/integration/source-support.test.mjs',...baseline.filter(p=>!p.endsWith('/source-support.test.mjs'))];
const commands=[['declaration',['tools/record-shared-map-runtime.mjs','--check']],['loader-pins',[archive+'candidate-loader.mjs','--check']],['baseline-focused',['--test',...baseline]],['archived-candidate-focused',['--import','./'+archive+'candidate-loader.mjs','--test',...archived]]];
const receipt={owner:'Coder Tinderbox',purpose:'Verify restored accepted baseline and preserved archived candidate tests; no performance measurement',startedAt:new Date().toISOString(),steps:[]};
for(const [name,args]of commands){
 const startedAt=new Date().toISOString(),result=spawnSync(process.execPath,args,{windowsHide:true,encoding:'utf8',maxBuffer:2*1024*1024,timeout:60000}),log=(result.stdout||'')+(result.stderr||'');fs.writeFileSync(out+name+'.log',log);
 receipt.steps.push({name,args,pid:result.pid,startedAt,endedAt:new Date().toISOString(),status:result.status,signal:result.signal,error:result.error?.message});fs.writeFileSync(out+'checks.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt.steps.at(-1)));console.log(log.slice(-650));
 if(result.status!==0){process.exitCode=result.status??1;break;}
}
