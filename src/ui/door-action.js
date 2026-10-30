// Presentation only: runtime chooses the door, action, safety and projected pixel.
let instance=0;
export function mountDoorAction({shell,onProjectInteraction,onCommand,isBlocked,mark=''}){
  const doc=shell.ownerDocument,button=doc.createElement('button');
  button.type='button';button.className='tb-door-action tb-wood-panel';button.dataset.interact='';button.hidden=true;button.disabled=true;
  button.innerHTML=mark+'<span class="tb-door-copy"><strong data-door-label></strong><small>E / Space</small><span data-door-reason hidden></span></span><i class="tb-door-pointer" aria-hidden="true"></i>';
  const label=button.querySelector('[data-door-label]'),reason=button.querySelector('[data-door-reason]');reason.id='tb-door-reason-'+(++instance);button.setAttribute('aria-describedby',reason.id);shell.append(button);
  let disposed=false,current=null,pressedTarget=null;
  const key=()=>current?JSON.stringify([current.id,current.action]):null;
  function hide(){current=null;button.hidden=true;button.disabled=true;}
  function update(interaction,blocked){
    if(disposed)return;
    if(!interaction||blocked||typeof onProjectInteraction!=='function'){hide();return;}
    let point;try{point=onProjectInteraction([...interaction.anchor]);}catch{hide();return;}
    const box=shell.getBoundingClientRect(),viewport=doc.documentElement;
    const left=Math.max(0,-box.left)+8,right=Math.min(box.width,viewport.clientWidth-box.left)-8;
    const top=Math.max(0,-box.top)+8,bottom=Math.min(box.height,viewport.clientHeight-box.top)-8;
    if(point?.visible!==true||![point.x,point.y].every(Number.isFinite)||point.x<left-8||point.x>right+8||point.y<top-8||point.y>bottom+8){hide();return;}
    if(label.textContent!==interaction.label)label.textContent=interaction.label;
    const explanation=interaction.enabled?'':interaction.reason||'Action unavailable.';if(reason.textContent!==explanation)reason.textContent=explanation;reason.hidden=interaction.enabled;
    const accessible=interaction.label+'. E or Space.'+(reason.hidden?'':' '+explanation);if(button.getAttribute('aria-label')!==accessible)button.setAttribute('aria-label',accessible);
    const title=reason.hidden?interaction.label:explanation;if(button.title!==title)button.title=title;
    button.style.maxWidth=Math.max(0,Math.min(260,right-left))+'px';button.hidden=false;
    // Fit around actual header panels; the central landscape gap stays usable.
    const deck=shell.querySelector('.tb-console').getBoundingClientRect(),size=button.getBoundingClientRect();
    const x=Math.max(left,Math.min(right-size.width,point.x-size.width/2));
    let minY=top;const maxY=Math.min(bottom,deck.top-box.top-10);
    for(const selector of ['.tb-vitals','.tb-map']){const panel=shell.querySelector(selector).getBoundingClientRect();if(x+size.width>panel.left-box.left-8&&x<panel.right-box.left+8)minY=Math.max(minY,panel.bottom-box.top+8);}
    if(size.width<44||size.height<44||size.width>right-left||size.height>maxY-minY){hide();return;}
    const y=Math.max(minY,Math.min(maxY-size.height,point.y-size.height-10));
    button.style.left=x+'px';button.style.top=y+'px';
    button.style.setProperty('--door-pointer-x',Math.max(12,Math.min(size.width-12,point.x-x))+'px');
    button.disabled=!interaction.enabled;current=interaction;
  }
  function request(){if(disposed||isBlocked()||button.hidden||button.disabled||!current)return;const{id,action}=current;onCommand({type:'interact',portalId:id,action});}
  const click=()=>{const expected=pressedTarget;pressedTarget=null;if(expected&&expected!==key())return;request();};
  const pointerdown=event=>{if(event.button===0)pressedTarget=key();};
  const keydown=event=>{if(['Enter','Space'].includes(event.code)){event.stopPropagation();if(event.repeat)event.preventDefault();else pressedTarget=key();}};
  button.addEventListener('click',click);button.addEventListener('keydown',keydown);button.addEventListener('pointerdown',pointerdown);
  return {update,request,hide,isVisible:()=>!button.hidden,dispose(){if(disposed)return;hide();disposed=true;button.removeEventListener('click',click);button.removeEventListener('keydown',keydown);button.removeEventListener('pointerdown',pointerdown);button.remove();}};
}
