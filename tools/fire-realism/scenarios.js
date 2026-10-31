import {createSimulation,worldToStick} from '../../src/simulation/index.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
export const FIRE_REVIEW_SCENARIOS=Object.freeze(['match-contact','carried-torch','gasoline-front','gasoline-front-powder','wall-clipped-jet','street-fire']);
export const POPULATION_CASES=Object.freeze(['street-fire']);
const step=1/60;
export function fireReviewScenario(name,population=null){
  if(!FIRE_REVIEW_SCENARIOS.includes(name))throw RangeError('Unknown fire scenario');
  if(population!==null&&(!POPULATION_CASES.includes(name)||![32,128,512].includes(population)))throw RangeError('Population is supported only for street-fire, at32/128/512');
  const basic={id:'fire-review-'+name,width:20,height:16,player:{x:4.25,y:8.25,tool:'matches'},actors:[],obstacles:[],
    patches:[{x:5,y:8,width:1,depth:1,material:'grass'}]};
  if(name==='wall-clipped-jet')return {...basic,patches:[{x:0,y:0,width:20,depth:16,material:'grass'}],player:{x:5.25,y:8.25,tool:'flamethrower'},
    obstacles:[{id:'real-masonry-wall',x:8,y:8,width:.16,depth:9,height:3,material:'masonry',kind:'wall',blocksHeat:true}]};
  if(name==='gasoline-front'||name==='gasoline-front-powder')return {...basic,patches:[],player:{x:5.25,y:8.25,tool:'jerry-can'},
    fuelLines:[{from:{x:1.25,y:8.25},to:{x:5.25,y:8.25},litresPerMetre:.08}],ignitions:[{x:1.25,y:8.25,radius:.01,heat:2}]};
  if(name==='street-fire'){
    const source=structuredClone(NEIGHBORHOOD_SCENARIO);source.id='fire-review-street-fire';source.actors=[];source.pickups=[];
    source.player={x:31,y:17,tool:'matches'};
    const compiled=scenarioDefinition(source),size=compiled.fireCellSize;
    const targets=[];
    for(let y=size/2;y<source.height;y+=size)for(let x=size/2;x<source.width;x+=size){
      const b=compiled.obstacles.find(b=>b.buildingId&&Math.abs(x-b.x)<=b.width/2&&Math.abs(y-b.y)<=b.depth/2);
      if(b)targets.push({x,y,buildingId:b.buildingId});
    }
    targets.sort((a,b)=>Math.hypot(a.x-30,a.y-8)-Math.hypot(b.x-30,b.y-8)||a.y-b.y||a.x-b.x);
    source.ignitions=targets.slice(0,population??128).map(p=>({x:p.x,y:p.y,radius:.001,heat:2}));
    return source;
  }
  if(name==='carried-torch')basic.player.tool='torch';
  return basic;
}
export function createFireReviewSimulation({scenario='match-contact',population=null,seed=1893,characterId='bear'}={}){
  const definition=fireReviewScenario(scenario,population),sim=createSimulation({scenario:definition,seed,characterId});
  let frameIndex=0;
  function commands(frame){
    if(frame===0){sim.dispatch({type:'aim',x:7.25,y:8.25});
      if(scenario==='gasoline-front-powder')sim.dispatch({type:'drug',drug:'powder'});
      sim.dispatch({type:'primary',pressed:true});
    }
    if(frame===1&&scenario!=='wall-clipped-jet')sim.dispatch({type:'primary',pressed:false});
    if((scenario==='gasoline-front'||scenario==='gasoline-front-powder')&&frame===1){const d=worldToStick({x:1,y:0},{cameraRelative:true,cameraX:10,cameraY:12});sim.dispatch({type:'move',...d});}
    if((scenario==='gasoline-front'||scenario==='gasoline-front-powder')&&frame===45){sim.dispatch({type:'move',x:0,y:0});sim.dispatch({type:'primary',pressed:true});}
    if((scenario==='gasoline-front'||scenario==='gasoline-front-powder')&&frame===46)sim.dispatch({type:'primary',pressed:false});
    if(scenario==='carried-torch'&&frame===60)sim.dispatch({type:'primary',pressed:true});
    if(scenario==='carried-torch'&&frame===61)sim.dispatch({type:'primary',pressed:false});
    // Review adaptation: carry the actually lit finite torch through an accepted
    // 18-step eastward walk, not a visual-only relocation or additional ignition.
    if(scenario==='carried-torch'&&frame===90)sim.dispatch({type:'move',...worldToStick({x:1,y:0},{cameraRelative:true,cameraX:10,cameraY:12})});
    if(scenario==='carried-torch'&&frame===108)sim.dispatch({type:'move',x:0,y:0});
  }
  function scriptedStep(receiptOnly){commands(frameIndex);frameIndex++;return receiptOnly?sim.advanceReceiptStep():sim.advance(step);}
  return {definition,advance:()=>scriptedStep(false),advanceReceiptStep:()=>scriptedStep(true),snapshot:()=>sim.snapshot(),
    dispatch:sim.dispatch,get frameIndex(){return frameIndex;},dispose:sim.dispose};
}

export function createReviewPlaybackClock(){
  let accumulator=0,droppedRealSeconds=0;
  return {reset(){accumulator=0;droppedRealSeconds=0;},advance(delta){
    if(!Number.isFinite(delta)||delta<0)throw TypeError('Playback delta must be finite and nonnegative');
    const accepted=Math.min(.25,delta);droppedRealSeconds+=delta-accepted;accumulator+=accepted;
    const frames=Math.min(15,Math.floor((accumulator+1e-9)*60));accumulator=Math.max(0,accumulator-frames/60);return frames;
  },diagnostics:()=>({droppedRealSeconds,accumulator})};
}