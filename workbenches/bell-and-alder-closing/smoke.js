// Opening-based transport/observation proxies. Renderer, camera, effect toggles
// and resident memory never create or retain a world smoke signal.
export const SMOKE_PERCEPTION=Object.freeze({minimum:.08,sustain:.6,sourceRange:3,viewRange:12,rise:1.6,outside:.2});
export function ventSmokeSignals(trial,visibility){
  const {scene}=trial,sources=trial.fireSamples().filter(s=>s.smoke>SMOKE_PERCEPTION.minimum),signals=[];
  if(!sources.length)return signals;
  for(const vent of scene.data.closingTime.smokeVents||[]){
    const portals=[...scene.index.surfaces.values()].filter(b=>vent.openingIds.includes(b.openingId));
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
