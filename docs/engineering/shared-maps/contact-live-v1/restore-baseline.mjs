import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fs.realpathSync(process.cwd()),archive='docs/engineering/shared-maps/contact-live-v1/',out='artifacts/qa/shared-map-runtime/contact-live-retirement-v1/';
const accepted='822038cc7c3f3814f8aaa8e48c7973304b384fc2',algorithm='55cd9b597744244fbd0168939b13fbc66662d7b3',experiment='ee26e8091f5e02118360635ece29290ec6c11ccf';
const hash=b=>createHash('sha256').update(b).digest('hex'),git=(...args)=>execFileSync('git',args,{windowsHide:true}),lf=b=>b.toString('utf8').replace(/\r\n/g,'\n');
assert.equal(git('rev-parse','HEAD').toString('utf8').trim(),experiment);
const manifestBytes=fs.readFileSync(archive+'archive-manifest.json'),manifest=JSON.parse(manifestBytes);
for(const f of manifest.files){const b=fs.readFileSync(archive+f.path);assert.equal(b.length,f.bytes,f.path);assert.equal(hash(b),f.sha256,f.path);}
for(const [from,to]of [['archive-manifest.json','experimental-checkpoint-manifest.json'],['README.md','experimental-checkpoint-README.md']]){assert.equal(fs.existsSync(archive+to),false);fs.copyFileSync(archive+from,archive+to);}
const originalWipHash='56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f';assert.equal(hash(fs.readFileSync('docs/engineering/shared-maps/support-regions-proposal.md')),originalWipHash);
const support='src/simulation/source-support.js',baselineSupport=git('show',accepted+':'+support);assert.equal(hash(lf(baselineSupport)),'1e6bd6ec6921119af942cce3e3fc69bf2449b0b3ead543697f88e435039bd98c');assert.equal(lf(baselineSupport),lf(git('show',algorithm+':'+support)));
const restored=[];
for(const p of [support,'tests/integration/source-support.test.mjs','docs/engineering/shared-maps/runtime-integration.json']){
 const current=fs.readFileSync(p),payload=fs.readFileSync(archive+'candidate-payload/'+p),baseline=git('show',accepted+':'+p);assert.equal(lf(current),lf(payload),'Preserve exact task payload before restoration: '+p);assert.equal(lf(baseline),lf(git('show',algorithm+':'+p)));
 fs.writeFileSync(p,baseline);restored.push({path:p,beforeLfSha256:hash(lf(current)),afterLfSha256:hash(lf(baseline)),acceptedCommit:accepted,archivedCandidate:archive+'candidate-payload/'+p});
}
const removed='tests/integration/source-contact-reach.test.mjs',removedPath=path.resolve(root,removed),removedBytes=fs.readFileSync(removedPath);assert.ok(removedPath.startsWith(root+path.sep));assert.equal(lf(removedBytes),lf(fs.readFileSync(archive+'candidate-payload/'+removed)));fs.unlinkSync(removedPath);
assert.equal(git('diff','--name-only','76290ae0ef5d08b2abdfcea5234f997f973b65e2','--','src','assets','art','vendor','workbenches').toString('utf8').trim(),'');
const declaration=JSON.parse(fs.readFileSync('docs/engineering/shared-maps/runtime-integration.json'));
const pins={version:1,nodeMinimum:'24.13.1',experimentalCommit:experiment,acceptedRuntime:accepted,algorithmReference:algorithm,wholeTreeReference:'76290ae0ef5d08b2abdfcea5234f997f973b65e2',baselineSupportLfSha256:hash(lf(baselineSupport)),candidateSupportLfSha256:'18545e679d8318cb0115e7a144af62995e41b2f8cda400b40f1c3ed3a9452021',experimentalManifestSha256:hash(manifestBytes),payload:manifest.files.filter(f=>f.path.startsWith('candidate-payload/')),nativeFiles:[...declaration.runtimeFiles.map(f=>({path:f.path,lfSha256:f.afterLfSha256})),...declaration.addedFiles.map(f=>({path:f.path,lfSha256:f.lfSha256}))].filter(f=>/^(?:src|workbenches)\//.test(f.path)&&f.path!==support),packages:declaration.runtimePackages};
fs.writeFileSync(archive+'candidate-loader-pins.json',JSON.stringify(pins,null,2)+'\n');
const receipt={version:1,decision:'Reject both new algorithms for runtime intake; preserve exact candidate and restore accepted production/tests',experimentalCommit:experiment,acceptedCommit:accepted,algorithmReference:algorithm,restored,removedActiveTest:{path:removed,rawSha256:hash(removedBytes),preservedAt:archive+'candidate-payload/'+removed},wipPreserved:{path:'docs/engineering/shared-maps/support-regions-proposal.md',sha256:originalWipHash},productionTreeExact:true,experimental56ChecksPreserved:true,directLiveSubchangeMeasuredSeparately:false,noNewMeasurement:true,noBuildOrBrowser:true,restoredAt:new Date().toISOString()};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'baseline-restoration.json',JSON.stringify(receipt,null,2)+'\n');fs.writeFileSync(archive+'baseline-restoration.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
