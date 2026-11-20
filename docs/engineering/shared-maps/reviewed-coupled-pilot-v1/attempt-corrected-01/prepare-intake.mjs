// Metadata/opaque bytes only. No map decode, native compiler or geometry work.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const packet='docs/engineering/shared-maps/reviewed-coupled-pilot-v1/',dir=packet+'attempt-corrected-01/',primary='C:/Users/baals/Documents/ChatGPT/tinderbox/';
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(fs.existsSync(dir+'intake-pins.json'),false,'Corrected intake already frozen');
const manifest=json(packet+'working-file-hashes.json');for(const row of manifest.files)assert.equal(sha(read(row.path)),row.rawSha256,row.path);
assert.equal(sha(read('docs/engineering/shared-maps/support-regions-proposal.md')),manifest.protectedUnrelatedWip.rawSha256);
fs.mkdirSync(dir+'intake',{recursive:true});const paths=['docs/engineering/shared-maps/new-york-corrected-coupled-run.md','artifacts/qa/m29-architect-intake/reviewed-cohort-root.json','artifacts/qa/m29-architect-intake/reviewed-cohort-root.log','artifacts/qa/m29-architect-intake/reviewed-cohort-root-audit.json'];
const pins=paths.map(path=>{const bytes=read(primary+path),saved=dir+'intake/'+path.split('/').at(-1);fs.writeFileSync(saved,bytes);return {primaryPath:primary+path,savedPath:saved,sha256:sha(bytes)};});
const before=read('tools/validate-reviewed-new-york-pilot.mjs');fs.writeFileSync(dir+'intake/reviewed-harness-before-naming.mjs.txt',before);
fs.writeFileSync(dir+'intake-pins.json',JSON.stringify({version:1,kind:'ONE_CORRECTED_ATTEMPT_AUTHORITY',pins,reviewedHarnessBeforeNaming:{path:'tools/validate-reviewed-new-york-pilot.mjs',savedPath:dir+'intake/reviewed-harness-before-naming.mjs.txt',sha256:sha(before)},priorManifest:{path:packet+'working-file-hashes.json',sha256:sha(read(packet+'working-file-hashes.json'))},firstFailedAttempt:{result:packet+'actual-result.json',sha256:sha(read(packet+'actual-result.json')),calls:3},additionalCaps:{compilerCalls:5,trials:2,steps:0,transformsPerLifetime:38,lifetimes:2,totalTransforms:76,deadlineMs:30000},cumulativeCompilerCeiling:8},null,2)+'\n');
console.log(JSON.stringify({pins,sourceFilesVerified:manifest.files.length,firstAttemptCalls:3,additionalCompilerCalls:5,actualRunStarted:false}));
