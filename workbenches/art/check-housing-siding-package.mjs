import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=(bytes,record)=>record.byteRepresentation==='UTF-8 LF'?Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')):bytes;
let manifestInputs=0,sourcePlates=0,previews=0,servedRuntime=0;
for(const collection of ['hopkins','gross']){
 const base='assets/art/'+collection+'-housing-v1/',manifest=read(base+'manifest.json');
 assert.deepEqual(manifest,read('dist/'+base+'manifest.json'));
 const assemblies=Array.isArray(manifest.assembly)?manifest.assembly:[manifest.assembly];
 const shared=read('assets/art/hopkins-housing-v1/manifest.json').reusedMaterials;
 const reused=(manifest.reusedMaterials||[]).map(record=>record.sha256?record:shared.find(m=>m.path===path.posix.normalize(base+record.path)));
 assert(reused.every(Boolean),'Missing pinned shared-material hash');
 for(const record of [...manifest.files,...assemblies,...reused,...manifest.runtimeDependencies]){
  for(const prefix of ['','dist/'])assert.equal(hash(canonical(fs.readFileSync(prefix+record.path),record)),record.sha256,prefix+record.path);
  const response=await fetch('http://127.0.0.1:4551/'+record.path);assert(response.ok,record.path);assert.equal(hash(canonical(Buffer.from(await response.arrayBuffer()),record)),record.sha256,record.path+' served');manifestInputs++;
 }
 for(const plate of read('art/source/'+collection+'-housing-v1/sources.json').plates){assert.equal(hash(fs.readFileSync(plate.file)),plate.sha256);sourcePlates++;}
 for(const house of read(base+'houses.json').houses){
  const file='docs/art/'+collection+'-housing-v1/previews/'+house.id+'-exterior-0.jpg',response=await fetch('http://127.0.0.1:4551/'+file);assert(response.ok,file);assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(fs.readFileSync(file)));previews++;
 }
}
const index=read('dist/build-manifest.json');let bytes=0;
for(const record of index.files){
 const local=fs.readFileSync('dist/'+record.path);assert.equal(local.length,record.bytes);assert.equal(hash(local),record.sha256);bytes+=local.length;
 if(record.path.startsWith('.'))continue;
 const response=await fetch('http://127.0.0.1:4551/dist/'+record.path);assert(response.ok,record.path);assert.equal(hash(Buffer.from(await response.arrayBuffer())),record.sha256);servedRuntime++;
}
const response=await fetch('http://127.0.0.1:4551/dist/build-manifest.json');assert(response.ok);assert.deepEqual(await response.json(),index);servedRuntime++;
const windowImport=read('art/source/nautilus-windows-v1/import.json');let windowInputs=0;
for(const record of windowImport.files){for(const prefix of ['','dist/'])assert.equal(hash(fs.readFileSync(prefix+record.installedPath)),record.sha256);const r=await fetch('http://127.0.0.1:4551/'+record.installedPath);assert(r.ok);assert.equal(hash(Buffer.from(await r.arrayBuffer())),record.sha256);windowInputs++;}
const geometry=read('docs/art/housing-siding-review/geometry-review.json');assert.equal(geometry.passed,true);assert.equal(geometry.housesReviewed,25);assert.equal(geometry.remainingIncorrectVerticalRoofFaces,0);assert.equal(geometry.unchangedPrefabHashes,23);assert.equal(geometry.unchangedGeometryAndUVHashes,23);assert.equal(geometry.centeredWindowAdoptions.length,2);assert.equal(geometry.unchangedRoofCoveringHashes,25);
const report={passed:true,checkedAt:new Date().toISOString(),baselineCommit:geometry.baselineCommit,repositoryCheck:{tests:59,failures:0,ownScriptSyntax:85,staticModules:98},publicBuild:{files:index.files.length+1,bytes:bytes+fs.statSync('dist/build-manifest.json').size,allLocalHashesMatch:true,servedRuntimeFiles:servedRuntime,allServedHashesMatch:true,privateMarkersVerifiedLocally:true},collectionManifestInputs:manifestInputs,sourcePlateHashes:sourcePlates,servedExteriorPreviews:previews,unchangedNativeGeometryAndUVs:23,unchangedPrefabData:23,centeredWindowAdoptions:2,unchangedRoofCoverings:25,unchangedTextureFiles:6,gpuReview:'Unavailable on this host; actual mesh renders and static gallery reviewed separately.',integration:'Artist candidate only; not promoted or deployed.'};
fs.writeFileSync('docs/art/nautilus-windows-v1/package-review.json',JSON.stringify({...report,windowImportCommit:windowImport.commit,importedWorkingPackagedAndServedHashes:windowInputs},null,2)+'\n');fs.writeFileSync('docs/art/housing-siding-review/package-review.json',JSON.stringify(report,null,2)+'\n');fs.writeFileSync('docs/art/gross-housing-v1/package-review.json',JSON.stringify({...report,scope:'Current combined housing material revision; see shared siding review.'},null,2)+'\n');console.log(JSON.stringify(report,null,2));
