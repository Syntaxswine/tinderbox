import {createTrial,ambientWind} from '../furnished-house/simulation.js';
import {createNavigation} from '../furnished-house/navigation.js';
import {validateClosingData,validateClosingGeometry} from './schema.js';
import {createVisibility} from './visibility.js';
import {visibleSmoke,ventSmokeSignals,SMOKE_PERCEPTION} from './smoke.js';
import {createShopWitness} from '../../src/simulation/shop-witness.js';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {CIVILIAN_PROFILES,CHICAGO_PATROL} from '../../src/content/exterior-kit.js';
import {movementVector} from '../../src/simulation/geometry.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {sweptCylinderClear} from '../../src/runtime/collision.js';
import {extrudePlane} from '../furnished-house/geometry.js';
import {pickupContacts} from '../../src/simulation/pickups.js';
import {adjustLanternAim} from '../../src/simulation/lantern.js';
const DT=1/30,EPS=1e-7,TOOLS=['matches','torch','flamethrower','jerry-can','molotov'];
export function createClosingRuntime(input,{seed=1893,characterId='goat'}={}){
  if(!CHARACTER_PROFILES[characterId])throw Error('Choose an approved native goat, horse or bear');
  const data=validateClosingData(input),c=data.closingTime,anchors=c.anchors;let trial,actors,player,resident,officer,witness,visibility,lantern,events,sequence,generation=0,queue,commands,sites,contacts,thermalCursor,paused=false,disposed=false,inputMove={x:0,y:0},primary=false,aim=null,replay={id:'manual',seed,stage:0,speed:1},residentState,geometryChecks;
  let activeTime=0,playerTime=0,accumulator=0,effects,pickups,rawMove=null,moveNeedsNeutral=false,throws,smokeTick=-1,smokeSignals=[];
  const currentSmoke=()=>{const key=trial.tick+':'+trial.scene.index.revision;if(smokeTick!==key){smokeSignals=ventSmokeSignals(trial,visibility);smokeTick=key;}return smokeSignals;};
  const scales=()=>({world:effects.powder>activeTime?DEFAULT_CONFIG.drugs.worldScale:1,player:effects.powder>activeTime?DEFAULT_CONFIG.drugs.playerScale:1});
  const emit=(type,actor=player,details={})=>{const p=actor?.position||[actor?.x||0,actor?.elevation||0,actor?.y||0],event={id:`closing:${generation}:${++sequence}`,tick:trial.tick,worldTime:trial.worldTime,type,actorId:actor?.id,position:[...p],...details};events.push(event);return event;};
  const sync=a=>{const s=a.nav.snapshot();Object.assign(a,{position:s.position,x:s.x,y:s.y,elevation:s.elevation,travelled:s.travelled,moving:s.moving,lastBlock:s.lastBlock});if(s.moving)a.heading=s.heading;};
  function initialize(){trial?.dispose();generation++;sequence=0;events=[];commands=[];queue=[];sites=new Map();contacts=new Map();thermalCursor=0;inputMove={x:0,y:0};primary=false;aim=null;paused=false;replay={id:'manual',seed,stage:0,speed:1};
    activeTime=0;playerTime=0;accumulator=0;rawMove=null;moveNeedsNeutral=false;throws=new Map();smokeTick=-1;smokeSignals=[];effects={powder:0,inversion:0};pickups=(c.pickups||[]).map(p=>({...p,x:p.position[0],y:p.position[2],radius:p.radius||.22,consumed:false}));
    trial=createTrial(data,{wind:ambientWind,windMetadata:{kind:'ambient-control',speed:1.5,direction:[1,0,0],obstacleResolved:false}});visibility=createVisibility(trial);geometryChecks=validateClosingGeometry(trial);
    actors=c.actors.map(spec=>{const profile=spec.role==='player'?CHARACTER_PROFILES[characterId]:spec.role==='officer'?CHICAGO_PATROL:CIVILIAN_PROFILES[spec.characterId||'goat'],a={...spec,characterId:spec.role==='player'?characterId:spec.characterId||'goat',radius:profile.radius,height:profile.height,maxStep:.22,hp:100,maxHp:100,heading:spec.heading??-Math.PI/2,travelled:0,moving:false,state:'routine',routeIndex:0,holdUntil:null,lastFootstep:0,profile};a.nav=createNavigation(trial,{radius:a.radius,height:a.height,start:anchors[spec.anchor].position});sync(a);return a;});player=actors.find(a=>a.role==='player');resident=actors.find(a=>a.role==='resident');officer=actors.find(a=>a.role==='officer');
    Object.assign(player,{tool:'matches',inventory:{matches:12,torchFuel:5,flamethrowerFuel:6,gas:4,molotovs:4},torch:{phase:'unlit',lit:false,durationSeconds:5/.12},pouring:false,lanternAim:null});lantern={...c.lantern,phase:'placed',ownerId:null,position:[...anchors[c.lantern.anchor].position]};residentState={state:'routine',evidence:null,routeIndex:0,blocked:null,smokeSince:null,lookSince:null};
    witness=createShopWitness(officer,player,[],{rules:{memorySeconds:45},lineBlocked:visibility.blocked,event(type,p,extra){return emit(type,officer,{details:{...extra,point:p}});},hurt(actor,amount,cause){actor.hp=Math.max(0,actor.hp-amount);emit('hurt',actor,{details:{amount,cause}});}});emit('reset',player,{details:{seed,characterId,generation}});
  }
  function doorRows(){return (c.doors||[]).map(d=>{const patches=[...trial.scene.index.surfaces.values()].filter(b=>d.openingIds.includes(b.openingId));return {...d,openFraction:patches.length?Math.min(...patches.map(b=>b.intact?b.openFraction:1)):0,intact:patches.some(b=>b.intact)};});}
  function reach(actor,point,ignoreSources=[]){return actor.hp>0&&Math.hypot(actor.x-point[0],actor.y-point[2],actor.elevation+.9-point[1])<=1.65&&!visibility.blocked({x:actor.x,y:actor.y,h:actor.elevation+.9},{x:point[0],y:point[2],h:point[1]},{ignoreSources});}
  function doorInteraction(actor,id,open){const d=doorRows().find(d=>d.id===id);if(!d)return {ok:false,reason:'Unknown door'};const patches=[...trial.scene.index.surfaces.values()].filter(b=>d.openingIds.includes(b.openingId)),ignore=patches.map(b=>b.sourceSurfaceId),point=anchors[d.anchor].position;if(!reach(actor,point,ignore))return {ok:false,reason:'Door out of reach or blocked'};
    // Proposed leaf geometry is pure: rejecting a close cannot reorder thermal
    // cell membership or change visibility before an authoritative command.
    const leaves=patches.filter(b=>b.intact&&b.actualDoorPose).map(b=>{const angle=(b.opening.maxOpenAngle||Math.PI/2)*(open?1:0),cos=Math.cos(angle),sin=Math.sin(angle),pivot=b.opening.pivot,rotate=p=>{const x=p[0]-pivot[0],z=p[2]-pivot[2];return [pivot[0]+cos*x+sin*z,p[1],pivot[2]-sin*x+cos*z];},n=b.closedNormal,normal=[n[0]*cos+n[2]*sin,n[1],-n[0]*sin+n[2]*cos];return {triangles:extrudePlane(b.closedTriangles.map(t=>t.map(rotate)),normal,-(b.thickness||.12)/2,(b.thickness||.12)/2),closed:true};});
    if(actors.some(a=>a.hp>0&&leaves.some(shape=>!sweptCylinderClear({x:a.x,y:a.y},{x:a.x,y:a.y},a.radius,a.elevation+.025,a.elevation+a.height,shape))))return {ok:false,reason:'Move clear of the door'};
    for(const openingId of d.openingIds)trial.command({type:'opening',id:openingId,open});emit('door',actor,{details:{id,open}});return {ok:true};
  }
  function supportAlive(){const id=lantern.supportSourceId,part=trial.scene.parts.get(id),item=trial.scene.items.get(id);if(part)return part.intact&&trial.scene.items.get(part.itemId)?.intact&&!trial.scene.items.get(part.itemId)?.falling;if(item)return item.intact&&!item.falling;return [...trial.scene.index.surfaces.values()].some(b=>(b.id===id||b.sourceSurfaceId===id)&&b.intact);}
  function pickup(){if(lantern.phase!=='placed'||!supportAlive()||!reach(player,lantern.position,[lantern.supportSourceId]))return false;lantern.phase='carried';lantern.ownerId=player.id;emit('lantern-pickup',player,{details:{id:lantern.id}});return true;}
  function interaction(){if(paused||player.hp<=0)return null;for(const d of doorRows()){const patches=[...trial.scene.index.surfaces.values()].filter(b=>d.openingIds.includes(b.openingId));if(reach(player,anchors[d.anchor].position,patches.map(b=>b.sourceSurfaceId)))return {id:d.id,kind:'door',action:d.openFraction>.5?'close':'open',label:d.openFraction>.5?'Close shop doors':'Open shop doors',enabled:true,reason:'',anchor:anchors[d.anchor].position.map((p,i)=>p+(i===1?1.0:0))};}if(lantern.phase==='placed'&&reach(player,lantern.position,[lantern.supportSourceId]))return {id:lantern.id,kind:'lantern',action:'take',label:'Take lantern',enabled:true,reason:'',anchor:lantern.position.map((p,i)=>p+(i===1?.6:0))};return null;}
  function targetFor(tool){const distance=tool==='flamethrower'?4.5:tool==='torch'?1.1:.85;return aim||[player.x+Math.cos(player.heading)*distance,player.elevation+.015,player.y+Math.sin(player.heading)*distance];}
  function heat(tool,position,energy){const from=[player.x,player.elevation+.9,player.y],type=tool==='matches'?'match':tool==='flamethrower'?'flame':'heat',range=DEFAULT_CONFIG.tools[tool]?.range||1.5;if(Math.hypot(position[0]-player.x,position[2]-player.y)>range+1e-7||tool==='matches'&&Math.hypot(...position.map((v,i)=>v-from[i]))>1.5){emit('tool-rejected',player,{reason:'range',details:{tool}});return false;}
    const hit=trial.scene.index.crossings(from,position).find(h=>trial.scene.index.pass(h.surface)<.99),actual=hit?from.map((p,i)=>p+(position[i]-p)*Math.max(0,hit.t-.001)):position,cell=trial.scene.cellAt(actual),observer=witness.observeAction(tool),otherHeat=[...trial.scene.fuels.values()].some(f=>f.lit&&f.amount>EPS)||trial.metrics().heat.radiationInTransit>EPS||trial.metrics().fallingCount>0;
    for(const f of cell.fuels){const p=trial.scene.profile[f.cls];if(p.delay!==0||f.lit||otherHeat)continue;const before=Math.max(...f.cells.map(c=>c.heat)),site=siteFor(f);site.phase='cold';site.heat=Math.min(trial.rules.maxHeat,before+energy/cell.capacity);observer(site,before);contacts.set(f.id,{tick:trial.tick+1,site,before,after:site.heat,threshold:p.threshold,independent:before<p.threshold&&site.heat>=p.threshold&&!otherHeat,tool,cellId:cell.id});}
    trial.command({type,from,position,energy});emit(tool==='matches'?'match':'tool-use',player,{details:{tool,position,from,energy}});return true;
  }
  function siteFor(f){let s=sites.get(f.id);if(!s){s={fuel:f.amount,heat:0,surfaceFuel:0,depositedFuel:0,phase:'cold',world:{x:f.position[0],y:f.position[1],z:f.position[2]}};sites.set(f.id,s);}return s;}
  function cancelAim(){if(player.lanternAim)moveNeedsNeutral=!!(rawMove?.x||rawMove?.y||inputMove.x||inputMove.y);player.lanternAim=null;rawMove=null;inputMove={x:0,y:0};}
  function adjustAim(stick){
    const min=c.bounds.min,max=c.bounds.max,a=player.lanternAim;
    const proxy={x:player.x-min[0],y:player.y-min[2],heading:player.heading,lanternAim:{...a,target:a.target?{x:a.target.x-min[0],y:a.target.y-min[2]}:null}};
    adjustLanternAim(proxy,stick,{width:max[0]-min[0],height:max[2]-min[2]},DEFAULT_CONFIG);
    Object.assign(a,proxy.lanternAim);player.heading=proxy.heading;inputMove={x:0,y:0};
    if(!a.target)return;
    a.target={x:a.target.x+min[0],y:a.target.y+min[2]};
    const distance=Math.hypot(a.target.x-player.x,a.target.y-player.y);
    if(distance<.15){a.velocity=null;a.path=[];a.impact=null;return;}
    const duration=distance/DEFAULT_CONFIG.tools.molotov.speed,velocity=[(a.target.x-player.x)/duration,(.1-.95+4.905*duration*duration)/duration,(a.target.y-player.y)/duration],from=[player.x,player.elevation+.95,player.y];
    a.velocity=velocity;let p=from,v=[...velocity];const path=[{x:p[0],y:p[2],h:p[1]}];
    // Read-only centre-line preview. Actual finite fuel uses the shared swept
    // falling solver, including glass, contact offsets and supported spill.
    for(let i=0;i<192;i++){
      v[1]-=9.81*DT;const next=p.map((n,j)=>n+v[j]*DT),hit=trial.scene.index.crossings(p,next,{includeEndpoints:true}).find(h=>h.surface.intact&&trial.scene.index.pass(h.surface)<.99&&h.surface.material!=='glass'&&h.surface.kind!=='window');
      p=hit?p.map((n,j)=>n+(next[j]-n)*hit.t):next;path.push({x:p[0],y:p[2],h:p[1]});if(hit||p[1]<trial.scene.groundY-.1)break;
    }
    a.path=path.filter((_,i)=>i===path.length-1||i%Math.max(1,Math.ceil(path.length/30))===0);a.impact=path.at(-1);
  }
  function useTool(){if(player.hp<=0)return;const stock=player.inventory,tool=player.tool;if(tool==='matches'){if(stock.matches<=0)return;stock.matches--;heat(tool,targetFor(tool),trial.rules.matchEnergy);}else if(tool==='torch'){if(stock.torchFuel<=0)return;if(player.torch.phase==='unlit'){player.torch.phase='lit';emit('torch-lit',player);}else heat(tool,targetFor(tool),DEFAULT_CONFIG.tools.torch.heat);}else if(tool==='jerry-can'){player.pouring=!player.pouring;emit('pour',player,{details:{active:player.pouring}});}else if(tool==='molotov'&&stock.molotovs>0){const a=player.lanternAim;if(!a){player.lanternAim={target:null,impact:null,path:[],adjusting:false,canThrow:false};rawMove=null;inputMove={x:0,y:0};return;}if(!a.canThrow||!a.velocity)return;const from=[player.x,player.elevation+.95,player.y],command=trial.command({type:'lantern',from,velocity:a.velocity}),id='lantern:'+command.sequence,projectile={id,x:from[0],y:from[2],h:from[1]};witness.observeRelease(projectile);throws.set(id,projectile);stock.molotovs--;cancelAim();emit('lantern-throw',player,{details:{projectileId:id,position:from,velocity:command.velocity,proof:'Unresolved thermal impact; never direct guilt'}});}}
  function apply(command){if(command.type==='pause'){paused=!!command.paused;rawMove=null;inputMove={x:0,y:0};primary=false;player.pouring=false;return;}if(command.type==='reset'){initialize();return;}if(paused)return;
    if(command.type==='move'){const stick={x:command.x,y:command.y};if(player.lanternAim){adjustAim(stick);return;}if(moveNeedsNeutral){if(!stick.x&&!stick.y)moveNeedsNeutral=false;return;}rawMove=stick;return;}if(command.type==='move-world'){rawMove=null;inputMove={x:command.x,y:command.z};return;}if(command.type==='cancel-lantern-aim'){cancelAim();return;}if(command.type==='cancel-input'){cancelAim();moveNeedsNeutral=false;primary=false;player.pouring=false;return;}if(command.type==='select-tool'){if(TOOLS.includes(command.tool)){if(command.tool!==player.tool)cancelAim();player.tool=command.tool;}return;}if(command.type==='aim'){aim=command.position||[command.x,player.elevation+.015,command.y];player.heading=Math.atan2(aim[2]-player.y,aim[0]-player.x);return;}if(command.type==='primary'){const rising=command.pressed&&!primary;primary=!!command.pressed;if(rising)useTool();return;}if(command.type==='match'){player.tool='matches';aim=command.position;useTool();return;}
    if(command.type==='interact'){if(command.portalId)return doorInteraction(player,command.portalId,command.action==='open');if(command.objectId===lantern.id&&command.action==='take')return pickup();return false;}throw Error('Unknown closing-time input '+command.type);
  }
  function moveActor(a,point,speed=1){const dx=point[0]-a.x,dz=point[2]-a.y,d=Math.hypot(dx,dz);if(d<.035&&Math.abs(point[1]-a.elevation)<.25){a.moving=false;return true;}const length=Math.max(d,1e-9),scale=Math.min(speed/9,d/(9*DT)),candidate=[a.x+dx/length*scale*9*DT,a.elevation+.1,a.y+dz/length*scale*9*DT],cell=trial.scene.cells.get(trial.scene.key(trial.scene.coords(candidate)));if(cell&&(cell.heat>1.3||cell.fuels.some(f=>f.lit&&f.amount>EPS))){a.lastBlock={reason:'Thermal hazard',position:candidate};a.moving=false;emitBlocked(a);return false;}a.nav.move(dx/length*scale,dz/length*scale,DT);sync(a);if(a.lastBlock)emitBlocked(a);return false;}
  function emitBlocked(a){const key=a.lastBlock?.id+':'+a.lastBlock?.reason;if(a.blockKey!==key){a.blockKey=key;emit('route-blocked',a,{reason:a.lastBlock?.reason,details:a.lastBlock});}}
  function bodyEnvironment(a){
    const support=a.nav.support(a.position,a.elevation);if(!support){if(!a.fallVelocity)emit('actor-fall',a,{reason:'Actual bearing lost'});a.fallVelocity=(a.fallVelocity||0)+9.81*DT;const next=a.elevation-a.fallVelocity*DT,hit=trial.scene.index.supportAt(a.x,a.y,a.elevation+.001,next),y=hit?a.elevation+.001+(next-a.elevation-.001)*hit.t:next;a.nav.setPosition([a.x,y,a.y]);sync(a);a.state='falling';if(hit){a.fallVelocity=0;emit('actor-land',a,{details:{supportBoundaryId:hit.surface.id}});}}
    else a.fallVelocity=0;
    if(a.hp<=0)return;const heat=Math.max(0,...[.15,a.height*.6].map(h=>trial.scene.cells.get(trial.scene.key(trial.scene.coords([a.x,a.elevation+h,a.y])))?.heat||0)),damage=DEFAULT_CONFIG.fire.damagePerSecond*DT*Math.max(0,Math.min(1,(heat-DEFAULT_CONFIG.fire.damageHeatStart)/DEFAULT_CONFIG.fire.damageHeatSpan));if(damage){a.hp=Math.max(0,a.hp-damage);if(a.hp===0)emit('actor-down',a,{reason:'Thermal exposure'});}
  }
  function routine(a){const steps=a.routine||[];if(!steps.length){a.moving=false;return;}const step=steps[a.routeIndex%steps.length],arrived=moveActor(a,anchors[step.anchor].position,a.role==='officer'?.9:1.1);if(!arrived)return;if(a.holdUntil===null){if(step.door){const state=doorRows().find(d=>d.id===step.door.id);if((state.openFraction>.5)!==step.door.open){const r=doorInteraction(a,step.door.id,step.door.open);if(!r.ok){a.lastBlock={reason:r.reason};emitBlocked(a);return;}}}a.holdUntil=trial.worldTime+(step.hold||0);if(Number.isFinite(step.heading))a.heading=step.heading;}if(trial.worldTime>=a.holdUntil){a.routeIndex=(a.routeIndex+1)%steps.length;a.holdUntil=null;}}
  function updateResident(){if(resident.hp<=0){residentState.state='down';resident.moving=false;return;}if(trial.tick%3===0){const signal=visibleSmoke(trial,resident,visibility,currentSmoke());if(signal){residentState.smokeSince??=trial.worldTime;residentState.evidence={...signal,seenAt:trial.worldTime};if(trial.worldTime-residentState.smokeSince>=SMOKE_PERCEPTION.sustain&&residentState.state==='routine'){residentState.state='looking';residentState.lookSince=trial.worldTime;emit('smoke-noticed',resident,{details:residentState.evidence});}}else residentState.smokeSince=null;}
    if(residentState.state==='routine')return routine(resident);resident.state=residentState.state;if(residentState.state==='looking'){const view=anchors[resident.viewAnchor];if(view&&!moveActor(resident,view.position,1.1))return;const evidence=residentState.evidence;if(evidence){resident.heading=Math.atan2(evidence.position[2]-resident.y,evidence.position[0]-resident.x);resident.lookAt=evidence.position;}if(evidence?.strength>=.3&&trial.worldTime-residentState.lookSince>=1.2){residentState.state='escaping';residentState.routeIndex=0;emit('resident-exit',resident,{details:{reason:'Sustained visible smoke',evidence}});}}
    if(residentState.state==='escaping'){const id=resident.exitRoute?.[residentState.routeIndex];if(!id){residentState.state='safe';emit('resident-safe',resident);return;}if(moveActor(resident,anchors[id].position,1.4))residentState.routeIndex++;if(resident.lastBlock){residentState.blocked=resident.lastBlock;resident.state='blocked';}}
  }
  function stepOnce(){const previousWitness=witness.snapshot();for(const command of queue.splice(0))apply(command);if(paused)return;
    const clock=scales(),playerDelta=DT*clock.player/clock.world;activeTime+=DT/clock.world;playerTime+=playerDelta;if(rawMove)inputMove=movementVector(rawMove,effects.inversion>activeTime,DEFAULT_CONFIG.input);
    if(player.hp>0){
      const before=player.travelled,previous={x:player.x,y:player.y};player.nav.move(inputMove.x,inputMove.y,playerDelta);sync(player);if(player.travelled>before)aim=null;
      for(const contact of pickupContacts(pickups.filter(p=>Math.abs(p.position[1]-player.elevation)<.3),[previous,{x:player.x,y:player.y}],player.radius,[])){
        const p=contact.pickup;if(visibility.blocked({x:contact.point.x,y:contact.point.y,h:player.elevation+.25},{x:p.x,y:p.y,h:p.position[1]+.1}))continue;p.consumed=true;
        if(p.kind==='healing')player.hp=Math.min(100,player.hp+DEFAULT_CONFIG.drugs.healing);else effects[p.kind]=activeTime+DEFAULT_CONFIG.drugs.duration;emit('pickup',player,{details:{id:p.id,kind:p.kind}});
      }
      if(player.pouring&&player.inventory.gas>EPS&&player.travelled>before){const amount=Math.min(player.inventory.gas,(player.travelled-before)*DEFAULT_CONFIG.fuel.gasPerMetre);player.inventory.gas-=amount;trial.command({type:'deposit',position:[player.x,player.elevation+.006,player.y],amount});}
      if(primary&&player.tool==='flamethrower'&&player.inventory.flamethrowerFuel>EPS){const spend=Math.min(player.inventory.flamethrowerFuel,.3*playerDelta);player.inventory.flamethrowerFuel-=spend;heat('flamethrower',targetFor('flamethrower'),12*spend/.3);}
    }
    if(player.torch.phase==='lit'){player.inventory.torchFuel=Math.max(0,player.inventory.torchFuel-.12*DT);if(player.inventory.torchFuel<=EPS)player.torch.phase='spent';}player.torch.lit=player.torch.phase==='lit';
    updateResident();if(previousWitness.reaction.kind==='relaxed')routine(officer);trial.step();
    if(lantern.phase==='placed'&&!supportAlive()){lantern.phase='spent';emit('lantern-spent',null,{details:{reason:'Support lost'}});}if(lantern.phase==='carried')lantern.position=[player.x+Math.cos(player.heading)*.3,player.elevation+.9,player.y+Math.sin(player.heading)*.3];
    for(const [id,site]of sites){const f=trial.scene.fuels.get(id);site.phase=f?.lit&&f.amount>EPS?'burning':'cold';site.fuel=f?.amount||0;}
    for(const e of trial.events.slice(thermalCursor)){
      const projectileId=e.fallId||e.cause,projectile=throws.get(projectileId);
      if(projectile&&['impact','landing'].includes(e.type)){const p=e.contactPosition||e.position;witness.observeImpact(projectile,{x:p[0],y:p[2],h:p[1]});throws.delete(projectileId);emit('lantern-impact',player,{details:{projectileId,position:p,proof:'Unresolved thermal impact; never direct guilt'}});}
      if(e.type==='escaped')throws.delete(projectileId);
      if(e.type==='ignition'){const f=trial.scene.fuels.get(e.fuelId),site=siteFor(f);site.phase='burning';const contact=contacts.get(e.fuelId),proof=contact?.tick===trial.tick&&contact.independent&&trial.events.some(h=>h.type==='heat-input'&&h.tick===trial.tick&&h.cellId===contact.cellId);if(proof)witness.confirmIgnition({x:e.position[0],y:e.position[2],height:e.position[1],cause:contact.tool},site,{independent:true,required:contact.threshold,incoming:0});else witness.observeFire(site,{x:e.position[0],y:e.position[2],height:e.position[1]+.2});}
    }
    thermalCursor=trial.events.length;contacts.clear();for(const a of actors)bodyEnvironment(a);witness.update(trial.worldTime,lantern.phase==='carried');const now=witness.snapshot();officer.state=now.reaction.kind;if(previousWitness.reaction.kind!==now.reaction.kind||previousWitness.reaction.worldTime!==now.reaction.worldTime)emit('officer-reaction',officer,{reason:now.reaction.kind==='aggressive'?'Direct same-step independent ignition':now.reaction.kind==='suspicious'?'Visible new fire near remembered lantern':'Reaction expired',details:{...now,previous:previousWitness.reaction,originDistance:now.memory?Math.hypot(now.reaction.x-now.memory.x,now.reaction.y-now.memory.y):null,memoryExpiresAt:now.memory?now.memory.worldTime+45:null}});
    if(now.memory&&(!previousWitness.memory||Math.floor(now.memory.worldTime)!==Math.floor(previousWitness.memory.worldTime)))emit('lantern-sighting',officer,{details:{...now.memory,expiresAt:now.memory.worldTime+45}});if(!now.memory&&previousWitness.memory)emit('lantern-memory-expired',officer,{details:{sighting:previousWitness.memory,expiresAt:previousWitness.memory.worldTime+45}});
    for(const a of actors){const foot=Math.floor(a.travelled/.65);if(foot>a.lastFootstep){a.lastFootstep=foot;emit('footstep',a,{details:{elevation:a.elevation}});}}
  }
  function actorFrame(a){const native=a.role==='officer'?{...CHICAGO_PATROL}:a.role==='resident'?{...CIVILIAN_PROFILES[a.characterId],id:a.id,team:'civilian',headgear:'none',equipment:'none'}:{id:a.id,characterId:a.characterId,species:a.characterId};Object.assign(native,{x:a.x,y:a.y,elevation:a.elevation,heading:a.heading,travelled:a.travelled,moving:a.moving,hp:a.hp,radius:a.radius,height:a.height,...(a.role==='player'?{tool:player.tool,pouring:player.pouring,usingTool:primary&&player.tool==='flamethrower',inventory:{...player.inventory},torch:{...player.torch,remainingSeconds:player.inventory.torchFuel/.12}}:{})});return {id:a.id,role:a.role,characterId:a.characterId,position:[...a.position],heading:a.heading,travelled:a.travelled,moving:a.moving,height:a.height,radius:a.radius,hp:a.hp,state:a.state,lookAt:a.lookAt?[...a.lookAt]:null,native,...(a.role==='officer'?{witness:witness.snapshot()}:{})};}
  let frameCursor=0;function closingFrame(){const value={version:1,generation,revision:trial.tick,worldTime:trial.worldTime,clocks:{world:trial.worldTime,active:activeTime,player:playerTime,worldScale:scales().world,playerScale:scales().player},actors:actors.map(actorFrame),doors:doorRows(),lantern:structuredClone(lantern),smokeSignals:structuredClone(currentSmoke()),resident:structuredClone(residentState),events:structuredClone(events.slice(frameCursor)),replay:{...replay}};frameCursor=events.length;return value;}
  function witnessOpportunity(point){
    const playerSeen=witness.canSee(player,player.elevation+player.height*.76),siteSeen=witness.canSee({x:point[0],y:point[2]},point[1]+.2),cell=trial.scene.cells.get(trial.scene.key(trial.scene.coords(point))),coldSource=!!cell?.fuels.some(f=>f.amount>EPS&&!f.lit&&trial.scene.profile[f.cls].delay===0);
    return {worldTime:trial.worldTime,playerSeen,siteSeen,coldSource,ready:playerSeen&&siteSeen&&coldSource,officer:{position:[...officer.position],heading:officer.heading}};
  }
  function mapObstacles(){
    const records=[];for(const b of trial.scene.index.surfaces.values()){
      if(!b.intact||b.level!==0||!b.bounds||!(b.kind==='floor'&&/timber|wood|oak/.test(b.material)||['wall','door','window'].includes(b.kind)))continue;
      const {min,max}=b.bounds;records.push({id:b.id,x:(min[0]+max[0])/2,y:(min[2]+max[2])/2,width:Math.max(.02,max[0]-min[0]),depth:Math.max(.02,max[2]-min[2])});
    }return records;
  }
  function snapshot({thermal=false}={}){
    const p={...actorFrame(player).native,position:[...player.position],maxHp:100,tool:player.tool,inventory:{...player.inventory},pouring:player.pouring,lanternAim:structuredClone(player.lanternAim),interaction:interaction(),torch:{...player.torch,remainingSeconds:player.inventory.torchFuel/.12}},bounds=c.bounds;
    return {
      version:1,tick:trial.tick,paused,seed,clocks:{world:trial.worldTime,player:playerTime,active:activeTime,worldScale:scales().world,playerScale:scales().player},player:p,actors:actors.filter(a=>a!==player).map(actorFrame),
      effects:{powder:{active:effects.powder>activeTime,remaining:Math.max(0,effects.powder-activeTime)},inversion:{active:effects.inversion>activeTime,remaining:Math.max(0,effects.inversion-activeTime)}},
      events:events.map((e,i)=>structuredClone({...e,...e.details,id:i+1})),diagnostics:{generation,alpha:0},
      world:{width:bounds.max[0],height:bounds.max[2],fireCellSize:.5,tiles:[],obstacles:mapObstacles()},cells:trial.fireSamples().filter(f=>f.flame>0).map(f=>({x:f.x,y:f.z,phase:'burning'})),
      closingTime:{resident:structuredClone(residentState),lantern:structuredClone(lantern),witness:witness.snapshot()},pickups:structuredClone(pickups),...(thermal?{thermal:trial.snapshot()}:{})
    };
  }
  initialize();return {
    get trial(){return trial;},get actors(){return actors;},get player(){return player;},get resident(){return resident;},get officer(){return officer;},get paused(){return paused;},get tick(){return trial.tick;},get generation(){return generation;},get worldTime(){return trial.worldTime;},get geometryChecks(){return geometryChecks;},
    command(command){if(disposed)throw Error('Disposed');commands.push({tick:trial.tick+1,...structuredClone(command)});if(['pause','reset'].includes(command.type)){apply(command);if(command.type==='reset')frameCursor=0;}else queue.push(structuredClone(command));},
    step(count=1){if(disposed)throw Error('Disposed');if(!Number.isInteger(count)||count<0)throw Error('Whole steps required');for(let i=0;i<count;i++)stepOnce();return trial.tick;},
    advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw Error('Finite elapsed time required');if(paused)return snapshot();accumulator+=seconds;let count=0;while(accumulator+1e-10>=DT/scales().world&&count<240){const delta=DT/scales().world;stepOnce();accumulator-=delta;count++;}return snapshot();},
    clockScales:scales,witnessOpportunity,frame({full=false}={}){return {...trial.frame({full}),closingTime:closingFrame()};},snapshot,interaction,doors:doorRows,doorInteraction,pickup,metrics:()=>trial.metrics(),
    replay:()=>({version:1,seed,characterId,commands:structuredClone(commands),thermal:trial.replay(),memorySeconds:45,receiverSelection:'default live initial composition',wind:trial.windMetadata}),
    setReplay(value){replay={...replay,...value};},dispose(){disposed=true;trial.dispose();queue=[];}
  };
}
