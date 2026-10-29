import {mountUI, mountMainMenu, mountTitleScreen} from '../../src/ui/index.js';
import {createFakeSnapshotAdapter, PLACE_FIXTURES, CHARACTER_FIXTURES, explorationFixture} from './fixtures.js';
const root=document.querySelector('#ui-root'),surface=document.querySelector('#surface'),inspector=document.querySelector('.bench-inspector');
let ui=null,mainMenu=null,titleScreen=null,commandIndex=0,selectedPlace=PLACE_FIXTURES[1],selectedCharacterId='goat',navSnapshot=explorationFixture();
function log(command){
  const item=document.createElement('li');item.textContent=(++commandIndex)+' '+JSON.stringify(command);
  const list=document.querySelector('#command-log');list.prepend(item);while(list.children.length>8)list.lastElementChild.remove();
  if(command.type==='move'){
    document.querySelector('#vector-value').value=command.x.toFixed(2)+' / '+command.y.toFixed(2);
    document.querySelector('#vector-arrow').setAttribute('d','M70 70 L'+(70+command.x*48)+' '+(70-command.y*48));
  }
  if(command.type==='primary'||command.type==='cancel-input')document.querySelector('#trigger-state').textContent=command.pressed?'TRIGGER DOWN':'TRIGGER UP';
}
const adapter=createFakeSnapshotAdapter({onSnapshot:snapshot=>{if(surface.value==='gameplay')ui?.update(snapshot);},onCommand:log});
function show(name){
  const old=ui;ui=null;old?.dispose();mainMenu?.dispose();mainMenu=null;titleScreen?.dispose();titleScreen=null;surface.value=name;document.body.dataset.surface=name;
  document.querySelector('[data-gameplay-fixtures]').hidden=name!=='gameplay';
  document.querySelector('[data-navigation-fixtures]').hidden=name!=='explore';
  document.querySelector('[data-menu-fixtures]').hidden=name!=='menu';
  document.querySelector('.bench-vector').hidden=name==='menu'||name==='title';
  if(name==='title'){titleScreen=mountTitleScreen({root,onStart:()=>{log({request:'start'});show('menu');}});return;}
  if(name==='menu'){
    mainMenu=mountMainMenu({root,places:PLACE_FIXTURES,onBackToTitle:()=>{log({request:'title'});show('title');},characters:CHARACTER_FIXTURES,selectedCharacterId,onSelectCharacter:id=>{selectedCharacterId=id;log({request:'character',id});mainMenu.update({selectedCharacterId});},onSelect:id=>{selectedPlace=PLACE_FIXTURES.find(p=>p.id===id);log({request:'visit',id});mainMenu.update({loadingId:id,error:null});}});
    return;
  }
  const exploring=name==='explore';
  if(exploring)navSnapshot=explorationFixture(document.querySelector('#navigation-fixture').value,selectedCharacterId);
  ui=mountUI({root,mode:name,placeTitle:selectedPlace.title,onCommand:command=>{
    if(!exploring){adapter.dispatch(command);return;}
    log(command);
    if(command.type==='pause'){navSnapshot.paused=command.paused;ui?.update(navSnapshot);}
  },onZoom:factor=>log({request:'zoom',factor}),onExitToMenu:()=>{log({request:'return-to-menu'});show('menu');mainMenu.focusPlace(selectedPlace.id);}});
  ui.update(exploring?navSnapshot:adapter.snapshot());
}
surface.addEventListener('change',()=>show(surface.value));
document.querySelector('#fixture').addEventListener('change',event=>adapter.choose(event.target.value));
document.querySelector('#navigation-fixture').addEventListener('change',event=>{navSnapshot=explorationFixture(event.target.value,selectedCharacterId);ui?.update(navSnapshot);});
document.querySelector('[data-demo-fail]').addEventListener('click',()=>mainMenu?.update({loadingId:null,error:{placeId:selectedPlace.id,message:'This visit could not be opened. Try again, or choose another place.'}}));
document.querySelector('[data-demo-clear]').addEventListener('click',()=>mainMenu?.update({loadingId:null,error:null}));
document.querySelector('[data-hide-inspector]').addEventListener('click',()=>inspector.hidden=true);
window.addEventListener('keydown',event=>{if(event.code==='F2'){event.preventDefault();inspector.hidden=!inspector.hidden;}});
window.addEventListener('pagehide',()=>{ui?.dispose();mainMenu?.dispose();titleScreen?.dispose();},{once:true});
for(const type of ['error','unhandledrejection'])window.addEventListener(type,event=>{const output=document.querySelector('#bench-error');output.hidden=false;output.textContent='WORKBENCH ERROR: '+(event.message||event.reason?.message||event.reason);});
const params=new URLSearchParams(location.search),initial=params.get('surface');
show(['gameplay','explore','menu','title'].includes(initial)?initial:'gameplay');
if(params.get('clean')==='1')inspector.hidden=true;
if(initial==='menu'&&params.get('state')==='error')mainMenu.update({loadingId:null,error:{placeId:'new-york',message:'This visit could not be opened. Try again, or choose another place.'}});
