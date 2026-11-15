import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,DEFAULT_CONFIG,worldToStick} from '../../src/simulation/index.js';
import {HeatField} from '../../src/simulation/field.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';

const {step,fire,drugs,input}=DEFAULT_CONFIG;
const inactive={version:1,active:false,mode:'none',intensity:0,age:0};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const command=(sim,c)=>{assert.ok(sim.dispatch(c));return sim.advance(step);};
const base={id:'character-contact',width:12,height:10,player:{x:2.25,y:4.25,tool:'matches'},actors:[],obstacles:[]};
function strike(sim,x=2.25,y=4.25){
  sim.dispatch({type:'aim',x,y});sim.dispatch({type:'primary',pressed:true});sim.dispatch({type:'primary',pressed:false});return sim.advance(step);
}

test('warm paving damages the player without flame contact or a persistent burn',()=>{
  const sim=createSimulation({scenario:{...base,ignitions:[{x:2.25,y:4.25,radius:.1,heat:2}]}});
  try{
    assert.deepEqual(sim.snapshot().player.characterFire,inactive);
    const warm=sim.advance(step),cell=warm.cells.find(c=>c.x===2.25&&c.y===4.25);
    assert.ok(cell.heat>fire.damageHeatStart);assert.equal(cell.phase,'heating');assert.equal(cell.surfaceFuel+cell.depositedFuel,0);
    assert.ok(warm.player.hp<100);assert.deepEqual(warm.player.characterFire,inactive);
    assert.equal(warm.player.burn,undefined);assert.ok(!warm.events.some(e=>e.type==='actor-ignition'));
  }finally{sim.dispose();}
});

test('actual ground fuel contact follows world time, survives detached snapshot reads, and ends on exit without afterburn',()=>{
  const sim=createSimulation({scenario:{...base,patches:[{x:2,y:4,width:.5,depth:.5,material:'grass'}]}});
  try{
    const lit=strike(sim),start={...lit.player.characterFire};
    assert.ok(lit.cells.some(c=>c.phase==='burning'&&c.surfaceFuel>0));
    assert.equal(start.mode,'contact');assert.equal(start.active,true);assert.ok(start.intensity>0);near(start.age,0);
    lit.player.characterFire.age=999;lit.player.characterFire.active=false;
    assert.deepEqual(sim.snapshot().player.characterFire,start);
    assert.deepEqual(sim.snapshot().player.characterFire,start);
    const burning=sim.advance(.2);near(burning.player.characterFire.age,.2);
    const paused=command(sim,{type:'pause',paused:true});
    assert.deepEqual(sim.advance(.25).player.characterFire,paused.player.characterFire);
    sim.dispatch({type:'pause',paused:false});sim.dispatch({type:'drug',drug:'powder'});
    const slow=sim.advance(.2);near(slow.player.characterFire.age-paused.player.characterFire.age,.2*drugs.worldScale);
    const old={...slow.player.characterFire},oldX=slow.player.x;
    sim.dispatch({type:'move',...worldToStick({x:1,y:0},input)});
    const exited=sim.advance(.1);near(exited.player.x-oldX,DEFAULT_CONFIG.player.speed*drugs.playerScale*.1);
    assert.deepEqual(exited.player.characterFire,inactive);assert.equal(exited.player.burn,undefined);
    const stopped=command(sim,{type:'move',x:0,y:0}),hp=stopped.player.hp;
    near(sim.advance(.25).player.hp,hp);assert.deepEqual(slow.player.characterFire,old);
    assert.deepEqual(command(sim,{type:'reset'}).player.characterFire,inactive);
  }finally{sim.dispose();}
});

test('proven contact remains visible with damage disabled and clears on real death',()=>{
  const scenario={...base,patches:[{x:2,y:4,width:.5,depth:.5,material:'grass'}]};
  const safe=createSimulation({scenario,config:{fire:{damagePerSecond:0}}});
  try{const s=strike(safe);assert.equal(s.player.hp,100);assert.equal(s.player.characterFire.active,true);}finally{safe.dispose();}
  const doomed=createSimulation({scenario:{...scenario,player:{...base.player,hp:.01}}});
  try{const s=strike(doomed);assert.equal(s.player.hp,0);assert.deepEqual(s.player.characterFire,inactive);assert.ok(s.events.some(e=>e.type==='death'));}finally{doomed.dispose();}
});

test('the existing moving-NPC cone burn keeps its damage, refresh, expiry and death semantics',()=>{
  const scenario={...base,player:{x:2.25,y:4.25,tool:'flamethrower'},actors:[{id:'runner',x:4.75,y:4.25,speed:1,route:[{x:4.75,y:4.25},{x:10.75,y:4.25}]}]};
  const sim=createSimulation({scenario});
  try{
    sim.dispatch({type:'primary',pressed:true});const a=sim.advance(.15),b=sim.advance(.1);
    assert.equal(b.diagnostics.burningCells,0);assert.equal(b.actors[0].characterFire.mode,'timed');
    assert.equal(b.player.characterFire.active,false);assert.ok(b.actors[0].burn.expiresAt>a.actors[0].burn.expiresAt);
    // Existing field heat and timed burn stack. Measure each real fixed step
    // against the original field formula, including warm paving without fuel.
    let previous=b;
    for(let i=0;i<6;i++){
      const s=sim.advance(step),actor=s.actors[0],cell=s.cells.find(c=>Math.floor(c.x/.5)===Math.floor(actor.x/.5)&&Math.floor(c.y/.5)===Math.floor(actor.y/.5));
      const exposure=Math.max(cell.phase==='burning'?cell.intensity:0,Math.max(0,Math.min(1,(cell.heat-fire.damageHeatStart)/fire.damageHeatSpan)));
      near(previous.actors[0].hp-actor.hp,(exposure+1)*fire.damagePerSecond*step);previous=s;
    }
    near(b.actors[0].characterFire.age-a.actors[0].characterFire.age,.1);
    const expires=previous.actors[0].burn.expiresAt;sim.dispatch({type:'primary',pressed:false});
    let s=sim.advance(.25);while(s.clocks.world<expires+.1)s=sim.advance(.25);
    assert.equal(s.actors[0].burn,undefined);assert.deepEqual(s.actors[0].characterFire,inactive);
    assert.equal(s.events.filter(e=>e.type==='actor-ignition').length,1);
    assert.deepEqual(command(sim,{type:'reset'}).actors[0].characterFire,inactive);
  }finally{sim.dispose();}
  const doomed=createSimulation({scenario:{...scenario,actors:[{...scenario.actors[0],hp:5}]}});
  try{doomed.dispatch({type:'primary',pressed:true});let s=doomed.advance(.25);s=doomed.advance(.25);assert.equal(s.actors[0].hp,0);assert.equal(s.actors[0].burn,undefined);assert.deepEqual(s.actors[0].characterFire,inactive);}finally{doomed.dispose();}
});

test('flat legacy exposure keeps its old damage value but cannot claim contact on another floor or in afterglow',()=>{
  const def=scenarioDefinition({...base,patches:[{x:2,y:4,width:.5,depth:.5,material:'grass'}]}),field=new HeatField(def,DEFAULT_CONFIG,[]),point={x:2.25,y:4.25};
  field.emit(point,.1,2,'match');field.step(step,step,()=>{});
  const ground=field.sampleCharacterExposure(point),upper=field.sampleCharacterExposure({...point,elevation:2.12});
  assert.ok(ground.directFlame>0);assert.equal(upper.directFlame,0);assert.equal(upper.exposure,ground.exposure);assert.equal(field.exposure(point),ground.exposure);
  let seconds=step;while(field.at(point).phase==='burning'&&seconds<30){seconds+=step;field.step(step,seconds,()=>{});}
  assert.equal(field.at(point).phase,'spent');assert.equal(field.sampleCharacterExposure(point).directFlame,0);
});

test('overlapping contact and timed burn retain one presentation age as a native-speed runner leaves the fuel',()=>{
  const sim=createSimulation({scenario:{...base,player:{...base.player,tool:'flamethrower'},patches:[{x:4,y:4,width:1,depth:.5,material:'grass'}],actors:[{id:'runner',x:4.25,y:4.25,speed:2.4,route:[{x:4.25,y:4.25},{x:10.25,y:4.25}]}]}});
  try{
    sim.dispatch({type:'primary',pressed:true});let previous,union=false,timed=false;
    for(let i=0;i<30;i++){
      const s=sim.advance(step),marker=s.actors[0].characterFire;
      if(marker.active&&previous?.active)near(marker.age-previous.age,step);
      union||=marker.mode==='both';timed||=union&&marker.mode==='timed';previous=marker;
    }
    assert.ok(union);assert.ok(timed);assert.ok(previous.age>0);
  }finally{sim.dispose();}
});
