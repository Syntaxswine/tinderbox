import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {MODES,SCENARIOS,RUBRIC,evidenceLabel,metricText,measurementRows,safeUrl,localAsset,reviewRecord,photoReferences,bindReviewDriver} from '../../workbenches/fire-realism/review.js';
const base='http://localhost:4552/nested/fire-ui/workbenches/fire-realism/index.html';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function state(){return {version:1,phase:'ready',configuration:{mode:'current',scenario:'match-contact',view:'isometric',lighting:'bright',population:null,seed:1893,characterId:'bear',viewport:{width:1280,height:800,pixelRatio:1}},frameIndex:45,tick:45,worldTime:.75,playerTime:.75,
  availability:Object.fromEntries(MODES.map(m=>[m.id,{available:m.id!=='optimized',reason:m.id==='optimized'?'Not delivered':null,sourceCommit:'test-fixture'}])),capabilities:{gpuTimer:{available:true},populations:[]},referenceAcceptance:'missing',workload:{actualBurningCells:4},diagnostics:{sourceFingerprints:{publishedControl:'test-fixture'}},results:null};}
async function fixture(options={}){
  let current=state(),observer;const calls=[],updates=[],downloads=[],shell={renderRoot:{id:'canvas-slot'},uiRoot:{id:'hud-slot'},update:s=>updates.push(structuredClone(s))};
  const driver={state:()=>structuredClone(current),configure:async patch=>{calls.push(['configure',patch]);current={...current,configuration:{...current.configuration,...patch,viewport:{...current.configuration.viewport,...patch.viewport}},frameIndex:0};return driver.state();},
    play:()=>{calls.push(['play']);current.phase='playing';},pause:()=>{calls.push(['pause']);current.phase='ready';},reset:async()=>{calls.push(['reset']);current.frameIndex=0;},step:async n=>{calls.push(['step',n]);current.frameIndex+=n;},seek:async n=>{calls.push(['seek',n]);current.frameIndex=n;},
    measure:async options=>{calls.push(['measure',options]);return current.results;},cancelMeasurement:async()=>{calls.push(['cancel']);},captureFrame:()=>({mimeType:'image/jpeg',dataUrl:'data:image/jpeg;base64,dGVzdA==',frameIndex:current.frameIndex,tick:current.tick,configuration:structuredClone(current.configuration),sourceFingerprints:current.diagnostics.sourceFingerprints,hardware:{renderer:'DOM test fixture only'}}),dispose:async()=>calls.push(['dispose'])};
  Object.assign(driver,options.methods||{});
  const mountUI=()=>{},delivery={byMode:{reference:{sourceCommit:'R'}}},receipt={kind:'fixture-only'};
  const binding=await bindReviewDriver({shell,createDriver:async config=>{calls.push(['create',config.root.id,config.uiRoot.id]);assert.equal(config.mountUI,mountUI);assert.equal(config.artistDelivery,delivery);assert.equal(config.referenceAcceptance,receipt);observer=config.onChange;return driver;},mountUI,artistDelivery:delivery,referenceAcceptance:receipt,onDownload:(...args)=>downloads.push(args),references:[{id:'fixture',label:'Fixture'}]});
  return {binding,calls,updates,downloads,driver,emit:patch=>{current={...current,...patch};observer(driver.state());}};
}
test('Review includes the driver modes, real powder scenario and six critique categories',()=>{
  assert.deepEqual(MODES.map(m=>m.id),['current','reference','optimized','no-fire']);assert.ok(SCENARIOS.some(s=>s.id==='gasoline-front-powder'));assert.equal(RUBRIC.length,6);
});
test('Missing, cancelled and inconclusive evidence never becomes zero or accepted timing',()=>{
  assert.equal(evidenceLabel('cancelled'),'Cancelled');assert.equal(evidenceLabel('inconclusive'),'Inconclusive');
  for(const value of [undefined,null,'unknown'])assert.equal(evidenceLabel(value),'Unavailable');
  for(const value of [null,NaN,Infinity,-1])assert.equal(metricText({state:'measured',value}),'Inconclusive');
  assert.equal(metricText({state:'measured',value:0,unit:'ms'}),'0 ms');assert.equal(metricText({state:'inconclusive',value:1,unit:'ms'}),'Inconclusive');
});
test('Report presentation forwards supplied medians, p95, variance and ratio without deriving acceptance',()=>{
  const report={status:'complete',gpu:{absoluteSceneMs:{reference:{median:10,p95:12,variance:3}},incrementalFireMs:{reference:{median:4}}},comparison:{optimizedReferenceRatio:.28,targetMet:null}};
  const rows=measurementRows(report);assert.equal(rows.find(r=>r.label.includes('incremental')).value,4);assert.equal(rows.find(r=>r.label.includes('p95')).value,12);assert.equal(rows.find(r=>r.label.includes('variance')).value,3);assert.equal(rows.at(-1).value,.28);
  assert.equal(report.comparison.targetMet,null);report.status='inconclusive';assert.ok(measurementRows(report).every(r=>metricText(r)==='Inconclusive'));
});
test('Executable links and remote evidence assets are rejected',()=>{
  for(const value of ['javascript:alert(1)','data:text/html,hi','file:///C:/private','',null])assert.equal(safeUrl(value,base),null);
  assert.equal(localAsset('https://example.org/photo.jpg',base),null);assert.equal(localAsset('../../art/source/a.jpg',base),'http://localhost:4552/nested/fire-ui/art/source/a.jpg');
});
test('Four reference plates retain exact bytes, rights basis, conflicting dates and derivative limits',()=>{
  const dossier=JSON.parse(fs.readFileSync('art/source/fire-realism/references.json','utf8')),refs=photoReferences(dossier);assert.equal(refs.length,4);
  for(const [i,ref]of refs.entries()){assert.equal(ref.verified,true);assert.ok(ref.rightsBasis);const bytes=fs.readFileSync(dossier.references[i].path);assert.equal(createHash('sha256').update(bytes).digest('hex'),ref.metadata.sha256);}
  assert.ok(refs.find(r=>r.id==='dvids-9535915').limitations.some(s=>s.includes('Conflict retained')));
  assert.ok(refs.find(r=>r.id==='dvids-9219073').limitations.some(s=>s.includes('not flame-shape evidence')));
  assert.ok(refs.find(r=>r.id==='dvids-8746603').limitations.some(s=>s.includes('Largest original not acquired')));
});
test('Critique captures detached authoritative context and grants no acceptance',()=>{
  const original=state(),notes={shape:'Observed contact gaps'},record=reviewRecord(original,notes,'2026-10-30T00:00:00Z');original.configuration.seed=99;notes.shape='Changed';
  assert.equal(record.context.configuration.seed,1893);assert.equal(record.notes.shape,'Observed contact gaps');assert.equal(record.context.workload.actualBurningCells,4);assert.match(record.acceptance,/do not approve/);
});
test('Binding passes actual render/HUD roots, delivery and receipt to the driver',async()=>{
  const f=await fixture();assert.deepEqual(f.calls[0],['create','canvas-slot','hud-slot']);assert.equal(f.updates.at(-1).connected,true);assert.equal(f.updates.at(-1).references[0].id,'fixture');await f.binding.dispose();
});
test('Play, pause, step, seek and reset call public methods without UI clock updates',async()=>{
  const f=await fixture();for(const command of [{type:'play'},{type:'pause'},{type:'step'},{type:'seek',frame:120},{type:'reset'}])await f.binding.intent(command);
  assert.deepEqual(f.calls.slice(1),[['play'],['pause'],['step',1],['seek',120],['reset']]);assert.equal(f.updates.at(-1).worldTime,.75);await f.binding.dispose();
});
test('Mode, view and lighting changes replay the same authoritative frame',async()=>{
  const f=await fixture();await f.binding.intent({type:'configure',patch:{mode:'reference'}});assert.deepEqual(f.calls.slice(1),[['configure',{mode:'reference'}],['seek',45]]);await f.binding.dispose();
});
test('Powder forwards a real scenario and clears unsupported population, without UI multipliers',async()=>{
  const f=await fixture();await f.binding.intent({type:'configure-choice',key:'scenario',value:'gasoline-front-powder'});
  assert.deepEqual(f.calls.slice(1),[['configure',{scenario:'gasoline-front-powder',population:null}]]);assert.equal(f.updates.at(-1).worldTime,.75);await f.binding.dispose();
});
test('Canvas preset and DPR are driver configuration, not renderer changes in the shell',async()=>{
  const f=await fixture();await f.binding.intent({type:'configure-choice',key:'viewport',value:'phone'});await f.binding.intent({type:'configure-number',key:'pixelRatio',value:1.5});
  assert.deepEqual(f.calls[1],['configure',{viewport:{width:390,height:844}}]);assert.deepEqual(f.calls[3],['configure',{viewport:{pixelRatio:1.5}}]);await f.binding.dispose();
});
test('Cancellation reaches the driver before its unresolved measurement completes',async()=>{
  const pending=deferred(),f=await fixture({methods:{measure:()=>pending.promise,cancelMeasurement:async()=>{f.calls.push(['cancel-before-resolution']);pending.resolve({status:'cancelled'});}}});
  const measuring=f.binding.intent({type:'measure',modes:['current','reference']});await Promise.resolve();await f.binding.intent({type:'cancel'});const report=await measuring;
  assert.equal(report.status,'cancelled');assert.deepEqual(f.calls.at(-1),['cancel-before-resolution']);await f.binding.dispose();
});
test('Actual capture exports a paired JPEG and exact source/hardware JSON; malformed captures reject',async()=>{
  const f=await fixture(),capture=await f.binding.intent({type:'capture'});await f.binding.intent({type:'save-capture',id:capture.id});
  assert.equal(f.downloads.length,2);assert.equal(f.downloads[0][2],'image/jpeg');assert.equal(f.downloads[1][0].sourceFingerprints.publishedControl,'test-fixture');assert.equal(f.downloads[1][0].hardware.renderer,'DOM test fixture only');assert.equal(f.downloads[1][0].dataUrl,undefined);
  f.driver.captureFrame=()=>({mimeType:'image/jpeg',dataUrl:'https://example.org/fake.jpg'});await assert.rejects(f.binding.intent({type:'capture'}),/actual JPEG/);await f.binding.dispose();
});
test('WebGL failure leaves an explicit unavailable shell and the references usable',async()=>{
  const updates=[],binding=await bindReviewDriver({shell:{renderRoot:{},uiRoot:{},update:s=>updates.push(s)},references:[{id:'verified'}],createDriver:async()=>{throw Error('WebGL disabled');}});
  assert.equal(updates.at(-1).connected,false);assert.match(updates.at(-1).reason,/WebGL disabled/);assert.equal(updates.at(-1).references[0].id,'verified');await assert.rejects(binding.intent({type:'play'}),/unavailable/);await binding.dispose();
});
test('Disposal retires the driver once and ignores late state notifications',async()=>{
  const f=await fixture();await f.binding.dispose();const count=f.updates.length;f.emit({phase:'playing'});await f.binding.dispose();assert.equal(f.updates.length,count);assert.equal(f.calls.filter(c=>c[0]==='dispose').length,1);await assert.rejects(f.binding.intent({type:'play'}),/unavailable/);
});
test('Review code contains no renderer, query, simulated clock or approval implementation',()=>{
  const source=fs.readFileSync('workbenches/fire-realism/review.js','utf8');assert.doesNotMatch(source,/new (?:THREE\.)?WebGLRenderer|createQuery|beginQuery|requestAnimationFrame|worldTime\s*[+*]=|targetMet\s*=(?!=)/);
  assert.match(source,/import\('\.\/driver\.js'\)/);assert.doesNotMatch(source,/Private review workbench/);
});
