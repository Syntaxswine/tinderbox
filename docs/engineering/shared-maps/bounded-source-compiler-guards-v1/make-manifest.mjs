import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),prefix=path.relative(root,here).replaceAll('\\','/'),sha=b=>createHash('sha256').update(b).digest('hex');
const owned=['src/simulation/regional-source-pilot.js','workbenches/furnished-house/regional-domain.js','tests/integration/regional-source-compiler.test.mjs','tests/integration/regional-source-guards.test.mjs','docs/engineering/shared-maps/runtime-integration.json'];
const paths=[...owned,...fs.readdirSync(here).filter(p=>p!=='manifest.json').map(p=>prefix+'/'+p)].sort(),files=paths.map(p=>{const b=fs.readFileSync(path.join(root,p)),mode=owned.includes(p)?'LF':'raw';return {path:p,mode,sha256:sha(mode==='LF'?b.toString('utf8').replace(/\r\n/g,'\n'):b)};});
const result={version:1,base:'c66e659451284309e48dc420791369dd5af37e1e',scope:'Only receipt/catalogue/carry guards and their focused evidence; previous archives and unrelated WIP excluded',files},target=path.join(here,'manifest.json');if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(target)),result);else fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,manifestEntries:files.length,sourcePaths:owned.length,nativeCalculations:0}));
