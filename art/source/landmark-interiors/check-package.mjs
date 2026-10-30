// Static package import/closure and byte checks; no server or browser is started.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir='dist/assets/art/landmark-interiors',manifest=JSON.parse(fs.readFileSync(dir+'/manifest.json')),sha=b=>createHash('sha256').update(b).digest('hex');
for(const f of [...manifest.runtimeFiles,...manifest.dependencies])assert.equal(sha(fs.readFileSync('dist/'+f.path)),f.sha256,'Packaged bytes differ: '+f.path);
const T=await import('../../../dist/src/runtime/three.js'),kit=await import('../../../dist/assets/art/landmark-interiors/index.js');for(const venueId of ['new-york','administration','horticulture','fisheries']){const m=kit.createVenueInterior(T,{venueId});assert.ok(m.diagnostics().meshes>0);m.dispose();}
const files=JSON.parse(fs.readFileSync('dist/build-manifest.json')).files;assert.ok(!files.some(f=>f.path.startsWith('art/')||f.path.startsWith('docs/')||f.path.startsWith('artifacts/')));for(const f of manifest.runtimeFiles){const text=fs.readFileSync('dist/'+f.path,'utf8');assert.ok(!/C:[\\/]|artifacts[\\/]landmark|worktrees[\\/]|https?:\/\//.test(text),'External dependency in '+f.path);}
const result={passed:true,packagedRuntimeFiles:manifest.runtimeFiles.length,dependencyFiles:manifest.dependencies.length,venuesConstructed:4,sourcePhotosPackaged:false,externalRuntimeReferences:false,limits:'Import and package bytes only; no combined WebGL, gameplay or deployment claim.'};fs.mkdirSync('artifacts/landmark-interiors',{recursive:true});fs.writeFileSync('artifacts/landmark-interiors/package-check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
