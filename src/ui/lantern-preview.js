// Draw only the authoritative samples. No aim, range, collision or trajectory math.
const dots=10;
export function mountLanternPreview({root,shell,onProjectInteraction}) {
  const doc=shell.ownerDocument,ns='http://www.w3.org/2000/svg';
  const svg=doc.createElementNS(ns,'svg');
  svg.setAttribute('class','tb-lantern-preview');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  svg.setAttribute('hidden','');
  const trail=Array.from({length:dots},()=>{
    const dot=doc.createElementNS(ns,'circle');
    dot.setAttribute('r','2.25');
    svg.append(dot);
    return dot;
  });
  const landing=doc.createElementNS(ns,'g');
  landing.setAttribute('class','tb-lantern-landing');
  landing.innerHTML='<circle class="tb-landing-outline" r="10"/><circle class="tb-landing-ring" r="10"/><path d="M-15 0h4m22 0h4M0-15v4m0 22v4"/><circle class="tb-landing-center" r="2"/>';
  svg.append(landing);
  shell.prepend(svg);
  const hide=(node,hidden)=>node.toggleAttribute('hidden',hidden);
  return {
    update(aim) {
      if (!aim?.impact || typeof onProjectInteraction!=='function') {hide(svg,true);return;}
      const from=root.getBoundingClientRect(),to=shell.getBoundingClientRect();
      const dx=from.left+root.clientLeft-root.scrollLeft-to.left,dy=from.top+root.clientTop-root.scrollTop-to.top;
      const project=point=>{
        let p;
        try {p=onProjectInteraction([point.x,point.h,point.y]);} catch {return null;}
        if(p?.visible!==true||!Number.isFinite(p.x)||!Number.isFinite(p.y))return null;
        const x=p.x+dx,y=p.y+dy;
        return x>=0&&y>=0&&x<=to.width&&y<=to.height?{x,y}:null;
      };
      const at=project(aim.impact),path=aim.path,count=Math.min(path.length,dots);
      // The projection reads viewport bounds; collect positions before changing the SVG.
      const points=Array.from({length:count},(_,i)=>project(path[Math.round(i*(path.length-1)/Math.max(1,count-1))]));
      hide(landing,!at);
      if(at)landing.setAttribute('transform','translate('+at.x+' '+at.y+')');
      svg.dataset.locked=String(aim.canThrow);
      let any=Boolean(at);
      trail.forEach((dot,i)=>{
        const p=points[i];
        hide(dot,!p);
        if(p){dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);any=true;}
      });
      hide(svg,!any);
    },
    dispose(){svg.remove();}
  };
}
