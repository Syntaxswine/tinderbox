import {NEIGHBORHOOD_SCENARIO} from './neighborhood.js';

export const COTTAGE_IDS=Object.freeze(['ashland-cottage','ashland-downwind']);
export const COTTAGE_ORIGIN=Object.freeze({x:46,z:10});
export const COTTAGE_OFFSET=Object.freeze({x:9,z:10.75});
export const COTTAGE_PAIR_SCENARIO={
  ...NEIGHBORHOOD_SCENARIO,id:'cottage-pair',width:64,
  player:{x:52.84,y:13.5,heading:Math.PI,tool:'matches'},
  camera:{followPlayer:true,span:19,phoneSpan:25,followOffset:[3,2.5]},
  patches:[...NEIGHBORHOOD_SCENARIO.patches,{x:42,y:6,width:22,depth:23,material:'paving'}],
  buildings:[
    ...NEIGHBORHOOD_SCENARIO.buildings.filter(b=>b.id!==COTTAGE_IDS[0]),
    {id:COTTAGE_IDS[0],prefabId:'ashland-worker',x:COTTAGE_ORIGIN.x,y:COTTAGE_ORIGIN.z,quarterTurns:0},
    {id:COTTAGE_IDS[1],prefabId:'ashland-worker',x:COTTAGE_ORIGIN.x+COTTAGE_OFFSET.x,y:COTTAGE_ORIGIN.z+COTTAGE_OFFSET.z,quarterTurns:0}
  ]
};

export function catalogueCottageMode(search=''){
  const mode=new URLSearchParams(search).get('cottages');
  return mode==='1'?'wind':mode==='calm'?'calm':null;
}
