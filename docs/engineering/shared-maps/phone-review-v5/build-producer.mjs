import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';

const root=process.cwd(),out=path.resolve('artifacts/qa/shared-map-runtime/phone-review-v5');
const runtimeCommit='76290ae0ef5d08b2abdfcea5234f997f973b65e2',authority='822038cc7c3f3814f8aaa8e48c7973304b384fc2';
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
assert.equal(git('rev-parse','HEAD'),authority);
assert.equal(git('diff','--name-only',runtimeCommit,'--','src','assets','art','vendor','workbenches'),'');
const preserved=JSON.parse(fs.readFileSync('artifacts/qa/shared-map-runtime/phone-review-v5-preparation/preservation.json'));
assert.equal(hash(fs.readFileSync(preserved.path)),preserved.sha256);
fs.mkdirSync(out,{recursive:true});
fs.closeSync(fs.openSync(path.join(out,'single-build.lock'),'wx'));
const receipt={owner:'Coder Tinderbox',purpose:'One fresh checked package under exact M29 v5 browser grant',runtimeCommit,authority,cwd:root,startedAt:new Date().toISOString(),executable:process.execPath,steps:[]};
const save=()=>fs.writeFileSync(path.join(out,'build-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
save();
for(const script of ['tools/build.mjs','tools/check-release.mjs']){
 const startedAt=new Date().toISOString(),result=spawnSync(process.execPath,[script],{cwd:root,windowsHide:true,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
 const log=path.basename(script,'.mjs')+'.log';fs.writeFileSync(path.join(out,log),(result.stdout||'')+(result.stderr||''));
 receipt.steps.push({script,pid:result.pid,startedAt,endedAt:new Date().toISOString(),status:result.status,signal:result.signal,error:result.error?.message,log});save();
 assert.equal(result.status,0,script+' failed; do not rebuild or launch');
}
const bytes=fs.readFileSync('dist/build-manifest.json'),manifest=JSON.parse(bytes);
fs.writeFileSync(path.join(out,'build-manifest.json'),bytes);
receipt.manifestSha256=hash(bytes);receipt.files=manifest.files.length;receipt.bytes=manifest.files.reduce((n,f)=>n+f.bytes,0);receipt.endedAt=new Date().toISOString();receipt.passed=true;
fs.copyFileSync('docs/engineering/shared-maps/runtime-integration.json',path.join(out,'source-declaration.json'));
save();console.log(JSON.stringify(receipt));
