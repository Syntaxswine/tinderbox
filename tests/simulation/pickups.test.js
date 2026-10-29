import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../../src/simulation/index.js';
import {pickupContacts} from '../../src/simulation/pickups.js';
const item=(id,kind,x,y=3)=>({id,kind,x,y});
const scene=extra=>({width:20,height:8,player:{x:2,y:3,hp:40,tool:'jerry-can'},obstacles:[],actors:[],pickups:[],...extra});
const make=(definition,extra={})=>createSimulation({scenario:definition,config:{input:{cameraRelative:false},fire:{damagePerSecond:0},...extra}});
const run=(sim,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++)sim.advance(1/60);return sim.snapshot();};

test('walk-over medicine uses one dose without stock commands and preserves accepted pouring, tool, aim and movement',()=>{
  for(const characterId of ['goat','horse','bear']){
    const sim=createSimulation({characterId,scenario:scene({pickups:[item('medicine','healing',3),item('powder','powder',3),item('inversion','inversion',3)]}),config:{input:{cameraRelative:false},fire:{damagePerSecond:0}}});
    try{
      const before=sim.snapshot();sim.dispatch({type:'aim',x:9,y:3});sim.dispatch({type:'primary',pressed:true});sim.dispatch({type:'move',x:1,y:0});let s;
      for(let i=0;i<60;i++){s=sim.advance(1/60);if(s.pickups.every(p=>p.consumed))break;}
      assert.ok(s.pickups.every(p=>p.consumed));assert.equal(s.player.hp,75);assert.equal(s.effects.powder.active,true);assert.equal(s.effects.inversion.active,true);
      assert.equal(s.player.tool,'jerry-can');assert.equal(s.player.pouring,true);assert.equal(s.player.moving,true);assert.deepEqual(s.aim,{x:9,y:3});
      for(const drug of ['healing','powder','inversion'])assert.equal(s.player.inventory[drug],before.player.inventory[drug]);
      assert.ok(Math.abs((before.player.inventory.gas-s.player.inventory.gas)-s.player.travelled*.08)<1e-8);
      sim.dispatch({type:'move',x:0,y:0});s=run(sim,.5);assert.equal(s.events.filter(e=>e.type==='pickup-used').length,3);assert.equal(s.events.filter(e=>e.type==='drug'&&e.source==='pickup').length,3);
      s.pickups[0].consumed=false;assert.equal(sim.snapshot().pickups[0].consumed,true);
    }finally{sim.dispose();}
  }
});

test('fast and powdered sweeps collect crossed items, while blocked requests and walls cannot collect',()=>{
  const fast=make(scene({pickups:[item('first','powder',3),item('second','healing',6)]}),{player:{speed:120}});
  try{fast.dispatch({type:'move',x:1,y:0});const s=fast.advance(.1);assert.ok(s.pickups.every(p=>p.consumed));assert.equal(s.events.filter(e=>e.type==='pickup-used').length,2);}finally{fast.dispose();}
  const wall={id:'wall',x:5,y:3,width:.02,depth:6,height:3,material:'masonry'},blocked=make(scene({obstacles:[wall],pickups:[item('behind','powder',5.4)]}),{player:{speed:120}});
  try{blocked.dispatch({type:'move',x:1,y:0});const s=blocked.advance(.25);assert.ok(s.player.x<4.45);assert.equal(s.pickups[0].consumed,false);assert.equal(s.effects.powder.active,false);}finally{blocked.dispose();}
  assert.equal(pickupContacts([{...item('across','powder',5.1),radius:.22,consumed:false}],[{x:4.9,y:3}],.56,[wall]).length,0);
});

test('full-health medicine remains, pause and death do not consume, and reset restores exactly the declared items',()=>{
  const full=make(scene({player:{x:2,y:3,hp:100},pickups:[item('medicine','healing',2)]}));
  try{assert.equal(run(full,.5).pickups[0].consumed,false);assert.equal(full.snapshot().events.filter(e=>e.type==='pickup-used').length,0);}finally{full.dispose();}
  for(const hp of [0,40]){
    const sim=make(scene({player:{x:2,y:3,hp},pickups:[item('medicine','healing',2)]}));
    try{sim.dispatch({type:'pause',paused:true});assert.equal(run(sim,.5).pickups[0].consumed,false);sim.dispatch({type:'pause',paused:false});const s=sim.advance(1/60);assert.equal(s.pickups[0].consumed,hp>0);
      if(hp>0){sim.dispatch({type:'reset'});sim.dispatch({type:'pause',paused:true});const reset=sim.advance(1/60);assert.equal(reset.pickups[0].consumed,false);assert.equal(reset.player.hp,hp);}
    }finally{sim.dispose();}
  }
});

test('pickup inversion reverses movement exactly once even when two doses refresh it, and powder never stacks multipliers',()=>{
  const sim=make(scene({pickups:[item('inversion-a','inversion',2),item('inversion-b','inversion',2),item('powder-a','powder',2),item('powder-b','powder',2)]}));
  try{sim.dispatch({type:'move',x:1,y:0});const a=sim.advance(1/60),b=sim.advance(1/60);assert.ok(a.player.x>2);assert.ok(b.player.x<a.player.x);assert.equal(b.clocks.playerScale,1.5);assert.equal(b.clocks.worldScale,.35);assert.ok(Math.abs(a.effects.inversion.remaining-8)<1e-8);assert.equal(b.events.filter(e=>e.type==='pickup-used').length,4);}finally{sim.dispose();}
});

test('automatic pickups preserve a carried lit torch and held flamethrower while powder affects the next world step',()=>{
  for(const tool of ['torch','flamethrower']){
    const sim=make(scene({player:{x:2,y:3,hp:40,tool},pickups:[item('powder','powder',2),item('medicine','healing',2),item('inversion','inversion',2)]}));
    try{sim.dispatch({type:'aim',x:7,y:3});sim.dispatch({type:'primary',pressed:true});sim.dispatch({type:'move',x:1,y:0});const first=sim.advance(1/60),second=sim.advance(1/60);
      assert.equal(second.player.tool,tool);assert.deepEqual(second.aim,{x:7,y:3});assert.equal(second.player.hp,75);assert.ok(second.player.x<first.player.x);assert.equal(second.events.filter(e=>e.type==='pickup-used').length,3);
      assert.ok(Math.abs(second.clocks.world-first.clocks.world-.35/60)<1e-10);
      if(tool==='torch'){assert.equal(second.player.torch.phase,'lit');assert.ok(Math.abs(first.player.torch.remainingSeconds-second.player.torch.remainingSeconds-.35/60)<1e-8);}
      else{assert.equal(second.discharge.active,true);assert.equal(second.discharge.tool,'flamethrower');assert.ok(second.player.inventory.flamethrowerFuel<first.player.inventory.flamethrowerFuel);}
    }finally{sim.dispose();}
  }
});

test('a later powder pickup refreshes duration without stacking and death cannot replay an old accepted path',()=>{
  const sim=make(scene({pickups:[item('first','powder',2),item('later','powder',4)]}));
  try{sim.dispatch({type:'move',x:1,y:0});let s;
    for(let i=0;i<120;i++){s=sim.advance(1/60);if(s.pickups[1].consumed)break;}
    assert.ok(s.pickups[1].consumed);assert.ok(s.clocks.active>.2);assert.ok(Math.abs(s.effects.powder.remaining-8)<1e-8);assert.equal(s.clocks.playerScale,1.5);assert.equal(s.events.filter(e=>e.type==='pickup-used').length,2);
  }finally{sim.dispose();}
  const dead=createSimulation({scenario:scene({player:{x:2.25,y:3.25,hp:1},ignitions:[{x:2.25,y:3.25,radius:.05,heat:3}],patches:[{x:0,y:0,width:20,depth:8,material:'grass'}],pickups:[item('unreached','healing',4,3.25)]}),config:{input:{cameraRelative:false},fire:{damagePerSecond:1000}}});
  try{dead.dispatch({type:'move',x:1,y:0});const s=run(dead,.5);assert.equal(s.player.hp,0);assert.equal(s.pickups[0].consumed,false);assert.equal(s.events.filter(e=>e.type==='pickup-used').length,0);}finally{dead.dispose();}
});

test('walk-over pickup replay remains identical at 30/60/144 Hz and bounded hitches',()=>{
  const rates=[30,60,144,'hitches'],results=rates.map(hz=>{
    const sim=make(scene({pickups:[item('powder','powder',3),item('medicine','healing',4),item('inversion','inversion',6)]}));
    try{sim.dispatch({type:'primary',pressed:true});sim.dispatch({type:'move',x:1,y:0});
      if(hz==='hitches')for(let i=0;i<10;i++)sim.advance(.2);else for(let i=0;i<hz*2;i++)sim.advance(1/hz);
      const s=sim.snapshot();delete s.diagnostics.alpha;delete s.diagnostics.lastSteps;return s;
    }finally{sim.dispose();}
  });for(const result of results.slice(1))assert.deepEqual(result,results[0]);
});

test('malformed, duplicate, obstructed or excessive pickup definitions fail before simulation starts',()=>{
  for(const pickups of [[item('same','powder',3),item('same','healing',4)],[item('bad','unknown',3)],[item('bad','powder',NaN)],[{...item('bad','powder',3),radius:2}],Array.from({length:65},(_,i)=>item('item-'+i,'powder',3))])assert.throws(()=>make(scene({pickups})),/pickup|unique|bounded/i);
  assert.throws(()=>make(scene({obstacles:[{id:'wall',x:3,y:3,width:1,depth:1,height:2,material:'masonry'}],pickups:[item('bad','powder',3)]})),/obstructed/);
});
