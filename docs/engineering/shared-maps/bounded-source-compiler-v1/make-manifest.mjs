// Hash only this task's owned source/evidence; never replay calculations.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),prefix=path.relative(root,here).replaceAll('\\','/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const owned=['src/simulation/regional-source-pilot.js','workbenches/furnished-house/regional-domain.js','workbenches/furnished-house/scene.js','workbenches/furnished-house/partition-error.js','tests/fixtures/regional-source-data.mjs','tests/integration/regional-source-compiler.test.mjs','tools/record-shared-map-runtime.mjs','docs/engineering/shared-maps/runtime-integration.json'];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.relative(root,path.join(dir,e.name)).replaceAll('\\','/')]);}
const files=[...owned,...walk(here).filter(p=>p!==prefix+'/manifest.json')].sort().map(p=>{const bytes=fs.readFileSync(path.join(root,p)),mode=owned.includes(p)?'LF':'raw';return {path:p,mode,bytes:bytes.length,sha256:sha(mode==='LF'?bytes.toString('utf8').replace(/\r\n/g,'\n'):bytes)};});
const manifest={version:1,authority:'1a88cf4748bf62c1456285ff43412c929d311199',scope:'Only this isolated compiler/quantity pilot and its evidence; unrelated WIP and previous archives excluded; manifest excludes itself.',hashPolicy:'LF for the eight owned source/declaration paths; raw bytes for local -text evidence. Byte counts are informational across checkout line endings.',files};
const target=path.join(here,'manifest.json');if(process.argv.includes('--check')){const saved=JSON.parse(fs.readFileSync(target));for(const value of [saved,manifest])for(const row of value.files)if(row.mode==='LF')delete row.bytes;assert.deepEqual(saved,manifest);}else fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({passed:true,manifestFiles:files.length,sourcePaths:owned.length,evidencePaths:files.length-owned.length,nativeCalculations:0}));
