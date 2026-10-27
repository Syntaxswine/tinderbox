
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url))),port=Number(arg('--port','4551')),ttl=Number(arg('--ttl','3600'));
const state=path.resolve(arg('--state',path.join(root,'artifacts/art-preview'))),stopFile=path.join(state,'STOP');
fs.mkdirSync(state,{recursive:true});if(fs.existsSync(stopFile))fs.unlinkSync(stopFile);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
let closing=false,watcher,deadline;
const server=http.createServer((req,res)=>{
  let file;
  try{
    let urlPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(urlPath.endsWith('/'))urlPath+='index.html';
    if(urlPath.split('/').some(p=>p.startsWith('.'))){res.writeHead(404);res.end();return;}
    file=path.resolve(root,'.'+urlPath);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  }catch{res.writeHead(400);res.end();return;}
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store'});
    const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
});
function close(reason){
  if(closing)return;closing=true;clearInterval(watcher);clearTimeout(deadline);
  server.close(()=>{fs.writeFileSync(path.join(state,'exited.json'),JSON.stringify({pid:process.pid,reason,at:new Date().toISOString()},null,2));process.exit(0);});
  server.closeIdleConnections();setTimeout(()=>server.closeAllConnections(),800).unref();
}
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
  const record={pid:process.pid,owner:'01a17ea0-1362-7d13-a42d-f4a5fcff8902',project:'Tinderbox/TB-005',purpose:'Read-only art visual review',executable:process.execPath,cwd:root,port,startedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+ttl*1000).toISOString(),stopFile};
  fs.writeFileSync(path.join(state,'server.json'),JSON.stringify(record,null,2));console.log('Art review http://127.0.0.1:'+port+'/workbenches/art/ ; automatic stop in '+ttl+' s');
  watcher=setInterval(()=>{if(fs.existsSync(stopFile))close('stop-file');},300);
  deadline=setTimeout(()=>close('ttl'),ttl*1000);
});
process.on('SIGTERM',()=>close('SIGTERM'));process.on('SIGINT',()=>close('SIGINT'));
