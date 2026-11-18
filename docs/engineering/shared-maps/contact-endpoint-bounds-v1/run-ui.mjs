import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir='docs/engineering/shared-maps/contact-endpoint-bounds-v1/';
if(fs.existsSync(dir+'ui-run.json'))throw Error('Source example already attempted; preserve the receipt');
const args=[dir+'reconcile-ui-example.mjs'],sourcePins=[...args,'src/content/original-contact-adapter.js','src/content/map-source-geometry.js','src/content/map-source-shapes.js'].map(path=>({path,lfSha256:createHash('sha256').update(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n')).digest('hex')}));
const startedAt=new Date().toISOString(),child=spawnSync(process.execPath,args,{windowsHide:true,timeout:20000,encoding:'utf8',maxBuffer:1024*1024}),log=(child.stdout||'')+(child.stderr||'');
fs.writeFileSync(dir+'ui-run.log',log);fs.writeFileSync(dir+'ui-run.json',JSON.stringify({owner:'Coder Tinderbox',purpose:'Reconcile one committed UI source example without native compilation',args,sourcePins,pid:child.pid,executable:process.execPath,startedAt,endedAt:new Date().toISOString(),exitCode:child.status,signal:child.signal,error:child.error?.message,timeoutMs:20000,ports:[],retainedHelpers:[]},null,2)+'\n');console.log(log);process.exitCode=child.status??1;
