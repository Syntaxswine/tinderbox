import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,DEFAULT_CONFIG} from '../../src/simulation/index.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('architect offset-corner replay preserves collision clearance and fuel at four render schedules',()=>{
  const obstacles=[
    {id:'offset-wall',x:7.125,y:5.5,width:.25,depth:7,height:3,material:'masonry',kind:'building'},
    {id:'return-wall',x:9,y:9.125,width:4,depth:.25,height:3,material:'masonry',kind:'building'}
  ];
  const recording=[
    {type:'primary',pressed:true,atTick:1},{type:'primary',pressed:false,atTick:1},
    {type:'move',x:1,y:.35,atTick:1},{type:'drug',drug:'powder',atTick:61},
    {type:'move',x:1,y:1,atTick:160},{type:'drug',drug:'inversion',atTick:210},
    {type:'cancel-input',atTick:300}
  ];
  const states=[];
  for(const schedule of [[1/30,150],[1/60,300],[1/120,600],[.2,25]]){
    const sim=createSimulation({scenario:{id:'architect-offset-corner',width:20,height:16,player:{x:2.75,y:4.25,tool:'jerry-can'},obstacles,actors:[]},config:{input:{cameraRelative:false}}});
    recording.forEach(command=>sim.dispatch(command));
    for(let frame=0;frame<schedule[1];frame++){
      const snapshot=sim.advance(schedule[0]),p=snapshot.player;
      for(const wall of obstacles){
        const dx=Math.max(Math.abs(p.x-wall.x)-wall.width/2,0),dy=Math.max(Math.abs(p.y-wall.y)-wall.depth/2,0);
        assert.ok(Math.hypot(dx,dy)>=DEFAULT_CONFIG.player.radius-1e-8,'Body crossed offset wall/corner');
      }
      const fuel=snapshot.diagnostics.fuel;
      close(4-p.inventory.gas,fuel.pouredFuel);close(fuel.pouredFuel,fuel.remainingDepositedFuel+fuel.burnedDepositedFuel);
    }
    const snapshot=sim.snapshot();
    close(snapshot.player.travelled*.08,snapshot.diagnostics.fuel.pouredFuel);
    assert.ok(snapshot.player.travelled>5,'Recording never exercised traversal');
    delete snapshot.diagnostics.alpha;delete snapshot.diagnostics.lastSteps;
    states.push(snapshot);sim.dispose();
  }
  states.slice(1).forEach(state=>assert.deepEqual(state,states[0]));
});

test('architect separated gasoline pools cannot propagate over an unfuelled paving gap',()=>{
  const sim=createSimulation({scenario:{id:'architect-dry-gap',width:16,height:10,player:{x:2,y:8},obstacles:[],actors:[],
    fuelLines:[{from:{x:2.25,y:4.25},to:{x:6.75,y:4.25},litresPerMetre:.08},{from:{x:9.25,y:4.25},to:{x:13.25,y:4.25},litresPerMetre:.08}],
    ignitions:[{x:2.25,y:4.25,radius:.01,heat:3}]}});
  let sawLeftFire=false;
  for(let tick=0;tick<360;tick++){
    const s=sim.advance(1/60);sawLeftFire ||= s.cells.some(cell=>cell.x<7&&cell.phase==='burning');
    assert.ok(s.cells.filter(cell=>cell.x>=9).every(cell=>cell.phase==='cold'),'Fire jumped dry noncombustible paving');
    const f=s.diagnostics.fuel;close(f.fixtureFuel,f.remainingDepositedFuel+f.burnedDepositedFuel);
  }
  assert.ok(sawLeftFire,'The lit pool never ignited');sim.dispose();
});
