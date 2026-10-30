const finite=Number.isFinite,copy=value=>structuredClone(value);
const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
// Exact published fan-membership rule, retained for native held-nozzle visibility.
export function dischargePresentation(discharge,muzzle){
  const active=!!discharge?.active,rays=discharge?.rays||[],origin=discharge?.shapeOrigin;
  let inside=false;
  if(origin&&muzzle&&[origin.x,origin.y,muzzle.x,muzzle.z].every(finite)){
    const px=muzzle.x-origin.x,py=muzzle.z-origin.y;inside=px*px+py*py<1e-12;
    if(discharge.connectRays)for(let i=1;!inside&&i<rays.length;i++){
      const ax=rays[i-1].x-origin.x,ay=rays[i-1].y-origin.y,bx=rays[i].x-origin.x,by=rays[i].y-origin.y;
      inside=cross(ax,ay,bx,by)>=1e-10&&cross(ax,ay,px,py)>=0&&cross(px,py,bx,by)>=0&&cross(bx-ax,by-ay,px-ax,py-ay)>=0;
    }
  }
  return {active,tool:discharge?.tool||null,connectRays:!!discharge?.connectRays,rayCount:rays.length,muzzleInsideShape:inside,
    longestRay:rays.reduce((n,r)=>Math.max(n,r.distance||0),0),invalid:null};
}
export function burningBuildingVisuals(snapshot,housing){
  const models=new Map((housing?.models||[]).map(model=>[model.instanceId,model]));
  return (snapshot.world.buildings||[]).flatMap(building=>{
    const model=models.get(building.id);if(building.destroyed||!model?.sourceBounds)return [];
    const boxes=(snapshot.world.obstacles||[]).filter(box=>box.buildingId===building.id);
    const cells=snapshot.cells.filter(c=>boxes.some(b=>Math.abs(c.x-b.x)<b.width/2+c.size/2-1e-9&&Math.abs(c.y-b.y)<b.depth/2+c.size/2-1e-9));
    const burning=cells.filter(c=>c.phase==='burning'&&c.intensity>0);
    if(!burning.length)return [];
    return [{id:building.id,prefabId:building.prefabId,destroyed:false,burnedFraction:building.burnedFraction,
      sourceBounds:copy(model.sourceBounds),footprintCellIds:cells.map(c=>c.id),burningCellIds:burning.map(c=>c.id),
      intensity:burning.reduce((n,c)=>n+c.intensity,0)/burning.length}];
  });
}
export function createFireFrameAdapter(){
  let generation=null,lastWorld=null,lastPlayerTime=null,lastTick=null,highestId=-Infinity,primed=false;
  function reset(){generation=null;lastWorld=lastPlayerTime=lastTick=null;highestId=-Infinity;primed=false;}
  function update(snapshot,{camera,viewport={},anchors={},fieldUniforms,buildingVisuals=[]}={}){
    const nextGeneration=snapshot.diagnostics?.generation??0,worldTime=snapshot.clocks.world,playerTime=snapshot.clocks.player;
    const restarted=generation!==nextGeneration||lastWorld!==null&&(worldTime<lastWorld||snapshot.tick<lastTick);
    if(restarted)reset();
    const fresh=[];
    for(const event of snapshot.events||[]){
      if(typeof event.id!=='number'||!finite(event.id)||event.id<=highestId)continue;
      if(primed)fresh.push({...copy(event),receivedWorldTime:worldTime});
      highestId=Math.max(highestId,event.id);
    }
    const worldDelta=snapshot.paused||lastWorld===null?0:Math.max(0,worldTime-lastWorld);
    const playerDelta=snapshot.paused||lastWorld===null?0:Math.max(0,playerTime-(lastPlayerTime??playerTime));
    generation=nextGeneration;lastWorld=worldTime;lastTick=snapshot.tick;lastPlayerTime=playerTime;primed=true;
    const p=snapshot.player,m=anchors.muzzle,q=anchors.muzzleQuaternion;
    const borrowed=fieldUniforms?{field:{value:fieldUniforms.field.value},grid:{value:{x:fieldUniforms.grid.value.x,y:fieldUniforms.grid.value.y}},cellSize:{value:fieldUniforms.cellSize.value}}:null;
    return {version:1,tick:snapshot.tick,worldTime,playerTime,worldDelta,playerDelta,paused:snapshot.paused,
      player:{x:p.x,y:p.y,elevation:p.elevation||0,radius:p.radius,height:p.height,heading:p.heading,tool:p.tool,characterId:p.characterId},
      camera:camera?{kind:camera.isPerspectiveCamera?'perspective':'orthographic',position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},
        quaternion:camera.quaternion.toArray(),matrixWorld:camera.matrixWorld.toArray(),matrixWorldInverse:camera.matrixWorldInverse.toArray(),
        projectionMatrix:camera.projectionMatrix.toArray(),near:camera.near,far:camera.far}:null,
      viewport:{width:viewport.width||1,height:viewport.height||1,pixelRatio:viewport.pixelRatio||1},
      anchors:{muzzle:m?{x:m.x,y:m.y,z:m.z}:null,muzzleQuaternion:q?.toArray?.()||(Array.isArray(q)?[...q]:null),
        torchTip:p.tool==='torch'&&m?{x:m.x,y:m.y,z:m.z}:null},
      cells:copy(snapshot.cells),discharge:copy(snapshot.discharge),torch:copy(p.torch),events:copy(snapshot.events),
      eventReceipts:{generation,primed:true,highestId:finite(highestId)?highestId:null,events:fresh,reset:restarted},
      fieldUniforms:borrowed,buildingVisuals:copy(buildingVisuals),opaqueDepth:null};
  }
  return {update,reset};
}
