import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='art/source/hull-house-block',out='docs/art/hull-house-block',runtime='assets/art/hull-house-block';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const record=p=>{const b=fs.readFileSync(p);return {path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const same=r=>assert.deepEqual(record(r.path),r,r.path);
const manifest=json(runtime+'/manifest.json'),webgl=json(out+'/webgl.json'),proof=json(root+'/plan-proof.json'),checks=json(out+'/checks.json'),cleanup=json(out+'/helper-retirement.json'),images=json(out+'/visual-review.json');
assert.deepEqual(webgl.inputManifest,manifest);
assert.equal(webgl.reviewScriptSha256,record(root+'/review.js').sha256);
assert.equal(webgl.errors.length,0);assert.ok(webgl.programResults.length>0);assert.ok(webgl.programResults.every(p=>p.linked&&!p.log));assert.ok(webgl.shaderResults.every(s=>s.compiled&&!s.log));
for(const r of [...manifest.runtimeFiles,...manifest.dependencies,...manifest.notices,...manifest.sourceRecords,manifest.trace,manifest.selectedIntake,...webgl.jpgs,...proof.inputs,proof.output])same(r);
assert.equal(checks.failed,0);assert.equal(checks.passed,25);
assert.equal(webgl.views.length,5);assert.equal(images.images.length,6);
for(const v of webgl.views){assert.deepEqual(v.character.nativeScale,[1,1,1]);assert.equal(v.character.characterId,'goat');assert.equal(v.diagnostics.buildings,56);}
for(const i of images.images){same({path:i.path,bytes:i.bytes,sha256:i.sha256});assert.ok(i.dimensions[0]>=1280&&i.dimensions[1]>=800);assert.equal(i.visualReview,'passed');}
for(const k of ['serverExited','browserExited','portReleased','testProfileRemoved'])assert.equal(cleanup[k],true);
const dirs=[root,runtime,out],files=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(d+'/'+e.name):[d+'/'+e.name]);
let syntax=0,links=0;
for(const f of dirs.flatMap(files)){
 if(/\.(?:m?js)$/.test(f)){execFileSync(process.execPath,['--check',f]);syntax++;}
 if(f.endsWith('.json'))json(f);
 if(f.endsWith('.md'))for(const [,ref]of fs.readFileSync(f,'utf8').matchAll(/\]\(([^)]+)\)/g)){if(/^(?:https?:|#)/.test(ref))continue;const target=path.resolve(path.dirname(f),ref.split('#')[0]);assert.ok(fs.existsSync(target)||target===path.resolve(out+'/validation.json'),f+' -> '+ref);links++;}
}
const log=fs.readFileSync('artifacts/helpers/hull-house-review/full-checks.log','utf8');assert.match(log,/tests 291/);assert.match(log,/pass 291/);assert.match(log,/fail 0/);assert.match(log,/5 byte-preserved imports/);
const build=json('dist/build-manifest.json');
for(const r of manifest.runtimeFiles){const packaged=build.files.find(p=>p.path===r.path);assert.ok(packaged,r.path);assert.equal(packaged.bytes,r.bytes);assert.equal(packaged.sha256,r.sha256);}
const data={task:'Hull-House block first art candidate',branch:'codex/hull-house-block-art',baseCommit:manifest.baseCommit,proposalCommit:manifest.proposalCommit,
 scope:dirs,repository:{command:'node tools/check.mjs',tests:291,passed:291,failed:0,art:'5 byte-preserved imports; 52 syntax/dependency checks; shared THREE',log:record('artifacts/helpers/hull-house-review/full-checks.log')},
 focused:{command:'node art/source/hull-house-block/check.mjs',passed:checks.passed,failed:checks.failed,receipt:record(out+'/checks.json')},
 build:{commands:['node tools/build.mjs','node tools/check-release.mjs'],files:build.files.length,bytes:build.files.reduce((n,f)=>n+f.bytes,0),manifest:record('dist/build-manifest.json'),relativeReferences:'passed'},
 evidence:{nativeWebGL:record(out+'/webgl.json'),planProof:record(root+'/plan-proof.json'),sources:record(root+'/sources.json'),trace:record(root+'/trace.json'),images:record(out+'/visual-review.json'),cleanup:record(out+'/helper-retirement.json')},
 handoff:{sourceAndRuntimeSyntax:syntax,localMarkdownReferences:links,runtimeManifest:record(runtime+'/manifest.json'),readme:record(out+'/README.md')},
 limitations:['Art candidate awaits architect/owner JPG review and later production contract.','No production placement, navigation, gameplay door controls or fire behavior.','Unpictured facades, roof forms, heights and the narrow-court adaptation remain explicit.','No retained helper or preview.']};
fs.writeFileSync(out+'/validation.json',JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({validated:true,syntax,links,tests:291,focused:checks.passed,packageFiles:build.files.length,packageBytes:data.build.bytes,manifestSha256:data.build.manifest.sha256}));
