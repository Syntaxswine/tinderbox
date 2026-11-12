import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import {createRequire} from 'node:module';

const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg',
  '.webp':'image/webp','.svg':'image/svg+xml','.gltf':'model/gltf+json','.woff2':'font/woff2','.mp4':'video/mp4'};
const identity = pid => JSON.parse(execFileSync('powershell.exe', ['-NoProfile','-Command',
  '$p=Get-Process -Id '+pid+'; [pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress'],
  {encoding:'utf8',windowsHide:true}));
const originalProcessAlive = record => JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',
  '$p=Get-Process -Id '+record.pid+' -ErrorAction SilentlyContinue; if($null -eq $p){"false"}else{($p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -eq "'+record.creationFiletime+'") | ConvertTo-Json -Compress}'],
  {encoding:'utf8',windowsHide:true}));
const listening = port => new Promise(resolve => {
  const socket=net.connect({port,host:'127.0.0.1'});
  const finish = value => {socket.destroy();resolve(value);};
  socket.once('connect',()=>finish(true)); socket.once('error',()=>finish(false));
  socket.setTimeout(500,()=>finish(false));
});

// Task-owned, short-lived QA browser and read-only allowlisted fixture server.
// Every invocation closes both helpers, including on assertion/capture failure.
export async function withReviewBrowser(run, {suffix='review',lifetimeMs=600_000}={}) {
  const root=fs.realpathSync(process.cwd()), dist=path.join(root,'dist');
  const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
  const tracked=new Set(execFileSync('git',['ls-files','-z','--','src','assets','vendor','workbenches','art/source/furnished-house'],
    {encoding:'utf8',windowsHide:true,maxBuffer:20_000_000}).split('\0').filter(Boolean));
  const manifestBytes=fs.readFileSync(path.join(dist,'build-manifest.json'));
  const baselineRecords=JSON.parse(manifestBytes).files;
  const baselineFiles=new Set(baselineRecords.map(file=>file.path));
  const manifestHash=createHash('sha256').update(manifestBytes).digest('hex');
  assert.equal(manifestHash,'c592039f35d7f4173c17e4f9443726423e9d77eb8ee5bfdbb7d6430625c33987','The baseline must be the frozen c855e62 production package.');
  for(const file of baselineRecords){const location=path.resolve(dist,file.path);assert.ok(location.startsWith(dist+path.sep));const bytes=fs.readFileSync(location);assert.equal(bytes.length,file.bytes,file.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);}
  const output=path.join(root,'artifacts/qa/furnished-house-replay',suffix+'-'+Date.now());
  fs.mkdirSync(output,{recursive:true});
  const save=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n');
  const previews=new Map();
  const allowPreview=file=>{
    const location=fs.realpathSync(file);
    assert.ok(location.startsWith(output+path.sep),'Only this run\'s generated outputs may be previewed.');
    const url='/qa-output/'+previews.size+path.extname(location);previews.set(url,location);return url;
  };
  const server=http.createServer((request,response)=>{
    let url; try {url=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);}
    catch {return response.writeHead(400).end();}
    if(previews.has(url)){
      const file=previews.get(url),size=fs.statSync(file).size,range=request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      const start=range?Number(range[1]):0,end=range&&range[2]?Math.min(size-1,Number(range[2])):size-1;
      if(start>end||start>=size)return response.writeHead(416,{'Content-Range':`bytes */${size}`}).end();
      response.writeHead(range?206:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
      return fs.createReadStream(file,{start,end}).on('error',()=>response.destroy()).pipe(response);
    }
    if(url==='/qa.html')return response.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="icon" href="data:,"><title>Tinderbox architect review</title>');
    const baseline=url.startsWith('/baseline/'),prefix=baseline?'/baseline/':'/candidate/';
    const relative=url.slice(prefix.length)||'index.html';
    const directory=baseline?dist:root,location=path.resolve(directory,relative);
    if(!url.startsWith(prefix)||!(baseline?baselineFiles:tracked).has(relative)
       ||!location.startsWith(directory+path.sep))return response.writeHead(404).end();
    response.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(location).on('error',()=>response.destroy()).pipe(response);
  });
  const modules=process.env.TINDERBOX_PLAYWRIGHT_ROOT||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  let chromium;
  try{({chromium}=createRequire(import.meta.url)('playwright'));}
  catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;({chromium}=createRequire(path.join(modules,'playwright/package.json'))('playwright'));}
  let edge,browser,context,record,deadline,watcher,closing;
  const stopFile=path.join(output,'STOP');
  const bounded=async(operation,stage)=>{
    let timer;save('cleanup-stage.json',{stage,startedAt:new Date().toISOString()});
    try{return await Promise.race([operation(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cleanup deadline: '+stage)),15000);})]);}
    finally{clearTimeout(timer);}
  };
  const close=()=>closing??=(async()=>{
    clearTimeout(deadline);clearInterval(watcher);
    try {if(context)await bounded(()=>context.close(),'context close');}
    finally {try {try {if(browser)await bounded(()=>browser.close(),'browser client close');}
      finally {if(edge)await bounded(()=>edge.close(),'browser close');}}
      finally {if(server.listening){server.closeAllConnections();await bounded(()=>new Promise(resolve=>server.close(resolve)),'server close');}}}
  })();
  const errors=[];
  try {
    const started=Date.now();deadline=setTimeout(()=>void close(),lifetimeMs);
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    edge=await chromium.launchServer({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11'],timeout:30000});
    record={owner:'Architect Tinderbox',project:'Tinderbox',purpose:'Furnished-house prototype '+suffix,
      driver:identity(process.pid),browser:identity(edge.process().pid),
      ports:[server.address().port,Number(new URL(edge.wsEndpoint()).port)],
      startedAt:new Date(started).toISOString(),expiresAt:new Date(started+lifetimeMs).toISOString(),
      stopFile,stopMethod:'STOP file, deadline or driver finally',
      restart:{cwd:root,executable:process.execPath,args:process.argv.slice(1),commit,baselineManifest:manifestHash,output,
        ...(process.env.TINDERBOX_PLAYWRIGHT_ROOT?{environment:{TINDERBOX_PLAYWRIGHT_ROOT:process.env.TINDERBOX_PLAYWRIGHT_ROOT}}:{})}};
    save('helper.json',record);watcher=setInterval(()=>{if(fs.existsSync(stopFile))void close();},300);
    console.log(JSON.stringify({output,commit,ports:record.ports}));
    browser=await chromium.connect(edge.wsEndpoint());
    context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
    const origin='http://127.0.0.1:'+record.ports[0];
    await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
    const result=await run({page,context,origin,output,save,allowPreview,errors,commit,manifestHash});
    save('result.json',{commit,baselineManifest:manifestHash,result,errors});
    return {output,result,errors};
  }catch(error){save('failure.json',{commit,errors,stack:error.stack});throw error;}
  finally{
    let cleanupError;try{await close();}catch(error){cleanupError=String(error.stack||error);}
    if(record){const portsListening=await Promise.all(record.ports.map(listening));
      const child=edge?.process(),browserExited=!!child&&(child.exitCode!==null||child.signalCode!==null)||!originalProcessAlive(record.browser);
      // On Windows the server close promise can outlive its exited child.
      // Accept only an observed child exit plus both released owned ports.
      const cleanupWarning=cleanupError&&browserExited&&portsListening.every(value=>!value)?cleanupError:undefined;
      if(cleanupWarning)cleanupError=undefined;
      save('cleanup-receipt.json',{closedAt:new Date().toISOString(),helper:record,portsListening,browserExited,cleanupWarning,cleanupError});
      assert.deepEqual(portsListening,[false,false],'Review helper ports must be released.');}
    if(cleanupError)throw Error(cleanupError);
  }
}
