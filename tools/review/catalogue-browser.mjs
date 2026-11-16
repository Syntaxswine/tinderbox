import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createPageContextOwner} from './browser-lanes.mjs';

// Reuses the furnished-house review lifecycle, serving the real packaged title
// and Catalogue visit. No fixture page, alternate game controller or retained
// browser/profile is created.
export async function withCatalogueBrowser(run,{output,lifetimeMs=900000,url,referencePackage,purpose='Actual host title/visit/continuity/JPG review'}={}){
 const remote=url?new URL(url):null;if(remote&&(remote.protocol!=='https:'||remote.username||remote.password||remote.search||remote.hash||!remote.pathname.endsWith('/')))throw Error('Remote review requires an HTTPS base directory URL without credentials/query/hash');
 const root=fs.realpathSync(process.cwd()),dist=path.join(root,'dist'),out=path.resolve(output||'artifacts/qa/catalogue-modular/browser-'+Date.now());if(!out.startsWith(path.join(root,'artifacts')+path.sep))throw Error('QA output must remain inside this worktree artifacts');fs.mkdirSync(out,{recursive:true});
 const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n'),bytes=fs.readFileSync(path.join(dist,'build-manifest.json')),manifest=JSON.parse(bytes),files=new Set(manifest.files.map(f=>f.path));files.add('build-manifest.json');
 for(const file of manifest.files){const p=path.resolve(dist,file.path);if(!p.startsWith(dist+path.sep))throw Error('Bad package path');const b=fs.readFileSync(p);if(b.length!==file.bytes||createHash('sha256').update(b).digest('hex')!==file.sha256)throw Error('Package changed '+file.path);}
 let reference=null;const deliveries=[{prefix:'/tinderbox/',directory:dist,files}];
 if(referencePackage){
  if(remote)throw Error('A frozen comparison package requires the local review host');
  const directory=fs.realpathSync(path.resolve(referencePackage));if(!directory.startsWith(path.join(root,'artifacts')+path.sep))throw Error('Reference package must remain in task-owned artifacts');
  const referenceBytes=fs.readFileSync(path.join(directory,'build-manifest.json')),referenceManifest=JSON.parse(referenceBytes),referenceFiles=new Set(referenceManifest.files.map(f=>f.path));referenceFiles.add('build-manifest.json');
  for(const file of referenceManifest.files){const p=path.resolve(directory,file.path);if(!p.startsWith(directory+path.sep))throw Error('Bad reference package path');const b=fs.readFileSync(p);if(b.length!==file.bytes||createHash('sha256').update(b).digest('hex')!==file.sha256)throw Error('Frozen reference changed '+file.path);}
  reference={directory,prefix:'/tinderbox-reference/',manifest:referenceManifest,manifestSha256:createHash('sha256').update(referenceBytes).digest('hex')};deliveries.push({...reference,files:referenceFiles});
 }
 const identity=pid=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command','$p=Get-Process -Id '+pid+';[pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress'],{encoding:'utf8',windowsHide:true}));
 const alive=r=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command','$p=Get-Process -Id '+r.pid+' -ErrorAction SilentlyContinue;if($null -eq $p){"false"}else{($p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -eq "'+r.creationFiletime+'")|ConvertTo-Json -Compress}'],{encoding:'utf8',windowsHide:true}));
 const listening=port=>new Promise(resolve=>{const s=net.connect({host:'127.0.0.1',port}),done=v=>{s.destroy();resolve(v);};s.once('connect',()=>done(true));s.once('error',()=>done(false));s.setTimeout(500,()=>done(false));});
 const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
 const server=http.createServer((req,res)=>{let relative,delivery;try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);delivery=deliveries.find(d=>pathname.startsWith(d.prefix));if(!delivery)return res.writeHead(404).end();relative=pathname.slice(delivery.prefix.length)||'index.html';}catch{return res.writeHead(400).end();}const p=path.resolve(delivery.directory,relative);if(!p.startsWith(delivery.directory+path.sep)||!delivery.files.has(relative))return res.writeHead(404).end();res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(p).on('error',()=>res.destroy()).pipe(res);});
 const modules=process.env.TINDERBOX_PLAYWRIGHT_ROOT||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');let chromium;try{({chromium}=createRequire(import.meta.url)('playwright'));}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;({chromium}=createRequire(path.join(modules,'playwright/package.json'))('playwright'));}
 let edge,browser,context,contextOwner,record,deadline,watcher,closing;const errors=[],stopFile=path.join(out,'STOP');
 const bounded=async(operation,stage)=>{let timer;save('cleanup-stage.json',{stage,startedAt:new Date().toISOString()});try{return await Promise.race([operation(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cleanup deadline '+stage)),15000);})]);}finally{clearTimeout(timer);}};
 const close=()=>closing??=(async()=>{clearTimeout(deadline);clearInterval(watcher);try{if(contextOwner)await bounded(()=>contextOwner.closeAll(),'contexts');}finally{try{if(browser)await bounded(()=>browser.close(),'client');}finally{try{if(edge)await bounded(()=>edge.close(),'browser');}finally{if(server.listening){server.closeAllConnections();await bounded(()=>new Promise(resolve=>server.close(resolve)),'server');}}}}})();
 try{
  const started=Date.now();deadline=setTimeout(()=>{save('deadline.json',{expiredAt:new Date().toISOString()});void close();},lifetimeMs);
  if(!remote)await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});edge=await chromium.launchServer({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11'],timeout:30000});
  record={owner:'Coder Tinderbox',project:'Catalogue modular host',purpose,driver:identity(process.pid),browser:identity(edge.process().pid),ports:[...(!remote?[server.address().port]:[]),Number(new URL(edge.wsEndpoint()).port)],target:remote?.href||'nested local package',startedAt:new Date(started).toISOString(),expiresAt:new Date(started+lifetimeMs).toISOString(),automaticStop:'Driver deadline calls context/browser/server close',stopFile,stopMethod:'STOP file, deadline, or finally',restart:{cwd:root,executable:process.execPath,args:process.argv.slice(1),output:out,manifestSha256:createHash('sha256').update(bytes).digest('hex')}};save('helper.json',record);watcher=setInterval(()=>{if(fs.existsSync(stopFile))void close();},300);console.log(JSON.stringify({output:out,helper:record}));
  browser=await chromium.connect(edge.wsEndpoint());const origin=remote?.origin||'http://127.0.0.1:'+record.ports[0];
  contextOwner=createPageContextOwner({browser,origin,bounded,onPage(page){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});}});
  const pageContext=await contextOwner.create(),page=pageContext.page;context=pageContext.context;
  if(reference){record.restart.reference={directory:reference.directory,manifestSha256:reference.manifestSha256};save('helper.json',record);}
  const result=await run({page,context,pageContext,createPageContext:contextOwner.create,contextDiagnostics:contextOwner.diagnostics,origin,baseUrl:remote?.href||origin+'/tinderbox/',referenceBaseUrl:reference?origin+reference.prefix:undefined,referenceManifest:reference?.manifest,referenceManifestSha256:reference?.manifestSha256,output:out,save,errors,manifest,manifestSha256:record.restart.manifestSha256});save('result.json',{result,errors});return {output:out,result,errors};
 }catch(error){save('failure.json',{stack:error.stack,errors});throw error;}
 finally{
  let cleanupError;try{await close();}catch(error){cleanupError=error.stack||String(error);}if(record){const portsListening=await Promise.all(record.ports.map(listening)),child=edge?.process(),browserExited=!!child&&(child.exitCode!==null||child.signalCode!==null)||!alive(record.browser),warning=cleanupError&&browserExited&&portsListening.every(v=>!v)?cleanupError:undefined;if(warning)cleanupError=undefined;save('cleanup-receipt.json',{closedAt:new Date().toISOString(),helper:record,portsListening,browserExited,contextLifecycle:contextOwner?.diagnostics(),warning,cleanupError});if(!browserExited||portsListening.some(Boolean))throw Error('QA helper cleanup incomplete');}if(cleanupError)throw Error(cleanupError);
 }
}
