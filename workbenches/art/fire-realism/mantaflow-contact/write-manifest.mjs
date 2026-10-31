/** Recompute exact candidate source/resource records; no module evaluation. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve('assets/art/fire-realism/fluid-contact'),manifestPath=path.join(root,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=[];function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())visit(file);else if(entry.name.endsWith('.js'))files.push(file);}}visit(root);
manifest.runtimeFiles=files.sort().map(file=>{const bytes=fs.readFileSync(file);if(bytes.includes(13))throw Error('RuntimeJS must remain rawLF');return{path:path.relative(process.cwd(),file).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};});
for(const r of manifest.runtimeResources){const bytes=fs.readFileSync(r.path);if(bytes.length!==r.bytes||sha(bytes)!==r.sha256)throw Error('Original verified binary changed');}
manifest.limits.esmBytes=manifest.runtimeFiles.reduce((n,r)=>n+r.bytes,0);manifest.limits.compressedBytes=manifest.runtimeResources.reduce((n,r)=>n+r.bytes,0);
if(manifest.limits.esmBytes>64*1024*1024||manifest.limits.compressedBytes>96*1024*1024||manifest.limits.sparseBytes>96*1024*1024)throw Error('Candidate resource ceiling exceeded');
if('acceptance'in manifest){manifest.reviewLimitations=manifest.acceptance;delete manifest.acceptance;}
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({sourceFiles:manifest.runtimeFiles.length,resources:manifest.runtimeResources.length,esmBytes:manifest.limits.esmBytes,compressedBytes:manifest.limits.compressedBytes,manifestBytes:fs.statSync(manifestPath).size,manifestSha256:sha(fs.readFileSync(manifestPath))}));
