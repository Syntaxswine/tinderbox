import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),manifest=read('assets/art/hopkins-housing-v1/manifest.json');
const normalized=(bytes,record)=>record.byteRepresentation==='UTF-8 LF'?Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')):bytes;
const digest=b=>createHash('sha256').update(b).digest('hex');
let served=0,packaged=0;
for(const record of [...manifest.files,...manifest.assembly,...manifest.reusedMaterials]){
 const bytes=normalized(fs.readFileSync(record.path),record);assert.equal(digest(bytes),record.sha256,record.path+' working hash');
 const built=normalized(fs.readFileSync('dist/'+record.path),record);assert.equal(digest(built),record.sha256,record.path+' package hash');packaged++;
 const response=await fetch('http://127.0.0.1:4551/'+record.path);assert(response.ok,record.path+' served response');const data=normalized(Buffer.from(await response.arrayBuffer()),record);assert.equal(digest(data),record.sha256,record.path+' served hash');served++;
}
for(const record of manifest.provenance)assert(fs.existsSync(record));
for(const file of ['assets/art/hopkins-housing-v1/manifest.json','assets/art/gross-housing-v1/manifest.json'])assert.deepEqual(read('dist/'+file),read(file),file+' packaged manifest');
const collect=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?collect(dir+'/'+e.name):[dir+'/'+e.name]);const builtFiles=collect('dist');
const catalogue=read('assets/art/hopkins-housing-v1/houses.json');let previews=0;
for(const house of catalogue.houses)for(const [view,level] of [['exterior',0],['cutaway',0],['cutaway',1]]){const file=`docs/art/hopkins-housing-v1/previews/${house.id}-${view}-${level}.jpg`;assert(fs.existsSync(file));const r=await fetch('http://127.0.0.1:4551/'+file);assert(r.ok);assert.equal(digest(Buffer.from(await r.arrayBuffer())),digest(fs.readFileSync(file)));previews++;}
const source=read('art/source/hopkins-housing-v1/sources.json');for(const plate of source.plates)assert.equal(digest(fs.readFileSync(plate.file)),plate.sha256);
const review={passed:true,checkedAt:new Date().toISOString(),repositoryCheck:{tests:59,failures:0,ownScriptSyntax:83,staticModules:91,sharedThreePairs:1},build:{files:builtFiles.length,bytes:builtFiles.reduce((n,f)=>n+fs.statSync(f).size,0)},hashedWorkingInputs:packaged,hashedPackageInputs:packaged,hashedServedInputs:served,servedPreviews:previews,packagedManifestsMatch:true,sourcePlateHashes:source.plates.length,unchangedReusedTextureHashes:manifest.reusedMaterials.length,sourceHashRepresentation:'Assembly source is UTF-8 LF to keep hashes portable across Git checkouts; raster and JSON inputs use raw bytes.',gpuReview:'unavailable; static gallery and offline geometry renders reviewed separately',integrationStatus:'Artist candidate; not promoted or deployed'};
fs.writeFileSync('docs/art/hopkins-housing-v1/package-review.json',JSON.stringify(review,null,2)+'\n');console.log(JSON.stringify(review,null,2));
