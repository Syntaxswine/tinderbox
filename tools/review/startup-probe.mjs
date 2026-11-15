import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {withCatalogueBrowser} from './catalogue-browser.mjs';
import {installStartupGpuLedger} from './startup-gpu-ledger.mjs';

const output=path.resolve(process.argv[2]||'artifacts/qa/grass-mobile-startup/baseline'),root=fs.realpathSync(process.cwd());
if(!output.startsWith(path.join(root,'artifacts')+path.sep))throw Error('Probe output must remain task-owned');fs.mkdirSync(output,{recursive:true});
const save=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n');
const sourceRoot=path.join(output,'restart-source');fs.mkdirSync(sourceRoot,{recursive:true});
const changed=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean),ownedSources=[...new Set([...changed,'tools/review/startup-probe.mjs','tools/review/startup-node-worker.mjs','tools/review/startup-gpu-ledger.mjs','tools/review/catalogue-browser.mjs'])];
for(const file of ownedSources){const destination=path.join(sourceRoot,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(file,destination);}fs.writeFileSync(path.join(sourceRoot,'tracked-changes.patch'),execFileSync('git',['diff','--binary']));save('restart-source.json',{base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime:process.version,cwd:root,sourceRoot,files:ownedSources,automaticRestart:false,notes:'Preserved exact source before launch. Deliberate overlay on recorded base only; no publishing step.'});
const identity=pid=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command','$p=Get-Process -Id '+pid+';[pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress'],{encoding:'utf8',windowsHide:true}));
// One disposable child has a parent-side deadline even during synchronous grid
// compilation. It exits before any browser/graphics work begins.
const log=fs.openSync(path.join(output,'node.log'),'a'),worker=spawn(process.execPath,['--expose-gc','tools/review/startup-node-worker.mjs',output],{cwd:root,windowsHide:true,stdio:['pipe',log,log]});
await new Promise((resolve,reject)=>{worker.once('spawn',resolve);worker.once('error',reject);});
const owned=identity(worker.pid),record={owner:'Coder Tinderbox',task:'M26 startup phased probe',purpose:'Cold physical allocation phases, no state export/benchmark library',...owned,startedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+300000).toISOString(),ports:[],stopMethod:'stdin STOP/STOP file, then exact-identity process handle if synchronous work cannot retire',restart:{cwd:root,executable:process.execPath,args:['--expose-gc','tools/review/startup-node-worker.mjs',output],go:'Parent writes GO after identity/deadline is recorded',source:['tools/review/startup-probe.mjs','tools/review/startup-node-worker.mjs']}};save('node-helper.json',record);
worker.stdin.on('error',()=>{});
let expired=false,timer=setTimeout(()=>{expired=true;fs.writeFileSync(path.join(output,'STOP'),'Owned probe deadline');worker.stdin.write('STOP\n');setTimeout(()=>{if(worker.exitCode===null){const live=identity(worker.pid);if(live.creationFiletime===owned.creationFiletime)worker.kill();}},1500);},300000);
worker.stdin.write('GO\n');
const exit=await new Promise(resolve=>worker.once('exit',(code,signal)=>resolve({code,signal})));clearTimeout(timer);fs.closeSync(log);save('node-helper-cleanup.json',{closedAt:new Date().toISOString(),helper:record,exit,expired,workerExited:true,ports:[]});if(exit.code!==0)throw Error('Owned startup child failed '+JSON.stringify(exit));

await withCatalogueBrowser(async({page,baseUrl,save:browserSave,errors})=>{
 page.setDefaultTimeout(120000);await page.addInitScript({content:'('+installStartupGpuLedger.toString()+')()'});
 await page.goto(baseUrl+'?catalogue=modules',{waitUntil:'networkidle'});
 const rows=[];page.on('console',message=>{if(message.type()==='info'&&message.text().startsWith('M26 ')){const row=JSON.parse(message.text().slice(4));rows.push(row);fs.appendFileSync(path.join(output,'browser-phases.jsonl'),JSON.stringify(row)+'\n');}});
 await page.evaluate(async()=>{
  const main=await import('./src/main.js');main.currentApplication.dispose();window.qa={snap:null,phases:[]};
  qa.app=main.startApplication({autoStart:false,onSnapshot:s=>{qa.snap=s;},onLoadPhase:info=>{window.__startupPhase=info.phase;const row={...info,wallMs:performance.now(),heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null,gpu:window.__startupGpu()};qa.phases.push(row);console.info('M26 '+JSON.stringify(row));}});
 });
 await page.locator('[data-title-start]').click();await page.getByRole('button',{name:'Open Catalogue Street map',exact:true}).click();await page.waitForFunction(()=>qa.app.state().phase==='visit'||qa.app.state().error);if(await page.evaluate(()=>qa.app.state().phase)!=='visit')throw Error('Baseline startup failed');
 const initial=await page.evaluate(()=>({phases:qa.phases,metrics:qa.app.visit().metrics(),art:qa.app.visit().artDiagnostics(),gpu:window.__startupGpu(true),heap:performance.memory?.usedJSHeapSize}));browserSave('browser-initial.json',initial);save('browser-phases.json',rows);await page.screenshot({path:path.join(output,'cold-start.jpg'),type:'jpeg',quality:86});
 const quiet=await page.evaluate(()=>{const rows=[];for(let i=0;i<12;i++){const start=performance.now();qa.app.visit().advance(1/60);rows.push(performance.now()-start);}return rows;});browserSave('quiet-cpu.json',{scope:'12 driver-stepped quiet frames; not FPS',cpuMs:quiet});
 const disposal=await page.evaluate(()=>{const runtime=qa.app.visit();qa.app.dispose();return {art:runtime.artDiagnostics(),gpu:window.__startupGpu(),heap:performance.memory?.usedJSHeapSize};});await page.waitForTimeout(100);disposal.gpu=await page.evaluate(()=>window.__startupGpu());browserSave('browser-disposal.json',disposal);
 if(errors.length)throw Error('Startup page errors '+JSON.stringify(errors));return {pass:true,scope:'One sequential cold Node source/physics, then desktop Edge art/GPU payload accounting; no iOS/hardware claim.',phases:rows.length};
},{output:path.join(output,'browser-helper'),lifetimeMs:300000,purpose:'M26 cold startup native art/paint GL payload slice after the physical worker has exited'});
