import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir='docs/engineering/shared-maps/support-embed-liveness-v1/',owned=['src/simulation/original-support-ports.js','tests/integration/original-support-ports.test.mjs','tests/integration/original-support-embed.test.mjs','tests/integration/original-support-rooting.test.mjs','docs/engineering/shared-maps/runtime-integration.json'],sha=b=>createHash('sha256').update(b).digest('hex');
const files=[...owned,...fs.readdirSync(dir).filter(p=>p!=='manifest.json').map(p=>dir+p)].sort().map(path=>{const raw=fs.readFileSync(path),mode=owned.includes(path)?'LF':'raw';return {path,mode,sha256:sha(mode==='LF'?raw.toString('utf8').replace(/\r\n/g,'\n'):raw)};});
const result={version:1,base:'f45f0c4eac03059634d164ce5941211c5ee32e3a',scope:'Three bounded disabled support-core corrections; no source-catalogue binding or actual New York diagnostic',files};
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(dir+'manifest.json')),result);else fs.writeFileSync(dir+'manifest.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({manifestEntries:files.length,sourcePaths:owned.length}));
