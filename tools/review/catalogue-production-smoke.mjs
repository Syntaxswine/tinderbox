import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {withCatalogueBrowser} from './catalogue-browser.mjs';

const output=path.resolve(process.argv[2]||'artifacts/qa/catalogue-modular/production-smoke');
await withCatalogueBrowser(async({page,baseUrl,save,errors})=>{
  page.setDefaultTimeout(180000);
  await page.goto(baseUrl+'?catalogue=modules',{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
    const main=await import('./src/main.js');main.currentApplication.dispose();
    window.qa={snap:null,metrics:null};
    window.qa.app=main.startApplication({autoStart:false,onSnapshot:(snap,metrics)=>{qa.snap=snap;qa.metrics=metrics;}});
  });
  save('initial-title.json',await page.evaluate(()=>({state:qa.app.state(),text:document.querySelector('#title-screen').innerText})));
  await page.screenshot({path:path.join(output,'title.jpg'),type:'jpeg',quality:88});
  await page.locator('[data-title-start]').click();
  assert.equal(await page.locator('[data-place-grid] button').count(),4);
  await page.getByRole('button',{name:'Open Catalogue Street map',exact:true}).click();
  await page.waitForFunction(()=>qa.app.state().phase==='visit'||qa.app.state().error,{timeout:180000});
  const opened=await page.evaluate(()=>({state:qa.app.state(),player:qa.snap?.player,thermal:qa.snap?.diagnostics.thermal,metrics:qa.metrics,art:qa.app.visit()?.artDiagnostics()}));save('opened.json',opened);
  assert.equal(opened.state.phase,'visit');assert.equal(opened.thermal.backend,'catalogue-trial');
  await page.evaluate(()=>{const runtime=qa.app.visit();runtime.dispatch({type:'pause',paused:false});runtime.advance(1/60);});
  const windowSamples=await page.evaluate(()=>{
    const rows=[],runtime=qa.app.visit();for(let i=0;i<90;i++){const before=performance.now(),snap=runtime.advance(1/60);rows.push({elapsedMs:performance.now()-before,hostTick:snap.tick,nativeTick:snap.diagnostics.thermal.nativeTick,timing:snap.diagnostics.thermal.timing,metrics:runtime.metrics()});}return rows;
  });save('quiet-window.json',windowSamples);
  await page.screenshot({path:path.join(output,'catalogue-initial.jpg'),type:'jpeg',quality:88});
  save('final.json',await page.evaluate(()=>({player:qa.snap.player,actors:qa.snap.actors,pickups:qa.snap.pickups,thermal:qa.snap.diagnostics.thermal,art:qa.app.visit().artDiagnostics(),metrics:qa.metrics})));
  await page.evaluate(()=>qa.app.dispose());
  assert.deepEqual(errors,[]);
  return {pass:true,query:'?catalogue=modules',path:'/tinderbox/',windowFrames:windowSamples.length};
},{output});
