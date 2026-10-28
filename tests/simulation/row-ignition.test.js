import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation, DEFAULT_CONFIG} from '../../src/simulation/index.js';
import {compileBuildings, buildingPoint} from '../../src/content/buildings.js';
import {freePoint, lineClear} from '../../src/simulation/geometry.js';

const near = (a,b,eps=1e-7) => assert.ok(Math.abs(a-b)<eps, `${a} != ${b}`);
const run = (sim,seconds) => {for(let i=0;i<Math.round(seconds*60);i++)sim.advance(1/60);return sim.snapshot();};
const press = sim => {sim.dispatch({type:'primary',pressed:false});sim.dispatch({type:'primary',pressed:true});return sim.advance(1/60);};
const plain = extra => ({id:'ignition',width:12,height:8,player:{x:2.25,y:2.25,tool:'matches'},obstacles:[],actors:[],...extra});
const grass = [{x:0,y:0,width:12,depth:8,material:'grass'}];
const row = (count,q=0) => Array.from({length:count},(_,i)=>({id:'unit-'+i,prefabId:'monroe-row',...buildingPoint({x:30,y:30,quarterTurns:q},{x:i*7,y:0}),quarterTurns:q}));

test('one/two/three-unit rows derive exact local side IDs and sealed ground/heat planes at all four orientations',()=>{
  for(let q=0;q<4;q++)for(const count of [1,2,3]){
    const {buildings,obstacles}=compileBuildings(row(count,q),{width:64,height:64});
    for(let i=0;i<count;i++){
      const b=buildings[i],box=b.footprints[0];
      assert.deepEqual(b.partyWalls,{left:i?'unit-'+(i-1):null,right:i<count-1?'unit-'+(i+1):null});
      near(q%2?box.depth:box.width,7+(i?0:.09)+(i<count-1?0:.09));
      near(q%2?box.width:box.depth,13.18);
      assert.equal(box.heatBarriers.length,(i?1:0)+(i<count-1?1:0));
      if(i<count-1){
        const seam=buildingPoint(b,{x:7,y:6.5}),a=buildingPoint(b,{x:6.75,y:6.25}),c=buildingPoint(b,{x:7.25,y:6.25});
        assert.equal(freePoint(seam,.56,{width:64,height:64},obstacles),false);
        assert.equal(lineClear({...a,size:.5},{...c,size:.5},obstacles),false);
      }
    }
  }
});

test('row join allowance rejects arbitrary asserted joins and partial, wrong-pitch, rotated or unrelated overlaps',()=>{
  const a={id:'a',prefabId:'monroe-row',x:10,y:10,quarterTurns:0};
  for(const other of [{id:'b',prefabId:'monroe-row',x:17,y:10.01,quarterTurns:0},
    {id:'b',prefabId:'monroe-row',x:16.99,y:10,quarterTurns:0},{id:'b',prefabId:'monroe-row',x:17.01,y:10,quarterTurns:0},
    {id:'b',prefabId:'monroe-row',x:17,y:10,quarterTurns:1},{id:'b',prefabId:'hopkins-4-13',x:17,y:10,quarterTurns:0}])assert.throws(()=>compileBuildings([a,other]),/Overlapping/);
  assert.throws(()=>compileBuildings([{...a,partyWalls:{right:'made-up',left:null}}]),/Invalid/);
  const spaced=compileBuildings([a,{...a,id:'b',x:17.3}]);assert.equal(spaced.buildings[0].partyWalls.right,null);
});

test('the eight-instance demo keeps detached join/barrier metadata and original authored side intent through per-unit burnout/reset',()=>{
  const demo=createSimulation({scenario:'neighborhood'});
  try{const snapshot=demo.snapshot(),units=snapshot.world.buildings.filter(b=>b.prefabId==='monroe-row');
    assert.deepEqual([snapshot.world.width,snapshot.world.height],[51,47]);assert.equal(snapshot.world.buildings.length,8);
    assert.deepEqual(units.map(b=>[b.x,b.y,b.quarterTurns]),[[27,31,0],[34,31,0],[41,31,0]]);
    units[1].partyWalls.left='changed';snapshot.world.obstacles.find(o=>o.heatBarriers?.length).heatBarriers[0].width=999;
    assert.equal(demo.snapshot().world.buildings[6].partyWalls.left,'monroe-row-house');
    assert.notEqual(demo.snapshot().world.obstacles.find(o=>o.heatBarriers?.length).heatBarriers[0].width,999);
  }finally{demo.dispose();}
  for(let q=0;q<4;q++){
  const anchor=buildingPoint({x:13,y:13,quarterTurns:q},{x:-11,y:-8});
  const scene={width:26,height:26,player:{x:25,y:25},buildings:[0,1,2].map(i=>({id:'u'+i,prefabId:'monroe-row',...buildingPoint({...anchor,quarterTurns:q},{x:7*i,y:0}),quarterTurns:q})),obstacles:[],actors:[]};
  const initial=createSimulation({scenario:scene}),s=initial.snapshot(),boxes=s.world.buildings[0].footprints;
  const cells=s.cells.filter(c=>boxes.some(b=>Math.abs(c.x-b.x)<(b.width+c.size)/2-1e-9&&Math.abs(c.y-b.y)<(b.depth+c.size)/2-1e-9));initial.dispose();
  const sim=createSimulation({scenario:{...scene,ignitions:cells.map(c=>({x:c.x,y:c.y,radius:.001,heat:4}))},config:{fuel:{surfaceBurnRate:1},fire:{damagePerSecond:0}}});
  try{const partial=run(sim,.15);assert.equal(partial.world.obstacles.length,9);assert.ok(partial.world.buildings[0].burnedFraction>0);
    const spent=run(sim,1);assert.equal(spent.world.buildings[0].destroyed,true);assert.ok(spent.world.buildings.slice(1).every(b=>!b.destroyed));
    assert.equal(spent.world.obstacles.length,6);assert.equal(spent.world.buildings[1].partyWalls.left,'u0');
    const a=buildingPoint(scene.buildings[0],{x:6.75,y:5.25}),b=buildingPoint(scene.buildings[0],{x:7.25,y:5.25});
    assert.equal(lineClear({...a,size:.5},{...b,size:.5},spent.world.obstacles),false);
    sim.dispatch({type:'reset'});const reset=sim.advance(1/60);assert.equal(reset.world.obstacles.length,9);assert.equal(reset.world.buildings[1].partyWalls.left,'u0');
  }finally{sim.dispose();}
  }
});

test('one match edge seeds precisely one 1m tile at several aim offsets and solver resolutions without adjacent direct heat',()=>{
  for(const size of [.5,.25])for(const [x,y,tx,ty] of [[2.9,2.3,2,2],[3.05,2.25,3,2],[2.25,3.05,2,3],[1.45,2.25,1,2],[2.25,1.45,2,1],[2.85,2.85,2,2],[3.1,3.1,2,2]]){
    const sim=createSimulation({scenario:plain({fireCellSize:size,patches:grass}),config:{fire:{damagePerSecond:0}}});
    try{sim.dispatch({type:'aim',x,y});sim.dispatch({type:'primary',pressed:true});const s=sim.advance(1/60),use=s.events.find(e=>e.type==='tool-use'&&e.tool==='matches');
      assert.deepEqual(use.tile,{x:tx,y:ty,width:1,depth:1});assert.equal(use.result,'ignited');assert.equal(use.heatedCells,1/size**2);
      assert.equal(s.player.inventory.matches,11);assert.equal(s.cells.filter(c=>c.phase==='burning').length,1/size**2);
      assert.ok(s.cells.filter(c=>c.x<tx||c.x>=tx+1||c.y<ty||c.y>=ty+1).every(c=>c.heat===0));
      use.tile.x=99;use.cellIds[0]='changed';assert.equal(sim.snapshot().events.find(e=>e.type==='tool-use').tile.x,tx);
      sim.dispatch({type:'primary',pressed:true});run(sim,.05);assert.equal(sim.snapshot().player.inventory.matches,11);
    }finally{sim.dispose();}
  }
});

test('match feedback distinguishes bare/spent fuel and blocked tile portions, without inventing combustible substrate',()=>{
  const bare=createSimulation({scenario:plain()});try{const s=press(bare);assert.equal(s.events.at(-1).reason,'no-fuel');assert.equal(s.player.inventory.matches,11);assert.ok(s.cells.every(c=>c.heat===0));}finally{bare.dispose();}
  const gas=createSimulation({scenario:plain({fuelLines:[{from:{x:3.05,y:2.25},to:{x:3.95,y:2.25},litresPerMetre:.08}]}),config:{fire:{damagePerSecond:0}}});
  try{gas.dispatch({type:'aim',x:3.05,y:2.25});const first=press(gas);assert.equal(first.events.find(e=>e.type==='tool-use').result,'ignited');
    assert.ok(first.cells.some(c=>c.phase==='burning'));run(gas,8);const spent=press(gas);
    assert.equal(spent.events.at(-1).reason,'no-fuel');near(spent.diagnostics.fuel.fixtureFuel,spent.diagnostics.fuel.burnedDepositedFuel);
    assert.ok(spent.cells.every(c=>c.surfaceFuel===0));assert.equal(spent.player.inventory.matches,10);
  }finally{gas.dispose();}
  const wall={id:'wall',x:3,y:4,width:.1,depth:8,height:2,material:'masonry'};
  const blocked=createSimulation({scenario:plain({patches:grass,obstacles:[wall]})});
  try{blocked.dispatch({type:'aim',x:3.05,y:2.25});const s=press(blocked);assert.equal(s.events.at(-1).reason,'blocked');assert.equal(s.player.inventory.matches,11);assert.ok(s.cells.every(c=>c.heat===0));}finally{blocked.dispose();}
});

test('torch lights without ground heat or match cost, carries while moving/holstered, and ignites only on later edges',()=>{
  const sim=createSimulation({scenario:plain({player:{x:2.25,y:2.25,tool:'torch'},patches:grass}),config:{input:{cameraRelative:false},fire:{damagePerSecond:0}}});
  try{const light=press(sim);assert.equal(light.player.torch.phase,'lit');near(light.player.torch.durationSeconds,5/.12);assert.equal(light.player.inventory.matches,12);
    assert.equal(light.discharge.active,false);assert.ok(light.cells.every(c=>c.heat===0));
    sim.dispatch({type:'move',x:1,y:0});const carried=run(sim,1);assert.ok(carried.player.moving);assert.equal(carried.player.torch.phase,'lit');assert.ok(carried.cells.every(c=>c.heat===0));
    near(light.player.torch.remainingSeconds-carried.player.torch.remainingSeconds,1);
    sim.dispatch({type:'move',x:0,y:0});sim.dispatch({type:'aim',x:6.05,y:2.25});const fire=press(sim);
    assert.equal(fire.discharge.tool,'torch');assert.equal(fire.events.filter(e=>e.type==='tool-use'&&e.result==='ignited').length,1);
    assert.equal(sim.advance(1/60).discharge.active,false);run(sim,.1);assert.equal(sim.snapshot().events.filter(e=>e.type==='tool-use'&&e.result==='ignited').length,1);
    sim.dispatch({type:'primary',pressed:false});sim.dispatch({type:'select-tool',tool:'matches'});const before=sim.advance(1/60);const after=run(sim,.5);
    near(before.player.inventory.torchFuel-after.player.inventory.torchFuel,.12*.5);assert.equal(after.player.torch.phase,'lit');
    const detached=sim.snapshot();detached.player.torch.phase='spent';assert.equal(sim.snapshot().player.torch.phase,'lit');
  }finally{sim.dispose();}
});

test('torch follows world time under powder/pause, exhausts exactly once, resets unlit, and needs a new edge after cancellation',()=>{
  const sim=createSimulation({scenario:plain({player:{x:2.25,y:2.25,tool:'torch'},patches:grass}),config:{input:{cameraRelative:false},fire:{damagePerSecond:0}}});
  try{press(sim);sim.dispatch({type:'drug',drug:'powder'});const before=sim.snapshot(),after=run(sim,1);near(before.player.torch.remainingSeconds-after.player.torch.remainingSeconds,.35);
    sim.dispatch({type:'pause',paused:true});sim.advance(1/60);const paused=sim.snapshot();run(sim,.5);assert.deepEqual(sim.snapshot().player.torch,paused.player.torch);
    sim.dispatch({type:'pause',paused:false});sim.dispatch({type:'primary',pressed:true});const resume=sim.advance(1/60);assert.ok(resume.cells.every(c=>c.heat===0));
    assert.equal(press(sim).events.filter(e=>e.type==='tool-use'&&e.result==='ignited').length,1);
  }finally{sim.dispose();}
  const short=createSimulation({scenario:plain({player:{x:2.25,y:2.25,tool:'torch',inventory:{torchFuel:.012}}})});
  try{press(short);short.dispatch({type:'select-tool',tool:'matches'});const spent=run(short,.2);assert.equal(spent.player.torch.phase,'spent');near(spent.player.torch.remainingSeconds,0);
    assert.equal(spent.events.filter(e=>e.type==='torch-spent').length,1);run(short,.2);assert.equal(short.snapshot().events.filter(e=>e.type==='torch-spent').length,1);
    short.dispatch({type:'reset'});const reset=short.advance(1/60);assert.equal(reset.player.torch.phase,'unlit');near(reset.player.torch.remainingSeconds,.1);
  }finally{short.dispose();}
});

test('fixed-tick match/torch recordings agree across 30/60/144Hz presentation schedules',()=>{
  const snapshots=[30,60,144].map(hz=>{const sim=createSimulation({scenario:plain({player:{x:2.25,y:2.25,tool:'torch'},patches:grass}),config:{fire:{damagePerSecond:0}}});
    for(const command of [{type:'primary',pressed:true,atTick:1},{type:'primary',pressed:false,atTick:2},{type:'primary',pressed:true,atTick:3},
      {type:'drug',drug:'powder',atTick:15},{type:'primary',pressed:false,atTick:20},{type:'select-tool',tool:'matches',atTick:30},{type:'primary',pressed:true,atTick:31},
      {type:'pause',paused:true,atTick:60},{type:'pause',paused:false,atTick:80}])sim.dispatch(command);
    for(let i=0;i<hz*2;i++)sim.advance(1/hz);const s=sim.snapshot();delete s.diagnostics.alpha;delete s.diagnostics.lastSteps;sim.dispose();return s;
  });assert.deepEqual(snapshots[0],snapshots[1]);assert.deepEqual(snapshots[1],snapshots[2]);
});

test('held-out fuel traces keep gas fast, grass intermediate/shorter and timber slower/longer on normal and powder world clocks',t=>{
  function trace(kind,powder=false,barrier=false){
    const scene={width:8,height:3,player:{x:7,y:2},actors:[],obstacles:barrier?[{id:'stop',x:3.5,y:1.5,width:.1,depth:3,height:2,material:'masonry'}]:[],
      patches:kind==='gas'?[]:[{x:0,y:0,width:8,depth:3,material:kind}],
      fuelLines:kind==='gas'?[{from:{x:1.25,y:1.25},to:{x:6.75,y:1.25},litresPerMetre:.08}]:[],ignitions:[{x:1.25,y:1.25,radius:.01,heat:4}]};
    const sim=createSimulation({scenario:scene,config:{fire:{damagePerSecond:0}}});let arrival=null,realArrival=null,spent=null,ignited=null;
    try{if(powder)sim.dispatch({type:'drug',drug:'powder'});
      for(let i=0;i<1500;i++){const s=sim.advance(1/60),source=s.cells.find(c=>c.x===1.25&&c.y===1.25),target=s.cells.find(c=>c.x===4.25&&c.y===1.25);
        if(source.phase==='burning'&&ignited===null)ignited=s.clocks.world;
        if(target.phase==='burning'&&arrival===null){arrival=s.clocks.world;realArrival=s.clocks.active;}
        if(source.phase==='spent'&&spent===null)spent=s.clocks.world;
        if(arrival!==null&&spent!==null)break;
      }
      return{arrival,realArrival,burnSeconds:spent-ignited,worldFuel:sim.snapshot().diagnostics.fuel};
    }finally{sim.dispose();}
  }
  const normal=Object.fromEntries(['gas','grass','wood'].map(kind=>[kind,trace(kind)]));
  const powder=Object.fromEntries(['gas','grass','wood'].map(kind=>[kind,trace(kind,true)]));
  assert.ok(normal.gas.arrival<normal.grass.arrival&&normal.grass.arrival<normal.wood.arrival);
  assert.ok(normal.grass.burnSeconds<normal.wood.burnSeconds);
  for(const kind of ['gas','grass','wood']){assert.ok(Number.isFinite(normal[kind].arrival));near(normal[kind].burnSeconds,powder[kind].burnSeconds,.03);near(normal[kind].arrival,powder[kind].arrival,.2);assert.ok(powder[kind].realArrival>normal[kind].realArrival);}
  const stopped=trace('gas',false,true);assert.equal(stopped.arrival,null);near(stopped.worldFuel.remainingDepositedFuel+stopped.worldFuel.burnedDepositedFuel,stopped.worldFuel.fixtureFuel);
  t.diagnostic(JSON.stringify({normal,powder,barrierArrival:stopped.arrival}));
});

test('cancelled/dead/empty torches cannot repeat an action or relight, and invalid timer configuration cannot create nonfinite state',()=>{
  const sim=createSimulation({scenario:plain({player:{x:2.25,y:2.25,tool:'torch'},patches:grass}),config:{fire:{damagePerSecond:0}}});
  try{press(sim);sim.dispatch({type:'cancel-input'});sim.dispatch({type:'primary',pressed:true});const cancelled=run(sim,.1);
    assert.ok(cancelled.cells.every(c=>c.heat===0));assert.equal(cancelled.player.torch.phase,'lit');
    assert.equal(press(sim).events.filter(e=>e.type==='tool-use'&&e.result==='ignited').length,1);
  }finally{sim.dispose();}
  const paused=createSimulation({scenario:plain({player:{x:2.25,y:2.25,tool:'torch'},patches:grass})});
  try{paused.dispatch({type:'pause',paused:true});paused.advance(1/60);
    paused.dispatch({type:'primary',pressed:true});paused.advance(1/60);
    paused.dispatch({type:'pause',paused:false});paused.dispatch({type:'primary',pressed:true});const resumed=paused.advance(1/60);
    assert.equal(resumed.player.torch.phase,'unlit');assert.equal(resumed.events.some(e=>e.type==='torch-lit'),false);
    assert.equal(press(paused).player.torch.phase,'lit');
  }finally{paused.dispose();}
  const dead=createSimulation({scenario:plain({player:{x:2.25,y:2.25,tool:'torch',hp:.001,inventory:{torchFuel:.012}},
    fuelLines:[{from:{x:2,y:2.25},to:{x:2.5,y:2.25},litresPerMetre:1}],ignitions:[{x:2.25,y:2.25,radius:.01,heat:4}]})});
  try{press(dead);assert.equal(dead.snapshot().player.hp,0);dead.dispatch({type:'primary',pressed:true});const s=run(dead,.2);
    assert.equal(s.player.torch.phase,'spent');assert.equal(s.events.filter(e=>e.type==='torch-spent').length,1);
    assert.equal(s.events.filter(e=>e.type==='tool-use'&&e.result==='ignited').length,0);assert.equal(s.discharge.active,false);
  }finally{dead.dispose();}
  const empty=createSimulation({scenario:plain({player:{x:2.25,y:2.25,tool:'torch',inventory:{torchFuel:0}}})});
  try{const s=press(empty);assert.equal(s.player.torch.phase,'spent');assert.equal(s.events.at(-1).reason,'empty');assert.equal(s.events.some(e=>e.type==='torch-lit'),false);}finally{empty.dispose();}
  assert.throws(()=>createSimulation({config:{tools:{torch:{fuelPerSecond:0}}}}),/timing/);
  assert.throws(()=>createSimulation({config:{tools:{torch:{fuelPerSecond:Number.MIN_VALUE}}}}),/duration/);
});
