import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSimulation} from '../../src/simulation/index.js';
import {createExploration} from '../../src/runtime/navigation.js';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {worldToStick} from '../../src/simulation/geometry.js';

const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const move=vector=>({type:'move',...worldToStick(vector,DEFAULT_CONFIG.input)});
const advance=(sim,hz)=>{
  if(hz==='hitch')for(let i=0;i<5;i++)sim.advance(.2);
  else for(let i=0;i<hz;i++)sim.advance(1/hz);
  return sim.snapshot();
};
const read=id=>JSON.parse(fs.readFileSync(`assets/art/place-scenes/${id}/navigation.json`));
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const floor=(polygon,height=0)=>({id:'ground',height,level:0,label:'Ground',polygons:[polygon],holes:[]});

test('every native animal travels 9 metres in one active second on Catalogue Street and all three native landmark grounds',()=>{
  for(const id of ['catalogue-street','new-york','administration','horticulture']){
    const source=id==='catalogue-street'?null:read(id);
    for(const characterId of Object.keys(CHARACTER_PROFILES))for(const hz of [30,60,144,'hitch']){
      let sim;
      if(source){
        const ground=source.surfaces.find(surface=>surface.terrain),polygon=ground.polygons[0];
        const spawn={x:Math.min(...polygon.map(p=>p[0]))+2,y:Math.min(...polygon.map(p=>p[1]))+2,elevation:ground.height};
        sim=createExploration({definition:{...source,spawn,characterId,body:CHARACTER_PROFILES[characterId]}});
      }else sim=createSimulation({scenario:'neighborhood',characterId});
      try{
        const before=sim.snapshot();sim.dispatch(move({x:1,y:0}));const after=advance(sim,hz);
        near(after.player.x-before.player.x,9);near(after.player.y,before.player.y);near(after.player.travelled,9);
        near(after.clocks.active,1);near(after.clocks.world,1);near(after.clocks.player,1);
        assert.equal(after.player.characterId,characterId);near(after.player.radius,CHARACTER_PROFILES[characterId].radius);
      }finally{sim.dispose();}
    }
  }
});

test('diagonals stay normalized, powder travels 13.5 metres, and the speed change leaves fire, NPC and torch clocks unchanged',()=>{
  const scenario={width:64,height:16,player:{x:12,y:10,tool:'torch'},obstacles:[],
    actors:[{id:'walker',x:3,y:6,speed:1,route:[{x:3,y:6},{x:50,y:6}]}],
    fuelLines:[{from:{x:1.25,y:2.25},to:{x:11.25,y:2.25},litresPerMetre:.08}],ignitions:[{x:1.25,y:2.25,radius:.05,heat:2}]};
  for(const powdered of [false,true]){
    const results=[];
    for(const speed of [3,9]){
      const sim=createSimulation({scenario,config:{player:{speed}}});
      try{
        sim.dispatch({type:'primary',pressed:true});if(powdered)sim.dispatch({type:'drug',drug:'powder'});
        sim.dispatch({type:'move',x:1,y:-1});const s=advance(sim,60);
        near(s.player.travelled,speed*(powdered?1.5:1));
        near(Math.hypot(s.player.x-12,s.player.y-10),s.player.travelled);
        near(s.clocks.active,1);near(s.clocks.world,powdered?.35:1);near(s.clocks.player,powdered?1.5:1);
        if(powdered)near(s.effects.powder.remaining,7);
        results.push(s);
      }finally{sim.dispose();}
    }
    near(results[1].player.travelled/results[0].player.travelled,3);
    assert.deepEqual(results[1].clocks,results[0].clocks);assert.deepEqual(results[1].cells,results[0].cells);
    assert.deepEqual(results[1].actors,results[0].actors);assert.deepEqual(results[1].player.torch,results[0].player.torch);
  }
});

test('9 m/s and boosted travel keep native bodies outside thin walls, closed doors, low ceilings, drops and unloaded sections',()=>{
  for(const characterId of Object.keys(CHARACTER_PROFILES))for(const speed of [9,13.5])for(const hazard of ['wall','door','ceiling','drop','unloaded']){
    const definition={placeId:'safety',width:20,height:20,spawn:{x:3,y:3,elevation:0},characterId,body:CHARACTER_PROFILES[characterId],
      surfaces:[floor(rect(0,0,hazard==='drop'?8:20,20))],ceilings:[],blockers:[],portals:[]};
    if(hazard==='wall'||hazard==='door')definition.blockers.push({id:hazard,bounds:{min:[8,0,0],max:[8.02,3,20]},...(hazard==='door'?{portalId:'closed-door',openBounds:{min:[8,0,18],max:[10,3,18.02]}}:{})});
    if(hazard==='door')definition.portals.push({id:'closed-door',position:[8,0,3],label:'Door',reach:2.1,initiallyOpen:false});
    if(hazard==='ceiling')definition.ceilings.push({...floor(rect(8,0,20,20),1.72),id:'low-ceiling'});
    const sim=createExploration({definition,config:{player:{speed}},isSectionReady:point=>hazard!=='unloaded'||point.x<8});
    try{
      sim.dispatch(move({x:1,y:0}));for(let i=0;i<8;i++)sim.advance(.25);const s=sim.snapshot();
      assert.ok(s.player.x<=8-(hazard==='unloaded'?0:CHARACTER_PROFILES[characterId].radius)+.001,JSON.stringify({characterId,speed,hazard,x:s.player.x}));
      near(s.player.elevation,0);assert.equal(sim.canStand(s.player,0),true);
      if(hazard==='unloaded')assert.equal(s.navigation.waitingForSection,true);
      if(hazard==='door')assert.equal(s.navigation.portalStates['closed-door'],false);
    }finally{sim.dispose();}
  }
});

test('cancel, pause and fresh input recover on the real Administration spiral without replaying a held command',()=>{
  const source=read('administration'),stair=source.accessPlan.stairs.find(s=>s.id==='admin-front-west'),p=stair.path[8],q=stair.path[9];
  const length=Math.hypot(q[0]-p[0],q[2]-p[2]),command=move({x:(q[0]-p[0])/length,y:(q[2]-p[2])/length});
  for(const characterId of Object.keys(CHARACTER_PROFILES)){
    const sim=createExploration({definition:{...source,characterId,body:CHARACTER_PROFILES[characterId],spawn:{x:p[0]+source.sourceOffset[0],y:p[2]+source.sourceOffset[2],elevation:p[1]}}});
    try{
      sim.dispatch(command);sim.advance(1/30);sim.dispatch({type:'cancel-input'});const stopped=sim.advance(1/60);
      sim.advance(.2);near(sim.snapshot().player.travelled,stopped.player.travelled);
      sim.dispatch(command);assert.ok(sim.advance(1/30).player.travelled>stopped.player.travelled);
      sim.dispatch({type:'pause',paused:true});const paused=sim.advance(1/60);sim.dispatch(command);sim.advance(.2);
      assert.deepEqual(sim.snapshot().clocks,paused.clocks);near(sim.snapshot().player.travelled,paused.player.travelled);
      sim.dispatch({type:'pause',paused:false});sim.advance(.1);near(sim.snapshot().player.travelled,paused.player.travelled);
      sim.dispatch(command);assert.ok(sim.advance(1/60).player.travelled>paused.player.travelled);
    }finally{sim.dispose();}
  }
});
