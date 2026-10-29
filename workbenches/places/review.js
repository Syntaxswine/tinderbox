import {startApplication} from '../../src/main.js';
import {loadLandmark} from '../../src/runtime/landmark.js';
import {createRouteDriver} from './route-driver.js';
const find=id=>document.getElementById('review-'+id),root=document.getElementById('game'),status=find('status'),metrics=find('metrics'),controls=new AbortController();
let app,driver,records=[],lastMetrics={},lastSnapshot=null,openedVisit=null,routeReady=null,closed=false,interval,expiry,captureRequested=false;
const note=message=>{status.textContent=message;};
function captureFrame(){
  if(!captureRequested||closed)return;captureRequested=false;
  try{const canvas=root.querySelector('#viewport canvas'),state=app.state();if(!canvas||!app.visit())throw Error('No actual visit canvas is available');
    // Called directly after renderer.render through onSnapshot. The production
    // context keeps preserveDrawingBuffer=false; no persistent frame copy.
    canvas.toBlob(blob=>{if(closed)return;if(!blob){note('The rendered JPG could not be captured.');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='tinderbox-review-01a17e9b-'+state.placeId+'-'+state.selectedCharacterId+'-'+Date.now()+'.jpg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);note('Saved actual WebGL visit canvas as JPG.');},'image/jpeg',.94);
  }catch(error){note('Capture failed: '+error.message);}
}
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
async function prepareRoute(){
  const visit=app.visit();if(!visit||visit===openedVisit)return;openedVisit=visit;routeReady=null;const state=app.state();
  if(state.placeId==='catalogue-street'){note('Catalogue Street is open for manual pickup/tool review.');return;}
  try{
    const data=await loadLandmark(state.placeId),record=records.find(r=>r.placeId===state.placeId&&r.characterId===state.selectedCharacterId);
    if(!record)throw Error('No verified route for this place/animal. Run tools/verify-places.mjs first.');
    if(record.accessCommit!==data.manifest.sourceAccess.commit||record.navigationSha256!==await digest(JSON.stringify(data.navigation))||record.manifestSha256!==await digest(JSON.stringify(data.manifest)))throw Error('The saved route belongs to a different source build. Regenerate verified routes.');
    if(visit!==app.visit())return;routeReady=record;note('Map is open. A verified route is ready; manual input is also available.');
  }catch(error){if(visit===app.visit())note(error.message);}
}
function refresh(){
  if(closed)return;const visit=app?.visit(),state=app?.state(),route=driver?.state();if(!visit){if(['running','paused'].includes(route?.phase))driver.stop('Visit closed.');openedVisit=null;routeReady=null;}if(visit)prepareRoute();
  find('run').disabled=!visit||!routeReady||['running','paused'].includes(route?.phase);find('save').disabled=!visit;find('pause').disabled=route?.phase!=='running';find('resume').disabled=route?.phase!=='paused';find('stop').disabled=!['running','paused'].includes(route?.phase);
  const p=lastSnapshot?.player,s=lastMetrics.streaming;
  metrics.textContent=visit&&p?['Place: '+state.placeId+' / '+p.characterId,'Location: '+p.locationLabel,'Native level: '+p.level+' / feet: '+p.elevation?.toFixed(3)+' m','Position: '+p.x.toFixed(2)+', '+p.y.toFixed(2),'Route: '+route.phase+' / leg '+(route.leg||0)+' of '+(route.totalLegs||0)+' / points '+(route.completedPoints||0)+' of '+(route.totalPoints||0),'Sections: '+(s?.activeSections??'—')+' / pending '+(s?.pendingSections??'—')+' / peak '+(s?.peakSections??'—'),'Stream geometry/materials: '+(s?.geometries??'—')+' / '+(s?.materials??'—'),'Renderer draws: '+lastMetrics.drawCalls+' / geometry '+lastMetrics.geometries+' / textures '+lastMetrics.textures,'Observed frame rate: '+lastMetrics.observedHz?.toFixed(1)+' Hz','CPU p95 sim/render: '+lastMetrics.simulationCpuP95Ms?.toFixed(2)+' / '+lastMetrics.renderCpuP95Ms?.toFixed(2)+' ms','Renderer: '+(lastMetrics.rendererDescription||'—'),'Pickups: '+(lastSnapshot.pickups||[]).map(i=>i.id+' '+(i.consumed?'consumed':'available')).join(', ')].join('\n'):'Application: '+(state?.phase||'unavailable')+'\nNo active visit.';
  if(visit&&lastSnapshot?.navigation?.collision){const c=lastSnapshot.navigation.collision;metrics.textContent+='\nCollision cache: '+c.cachedShapes+' shapes / '+c.cachedTriangles+' triangles; peaks '+c.peakCachedShapes+' / '+c.peakCachedTriangles+'; cap '+c.maxCachedShapes+' / '+c.maxCachedTriangles;}
  if(['running','paused','complete','failed'].includes(route?.phase))note(route.message);
}
function dispose(){if(closed)return;closed=true;controls.abort();clearInterval(interval);clearTimeout(expiry);driver?.dispose();app?.dispose();note('Review lifetime ended; resources released. Reload to review again.');}
try{
  app=startApplication({root,autoStart:true,onSnapshot:(snapshot,value)=>{lastSnapshot=snapshot;lastMetrics=value;driver?.update(snapshot);captureFrame();}});driver=createRouteDriver({dispatch:command=>app.visit()?.dispatch(command)});
  fetch(new URL('../../docs/engineering/explorable-places/verified-routes.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Verified routes are not generated yet.');return r.json();}).then(value=>{records=value.records;openedVisit=null;note('Actual title screen is ready. Choose a map or use the review controls.');}).catch(error=>note(error.message));
  find('open').addEventListener('click',async()=>{driver.stop();openedVisit=null;routeReady=null;app.returnToMenu();app.selectCharacter(find('character').value);note('Opening '+find('place').selectedOptions[0].textContent+'…');await app.select(find('place').value);refresh();},{signal:controls.signal});
  find('run').addEventListener('click',()=>{try{driver.start(routeReady,app.visit().snapshot());root.scrollIntoView({block:'start'});}catch(error){note(error.message);}refresh();},{signal:controls.signal});
  find('save').addEventListener('click',()=>{captureRequested=true;note('Capturing the next actual rendered frame…');},{signal:controls.signal});
  find('pause').addEventListener('click',()=>{driver.pause();refresh();},{signal:controls.signal});find('resume').addEventListener('click',()=>{driver.resume();refresh();root.scrollIntoView({block:'start'});},{signal:controls.signal});find('stop').addEventListener('click',()=>{driver.stop();refresh();},{signal:controls.signal});find('return').addEventListener('click',()=>{driver.stop();app.returnToMenu();routeReady=null;openedVisit=null;refresh();},{signal:controls.signal});
  root.addEventListener('pointerdown',()=>driver.stop('Manual pointer control.'),{capture:true,signal:controls.signal});window.addEventListener('keydown',event=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','Escape'].includes(event.code))driver.stop('Manual keyboard control.');},{capture:true,signal:controls.signal});
  window.addEventListener('pagehide',dispose,{once:true,signal:controls.signal});interval=setInterval(refresh,400);expiry=setTimeout(dispose,30*60*1000);refresh();
}catch(error){note('Combined application could not open: '+error.message);app?.dispose();}
