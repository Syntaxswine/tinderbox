// Opening-based transport/observation proxies. Renderer, camera, effect toggles
// and resident memory never create or retain a world smoke signal.
export const SMOKE_PERCEPTION=Object.freeze({minimum:.08,sustain:.6,sourceRange:3,viewRange:12,rise:1.6,outside:.2});
// Cache membership only. The actual canonical objects retain live pose,
// permeability and retirement; signals/sources/sight are recomputed normally.
export function createVentSmokeSampler(trial,visibility){
  const {index,data}=trial.scene;let revision=-1,count=-1,signature='',bindings=new Map();
  const portals=vent=>{
    const vents=data.closingTime.smokeVents||[],key=JSON.stringify(vents.map(v=>v.openingIds));
    if(revision!==index.membershipRevision||count!==index.surfaces.size||signature!==key||bindings.size!==vents.length||vents.some(v=>!bindings.has(v))){
      bindings=new Map(vents.map(v=>[v,[]]));const interested=new Map();
      for(const v of vents)for(const id of new Set(v.openingIds)){if(!interested.has(id))interested.set(id,[]);interested.get(id).push(v);}
      for(const boundary of index.surfaces.values())for(const v of interested.get(boundary.openingId)||[])bindings.get(v).push(boundary);
      revision=index.membershipRevision;count=index.surfaces.size;signature=key;
    }
    return bindings.get(vent)||[];
  };
  return ()=>ventSmokeSignals(trial,visibility,portals);
}
export function ventSmokeSignals(trial,visibility,portalsForVent){
  const {scene}=trial,sources=trial.fireSamples().filter(s=>s.smoke>SMOKE_PERCEPTION.minimum),signals=[];
  if(!sources.length)return signals;
  for(const vent of scene.data.closingTime.smokeVents||[]){
    const portals=portalsForVent?portalsForVent(vent):[...scene.index.surfaces.values()].filter(b=>vent.openingIds.includes(b.openingId));
    // An opened rotating leaf is still solid at its new physical pose.
    if(!portals.some(b=>!b.intact||b.openFraction>.95||!b.actualDoorPose&&scene.index.pass(b)>.99))continue;
    const length=Math.hypot(...vent.outward),base=vent.position.map((p,i)=>p+vent.outward[i]/length*SMOKE_PERCEPTION.outside),plume=[base[0],base[1]+SMOKE_PERCEPTION.rise,base[2]],target={x:plume[0],y:plume[2],h:plume[1]},ignoreSources=portals.map(b=>b.sourceSurfaceId);
    if(visibility.blocked({x:base[0],y:base[2],h:base[1]},target,{ignoreSources}))continue;
    const candidates=[];
    for(const s of sources){
      if(Math.hypot(s.x-vent.position[0],s.z-vent.position[2])>SMOKE_PERCEPTION.sourceRange)continue;
      const from={x:s.x,y:s.z,h:s.y+.15},to={x:vent.position[0],y:vent.position[2],h:vent.position[1]};
      if(visibility.blocked(from,to,{ignoreSources:[...ignoreSources,s.sourceSurfaceId,s.boundaryId,s.partId,s.itemId]}))continue;
      candidates.push({sourceId:s.id,ventId:vent.id,position:plume,base,ventPosition:[...vent.position],strength:s.smoke,sourcePosition:[s.x,s.y,s.z],ignited:s.ignited});
    }
    const strongest=candidates.sort((a,b)=>b.strength-a.strength||a.sourceId.localeCompare(b.sourceId))[0];if(strongest)signals.push(strongest);
  }
  return signals;
}
export function visibleSmoke(trial,observer,visibility,signals=ventSmokeSignals(trial,visibility)){
  const eye={x:observer.x,y:observer.y,h:observer.elevation+observer.height*.85};
  return signals.filter(s=>{const p=s.position,target={x:p[0],y:p[2],h:p[1]};return Math.hypot(eye.x-target.x,eye.y-target.y,eye.h-target.h)<=SMOKE_PERCEPTION.viewRange&&visibility.visible(eye,target);}).sort((a,b)=>b.strength-a.strength||a.sourceId.localeCompare(b.sourceId))[0]||null;
}
