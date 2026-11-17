import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir='docs/engineering/shared-maps/regional-query-kernel-v1/',sha=b=>createHash('sha256').update(b).digest('hex'),owned=['src/runtime/regional-effective-query.js','tests/fixtures/regional-query-data.mjs','tests/integration/regional-effective-query.test.mjs','docs/engineering/shared-maps/runtime-integration.json'];
const files=[...owned,...fs.readdirSync(dir).filter(p=>p!=='manifest.json').map(p=>dir+p)].sort().map(p=>{const bytes=fs.readFileSync(p),mode=owned.includes(p)?'LF':'raw';return {path:p,mode,sha256:sha(mode==='LF'?bytes.toString('utf8').replace(/\r\n/g,'\n'):bytes)};}),result={version:1,authority:'df3dbcea',scope:'Only isolated effective-query kernel, fixtures/declaration and evidence; old archives and WIP excluded',files};
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(dir+'manifest.json')),result);else fs.writeFileSync(dir+'manifest.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,manifestEntries:files.length,sourcePaths:owned.length,nativeCompilerCalls:0}));
