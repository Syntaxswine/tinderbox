// Portable LF source pins and exact artifact bytes for the scoped delivery.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const packet='docs/engineering/shared-maps/reviewed-coupled-pilot-v1/',dir=packet+'attempt-corrected-01/',target=dir+'delivery-file-hashes.json',sha=b=>createHash('sha256').update(b).digest('hex'),git=(...args)=>execFileSync('git',args,{windowsHide:true,encoding:'utf8'}).trim(),walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+e.name+'/'):[dir+e.name]);
const paths=[...walk(packet),...walk('assets/runtime/map-inputs/new-york/reviewed-cohort-v1/'),'docs/engineering/shared-maps/runtime-integration.json','src/content/shared-map-admission.js','src/content/shared-map-inputs.js','src/content/shared-map.js','src/content/new-york-reviewed-inputs.js','src/simulation/hybrid-source-support.js','src/simulation/hybrid-world-publication.js','workbenches/furnished-house/scene.js','tests/fixtures/reviewed-cohort-data.mjs','tests/integration/reviewed-cohort-inputs.test.mjs','tools/prepare-reviewed-new-york-pilot.mjs','tools/validate-reviewed-new-york-pilot.mjs'].filter(p=>p!==target).sort();
const protectedPath='docs/engineering/shared-maps/support-regions-proposal.md',protectedSha='56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f';assert.equal(sha(fs.readFileSync(protectedPath)),protectedSha);
const files=paths.map(path=>{const bytes=fs.readFileSync(path);return {path,bytes:bytes.length,rawSha256:sha(bytes),lfSha256:sha(bytes.toString().replace(/\r\n/g,'\n'))};});
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(target)).files,files);
else{assert.equal(fs.existsSync(target),false,'Preserve the delivery manifest; use --check');fs.writeFileSync(target,JSON.stringify({version:1,status:'CORRECTED_COUPLED_CPU_VALIDATION_PASSED',preparedFromHead:git('rev-parse','HEAD'),branch:git('branch','--show-current'),actualCompilerCalls:5,cumulativeActualCompilerCalls:8,actualClockSteps:0,protectedUnrelatedWip:{path:protectedPath,rawSha256:protectedSha,included:false},manifestSelfHash:'Supplied separately with final commit SHA',files},null,2)+'\n');}
console.log(JSON.stringify({files:files.length,manifest:target,sha256:sha(fs.readFileSync(target))}));
