import path from 'node:path';
import assert from 'node:assert/strict';
import {withCatalogueBrowser} from './catalogue-browser.mjs';

// Short driver-stepped compatibility controls in the real production hosts.
// No benchmark, structure-burn library, injected state or alternate renderer.
const output=path.resolve(process.argv[2]||'artifacts/qa/character-fire-shroud/shared-hosts');
await withCatalogueBrowser(async({page,baseUrl,save,errors})=>{
 const results=[];page.setDefaultTimeout(120000);
 for(const [id,query]of [['legacy',''],['cottage','?cottages=1']]){
  await page.goto(baseUrl+query,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{const main=await import('./src/main.js');main.currentApplication.dispose();window.qa={snap:null};qa.app=main.startApplication({autoStart:false,onSnapshot:s=>qa.snap=s});});
  await page.locator('[data-title-start]').click();assert.equal(await page.locator('[data-place-grid] button').count(),4);await page.getByRole('button',{name:'Open Catalogue Street map',exact:true}).click();await page.waitForFunction(()=>qa.app.state().phase==='visit'||qa.app.state().error);assert.equal(await page.evaluate(()=>qa.app.state().phase),'visit');
  const step=()=>page.evaluate(()=>{qa.app.visit().advance(1/60);return {player:qa.snap.player,actors:qa.snap.actors,clocks:qa.snap.clocks,paused:qa.snap.paused};});
  if((await step()).paused){await page.locator('[data-resume]').click();await step();}
  const control=command=>page.evaluate(command=>{if(!qa.app.visit().dispatch(command))throw Error('Rejected production command '+JSON.stringify(command));},command);
  const shot=async label=>{const data=await page.evaluate(()=>({player:qa.snap.player,actors:qa.snap.actors,clocks:qa.snap.clocks,events:qa.snap.events,cottage:!!qa.snap.cottageFire,fire:qa.app.visit().artDiagnostics().fire}));save(id+'-'+label+'.json',data);await page.screenshot({path:path.join(output,id+'-'+label+'.jpg'),type:'jpeg',quality:88});return data;};
  await shot('before');
  await page.locator('[data-tool="jerry-can"]').click();await step();assert.equal((await step()).player.pouring,true);
  const {DEFAULT_CONFIG,worldToStick}=await import('../../src/simulation/index.js'),input={...DEFAULT_CONFIG.input,...(id==='cottage'?{cameraY:-12}:{})};
  await control({type:'move',...worldToStick({x:1,y:0},input)});for(let i=0;i<6;i++)await step();await control({type:'move',x:0,y:0});await step();await page.locator('[data-tool="jerry-can"]').click();let s=await step();assert.equal(s.player.pouring,false);
  await control({type:'aim',x:s.player.x,y:s.player.y});await page.locator('[data-tool="matches"]').click();s=await step();for(let i=0;i<5;i++)s=await step();
  const lit=await shot('actual-contact');assert.equal(lit.player.characterFire.active,true);assert.equal(lit.player.characterFire.mode,'contact');assert.equal(lit.player.burn,undefined);assert.deepEqual(lit.fire.characterShroud.activeIds,[lit.player.id]);assert.ok(lit.fire.characterShroud.flameSplats>0);assert.equal(lit.fire.actorFlameCards,0);assert.equal(lit.cottage,id==='cottage');
  await page.locator('[data-pause]').click();s=await step();const frozen=s.player.characterFire;for(let i=0;i<5;i++)await step();assert.deepEqual((await step()).player.characterFire,frozen);await page.locator('[data-resume]').click();await step();
  await control({type:'move',...worldToStick({x:1,y:0},input)});for(let i=0;i<8;i++)await step();await control({type:'move',x:0,y:0});s=await step();assert.equal(s.player.characterFire.active,false);await shot('exited');
  await page.locator('[data-pause]').click();await step();await page.locator('[data-reset]').click();await step();const reset=await shot('reset');assert.deepEqual(reset.fire.characterShroud.activeIds,[]);assert.equal(reset.fire.characterShroud.fits.length,0);
  const disposed=await page.evaluate(()=>{const runtime=qa.app.visit();qa.app.dispose();return runtime.artDiagnostics().fire.characterShroud;});save(id+'-disposal.json',disposed);assert.ok(Object.values(disposed.resources).every(n=>n===0));assert.deepEqual(disposed.boundIds,[]);results.push({id,query,pass:true,wind:lit.fire.characterShroud.wind,sampler:lit.fire.characterShroud.windSamplerSupplied,activeSplats:lit.fire.characterShroud.flameSplats+lit.fire.characterShroud.smokeSplats});
 }
 assert.deepEqual(errors,[]);return {pass:true,autoStart:false,pacingClaim:false,results,checks:['real title/four maps','production poured fuel and match contact','shared native player shroud','pause','contact exit','reset/disposal'],limits:['Compatibility uses driver-stepped production commands; normal pacing was measured once in the larger modular host.','Existing cottage Nautilus sampler remains unchanged.']};
},{output,lifetimeMs:300000,purpose:'M25 short legacy and Nautilus-cottage shared-host compatibility; no performance sweep'});
