import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const library=arg('--playwright',process.env.TINDERBOX_PLAYWRIGHT),{chromium}=await import(library?pathToFileURL(library).href:'playwright');
const out=path.resolve(arg('--out','artifacts/art-review/buildings-v2')),url=arg('--url','http://127.0.0.1:4551/workbenches/art/skins.html');
fs.mkdirSync(out,{recursive:true});
const startedAt=new Date().toISOString(),warnings=[],errors=[],failedRequests=[],images=[],checks=[];let browser,page,deadline;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});deadline=setTimeout(()=>browser.close(),240000);
 page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());if(m.type()==='error')errors.push(m.text());});
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.skinArt?.ready||window.skinArt?.error);
 if(await page.evaluate(()=>window.skinArt?.error))throw Error(await page.evaluate(()=>window.skinArt.error));
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.getByRole('button',{name:'Review native repeats',exact:true}).click();
  await page.waitForFunction(()=>{try{return typeof JSON.parse(document.getElementById('review-output').textContent).passed==='boolean';}catch{return false;}},{},{timeout:120000});
  const review=JSON.parse(await page.locator('#review-output').textContent());checks.push({viewport,review});
  fs.writeFileSync(path.join(out,'checks-'+viewport.width+'.json'),JSON.stringify(review,null,2)+'\n');
  if(!review.passed)throw Error('Native facade review: '+JSON.stringify(review.errors||review.error));
  await page.evaluate(()=>document.getElementById('review-output').hidden=true);
  const cases=[{study:'avenue',stories:2}];
  for(const building of ['manufactures','agriculture','fine-arts'])cases.push({study:'wide',building,width:13,stories:2},{study:'wide',building,width:23,stories:2},{study:'wide',building,width:23,stories:5},{study:'facade',building,stories:2});
  cases.push({study:'wide',building:'manufactures',width:3,stories:2},{study:'wide',building:'manufactures',width:7,stories:2},{study:'wide',building:'agriculture',width:13,stories:2,door:'closed'},{study:'courtyard',building:'fine-arts',stories:2});
  for(const options of cases){
   await page.evaluate(options=>window.skinArt.reset({facade:'inherited-plaster',door:'open',...options}),options);
   const file=[options.study,options.building,options.width,options.stories,options.door,viewport.width+'x'+viewport.height].filter(Boolean).join('-')+'.png';
   await page.screenshot({path:path.join(out,file)});images.push({file,viewport,options,diagnostics:await page.evaluate(()=>window.skinArt.diagnostics())});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal viewport overflow');
  }
 }
 for(const hero of [{file:'new-native-street.png',options:{study:'avenue',stories:2},width:1800,height:430},{file:'liberal-arts-native-wide.png',options:{study:'wide',building:'manufactures',width:23,stories:2},width:1280,height:500}]){
  const result=await page.evaluate(({options,width,height})=>{
   const lab=window.skinArt;lab.reset({...options,door:'open',facade:'inherited-plaster'});const T=lab.THREE,scene=lab.panes[1].scene,renderer=lab.renderer;
   const center=options.study==='avenue'?22:options.width/2+5,spanX=options.study==='avenue'?47:options.width+4,spanY=spanX*height/width;
   const camera=new T.OrthographicCamera(-spanX/2,spanX/2,spanY/2,-spanY/2,.1,180),target=new T.Vector3(center,2,5.5);
   camera.position.copy(target).add(new T.Vector3(3,6,27));camera.lookAt(target);camera.updateMatrixWorld();
   renderer.setSize(width,height,false);renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.render(scene,camera);
   const png=renderer.domElement.toDataURL('image/png'),signature=lab.geometrySignature(scene);lab.reset();return{png,signature,camera:{target:target.toArray(),position:camera.position.toArray(),spanX,spanY}};
  },hero);
  fs.writeFileSync(path.join(out,hero.file),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;images.push({file:hero.file,options:hero.options,viewport:{width:hero.width,height:hero.height},export:'Direct 3D render of the native composed scene',...result});
 }
 const programs=await page.evaluate(()=>{const r=window.skinArt.renderer,gl=r.getContext();return r.info.programs.map(p=>({linked:gl.getProgramParameter(p.program,gl.LINK_STATUS),log:gl.getProgramInfoLog(p.program)||'',shaders:(gl.getAttachedShaders(p.program)||[]).map(s=>gl.getShaderInfoLog(s)||'')}));});
 if(programs.some(p=>!p.linked||p.log.trim()||p.shaders.some(s=>s.trim())))throw Error('Shader/program diagnostics');
 const hardware=await page.evaluate(()=>{const gl=window.skinArt.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),userAgent:navigator.userAgent};});
 if(errors.length||warnings.length||failedRequests.length)throw Error('Browser output: '+JSON.stringify({warnings,errors,failedRequests}));
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({task:'Named facade expansion at native AFT scale',passed:true,startedAt,completedAt:new Date().toISOString(),checks,images,hardware,programs:programs.length,allProgramLogsEmpty:true,warnings,errors,failedRequests,limits:['Facade fragments; adapted colours and ornaments','Native source meshes and actor scale preserved','Desktop GPU with phone viewport emulation']},null,2)+'\n');
 console.log(JSON.stringify({passed:true,images:images.length,viewports:checks.map(c=>({viewport:c.viewport,namedSamples:c.review.named.profileGeometrySamples.length,wideSamples:c.review.samples.length,nativeMeshes:c.review.checkedMeshes,uvVertices:c.review.checkedUVVertices,pixelChecks:c.review.pixelChecks.length,disposed:c.review.disposed})),programs:programs.length,hardware},null,2));
}catch(error){await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:error.stack,warnings,errors,failedRequests,checks},null,2)+'\n');throw error;}
finally{clearTimeout(deadline);await browser?.close();fs.writeFileSync(path.join(out,'helper-session.json'),JSON.stringify({pid:process.pid,executable:process.execPath,startedAt,endedAt:new Date().toISOString(),retained:false,stopMethod:'browser.close in finally; 240s forced browser deadline'},null,2)+'\n');}
