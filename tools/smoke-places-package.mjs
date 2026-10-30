// Actual nested-path HTTP and compiled native-source loading. No WebGL is faked.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {connect} from 'node:net';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve('dist'),prefix='/nested/tinderbox/',manifest=JSON.parse(fs.readFileSync(path.join(root,'build-manifest.json'))),startedAt=new Date().toISOString();
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((request,response)=>{
  try{const url=new URL(request.url,'http://127.0.0.1');if(!url.pathname.startsWith(prefix))throw Error('Wrong prefix');const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));
    if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile())throw Error('Missing resource');response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});response.end(fs.readFileSync(file));
  }catch{response.writeHead(404);response.end();}
});
const originalFetch=globalThis.fetch,controller=new AbortController();
const task=process.argv.find(arg=>arg.startsWith('--task='))?.slice(7)||'TB-024';
const creationFiletime=process.platform==='win32'?execFileSync('powershell.exe',['-NoProfile','-Command','(Get-Process -Id '+process.pid+').StartTime.ToUniversalTime().ToFileTimeUtc().ToString()'],{encoding:'utf8',windowsHide:true}).trim():null;
const receipt={task,owner:'01a17ea3-b99b-74d2-8a74-56d2556a19cb',pid:process.pid,creationFiletime,executable:process.execPath,startedAt,port:null,purpose:'Finite nested-path public package/source-section/character verification',intendedExpirySeconds:30,stopMethod:'Server finally close plus real 30-second abort and shutdown timeout',passed:false};
const receiptPath=process.argv.find(arg=>arg.startsWith('--receipt='))?.slice(10)||'docs/engineering/explorable-places/package-smoke.json';
fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
const saveReceipt=()=>fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
const timeout=setTimeout(()=>{receipt.timedOut=true;controller.abort(Error('Package verification exceeded 30 seconds'));server.closeAllConnections();server.close();},30000);
const fetchResource=(resource,options={})=>originalFetch(resource,{...options,signal:controller.signal});
let port,stream,viewRoot,failure;
const reports=[];
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});port=server.address().port;receipt.port=port;saveReceipt();
  const base='http://127.0.0.1:'+port+prefix,queue=[...manifest.files];let verified=0;
  const workers=await Promise.allSettled(Array.from({length:4},async()=>{while(queue.length){const file=queue.shift(),response=await fetchResource(new URL(file.path,base));if(!response.ok)throw Error('HTTP '+response.status+': '+file.path);
    const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Packaged bytes changed: '+file.path);
    if(file.path.endsWith('.js')&&!/javascript/.test(response.headers.get('content-type')))throw Error('Incorrect module MIME');verified++;
  }}));
  const rejected=workers.find(result=>result.status==='rejected');if(rejected)throw rejected.reason;
  for(const privatePath of ['art/source/','docs/engineering/','workbenches/integration/'])if((await fetchResource(new URL(privatePath,base))).status!==404)throw Error('Private evidence leaked into public package');
  globalThis.fetch=(resource,options)=>{const file=new URL(resource);if(file.protocol!=='file:')return fetchResource(resource,options);const relative=path.relative(root,fileURLToPath(file)).split(path.sep).join('/');if(relative.startsWith('../')||path.isAbsolute(relative))throw Error('Loader escaped package');return fetchResource(new URL(relative,base),options);};
  const T=await import(pathToFileURL(path.join(root,'src/runtime/three.js'))),{loadLandmark}=await import(pathToFileURL(path.join(root,'src/runtime/landmark.js'))),{createSectionStreamer}=await import(pathToFileURL(path.join(root,'src/runtime/sections.js')));
  for(const id of ['new-york','administration','horticulture']){
    const data=await loadLandmark(id);viewRoot=new T.Group();stream=createSectionStreamer({THREE:T,root:viewRoot,manifest:data.manifest,baseUrl:data.baseUrl});stream.update(data.navigation.spawn);await stream.settled();
    if(!stream.isReadyAt(data.navigation.spawn)||!viewRoot.children.length)throw Error('Selected native sections did not load: '+id);
    reports.push({placeId:id,statistics:data.manifest.statistics,exteriorGhost:data.ghost&&{segments:data.ghost.segments,sourceManifestSha256:data.ghost.sourceManifestSha256},loaded:stream.metrics()});stream.dispose();await stream.settled();if(viewRoot.children.length||stream.metrics().geometries||stream.metrics().materials)throw Error('Place resources survived exit');stream=null;
  }
  const {createCharacterRig}=await import(pathToFileURL(path.join(root,'src/reuse/characters.js'))),{CHARACTERS}=await import(pathToFileURL(path.join(root,'src/content/characters.js'))),{PLACES}=await import(pathToFileURL(path.join(root,'src/content/places.js')));
  if(CHARACTERS.map(c=>c.id).join(',')!=='goat,horse,bear'||PLACES.map(p=>p.id).join(',')!=='catalogue-street,new-york,administration,horticulture')throw Error('Packaged menu registry is stale');
  for(const {id}of CHARACTERS){const model=id==='bear'?'vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/bear-10k-data.json':'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/'+id+'-10k-data.json';
    const rig=createCharacterRig(id,await(await fetchResource(new URL(model,base))).json());try{if(!(rig.root instanceof T.Group)||!rig.diagnostics().nativeScale.every(v=>v===1))throw Error('Packaged character renderer/scale mismatch');}finally{rig.dispose();}
  }
  Object.assign(receipt,{verifiedFiles:verified,places:reports,characters:CHARACTERS.map(c=>c.id),menuEntries:PLACES.map(p=>p.id),rendered:false,browserAcceptance:'Not performed by this HTTP/source loader check',uiIntegration:task==='TB-024'?'Architect must reconcile exact TB-025 UI candidate; no UI files changed by TB-024':'Packaged UI from the current integration base; no UI files changed by this candidate',passed:true});
}catch(error){
  failure=error;receipt.error=String(error.message||error);
}finally{
  globalThis.fetch=originalFetch;
  try{stream?.dispose();if(stream)await stream.settled();}catch(error){failure||=error;receipt.cleanupError=String(error.message||error);}
  finally{
    controller.abort();server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));clearTimeout(timeout);
    receipt.stoppedAt=new Date().toISOString();receipt.serverClosed=!server.listening;
    receipt.portReleased=port?await new Promise(resolve=>{const socket=connect(port,'127.0.0.1');socket.setTimeout(2000);socket.once('error',error=>{socket.destroy();resolve(error.code==='ECONNREFUSED'?true:null);});socket.once('timeout',()=>{socket.destroy();resolve(null);});socket.once('connect',()=>{socket.destroy();resolve(false);});}):null;
    if(port&&receipt.portReleased!==true){failure||=Error('Package port release was not verified');receipt.cleanupError||=failure.message;}
    receipt.passed=receipt.passed&&!failure&&!receipt.timedOut;saveReceipt();console.log(JSON.stringify(receipt));
  }
}
// Let pending socket-close callbacks drain before Node exits on Windows.
if(failure||!receipt.passed){console.error(failure||Error('Package verification did not complete'));process.exitCode=1;}
