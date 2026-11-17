// Finite pure geometry fixtures only; no compiler/world/proof entry point.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='docs/engineering/shared-maps/regional-query-kernel-v1/',attempt=process.argv[2]||'first';
if(!/^[a-z0-9-]+$/.test(attempt)||fs.existsSync(out+'synthetic-'+attempt+'.json'))throw Error('Use a new plain attempt name; preserve earlier results');
const args=['--test','tests/integration/regional-effective-query.test.mjs'],startedAt=new Date().toISOString(),child=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:1024*1024}),log=(child.stdout||'')+(child.stderr||'');
fs.writeFileSync(out+'synthetic-'+attempt+'.log',log);fs.writeFileSync(out+'synthetic-'+attempt+'.json',JSON.stringify({owner:'Coder Tinderbox',purpose:'Pure manual source/native query fixtures',args,pid:child.pid,executable:process.execPath,startedAt,endedAt:new Date().toISOString(),exitCode:child.status,signal:child.signal,error:child.error?.message,timeoutMs:20000,nativeCompilerCalls:0,worldTrials:0,worldSteps:0,ports:[],retainedHelpers:[]},null,2)+'\n');console.log(log);process.exitCode=child.status??1;
