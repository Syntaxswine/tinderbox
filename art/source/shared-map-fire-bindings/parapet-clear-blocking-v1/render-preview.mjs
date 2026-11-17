// One finite offline close-up session. Pure JS triangle rasterizer; OS JPEG encoding.
// No Three.js renderer, native activation, browser, server, simulation or world.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const file=fileURLToPath(import.meta.url),here=path.dirname(file),root=path.resolve(here,'../../../..');
const artifact=path.join(root,'artifacts/shared-map-fire-bindings/parapet-clear-blocking-v1');
const previews=path.join(root,'docs/art/shared-map-fire-bindings/parapet-clear-blocking-v1/previews');
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(p,a)=>fs.writeFileSync(p,JSON.stringify(a,null,2)+'\n');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifestPath='assets/art/shared-map-support-additions/new-york-parapet-clear-blocking-v1/index.json';
const powershell=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');
if(isMainThread){
 fs.mkdirSync(artifact,{recursive:true});fs.mkdirSync(previews,{recursive:true});
 if(fs.readdirSync(previews).some(f=>f.endsWith('.jpg')))throw Error('Preview already exists: one session only; do not silently rerender.');
 const began=Date.now(),recordPath=path.join(artifact,'run-'+process.pid+'.json');
 const creation=execFileSync(powershell,['-NoProfile','-Command',String.raw`(Get-Process -Id ${process.pid}).StartTime.ToUniversalTime().ToFileTimeUtc().ToString()`],{encoding:'utf8',windowsHide:true,timeout:10000}).trim();
 const record={ownerChat:'01a17ea0-1362-7d13-a42d-f4a5fcff8902',project:'Tinderbox',task:'M29 approved 96 clear parapet blocks',purpose:'Two finite actual-triangle offline close-up JPGs',
  pid:process.pid,creationFiletime:creation,executable:process.execPath,source:file,workingDirectory:root,
  startedAt:new Date(began).toISOString(),intendedExpirySeconds:120,automaticShutdown:'Main-thread deadline terminates task worker / owned encoder; natural exit on completion.',port:null,
  inputs:[manifestPath],outputs:previews,retained:false,renderWorkerThread:true};
 write(recordPath,record);
 let worker,encoder,finished=false;
 const closeRecord=(passed,error)=>{
  if(finished)return;finished=true;record.passed=passed;record.finishedAt=new Date().toISOString();record.seconds=(Date.now()-began)/1000;
  if(error)record.error=String(error);write(recordPath,record);
 };
 const deadline=setTimeout(()=>{
  if(worker)worker.terminate();if(encoder&&!encoder.killed)encoder.kill();
  closeRecord(false,'Actual 120-second preview deadline');process.exitCode=124;
 },Math.max(1,120000-(Date.now()-began)));
 try{
  worker=new Worker(file,{workerData:{artifact,previews}});
  const plan=await new Promise((resolve,reject)=>{
   worker.once('message',resolve);worker.once('error',reject);worker.once('exit',code=>{if(code)reject(Error('Render worker exit '+code));});
  });
  await new Promise((resolve,reject)=>{
   const planLiteral="'"+path.join(artifact,'plan.json').replaceAll("'","''")+"'";
   const literalEncoder='& {\n'+fs.readFileSync(path.join(here,'encode-preview.ps1'),'utf8')+'\n} -PlanPath '+planLiteral+' -OwnerPid '+process.pid;
   encoder=spawn(powershell,['-NoProfile','-Command',literalEncoder],{windowsHide:true,stdio:['ignore','pipe','pipe']});
   record.encoderPid=encoder.pid;write(recordPath,record);let log='';
   encoder.stdout.on('data',b=>log+=b);encoder.stderr.on('data',b=>log+=b);
   encoder.once('error',reject);encoder.once('exit',code=>code===0?resolve():reject(Error('JPEG encoder exit '+code+': '+log)));
  });
  const outputs=plan.views.map(v=>({path:path.relative(root,v.jpgPath).replaceAll('\\','/'),sha256:sha(fs.readFileSync(v.jpgPath)),width:1600,height:1100,
   camera:v.camera,sourceCarrierIds:v.sourceCarrierIds,newCarrierIds:v.newCarrierIds,physicalWidthMetres:v.camera.halfWidth*2,
   imagePixelsPerMetre:1600/(2*v.camera.halfWidth),triangles:v.triangles,omitted:'Whole building, roof, balusters, piers, game, effects, simulation and UI. Only the two named original parent solids and selected new blocks are shown.'}));
  write(path.join(here,'preview-evidence.json'),{version:1,sessionCount:1,jpgCount:2,scope:'Offline source-triangle close-ups; not running-game or full support acceptance.',renderer:'Deterministic pure JavaScript orthographic triangle rasterizer, linear diffuse source colours, one directional shadow, 2x sampling; Windows System.Drawing JPEG/labels.',
   rendererSourceSha256:sha(fs.readFileSync(file)),encoderSourceSha256:sha(fs.readFileSync(path.join(here,'encode-preview.ps1'))),
   manifestPath,manifestSha256:sha(fs.readFileSync(path.join(root,manifestPath))),samplesPerPixel:4,cameraSeed:'No random sampling',outputs,
   dependencyProbeFailure:'Installed Mitsuba / drjit could not load: Windows Application Control blocked _drjit_ext. Two dependency-only probes started no scene. No policy was changed; this preview uses standard JS and the OS image library.',
   runtimeBehaviorAcceptance:false,visualInspection:'pending',sessionRecord:path.relative(root,recordPath).replaceAll('\\','/')});
  record.outputs=outputs.map(o=>o.path);closeRecord(true);console.log(JSON.stringify({result:'PASS',jpgCount:2,sessionRecord:recordPath,seconds:record.seconds}));
 }catch(e){closeRecord(false,e);throw e;}finally{clearTimeout(deadline);if(worker)await worker.terminate();}
}else{
 const a=read(manifestPath),base=read(a.baseBindings.path),by=new Map(base.carriers.map(c=>[c.id,c])),scene=read(a.appearanceSource.indexPath),geo=new Map();
 const norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);},sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
 const point=(p,m)=>[0,1,2].map(k=>m[k]*p[0]+m[4+k]*p[1]+m[8+k]*p[2]+m[12+k]);
 function triangles(binding,material){
  if(!geo.has(binding.geometryPath))geo.set(binding.geometryPath,read(binding.geometryPath));
  const g=geo.get(binding.geometryPath),p=g.attributes.position.array,idx=g.index?.array??Array.from({length:p.length/3},(_,i)=>i),range=binding.sourceRange;
  const start=range?.start??0,end=start+(range?.count??idx.length),out=[];
  for(let i=start;i<end;i+=3){const t=idx.slice(i,i+3).map(j=>point(p.slice(j*3,j*3+3),binding.matrix));out.push({v:t,n:norm(cross(sub(t[1],t[0]),sub(t[2],t[0]))),color:scene.materials[material].color});}
  return out;
 }
 const W=3200,H=1720,SUN=norm([1,2,-1]);
 const views=[
  {name:'repeat-closeup',title:'Clear parapet blocks | one-metre repeat',caption:'Three new blocks between the original cornice and parapet base. Original dimensions and finish.',
   newCarrierIds:[5,6,7].map(n=>'carrier/clear-parapet-blocking/main-parapet-1/bay-'+String(n).padStart(2,'0')),
   sourceCarrierIds:['carrier/edge-1/cornice-7','carrier/main-parapet-1/base'],
   camera:{target:[80,17.20,32.5],origin:[83.6,18.15,30.5],up:[0,1,0],halfWidth:1.55},rulerMetres:.5,
   notes:['Block: 0.16 x 0.20999999821185966 x 0.16 m; 1 m centre spacing.','Only three of the 96 approved placements shown. Existing front 48 and 20 obstructed positions excluded.']},
  {name:'bearing-closeup',title:'Native bearing detail | fixed original parents',caption:'One new block shown at its actual size. Original cornice below; original parapet base above.',
   newCarrierIds:['carrier/clear-parapet-blocking/main-parapet-3/bay-01'],
   sourceCarrierIds:['carrier/edge-3/cornice-7','carrier/main-parapet-3/base'],
   camera:{target:[70,17.20,55.5],origin:[72.8,17.91,54.5],up:[0,1,0],halfWidth:.48},rulerMetres:.1,
   notes:['Lower separation: 0 m. Upper separation: 1.5258789431982223e-7 m (retained; below pixel scale).','Native contact tolerance remains 1e-5 m. This close-up is visual evidence, not full support acceptance.']}
 ];
 for(const view of views){
  const selected=view.newCarrierIds.map(id=>{const m=a.members.find(m=>m.id===id);if(!m)throw Error('Missing preview piece');return m;});
  const all=[];
  for(const id of view.sourceCarrierIds)for(const b of by.get(id).renderBindings)if(b.physicalContribution==='carrier-solid')all.push(...triangles(b,b.appearanceMaterialId));
  for(const m of selected)all.push(...triangles({geometryPath:a.geometry.path,matrix:m.matrix},m.appearanceMaterialId));
  const c=view.camera,f=norm(sub(c.target,c.origin)),right=norm(cross(f,c.up)),up=cross(right,f),scale=W/(2*c.halfWidth);
  const project=p=>{const d=sub(p,c.target);return [W/2+dot(d,right)*scale,H/2-dot(d,up)*scale,dot(sub(p,c.origin),f)];};
  const pixels=Buffer.alloc(W*H*3),depth=new Float64Array(W*H).fill(Infinity);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*3,t=y/H;pixels[i]=Math.round(68+16*t);pixels[i+1]=Math.round(77+17*t);pixels[i+2]=Math.round(69+14*t);}
  const srgb=x=>Math.round(255*Math.max(0,Math.min(1,x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055)));
  const shadowTriangles=all.map(t=>({a:t.v[0],e1:sub(t.v[1],t.v[0]),e2:sub(t.v[2],t.v[0])}));
  function shadow(p,skip){
   for(let k=0;k<shadowTriangles.length;k++){
    if(k===skip)continue;const t=shadowTriangles[k],q=cross(SUN,t.e2),det=dot(t.e1,q);if(Math.abs(det)<1e-10)continue;
    const inv=1/det,s=sub(p,t.a),u=dot(s,q)*inv;if(u<0||u>1)continue;
    const r=cross(s,t.e1),v=dot(SUN,r)*inv;if(v<0||u+v>1)continue;
    if(dot(t.e2,r)*inv>1e-6)return true;
   }return false;
  }
  for(let ti=0;ti<all.length;ti++){
   const tri=all[ti],p=tri.v.map(project),[v0,v1,v2]=p,area=(v1[1]-v2[1])*(v0[0]-v2[0])+(v2[0]-v1[0])*(v0[1]-v2[1]);if(Math.abs(area)<1e-8)continue;
   const minX=Math.max(0,Math.floor(Math.min(...p.map(v=>v[0])))),maxX=Math.min(W-1,Math.ceil(Math.max(...p.map(v=>v[0]))));
   const minY=Math.max(0,Math.floor(Math.min(...p.map(v=>v[1])))),maxY=Math.min(H-1,Math.ceil(Math.max(...p.map(v=>v[1]))));
   const diffuse=Math.max(0,dot(tri.n,SUN));
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const xx=x+.5,yy=y+.5,u=((v1[1]-v2[1])*(xx-v2[0])+(v2[0]-v1[0])*(yy-v2[1]))/area,v=((v2[1]-v0[1])*(xx-v2[0])+(v0[0]-v2[0])*(yy-v2[1]))/area,w=1-u-v;
    if(u<0||v<0||w<0)continue;const z=u*v0[2]+v*v1[2]+w*v2[2],i=y*W+x;if(z>=depth[i])continue;depth[i]=z;
    const world=[0,1,2].map(k=>u*tri.v[0][k]+v*tri.v[1][k]+w*tri.v[2][k]+tri.n[k]*1e-6);
    const light=.35+(.65*diffuse*(shadow(world,ti)?.15:1));
    for(let k=0;k<3;k++)pixels[i*3+k]=srgb(tri.color[k]*light);
   }
  }
  const stride=(W*3+3)&~3,header=Buffer.alloc(54),body=Buffer.alloc(stride*H);header.write('BM');header.writeUInt32LE(54+body.length,2);header.writeUInt32LE(54,10);header.writeUInt32LE(40,14);header.writeInt32LE(W,18);header.writeInt32LE(-H,22);header.writeUInt16LE(1,26);header.writeUInt16LE(24,28);header.writeUInt32LE(body.length,34);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*3,j=y*stride+x*3;body[j]=pixels[i+2];body[j+1]=pixels[i+1];body[j+2]=pixels[i];}
  view.bmpPath=path.join(artifact,view.name+'.bmp');fs.writeFileSync(view.bmpPath,Buffer.concat([header,body]));
  view.jpgPath=path.join(previews,view.name+'.jpg');view.triangles=all.length;
  view.blockMarkers=selected.map(m=>({id:m.id,screen:project(m.matrix.slice(12,15)).slice(0,2).map(v=>v/2)}));
 }
 const plan={version:1,views,renderPixels:[W,H],outputRenderPixels:[1600,860],canvasPixels:[1600,1100],footer:'OFFLINE ASSET CLOSE-UP | Whole building and other fittings omitted. No game, fire, UI or runtime support acceptance.'};
 write(path.join(artifact,'plan.json'),plan);parentPort.postMessage(plan);
}
