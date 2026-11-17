// Preserved exploration controller. Shared gameplay borrows the pure native
// queries from place-navigation.js, never this independent diagnostic clock.
import {configuration} from '../simulation/config.js';
import {movementVector,normalized,distance} from '../simulation/geometry.js';
import {CHARACTER_PROFILES} from '../content/characters.js';
import {inactiveDischarge} from '../simulation/discharge.js';
import {createPlaceNavigation,supportMetadata} from './place-navigation.js';
import {EXPLORATION_CAPABILITIES} from '../content/visit-capabilities.js';
export {inside,spatialIndex} from './place-navigation.js';
export const EXPLORE_BODY=CHARACTER_PROFILES.goat;
const EPS=1e-6;
export function createExploration({definition,config,isSectionReady=()=>true,streamMetrics=()=>({}),collisionLimits={}}){
  const settings=configuration(config),body={...EXPLORE_BODY,...definition?.body};
  let closed=false,tick=0,accumulator=0,activeTime=0,paused=false,input={x:0,y:0},commands=[],events=[],sequence=0,player,portalStates,waiting=false,view='follow',acceptedPath=[],lastSteps=0,droppedRealSeconds=0;
  const native=createPlaceNavigation({definition,body,isSectionReady,collisionLimits,portalOpen:id=>!!portalStates?.[id]});
  const data=Object.fromEntries(['placeId','width','height','spawn','characterId','camera','mapObstacles','portals'].map(k=>[k,structuredClone(definition[k])])),portals=data.portals||[];
  const world={width:data.width,height:data.height,tileSize:1,fireCellSize:.5,modules:[],buildings:[],tiles:[],camera:data.camera};
  function emit(type,extra={}){events.push({id:++sequence,tick,type,x:player.x,y:player.y,...extra});if(events.length>64)events.shift();}
  function reset(){
    portalStates=Object.fromEntries(portals.map(p=>[p.id,!!p.initiallyOpen]));input={x:0,y:0};paused=false;
    player={id:'hero',characterId:data.characterId||'goat',species:data.characterId||'goat',height:body.height,...data.spawn,radius:body.radius,hp:100,maxHp:100,tool:'matches',travelled:0,heading:0,moving:false,usingTool:false,pouring:false,
      inventory:{matches:0,gas:0,molotovs:0,torchFuel:0,flamethrowerFuel:0,powder:0,healing:0,inversion:0},torch:{phase:'spent',remainingSeconds:0,durationSeconds:0}};
    const support=native.support(player,player.elevation);if(!support||!native.canStand(player,player.elevation,player))throw Error('Unsafe exploration spawn: '+data.placeId);Object.assign(player,supportMetadata(support));
  }
  reset();
  function dispatch(command){
    if(closed||!command||!['move','aim','pause','cancel-input','reset','interact'].includes(command.type))return false;
    if(['move','aim'].includes(command.type)&&![command.x,command.y].every(Number.isFinite))return false;
    if(command.type==='pause'&&typeof command.paused!=='boolean')return false;
    if(command.type==='interact'&&(Object.hasOwn(command,'portalId')||Object.hasOwn(command,'action'))&&(typeof command.portalId!=='string'||!command.portalId||!['open','close'].includes(command.action)))return false;
    commands.push({...command});return true;
  }
  function step(){
    tick++;player.moving=false;waiting=false;acceptedPath=[{x:player.x,y:player.y,elevation:player.elevation}];
    for(const command of commands){
      if(command.type==='reset'){reset();emit('reset');continue;}
      if(command.type==='cancel-input'){input={x:0,y:0};continue;}
      if(command.type==='pause'){paused=command.paused;if(paused)input={x:0,y:0};continue;}
      if(paused)continue;
      if(command.type==='move')input=normalized(command.x,command.y);
      if(command.type==='interact'){
        const targeted=Object.hasOwn(command,'portalId'),portal=targeted?native.portal(command.portalId):native.nearestPortal(player),open=targeted?command.action==='open':!portalStates[portal?.id];
        if(native.reachable(player,portal)&&portalStates[portal.id]!==open&&!native.transitionBlocked(player,portal,open)){portalStates[portal.id]=open;emit('portal-state',{portalId:portal.id,open});}
      }
    }commands=[];if(paused)return;activeTime+=settings.step;
    const direction=movementVector(input,false,settings.input),result=native.move(player,direction.x*settings.player.speed*settings.step,direction.y*settings.player.speed*settings.step);waiting=result.waiting;
    for(let i=1;i<result.path.length;i++){
      const p=result.path[i],walked=distance(player,p);player.travelled+=walked;player.moving||=walked>EPS;Object.assign(player,p);acceptedPath.push({x:p.x,y:p.y,elevation:p.elevation});
    }if(result.path.length>1)player.heading=result.heading;
  }
  function snapshot(){
    if(closed)throw Error('Exploration disposed');
    return {version:1,mode:'explore',capabilities:EXPLORATION_CAPABILITIES,tick,paused,clocks:{active:activeTime,player:activeTime,world:activeTime,playerScale:1,worldScale:1},
      player:{...player,locationLabel:view==='overview'?'Overview plan · '+player.locationLabel:player.locationLabel,inventory:{...player.inventory},torch:{...player.torch},lanternAim:null,interaction:native.interaction(player,paused)},
      world:{...world,modules:[],buildings:[],tiles:[],camera:structuredClone(world.camera),obstacles:(data.mapObstacles||[]).filter(wall=>wall.fromLevel<=player.level&&wall.toLevel>player.level).map(wall=>({...wall}))},actors:[],cells:[],structureFire:[],projectiles:[],events:structuredClone(events),aim:{x:player.x,y:player.y},
      pickups:[],effects:{powder:{active:false,remaining:0},inversion:{active:false,remaining:0}},discharge:inactiveDischarge(tick),
      navigation:{placeId:data.placeId,view,waitingForSection:waiting,portalStates:{...portalStates},collision:native.metrics(),...streamMetrics()},
      diagnostics:{alpha:accumulator/settings.step,scenario:data.placeId,generation:0,lastSteps,droppedRealSeconds,burningCells:0,acceptedPath:acceptedPath.map(point=>({...point}))}};
  }
  return {capabilities:EXPLORATION_CAPABILITIES,dispatch,snapshot,setView(value){view=value;},advance(delta){if(closed)throw Error('Exploration disposed');if(!Number.isFinite(delta)||delta<0)throw Error('Invalid exploration delta');const accepted=Math.min(delta,settings.maxCatchUp);droppedRealSeconds+=delta-accepted;accumulator+=accepted;lastSteps=0;while(accumulator+EPS>=settings.step&&lastSteps<Math.ceil(settings.maxCatchUp/settings.step)){accumulator=Math.max(0,accumulator-settings.step);step();lastSteps++;}return snapshot();},
    dispose(){closed=true;commands=[];events=[];native.dispose();},collisionMetrics:native.metrics,canStand:(point,height)=>native.canStand(point,height,{...point,elevation:height}),probeStep:native.probeStep,routeHints:native.routeHints,definition:native.definition};
}
