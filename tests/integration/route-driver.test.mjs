import test from 'node:test';
import assert from 'node:assert/strict';
import {createRouteDriver} from '../../workbenches/places/route-driver.js';
import {createExploration} from '../../src/runtime/navigation.js';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {planRoute} from '../../tools/place-routes.mjs';
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],floor=(id,polygon,height=0,extra={})=>({id,polygons:[polygon],holes:[],height,level:Math.round(height/2.12),label:id,...extra});
const definition=characterId=>({placeId:'fixture',characterId,body:CHARACTER_PROFILES[characterId],width:20,height:12,spawn:{x:3,y:3,elevation:0},surfaces:[floor('lower',rect(0,0,6,12)),floor('upper',rect(10,0,20,12),2.12),...Array.from({length:12},(_,i)=>floor('tread-'+i,rect(6+i/3,2,6+(i+1)/3,4),(i+1)*2.12/12,{stairId:'flight'}))],ceilings:[],blockers:[],portals:[]});
test('visible QA playback walks all native bodies up/down real treads through ordinary commands at multiple frame rates',()=>{
  for(const characterId of ['goat','horse','bear'])for(const hz of [30,60,144]){
    const data=definition(characterId),planner=createExploration({definition:data}),sim=createExploration({definition:data}),from=data.spawn,to={x:12,y:3,elevation:2.12},forward=planRoute(planner,from,to).route,back=planRoute(planner,to,from).route,commands=[];let time=0,maxHeight=0;
    const driver=createRouteDriver({dispatch:command=>{commands.push(command.type);sim.dispatch(command);},now:()=>time});
    try{
      driver.start({placeId:'fixture',characterId,legs:[{label:'Upper hall',path:forward},{label:'Return to grounds',path:back}]},sim.snapshot());driver.update(sim.snapshot());
      for(let i=0;i<hz*20&&driver.state().phase==='running';i++){time+=1000/hz;const snapshot=sim.advance(1/hz);maxHeight=Math.max(maxHeight,snapshot.player.elevation);driver.update(snapshot);}
      assert.equal(driver.state().phase,'complete',JSON.stringify({characterId,hz,state:driver.state(),player:sim.snapshot().player}));assert.ok(Math.abs(maxHeight-2.12)<1e-6);assert.ok(Math.hypot(sim.snapshot().player.x-3,sim.snapshot().player.y-3)<.06);assert.equal(sim.snapshot().player.elevation,0);
      assert.ok(commands.every(type=>['move','pause','interact'].includes(type)));assert.equal(driver.state().completedPoints,forward.length+back.length);
    }finally{driver.dispose();sim.dispose();planner.dispose();}
  }
});
test('QA pause/resume freezes actual movement and stop/dispose clear held input without reset or relocation',()=>{
  const data=definition('goat'),sim=createExploration({definition:data});let time=0;const driver=createRouteDriver({dispatch:sim.dispatch,now:()=>time});
  try{driver.start({placeId:'fixture',characterId:'goat',legs:[{label:'Grounds',path:[data.spawn,{x:5,y:3,elevation:0}]}]},sim.snapshot());driver.update(sim.snapshot());sim.advance(1/60);driver.pause();sim.advance(1/60);const before=sim.snapshot();time+=500;sim.advance(.25);assert.equal(sim.snapshot().player.x,before.player.x);assert.equal(sim.snapshot().clocks.world,before.clocks.world);
    driver.resume();driver.update(sim.snapshot());sim.advance(1/60);driver.update(sim.snapshot());sim.advance(1/60);assert.ok(sim.snapshot().player.x>before.player.x);
    driver.dispose();sim.advance(1/60);const stopped=sim.snapshot().player.x;sim.advance(.2);assert.equal(sim.snapshot().player.x,stopped);assert.equal(driver.state().phase,'disposed');
  }finally{sim.dispose();}
});
test('QA playback rejects wrong or displaced visits and has a real finite deadline and safe stalled-route failure',()=>{
  const data=definition('goat'),sim=createExploration({definition:data}),record={placeId:'fixture',characterId:'goat',legs:[{label:'Grounds',path:[data.spawn,{x:5,y:3,elevation:0}]}]};let time=0;
  const driver=createRouteDriver({dispatch:sim.dispatch,now:()=>time,maxSeconds:1});
  try{
    assert.throws(()=>driver.start({...record,characterId:'horse'},sim.snapshot()),/do not match/);assert.throws(()=>driver.start({...record,legs:[{label:'Wrong start',path:[{x:10,y:3,elevation:0}]}]},sim.snapshot()),/route start/);
    driver.start(record,sim.snapshot());driver.update(sim.snapshot());time=1001;driver.update(sim.snapshot());sim.advance(1/60);assert.equal(driver.state().phase,'failed');assert.equal(sim.snapshot().paused,true);
  }finally{driver.dispose();sim.dispose();}
  const blocked=createExploration({definition:{...data,blockers:[{id:'wall',bounds:{min:[4,0,0],max:[4.1,4,12]}}]}});time=0;
  const stalled=createRouteDriver({dispatch:blocked.dispatch,now:()=>time,stallSeconds:.5});
  try{stalled.start(record,blocked.snapshot());for(let i=0;i<120&&stalled.state().phase==='running';i++){time+=1000/60;stalled.update(blocked.advance(1/60));}assert.equal(stalled.state().phase,'failed');assert.match(stalled.state().message,/stalled/);blocked.advance(1/60);assert.equal(blocked.snapshot().paused,true);}finally{stalled.dispose();blocked.dispose();}
});
