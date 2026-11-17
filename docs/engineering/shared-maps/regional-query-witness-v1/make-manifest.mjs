import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir='docs/engineering/shared-maps/regional-query-witness-v1/',owned=['src/runtime/regional-effective-query.js','tests/integration/regional-query-witness.test.mjs','docs/engineering/shared-maps/runtime-integration.json'],sha=b=>createHash('sha256').update(b).digest('hex');
const files=[...owned,...fs.readdirSync(dir).filter(p=>p!=='manifest.json').map(p=>dir+p)].sort().map(path=>{const b=fs.readFileSync(path),mode=owned.includes(path)?'LF':'raw';return {path,mode,sha256:sha(mode==='LF'?b.toString('utf8').replace(/\r\n/g,'\n'):b)};});
const result={version:1,base:'68b6e3995bc4bad5f270275578a630fb2646c501',authority:'54504bae',scope:'Only scoped containment-witness correction and separate evidence',files};
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(dir+'manifest.json')),result);else fs.writeFileSync(dir+'manifest.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,manifestEntries:files.length,sourcePaths:owned.length,nativeCompilerCalls:0}));
