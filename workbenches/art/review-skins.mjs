import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const library=arg('--playwright',process.env.TINDERBOX_PLAYWRIGHT),{chromium}=await import(library?pathToFileURL(library).href:'playwright');
const out=path.resolve(arg('--out','artifacts/art-review/skins-v1')),url=arg('--url','http://127.0.0.1:4551/workbenches/art/skins.html');
fs.mkdirSync(out,{recursive:true});const startedAt=new Date().toISOString(),warnings=[],errors=[],failedRequests=[],images=[],checks=[];let browser,deadline,page;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});deadline=setTimeout(()=>browser.close(),180000);
  page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());if(m.type()==='error')errors.push(m.text());});
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.skinArt?.ready||window.skinArt?.error);
  if(await page.evaluate(()=>window.skinArt?.error))throw Error(await page.evaluate(()=>window.skinArt.error));
  await page.screenshot({path:path.join(out,'first-render.png')});
  for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    await page.getByRole('button',{name:'Run skin review',exact:true}).click();
    await page.waitForFunction(()=>{try{return typeof JSON.parse(document.getElementById('review-output').textContent).passed==='boolean';}catch{return false;}});
    const review=JSON.parse(await page.locator('#review-output').textContent());checks.push({viewport,review});
    fs.writeFileSync(path.join(out,'checks-'+viewport.width+'.json'),JSON.stringify(review,null,2)+'\n');
    if(!review.passed)throw Error('Skin review failed: '+JSON.stringify(review.errors||review.error));
    await page.evaluate(()=>document.getElementById('review-output').hidden=true);
    for(const options of [{study:'courtyard',facade:'inherited-plaster'},{study:'gallery'},...[1,2,3,4,5].map(stories=>({study:'facade',stories})),{study:'civilians'},{study:'courtyard',facade:'inherited-brick'},{study:'courtyard',facade:'inherited-wood'}]){
      await page.evaluate(options=>{window.skinArt.reset(options);window.skinArt.draw();},options);
      const name=options.study+(options.stories?'-'+options.stories:'')+(options.facade?'-'+options.facade:'')+'-'+viewport.width+'x'+viewport.height+'.png';
      await page.screenshot({path:path.join(out,name)});images.push({file:name,viewport,options,diagnostics:await page.evaluate(()=>window.skinArt.diagnostics())});
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
    }
  }
  const programs=await page.evaluate(()=>{const l=window.skinArt,gl=l.renderer.getContext();return l.renderer.info.programs.map(p=>({linked:gl.getProgramParameter(p.program,gl.LINK_STATUS),log:gl.getProgramInfoLog(p.program)||'',shaders:(gl.getAttachedShaders(p.program)||[]).map(s=>gl.getShaderInfoLog(s)||'')}));});
  if(programs.some(p=>!p.linked||p.log.trim()||p.shaders.some(s=>s.trim())))throw Error('Nonempty shader/program diagnostics');
  const hardware=await page.evaluate(()=>{const gl=window.skinArt.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),userAgent:navigator.userAgent};});
  if(errors.length||warnings.length||failedRequests.length)throw Error('Browser diagnostics: '+JSON.stringify({errors,warnings,failedRequests}));
  const result={task:'Exposition skins v1',passed:true,startedAt,completedAt:new Date().toISOString(),checks,images,hardware,programs:programs.length,allProgramLogsEmpty:true,warnings,errors,failedRequests,limits:['Fictional period-inspired painted finishes, not measured historic reconstructions','Windows are closed painted glazing on existing solid wall parts','Viewport emulation, not physical phone','Production skin selection and scene promotion are architect-owned']};
  fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({passed:true,images:images.length,checks:checks.map(c=>({viewport:c.viewport,passed:c.review.passed,heads:c.review.headIdentity,disposed:c.review.disposed,motion:c.review.motion,stableGPU:c.review.skinCycles[0]})),hardware,programs:programs.length},null,2));
}catch(e){
  await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
  fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:e.stack,warnings,errors,failedRequests,checks},null,2)+'\n');throw e;
}finally{
  clearTimeout(deadline);await browser?.close();
  fs.writeFileSync(path.join(out,'helper-session.json'),JSON.stringify({pid:process.pid,executable:process.execPath,purpose:'Short-lived paired skin QA',startedAt,endedAt:new Date().toISOString(),retained:false,stopMethod:'browser.close in finally'},null,2)+'\n');
}
