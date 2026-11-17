import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const source='artifacts/qa/shared-map-runtime/failure-art-qa-v1/',target='docs/engineering/shared-maps/failure-art-qa/',hash=b=>createHash('sha256').update(b).digest('hex');
const checks=JSON.parse(fs.readFileSync(source+'checks.json'));assert.equal(checks.status,0);assert.match(fs.readFileSync(source+'focused.log','utf8'),/tests 25/);
fs.mkdirSync(target,{recursive:true});for(const name of ['source-audit.json','checks.json','focused.log','verify.mjs','archive.mjs','cleanup.json'])fs.copyFileSync(source+name,target+name);
fs.writeFileSync(target+'.gitattributes','*.json -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n*.log -text whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol\n*.mjs text eol=lf\n.gitattributes text eol=lf\n');
const files=fs.readdirSync(target).filter(n=>n!=='archive-manifest.json').sort().map(p=>({path:p,bytes:fs.statSync(target+p).size,sha256:hash(fs.readFileSync(target+p))}));fs.writeFileSync(target+'archive-manifest.json',JSON.stringify({version:1,scope:'Source-only best-effort failure-art QA evidence; no new renderer/build/profile/measurement',files},null,2)+'\n');console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),checks:25,activeSupportRestored:true}));
