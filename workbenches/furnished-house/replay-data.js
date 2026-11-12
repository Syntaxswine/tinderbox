// Exact accepted replay data/command extracted from main.js at d1bc6472.
export const REPLAYS={kitchen:{position:[.1,1.10,6.25],observer:[1.4,.48,6.3],level:0,label:'Kitchen-side timber wall'},bedroom:{position:[.1,3.13,5.25],observer:[.8,2.6,5.25],level:1,label:'Upper bedroom timber wall'}};
export function replayCommand(name){const replay=REPLAYS[name];if(!replay)throw Error('Unknown replay');return {tick:1,type:'match',position:[...replay.position],from:[replay.observer[0],replay.position[1],replay.observer[2]]};}
