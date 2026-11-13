// Portable, loopback-only review server; no packages or external runtime paths.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function processIdentity(pid=process.pid){
  if(process.platform!=='win32')return {pid,executable:process.execPath,platform:process.platform};
  return JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command','$p=Get-Process -Id '+Number(pid)+'; [pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress'],{encoding:'utf8',windowsHide:true}));
}
export async function serve({root,out,deadline=Date.now()+1800000,stopFile,owner='01a17ea3-b99b-74d2-8a74-56d2556a19cb',port=0}={}){
  root=fs.realpathSync(root);out=path.resolve(out);fs.mkdirSync(out,{recursive:true});stopFile??=path.join(out,'STOP');
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
  const server=http.createServer((req,res)=>{try{
    let name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(name==='/favicon.ico'){res.writeHead(204).end();return;}if(name.endsWith('/'))name+='index.html';
    const relative=name.slice(1),file=path.resolve(root,relative);
    if(relative.split('/').some(s=>s.startsWith('.'))||!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile()||!fs.realpathSync(file).startsWith(root+path.sep)){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(400).end();}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const boundPort=server.address().port,startedAt=new Date().toISOString(),record={owner,project:'Tinderbox',purpose:'Finite isolated closing-time review',process:processIdentity(),port:boundPort,startedAt,expiresAt:new Date(deadline).toISOString(),stopFile,stopMethod:'Private STOP file, SIGINT/SIGTERM or fixed deadline',restart:{cwd:root,executable:process.execPath,source:import.meta.url,args:process.argv.slice(1),inputs:[path.join(root,'package-manifest.json')],outputs:[out],dependencies:['Node22+'],pendingWork:'Review only; restart deliberately',secretReferences:[]}};
  fs.writeFileSync(path.join(out,'helper.json'),JSON.stringify(record,null,2)+'\n');let closing,watcher,expiry;
  const close=reason=>closing??=(async()=>{clearInterval(watcher);clearTimeout(expiry);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(out,'server-cleanup.json'),JSON.stringify({stoppedAt:new Date().toISOString(),reason,port:boundPort,listening:server.listening,process:record.process},null,2)+'\n');})();
  watcher=setInterval(()=>{if(fs.existsSync(stopFile))void close('Private STOP');},300);expiry=setTimeout(()=>void close('Deadline'),Math.max(0,deadline-Date.now()));
  return {url:'http://127.0.0.1:'+boundPort+'/',port:boundPort,record,close};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const root=fs.existsSync(path.join(import.meta.dirname,'package-manifest.json'))?import.meta.dirname:path.resolve(import.meta.dirname,'../..'),out=path.join(root,'review-session-'+Date.now()),server=await serve({root,out});console.log(server.url+' — closes automatically in30minutes; Ctrl+C also stops it.');
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void server.close(signal));
}
