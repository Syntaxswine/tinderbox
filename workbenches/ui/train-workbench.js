import {mountUI} from '../../src/ui/index.js';
import {fixture} from './fixtures.js';
import {createTrainUIFixture} from './train-fixture.js';
const transport=createTrainUIFixture(),snapshot=fixture(),events=[],hud=document.querySelector('#hud');
snapshot.player.lanternAim=null;
let ui,serial=0,muted=false;
const publish=()=>{document.querySelector('#trace').textContent=JSON.stringify({viewport:[innerWidth,innerHeight,devicePixelRatio],
  state:ui?.trainControl?.state,confirmed:transport.state,commands:transport.commands,events},null,2);};
ui=mountUI({root:hud,onZoom:()=>{},train:{session:transport.session,actorId:'player',newId:kind=>'preview/'+kind+'/'+(++serial)},
  onCommand(command){if(command.type==='pause'){snapshot.paused=command.paused;ui?.update(snapshot);}publish();}});
ui.update(snapshot);transport.session.subscribe(publish);
document.querySelector('#walk').addEventListener('click',()=>{
  const drive=transport.state.mode==='on-foot';transport.setMode(drive?'driver':'on-foot');
  document.querySelector('#walk').textContent=drive?'Walk':'Drive';publish();
});
document.querySelector('#sound').addEventListener('click',()=>{
  muted=!muted;ui.trainControl.setMuted(muted);document.querySelector('#sound').textContent=muted?'Sound off':'Sound on';
  document.querySelector('#sound').setAttribute('aria-pressed',String(muted));publish();
});
document.querySelector('#refuse').addEventListener('change',event=>transport.setRefused(event.target.checked));
for(const type of ['pointerdown','pointerup','pointermove','pointercancel','keydown','keyup','click']){
  hud.addEventListener(type,event=>{
    if(!event.target.closest?.('.tb-train-control'))return;
    events.push({type,key:event.key,pointerType:event.pointerType,trusted:event.isTrusted,x:event.clientX,y:event.clientY});
    queueMicrotask(publish);
  },true);
}
window.addEventListener('resize',publish);window.addEventListener('pagehide',()=>{ui.dispose();transport.dispose();},{once:true});
publish();
