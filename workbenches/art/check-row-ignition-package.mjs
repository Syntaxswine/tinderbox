import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p,'utf8')),manifest=read('assets/art/row-ignition.json'),build=read('dist/build-manifest.json'),prefix='/nested/review/tinderbox/',directory=path.resolve('dist'),state=path.resolve('artifacts/row-ignition-package');fs.mkdirSync(state,{recursive:true});
const canonical=(b,r)=>r.byteRepresentation==='UTF-8 LF'?Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n')):b;
for(const r of [...manifest.derived,...manifest.protectedFiles,manifest.existingFlame])assert.equal(sha(canonical(fs.readFileSync(r.path),r)),r.sha256,r.path);
assert.deepEqual(read('dist/assets/art/row-ignition.json'),manifest);
const server=http.createServer((request,response)=>{const pathname=new URL(request.url,'http://localhost').pathname;if(!pathname.startsWith(prefix)){response.writeHead(404).end();return;}const file=path.resolve(directory,decodeURIComponent(pathname.slice(prefix.length)));if(!file.startsWith(directory+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404).end();return;}fs.createReadStream(file).pipe(response);});
const deadline=setTimeout(()=>{server.closeAllConnections();server.close();process.exit(124);},30000);deadline.unref();let port;
const record={owner:'01a17ea0-1362-7d13-a42d-f4a5fcff8902',task:'TB-019',purpose:'One finite nested-path package hash verification',pid:process.pid,executable:process.execPath,startedAt:new Date().toISOString(),intendedExpirySeconds:30,stopMethod:'finally closes the private in-process server; actual 30-second process deadline',source:'workbenches/art/check-row-ignition-package.mjs',state:'stateless'};
if(process.platform==='win32')record.creationFiletime=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`(Get-Process -Id ${process.pid}).StartTime.ToUniversalTime().ToFileTimeUtc().ToString()`],{encoding:'utf8',windowsHide:true}).trim();
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});port=server.address().port;record.port=port;fs.writeFileSync(path.join(state,'run.json'),JSON.stringify(record,null,2)+'\n');
 let served=0,bytes=0,imports=0;const paths=new Set(build.files.map(r=>r.path));
 for(const r of build.files){const b=fs.readFileSync(path.join(directory,r.path));assert.equal(sha(b),r.sha256);assert.equal(b.length,r.bytes);bytes+=b.length;if(r.path.startsWith('.'))continue;const result=await fetch('http://127.0.0.1:'+port+prefix+r.path);assert(result.ok,r.path);assert.equal(sha(Buffer.from(await result.arrayBuffer())),r.sha256,r.path);served++;
  if(r.path.endsWith('.js'))for(const match of b.toString('utf8').matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)){const target=new URL(match[1],'http://127.0.0.1:'+port+prefix+r.path).pathname;assert(target.startsWith(prefix));assert(paths.has(decodeURIComponent(target.slice(prefix.length))),r.path+' -> '+match[1]);imports++;}
 }
 const log=fs.readFileSync('artifacts/row-ignition-check.log','utf8'),counts=log.match(/(\d+) own scripts pass syntax; (\d+) static modules resolve/),tests=log.match(/tests (\d+)/),passes=log.match(/pass (\d+)/);assert(counts&&tests&&passes&&tests[1]===passes[1]&&/fail 0/.test(log));
 const report={passed:true,checkedAt:new Date().toISOString(),nestedPrefix:prefix,derivedHashChecks:manifest.derived.length,protectedSourceHashes:manifest.protectedFiles.length,unchangedFlameAtlas:true,buildFiles:build.files.length+1,servedFiles:served,buildBytes:bytes+fs.statSync('dist/build-manifest.json').size,nestedLocalImports:imports,repositoryCheck:{tests:Number(tests[1]),failures:0,ownScriptSyntax:Number(counts[1]),staticModules:Number(counts[2])},runtime:'Self-contained relative imports; no donor checkout paths',limits:'Finite served package validation only; no browser GPU or combined new simulation acceptance.'};
 fs.writeFileSync('docs/art/row-ignition/package-review.json',JSON.stringify(report,null,2)+'\n');record.passed=true;console.log(JSON.stringify(report,null,2));
}finally{
 await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});clearTimeout(deadline);record.finishedAt=new Date().toISOString();record.serverClosed=!server.listening;
 if(port)record.portReleased=await new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.on('connect',()=>{socket.destroy();resolve(false);});socket.on('error',()=>resolve(true));});
 record.restart={cwd:process.cwd(),executable:process.execPath,args:['workbenches/art/check-row-ignition-package.mjs'],inputs:['npm run build output','assets/art/row-ignition.json','artifacts/row-ignition-check.log'],outputs:['docs/art/row-ignition/package-review.json'],dependencies:['Node >=22; built project'],pendingWork:'none',secretReferences:[]};fs.writeFileSync(path.join(state,'run.json'),JSON.stringify(record,null,2)+'\n');assert(record.serverClosed&&record.portReleased,'Temporary package server must close and release its port');
}
