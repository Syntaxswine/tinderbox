import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='docs/engineering/shared-maps/regional-query-witness-v1/';
if(fs.existsSync(out+'additional-launch.json')||fs.existsSync(out+'additional-successor-results.json'))throw Error('Preserve the original recheck');
const args=[out+'recheck-additional.mjs'],startedAt=new Date().toISOString(),child=spawnSync(process.execPath,args,{windowsHide:true,encoding:'utf8',timeout:20000,maxBuffer:1024*1024}),log=(child.stdout||'')+(child.stderr||'');
fs.writeFileSync(out+'additional.log',log);
fs.writeFileSync(out+'additional-launch.json',JSON.stringify({owner:'Coder Tinderbox',purpose:'Exact two-case UI public query repro in coder checkout',args,pid:child.pid,executable:process.execPath,startedAt,endedAt:new Date().toISOString(),exitCode:child.status,error:child.error?.message,signal:child.signal,timeoutMs:20000,ports:[],retainedHelpers:[],nativeCompilerCalls:0,worldTrials:0,worldSteps:0},null,2)+'\n');
console.log(log);process.exitCode=child.status??1;
