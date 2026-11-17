import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeQueryRegistry} from '../../src/runtime/native-query-registry.js';
import {createPlaceNavigation} from '../../src/runtime/place-navigation.js';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createSceneThermal} from '../../src/simulation/scene-thermal.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
const rect=(x,z,w,d)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]];
const floor=(id,x,z,w,d,y,fuelClass='oil',fuelAmount=.05)=>({id,instanceId:'fixture',kind:'floor',normal:[0,1,0],material:'timber',fuelClass,fuelAmount,thickness:.12,triangles:[[[x,y,z],[x+w,y,z+d],[x+w,y,z]],[[x,y,z],[x,y,z+d],[x+w,y,z+d]]]});
const data=surfaces=>({version:1,runtimeAdapterVersion:1,prefabId:'query-control',buildingId:'fixture',implicitGround:false,gridOrigin:[0,0,0],groundY:0,levels:[],surfaces,items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]},scene:{version:1,instances:[{id:'fixture'}],doors:[]}});
const definition=(blockers=[])=>({placeId:'fixture',width:112,height:78,spawn:{x:2,y:2,elevation:0},surfaces:[{id:'grounds',terrain:true,height:0,polygons:[rect(0,0,12,8)],holes:[]}],ceilings:[],blockers,collisionShapes:{},portals:[]});
const wall={id:'opaque-unassigned',bounds:{min:[4.42,-5,-10],max:[4.58,12,20]}};

function sourceFixture(blockers){
  const nav=definition(blockers),compiled={data:data([floor('fixture::left',3,2,1,1,0),floor('fixture::right',5,2,1,1,0)]),instances:[{id:'fixture',data:{}}],sparsePublication:true,createQuerySource:()=>createNativeQueryRegistry({navigation:nav})},state={player:{id:'hero',x:3.5,y:2.5,elevation:0,height:1.66,radius:.5,hp:100},actors:[],tick:0,generation:0,clocks:{world:0}},provider=createSceneThermal({compiled,state,definition:{...nav,fireCellSize:.5},config:DEFAULT_CONFIG,event:()=>{}});
  return {provider,state};
}
test('unassigned native geometry screens a reachable matched heat receiver through the shared physical index',t=>{
  const {provider,state}=sourceFixture([wall]);
  try{
    assert.ok(provider.trial.scene.index.surfaces.get('fixture::query/opaque-unassigned').queryOnly);
    assert.ok(Math.abs(provider.trial.scene.initialFuel-.1)<1e-7,'Only native clipping epsilon affects the known finite source quantity');assert.equal(provider.trial.scene.fuels.size,8,'Only the two known one-metre patches create canonical native fuel');
    assert.equal(provider.lineClear(state.player,{x:5.5,y:2.5,elevation:0}),false);
    const hit=provider.trace([3.5,1.05,2.5],[6,1.05,2.5]);assert.equal(hit.surface.sourceSurfaceId,'fixture::query/opaque-unassigned');
    provider.cone(state.player,0,4.5,Math.PI/8,12/30,'flamethrower',null);provider.step(1/30,1/30);state.tick++;
    const target=[...provider.trial.scene.fuels.values()].filter(f=>f.sourceSurfaceId==='fixture::right');assert.ok(target.length);assert.ok(target.every(f=>f.char===0&&!f.lit));
    provider.trial.command({type:'match',position:[3.75,.015,2.25]});for(let i=0;i<90;i++){provider.step(1/30,(i+2)/30);state.tick++;}
    assert.ok([...provider.trial.scene.fuels.values()].some(f=>f.sourceSurfaceId==='fixture::left'&&f.lit));
    assert.ok(target.every(f=>f.char===0&&!f.lit&&f.cells.every(c=>c.heat===0)),'Known burning fuel cannot warm the known receiver through the opaque unassigned wall');
    assert.equal(provider.queryMetrics().fuelAllocated,0);assert.ok(provider.queryMetrics().shapeBuilds>0);
    assert.ok(provider.snapshot().length<100,'Large logical bounds do not produce a full-map ground raster');
  }finally{provider.dispose();}
  const clear=sourceFixture([]);
  try{
    assert.equal(clear.provider.lineClear(clear.state.player,{x:5.5,y:2.5,elevation:0}),true);
    clear.provider.cone(clear.state.player,0,4.5,Math.PI/8,12/30,'flamethrower',null);clear.provider.step(1/30,1/30);clear.state.tick++;
    const receiver=[...clear.provider.trial.scene.fuels.values()].filter(f=>f.sourceSurfaceId==='fixture::right');
    assert.ok(receiver.every(f=>f.cells.every(c=>c.heat===0)),'The initial cone alone has not directly heated the matched receiver');
    clear.provider.trial.command({type:'match',position:[3.75,.015,2.25]});for(let i=0;i<90;i++){clear.provider.step(1/30,(i+2)/30);clear.state.tick++;}
    assert.ok([...clear.provider.trial.scene.fuels.values()].some(f=>f.sourceSurfaceId==='fixture::left'&&f.lit));
    const maximumHeat=Math.max(...receiver.flatMap(f=>f.cells.map(c=>c.heat)));
    assert.ok(maximumHeat>0,'With only the opaque wall removed, the same source and elapsed time must actually warm this receiver');
    assert.equal(clear.provider.trial.tick,91);t.diagnostic(JSON.stringify({blockedReceiverHeat:0,noWallReceiverHeat:maximumHeat,nativeTicks:91,scope:'Combined native heat transport, not independent isolation of radiation and convection.'}));
  }finally{clear.provider.dispose();}
});

test('partial known-floor retirement cannot be resurrected by a static proxy or query reload',()=>{
  const nav={...definition(),surfaces:[{id:'upper-room',height:2.12,level:1,polygons:[rect(0,0,3,2)],holes:[]}]},reservation={surfaceId:'upper-room',height:2.12,polygon:rect(0,0,1,2)},queries=createNativeQueryRegistry({navigation:nav,floorReservations:[reservation]}),trial=createTrial(data([floor('fixture::known-floor',0,0,1,2,2.12,'frame',2)]),{querySource:queries});
  try{
    const support=x=>trial.scene.index.supportAt(x,1,2.15,1.9);assert.ok(support(.25));assert.ok(support(.75));assert.ok(support(1.75));
    const retired=[...trial.scene.index.surfaces.values()].filter(b=>b.sourceSurfaceId==='fixture::known-floor'&&b.bounds.max[0]<=.500001);assert.ok(retired.length);for(const b of retired)trial.scene.index.change(b.id,{intact:false});
    assert.equal(support(.25),undefined);assert.ok(support(.75),'The neighboring known thermal patch remains present');assert.ok(support(1.75),'The unrelated native floor stays present');
    queries.install(trial.scene.index);assert.equal(support(.25),undefined,'Reloading the source query layer cannot refill the reserved physical footprint');
    const native=createPlaceNavigation({definition:nav,body:{radius:.5,height:1.66,maxStep:.22},supportPresent(p,s){return !!trial.scene.index.supportAt(p.x,p.y,s.height+.03,s.height-.1);}});
    try{assert.equal(native.support({x:.5,y:1},2.12),null);assert.ok(native.support({x:1.75,y:1},2.12));}finally{native.dispose();}
  }finally{trial.dispose();queries.dispose();}
});

test('distant unassigned source registration does not allocate cold thermal cells or change a local fire trajectory',()=>{
  const run=extra=>{
    const queries=createNativeQueryRegistry({navigation:definition(extra)}),trial=createTrial(data([floor('fixture::known',3,2,1,1,0)]),{querySource:queries,executionCache:true});
    try{const cells=trial.scene.cells.size;trial.command({type:'match',position:[3.75,.015,2.25]});trial.step(45);const snap=trial.snapshot();return {cells,initial:trial.scene.initialFuel,heat:snap.cells,fuels:snap.fuels,ledger:snap.metrics.fuel};}finally{trial.dispose();queries.dispose();}
  };
  const far=Array.from({length:300},(_,i)=>({id:'far/'+i,bounds:{min:[50+i%30,0,30+Math.floor(i/30)],max:[50+i%30+.16,2,30+Math.floor(i/30)+.5]}}));
  assert.deepEqual(run(far),run([]));
});

test('a real native falling lantern hits the same unassigned solid and spills on the near side',()=>{
  const queries=createNativeQueryRegistry({navigation:definition([wall])}),trial=createTrial(data([floor('fixture::left',3,2,1,1,0),floor('fixture::right',5,2,1,1,0)]),{querySource:queries,executionCache:true});
  try{
    trial.command({type:'lantern',from:[3.5,2,2.5],velocity:[12,1,0]});
    for(let i=0;i<45;i++){
      trial.step();for(const f of trial.scene.fuels.values())if(f.id.startsWith('lantern:'))assert.ok(f.position[0]<4.421,'Falling payload cannot cross the opaque source face');
    }
    assert.ok(trial.events.some(e=>e.type==='impact'&&e.sourceSurfaceId==='fixture::query/opaque-unassigned'));
    assert.ok(trial.events.some(e=>e.type==='landing'&&e.position[0]<4.421));
    assert.ok(trial.events.some(e=>e.type==='oil-release'));
    assert.ok([...trial.scene.fuels.values()].filter(f=>f.sourceSurfaceId==='fixture::right').every(f=>!f.lit&&f.char===0));
    assert.ok(Math.abs(trial.metrics().fuel.error)<1e-7);
  }finally{trial.dispose();queries.dispose();}
});
