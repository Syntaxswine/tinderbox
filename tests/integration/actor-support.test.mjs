import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,DEFAULT_CONFIG,worldToStick} from '../../src/simulation/index.js';
import {compileSharedMapPilot} from '../../src/content/shared-map-pilot.js';
const rectangle=[[0,0],[4,0],[4,4],[0,4]];
const id='fixture::floor',surface={id,instanceId:'fixture',sourceMeshBindings:['floor-part'],kind:'floor',level:1,normal:[0,1,0],material:'timber',fuelClass:'frame',fuelAmount:16,thickness:.12,triangles:[[[0,2.12,0],[4,2.12,4],[4,2.12,0]],[[0,2.12,0],[0,2.12,4],[4,2.12,4]]]};
const nav={version:1,placeId:'fixture',width:8,height:8,spawn:{x:2,y:2,elevation:2.12},sourceBounds:{min:[0,0,0],max:[8,4,8]},occupiedLevels:[1],surfaces:[{id:'grounds',terrain:true,height:0,level:0,label:'Ground',polygons:[[[0,0],[8,0],[8,8],[0,8]]],holes:[]},{id:'upper-room',height:2.12,level:1,label:'Upper floor',polygons:[rectangle],holes:[],interior:true}],ceilings:[],blockers:[],collisionShapes:{},portals:[]};
const pilot={version:1,placeId:'fixture',sourceOffsetApplied:true,sourceBounds:nav.sourceBounds,surfaces:[surface],carriers:[{id,fuelClass:'frame',fuelAmount:16}],activeCarrierIds:[id],boundaryBindings:{},floorReservations:[{height:2.12,polygon:rectangle,sourceIds:[id]}],limitations:{}};

for(const characterId of ['goat','horse','bear'])test('a ticking native '+characterId+' falls from a local floor hole and lands on real ground with pause preserving world time',()=>{
  const compiled=compileSharedMapPilot(pilot,nav),original=compiled.createNavigation;let trial;
  compiled.createNavigation=options=>{trial=options.trial;return original(options);};
  const sim=createSimulation({gameplayMap:compiled,characterId});try{
    sim.advance(1/30);const before=sim.snapshot();assert.equal(before.player.elevation,2.12);assert.equal(before.player.interior,true);
    const cells=trial.boundariesForSource(id);let removed=0;for(const b of cells)if(b.bounds.min[0]>=.999999&&b.bounds.max[0]<=3.000001&&b.bounds.min[2]>=.999999&&b.bounds.max[2]<=3.000001){trial.scene.index.change(b.id,{intact:false});removed++;}
    assert.ok(removed);assert.ok(cells.some(b=>b.intact),'The same floor retains its neighboring patches');
    let s=sim.advance(1/30);assert.ok(s.player.elevation<before.player.elevation);assert.equal(s.player.falling,true);assert.equal(s.player.x,2);assert.equal(s.player.y,2);assert.equal(s.player.interior,before.player.interior,'Keep the last occupied interior cut while airborne; this does not supply support');
    sim.dispatch({type:'pause',paused:true});s=sim.advance(1/30);const pausedY=s.player.elevation,world=s.clocks.world;s=sim.advance(.2);assert.equal(s.player.elevation,pausedY);assert.equal(s.clocks.world,world);
    sim.dispatch({type:'pause',paused:false});for(let i=0;i<45;i++)s=sim.advance(1/30);
    assert.ok(Math.abs(s.player.elevation)<1e-5);assert.equal(s.player.falling,false);assert.equal(s.player.hp,before.player.hp,'No new fall damage is introduced');assert.equal(s.player.level,0);assert.equal(s.player.interior,false,'Real ground landing adopts its own exterior presentation context');
    assert.ok(s.events.some(e=>e.type==='actor-fall'));assert.ok(s.events.some(e=>e.type==='actor-landed'));
  }finally{sim.dispose();}
});

test('powder slows native fall time while unsupported pouring spends no oil or player-clock movement',()=>{
  const run=powder=>{
    const compiled=compileSharedMapPilot(pilot,nav),original=compiled.createNavigation;let trial;
    compiled.createNavigation=options=>{trial=options.trial;return original(options);};
    if(powder)compiled.definition.pickups=[{id:'powder',kind:'powder',x:2,y:2,elevation:2.12}];
    const sim=createSimulation({gameplayMap:compiled,characterId:'goat'});try{
      sim.dispatch({type:'select-tool',tool:'jerry-can'});sim.dispatch({type:'primary',pressed:true});sim.advance(1/30);
      assert.equal(sim.snapshot().player.pouring,true);if(powder)assert.ok(sim.snapshot().effects.powder.active);
      for(const b of trial.boundariesForSource(id))if(b.bounds.min[0]>=.999999&&b.bounds.max[0]<=3.000001&&b.bounds.min[2]>=.999999&&b.bounds.max[2]<=3.000001)trial.scene.index.change(b.id,{intact:false});
      sim.dispatch({type:'move',...worldToStick({x:1,y:0},DEFAULT_CONFIG.input)});
      const start=trial.tick,active=sim.snapshot().clocks.active,gas=sim.snapshot().player.inventory.gas,poses=[];let last=start;
      while(trial.tick<start+15){const s=sim.advance(1/60);if(trial.tick!==last){last=trial.tick;poses.push(s.player.elevation);}assert.equal(s.player.x,2);assert.equal(s.player.y,2);assert.equal(s.player.inventory.gas,gas);}
      const result={poses,activeSeconds:sim.snapshot().clocks.active-active};assert.equal([...trial.scene.fuels.values()].filter(f=>f.loose).length,0);return result;
    }finally{sim.dispose();}
  };
  const ordinary=run(false),powder=run(true);assert.deepEqual(powder.poses,ordinary.poses);assert.ok(powder.activeSeconds>ordinary.activeSeconds);
});
