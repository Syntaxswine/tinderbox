
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const args=process.argv.slice(2),arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const url=arg('--url','http://127.0.0.1:4551/workbenches/art/'),out=path.resolve(arg('--out',path.join(root,'artifacts/art-review')));
const library=arg('--playwright',process.env.TINDERBOX_PLAYWRIGHT);
const {chromium}=await import(library?pathToFileURL(library).href:'playwright');
fs.mkdirSync(out,{recursive:true});
const startedAt=new Date().toISOString(),errors=[],failedRequests=[],screenshots=[];
let browser,deadline;
try{
  browser=await chromium.launch({channel:arg('--channel','chrome'),headless:true,args:['--enable-unsafe-swiftshader']});
  deadline=setTimeout(()=>browser.close(),180000);
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  page.on('requestfailed',req=>failedRequests.push({url:req.url(),failure:req.failure()}));
  await page.goto(url,{waitUntil:'networkidle',timeout:20000});await page.waitForFunction(()=>window.artWorkbench?.ready,{timeout:20000});
  await page.evaluate(()=>window.artWorkbench.pause());
  const contracts=await page.evaluate(()=>window.artWorkbench.validate());
  if(!contracts.passed)throw Error('Art contract checks: '+contracts.errors.join('; '));
  const gpu=await page.evaluate(()=>{
    const gl=window.artWorkbench.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),userAgent:navigator.userAgent};
  });
  for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(120);
    const overflow=await page.evaluate(()=>['main','aside','.review-controls','#clock'].filter(selector=>document.querySelector(selector).getBoundingClientRect().right>innerWidth+.5));
    if(overflow.length)throw Error('Workbench clips at '+viewport.width+'px: '+overflow.join(', '));
    for(const fixture of ['trail','front','burn','spent','powder','bear','burst']){
      const time=fixture==='burst'?.34:4;
      await page.evaluate(({fixture,time})=>{window.artWorkbench.setFixture(fixture,{time,tool:fixture==='bear'?'flamethrower':'jerry-can',frozen:true});document.getElementById('guides').checked=fixture==='bear';window.artWorkbench.drawAt(time);},{fixture,time});
      await page.waitForTimeout(90);
      const name=fixture+'-'+viewport.width+'x'+viewport.height+'.png';await page.screenshot({path:path.join(out,name)});
      screenshots.push({file:name,fixture,viewport,diagnostics:await page.evaluate(()=>window.artWorkbench.diagnostics())});
    }
    for(const tool of ['matches','jerry-can','molotov','torch']){
      await page.evaluate(tool=>{window.artWorkbench.setFixture('bear',{time:4,tool,frozen:true});document.getElementById('guides').checked=true;window.artWorkbench.drawAt(4);},tool);
      const name='bear-'+tool+'-'+viewport.width+'x'+viewport.height+'.png';await page.screenshot({path:path.join(out,name)});screenshots.push({file:name,fixture:'bear',tool,viewport,diagnostics:await page.evaluate(()=>window.artWorkbench.diagnostics())});
    }
  }
  await page.evaluate(()=>document.body.classList.add('capture'));
  for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(120);
    for(const fixture of ['front','burn','bear']){
      await page.evaluate(fixture=>window.artWorkbench.setFixture(fixture,{time:4,tool:fixture==='bear'?'flamethrower':'jerry-can',frozen:true}),fixture);
      const diagnostics=await page.evaluate(()=>window.artWorkbench.diagnostics());
      if(diagnostics.canvas[0]!==viewport.width||diagnostics.canvas[1]!==viewport.height)throw Error('Field-only canvas size mismatch');
      const name=fixture+'-field-'+viewport.width+'x'+viewport.height+'.png';await page.screenshot({path:path.join(out,name)});screenshots.push({file:name,fixture,viewport,captureMode:'field-only',diagnostics});
    }
  }
  await page.evaluate(()=>document.body.classList.remove('capture'));
  await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(120);
  const timings=await page.evaluate(()=>{
    const lab=window.artWorkbench;lab.setFixture('burn',{time:4,frozen:true});
    const frames=[];for(let i=0;i<90;i++){const at=performance.now();lab.drawAt(4+i/60);frames.push(performance.now()-at);}
    frames.sort((a,b)=>a-b);return {samples:frames.length,meanMs:frames.reduce((a,b)=>a+b,0)/frames.length,p50Ms:frames[45],p95Ms:frames[85],scope:'Synchronous update + renderer.render CPU submission; not GPU completion or physical-device timing'};
  });
  const budgets=await page.evaluate(()=>window.artWorkbench.diagnostics());
  const result={task:'TB-005',startedAt,completedAt:new Date().toISOString(),gpu,contracts,timings,budgets,screenshots,errors,failedRequests,limits:['Viewport emulation on this host; no physical mobile-device review','Labelled local fixtures; not authoritative simulation acceptance','Synchronous submission timing does not measure GPU completion']};
  fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(result,null,2)+'\n');
  if(errors.length||failedRequests.length)throw Error('Browser errors: '+JSON.stringify({errors,failedRequests}));
  console.log(JSON.stringify({passed:true,screenshots:screenshots.length,contracts:contracts.passed,disposed:contracts.disposed,timings,gpu},null,2));
}finally{
  clearTimeout(deadline);await browser?.close();
  fs.writeFileSync(path.join(out,'helper-session.json'),JSON.stringify({pid:process.pid,executable:process.execPath,task:'TB-005',purpose:'Short-lived headless art review',startedAt,endedAt:new Date().toISOString(),stopMethod:'browser.close in finally',retained:false},null,2));
}
