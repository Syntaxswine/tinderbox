import {worldToStick} from '../../src/simulation/geometry.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
// Review-only playback dispatches normal input into the live runtime. It never
// writes coordinates, resets the player, advances a second clock or creates art.
export function createRouteDriver({dispatch,input=DEFAULT_CONFIG.input,speed=DEFAULT_CONFIG.player.speed,now=()=>performance.now(),maxSeconds=900,stallSeconds=12}){
  let state={phase:'idle',message:'Choose a verified route.'},record,legIndex=0,pointIndex=0,startedAt=0,lastFrame=0,lastProgress=0,bestDistance=Infinity;
  const active=()=>['running','paused'].includes(state.phase);
  function stop(message='Route stopped.',phase='stopped'){
    if(active()){dispatch({type:'move',x:0,y:0});if(phase==='failed')dispatch({type:'pause',paused:true});}state={...state,phase,message};
  }
  function start(value,snapshot){
    stop();const count=value?.legs?.reduce((n,leg)=>n+(leg.path?.length||0),0);
    if(!value?.legs?.length||value.legs.length>200||!count||count>30000||value.legs.some(leg=>!leg.path?.length))throw Error('A bounded verified route is required');
    if(snapshot.mode!=='explore'||snapshot.navigation.placeId!==value.placeId||snapshot.player.characterId!==value.characterId)throw Error('Route and active place/animal do not match');
    for(const leg of value.legs)for(const point of leg.path)if(![point.x,point.y,point.elevation].every(Number.isFinite)||point.x<0||point.y<0||point.x>snapshot.world.width||point.y>snapshot.world.height)throw Error('Invalid verified route point');
    const first=value.legs[0].path[0],player=snapshot.player;if(Math.hypot(first.x-player.x,first.y-player.y)>.25||Math.abs(first.elevation-player.elevation)>.02)throw Error('Open a fresh visit or walk back to the route start before playback');
    record=value;legIndex=0;pointIndex=0;startedAt=lastFrame=lastProgress=now();bestDistance=Infinity;
    state={phase:'running',message:'Following '+record.legs[0].label,placeId:record.placeId,characterId:record.characterId,totalPoints:count,completedPoints:0,leg:1,totalLegs:record.legs.length};dispatch({type:'pause',paused:false});
  }
  function update(snapshot){
    if(!active())return;const time=now();if(time-startedAt>maxSeconds*1000){stop('Finite route time limit reached.','failed');return;}
    if(snapshot.mode!=='explore'||snapshot.navigation.placeId!==record.placeId||snapshot.player.characterId!==record.characterId||snapshot.player.hp<=0){stop('Visit changed or player is unavailable.','failed');return;}
    if(state.phase==='paused'||snapshot.paused){lastFrame=time;lastProgress=time;return;}
    const delta=Math.max(1/60,Math.min(.1,(time-lastFrame)/1000));lastFrame=time;
    let leg=record.legs[legIndex],target=leg.path[pointIndex],player=snapshot.player;
    while(Math.hypot(target.x-player.x,target.y-player.y)<.05&&Math.abs(target.elevation-player.elevation)<.015){
      pointIndex++;state.completedPoints++;lastProgress=time;bestDistance=Infinity;
      if(pointIndex===leg.path.length){legIndex++;pointIndex=0;if(legIndex===record.legs.length){stop('Out-and-back route complete.','complete');return;}leg=record.legs[legIndex];state.leg=legIndex+1;}target=leg.path[pointIndex];
    }
    const dx=target.x-player.x,dy=target.y-player.y,distance=Math.hypot(dx,dy);if(distance<bestDistance-.01){bestDistance=distance;lastProgress=time;}
    if(snapshot.navigation.waitingForSection){lastProgress=time;state.message='Waiting for nearby source sections.';dispatch({type:'move',x:0,y:0});return;}
    if(time-lastProgress>stallSeconds*1000){stop('Movement stalled near '+leg.label+'; paused for inspection.','failed');return;}
    if(player.interaction?.enabled&&player.interaction.label.startsWith('Open '))dispatch({type:'interact'});
    const magnitude=Math.min(.8,distance/(speed*delta)),vector=worldToStick({x:distance?dx/distance*magnitude:0,y:distance?dy/distance*magnitude:0},input);dispatch({type:'move',...vector});state.message='Following '+leg.label;
  }
  return {start,update,stop,pause(){if(state.phase!=='running')return;dispatch({type:'move',x:0,y:0});dispatch({type:'pause',paused:true});state.phase='paused';state.message='Route and visit paused.';},resume(){if(state.phase!=='paused')return;lastProgress=lastFrame=now();dispatch({type:'pause',paused:false});state.phase='running';},state:()=>({...state}),dispose(){stop('Review closed.');state.phase='disposed';}};
}
