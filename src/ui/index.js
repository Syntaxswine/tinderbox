import {ETCHING_SIZE, ETCHING_FRAMES, OIL_LANTERN_SIZE, OIL_LANTERN_FRAME, OIL_BARREL_SIZE, OIL_BARREL_FRAME} from './etching-frames.js';
import {mountMap} from './map.js';
import {TOOLS, normalizeStick, pointerStick, stockText, viewOf, toolFeedbackOf, navigationOf} from './model.js';
export {mountMainMenu} from './main-menu.js';
export {mountTitleScreen} from './title-screen.js';
const marks = new URL('../../assets/art/ui/engraved-outline-plates.svg', import.meta.url).href;
const engraving = new URL('../../assets/art/ui/engraved-atlas.png', import.meta.url).href;
const oilLantern = new URL('../../assets/art/ui/engraved-oil-lantern.png', import.meta.url).href;
const oilBarrel = new URL('../../assets/art/ui/engraved-oil-barrel.png', import.meta.url).href;
let plateInstance = 0;
const icon = id => {
  const lantern = id === 'molotov', barrel = id === 'jerry-can';
  const frame = lantern ? OIL_LANTERN_FRAME : barrel ? OIL_BARREL_FRAME : ETCHING_FRAMES[id];
  const source = lantern ? oilLantern : barrel ? oilBarrel : engraving, size = lantern ? OIL_LANTERN_SIZE : barrel ? OIL_BARREL_SIZE : ETCHING_SIZE;
  if (!frame) throw new RangeError('Unknown engraving: ' + id);
  const clip = 'tb-engraving-' + (++plateInstance);
  return '<svg class="switch-glyph" viewBox="0 0 64 64" aria-hidden="true"><svg class="tb-engraved-image" viewBox="' + frame.join(' ') + '" width="64" height="64" preserveAspectRatio="xMidYMid meet"><defs><clipPath id="' + clip + '" clipPathUnits="userSpaceOnUse"><rect x="' + frame[0] + '" y="' + frame[1] + '" width="' + frame[2] + '" height="' + frame[3] + '"></rect></clipPath></defs><image clip-path="url(#' + clip + ')" href="' + source + '" width="' + size.width + '" height="' + size.height + '"></image></svg><use class="tb-etch-fallback" href="' + marks + '#' + id + '"></use></svg>';
};
const toolButton = id => {
  const tool=TOOLS.find(t=>t.id===id);
  const face=id==='molotov'?'THROW|LANTERN':tool.face;
  const legend=id==='matches'?'MATCHES<br><span data-action-label>STRIKE</span>':id==='torch'?'TORCH<br><span data-action-label>LIGHT</span>':face.replace('|','<br>');
  return '<button type="button" class="square-control industrial-switch tb-quick" data-tool="'+id+'" aria-pressed="false"><span class="switch-legend">'+icon(id)+'<span class="switch-label">'+legend+'</span><span class="switch-cost" data-stock aria-live="off"></span></span></button>';
};
const leftButtons=['matches','torch','flamethrower'].map(toolButton).join('');
const rightButtons=['jerry-can','molotov'].map(toolButton).join('');
let instance = 0;
// Farmyard live-game grouping, with Tinderbox commands and a separate wood skin.
const markup = '<header class="tb-top">' +
  '<div class="hero-strip tb-vitals tb-wood-panel"><span class="hero-identity tb-wordmark">TINDERBOX<span>EXPOSITION</span></span><div class="vitals tb-health"><span class="tb-micro">HEALTH <b data-health-text>—</b></span><div class="tb-health-meter" role="meter" aria-label="Bear health" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-health-fill></span></div></div></div><figure class="tb-map tb-wood-panel"><div class="tb-map-content map-metal-frame" data-map role="img" aria-label="Ground plan loading."><span class="tb-map-loading">Awaiting plan…</span></div><figcaption><b>GROUND PLAN</b><span><i></i>Bear <i></i>Fire</span></figcaption></figure></header>' +
  '<div class="tb-effects" aria-label="Active effects"><div class="tb-effect tb-powder" data-effect="powder" hidden><b>POWDER <span data-time></span></b><span>Bear faster · world & fire slower</span></div><div class="tb-effect tb-inversion" data-effect="inversion" hidden><b>STICK 180° <span data-time></span></b><span>Movement reversed · aim unchanged</span></div></div>' +
  '<div class="view-controls tb-zoom" role="group" aria-label="Camera zoom"><button type="button" class="industrial-switch" data-zoom="in" aria-label="Zoom in">' + icon('zoom-in') + '</button><button type="button" class="industrial-switch" data-zoom="out" aria-label="Zoom out">' + icon('zoom-out') + '</button></div>' +
  '<p class="tb-death tb-wood-panel" data-death hidden>BEAR DOWN <span>Open pause to reset the scene.</span></p>' +
  '<section class="battle-bottom tb-console tb-wood-panel" aria-label="Player control deck">' +
  '<div class="thumb-layout tb-controls">' +
  '<div class="left-controls" role="group" aria-label="Matches, torch and flamethrower">' + leftButtons + '</div>' +
  '<div class="stick-column tb-stick-group"><div class="tb-selected"><span data-selected-icon aria-hidden="true"></span><strong data-tool-name>—</strong><span class="tb-selected-stock" data-selected-stock id="tb-tool-resource" aria-live="off"></span><span class="tb-sr-only" data-tool-hint></span><span class="tb-loadout-state" data-loadout-state>SELECT A TOOL</span><span class="tb-tool-feedback" data-tool-feedback id="tb-tool-feedback" hidden></span></div><button type="button" class="tb-stick" data-stick aria-label="Movement joystick. Drag to move. Keyboard: W A S D or arrow keys." aria-describedby="tb-movement-help"><span class="stick-ring tb-stick-ring"></span><span class="tb-stick-thumb">' + icon('movement') + '</span><span class="stick-north tb-stick-n">▲</span></button><span class="stick-caption tb-micro tb-stick-caption" id="tb-movement-help">MOVE <span>WASD / ↑↓←→</span></span></div>' +
  '<div class="right-controls" role="group" aria-label="Oil barrel, lantern and menu">' + rightButtons +
  '<button type="button" class="square-control industrial-switch tb-pause" data-pause aria-label="Menu — pause and open scene menu" aria-expanded="false"><span class="switch-legend">'+icon('pause')+'<span class="switch-label">MENU</span></span></button></div></div></section>' +
  '<div class="tb-menu-backdrop" data-menu hidden><section class="tb-menu tb-wood-panel" role="dialog" aria-modal="true" aria-labelledby="tb-menu-title"><div class="tb-menu-heading"><div class="tb-masthead" aria-hidden="true"><span>THE</span><strong>TINDERBOX</strong></div><div class="tb-issue" aria-hidden="true"><span>EXPOSITION · 1893</span><span>FIELD EDITION</span></div><h1 id="tb-menu-title" tabindex="-1" data-menu-title>Paused</h1></div>' +
  '<div data-pause-panel><p class="tb-menu-note" data-pause-note>The trail can wait.</p><button type="button" class="tb-menu-button tb-resume" data-resume>' + icon('play') + '<span>Resume scene</span><kbd>ESC</kbd></button><button type="button" class="tb-menu-button" data-options>' + icon('options') + '<span>Controls & options</span></button><button type="button" class="tb-menu-button" data-reset>' + icon('reset') + '<span>Reset test scene</span></button></div>' +
  '<div data-options-panel hidden><p class="tb-menu-note">Interface preferences apply to this session.</p><label class="tb-option"><input type="checkbox" data-reduce-motion>Reduce interface motion</label><label class="tb-option"><input type="checkbox" data-contrast>High contrast labels</label><dl class="tb-key-guide"><div><dt>Move</dt><dd>Drag stick · WASD · arrows</dd></div><div><dt>Tools</dt><dd>1–5</dd></div><div><dt>Use / pour</dt><dd>Tap tool · Space for selected tool</dd></div><div><dt>Medicine</dt><dd>Walk over it to use it</dd></div><div><dt>Pause</dt><dd>Esc · P</dd></div></dl><p class="tb-menu-note">Tap Oil barrel to start or stop pouring. Tap Torch to light, then tap to ignite nearby fuel. Hold Flamethrower. Walk over drugs or medicine to use them. Inversion reverses movement only.</p><button type="button" class="tb-menu-button" data-back>Back to pause</button></div></section></div>' +
  '<span class="tb-sr-only" role="status" aria-live="polite" data-announcement></span>';

export function mountUI({root, onCommand, onZoom, onExitToMenu, mode='gameplay', placeTitle=''} = {}) {
  if (!root?.ownerDocument || typeof onCommand !== 'function') throw new TypeError('mountUI requires a DOM root and onCommand callback.');
  if(!['gameplay','explore'].includes(mode))throw new TypeError('Unknown UI mode.');
  const exploring=mode==='explore',hasExit=typeof onExitToMenu==='function';
  const doc=root.ownerDocument, win=doc.defaultView, shell=doc.createElement('section');
  shell.className='tb-ui';shell.dataset.mode=mode; shell.setAttribute('aria-label',exploring?'Tinderbox exploration controls':'Tinderbox player controls');
  const suffix='-'+(++instance);
  const navButton=(attribute,symbol,label,cost='')=>'<button type="button" class="square-control industrial-switch tb-nav" '+attribute+'><span class="switch-legend">'+icon(symbol)+'<span class="switch-label">'+label+'</span><span class="switch-cost">'+cost+'</span></span></button>';
  let content=markup;
  if(exploring){
    content=content.replace(leftButtons,navButton('data-view="view-overview" aria-label="Show place overview"','zoom-out','OVERVIEW')+navButton('data-view="view-follow" aria-label="Follow player"','movement','FOLLOW','<span data-follow-character>PLAYER</span>'));
    content=content.replace(rightButtons,navButton('data-interact aria-label="Interact"','play','<span data-interact-label>INTERACT</span>','E / SPACE')+navButton('data-exit-to-menu aria-label="Return to places"','reset','PLACES','RETURN'));
  }
  shell.innerHTML=content.replaceAll('tb-engraving-','tb-engraving'+suffix+'-').replaceAll('tb-movement-help','tb-movement-help'+suffix).replaceAll('tb-menu-title','tb-menu-title'+suffix).replaceAll('tb-tool-resource','tb-tool-resource'+suffix).replaceAll('id="tb-tool-feedback"','id="tb-tool-feedback'+suffix+'"');
  const style=doc.createElement('link');style.rel='stylesheet';style.href=new URL('./styles.css',import.meta.url).href;shell.prepend(style);root.append(shell);
  const find=s=>shell.querySelector(s), all=s=>[...shell.querySelectorAll(s)];
  const stick=find('[data-stick]'),thumb=find('.tb-stick-thumb'),pause=find('[data-pause]'),menuElement=find('[data-menu]'),map=mountMap(find('[data-map]'),{label:exploring?'Place plan':'Ground plan',playerLabel:exploring?'Player':'Bear'});
  if(exploring){
    find('.tb-health').hidden=true;find('.tb-effects').hidden=true;find('.tb-zoom').hidden=true;find('.tb-selected').hidden=true;
    const title=doc.createElement('p');title.className='tb-visit-title';title.textContent=placeTitle||'Exploration';find('.tb-vitals').append(title);
    const character=doc.createElement('p');character.className='tb-visit-character';character.dataset.characterName='';character.hidden=true;find('.tb-vitals').append(character);
    find('.tb-stick-group').insertAdjacentHTML('afterbegin','<div class="tb-visit-context"><span class="tb-micro">LOCATION</span><strong data-location-label id="tb-visit-location'+suffix+'" aria-live="off">Location pending</strong><span data-interaction-hint id="tb-interaction-hint'+suffix+'">Drag the stick or use WASD to explore.</span></div>');
    stick.setAttribute('aria-describedby','tb-movement-help'+suffix+' tb-visit-location'+suffix);
    find('[data-interact]').setAttribute('aria-describedby','tb-interaction-hint'+suffix);
    find('.left-controls').setAttribute('aria-label','Camera view');find('.right-controls').setAttribute('aria-label','Visit navigation');
    find('.tb-map figcaption b').textContent='PLACE PLAN';find('.tb-map figcaption>span').innerHTML='<i></i><span data-map-character>Player</span>';
    find('[data-reset]').hidden=true;find('[data-reset]').disabled=true;
    find('[data-resume]>span').textContent='Resume visit';
    find('[data-options-panel] .tb-key-guide').innerHTML='<div><dt>Move</dt><dd>Drag stick · WASD · arrows</dd></div><div><dt>Interact</dt><dd>E · Space · contextual button</dd></div><div><dt>View</dt><dd>Overview · Follow player</dd></div><div><dt>Places</dt><dd>Return to the main menu</dd></div><div><dt>Pause</dt><dd>Esc · P</dd></div>';
    [...find('[data-options-panel]').querySelectorAll('.tb-menu-note')].at(-1).textContent='Walk through the grounds, halls and galleries. Use E or Space when an action is available. Walk on stairs to reach another floor.';
  }
  if(hasExit){
    const back=doc.createElement('button');back.type='button';back.className='tb-menu-button';back.dataset.exitToMenu='';back.innerHTML=icon('play')+'<span>Return to places</span>';find('[data-pause-panel]').append(back);
  }
  const buttons=new Map(all('[data-tool]').map(b=>[b.dataset.tool,b])),listeners=[],hasZoom=typeof onZoom==='function';
  let disposed=false,view=null,keys=new Set(),stickPointer=null,stickVector={x:0,y:0},lastMove={x:0,y:0};
  let primaryPointer=null,primaryElement=null,primaryTool=null,awaitingSelection=false,primarySources=new Set();
  let menu=null,awaitingResume=false,previousFocus=null,wasBlocked=true,renderSignature='',previousAnnouncement='';
  let feedback=null,eventCursor=0,eventInitialized=false,eventGeneration,lastTick;
  function readToolEvents(snapshot){
    const generation=snapshot.diagnostics?.generation,rewound=lastTick!==undefined&&snapshot.tick<lastTick;
    if(!eventInitialized || rewound || generation!==eventGeneration){eventCursor=Math.max(0,...(snapshot.events??[]).filter(e=>Number.isSafeInteger(e.id)).map(e=>e.id));feedback=null;eventInitialized=true;}
    else for(const event of [...(snapshot.events??[])].filter(e=>Number.isSafeInteger(e.id)&&e.id>eventCursor).sort((a,b)=>a.id-b.id)){
      eventCursor=event.id;if(event.type==='reset'){feedback=null;continue;}
      const message=toolFeedbackOf(event);if(message)feedback={id:event.id,tool:event.tool??'torch',message};
    }
    eventGeneration=generation;lastTick=snapshot.tick;
  }

  for(const [id,button] of buttons)button.querySelector('[data-stock]').id='tb-stock-'+id+suffix;
  const on=(target,type,handler,options)=>{target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));};
  const emit=command=>{if(!disposed)onCommand(command);};
  const blocked=()=>!view||view.locked||Boolean(menu);
  const capture=(element,id)=>{try{element.setPointerCapture(id);}catch{/* Window listeners cover unavailable capture. */}};
  const release=(element,id)=>{if(element&&id!==null)try{if(element.hasPointerCapture(id))element.releasePointerCapture(id);}catch{/* Already released. */}};
  function sendMove(vector){
    const value=normalizeStick(vector.x,vector.y);thumb.style.setProperty('--stick-x',String(value.x));thumb.style.setProperty('--stick-y',String(-value.y));
    stick.dataset.moving=String(value.x!==0||value.y!==0);
    if(Math.abs(value.x-lastMove.x)>0.00001||Math.abs(value.y-lastMove.y)>0.00001){lastMove=value;emit({type:'move',...value});}
  }
  const keyboardVector=()=>normalizeStick(Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')));
  const updateMovement=()=>sendMove(stickPointer!==null?stickVector:keyboardVector());
  function releaseTrigger(){
    const element=primaryElement,id=primaryPointer,held=primarySources.size>0;
    primaryPointer=null;primaryElement=null;primaryTool=null;awaitingSelection=false;primarySources.clear();
    element?.classList.remove('is-pressed');release(element,id);if(held)emit({type:'primary',pressed:false});
  }
  function beginAction(button,source,pointerId=null){
    if(blocked()||button.disabled||primaryPointer!==null||primarySources.size)return false;
    primaryElement=button;primaryTool=button.dataset.tool;awaitingSelection=true;primaryPointer=pointerId;
    if(pointerId!==null)capture(button,pointerId);
    // The command queue owns selection and use order. No optimistic snapshot edits.
    emit({type:'select-tool',tool:primaryTool});
    if(disposed||blocked()){releaseTrigger();return false;}
    primarySources.add(source);button.classList.add('is-pressed');emit({type:'primary',pressed:true});paint();return true;
  }
  function selectTool(id){if(blocked())return;releaseTrigger();emit({type:'select-tool',tool:id});paint();}
  function cancelInput(){const id=stickPointer;stickPointer=null;keys.clear();stickVector={x:0,y:0};release(stick,id);sendMove({x:0,y:0});releaseTrigger();emit({type:'cancel-input'});}
  function focusMenu(){(menu==='options'?find('[data-reduce-motion]'):find('[data-resume]')).focus({preventScroll:true});}
  function paintMenu(){
    menuElement.hidden=!menu;pause.setAttribute('aria-expanded',String(Boolean(menu)));
    find('[data-pause-panel]').hidden=menu==='options';find('[data-options-panel]').hidden=menu!=='options';
    find('[data-menu-title]').textContent=menu==='options'?'Controls & options':view?.paused?'Paused':'Pausing…';
    find('[data-pause-note]').textContent=view?.paused?(exploring?'Your visit can wait.':'The trail can wait.'):'Waiting for the scene to pause.';
  }
  function openMenu(){if(!view)return;previousFocus=doc.activeElement;menu='pause';awaitingResume=false;cancelInput();paint();focusMenu();emit({type:'pause',paused:true});}
  function resume(){awaitingResume=true;emit({type:'pause',paused:false});}
  function paintIcon(element,id){if(element.dataset.plate===id)return;element.innerHTML=icon(id);element.dataset.plate=id;}
  function paint(){
    if(!view)return;
    const signature=exploring?JSON.stringify([view.paused,view.navigation,menu]):JSON.stringify([view.characterName,view.tool.id,view.hp,view.maxHp,view.inventory,view.pouring,view.paused,view.effects,view.torch,feedback,menu,primaryTool,primarySources.size]);
    if(signature===renderSignature)return;renderSignature=signature;
    const gated=blocked();stick.disabled=gated;stick.setAttribute('aria-disabled',String(gated));pause.disabled=false;
    for(const button of all('[data-zoom]')){button.disabled=!hasZoom;button.title=hasZoom?'Camera framing only':'Camera zoom awaits runtime connection';}
    for(const button of all('[data-exit-to-menu]'))button.disabled=!hasExit;
    if(exploring){
      const navigation=view.navigation,location=find('[data-location-label]'),hint=find('[data-interaction-hint]'),action=find('[data-interact]');
      const character=navigation.characterName,identity=find('[data-character-name]');
      identity.hidden=!character;
      if(identity.textContent!==character)identity.textContent=character||'';
      find('[data-view="view-follow"]').setAttribute('aria-label',character?'Follow the '+character.toLowerCase():'Follow player');
      if(find('[data-follow-character]').textContent!==(character||'Player').toUpperCase())find('[data-follow-character]').textContent=(character||'Player').toUpperCase();
      if(find('[data-map-character]').textContent!==(character||'Player'))find('[data-map-character]').textContent=character||'Player';
      if(location.textContent!==navigation.locationLabel)location.textContent=navigation.locationLabel;
      shell.dataset.nativeLevel=navigation.level===null?'':String(navigation.level);
      const actionHint=navigation.interaction.enabled?navigation.interaction.label+' · E / Space':'Drag the stick or use WASD to explore.';
      if(hint.textContent!==actionHint)hint.textContent=actionHint;
      const label=navigation.interaction.label.toUpperCase();
      if(find('[data-interact-label]').textContent!==label)find('[data-interact-label]').textContent=label;
      action.disabled=gated||!navigation.interaction.enabled;action.title=navigation.interaction.label;
      action.setAttribute('aria-label',navigation.interaction.label+'. E or Space.');
      for(const button of all('[data-view]'))button.disabled=gated;
      find('[data-death]').hidden=true;paintMenu();
      const announcement='Location: '+navigation.locationLabel+'.'+(navigation.interaction.enabled?' '+navigation.interaction.label+' available.':'')+(view.paused?' Paused.':'');
      if(announcement!==previousAnnouncement){find('[data-announcement]').textContent=announcement;previousAnnouncement=announcement;}
      return;
    }
    const animal=view.characterName;
    find('.tb-health-meter').setAttribute('aria-label',animal+' health');
    find('.tb-map figcaption>span').childNodes[1].textContent=animal+' ';
    find('[data-death]').firstChild.textContent=animal.toUpperCase()+' DOWN ';
    find('.tb-powder>span').textContent=animal+' faster · world & fire slower';
    const visibleFeedback=feedback?.tool===view.tool.id?feedback:null;
    const output=find('[data-tool-feedback]');output.hidden=!visibleFeedback;output.textContent=visibleFeedback?.message??'';
    for(const tool of TOOLS){
      const button=buttons.get(tool.id),stock=Math.max(0,Number(view.inventory[tool.stock])||0),pouring=tool.id==='jerry-can'&&view.pouring,held=primaryTool===tool.id&&primarySources.size>0;
      const torch=tool.id==='torch',state=view.torch;
      button.disabled=gated||(stock<=0&&!pouring)||(torch&&state.disabled);
      button.dataset.empty=String(stock<=0);button.dataset.lit=String(torch?state.phase==='lit':pouring||held);
      button.dataset.torchPhase=torch?state.phase:'';
      button.setAttribute('aria-pressed',String(view.tool.id===tool.id));
      button.setAttribute('aria-label',torch?state.label+' — Torch. '+(state.known?state.status.toLowerCase():state.hint):(tool.id==='molotov'?'Throw lantern':tool.label)+', '+stockText(stock)+' '+tool.unit+'. '+(pouring?'Pouring on. Tap to stop.':tool.hint));
      button.setAttribute('aria-describedby',view.tool.id===tool.id?'tb-tool-resource'+suffix+(visibleFeedback?' tb-tool-feedback'+suffix:''):'tb-stock-'+tool.id+suffix);
      button.title=torch?state.hint:pouring?'Stop pouring':tool.label+' · '+tool.hint;
      button.querySelector('[data-stock]').textContent=torch?(state.known?state.remaining:'WAIT'):pouring?'STOP':stock<=0?'EMPTY':stockText(stock)+' '+tool.unit;
      const action=button.querySelector('[data-action-label]');if(action)action.textContent=torch?(state.known?state.label.toUpperCase():'WAIT'):'STRIKE';
    }
    paintIcon(find('[data-selected-icon]'),view.tool.id);find('[data-tool-name]').textContent=view.tool.label;
    find('[data-tool-hint]').textContent=view.pouring?'Pouring · tap Oil barrel to stop':view.toolHint;
    find('[data-selected-stock]').textContent=view.resourceText;
    find('[data-loadout-state]').textContent=view.dead?view.characterName.toUpperCase()+' DOWN':view.paused?'PAUSED':view.pouring?'● POURING':view.tool.id==='torch'?view.torch.status:view.stock<=0?'EMPTY':'READY';
    find('[data-health-text]').textContent=Math.ceil(view.hp)+' / '+stockText(view.maxHp);find('[data-health-fill]').style.width=(view.hp/view.maxHp*100)+'%';
    find('.tb-health-meter').setAttribute('aria-valuenow',String(view.hp));find('.tb-health-meter').setAttribute('aria-valuemax',String(view.maxHp));shell.dataset.lowHealth=String(view.hp/view.maxHp<=.3);
    for(const name of ['powder','inversion']){const effect=find('[data-effect="'+name+'"]');effect.hidden=!view.effects[name].active;effect.querySelector('[data-time]').textContent=view.effects[name].remaining;}
    find('[data-death]').hidden=!view.dead;paintMenu();
    const announcement=view.tool.label+'. '+(view.tool.id==='torch'?(view.torch.known?view.torch.status.toLowerCase()+'. ':view.torch.hint+' '):'')+(view.pouring?'Pouring on.':'Pouring off.')+(view.effects.powder.active?' Powder active.':'')+(view.effects.inversion.active?' Movement reversed 180 degrees.':'')+(view.dead?' Bear down.':'');
    const announcementKey=JSON.stringify([announcement,visibleFeedback?.id]);
    if(announcementKey!==previousAnnouncement){find('[data-announcement]').textContent=announcement+(visibleFeedback?' '+visibleFeedback.message:'');previousAnnouncement=announcementKey;}
  }
  on(stick,'pointerdown',event=>{
    if(event.button!==0||stickPointer!==null||blocked())return;
    event.preventDefault();stickPointer=event.pointerId;stick.focus({preventScroll:true});capture(stick,event.pointerId);
    stickVector=pointerStick(event.clientX,event.clientY,stick.getBoundingClientRect());updateMovement();
  });
  on(win,'pointermove',event=>{if(event.pointerId!==stickPointer||blocked())return;event.preventDefault();stickVector=pointerStick(event.clientX,event.clientY,stick.getBoundingClientRect());updateMovement();},{passive:false});
  for(const button of buttons.values()){
    on(button,'pointerdown',event=>{if(event.button!==0||button.disabled||blocked()||primaryPointer!==null||primarySources.size)return;event.preventDefault();button.focus({preventScroll:true});beginAction(button,'pointer',event.pointerId);});
    on(button,'click',event=>{if(event.detail===0&&beginAction(button,'assistive')){releaseTrigger();paint();}});
    on(button,'keydown',event=>{if(!['Space','Enter'].includes(event.code)||event.repeat||button.disabled)return;event.preventDefault();beginAction(button,'key:'+event.code);});
  }
  on(win,'pointerup',event=>{
    if(event.pointerId===stickPointer){const id=stickPointer;stickPointer=null;stickVector={x:0,y:0};release(stick,id);updateMovement();}
    if(event.pointerId===primaryPointer){releaseTrigger();paint();}
  });
  on(win,'pointercancel',event=>{if(event.pointerId===stickPointer||event.pointerId===primaryPointer){cancelInput();paint();}});
  for(const element of [stick,...buttons.values()])on(element,'lostpointercapture',event=>{if(event.pointerId===stickPointer||event.pointerId===primaryPointer){cancelInput();paint();}});
  for(const button of all('button'))on(button,'keydown',event=>{if(event.repeat&&['Space','Enter'].includes(event.code))event.preventDefault();});
  const moveCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  const editable=element=>['INPUT','TEXTAREA','SELECT'].includes(element?.tagName)||element?.isContentEditable;
  const gameplayFocus=element=>element===doc.body||root.contains(element)||(element?.tagName==='CANVAS'&&root.parentElement?.contains(element));
  on(doc,'focusin',event=>{if(!gameplayFocus(event.target)&&(keys.size||stickPointer!==null||primarySources.size||view?.pouring)){cancelInput();paint();}});
  on(win,'keydown',event=>{
    if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||!gameplayFocus(doc.activeElement))return;
    const active=doc.activeElement;
    if(event.code==='Tab'&&menu){
      const focusable=all('[data-menu] button,[data-menu] input').filter(e=>!e.disabled&&!e.closest('[hidden]')),index=focusable.indexOf(active);
      if(event.shiftKey&&index<=0){event.preventDefault();focusable.at(-1)?.focus();}
      else if(!event.shiftKey&&(index<0||index===focusable.length-1)){event.preventDefault();focusable[0]?.focus();}return;
    }
    if(['Escape','KeyP'].includes(event.code)){
      event.preventDefault();if(event.repeat)return;if(menu==='options'){menu='pause';paintMenu();focusMenu();}else if(menu)resume();else openMenu();return;
    }
    if(blocked()||editable(event.target))return;
    if(moveCodes.has(event.code)){event.preventDefault();keys.add(event.code);updateMovement();}
    else if(exploring&&(event.code==='KeyE'||event.code==='Space'&&(active===doc.body||active===stick||active?.tagName==='CANVAS'))){event.preventDefault();if(!event.repeat)requestInteraction();}
    else if(!exploring&&/^Digit[1-5]$/.test(event.code)&&!event.repeat){event.preventDefault();selectTool(TOOLS[Number(event.code.at(-1))-1].id);}
    else if(!exploring&&event.code==='Space'&&(active===doc.body||active===stick||active?.tagName==='CANVAS')){
      event.preventDefault();if(!event.repeat)beginAction(buttons.get(view.tool.id),'key:Space');
    }
  });
  on(win,'keyup',event=>{
    if(moveCodes.has(event.code)&&keys.delete(event.code)){event.preventDefault();updateMovement();}
    if(primarySources.has('key:'+event.code)){event.preventDefault();releaseTrigger();paint();}
  });
  on(win,'blur',()=>{cancelInput();paint();});
  on(doc,'visibilitychange',()=>{if(doc.hidden){cancelInput();paint();}});
  on(shell,'contextmenu',event=>{if(event.target.closest('[data-stick],[data-tool]'))event.preventDefault();});
  for(const button of all('[data-zoom]'))on(button,'click',()=>{if(!disposed&&!button.disabled&&hasZoom)onZoom(button.dataset.zoom==='in'?1.15:1/1.15);});
  function requestInteraction(){if(!blocked()&&view.navigation?.interaction.enabled)emit({type:'interact'});}
  for(const button of all('[data-view]'))on(button,'click',()=>{if(!blocked())emit({type:button.dataset.view});});
  const interact=find('[data-interact]');
  if(interact){
    on(interact,'click',requestInteraction);
    on(interact,'keydown',event=>{if(['Enter','Space'].includes(event.code)){event.preventDefault();if(!event.repeat)requestInteraction();}});
  }
  for(const button of all('[data-exit-to-menu]'))on(button,'click',()=>{if(disposed||!hasExit)return;cancelInput();paint();onExitToMenu();});
  on(pause,'click',openMenu);on(find('[data-resume]'),'click',resume);
  on(find('[data-options]'),'click',()=>{menu='options';paintMenu();focusMenu();});
  on(find('[data-back]'),'click',()=>{menu='pause';paintMenu();focusMenu();});
  on(find('[data-reset]'),'click',()=>{if(exploring)return;awaitingResume=true;cancelInput();emit({type:'reset'});});
  on(find('[data-reduce-motion]'),'change',event=>shell.classList.toggle('tb-reduced-motion',event.target.checked));
  on(find('[data-contrast]'),'change',event=>shell.classList.toggle('tb-high-contrast',event.target.checked));
  for(const button of all('.tb-console button'))button.disabled=true;
  for(const button of all('[data-zoom]'))button.disabled=!hasZoom;
  return{
    update(snapshot){
      if(disposed)return;const previouslyPaused=view?.paused;
      view=exploring?{paused:Boolean(snapshot?.paused),locked:Boolean(snapshot?.paused),navigation:navigationOf(snapshot)}:viewOf(snapshot);
      if(!exploring)readToolEvents(snapshot);map.update(snapshot);
      if((awaitingResume||previouslyPaused)&&!view.paused){awaitingResume=false;menu=null;if(previousFocus?.isConnected&&previousFocus!==doc.body&&gameplayFocus(previousFocus))previousFocus.focus({preventScroll:true});else pause.focus({preventScroll:true});}
      else if(view.paused&&!menu){previousFocus=doc.activeElement;menu='pause';paintMenu();focusMenu();}
      const nowBlocked=blocked(),cancel=!wasBlocked&&nowBlocked;wasBlocked=nowBlocked;if(cancel)cancelInput();
      if(!exploring&&primaryTool===view.tool.id)awaitingSelection=false;
      if(!exploring&&primarySources.size&&((!awaitingSelection&&primaryTool!==view.tool.id)||(primaryTool===view.tool.id&&view.primaryDisabled)))releaseTrigger();
      paint();
    },
    dispose(){if(disposed)return;cancelInput();disposed=true;for(const remove of listeners.splice(0))remove();shell.remove();}
  };
}
