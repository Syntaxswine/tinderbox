// Creates a disposable combined preview. Production runtime ownership stays with coder/architect.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd(),target=path.resolve('artifacts/phone-ui/combined'),expected=path.join(root,'artifacts','phone-ui','combined');
if(target!==expected||!fs.existsSync('dist/build-manifest.json'))throw Error('Build the UI candidate before preparing combined review');
fs.mkdirSync(target,{recursive:true});
fs.cpSync('dist',target,{recursive:true});
execFileSync('git',['apply','--check','--directory=artifacts/phone-ui/combined','workbenches/phone/runtime-zoom.patch']);
execFileSync('git',['apply','--directory=artifacts/phone-ui/combined','workbenches/phone/runtime-zoom.patch']);
for(const directory of ['phone','integration'])fs.cpSync('workbenches/'+directory,path.join(target,'workbenches',directory),{recursive:true});
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync('artifacts/phone-ui/combined-review.json',JSON.stringify({kind:'Generated combined preview; production runtime unchanged',baseRuntimeSha256:sha('src/runtime/index.js'),adapterSha256:sha('workbenches/phone/runtime-zoom.patch'),combinedRuntimeSha256:sha(path.join(target,'src/runtime/index.js')),sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),preparedAt:new Date().toISOString()},null,2)+'\n');
console.log('Combined review prepared at artifacts/phone-ui/combined; adapter applied only to generated preview.');
