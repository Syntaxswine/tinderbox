import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const library=arg('--playwright',process.env.TINDERBOX_PLAYWRIGHT),{chromium}=await import(library?pathToFileURL(library).href:'playwright');
const out=path.resolve(arg('--out','artifacts/art-review/buildings-v1')),url=arg('--url','http://127.0.0.1:4551/workbenches/art/skins.html');
fs.mkdirSync(out,{recursive:true});const startedAt=new Date().toISOString(),warnings=[],errors=[],failedRequests=[],images=[],checks=[];let browser,deadline,page;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});deadline=setTimeout(()=>browser.close(),180000);
 page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.skinArt?.ready||window.skinArt?.error);
 if(await page.evaluate(()=>window.skinArt?.error))throw Error(await page.evaluate(()=>window.skinArt.error));
 await page.screenshot({path:path.join(out,'first-render.png')});
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.getByRole('button',{name:'Review named facades',exact:true}).click();
  await page.waitForFunction(()=>{try{return typeof JSON.parse(document.getElementById('review-output').textContent).passed==='boolean';}catch{return false;}});
  const review=JSON.parse(await page.locator('#review-output').textContent());checks.push({viewport,review});
  fs.writeFileSync(path.join(out,'checks-'+viewport.width+'.json'),JSON.stringify(review,null,2)+'\n');if(!review.passed)throw Error('Named facade review failed: '+JSON.stringify(review.errors||review.error));
  await page.evaluate(()=>document.getElementById('review-output').hidden=true);
  const cases=[{study:'buildings'}];
  for(const building of ['new-york-state','fisheries','transportation'])cases.push({study:'facade',building,stories:building==='fisheries'?1:2},{study:'facade',building,stories:5},{study:'gallery',building},{study:'courtyard',building});
  for(const options of cases){
   await page.evaluate(options=>{window.skinArt.reset({...options,facade:'inherited-plaster',door:'open'});window.skinArt.draw();},options);
   const file=[options.study,options.building,options.stories,viewport.width+'x'+viewport.height].filter(Boolean).join('-')+'.png';
   await page.screenshot({path:path.join(out,file)});images.push({file,viewport,options,diagnostics:await page.evaluate(()=>window.skinArt.diagnostics())});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
  }
 }
 const programs=await page.evaluate(()=>{const r=window.skinArt.renderer,gl=r.getContext();return r.info.programs.map(p=>({linked:gl.getProgramParameter(p.program,gl.LINK_STATUS),log:gl.getProgramInfoLog(p.program)||'',shaders:(gl.getAttachedShaders(p.program)||[]).map(s=>gl.getShaderInfoLog(s)||'')}));});
 if(programs.some(p=>!p.linked||p.log.trim()||p.shaders.some(s=>s.trim())))throw Error('Shader/program diagnostics');
 const hardware=await page.evaluate(()=>{const gl=window.skinArt.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),userAgent:navigator.userAgent};});
 if(errors.length||warnings.length||failedRequests.length)throw Error('Browser diagnostics: '+JSON.stringify({warnings,errors,failedRequests}));
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({task:'Named Exposition building facades v1',passed:true,startedAt,completedAt:new Date().toISOString(),checks,images,hardware,programs:programs.length,allProgramLogsEmpty:true,warnings,errors,failedRequests,limits:['Architectural facade fragments on existing meshes, not complete building reconstructions','Colours and expanded story counts are game adaptations','Viewport emulation on a desktop GPU']},null,2)+'\n');
 console.log(JSON.stringify({passed:true,images:images.length,viewports:checks.map(c=>({viewport:c.viewport,samples:c.review.profileGeometrySamples.length,cycles:c.review.cycles.length,baseline:c.review.baseline,baseDisposal:c.review.baseChecks.disposed})),programs:programs.length,hardware},null,2));
}catch(e){await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:e.stack,warnings,errors,failedRequests,checks},null,2)+'\n');throw e;}
finally{clearTimeout(deadline);await browser?.close();fs.writeFileSync(path.join(out,'helper-session.json'),JSON.stringify({pid:process.pid,executable:process.execPath,startedAt,endedAt:new Date().toISOString(),retained:false,stopMethod:'browser.close in finally'},null,2)+'\n');}
