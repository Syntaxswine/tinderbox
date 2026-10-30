import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createExploration} from '../../src/runtime/navigation.js';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {worldToStick} from '../../src/simulation/geometry.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';

const rect=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]];
const floor=height=>({id:'floor',height,level:Math.round(height/2.12),label:'Floor',polygons:[rect(0,0,20,20)],holes:[]});
const leaf={id:'leaf-a',portalId:'a',bounds:{min:[6.4,0,3],max:[6.55,2.3,7]},openBounds:{min:[6.4,0,7],max:[8.4,2.3,7.15]}};
const door={id:'a',label:'library doors',position:[6.5,0,5],reach:2.1,stateful:true,initiallyOpen:false};
const definition=(extra={})=>({placeId:'doors',width:20,height:20,spawn:{x:5,y:5,elevation:0},surfaces:[floor(0)],ceilings:[],blockers:[leaf],portals:[door],...extra});
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const action=(sim,portalId,requested)=>{sim.dispatch({type:'interact',portalId,action:requested});return sim.advance(1/60);};

test('context exposes a detached stable door identity, human label, state/action, reason and native floor+2.15 anchor',()=>{
  const sim=createExploration({definition:definition()});
  try{
    assert.deepEqual(sim.snapshot().player.interaction,{id:'a',kind:'door',action:'open',label:'Open library doors',enabled:true,reason:'',anchor:[6.5,2.15,5]});
    const copy=sim.snapshot();copy.player.interaction.anchor[0]=999;near(sim.snapshot().player.interaction.anchor[0],6.5);
    sim.dispatch({type:'interact',portalId:'a',action:'open'});sim.dispatch({type:'interact',portalId:'a',action:'open'});
    const opened=sim.advance(1/60);assert.equal(opened.player.interaction.action,'close');assert.equal(opened.player.interaction.label,'Close library doors');assert.equal(opened.events.filter(e=>e.type==='portal-state').length,1);
    assert.equal(action(sim,'a','open').navigation.portalStates.a,true);assert.equal(action(sim,'a','close').navigation.portalStates.a,false);
    sim.dispatch({type:'pause',paused:true});const paused=sim.advance(1/60);assert.equal(paused.player.interaction.enabled,false);assert.match(paused.player.interaction.reason,/Paused/);action(sim,'a','open');assert.equal(sim.snapshot().navigation.portalStates.a,false);
  }finally{sim.dispose();}
});

test('targeted actions never redirect to a new nearest door; stale, unknown and malformed requests cannot toggle a neighbor',()=>{
  const b={id:'b',label:'study doors',position:[5,0,6.7],reach:2.1,stateful:true},otherLeaf={id:'leaf-b',portalId:'b',bounds:{min:[3,0,6.6],max:[7,2.3,6.75]},openBounds:{min:[7,0,6.7],max:[7.15,2.3,8.7]}};
  for(const [spawn,reachable] of [[{x:5,y:6,elevation:0},true],[{x:5,y:8.5,elevation:0},false]]){
    const sim=createExploration({definition:definition({spawn,blockers:[leaf,otherLeaf],portals:[door,b]})});
    try{
      assert.equal(sim.snapshot().player.interaction.id,'b');const next=action(sim,'a','open');assert.equal(next.navigation.portalStates.a,reachable);assert.equal(next.navigation.portalStates.b,false);
      action(sim,'unknown','open');assert.equal(sim.snapshot().navigation.portalStates.b,false);
      for(const command of [{type:'interact',portalId:'b'},{type:'interact',action:'open'},{type:'interact',portalId:'b',action:'toggle'},{type:'interact',portalId:null,action:'open'}])assert.equal(sim.dispatch(command),false);
      sim.dispatch({type:'interact'});sim.advance(1/60);assert.equal(sim.snapshot().navigation.portalStates.b,true);
    }finally{sim.dispose();}
  }
});

test('permanent, wrong-floor, distant, obstructed and unready doors expose no action and reject explicit stale targets',()=>{
  const variants=[
    {portals:[{...door,stateful:false,initiallyOpen:true}],blockers:[]},
    {surfaces:[floor(2.12)],spawn:{x:5,y:5,elevation:2.12}},
    {spawn:{x:3,y:5,elevation:0}},
    {blockers:[leaf,{id:'wall',bounds:{min:[5.8,0,0],max:[5.9,3,20]}}]},
    {ready:false}
  ];
  for(const variant of variants){
    const sim=createExploration({definition:definition(variant),isSectionReady:()=>variant.ready!==false});
    try{assert.equal(sim.snapshot().player.interaction,null);const before=sim.snapshot().navigation.portalStates;action(sim,'a',before.a?'close':'open');assert.deepEqual(sim.snapshot().navigation.portalStates,before);}finally{sim.dispose();}
  }
});

test('source-triangle reach uses the real fragment rather than filling its bounding box',()=>{
  const blocker={id:'fragment',shapeId:'fragment',matrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],bounds:{min:[5.8,0,3],max:[5.8,3,7]}};
  for(const [vertices,reachable] of [[[5.8,0,3,5.8,3,3,5.8,0,3.5],true],[[5.8,0,3,5.8,3,5,5.8,0,7],false]]){
    const sim=createExploration({definition:definition({blockers:[leaf,blocker],collisionShapes:{fragment:{vertices,indices:[0,1,2],closed:false}}})});
    try{assert.equal(!!sim.snapshot().player.interaction,reachable);assert.equal(action(sim,'a','open').navigation.portalStates.a,reachable);}finally{sim.dispose();}
  }
});

test('queued exact-target actions recheck current section readiness and an intervening door state',()=>{
  let ready=true;const a=createExploration({definition:definition(),isSectionReady:()=>ready});
  try{
    const cached=a.snapshot().player.interaction;a.dispatch({type:'interact',portalId:cached.id,action:cached.action});ready=false;
    assert.equal(a.advance(1/60).navigation.portalStates.a,false);assert.equal(a.snapshot().player.interaction,null);
    ready=true;assert.equal(action(a,cached.id,cached.action).navigation.portalStates.a,true);
  }finally{a.dispose();}
  const b={id:'b',label:'inner door',position:[5.8,0,5],reach:2.1,initiallyOpen:true};
  const blocker={id:'leaf-b',portalId:'b',bounds:{min:[5.75,0,4],max:[5.9,2.3,6]},openBounds:{min:[5.8,0,6],max:[6.8,2.3,6.15]}};
  const sim=createExploration({definition:definition({portals:[door,b],blockers:[leaf,blocker]})});
  try{
    sim.dispatch({type:'interact',portalId:'b',action:'close'});sim.dispatch({type:'interact',portalId:'a',action:'open'});
    const state=sim.advance(1/60);assert.equal(state.navigation.portalStates.b,false);assert.equal(state.navigation.portalStates.a,false);assert.equal(state.events.filter(e=>e.type==='portal-state').length,1);
  }finally{sim.dispose();}
});

test('exact-target requests retain full native-body destination-pose occupancy and never cancel held movement',()=>{
  for(const characterId of Object.keys(CHARACTER_PROFILES)){
    for(const [initiallyOpen,spawn,requested] of [[false,{x:7,y:7.6,elevation:0},'open'],[true,{x:6.3,y:5,elevation:0},'close']]){
      const sim=createExploration({definition:definition({characterId,body:CHARACTER_PROFILES[characterId],spawn,portals:[{...door,position:[6.5,0,6],initiallyOpen}]})});
      try{const context=sim.snapshot().player.interaction;assert.equal(context.id,'a');assert.equal(context.enabled,false);assert.match(context.reason,/clear/i);assert.equal(action(sim,'a',requested).navigation.portalStates.a,initiallyOpen);assert.equal(sim.canStand(sim.snapshot().player,0),true);}finally{sim.dispose();}
    }
    const sim=createExploration({definition:definition({characterId,body:CHARACTER_PROFILES[characterId]})});
    try{sim.dispatch({type:'move',...worldToStick({x:0,y:1},DEFAULT_CONFIG.input)});const s=action(sim,'a','open');assert.equal(s.navigation.portalStates.a,true);near(s.player.travelled,9/60);assert.ok(sim.advance(1/60).player.travelled>s.player.travelled);}finally{sim.dispose();}
  }
});

test('actual New York source leaves reject unsafe opening and closing for every native animal',()=>{
  const bytes=fs.readFileSync('assets/art/place-scenes/new-york/navigation.json'),data=JSON.parse(bytes),portal=data.portals.find(p=>p.id==='ny-front'),reports=[];
  for(const characterId of Object.keys(CHARACTER_PROFILES)){
    const scene=open=>({...data,characterId,body:CHARACTER_PROFILES[characterId],portals:data.portals.map(p=>p.id===portal.id?{...p,initiallyOpen:open}:p)});
    const closed=createExploration({definition:scene(false)}),open=createExploration({definition:scene(true)});let candidate;
    try{
      search:for(let dx=-1.75;dx<=1.75;dx+=.25)for(let dy=-1.75;dy<=1.75;dy+=.25){
        if(Math.hypot(dx,dy)>portal.reach)continue;
        const spawn={x:portal.position[0]+dx,y:portal.position[2]+dy,elevation:portal.position[1]};
        if(!closed.canStand(spawn,spawn.elevation)||open.canStand(spawn,spawn.elevation))continue;
        try{candidate=createExploration({definition:{...scene(false),spawn}});}catch(error){if(/Unsafe exploration spawn/.test(error.message))continue;throw error;}
        const context=candidate.snapshot().player.interaction;if(context?.id===portal.id&&!context.enabled)break search;candidate.dispose();candidate=null;
      }
      assert.ok(candidate,`Missing native opening-occupancy sample: ${characterId}`);
      const before=candidate.snapshot();assert.equal(before.player.interaction.reason,'Move clear of the door.');assert.equal(action(candidate,portal.id,'open').navigation.portalStates[portal.id],false);assert.equal(candidate.canStand(candidate.snapshot().player,candidate.snapshot().player.elevation),true);
      reports.push({characterId,action:'open',blocked:true,position:[before.player.x,before.player.elevation,before.player.y]});
    }finally{closed.dispose();open.dispose();candidate?.dispose();}
    const sim=createExploration({definition:{...scene(true),spawn:{x:portal.position[0],y:portal.position[2],elevation:portal.position[1]}}});
    try{
      const context=sim.snapshot().player.interaction;assert.equal(context.action,'close');assert.equal(context.enabled,false);assert.equal(context.reason,'Move clear of the door.');assert.equal(action(sim,portal.id,'close').navigation.portalStates[portal.id],true);assert.equal(sim.canStand(sim.snapshot().player,sim.snapshot().player.elevation),true);
      reports.push({characterId,action:'close',blocked:true,position:[sim.snapshot().player.x,sim.snapshot().player.elevation,sim.snapshot().player.y]});
    }finally{sim.dispose();}
  }
  if(process.env.TINDERBOX_CONTEXT_DOOR_EVIDENCE==='1')fs.writeFileSync('docs/engineering/contextual-doors/source-occupancy.json',JSON.stringify({task:'TB-031',portalId:portal.id,navigationSha256:createHash('sha256').update(bytes).digest('hex'),method:'Actual unchanged source leaf poses, measured native bodies and support. Fresh controlled near-door spawns; exact-target public commands reject overlap without trapping or moving the animal.',reports,passed:true},null,2)+'\n');
});

test('actual pinned landmark doors approach, open, traverse and close at native scale for all three animals',t=>{
  const reports=[];
  for(const placeId of ['new-york','administration','horticulture']){
    const path=`assets/art/place-scenes/${placeId}/navigation.json`,bytes=fs.readFileSync(path),data=JSON.parse(bytes);
    for(const portal of data.portals.filter(p=>p.stateful!==false))for(const characterId of Object.keys(CHARACTER_PROFILES)){
      const leaves=data.blockers.filter(b=>b.portalId===portal.id),extent=axis=>Math.max(...leaves.map(b=>b.bounds.max[axis]))-Math.min(...leaves.map(b=>b.bounds.min[axis]));
      const normal=extent(0)<extent(2)?{x:1,y:0}:{x:0,y:1};let sim,sign=1;
      for(const side of [1,-1])try{
        sim=createExploration({definition:{...data,characterId,body:CHARACTER_PROFILES[characterId],spawn:{x:portal.position[0]+normal.x*side*1.6,y:portal.position[2]+normal.y*side*1.6,elevation:portal.position[1]}}});sign=side;break;
      }catch(error){if(!/Unsafe exploration spawn/.test(error.message))throw error;}
      assert.ok(sim,`No safe source-door approach: ${portal.id}/${characterId}`);
      try{
        let s=sim.snapshot();assert.equal(s.player.interaction?.id,portal.id,`No clear source reach: ${portal.id}/${characterId}`);assert.ok(!/(?:ny-|admin-|hort-)/.test(s.player.interaction.label));
        if(s.navigation.portalStates[portal.id])action(sim,portal.id,'close');
        sim.dispatch({type:'move',...worldToStick({x:-normal.x*sign,y:-normal.y*sign},DEFAULT_CONFIG.input)});
        for(let i=0;i<20;i++)s=sim.advance(1/60);
        const before=(s.player.x-portal.position[0])*normal.x*sign+(s.player.y-portal.position[2])*normal.y*sign;
        assert.ok(before>=CHARACTER_PROFILES[characterId].radius-.02,`Closed source leaf leaked: ${portal.id}`);
        assert.equal(s.player.interaction?.enabled,true,`Source opening disabled: ${portal.id}/${characterId}`);
        s=action(sim,portal.id,'open');assert.equal(s.navigation.portalStates[portal.id],true);
        s=action(sim,portal.id,'open');assert.equal(s.navigation.portalStates[portal.id],true);
        let crossed=false;
        for(let i=0;i<90;i++){
          const along=(s.player.x-portal.position[0])*normal.x*sign+(s.player.y-portal.position[2])*normal.y*sign;
          if(along<=-1.5){crossed=true;break;}s=sim.advance(1/60);
        }
        assert.ok(crossed,`Source traversal stalled: ${portal.id}/${characterId} ${JSON.stringify(s.player)}`);
        sim.dispatch({type:'move',x:0,y:0});s=action(sim,portal.id,'close');assert.equal(s.navigation.portalStates[portal.id],false);assert.equal(sim.canStand(s.player,s.player.elevation),true);
        reports.push({placeId,portalId:portal.id,characterId,label:s.player.interaction?.label,anchor:s.player.interaction?.anchor,closedBlocked:true,traversed:true,closedSafely:true,navigationSha256:createHash('sha256').update(bytes).digest('hex')});
      }finally{sim.dispose();}
    }
  }
  assert.equal(reports.length,42);t.diagnostic(JSON.stringify({nativeDoorVisits:reports.length,passed:true}));
  if(process.env.TINDERBOX_CONTEXT_DOOR_EVIDENCE==='1')fs.writeFileSync('docs/engineering/contextual-doors/source-doors.json',JSON.stringify({task:'TB-031',method:'Fresh controlled native source approach; original supports, closed/open leaf collision, public movement/exact target actions, all sections ready. Not whole-map or WebGL acceptance.',reports,passed:true},null,2)+'\n');
});
