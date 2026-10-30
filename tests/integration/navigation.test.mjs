import test from 'node:test';
import assert from 'node:assert/strict';
import {createExploration} from '../../src/runtime/navigation.js';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {planRoute,walkRoute} from '../../tools/place-routes.mjs';
import {portalBounds} from '../../tools/place-geometry.mjs';
const rect=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]],near=(a,b,t=.03)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const floor=(id,polygon,height=0,extra={})=>({id,polygons:[polygon],holes:[],height,level:Math.round(height/2.12),label:id,...extra});
const scene=extra=>({placeId:'fixture',width:20,height:12,spawn:{x:3,y:3,elevation:0},camera:{followPlayer:true,span:12,phoneSpan:10},surfaces:[floor('ground',rect(0,0,20,12))],ceilings:[],blockers:[],portals:[],...extra});
const run=(sim,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++)sim.advance(1/60);return sim.snapshot();};
test('all native player envelopes ascend and descend a continuous 12-tread flight, with real height and no teleport',()=>{
  for(const characterId of ['goat','horse','bear']){
    const surfaces=[floor('lower',rect(0,0,6,12)),floor('upper',rect(10,0,20,12),2.12),...Array.from({length:12},(_,i)=>floor('tread-'+i,rect(6+i/3,2,6+(i+1)/3,4),(i+1)*2.12/12,{stairId:'flight'}))];
    const sim=createExploration({definition:scene({characterId,body:CHARACTER_PROFILES[characterId],surfaces}),config:{input:{cameraRelative:false}}});
    try{sim.dispatch({type:'move',x:1,y:0});let last=0,transitions=0;
      for(let i=0;i<60;i++){const s=sim.advance(1/60);assert.ok(Math.abs(s.player.elevation-last)<=.22+1e-6);if(s.player.elevation!==last)transitions++;last=s.player.elevation;}
      near(sim.snapshot().player.elevation,2.12);assert.ok(sim.snapshot().player.x>11);assert.equal(transitions,12);sim.dispatch({type:'move',x:-1,y:0});run(sim,1);
      near(sim.snapshot().player.elevation,0);near(sim.snapshot().player.x,3);assert.equal(sim.snapshot().player.characterId,characterId);
    }finally{sim.dispose();}
  }
});
test('holes, unsupported deck edges and low headroom stop the full body; source geometry is not shrunk to pass',()=>{
  const holes=[rect(7,0,9,12)],sim=createExploration({definition:scene({surfaces:[floor('deck',rect(0,0,20,12),0,{holes})]}),config:{input:{cameraRelative:false}}});
  try{sim.dispatch({type:'move',x:1,y:0});const s=run(sim,3);assert.ok(s.player.x<=6.5+.01);near(s.player.elevation,0);}finally{sim.dispose();}
  for(const [height,passes]of [[1.65,false],[2,true]]){
    const sim=createExploration({definition:scene({body:CHARACTER_PROFILES.bear,ceilings:[floor('overhang',rect(6,0,12,12),height+.12)]}),config:{input:{cameraRelative:false}}});
    try{sim.dispatch({type:'move',x:1,y:0});const s=run(sim,3);assert.equal(s.player.x>8,passes);}finally{sim.dispose();}
  }
  assert.throws(()=>createExploration({definition:scene({surfaces:[floor('too-narrow',rect(0,2.55,20,3.45))]})}),/Unsafe/);
});

test('a rising tread cannot push the head into a lintel that cleared the previous lower elevation',()=>{
  const sim=createExploration({definition:scene({body:CHARACTER_PROFILES.bear,surfaces:[floor('lower',rect(0,0,6,12)),floor('step',rect(6,0,20,12),.18)],blockers:[{id:'low-lintel',bounds:{min:[6,1.8,0],max:[7,2,12]}}]}),config:{input:{cameraRelative:false}}});
  try{sim.dispatch({type:'move',x:1,y:0});const s=run(sim,2);assert.ok(s.player.x<6);near(s.player.elevation,0);}finally{sim.dispose();}
});

test('overlapping floor holes form one empty opening while their real outer slab edges retain head collision',()=>{
  const sim=createExploration({definition:scene({spawn:{x:8.2,y:5,elevation:.53},surfaces:[floor('lower',rect(0,0,20,12),.53)],ceilings:[floor('upper',rect(0,0,20,12),2.12,{holes:[rect(6,2,10,8),rect(8,2,12,8)]})]}),config:{input:{cameraRelative:false}}});
  try{assert.equal(sim.canStand({x:8.2,y:5},.53),true);assert.equal(sim.canStand({x:11.8,y:5},.53),false);sim.dispatch({type:'move',x:-1,y:0});const s=run(sim,2);assert.ok(s.player.x>=6.49);}finally{sim.dispose();}
});

test('descending through a real slab opening clears the previous floor edge while an intact slab still blocks',()=>{
  const upper=floor('upper',rect(10,0,20,12),2.12),surfaces=[floor('lower',rect(0,0,6,12)),upper,...Array.from({length:12},(_,i)=>floor('tread-'+i,rect(6+i/3,2,6+(i+1)/3,4),(i+1)*2.12/12,{stairId:'flight'}))];
  const sim=createExploration({definition:scene({spawn:{x:12,y:3,elevation:2.12},surfaces,ceilings:[upper]}),config:{input:{cameraRelative:false}}});
  try{sim.dispatch({type:'move',x:-1,y:0});const s=run(sim,3);assert.ok(s.player.x<4);near(s.player.elevation,0);}finally{sim.dispose();}
  assert.throws(()=>createExploration({definition:scene({spawn:{x:9.5,y:3,elevation:11*2.12/12},surfaces,ceilings:[floor('uncut-slab',rect(0,0,20,12),2.12)]})}),/Unsafe exploration spawn/);
});
test('closed portals are solid, opening uses proximity, occupied thresholds cannot close and open leaves retain collision',()=>{
  const closed={min:[6,0,2.25],max:[6.16,2.3,3.75]},open={min:[6,0,3.75],max:[7.5,2.3,3.91]};
  const definition=scene({blockers:[{id:'leaf',portalId:'entry',bounds:closed,openBounds:open}],portals:[{id:'entry',position:[6,0,3],bounds:closed,label:'entry',reach:2.1}]});
  const sim=createExploration({definition,config:{input:{cameraRelative:false}}});
  try{sim.dispatch({type:'move',x:1,y:0});const blocked=run(sim,1);assert.ok(blocked.player.x<5.51);assert.equal(blocked.player.interaction.enabled,true);
    sim.dispatch({type:'interact'});run(sim,1/15);assert.ok(sim.snapshot().player.x>6);sim.dispatch({type:'move',x:0,y:0});sim.dispatch({type:'interact'});sim.advance(1/60);
    assert.equal(sim.snapshot().navigation.portalStates.entry,true);assert.equal(sim.snapshot().player.interaction.enabled,false);
    assert.equal(sim.canStand({x:6.7,y:3.8},0),false);
  }finally{sim.dispose();}
});
test('swept movement stops fast/hitched input at a thin wall and pauses/focus cancellation never replay movement',()=>{
  const sim=createExploration({definition:scene({blockers:[{id:'wall',bounds:{min:[8,0,0],max:[8.02,4,12]}}]}),config:{player:{speed:100},input:{cameraRelative:false}}});
  try{sim.dispatch({type:'move',x:1,y:0});let s=sim.advance(.25);assert.ok(s.player.x<=7.5+.001);sim.dispatch({type:'cancel-input'});const before=sim.snapshot().player.x;sim.advance(.25);near(sim.snapshot().player.x,before);
    sim.dispatch({type:'pause',paused:true});const start=sim.advance(1/60);run(sim,1);near(sim.snapshot().clocks.world,start.clocks.world);assert.equal(sim.dispatch({type:'drug',drug:'powder'}),false);
  }finally{sim.dispose();}
});

test('double-door closing checks both leaves and their open poses instead of only the first leaf',()=>{
  const leaves=[{portalId:'entry',bounds:{min:[6,0,2.9],max:[8,2.3,3.1]},openBounds:{min:[6,0,3],max:[6.2,2.3,5]}},{portalId:'entry',bounds:{min:[8,0,2.9],max:[10,2.3,3.1]},openBounds:{min:[9.8,0,3],max:[10,2.3,5]}}];
  const bounds=portalBounds(leaves,'entry');assert.deepEqual(bounds,{min:[6,0,2.9],max:[10,2.3,5]});assert.throws(()=>portalBounds(leaves,'unknown'),/no actual posed leaf/);
  const sim=createExploration({definition:scene({spawn:{x:9.3,y:3,elevation:0},blockers:leaves,portals:[{id:'entry',position:[8,0,3],bounds,label:'entry',reach:2.1,initiallyOpen:true}]})});
  try{assert.equal(sim.snapshot().player.interaction.enabled,false);sim.dispatch({type:'interact'});sim.advance(1/60);assert.equal(sim.snapshot().navigation.portalStates.entry,true);}finally{sim.dispose();}
});

test('opening cannot move a leaf into the player, enabled state agrees, and an ordinary centre opening still works',()=>{
  const closed={min:[6,0,2.25],max:[6.16,2.3,3.75]},open={min:[6,0,3.75],max:[7.5,2.3,3.91]},base={blockers:[{id:'leaf',portalId:'entry',bounds:closed,openBounds:open}],portals:[{id:'entry',position:[6,0,3],bounds:closed,label:'entry',reach:2.1}]};
  const sim=createExploration({definition:scene({...base,spawn:{x:6.8,y:4.2,elevation:0}}),config:{input:{cameraRelative:false}}});
  try{assert.equal(sim.snapshot().player.interaction.enabled,false);sim.dispatch({type:'interact'});sim.advance(1/60);assert.equal(sim.snapshot().navigation.portalStates.entry,false);assert.equal(sim.canStand(sim.snapshot().player,0),true);sim.dispatch({type:'move',x:0,y:1});assert.ok(run(sim,1).player.y>6);}finally{sim.dispose();}
  const centre=createExploration({definition:scene({...base,spawn:{x:5.4,y:3,elevation:0}})});
  try{assert.equal(centre.snapshot().player.interaction.enabled,true);centre.dispatch({type:'interact'});centre.advance(1/60);assert.equal(centre.snapshot().navigation.portalStates.entry,true);assert.equal(centre.canStand(centre.snapshot().player,0),true);}finally{centre.dispose();}
  const corner=createExploration({definition:scene({...base,spawn:{x:6.8,y:3,elevation:0},portals:[{...base.portals[0],bounds:{min:[6,0,2.25],max:[7.5,2.3,3.91]}}]})});
  try{assert.equal(corner.snapshot().player.interaction.enabled,true);corner.dispatch({type:'interact'});corner.advance(1/60);assert.equal(corner.snapshot().navigation.portalStates.entry,true);assert.equal(corner.snapshot().player.interaction.enabled,true);corner.dispatch({type:'interact'});corner.advance(1/60);assert.equal(corner.snapshot().navigation.portalStates.entry,false);}finally{corner.dispose();}
});
test('unloaded neighbours block crossing without removing current support, then become walkable when ready',()=>{
  let ready=false;const sim=createExploration({definition:scene(),isSectionReady:p=>p.x<4||ready,config:{input:{cameraRelative:false}}});
  try{sim.dispatch({type:'move',x:1,y:0});const s=run(sim,1);assert.ok(s.player.x<=4);assert.equal(s.navigation.waitingForSection,true);near(s.player.elevation,0);
    ready=true;assert.ok(run(sim,1).player.x>6);const detached=sim.snapshot();detached.player.inventory.matches=100;assert.equal(sim.snapshot().player.inventory.matches,0);
  }finally{sim.dispose();}
});
test('exploration recordings and stair height agree at 30/60/144Hz with normalized screen-relative movement',()=>{
  const values=[30,60,144].map(hz=>{const sim=createExploration({definition:scene()});sim.dispatch({type:'move',x:100,y:-100});for(let i=0;i<hz;i++)sim.advance(1/hz);const s=sim.snapshot();delete s.diagnostics.alpha;delete s.diagnostics.lastSteps;sim.dispose();return s;});
  assert.deepEqual(values[0],values[1]);assert.deepEqual(values[1],values[2]);near(values[0].player.travelled,9,1e-6);
});
test('QA route queries are read-only and the route runner climbs through public movement commands',async()=>{
  const definition=scene({surfaces:[floor('lower',rect(0,0,6,12)),floor('upper',rect(10,0,20,12),2.12),...Array.from({length:12},(_,i)=>floor('tread-'+i,rect(6+i/3,2,6+(i+1)/3,4),(i+1)*2.12/12,{stairId:'flight'}))]});
  const model=createExploration({definition}),sim=createExploration({definition});
  try{const before=model.snapshot(),from={x:3,y:3,elevation:0},target={x:12,y:3,elevation:2.12},planned=planRoute(model,from,target);assert.deepEqual(model.snapshot(),before);
    assert.equal(sim.dispatch({type:'teleport',...target}),false);assert.equal(sim.dispatch({type:'set-floor',level:1}),false);
    const result=await walkRoute(sim,planned.route);assert.ok(result.maxRise<.22);near(result.player.elevation,2.12);assert.ok(result.player.x>11.7);assert.ok(result.acceptedSegments>100);
  }finally{model.dispose();sim.dispose();}
});
test('overlapping solid source entry steps expose only their real top and cannot be entered through a tall side',()=>{
  for(const characterId of ['goat','horse','bear']){
    const treads=Array.from({length:12},(_,i)=>floor('solid-'+i,rect(6+i/3,2,10,4),(i+1)*2.12/12,{stairId:'entry',bottom:0}));
    const blockers=[...treads.map(t=>({id:t.id,stair:true,bounds:{min:[t.polygons[0][0][0],0,2],max:[10,t.height,4]}})),{id:'landing-fascia',bounds:{min:[10,1.9,2],max:[10.16,2.12,4]}}];
    const definition=scene({characterId,body:CHARACTER_PROFILES[characterId],surfaces:[floor('ground',rect(0,0,20,12)),floor('upper',rect(10,0,20,12),2.12),...treads],blockers});
    const sim=createExploration({definition,config:{input:{cameraRelative:false}}});
    try{sim.dispatch({type:'move',x:1,y:0});near(run(sim,1).player.elevation,2.12);sim.dispatch({type:'move',x:-1,y:0});const returned=run(sim,1);near(returned.player.elevation,0);near(returned.player.x,3);}finally{sim.dispose();}
    const side=createExploration({definition:{...definition,spawn:{x:8,y:1,elevation:0}},config:{input:{cameraRelative:false}}});
    try{side.dispatch({type:'move',x:0,y:1});const s=run(side,1);assert.ok(s.player.y<2-CHARACTER_PROFILES[characterId].radius+.01);near(s.player.elevation,0);}finally{side.dispose();}
  }
});
