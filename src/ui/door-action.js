// Presentation only: runtime chooses the target, action, safety and projected pixel.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
let instance=0;

export function mountContextAction({shell,onProjectInteraction,onCommand,isBlocked,spaceShortcut=false,mark=''}){
  const doc=shell.ownerDocument,button=doc.createElement('button');
  const shortcut=spaceShortcut?'E / Space':'E';
  button.type='button';button.className='tb-door-action tb-wood-panel';button.dataset.interact='';button.hidden=true;button.disabled=true;
  button.innerHTML=mark+'<span class="tb-door-copy"><strong data-door-label></strong><small>'+shortcut+'</small><span data-door-reason hidden></span></span><i class="tb-door-pointer" aria-hidden="true"></i>';
  const label=button.querySelector('[data-door-label]'),reason=button.querySelector('[data-door-reason]');
  reason.id='tb-door-reason-'+(++instance);button.setAttribute('aria-describedby',reason.id);
  button.setAttribute('aria-keyshortcuts',spaceShortcut?'E Space':'E');shell.append(button);
  const deck=shell.querySelector('.tb-console'),panels=[...shell.querySelectorAll('.tb-vitals,.tb-map,.tb-zoom')];
  let disposed=false,current=null,pressed=null,revision=0;
  function bind(next){
    if(current?.id!==next?.id||current?.kind!==next?.kind||current?.action!==next?.action||current?.enabled!==next?.enabled)revision++;
    current=next;
  }
  function hasFocus(){return doc.activeElement===button;}
  function hide(){
    const lostFocus=!button.hidden&&hasFocus();
    bind(null);button.hidden=true;button.disabled=true;return lostFocus;
  }
  function update(interaction,blocked){
    if(disposed)return false;
    if(!interaction||blocked||typeof onProjectInteraction!=='function')return hide();
    let point;try{point=onProjectInteraction([...interaction.anchor]);}catch{return hide();}
    const box=shell.getBoundingClientRect(),viewport=doc.documentElement;
    const left=Math.max(0,-box.left)+8,right=Math.min(box.width,viewport.clientWidth-box.left)-8;
    const top=Math.max(0,-box.top)+8,bottom=Math.min(box.height,viewport.clientHeight-box.top)-8;
    if(point?.visible!==true||![point.x,point.y].every(Number.isFinite)||point.x<left-8||point.x>right+8||point.y<top-8||point.y>bottom+8)return hide();
    if(label.textContent!==interaction.label)label.textContent=interaction.label;
    const explanation=interaction.enabled?'':interaction.reason||'Action unavailable.';
    if(reason.textContent!==explanation)reason.textContent=explanation;reason.hidden=interaction.enabled;
    const accessible=interaction.label+(spaceShortcut?'. E or Space.':'. E.')+(explanation?' '+explanation:'');
    if(button.getAttribute('aria-label')!==accessible)button.setAttribute('aria-label',accessible);
    const title=explanation||interaction.label;if(button.title!==title)button.title=title;
    button.style.maxWidth=Math.max(0,Math.min(260,right-left))+'px';button.hidden=false;
    const size=button.getBoundingClientRect(),floor=Math.min(bottom,deck.getBoundingClientRect().top-box.top-16);
    if(size.width<44||size.height<44||size.width>right-left||size.height>floor-top)return hide();
    const idealX=clamp(point.x-size.width/2,left,right-size.width),idealY=point.y-size.height-10;
    const obstructions=panels.map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
    // Keep the plate near its projected anchor, and find a gap around the HUD.
    const xs=[idealX,...obstructions.flatMap(r=>[r.left-box.left-size.width-8,r.right-box.left+8])];
    let fit;
    for(const candidate of xs){
      const x=clamp(candidate,left,right-size.width);
      let bands=[[top,floor]];
      for(const r of obstructions){
        if(x+size.width<=r.left-box.left-8||x>=r.right-box.left+8)continue;
        bands=bands.flatMap(([lo,hi])=>[[lo,Math.min(hi,r.top-box.top-8)],[Math.max(lo,r.bottom-box.top+8),hi]].filter(([a,b])=>b-a>=size.height));
      }
      for(const [lo,hi] of bands){
        const y=clamp(idealY,lo,hi-size.height),distance=Math.hypot(x-idealX,y-idealY);
        if(!fit||distance<fit.distance)fit={x,y,distance};
      }
    }
    if(!fit)return hide();
    button.style.left=fit.x+'px';button.style.top=fit.y+'px';
    button.style.setProperty('--door-pointer-x',clamp(point.x-fit.x,12,size.width-12)+'px');
    button.disabled=!interaction.enabled;bind(interaction);return false;
  }
  const available=()=>!disposed&&!isBlocked()&&!button.hidden&&!button.disabled&&Boolean(current);
  function request(){
    if(!available())return;
    const {id,kind,action}=current;
    onCommand(kind==='door'?{type:'interact',portalId:id,action}:{type:'interact',objectId:id,action});
  }
  function cancelPress(){if(pressed)pressed.revision=-1;}
  const click=event=>{
    // A pointer click must belong to this press. A keyboard/AT click uses detail 0.
    if(event.detail>0&&(pressed?.pointerId===undefined||(event.pointerId>0&&pressed.pointerId!==event.pointerId)))return;
    const expected=pressed;pressed=null;
    if(expected&&expected.revision!==revision)return;
    request();
  };
  const pointerdown=event=>{if(event.button===0&&available())pressed={revision,pointerId:event.pointerId};};
  const keydown=event=>{
    if(event.code!=='Enter'&&event.code!=='Space')return;
    event.stopPropagation();
    if(event.repeat)event.preventDefault();else if(available())pressed={revision};
  };
  const listeners=[['click',click],['keydown',keydown],['pointerdown',pointerdown],['pointercancel',cancelPress],['blur',cancelPress]];
  for(const [type,fn] of listeners)button.addEventListener(type,fn);
  return {update,request,cancelPress,isVisible:()=>!button.hidden,dispose(){
    if(disposed)return;hide();disposed=true;
    for(const [type,fn] of listeners)button.removeEventListener(type,fn);
    button.remove();
  }};
}
