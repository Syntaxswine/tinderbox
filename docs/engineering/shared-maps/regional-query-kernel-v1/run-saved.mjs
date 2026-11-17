// One bounded saved-array comparison attempt; no automatic replay.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='docs/engineering/shared-maps/regional-query-kernel-v1/',attempt=process.argv[2]||'first';if(!/^[a-z0-9-]+$/.test(attempt)||fs.existsSync(out+'saved-launch-'+attempt+'.json'))throw Error('Preserve previous attempt');
const args=['--max-old-space-size=512',out+'compare-saved.mjs',attempt],startedAt=new Date().toISOString(),child=spawnSync(process.execPath,args,{windowsHide:true,encoding:'utf8',timeout:20000,maxBuffer:1024*1024}),log=(child.stdout||'')+(child.stderr||'');
fs.writeFileSync(out+'saved-'+attempt+'.log',log);fs.writeFileSync(out+'saved-launch-'+attempt+'.json',JSON.stringify({owner:'Coder Tinderbox',purpose:'Finite read-only saved-array effective query comparison',args,pid:child.pid,executable:process.execPath,startedAt,endedAt:new Date().toISOString(),exitCode:child.status,error:child.error?.message,signal:child.signal,timeoutMs:20000,ports:[],retainedHelpers:[],nativeCompilerCalls:0,worldTrials:0,worldSteps:0,noAutomaticReplay:true},null,2)+'\n');console.log(log);process.exitCode=child.status??1;
