import * as UI from './ui/index.js';
import {PLACES} from './content/places.js';
import {CHARACTERS,DEFAULT_CHARACTER_ID} from './content/characters.js';
import {createApplication} from './runtime/application.js';
const applications=new WeakMap();
export let currentApplication=null;

// The production composition. Every view consumes the same authoritative model.
export async function startGame({root = document.querySelector('#game'), autoStart = true, onSnapshot,mountUI=UI.mountUI, ...options} = {}) {
  const [{createRuntime},{createArtScene}]=await Promise.all([import('./runtime/index.js'),import('./art/index.js')]);
  const viewport = root.querySelector('#viewport'), hud = root.querySelector('#hud');
  const loading = root.querySelector('#load-state');
  let art, runtime;
  function showError(error) {
    if (!loading) return;
    loading.hidden = false;
    loading.querySelector('span').textContent = 'The street could not open. Check that WebGL 2 is enabled, then reload to try again.';
    if (!loading.querySelector('button')) {
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Reload';
      retry.addEventListener('click', () => location.reload(), {once:true}); loading.append(retry);
    }
    console.error(error);
  }
  try {
    runtime = await createRuntime({root:viewport, uiRoot:hud, scenario:'neighborhood', seed:1893, ...options,
      autoStart, mountUI, createArtScene:async args => (art = await createArtScene(args)), onSnapshot, onError:showError});
    const canvas = viewport.querySelector('canvas');
    canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Tinderbox exterior street. Point or tap to aim. Move with WASD or arrows.');
    if (loading) loading.hidden = true;
  } catch (error) { showError(error); throw error; }
  const onPageHide = event => { if (!event.persisted) runtime.dispose(); };
  window.addEventListener('pagehide', onPageHide);
  return {...runtime, artDiagnostics:() => art?.diagnostics(), dispose() {
    window.removeEventListener('pagehide', onPageHide); runtime.dispose();
  }};
}

export function startApplication({root=document.querySelector('#game'),ui=UI,selectedCharacterId=DEFAULT_CHARACTER_ID,createVisit,autoStart=true,onSnapshot}={}){
  if(!root)throw Error('A game root is required');
  if(applications.has(root))return applications.get(root);
  if(typeof ui.mountMainMenu!=='function'||typeof ui.mountTitleScreen!=='function')throw Error('The menu could not load. Please reload to try again.');
  const viewport=root.querySelector('#viewport'),hud=root.querySelector('#hud'),titleRoot=root.querySelector('#title-screen'),menuRoot=root.querySelector('#main-menu'),loading=root.querySelector('#load-state'),help=root.querySelector('.field-help');
  const doc=root.ownerDocument,win=doc.defaultView,controller=new AbortController();let app,title=null;
  const cancel=doc.createElement('button');cancel.type='button';cancel.textContent='Back to places';loading.append(cancel);
  const menu=ui.mountMainMenu({root:menuRoot,places:PLACES,characters:CHARACTERS,selectedCharacterId,onSelect:id=>app?.select(id),onSelectCharacter:id=>app?.selectCharacter(id),onBackToTitle:()=>app?.returnToTitle()});
  app=createApplication({places:PLACES,characters:CHARACTERS,selectedCharacterId,startAtTitle:true,onFocus:id=>menu.focusPlace(id),onFocusTitle:()=>title?.focusStart(),
    onState:state=>{
      const playing=state.phase==='visit',busy=state.phase==='loading',atTitle=state.phase==='title';menuRoot.hidden=playing||atTitle;titleRoot.hidden=!atTitle;hud.hidden=!playing;viewport.hidden=state.phase==='menu'||atTitle;loading.hidden=!busy;
      if(atTitle&&!title)title=ui.mountTitleScreen({root:titleRoot,onStart:()=>app?.openMenu()});
      if(!atTitle&&title){title.dispose();title=null;}
      if(help)help.hidden=!playing;root.dataset.mode=playing?(state.placeId==='catalogue-street'?'gameplay':'explore'):'menu';
      if(busy)loading.querySelector('span').textContent='Opening '+PLACES.find(p=>p.id===state.loadingId).title+'…';
      menu.update({loadingId:state.loadingId,error:state.error,selectedCharacterId:state.selectedCharacterId});
    },
    createVisit:createVisit||(async(place,visitOptions)=>{
      if(place.id==='catalogue-street'){
        const [{createRuntime},{createArtScene}]=await Promise.all([import('./runtime/index.js'),import('./art/index.js')]);
        return createRuntime({root:viewport,uiRoot:hud,scenario:'neighborhood',seed:1893,mountUI:ui.mountUI,createArtScene,autoStart,onSnapshot,...visitOptions,
          uiOptions:{mode:'gameplay',placeTitle:place.title,onExitToMenu:visitOptions.onExitToMenu}});
      }
      const {createLandmarkRuntime}=await import('./runtime/landmark.js');return createLandmarkRuntime({place,root:viewport,uiRoot:hud,mountUI:ui.mountUI,autoStart,onSnapshot,...visitOptions});
    })});
  cancel.addEventListener('click',()=>app.returnToMenu(),{signal:controller.signal});
  win.addEventListener('keydown',e=>{if(e.code==='Escape'&&app.state().phase==='loading'){e.preventDefault();app.returnToMenu();}},{signal:controller.signal});
  const dispose=app.dispose;let closed=false;app.dispose=()=>{if(closed)return;closed=true;controller.abort();try{dispose();}finally{menu.dispose();title?.dispose();title=null;cancel.remove();applications.delete(root);if(currentApplication===app)currentApplication=null;}};
  applications.set(root,app);currentApplication=app;
  win.addEventListener('pagehide',e=>{if(!e.persisted)app.dispose();},{signal:controller.signal});title?.focusStart();return app;
}
if(typeof document!=='undefined'&&document.querySelector('#game[data-autostart]')){
  try{startApplication();}catch(error){const load=document.querySelector('#load-state');load.hidden=false;load.querySelector('span').textContent=error.message;console.error(error);}
}
