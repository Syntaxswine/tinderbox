import {TRAIN_GEARS,trainDetent,trainGearOf} from './train-control-model.js';
import {createTrainClick} from './train-click.js';

const identity = state => JSON.stringify([state.actorId,state.mode,state.trainId,state.carId,state.cabFacing,state.expected?.occupancyRevision]);
let mounts=0;

// Consumes Nautilus's v1 connector. The host retains train motion and occupancy.
export function mountTrainControl({walkingElement,session,actorId,setWalkingEnabled,muted=false,newId,onError=()=>{}}={}) {
  const doc=walkingElement?.ownerDocument,win=doc?.defaultView;
  if (!doc || !walkingElement.parentElement || typeof setWalkingEnabled!=='function' || !actorId ||
      session?.contract?.id!=='nautilus-drivable-trains' || session.contract.version!==1 ||
      session.contract.profile!=='bounded-rail-driver-v1' ||
      !['readForActor','dispatch','subscribe'].every(key=>typeof session[key]==='function')) {
    throw new TypeError('Supply the Nautilus v1 train connector, actor and walking input owner.');
  }
  const slot=walkingElement.parentElement,element=doc.createElement('div'),suffix='-'+(++mounts);
  const id=newId||((kind)=>'tinderbox/train/'+kind+'/'+win.crypto.randomUUID());
  element.className='tb-stick tb-train-control';element.hidden=true;element.dataset.gear='2';
  element.innerHTML='<div class="tb-train-plate" aria-hidden="true"></div>'+
    '<div class="tb-train-lever" role="slider" tabindex="0" aria-label="Train lever" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="3" aria-valuenow="1" aria-valuetext="Neutral" aria-describedby="tb-train-help'+suffix+'">'+
    '<span class="tb-train-gate" aria-hidden="true">'+TRAIN_GEARS.map((gear,index)=>'<span class="tb-train-stop" style="--stop:'+index/3*100+'%"><b>'+gear.mark+'</b><i></i></span>').join('')+
    '<span class="tb-train-knob"><i></i></span></span></div>'+
    '<button type="button" class="tb-train-brake" aria-label="Pull brake chain" aria-pressed="false">'+
    '<span class="tb-train-anchor" aria-hidden="true"></span><span class="tb-train-chain" aria-hidden="true">'+
    '<i></i><i></i><i></i><i></i><i></i><span class="tb-train-ring"></span></span><span class="tb-train-brake-word" aria-hidden="true">BRAKE</span></button>'+
    '<span class="tb-sr-only" id="tb-train-help'+suffix+'">Drag between Forward II, Forward I, Neutral and Reverse. Pull and release the chain to stop. Arrow keys select a gear. B brakes.</span>';
  walkingElement.after(element);
  const style=doc.createElement('link');style.rel='stylesheet';style.href=new URL('./train-control.css',import.meta.url).href;element.prepend(style);
  const lever=element.querySelector('[role=slider]'),brake=element.querySelector('button');
  const caption=slot.querySelector('.tb-stick-caption'),oldCaption=caption?.innerHTML;
  const output=doc.createElement('span');output.className='tb-train-message';output.setAttribute('role','status');output.hidden=true;element.after(output);
  const click=createTrainClick(win,{muted}),listeners=[];
  const on=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
  let current=null,context=null,lease=null,gear=2,drag=null,chain=null,brakeKey=null;
  let disposed=false,blocked=false,fault=false,sending=false,refreshing=false,pending=false,walking=null;
  let unsubscribe=()=>{};
  const unavailable=()=>disposed||blocked||fault||doc.hidden||current?.mode!=='driver';
  function report(error) { try { onError(error); } catch {} }
  function tell(text='') { output.textContent=text;output.hidden=!text; }
  function releaseCapture(node,pointer) { if(pointer)try{node.releasePointerCapture(pointer.id);}catch{} }
  function clearGestures() {
    const oldDrag=drag,oldChain=chain;drag=null;chain=null;brakeKey=null;
    releaseCapture(lever,oldDrag);releaseCapture(brake,oldChain);
    element.style.setProperty('--chain-pull','0px');
  }
  function render() {
    const occupied=Boolean(current&&current.mode!=='on-foot');
    element.hidden=!occupied;walkingElement.hidden=occupied;
    walkingElement.inert=occupied;
    const enabled=Boolean(current?.mode==='on-foot'&&current.walkingAllowed&&!fault);
    if(walking!==enabled){walking=enabled;setWalkingEnabled(enabled);}
    element.dataset.gear=String(gear);element.dataset.braking=String(Boolean(current?.train?.controls.brake));
    element.style.setProperty('--position',gear/3*100+'%');
    lever.tabIndex=unavailable()?-1:0;lever.setAttribute('aria-disabled',String(unavailable()));
    lever.setAttribute('aria-valuenow',String(3-gear));lever.setAttribute('aria-valuetext',TRAIN_GEARS[gear].label);
    brake.disabled=unavailable();brake.setAttribute('aria-pressed',String(Boolean(current?.train?.controls.brake)));
    if(caption)caption.textContent=occupied?(current.mode==='driver'?'DRIVE':'RIDING'):'MOVE';
  }
  function send(command) {
    if(sending)return null;
    sending=true;
    try {
      const result=session.dispatch(command);
      if(typeof result?.committed!=='boolean'||result.commandId!==command.commandId)throw new TypeError('The train connector returned an invalid receipt.');
      return result;
    } catch(error){fault=true;tell('Train controls unavailable.');report(error);return null;}
    finally{sending=false;}
  }
  function releaseInput() {
    const old=lease;lease=null;gear=2;clearGestures();
    if(old)send({type:'release',actorId:old.actorId,commandId:id('release'),leaseId:old.id});
    return Boolean(old);
  }
  function refresh() {
    if(disposed)return;
    if(refreshing||sending){pending=true;return;}
    refreshing=true;
    try {
      let rounds=0;
      do {
        pending=false;
        const next=session.readForActor(actorId),nextContext=identity(next);
        if(!next||next.actorId!==actorId||!['on-foot','driver','rider'].includes(next.mode))throw new TypeError('The train connector returned an invalid actor.');
        if(context!==nextContext||(lease?.accepted&&next.train?.controls.leaseId!==lease.id))releaseInput();
        current=next;context=nextContext;
        gear=trainGearOf(next.train?.controls);render();rounds++;
      } while(pending&&rounds<4);
    } catch(error) {
      fault=true;releaseInput();current=null;render();tell('Train controls unavailable.');report(error);
    } finally{refreshing=false;}
  }
  function choose(next,event,braking=false) {
    if(unavailable()||sending||(!braking&&(chain||brakeKey))||(!braking&&next===gear))return false;
    click.unlock(event);refresh();
    if(unavailable())return false;
    const selected=TRAIN_GEARS[next],oldGear=gear;
    const held=lease||{id:id('lease'),actorId:current.actorId,trainId:current.trainId,context,accepted:false};
    lease=held;
    const result=send({type:'drive',actorId:held.actorId,commandId:id('drive'),trainId:held.trainId,
      expected:structuredClone(current.expected),leaseId:held.id,
      direction:braking?'neutral':selected.direction,power:braking?0:selected.power,brake:braking?1:0});
    if(result?.committed&&lease===held){
      held.accepted=true;if(oldGear!==next)click.click();tell();
    } else {const reason=result?.reason||result?.code||'The train could not change gear.';releaseInput();tell(reason);}
    refresh();return result?.committed===true;
  }
  function moveLever(event) {
    if(!drag||event.pointerId!==drag.id)return;
    if(event.pointerType!=='touch'&&event.buttons===0){releaseInput();refresh();return;}
    const position=(event.clientY-drag.rect.top-16)/(drag.rect.height-32)*3;
    choose(trainDetent(position,gear),event);
  }
  on(lever,'pointerdown',event=>{
    if(event.button!==0||unavailable()||drag||chain||brakeKey)return;
    event.preventDefault();click.unlock(event);lever.focus({preventScroll:true});
    drag={id:event.pointerId,rect:lever.getBoundingClientRect()};
    try{lever.setPointerCapture(event.pointerId);}catch{}
    moveLever(event);
  });
  on(brake,'pointerdown',event=>{
    if(event.button!==0||unavailable()||chain)return;
    event.preventDefault();click.unlock(event);brake.focus({preventScroll:true});
    if(choose(2,event,true)){
      const oldDrag=drag;drag=null;releaseCapture(lever,oldDrag);
      chain={id:event.pointerId,y:event.clientY};
      element.style.setProperty('--chain-pull','8px');
      try{brake.setPointerCapture(event.pointerId);}catch{}
    }
  });
  on(win,'pointermove',event=>{
    moveLever(event);
    if(chain?.id===event.pointerId){
      if(event.pointerType!=='touch'&&event.buttons===0){releaseInput();refresh();return;}
      element.style.setProperty('--chain-pull',Math.max(8,Math.min(20,8+(event.clientY-chain.y)*.4))+'px');
    }
  },{passive:false});
  on(win,'pointerup',event=>{
    if(drag?.id===event.pointerId){const old=drag;drag=null;releaseCapture(lever,old);}
    if(chain?.id===event.pointerId){releaseInput();refresh();}
  });
  on(win,'pointercancel',event=>{if(drag?.id===event.pointerId||chain?.id===event.pointerId){releaseInput();refresh();}});
  for(const node of [lever,brake])on(node,'lostpointercapture',event=>{if(drag?.id===event.pointerId||chain?.id===event.pointerId){releaseInput();refresh();}});
  on(lever,'keydown',event=>{
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    if(event.repeat)return;
    const next=event.key==='Home'?3:event.key==='End'?0:Math.max(0,Math.min(3,gear+(['ArrowUp','ArrowRight'].includes(event.key)?-1:1)));
    choose(next,event);
  });
  on(element,'keydown',event=>{
    if(event.key.toLowerCase()!=='b'&&!(event.target===brake&&[' ','Enter'].includes(event.key)))return;
    event.preventDefault();event.stopPropagation();
    if(!event.repeat&&choose(2,event,true))brakeKey=event.code;
  });
  on(win,'keyup',event=>{if(brakeKey&&event.code===brakeKey){releaseInput();refresh();}});
  on(brake,'click',event=>{if(event.detail===0&&!brakeKey&&!chain&&choose(2,event,true)){releaseInput();refresh();}});
  on(slot,'focusout',event=>{if(!slot.contains(event.relatedTarget)){releaseInput();refresh();}});
  on(win,'blur',()=>{releaseInput();refresh();});
  on(win,'pagehide',()=>releaseInput());
  on(doc,'visibilitychange',()=>{if(doc.hidden)releaseInput();refresh();});
  try {
    unsubscribe=session.subscribe(refresh);
    if(typeof unsubscribe!=='function')throw new TypeError('The train subscription requires a disposer.');
    refresh();
  } catch(error){for(const remove of listeners)remove();element.remove();output.remove();click.dispose();throw error;}
  return {
    element,refresh,releaseInput:()=>{releaseInput();refresh();},
    setBlocked(value) { const changed=blocked!==Boolean(value);blocked=Boolean(value);if(changed&&blocked){releaseInput();refresh();}render(); },
    setMuted:value=>click.setMuted(value),
    get state() { return {gear,leaseId:lease?.id||null,mode:current?.mode,blocked,fault,feedback:click.state}; },
    dispose() {
      if(disposed)return;
      disposed=true;
      try{unsubscribe();}catch(error){report(error);}
      try{releaseInput();}finally{
        for(const remove of listeners)remove();click.dispose();
        element.remove();output.remove();walkingElement.hidden=false;walkingElement.inert=false;
        if(caption)caption.innerHTML=oldCaption;
        setWalkingEnabled(current?.mode==='on-foot'&&current.walkingAllowed&&!fault);
      }
    }
  };
}
