import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=['source-contact-reach','source-continuity','source-support','source-activation','source-carriers','source-partition-error','shared-map-support-controls','shared-map','actor-support','shared-map-host-diff'].map(n=>'tests/integration/'+n+'.test.mjs');
const output='artifacts/qa/shared-map-runtime/contact-live-v1/',startedAt=new Date().toISOString();
const result=spawnSync(process.execPath,['--test',...files],{windowsHide:true,encoding:'utf8',maxBuffer:2*1024*1024,timeout:60000});
const log=(result.stdout||'')+(result.stderr||'');fs.writeFileSync(output+'focused.log',log);
const receipt={owner:'Coder Tinderbox',purpose:'Prior 46 controls plus separate ordered contact/live reach equivalence controls',startedAt,endedAt:new Date().toISOString(),executable:process.execPath,args:['--test',...files],pid:result.pid,status:result.status,signal:result.signal,error:result.error?.message};
fs.writeFileSync(output+'focused-check.json',JSON.stringify(receipt,null,2)+'\n');console.log(log.slice(-1800));console.log(JSON.stringify(receipt));process.exitCode=result.status??1;
