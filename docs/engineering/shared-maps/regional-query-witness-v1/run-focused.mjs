// Finite manual-query controls only. Never starts a server or native compiler.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='docs/engineering/shared-maps/regional-query-witness-v1/',attempt=process.argv[2];
if(!/^[a-z0-9-]+$/.test(attempt||'')||fs.existsSync(out+'focused-'+attempt+'.json'))throw Error('Named fresh attempt required');
const args=['--test','tests/integration/regional-effective-query.test.mjs','tests/integration/regional-query-boundaries.test.mjs','tests/integration/regional-query-witness.test.mjs'],startedAt=new Date().toISOString();
const child=spawnSync(process.execPath,args,{windowsHide:true,encoding:'utf8',timeout:20000,maxBuffer:1024*1024});
const log=(child.stdout||'')+(child.stderr||'');
fs.writeFileSync(out+'focused-'+attempt+'.log',log);
fs.writeFileSync(out+'focused-'+attempt+'.json',JSON.stringify({owner:'Coder Tinderbox',purpose:'Finite original and scoped containment-witness controls',args,pid:child.pid,executable:process.execPath,startedAt,endedAt:new Date().toISOString(),exitCode:child.status,error:child.error?.message,signal:child.signal,timeoutMs:20000,ports:[],retainedHelpers:[],nativeCompilerCalls:0,worldTrials:0,worldSteps:0},null,2)+'\n');
console.log(log);process.exitCode=child.status??1;
