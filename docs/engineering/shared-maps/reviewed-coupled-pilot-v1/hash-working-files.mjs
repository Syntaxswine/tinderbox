// Exact working-file handoff only. Never imports or evaluates map geometry.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir='docs/engineering/shared-maps/reviewed-coupled-pilot-v1/',target=dir+'working-file-hashes.json',sha=b=>createHash('sha256').update(b).digest('hex'),git=(...args)=>execFileSync('git',args,{windowsHide:true,encoding:'utf8'}).trim();
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(dir+entry.name+'/'):[dir+entry.name]);
const protectedPath='docs/engineering/shared-maps/support-regions-proposal.md',protectedSha='56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f',base='2c1eaaeb94c0530d5a340c647a1dfae4f1de4656';
const paths=[...walk('assets/runtime/map-inputs/new-york/reviewed-cohort-v1/'),...walk(dir),'docs/engineering/shared-maps/runtime-integration.json','src/content/new-york-reviewed-inputs.js','src/content/shared-map-admission.js','src/content/shared-map-inputs.js','src/content/shared-map.js','src/simulation/hybrid-source-support.js','src/simulation/hybrid-world-publication.js','tests/fixtures/reviewed-cohort-data.mjs','tests/integration/reviewed-cohort-inputs.test.mjs','tools/prepare-reviewed-new-york-pilot.mjs','tools/validate-reviewed-new-york-pilot.mjs','workbenches/furnished-house/scene.js'].filter(p=>p!==target).sort();
assert.equal(git('rev-parse','HEAD'),base);assert.equal(git('rev-parse','@{upstream}'),base);assert.equal(git('diff','--cached','--name-only'),'');assert.equal(sha(fs.readFileSync(protectedPath)),protectedSha);
const entries=paths.map(path=>{const bytes=fs.readFileSync(path);return {path,bytes:bytes.length,rawSha256:sha(bytes),lfSha256:sha(bytes.toString().replace(/\r\n/g,'\n'))};});
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(target)).files,entries);
else{assert.equal(fs.existsSync(target),false,'Preserve the original handoff manifest; use --check');fs.writeFileSync(target,JSON.stringify({version:1,createdAt:new Date().toISOString(),status:'WORKING_FILES_ONLY_ACTUAL_VALIDATION_BLOCKED',head:base,upstream:base,branch:git('branch','--show-current'),gitDelivery:'HELD; index empty; no commit/push',actualRerun:'NOT_GRANTED',protectedUnrelatedWip:{path:protectedPath,rawSha256:protectedSha,included:false},manifestSelfHash:'Supplied separately in final handoff',files:entries},null,2)+'\n');}
console.log(JSON.stringify({files:entries.length,manifest:target,rawSha256:sha(fs.readFileSync(target)),head:base,indexEmpty:true}));
