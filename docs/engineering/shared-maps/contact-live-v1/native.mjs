import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const output='artifacts/qa/shared-map-runtime/contact-live-v1/',args=['tools/review/check-shared-map-integrated.mjs','--output=artifacts/qa/shared-map-runtime/contact-live-native-v1'],startedAt=new Date().toISOString();
const result=spawnSync(process.execPath,args,{windowsHide:true,encoding:'utf8',maxBuffer:2*1024*1024,timeout:60000});
fs.writeFileSync(output+'native.log',(result.stdout||'')+(result.stderr||''));
const receipt={owner:'Coder Tinderbox',purpose:'Original native source/route/registration integration gate',startedAt,endedAt:new Date().toISOString(),executable:process.execPath,args,pid:result.pid,status:result.status,signal:result.signal,error:result.error?.message};
fs.writeFileSync(output+'native-check.json',JSON.stringify(receipt,null,2)+'\n');console.log(result.stdout||'');console.log(result.stderr||'');console.log(JSON.stringify(receipt));process.exitCode=result.status??1;
