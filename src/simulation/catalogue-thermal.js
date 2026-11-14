import {createTrial,ambientWind} from '../../workbenches/furnished-house/simulation.js';
import {createNavigation} from '../../workbenches/furnished-house/navigation.js';
import {extrudePlane,segmentTriangle} from '../../workbenches/furnished-house/geometry.js';
import {sweptCylinderClear} from '../runtime/collision.js';
import {createVisibility} from '../../workbenches/bell-and-alder-closing/visibility.js';
import {ventSmokeSignals,createVentSmokeSampler,visibleSmoke,SMOKE_PERCEPTION} from '../../workbenches/bell-and-alder-closing/smoke.js';
const EPS=1e-8,clamp=n=>Math.max(0,Math.min(1,n));
const xyz=(p,height=p.h??p.elevation??0)=>[p.x,height,p.y];
const collections=['boundaries','supports','items','parts','falls','rubble','fireSamples','occupancy','events','tombstones'];

// One physical provider, with no player, input, inventory, NPC or real-time loop.
// The caller's worldDelta is the only source of simulation time.
export function createCatalogueThermal({compiled,state,definition,config,event}){
  const trial=createTrial(compiled.data,{executionCache:compiled.executionCache!==false,wind:ambientWind,windMetadata:{kind:'ambient-control',speed:1.5,direction:[1,0,0],obstacleResolved:false}}),nativeStep=trial.rules.step;
  const visibility=createVisibility(trial,{partTrace:tracePart}),newIgnitions=[],residentSpec=compiled.data.catalogueModules.resident,residentState={state:'routine',routeIndex:0,holdUntil:null,smokeSince:null,lookSince:null,exitIndex:0,blocked:null};let smokeTick=-1,smokeSignals=[];
  const sampleSmoke=compiled.executionCache===false?()=>ventSmokeSignals(trial,visibility):createVentSmokeSampler(trial,visibility);
  const instances=compiled.instances.map(i=>i.id),owners=new Map(),navs=new Map(),deposits=new Map(),doors=compiled.data.catalogueModules.doors,lantern=compiled.data.catalogueModules.lantern?{...structuredClone(compiled.data.catalogueModules.lantern),phase:'placed',ownerId:null}:null;
  const heatReceipts=new Map(),ignitionReceipts=new Map(),renderGeometry=new Map((compiled.data.render?.geometry||[]).map(g=>[g.id,g]));
  const hostBoundaryUpdates=new Map();
  const partTriangles=new Map();
  function tracePart(part,a,b){
    const geometry=renderGeometry.get(part.sourceMeshBinding);if(!geometry?.triangles.length)return undefined;
    let triangles=partTriangles.get(part.id);if(!triangles){triangles=geometry.triangles.map(t=>t.vertices.map(v=>v.slice(0,3)));partTriangles.set(part.id,triangles);}
    const item=trial.scene.items.get(part.itemId),offset=item.position.map((v,i)=>v-item.initialPosition[i]),from=a.map((v,i)=>v-offset[i]),to=b.map((v,i)=>v-offset[i]);let nearest=null;
    for(const triangle of triangles){const t=segmentTriangle(from,to,triangle);if(t!==null&&t>1e-7&&(nearest===null||t<nearest))nearest=t;}return nearest;
  }
  // Registration is immutable; the borrowed boundary objects themselves carry
  // every subsequent pose/open/retired state. Do not rescan the street per door.
  const doorPatches=new Map(doors.map(d=>[d.id,[]]));
  for(const b of trial.scene.index.surfaces.values())for(const d of doors)if(d.openingIds.includes(b.openingId))doorPatches.get(d.id).push(b);
  let residual=0,cursor=0,cachedFrame=null,frameHostTick=-1,disposed=false,rasterTick=-1,rasterCache=null,knownFuels=[],rasterIndexRevision=-1,rasterFalling=0,previousActive=[];
  const bornCells=new Set();
  const stats={pouredFuel:0,fixtureFuel:0,molotovFuel:0,burnedDepositedFuel:0,burnedSurfaceFuel:0};
  const publishedStats={remainingDepositedFuel:0,burningCells:0,frontX:0};
  const size=definition.fireCellSize;
  const now=()=>performance.now(),timing={nativeSteps:0,nativeSimulationMs:0,physicalPublicationMs:0,rasterPublicationMs:0,diagnosticsMs:0};
  const hostWork={hostSteps:0,nativeSteps:0,nativeSimulationMs:0,backendAdvanceMs:0,metricsQueriesMs:0,looseFuelQueriesMs:0,physicalPublicationMs:0,rasterPublicationMs:0,diagnosticsMs:0,smokeSignalCalls:0,smokeSignalsMs:0,smokeSightMs:0,navigationMs:0};
  const named=id=>typeof id==='string'?instances.find(i=>id.startsWith(i+'::')||id.includes(':'+i+'::')):null;
  const supportOwner=p=>{const hit=trial.scene.index.supportAt(p[0],p[2],p[1]+.05,-10);return named(hit?.surface.sourceSurfaceId)||'terrain';};
  const query=p=>trial.scene.cells.get(trial.scene.key(trial.scene.coords(p)));
  function proxy(c,p){const fuels=c?.fuels||[],lit=fuels.some(f=>f.lit&&f.amount>EPS),remaining=fuels.reduce((v,f)=>v+f.amount,0);return {id:c?.id||trial.scene.key(trial.scene.coords(p)),publicId:c?.id,x:p[0],y:p[2],h:p[1],size,material:fuels.some(f=>f.cls==='grass')?'grass':remaining?'wood':'paving',surfaceFuel:remaining,depositedFuel:0,heat:c?.heat||0,get phase(){return fuels.some(f=>f.lit&&f.amount>EPS)?'burning':c?.heat>0?'heating':'cold';},intensity:lit?1:0};}
  function at(p){const position=xyz(p,p.h??(p.elevation??0)+.01);return proxy(query(position),position);}
  function trace(from,to){const a=Array.isArray(from)?from:xyz(from),b=Array.isArray(to)?to:xyz(to);let hit=trial.scene.index.crossings(a,b).find(h=>h.t>1e-7&&trial.scene.index.pass(h.surface)<.99);
    for(const part of trial.scene.parts.values()){const item=trial.scene.items.get(part.itemId);if(!part.intact||!part.solid||!item?.intact||item.falling||!part.bounds)continue;const offset=item.position.map((v,i)=>v-item.initialPosition[i]);let entry=0,exit=1;for(let i=0;i<3;i++){const lo=part.bounds.min[i]+offset[i],hi=part.bounds.max[i]+offset[i],d=b[i]-a[i];if(Math.abs(d)<1e-12){if(a[i]<lo||a[i]>hi){exit=-1;break;}}else{const u=(lo-a[i])/d,v=(hi-a[i])/d;entry=Math.max(entry,Math.min(u,v));exit=Math.min(exit,Math.max(u,v));}}if(exit<entry||exit<=1e-7||entry<1e-7||entry>(hit?.t??1))continue;const precise=tracePart(part,a,b);if(precise===null)continue;if(precise!==undefined)entry=precise;if(entry>(hit?.t??1))continue;hit={t:entry,surface:{id:part.id,sourceSurfaceId:part.id,material:part.material,kind:'furniture-part'}};}
    return hit?{...hit,position:a.map((v,i)=>v+(b[i]-v)*hit.t),ownerInstanceId:named(hit.surface.sourceSurfaceId)||'terrain'}:null;}
  function heat(position,energy,tool,from,onHeat){
    if(!(energy>0))return [];
    const contact=from?trace(from,position):null,actual=contact?from.map((v,i)=>v+(position[i]-v)*Math.max(0,contact.t-1e-5)):position,c=trial.scene.cellAt(actual),site=proxy(c,actual);
    const support=!contact&&trial.scene.index.supportAt(actual[0],actual[2],actual[1]+.03,actual[1]-.035),receiver=contact?.surface||support?.surface;
    const receiverId=receiver?.fuelId||trial.scene.parts.get(receiver?.id)?.fuelId,point=contact?.position||actual;
    const fire={x:actual[0],y:actual[2],height:actual[1]},command=trial.command({type:tool==='matches'?'match':tool==='flamethrower'?'flame':'heat',position:actual,energy,from});
    if(onHeat&&receiverId)heatReceipts.set(command.sequence,{tool,receiverId,receiverSurfaceId:receiver.id,contact:[...point],visiblePoint:fire,observe:onHeat.capture?.(fire)||onHeat,hostTick:state.tick,hostWorldTime:state.clocks.world,commandSequence:command.sequence,nativeTick:command.tick});
    cachedFrame=null;return [site];
  }
  function heatTool(tool,player,target,spec,onHeat){
    const from=xyz(player,(player.elevation||0)+.9),requested=xyz(target,target.h??(player.elevation||0)+.015),delta=requested.map((v,i)=>v-from[i]),distance=Math.hypot(...delta);
    // Existing range is horizontal ground reach. Bound its full slant from
    // the same hand/ground heights, so a picked roof cannot extend that reach.
    const reach=Math.hypot(spec.range,.9-.015),limited=distance>reach+EPS,to=limited?from.map((v,i)=>v+delta[i]*reach/distance):requested,hit=trace(from,to),actual=hit?hit.position:to;
    if(limited&&!hit)return {point:{x:to[0],y:to[2],h:to[1]},cells:[],result:'range',nativeTick:trial.tick+1};
    const energy=tool==='matches'?trial.rules.matchEnergy:spec.heat,cells=heat(to,energy,tool,from,onHeat);
    return {point:{x:actual[0],y:actual[2],h:actual[1]},dischargePoint:{x:actual[0],y:actual[2],h:actual[1]},cells,result:'heated',nativeTick:trial.tick+1};
  }
  function move(...args){const before=now();try{return moveNative(...args);}finally{hostWork.navigationMs+=now()-before;}}
  function moveNative(start,dx,dz,radius,height){
    const id=start.id||'player';let nav=navs.get(id);if(!nav){nav=createNavigation(trial,{radius,height,maxStep:.22,start:xyz(start),slide:true});navs.set(id,nav);}nav.setPosition(xyz(start));
    const path=[{x:start.x,y:start.y,elevation:start.elevation||0,ownerInstanceId:start.moduleOwner,surfaceId:start.surfaceId}],length=Math.hypot(dx,dz);
    if(length<EPS)return path;
    const steps=Math.max(1,Math.ceil(length/.025));
    for(let i=0;i<steps;i++){
      const before=nav.snapshot(),next=nav.move(dx/length,dz/length,length/steps/9);
      if(next.x<radius||next.y<radius||next.x>definition.width-radius||next.y>definition.height-radius){nav.setPosition(before.position);break;}
      if(Math.hypot(next.x-before.x,next.y-before.y)<EPS)break;
      const support=nav.support(next.position,next.elevation);path.push({x:next.x,y:next.y,elevation:next.elevation,ownerInstanceId:named(support?.id)||'terrain',surfaceId:support?.id});
    }
    return path;
  }
  function rows(){return doors.map(d=>{const patches=doorPatches.get(d.id);return {...d,open:patches.every(b=>!b.intact||b.openFraction>.5),intact:patches.some(b=>b.intact)};});}
  function reachable(p,ignore=[],actor=state.player){const from=xyz(actor,(actor.elevation||0)+.9);return actor.hp>0&&Math.hypot(...p.map((v,i)=>v-from[i]))<=1.65&&!visibility.blocked({x:from[0],h:from[1],y:from[2]},{x:p[0],h:p[1],y:p[2]},{ignoreSources:ignore});}
  function leaves(d,open){return doorPatches.get(d.id).filter(b=>b.intact&&b.actualDoorPose).map(b=>{const angle=(b.opening.maxOpenAngle||Math.PI/2)*(open?1:0),c=Math.cos(angle),s=Math.sin(angle),pivot=b.opening.pivot,rotate=p=>{const x=p[0]-pivot[0],z=p[2]-pivot[2];return [pivot[0]+c*x+s*z,p[1],pivot[2]-s*x+c*z];},n=b.closedNormal,normal=[n[0]*c+n[2]*s,n[1],-n[0]*s+n[2]*c];return {triangles:extrudePlane(b.closedTriangles.map(t=>t.map(rotate)),normal,-(b.thickness||.12)/2,(b.thickness||.12)/2),closed:true};});}
  function occupied(d,open){const proposed=leaves(d,open);return [state.player,...state.actors].some(a=>a.hp>0&&proposed.some(shape=>!sweptCylinderClear(a,a,a.radius??.2,(a.elevation||0)+.025,(a.elevation||0)+(a.height||1.66),shape)));}
  const doorSources=d=>doorPatches.get(d.id).map(b=>b.sourceSurfaceId);
  function lanternSupported(){if(!lantern)return false;const item=trial.scene.items.get(lantern.supportItemId||lantern.supportSourceId);return item?.intact!==false&&!item?.falling;}
  function interaction(){
    if(state.player.hp<=0||state.player.lanternAim)return null;
    for(const d of rows().sort((a,b)=>Math.hypot(a.position[0]-state.player.x,a.position[2]-state.player.y)-Math.hypot(b.position[0]-state.player.x,b.position[2]-state.player.y)))if(d.intact&&reachable(d.position,doorSources(d))){const reason=state.paused?'Paused.':occupied(d,!d.open)?'Move clear of the door.':'';return {id:d.id,kind:'door',action:d.open?'close':'open',label:(d.open?'Close ':'Open ')+d.label,enabled:!reason,reason,anchor:d.position.map((v,i)=>v+(i===1?1:0))};}
    if(lantern?.phase==='placed'&&lanternSupported()&&reachable(lantern.position,[lantern.supportSourceId]))return {id:lantern.id,kind:'lantern',action:'take',label:'Take lantern',enabled:!state.paused,reason:state.paused?'Paused.':'',anchor:lantern.position.map((v,i)=>v+(i===1?.6:0))};return null;
  }
  const shop={interaction,carriesLantern:()=>lantern?.phase==='carried',accepts(command){return Object.hasOwn(command,'portalId')?!Object.hasOwn(command,'objectId')&&doors.some(d=>d.id===command.portalId)&&['open','close'].includes(command.action):command.objectId===lantern?.id&&command.action==='take';},interact(command){const target=interaction();if(!target?.enabled||target.id!==(command.portalId??command.objectId)||target.action!==command.action)return;
    if(target.kind==='door'){const d=doors.find(d=>d.id===target.id);for(const id of d.openingIds)trial.command({type:'opening',id,open:command.action==='open'});event('portal-state',state.player,{portalId:d.id,open:command.action==='open',backend:'catalogue-trial',nativeTick:trial.tick+1});}
    else{lantern.phase='carried';lantern.ownerId=state.player.id;event('lantern-taken',state.player,{objectId:lantern.id,actorId:state.player.id});}cachedFrame=null;},snapshot:()=>({moduleOwned:true,lantern:lantern?structuredClone(lantern):null,doors:rows()})};
  function refreshOwners(){if(knownFuels.length===trial.scene.fuels.size)return;const all=[...trial.scene.fuels.values()];for(let i=knownFuels.length;i<all.length;i++){const f=all[i],parent=f.id.replace(/:spill:.*$|:embers$/, '');if(!owners.has(f.id))owners.set(f.id,owners.get(parent)||named(f.sourceSurfaceId)||named(f.itemId)||named(f.id)||supportOwner(f.position));for(const c of f.cells)bornCells.add(c.id);}knownFuels=all;}
  function physicalFrame(){
    if(cachedFrame&&frameHostTick===state.tick)return cachedFrame;const before=now();refreshOwners();const frame=trial.frame();
    // The host owns explosive-barrel retirement between native steps. Publish
    // the same live inert boundary state even before the next thermal tick.
    for(const b of hostBoundaryUpdates.values())if(!frame.boundaries.some(row=>row.id===b.id))frame.boundaries.push({id:b.id,sourceSurfaceId:b.sourceSurfaceId,kind:b.kind,triangles:b.triangles,intact:b.intact,openFraction:b.openFraction,charFraction:0,heatFraction:0,fuelFraction:1});hostBoundaryUpdates.clear();
    const owner=r=>owners.get(r.id)||named(r.sourceSurfaceId)||named(r.itemId)||named(r.originalSourceSurfaceId)||(r.fuelIds||[]).map(id=>owners.get(id)||named(id)).find(Boolean)||named(r.supportBoundaryId)||'terrain';
    for(const key of collections)frame[key]=(frame[key]||[]).map(r=>{const ownerInstanceId=owner(r);owners.set(r.id,ownerInstanceId);return {...r,ownerInstanceId,...(key==='fireSamples'?{buildingId:ownerInstanceId}:{})};});
    frame.catalogueModules={version:1,generation:state.generation,representation:compiled.representation,instances:compiled.data.catalogueModules.instances,lantern:lantern?structuredClone(lantern):null,actors:[state.player,...state.actors].map(a=>({id:a.id,characterId:a.characterId||a.species,position:xyz(a),heading:a.heading,radius:a.radius,height:a.height||1.66})),hostTick:state.tick,hostWorldTime:state.clocks.world,nativeTick:trial.tick,nativeWorldTime:trial.worldTime,residual};cachedFrame=frame;frameHostTick=state.tick;timing.physicalPublicationMs=now()-before;hostWork.physicalPublicationMs+=timing.physicalPublicationMs;return frame;
  }
  const rasterPoints=[];for(let z=size/2;z<definition.height;z+=size)for(let x=size/2;x<definition.width;x+=size)rasterPoints.push({x,y:z,h:.01,key:trial.scene.key(trial.scene.coords([x,.01,z]))});
  const rasterIndices=new Map();for(let i=0;i<rasterPoints.length;i++){const key=rasterPoints[i].key;if(!rasterIndices.has(key))rasterIndices.set(key,[]);rasterIndices.get(key).push(i);}
  function raster(){
    if(rasterTick===trial.tick&&rasterCache){timing.rasterPublicationMs=0;return rasterCache;}
    const before=now(),active=trial.activeCellIds(),falling=trial.metrics().fallingCount;refreshOwners();
    const all=!rasterCache||compiled.executionCache===false||rasterIndexRevision!==trial.scene.index.revision||falling||rasterFalling;
    const indices=all?rasterPoints.map((_,i)=>i):[...new Set([...active,...previousActive,...bornCells].flatMap(id=>rasterIndices.get(id)||[]))].sort((a,b)=>a-b),result=rasterCache?[...rasterCache]:[];let changed=!rasterCache;
    for(const i of indices){
      const p=rasterPoints[i],cell=trial.scene.cells.get(p.key);let surfaceFuel=0,depositedFuel=0,remaining=0,grass=false,lit=false;
      for(const f of cell?.fuels||[]){remaining+=f.amount;grass||=f.cls==='grass';const onGround=f.sourceSurfaceId?.startsWith('terrain::')||(f.loose||f.spill)&&owners.get(f.id)==='terrain'&&(f.supportBoundaryId==='terrain:ground'||f.supportBoundaryId?.startsWith('terrain::'));
        if(onGround){if(f.cls==='oil'&&(f.loose||f.spill))depositedFuel+=f.amount;else surfaceFuel+=f.amount;lit||=f.lit&&f.amount>EPS;}}
      const heat=cell?.heat||0,material=grass?'grass':remaining?'wood':'paving',phase=lit?'burning':heat>0?'heating':'cold',old=rasterCache?.[i];
      if(old&&old.heat===heat&&old.surfaceFuel===surfaceFuel&&old.depositedFuel===depositedFuel&&old.material===material&&old.phase===phase)continue;
      changed=true;result[i]=Object.freeze({id:cell?.id||p.key,publicId:cell?.id,x:p.x,y:p.y,h:p.h,size,material,surfaceFuel,depositedFuel,heat,phase,intensity:lit?1:0});
    }
    rasterTick=trial.tick;rasterIndexRevision=trial.scene.index.revision;rasterFalling=falling;previousActive=active;bornCells.clear();if(changed)rasterCache=Object.freeze(result);timing.rasterPublicationMs=now()-before;hostWork.rasterPublicationMs+=timing.rasterPublicationMs;return rasterCache;
  }
  function flushDeposits(){for(const {position,amount}of deposits.values()){const command=trial.command({type:'deposit',position,amount});owners.set('deposit:'+command.sequence,supportOwner(position));}deposits.clear();}
  function step(...args){const before=now();try{return nativeAdvance(...args);}finally{hostWork.backendAdvanceMs+=now()-before;}}
  function nativeAdvance(delta,time){residual+=delta;hostWork.hostSteps++;timing.nativeSteps=0;timing.nativeSimulationMs=0;while(residual+1e-10>=nativeStep){flushDeposits();const before=now();trial.step();const elapsed=now()-before;timing.nativeSimulationMs+=elapsed;hostWork.nativeSimulationMs+=elapsed;hostWork.nativeSteps++;timing.nativeSteps++;residual=Math.max(0,residual-nativeStep);}cachedFrame=null;
    for(const e of trial.events.slice(cursor)){const {id,type,tick,...details}=e,position=e.position||[0,0,0];if(type==='ignition'){newIgnitions.push(e);const receipt=heatReceipts.get(e.inputProof?.commandSequence);if(receipt&&receipt.nativeTick===tick)ignitionReceipts.set(id,receipt);}event('thermal-'+type,{x:position[0],y:position[2]},{...details,backend:'catalogue-trial',nativeEventId:id,nativeTick:tick,nativeWorldTime:e.time,hostWorldTime:time});}cursor=trial.events.length;
    for(const [id,receipt]of heatReceipts)if(receipt.nativeTick<=trial.tick)heatReceipts.delete(id);
    if(lantern?.phase==='placed'&&!lanternSupported())lantern.phase='spent';if(lantern?.phase==='carried')lantern.position=xyz(state.player,(state.player.elevation||0)+.9);
    const metricsStart=now(),metrics=trial.metrics();hostWork.metricsQueriesMs+=now()-metricsStart;publishedStats.burningCells=metrics.burningCount;const looseStart=now();publishedStats.remainingDepositedFuel=trial.looseFuelAmount()+[...deposits.values()].reduce((n,d)=>n+d.amount,0);hostWork.looseFuelQueriesMs+=now()-looseStart;stats.burnedSurfaceFuel=metrics.fuel.burned;timing.nativePhases=trial.executionTimings();
  }
  function candidates(p,radius){const result=[],h=p.h??(p.elevation??0)+.1,lo=trial.scene.coords([p.x-radius,h-trial.scene.pitch[1],p.y-radius]),hi=trial.scene.coords([p.x+radius,h+trial.scene.pitch[1],p.y+radius]);for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++){const c=trial.scene.cells.get(trial.scene.key([x,y,z]));if(c&&Math.hypot(c.position[0]-p.x,c.position[2]-p.y)<=radius+size*.71)result.push(proxy(c,c.position));}return result;}
  function addLine(a,b,rate,stock){const length=Math.hypot(b.x-a.x,b.y-a.y),amount=Math.min(stock,length*rate);if(amount>EPS){const position=xyz(b,(b.elevation??state.player.elevation??0)+.006),support=trial.scene.index.supportAt(position[0],position[2],position[1]+.02,position[1]-.25);if(!support)return 0;const key=trial.scene.key(trial.scene.coords(position))+'|'+support.surface.id,record=deposits.get(key);if(record){record.amount+=amount;record.position=position;}else deposits.set(key,{position,amount});stats.pouredFuel+=amount;}return amount;}
  function cone(origin,heading,range,halfAngle,energy,cause,onHeat,discharge){const rays=discharge?.rays||Array.from({length:25},(_,i)=>({angle:heading-halfAngle+2*halfAngle*i/24,distance:range}));if(!rays.length)return;const from=xyz(origin,(state.player.elevation||0)+config.tools.presentationHeight);for(const ray of rays){const to=[from[0]+Math.cos(ray.angle)*Math.min(range,ray.distance+.001),from[1],from[2]+Math.sin(ray.angle)*Math.min(range,ray.distance+.001)];heat(to,energy/rays.length,'flamethrower',from,onHeat);}}
  function emit(point,radius,energy,cause,{wallsProtect=true,onHeat}={}){const from=xyz(point,point.h??.4),count=24;for(let i=0;i<count;i++){const angle=i*2*Math.PI/count,to=[from[0]+Math.cos(angle)*radius,from[1],from[2]+Math.sin(angle)*radius];heat(to,energy/count,cause,wallsProtect?from:null,onHeat);}}
  function exposure(p){let heat=0,lit=false;for(const offset of [.1,.5,Math.max(.5,(p.height||1.66)*.8)]){const c=query(xyz(p,(p.elevation||0)+offset));heat=Math.max(heat,c?.heat||0);lit||=c?.fuels.some(f=>f.lit&&f.amount>EPS)||false;}return Math.max(lit?1:0,clamp((heat-config.fire.damageHeatStart)/config.fire.damageHeatSpan));}
  function retireObstacle(id){for(const b of trial.scene.index.surfaces.values())if(b.hostObstacleId===id){if(b.fuelId)throw Error('Host obstacle retirement is restricted to registered inert bodies');trial.scene.index.change(b.id,{intact:false,openFraction:1});hostBoundaryUpdates.set(b.id,b);}cachedFrame=null;}
  function impactLantern(position,projectile){const from=xyz(position,position.h),command=trial.command({type:'lantern',from,velocity:[0,0,0]});owners.set('lantern:'+command.sequence,supportOwner(from));stats.molotovFuel+=.5;event('native-payload-release',position,{projectileId:projectile.id,nativeCommandSequence:command.sequence,fuel:.5,backend:'catalogue-trial'});}
  function surfacePoints(f,observer){
    const b=trial.scene.index.surfaces.get(f.boundaryId),part=trial.scene.parts.get(f.coreFuelId||f.id),item=part&&trial.scene.items.get(part.itemId),offset=item?item.position.map((v,i)=>v-item.initialPosition[i]):[0,0,0];
    const triangles=b?.solidTriangles||b?.triangles||f.floorFootprint||renderGeometry.get(part?.sourceMeshBinding)?.triangles.map(t=>t.vertices.map(v=>v.slice(0,3).map((n,i)=>n+offset[i])))||[];
    return triangles.map(t=>{const p=[0,1,2].map(i=>(t[0][i]+t[1][i]+t[2][i])/3),toward=[observer.x-p[0],(observer.elevation||0)+observer.height*.85-p[1],observer.y-p[2]],length=Math.hypot(...toward)||1;return {x:p[0]+toward[0]/length*.001,y:p[2]+toward[2]/length*.001,height:p[1]+toward[1]/length*.001};});
  }
  function reportIgnitions(witness){for(const e of newIgnitions.splice(0)){
    const fuel=trial.scene.fuels.get(e.fuelId),receipt=ignitionReceipts.get(e.id);ignitionReceipts.delete(e.id);if(!fuel)continue;
    const site={get phase(){return fuel.lit&&fuel.amount>EPS?'burning':'cold';}};
    if(e.inputProof?.independent&&receipt&&(e.fuelId===receipt.receiverId||fuel.coreFuelId===receipt.receiverId)){
      const proof={...e.inputProof,nativeEventId:e.id,nativeTime:e.time,hostTick:receipt.hostTick,hostWorldTime:receipt.hostWorldTime,receiverId:receipt.receiverId,receiverSurfaceId:receipt.receiverSurfaceId,fuelId:e.fuelId,contact:receipt.contact,observation:receipt.observe.observation};
      const contactSite={...receipt.visiblePoint,fireHeight:receipt.visiblePoint.height,phase:'cold',heat:proof.energy/proof.capacity,surfaceFuel:fuel.amount,depositedFuel:0,nativeProof:proof};
      receipt.observe(contactSite,0);contactSite.phase='burning';
      witness.confirmIgnition({...receipt.visiblePoint,fireHeight:receipt.visiblePoint.height,cause:receipt.tool},contactSite,{independent:true,required:proof.threshold,incoming:0});
      event('native-ignition-proof',{x:receipt.visiblePoint.x,y:receipt.visiblePoint.y},{...proof,tool:receipt.tool,backend:'catalogue-trial'});
    }
    witness.observeFire(site,{x:e.position[0],y:e.position[2],height:e.position[1],points:observer=>surfacePoints(fuel,observer)});
  }}
  function residentStep(actor,delta){
    if(!residentSpec||actor.hp<=0){actor.moving=false;return;}
    const time=state.clocks.world,anchors=residentSpec.anchors;
    const walk=(position,speed)=>{const dx=position[0]-actor.x,dz=position[2]-actor.y,d=Math.hypot(dx,dz);if(d<.035&&Math.abs(position[1]-actor.elevation)<.25){actor.moving=false;return true;}const amount=Math.min(d,speed*delta),path=move(actor,dx/(d||1)*amount,dz/(d||1)*amount,actor.radius,actor.height),last=path.at(-1),walked=path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i].x,p.y-path[i].y),0);actor.moving=walked>EPS;if(actor.moving){actor.x=last.x;actor.y=last.y;actor.elevation=last.elevation;actor.heading=Math.atan2(dz,dx);actor.travelled+=walked;residentState.blocked=null;}else{const block=navs.get(actor.id)?.snapshot().lastBlock;if(block&&residentState.blocked?.id!==block.id){residentState.blocked=block;event('route-blocked',actor,{actorId:actor.id,reason:block.reason,details:block});}}return false;};
    if(smokeTick!==trial.tick){smokeTick=trial.tick;const before=now();smokeSignals=sampleSmoke();hostWork.smokeSignalsMs+=now()-before;hostWork.smokeSignalCalls++;}const sightStart=now(),signal=visibleSmoke(trial,actor,visibility,smokeSignals);hostWork.smokeSightMs+=now()-sightStart;
    if(signal){residentState.smokeSince??=time;if(time-residentState.smokeSince>=SMOKE_PERCEPTION.sustain&&residentState.state==='routine'){residentState.state='looking';residentState.lookSince=time;event('smoke-noticed',actor,{actorId:actor.id,evidence:signal});}}else residentState.smokeSince=null;
    actor.state=residentState.state;
    if(residentState.state==='routine'){
      const route=residentSpec.routine||[],item=route[residentState.routeIndex%route.length];if(!item)return;if(!walk(anchors[item.anchor].position,1.1))return;
      if(residentState.holdUntil===null){if(item.door){const door=rows().find(d=>d.physicalId===item.door.id||d.id===item.door.id);if(door&&door.open!==item.door.open){if(!reachable(door.position,doorSources(door),actor)||occupied(door,item.door.open)){event('route-blocked',actor,{actorId:actor.id,reason:'Door reach or occupied leaf'});return;}for(const id of door.openingIds)trial.command({type:'opening',id,open:item.door.open});event('portal-state',actor,{portalId:door.id,open:item.door.open,actorId:actor.id});}}residentState.holdUntil=time+(item.hold||0);if(Number.isFinite(item.heading))actor.heading=item.heading;}
      if(time>=residentState.holdUntil){residentState.routeIndex=(residentState.routeIndex+1)%route.length;residentState.holdUntil=null;}return;
    }
    if(residentState.state==='looking'){const target=anchors[residentSpec.viewAnchor];if(target&&!walk(target.position,1.1))return;if(signal?.strength>=.3&&time-residentState.lookSince>=1.2){residentState.state='escaping';event('resident-exit',actor,{actorId:actor.id,reason:'Sustained visible smoke'});}return;}
    if(residentState.state==='escaping'){const id=residentSpec.exitRoute?.[residentState.exitIndex];if(!id){residentState.state='safe';actor.moving=false;event('resident-safe',actor,{actorId:actor.id});return;}if(walk(anchors[id].position,1.4))residentState.exitIndex++;}
  }
  function sourceAudit(){const rows=new Map();for(const f of trial.scene.fuels.values()){const b=f.boundaryId?trial.scene.index.surfaces.get(f.boundaryId):null,part=trial.scene.parts.get(f.id)||trial.scene.parts.get(f.id.replace(/:finish$/,'')),material=b?.material||part?.material||f.cls,owner=named(f.sourceSurfaceId)||named(f.itemId)||named(f.id)||owners.get(f.id)||'terrain',key=owner+'|'+material+'|'+f.cls;let row=rows.get(key);if(!row){row={instanceId:owner,material,fuelClass:f.cls,fuels:0,area:0,initialFuel:0,remainingFuel:0,potentialEnergy:0,cells:new Set()};rows.set(key,row);}row.fuels++;row.area+=f.area||0;row.initialFuel+=f.initial;row.remainingFuel+=f.amount;row.potentialEnergy+=f.initial*trial.scene.profile[f.cls].energy;for(const c of f.cells)row.cells.add(c);}
    return {representation:compiled.representation,grid:{origin:trial.scene.origin,pitch:trial.scene.pitch,cells:trial.scene.cells.size,totalCapacity:[...trial.scene.cells.values()].reduce((n,c)=>n+c.capacity,0)},groups:[...rows.values()].map(({cells,...row})=>({...row,occupiedCells:cells.size,occupiedCapacity:[...cells].reduce((n,c)=>n+c.capacity,0)})),capacityNote:'Per-group occupied capacity overlaps between materials/instances and is not additive; totalCapacity counts each allocated physical grid cell once.',sourceConversions:compiled.instances.filter(i=>i.data.sourceRepresentation).map(i=>({id:i.id,...i.data.sourceRepresentation}))};
  }
  return {trial,compiled,def:definition,size,stats,publishedStats,cells:[],shop,at,trace,move,heatTool,cone,emit,step,addLine,candidates,exposure,physicalFrame,impactLantern,retireObstacle,
    reportIgnitions,residentStep,sourceAudit,get revision(){return trial.scene.index.revision;},lineClear(a,b,options={}){const from=xyz(a,a.h??(a.elevation||0)+.9),to=xyz(b,b.h??(b.elevation||0)+.9),ignoreSources=[...(options.ignoreSources||[])];if(options.ignoreObstacleIds)for(const surface of trial.scene.index.surfaces.values())if(options.ignoreObstacleIds.includes(surface.hostObstacleId))ignoreSources.push(surface.sourceSurfaceId);return !visibility.blocked({x:from[0],h:from[1],y:from[2]},{x:to[0],h:to[1],y:to[2]},{...options,ignoreSources});},
    snapshot:raster,tileAt:p=>({x:Math.floor(p.x),y:Math.floor(p.y),width:1,depth:1}),heatIndex(p,radius){const list=candidates(p,radius);return clamp(list.reduce((n,c)=>n+c.heat,0)/(list.length||1)/trial.rules.maxHeat);},
    diagnostics:()=>{const before=now(),{unresolvedIds,...support}=trial.supportGraph.diagnostics(),value={backend:'catalogue-trial',representation:compiled.representation,nativeTick:trial.tick,nativeWorldTime:trial.worldTime,residual,pendingDepositedFuel:[...deposits.values()].reduce((n,d)=>n+d.amount,0),metrics:trial.metrics(),support,navigation:Object.fromEntries([...navs].map(([id,nav])=>[id,nav.snapshot().lastBlock])),resident:{...residentState},instances,wind:trial.windMetadata,profiles:trial.scene.profile,inputProfiles:{matches:trial.rules.matchEnergy,torch:config.tools.torch.heat,flamethrowerEnergyPerSecond:config.tools.flamethrower.heatPerSecond,lanternPayload:.5,gasPerMetre:config.fuel.gasPerMetre}};timing.diagnosticsMs=now()-before;hostWork.diagnosticsMs+=timing.diagnosticsMs;return {...value,timing:{...timing,hostWork:{...hostWork}}};},
    dispose(){if(disposed)return;disposed=true;trial.dispose();navs.clear();owners.clear();deposits.clear();heatReceipts.clear();ignitionReceipts.clear();partTriangles.clear();hostBoundaryUpdates.clear();cachedFrame=null;rasterCache=null;}
  };
}
