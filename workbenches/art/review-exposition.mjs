
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2),arg=(n,d)=>args.includes(n)?args[args.indexOf(n)+1]:d;
const library=arg('--playwright',process.env.TINDERBOX_PLAYWRIGHT),{chromium}=await import(library?pathToFileURL(library).href:'playwright');
const out=path.resolve(arg('--out','artifacts/art-review/exposition')),url=arg('--url','http://127.0.0.1:4551/workbenches/art/exposition.html');
fs.mkdirSync(out,{recursive:true});const warnings=[],errors=[],failedRequests=[],images=[],visibility=[],startedAt=new Date().toISOString();let browser,deadline;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});deadline=setTimeout(()=>browser.close(),180000);
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.expositionArt?.ready);
  await page.getByRole('button',{name:'Run kit review',exact:true}).click();
  await page.waitForFunction(()=>{try{return typeof JSON.parse(document.getElementById('review-output').textContent).passed==='boolean';}catch{return false;}});
  const checks=JSON.parse(await page.locator('#review-output').textContent());if(!checks.passed)throw Error('Exposition art checks: '+checks.errors.join('; '));
  await page.evaluate(()=>document.getElementById('review-output').hidden=true);await page.waitForTimeout(140);
  for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(140);
    for(const layout of ['source','proposal']){
      await page.evaluate(layout=>{const l=window.expositionArt;l.reset({layout,skin:'inherited-plaster'});l.focus('overview');},layout);
      const actorVisibility=await page.evaluate(()=>window.expositionArt.visibility());visibility.push({layout,viewport,actors:actorVisibility});
      if(layout==='proposal'&&actorVisibility.some(r=>r.fullPixels<15||r.visibleRatio<.75))throw Error('Proposed camera hides an initial actor');
      const name=layout+'-'+viewport.width+'x'+viewport.height+'.png';await page.screenshot({path:path.join(out,name)});images.push({file:name,layout,viewport,view:'default-camera',diagnostics:await page.evaluate(()=>window.expositionArt.diagnostics())});
    }
    await page.evaluate(()=>window.expositionArt.focus('detail'));
    const detail='detail-'+viewport.width+'x'+viewport.height+'.png';await page.screenshot({path:path.join(out,detail)});images.push({file:detail,layout:'proposal',viewport,view:'labelled-detail',diagnostics:await page.evaluate(()=>window.expositionArt.diagnostics())});
    await page.evaluate(()=>{window.expositionArt.reset({skin:'inherited-brick'});window.expositionArt.focus('overview');});
    const brick='brick-'+viewport.width+'x'+viewport.height+'.png';await page.screenshot({path:path.join(out,brick)});images.push({file:brick,layout:'proposal',viewport,view:'skin-swap',diagnostics:await page.evaluate(()=>window.expositionArt.diagnostics())});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
  }
  const programs=await page.evaluate(()=>{const gl=window.expositionArt.renderer.getContext();return window.expositionArt.renderer.info.programs.map(p=>({linked:gl.getProgramParameter(p.program,gl.LINK_STATUS),programLog:gl.getProgramInfoLog(p.program)||'',shaderLogs:(gl.getAttachedShaders(p.program)||[]).map(s=>gl.getShaderInfoLog(s)||'')}));});
  if(programs.some(p=>!p.linked||p.programLog.trim()||p.shaderLogs.some(s=>s.trim())))throw Error('Nonempty program/shader log');
  const hardware=await page.evaluate(()=>{const gl=window.expositionArt.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),userAgent:navigator.userAgent};});
  if(errors.length||warnings.length||failedRequests.length)throw Error('Browser output: '+JSON.stringify({warnings,errors,failedRequests}));
  const result={task:'TB-009',passed:true,startedAt,completedAt:new Date().toISOString(),checks,hardware,programs:programs.length,allProgramLogsEmpty:true,images,visibility,warnings,errors,failedRequests,limits:['Game adaptation, not named-building reconstruction','Viewport emulation, not physical phone','Coder checkpoint layout is retained for comparison; proposal is a workbench-only arrangement pending architect promotion']};
  fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,images:images.length,checks:checks.passed,disposed:checks.disposed,visibility,hardware},null,2));
}finally{clearTimeout(deadline);await browser?.close();fs.writeFileSync(path.join(out,'helper-session.json'),JSON.stringify({pid:process.pid,executable:process.execPath,purpose:'TB-009 short-lived actual-scene browser review',startedAt,endedAt:new Date().toISOString(),retained:false,stopMethod:'browser.close in finally'},null,2)+'\n');}
