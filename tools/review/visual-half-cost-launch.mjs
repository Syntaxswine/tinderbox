// M30's single environment/capability probe. No game import, build or timings.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {reviewHelperRecord,launchRecordedBrowser,finishReviewHelper} from './catalogue-browser.mjs';
import {createPageContextOwner} from './browser-lanes.mjs';

const root=fs.realpathSync(process.cwd()),output=path.join(root,'artifacts/qa/visual-half-cost/launch-only-02'),save=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n');
const identity=pid=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`$p=Get-Process -Id ${pid} -ErrorAction Stop;[pscustomobject]@{pid=$p.Id;creationFiletime=$p.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json -Compress`],{windowsHide:true,encoding:'utf8',timeout:2000}));
const present=pid=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
const alive=p=>{if(!present(p.pid))return false;const now=identity(p.pid);return now.creationFiletime===p.creationFiletime&&now.executable.toLowerCase()===p.executable.toLowerCase();};
const listening=port=>new Promise((resolve,reject)=>{const socket=net.connect({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',error=>{socket.destroy();if(error.code==='ECONNREFUSED')resolve(false);else reject(error);});socket.setTimeout(500,()=>{socket.destroy();reject(Error('PORT_CHECK_TIMEOUT'));});});
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function supervisor(){
  assert.equal(fs.existsSync(path.join(output,'invocation.json')),false,'PROBE_ALLOWANCE_CONSUMED');
  const temp=path.join(output,'tmp');assert.equal(path.resolve(os.tmpdir()).toLowerCase(),temp.toLowerCase(),'SET_DRIVER_TEMP_BEFORE_NODE_STARTS');
  const started=Date.now(),record={owner:'Coder Tinderbox',purpose:'M30 one launch-only WebGL2/timer/hardware probe',cwd:root,executable:process.execPath,args:['tools/review/visual-half-cost-launch.mjs','--child'],startedAt:new Date(started).toISOString(),deadline:new Date(started+45000).toISOString(),timeoutMs:45000,temp,automaticRestart:false,endCondition:'First result/failure plus closure; never retry'};
  save('invocation.json',record);
  const child=spawn(process.execPath,record.args,{windowsHide:true,stdio:['ignore','pipe','pipe']});Object.assign(record,identity(child.pid));save('invocation.json',record);
  const stdout=fs.createWriteStream(path.join(output,'stdout.log')),stderr=fs.createWriteStream(path.join(output,'stderr.log'));child.stdout.pipe(stdout);child.stderr.pipe(stderr);child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
  let timedOut=false;const stopErrors=[];
  const timer=setTimeout(()=>{timedOut=true;fs.writeFileSync(path.join(output,'STOP'),'M30 probe absolute deadline\n');let helper;try{helper=JSON.parse(fs.readFileSync(path.join(output,'helper.json'),'utf8'));}catch(error){stopErrors.push(error.message);}for(const p of [helper?.browser,record].filter(Boolean)){try{if(alive(p))process.kill(p.pid,'SIGTERM');}catch(error){stopErrors.push(error.message);}}},Math.max(1,started+38000-Date.now()));
  const exit=await new Promise(resolve=>{child.once('error',e=>resolve({code:null,error:e.message}));child.once('exit',(code,signal)=>resolve({code,signal}));});clearTimeout(timer);
  await Promise.all([new Promise(r=>stdout.end(r)),new Promise(r=>stderr.end(r))]);
  const cleanup=fs.existsSync(path.join(output,'cleanup-receipt.json'))?JSON.parse(fs.readFileSync(path.join(output,'cleanup-receipt.json'),'utf8')):null,ports=cleanup?.helper.ports||[],portsListening=await Promise.all(ports.map(listening));
  const passed=exit.code===0&&!timedOut&&!present(child.pid)&&cleanup?.browserExited===true&&portsListening.every(v=>!v)&&cleanup?.contextLifecycle?.remaining===0;
  save('invocation-receipt.json',{...record,endedAt:new Date().toISOString(),exit,timedOut,stopErrors,driverExited:!present(child.pid),ports,portsListening,passed,retainedHelpers:[]});assert.ok(passed,'LAUNCH_ONLY_PROBE_FAILED');
}
async function probe(){
  const started=Date.now(),temp=fs.realpathSync(os.tmpdir());assert.equal(temp.toLowerCase(),path.join(output,'tmp').toLowerCase(),'WORKSPACE_TEMP_REQUIRED');
  const record=reviewHelperRecord({purpose:'M30 launch-only capability; zero game pages',driver:identity(process.pid),root,output,manifestSha256:sha(path.join(root,'artifacts/qa/visual-half-cost/baseline-current-01/reference-package/build-manifest.json')),started,lifetimeMs:23000,target:'Isolated blank capability page only',stopFile:path.join(output,'STOP')});
  record.environment={TEMP:process.env.TEMP,TMP:process.env.TMP,tmpdir:temp};save('helper.json',record);
  const modules=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),{chromium}=createRequire(path.join(modules,'playwright/package.json'))('playwright');
  let edge,browser,owner,closing;const bounded=async(operation,stage)=>{let timer;try{return await Promise.race([operation(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('PROBE_CLOSE_TIMEOUT '+stage)),4000);})]);}finally{clearTimeout(timer);}};
  const close=()=>closing??=(async()=>{clearTimeout(deadline);clearInterval(watcher);try{if(owner)await bounded(()=>owner.closeAll(),'contexts');}finally{try{if(browser)await bounded(()=>browser.close(),'client');}finally{if(edge)await bounded(()=>edge.close(),'browser');}}})();
  const deadline=setTimeout(()=>void close(),23000),watcher=setInterval(()=>{if(fs.existsSync(path.join(output,'STOP')))void close();},200);
  try{
    edge=await launchRecordedBrowser({record,save,identity,launch:()=>chromium.launchServer({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11'],timeout:15000})});
    if(closing)throw Error('PROBE_DEADLINE_DURING_LAUNCH');browser=await chromium.connect(edge.wsEndpoint(),{timeout:5000});
    owner=createPageContextOwner({browser,origin:'http://127.0.0.1',bounded});const lease=await owner.create();lease.page.setDefaultTimeout(4000);await lease.page.setContent('<canvas width="64" height="64"></canvas>');
    const capability=await lease.page.evaluate(async()=>{
      const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2',{antialias:true});if(!gl)throw Error('WEBGL2_UNAVAILABLE');
      const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info'),lose=gl.getExtension('WEBGL_lose_context');if(!ext||!lose)throw Error('GPU_TIMER_OR_LOSE_CONTEXT_UNAVAILABLE');
      const result={webgl2:true,timerQuery:true,vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),unmaskedVendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):null,unmaskedRenderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,version:gl.getParameter(gl.VERSION),shadingLanguage:gl.getParameter(gl.SHADING_LANGUAGE_VERSION),attributes:gl.getContextAttributes(),userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio};
      const query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);gl.clearColor(.2,.1,.05,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.endQuery(ext.TIME_ELAPSED_EXT);gl.flush();
      const expires=performance.now()+2000;while(!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){if(performance.now()>expires)throw Error('GPU_QUERY_NOT_READY');await new Promise(requestAnimationFrame);}
      result.disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT);result.gpuMs=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(query);if(result.disjoint||!Number.isFinite(result.gpuMs))throw Error('GPU_QUERY_INVALID');
      const lost=new Promise(resolve=>canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();resolve();},{once:true}));lose.loseContext();await lost;result.contextLost=gl.isContextLost();return result;
    });
    assert.ok(capability.contextLost);save('capability.json',{...capability,browserVersion:browser.version(),scope:'Launch-only clear/query, no Tinderbox/native import, no benchmark sample'});await lease.close();
  }catch(error){save('failure.json',{stack:error.stack,logs:error.logs||''});throw error;}
  finally{await finishReviewHelper({record,save,close,listening,alive,processPresent:present,child:edge?.process(),contextLifecycle:()=>owner?.diagnostics()});}
}
if(process.argv[2]==='--probe')await supervisor();else if(process.argv[2]==='--child')await probe();else throw Error('Choose --probe; a consumed probe never retries.');
