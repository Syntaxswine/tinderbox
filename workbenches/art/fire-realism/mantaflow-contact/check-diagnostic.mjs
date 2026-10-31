/** Frozen All GLSL and all original data remain attributable to edb3f44. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {makeFluidShaders} from '../../../../assets/art/fire-realism/fluid-contact/shaders.js';
import {makeReactionDiagnosticShaders,SMOKE_EXTINCTION_ASSIGNMENT,REACTION_DIAGNOSTIC_ASSIGNMENT} from '../../../../assets/art/fire-realism/fluid-contact/diagnostic-shaders.js';
const baseline='edb3f44262cf2d401c37cdc3c783cf1356452767',base='assets/art/fire-realism/fluid-contact/',original=file=>execFileSync('git',['show',baseline+':'+file],{maxBuffer:4*1024*1024}),sha=b=>createHash('sha256').update(b).digest('hex');
const pinnedShader=original(base+'shaders.js');assert(fs.readFileSync(base+'shaders.js').equals(pinnedShader));
if(!vm.SourceTextModule)throw Error('Use --experimental-vm-modules');const frozen=new vm.SourceTextModule(pinnedShader.toString('utf8'));await frozen.link(()=>{throw Error('Unexpected All shader dependency');});await frozen.evaluate();
const generated=[];
for(const planes of [3,29,128]){
 const actual=makeFluidShaders(planes),old=frozen.namespace.makeFluidShaders(planes),diagnostic=makeReactionDiagnosticShaders(planes);
 assert.equal(actual.vertexShader,old.vertexShader);assert.equal(actual.fragmentShader,old.fragmentShader);
 assert.equal(diagnostic.vertexShader,old.vertexShader);assert.equal(diagnostic.fragmentShader,old.fragmentShader.replace(SMOKE_EXTINCTION_ASSIGNMENT,REACTION_DIAGNOSTIC_ASSIGNMENT));
 assert.equal(actual.fragmentShader.split(SMOKE_EXTINCTION_ASSIGNMENT).length,2);
 generated.push({planes,allVertexSha256:sha(actual.vertexShader),allFragmentSha256:sha(actual.fragmentShader),reactionFragmentSha256:sha(diagnostic.fragmentShader)});
}
const manifest=JSON.parse(original(base+'manifest.json'));let unchanged=0;
for(const record of [...manifest.runtimeFiles,...manifest.runtimeResources]){
 if(record.path===base+'index.js')continue;const bytes=fs.readFileSync(record.path);assert.equal(bytes.length,record.bytes,record.path);assert.equal(sha(bytes),record.sha256,record.path);unchanged++;
}
assert.equal(unchanged,173);
console.log(JSON.stringify({status:'pass',baseline,originalRuntimeAndBinaryRecordsUnchanged:unchanged,allGeneratedGLSLByteIdentical:true,diagnosticOnlySmokeAssignment:true,generated,noGPUorQualityClaim:true}));
