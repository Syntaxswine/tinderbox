// Camera commands only. The host owns view changes, readiness and pause state.
export function mountMenuNavigation({root, onView, placeTitle='', mark=()=>''}) {
  if(!root?.ownerDocument || typeof onView!=='function')throw new TypeError('Menu navigation requires a root and onView.');
  const doc=root.ownerDocument, group=doc.createElement('section');
  group.className='tb-menu-navigation';group.setAttribute('aria-label','Place view');group.hidden=true;
  const summary=doc.createElement('p'),title=doc.createElement('strong'),location=doc.createElement('span');
  summary.className='tb-menu-note';title.textContent=placeTitle||'Place view';
  summary.append(title,doc.createElement('br'),location);group.append(summary);
  let enabled=false,disposed=false,signature='';
  const entries=[['view-overview','zoom-out','Show place overview'],['view-follow','movement','Follow player']].map(([command,symbol,label])=>{
    const button=doc.createElement('button'),text=doc.createElement('span');
    button.type='button';button.className='tb-menu-button';button.dataset.menuView=command;
    button.disabled=true;button.setAttribute('aria-pressed','false');button.innerHTML=mark(symbol);
    text.textContent=label;button.append(text);group.append(button);
    const activate=()=>{if(!disposed&&enabled&&!button.disabled)onView(command);};
    button.addEventListener('click',activate);
    return {button,text,command,activate,label};
  });
  root.append(group);
  return {
    update(navigation,{available=false,enabled:ready=false}={}) {
      if(disposed)return;
      const next=JSON.stringify([available,ready,navigation.characterName,navigation.locationLabel,navigation.view]);
      if(next===signature)return;signature=next;
      group.hidden=!available;enabled=Boolean(available&&ready);
      location.textContent=navigation.locationLabel+(navigation.characterName?' · '+navigation.characterName:'');
      for(const {button,text,command,label} of entries) {
        button.disabled=!enabled;
        const following=command==='view-follow',selected=navigation.view===(following?'follow':'overview');
        const name=following&&navigation.characterName?'Follow the '+navigation.characterName.toLowerCase():label;
        text.textContent=name+(selected?' (current)':'');button.setAttribute('aria-label',name);
        button.setAttribute('aria-pressed',String(selected));
      }
    },
    dispose() {
      if(disposed)return;disposed=true;enabled=false;
      for(const {button,activate} of entries)button.removeEventListener('click',activate);
      group.remove();
    }
  };
}
