import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {composeSandbox} from '../../workbenches/bell-and-alder-sandbox/compose.js';
import {createSandboxRuntime,partitionSandboxFrame} from '../../workbenches/bell-and-alder-sandbox/runtime.js';
import {createGrayboxData} from '../../workbenches/bell-and-alder-closing/graybox-data.js';
import {compileScene} from '../../workbenches/furnished-house/scene.js';
import {createSupportGraph} from '../../workbenches/furnished-house/support.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('../../workbenches/'+f,import.meta.url)));
const plane=(id,x,z,w,d,y,{kind='floor',...extra}={})=>({id,kind,level:0,normal:[0,1,0],material:'wood',fuelClass:'frame',fuelAmount:w*d,thickness:.12,sourceMeshBindings:[],triangles:[[[x,y,z],[x+w,y,z+d],[x+w,y,z]],[[x,y,z],[x,y,z+d],[x+w,y,z+d]]],...extra});
const yard=()=>({version:1,prefabId:'yard',levels:[],surfaces:[plane('paving',-8,-8,45,30,0,{kind:'ground',material:'brick',fuelClass:null,fuelAmount:0})],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]}});
function flights(d){const t=d.surfaces.filter(s=>s.supportType==='stair-tread');if(!t.length)return [];return [{id:'stairs',treadSourceIds:t.map(s=>s.id),lower:{elevation:d.levels[0].floorY,surfaceIds:d.surfaces.filter(s=>s.level===0&&s.supportType!=='stair-tread'&&['floor','ground'].includes(s.kind)).map(s=>s.id)},upper:{elevation:d.levels[1].floorY,surfaceIds:d.surfaces.filter(s=>s.level===1&&s.kind==='floor'&&s.supportType!=='stair-tread').map(s=>s.id)}}];}
function fixture(native=false){const shop=native?read('bell-and-alder-closing/scene-data.json'):createGrayboxData(),house=native?read('furnished-house/house-data.json'):{version:1,prefabId:'fixture-house',levels:[{id:'level-0',index:0,floorY:0}],surfaces:[plane('floor',0,0,4,4,0)],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]}};shop.levels.forEach((l,i)=>l.id??='level-'+i);const sources={shop,house,yard:yard()},manifest={version:1,prefabId:'bell-and-alder-sandbox-v1',controlInstance:'shop',groundY:0,bounds:{min:[-8,-1,-8],max:[40,10,25]},instances:[{id:'shop',kind:'closing',source:'shop',translation:[0,0,0],quarterTurns:0,stairFlights:flights(shop)},{id:'house',kind:'furnished',source:'house',translation:[22,0,0],quarterTurns:1,stairFlights:flights(house)},{id:'yard',kind:'yard',source:'yard',translation:[0,0,0],quarterTurns:0,stairFlights:[]}]};return {manifest,sources};}

test('native sources prepare separately, qualify references and preserve rigid geometry, UVs and local levels without mutation',()=>{
  const {manifest,sources}=fixture(true),original=JSON.stringify(sources),{data,instances}=composeSandbox(manifest,sources),house=instances.find(i=>i.id==='house').data;
  assert.equal(JSON.stringify(sources),original);assert.equal(data.stairFlights.length,2);assert.ok(house.items.some(i=>i.nativeId==='inert-ornament/native-chimney'));assert.ok(house.furnitureParts.filter(p=>p.inert).every(p=>p.supportSurfaceIds.every(id=>id.startsWith('house::'))));
  assert.deepEqual(house.levels.map(l=>l.floorY),[.48,2.6]);assert.deepEqual(instances[0].data.levels.map(l=>l.floorY),[0,2.12]);
  assert.equal(data.closingTime.lantern.supportItemId,'shop::bell-and-alder:parlor-lamp');assert.equal(data.closingTime.lantern.assetId,'city1880-hand-lantern-lit');
  const vertex=sources.house.render.geometry[0].triangles[0].vertices[0],placed=house.render.geometry[0].triangles[0].vertices[0];assert.ok(Math.abs(placed[0]-(22+vertex[2]))<1e-8);assert.ok(Math.abs(placed[2]+vertex[0])<1e-8);assert.deepEqual(placed.slice(6),vertex.slice(6));
  assert.ok(data.surfaces.every(s=>s.id.startsWith(s.instanceId+'::')));assert.ok(data.surfaces.filter(s=>s.supportType==='stair-tread').every(s=>s.stairFlightId.startsWith(s.instanceId+'::')));
});
test('composition rejects a missing/duplicate/cross-instance flight, scale-like placement and dangling ownership',()=>{
  for(const mutate of [f=>f.manifest.instances[0].stairFlights=[],f=>f.manifest.instances[0].stairFlights[0].treadSourceIds.push(f.manifest.instances[0].stairFlights[0].treadSourceIds[0]),f=>f.manifest.instances[0].stairFlights[0].upper.surfaceIds=['house::floor'],f=>f.manifest.instances[1].quarterTurns=.5,f=>f.sources.house.items.push({id:'bad',partIds:['absent']})]){const f=fixture(true);mutate(f);assert.throws(()=>composeSandbox(f.manifest,f.sources));}
});
test('malformed finite finish reports its qualified instance and source before trial construction',()=>{
  const f=fixture();f.sources.yard.items.push({id:'crate',partIds:['crate/timber']});f.sources.yard.furnitureParts.push({id:'crate/timber',itemId:'crate',fuelClass:'furniture',fuelAmount:1,finish:{class:'finish',amount:.1}});assert.throws(()=>composeSandbox(f.manifest,f.sources),/yard::crate\/timber \(yard\)/);
});
test('two disjoint native stair flights never brace or detach one another',()=>{
  const surfaces=[],stairFlights=[];for(const [id,x]of [['a',0],['b',10]]){const low=id+'::low',high=id+'::high',treads=[];surfaces.push(plane(low,x,-1,1,1,0,{instanceId:id}),plane(high,x,1.5,1,1,.53,{instanceId:id,supportSurfaceIds:[low]}));for(let i=0;i<3;i++){const s=plane(id+'::t'+i,x,i*.5,1,.5,(i+1)*.53/3,{instanceId:id,supportType:'stair-tread',stairFlightId:id+'::stairs'});surfaces.push(s);treads.push(s.id);}stairFlights.push({id:id+'::stairs',instanceId:id,treadSourceIds:treads,lower:{elevation:0,surfaceIds:[low]},upper:{elevation:.53,surfaceIds:[high]}});}
  const scene=compileScene({version:1,surfaces,items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],groundY:0,sandbox:{version:1},stairFlights}),graph=createSupportGraph(scene);
  assert.equal(graph.diagnostics().stairFlights.length,2);for(const [id,links]of graph.links)if(id.startsWith('a::'))assert.ok([...links].every(other=>!other.startsWith('b::')));
  for(const b of scene.index.surfaces.values())if(b.sourceSurfaceId==='a::low')scene.index.change(b.id,{intact:false});
  const detached=graph.unsupported({force:true});assert.ok(detached.some(s=>s.sourceSurfaceId==='a::t0'));assert.ok(detached.every(s=>!s.sourceSurfaceId.startsWith('b::')));
});
test('one authoritative trial keeps qualified actors, native identity, object ownership and reset generations consistent',()=>{
  const f=fixture(),compiled=composeSandbox(f.manifest,f.sources),r=createSandboxRuntime(compiled.data);try{
    const first=r.frame({full:true});assert.deepEqual(first.closingTime.actors.map(a=>a.role).sort(),['officer','player','resident']);assert.ok(first.closingTime.actors.every(a=>a.id.startsWith('shop::')));assert.equal(first.closingTime.actors.find(a=>a.role==='officer').native.id,'chicago-beat-officer');assert.equal(first.closingTime.lantern.assetId,'city1880-hand-lantern-lit');
    assert.equal(new Set(first.sandbox.instances.map(i=>i.id)).size,3);assert.equal(r.trial.scene.data,compiled.data);const before=r.trial.snapshot();r.snapshot();r.frame();assert.deepEqual(r.trial.snapshot(),before);
    r.command({type:'move-world',x:1,z:0});r.step(3);r.command({type:'reset'});const reset=r.frame({full:true});assert.equal(reset.closingTime.actors.length,3);assert.equal(reset.closingTime.lantern.phase,'placed');assert.equal(reset.closingTime.lantern.ownerId,null);assert.equal(reset.closingTime.generation,first.closingTime.generation+1);assert.equal(reset.falls.length,0);assert.equal(reset.fireSamples.length,0);
  }finally{r.dispose();}
});
test('generated fuel, cross-building flight/rubble and tombstones reach exactly one origin view',()=>{
  const f=fixture(),r=createSandboxRuntime(composeSandbox(f.manifest,f.sources).data);try{
    r.trial.command({type:'lantern',from:[1,.95,1],velocity:[0,0,0]});r.step();const fuel=r.trial.scene.fuels.get('lantern:1');assert.ok(fuel);fuel.position=[24,.2,-2];
    const frame=r.frame({full:true}),sample=frame.fireSamples.find(s=>s.id==='lantern:1');assert.equal(sample.ownerInstanceId,'shop');const fall=frame.falls.find(s=>s.id==='lantern:1');assert.equal(fall.ownerInstanceId,'shop');
    frame.rubble=[{id:'rubble:lantern:1',ownerInstanceId:'shop',position:[24,0,-2],fuelIds:['lantern:1']}];frame.tombstones=[{collection:'falls',id:'lantern:1',ownerInstanceId:'shop'}];
    for(const key of ['fireSamples','falls','rubble','tombstones']){const id=frame[key].find(v=>v.id.includes('lantern:1')).id;assert.equal(['shop','house','yard'].reduce((n,i)=>n+partitionSandboxFrame(frame,i)[key].filter(v=>v.id===id).length,0),1);assert.equal(partitionSandboxFrame(frame,'house')[key].some(v=>v.id===id),false);}
  }finally{r.dispose();}
});
test('powder plus moving pour preserves fixed schedules and publishes one-time automatic pickup state',()=>{
  const f=fixture();f.manifest.pickups=[{id:'yard::powder',kind:'powder',position:[4.3,0,9.4]}];
  function run(schedule){const r=createSandboxRuntime(composeSandbox(f.manifest,f.sources).data);try{r.command({type:'select-tool',tool:'jerry-can'});r.command({type:'primary',pressed:true});r.command({type:'primary',pressed:false});r.command({type:'move-world',x:1,z:0});for(const dt of schedule)r.advance(dt);const s=r.snapshot({thermal:true}),frame=r.frame({full:true});assert.equal(frame.sandbox.pickups[0].consumed,true);assert.equal(s.events.filter(e=>e.type==='pickup').length,1);assert.ok(s.thermal.metrics.fuel.added>0);assert.ok(frame.rubble.every(r=>r.ownerInstanceId==='yard'));assert.equal(s.clocks.worldScale,.35);return s;}finally{r.dispose();}}
  assert.deepEqual(run([.6]),run(Array(60).fill(.01)));
});
test('render ownership never blocks heat transfer or a real landing on another instance',()=>{
  const f=fixture();Object.assign(f.manifest.instances[1],{translation:[8,0,0],quarterTurns:0});const r=createSandboxRuntime(composeSandbox(f.manifest,f.sources).data);try{
    r.trial.command({type:'match',position:[7.75,.01,1],from:[7,.9,1]});r.step(120);const cell=r.trial.scene.cells.get(r.trial.scene.key(r.trial.scene.coords([8.25,.01,1])));assert.ok(cell.heat>0);assert.ok(cell.fuels.some(f=>f.id.includes('house::')));
    r.command({type:'reset'});r.trial.command({type:'lantern',from:[7.6,.95,1],velocity:[3,0,0]});r.step(18);
    const landing=r.trial.events.find(e=>e.type==='landing'&&e.fallId==='lantern:1');assert.ok(landing);assert.ok(landing.supportBoundaryId.startsWith('house::'));assert.ok(landing.position[0]>8);
    const frame=r.frame({full:true}),children=[...r.trial.scene.fuels.values()].filter(f=>f.id.startsWith('lantern:1:spill:'));assert.ok(children.length>0);for(const sample of frame.fireSamples.filter(s=>s.id.startsWith('lantern:1')))assert.equal(sample.ownerInstanceId,'shop');assert.ok(Math.abs(r.trial.metrics().fuel.error)<1e-7);assert.equal(frame.tombstones.find(t=>t.id==='lantern:1').ownerInstanceId,'shop');
  }finally{r.dispose();}
});
