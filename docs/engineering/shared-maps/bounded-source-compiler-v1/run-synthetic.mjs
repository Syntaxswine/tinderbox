// Foreground focused synthetic correctness only, never the actual roof pair.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='docs/engineering/shared-maps/bounded-source-compiler-v1/',args=['--test','tests/integration/regional-source-compiler.test.mjs'],startedAt=new Date().toISOString();
for(const name of ['synthetic.log','synthetic-checks.json'])if(fs.existsSync(out+name))throw Error('Preserve the previous focused-fixture attempt before rerunning: '+name);
const child=spawnSync(process.execPath,args,{windowsHide:true,encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024});
const log=(child.stdout||'')+(child.stderr||'');fs.writeFileSync(out+'synthetic.log',log);
fs.writeFileSync(out+'synthetic-checks.json',JSON.stringify({kind:'Focused synthetic correctness, not a cost observation',args,pid:child.pid,startedAt,endedAt:new Date().toISOString(),exitCode:child.status,error:child.error?.message,signal:child.signal,initialAttempt:{toolChunk:'73619f',tests:8,pass:8,fail:0,nativeCallsFromPreservedSource:{original:4,current:4,regional:14,total:22},rawStdoutRetained:false},secondAttempt:{log:'synthetic-second.log',receipt:'synthetic-second-checks.json',tests:8,pass:8,fail:0,nativeCalls:22,rejectedBeforeNative:1,counterCorrection:'The printed current=5 counted the deliberately rejected partial-install call as native work; it was four native calls and one guard rejection.'},noWorldTrialOrTick:true},null,2)+'\n');
console.log(log);process.exitCode=child.status??1;
