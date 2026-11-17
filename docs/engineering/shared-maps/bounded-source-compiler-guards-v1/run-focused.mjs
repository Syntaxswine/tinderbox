// Finite foreground synthetic tests only; the actual roof grant is spent.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='docs/engineering/shared-maps/bounded-source-compiler-guards-v1/',id=process.argv[2]||'first';
if(!/^[a-z0-9-]+$/.test(id))throw Error('Expected a plain attempt ID');
for(const ext of ['log','json'])if(fs.existsSync(out+id+'.'+ext))throw Error('Preserve the previous attempt: '+id);
const args=['--test','tests/integration/regional-source-compiler.test.mjs','tests/integration/regional-source-guards.test.mjs'],startedAt=new Date().toISOString();
const child=spawnSync(process.execPath,args,{windowsHide:true,encoding:'utf8',timeout:20000,maxBuffer:1024*1024}),log=(child.stdout||'')+(child.stderr||'');
fs.writeFileSync(out+id+'.log',log);fs.writeFileSync(out+id+'.json',JSON.stringify({purpose:'Focused synthetic receipt/span/carry guards and unchanged-default fixtures',owner:'Coder Tinderbox',executable:process.execPath,node:process.version,args,pid:child.pid,startedAt,endedAt:new Date().toISOString(),exitCode:child.status,error:child.error?.message,signal:child.signal,timeoutMs:20000,backgroundHelpers:[],ports:[],actualRoofReruns:0,noAutomaticReplay:true},null,2)+'\n');
console.log(log);process.exitCode=child.status??1;
