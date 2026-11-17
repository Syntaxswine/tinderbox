import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir='docs/engineering/shared-maps/regional-receipt-bridge-v1/',owned=['src/simulation/regional-source-pilot.js','src/runtime/regional-effective-query.js','src/runtime/regional-receipt-bridge.js','tests/integration/regional-receipt-bridge.test.mjs','tests/fixtures/regional-bridge-data.mjs','docs/engineering/shared-maps/runtime-integration.json'],sha=b=>createHash('sha256').update(b).digest('hex');
const files=[...owned,...fs.readdirSync(dir).filter(p=>p!=='manifest.json').map(p=>dir+p)].sort().map(path=>{const b=fs.readFileSync(path),mode=owned.includes(path)?'LF':'raw';return {path,mode,sha256:sha(mode==='LF'?b.toString('utf8').replace(/\r\n/g,'\n'):b)};});
const result={version:1,base:'e84ed22c43d99177848c6226ad25e8eaea9678e4',authority:'3713e72b',scope:'Disabled lazy receipt bridge, synthetic controls and one three-region original-roof check',files};
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(dir+'manifest.json')),result);else fs.writeFileSync(dir+'manifest.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,manifestEntries:files.length,sourcePaths:owned.length}));
