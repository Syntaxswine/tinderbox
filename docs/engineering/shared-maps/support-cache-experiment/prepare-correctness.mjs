import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const directory='artifacts/qa/shared-map-runtime/support-cache-experiment/',sha=s=>createHash('sha256').update(s).digest('hex');
const preparation=JSON.parse(fs.readFileSync(directory+'preparation.json','utf8')),delta=preparation.experimentDelta;
for(const [path,pin]of Object.entries(delta))assert.equal(sha(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n')),pin.afterLfSha256,'Keep the measured two-path version frozen');
const loader=String.raw`
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath}from 'node:url';import {execFileSync}from 'node:child_process';import {createHash}from 'node:crypto';
const pins=__PINS__,root=process.cwd(),lane=process.env.TINDERBOX_CACHE_LANE,out=process.env.TINDERBOX_CACHE_RUN_DIRECTORY,loaded=[];
assert.ok(['reference','candidate'].includes(lane));assert.ok(path.resolve(out).startsWith(path.resolve('artifacts')+path.sep));
export async function load(url,context,next){
 if(!url.startsWith('file:'))return next(url,context);const relative=path.relative(root,fileURLToPath(url)).split(path.sep).join('/');
 if(!Object.hasOwn(pins,relative))return next(url,context);
 const source=(lane==='reference'?execFileSync('git',['show','cd443ccdd9cbbb38cf4c338ef697d902739726d6:'+relative],{encoding:'utf8',windowsHide:true}):fs.readFileSync(fileURLToPath(url),'utf8')).replace(/\r\n/g,'\n');
 const hash=createHash('sha256').update(source).digest('hex');assert.equal(hash,pins[relative][lane==='reference'?'beforeLfSha256':'afterLfSha256']);
 loaded.push({path:relative,lfSha256:hash,origin:lane==='reference'?'immutable cd443 Git object':'pinned candidate working tree'});
 fs.writeFileSync(path.join(out,'loaded-sources.json'),JSON.stringify({lane,loaded},null,2)+'\n');
 return {format:'module',source,shortCircuit:true};
}
`.replace('__PINS__',JSON.stringify(delta));
fs.writeFileSync(directory+'reference-loader.mjs',loader);
let code=fs.readFileSync('docs/engineering/shared-maps/cpu-stall-v1/matched-cpu.mjs','utf8').replace(/\r\n/g,'\n');const substitutions=[];
function replace(before,after,purpose){assert.equal(code.split(before).length-1,1,purpose);code=code.replace(before,after);substitutions.push({purpose,before,after});}
replace("assert.ok(['control','profile'].includes(mode));","assert.equal(mode,'control','Correctness-only lanes do not authorize a CPU profile');const lane=process.env.TINDERBOX_CACHE_LANE;assert.ok(['reference','candidate'].includes(lane));assert.equal(process.env.TINDERBOX_CACHE_RUN_DIRECTORY,directory);",'Explicit correctness lanes, no profile');
replace("assert.equal(git('diff','--name-only',frozen,'--','src','assets','art','vendor','workbenches'),'');",`const experimentDelta=${JSON.stringify(delta)};assert.deepEqual(git('diff','--name-only',frozen,'--','src','assets','art','vendor','workbenches').split(/\\r?\\n/).filter(Boolean).sort(),Object.keys(experimentDelta).sort());for(const [path,pin]of Object.entries(experimentDelta))assert.equal(sha(fs.readFileSync(path,'utf8').replace(/\\r\\n/g,'\\n')),pin.afterLfSha256,path);`,'Pin the same two candidate deltas');
replace("purpose:'M29 architect-authorized matched CPU '+mode","purpose:'M29 architect-authorized raw-host correctness '+lane",'Label the different bounded grant');
replace('productionDiffEmpty:true,','productionDiffEmpty:false,experimentDelta,lane,correctnessOnly:true,','Do not claim a reference file tree on disk');
replace('const hashes={nativeSha256:',"const label=['cold','before','after'][digestCosts.length];assert.ok(label,'Exactly three planned host captures');save(label+'-host',host);const hashes={nativeSha256:",'Retain exact raw host preimages at existing digest reads');
replace('report.totalProcessElapsedMs=',"report.correctnessOnly=true;report.lane=lane;report.rawHostPreimages=['cold-host.json','before-host.json','after-host.json'];save('commands',P.commands);report.totalProcessElapsedMs=",'Raw input tape and explicit non-benchmark scope');
fs.writeFileSync(directory+'correctness-cpu.mjs',code);
fs.writeFileSync(directory+'correctness-preparation.json',JSON.stringify({scope:'One reference and one candidate correctness lane, identical snapshot-read schedule, no extra slow-host snapshots or performance claim.',experimentDelta:delta,producerSha256:sha(code),loaderSha256:sha(loader),substitutions},null,2)+'\n');
console.log(JSON.stringify({paths:Object.keys(delta),producerSha256:sha(code),loaderSha256:sha(loader)}));
