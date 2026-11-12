import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrial,calmWind} from '../../workbenches/furnished-house/simulation.js';
import {createBoundaryIndex} from '../../workbenches/furnished-house/geometry.js';
import {createNavigation} from '../../workbenches/furnished-house/navigation.js';
import fs from 'node:fs';
import {bearingPiers} from '../../workbenches/furnished-house/fixtures.js';
const floor=(id,y,material='masonry',fuelAmount=0)=>({id,kind:'floor',normal:[0,1,0],thickness:.12,material,fuelClass:'frame',fuelAmount,triangles:[[[0,y,0],[2,y,0],[2,y,2]],[[0,y,0],[2,y,2],[0,y,2]]]});
function oilFixture(upper=true){const y=upper?2.12:0,bounds={min:[.6,y,.6],max:[.9,y+.5,.9]};return {version:1,prefabId:'oil-review',gridOrigin:[0,0,0],surfaces:[floor('lower',0),...(upper?[floor('upper',y,'timber',4),...bearingPiers()]:[])],items:[{id:'store',position:[.75,y,.75],bounds}],furnitureParts:[{id:'oil',itemId:'store',material:'oil',fuelClass:'oil',fuelAmount:3,bounds}],stores:[{id:'oil-store',kind:'oil',fuelPartId:'oil',amount:3}]};}
test('retained frames publish unlit heating, charring and subsequent cooling',()=>{
  const trial=createTrial({version:1,prefabId:'heat-frame',gridOrigin:[0,0,0],surfaces:[floor('wood',0,'timber',4)]},{wind:calmWind});trial.frame();
  trial.command({type:'heat',position:[.75,.53,.75],energy:.375});trial.step();const heated=trial.frame(),patch=heated.boundaries.find(b=>b.heatFraction>0);
  assert.ok(patch);assert.equal(trial.metrics().burningCount,0);assert.ok(patch.charFraction>0);
  trial.step();const cooled=trial.frame().boundaries.find(b=>b.id===patch.id);assert.ok(cooled);assert.ok(cooled.heatFraction<patch.heatFraction);assert.equal(cooled.intact,true);
});
test('finite upper oil puddles fall through lost support and land without duplication or repeated burn',()=>{
  const trial=createTrial(oilFixture(),{wind:calmWind,rules:{loss:0}}),store=trial.scene.fuels.get('oil');trial.command({type:'heat',position:store.cells[0].position,energy:.4});trial.step();
  const spills=[...trial.scene.fuels.values()].filter(f=>f.spill);assert.equal(spills.length,9);assert.ok(spills.every(f=>f.position[1]>2));
  const total=trial.metrics().fuel.initial;
  for(const b of trial.scene.index.surfaces.values())if(b.sourceSurfaceId==='upper')trial.scene.index.change(b.id,{intact:false});
  trial.step();const falling=trial.frame();assert.equal(falling.falls.filter(f=>f.fuelIds.some(id=>id.startsWith('oil:spill:'))).length,9);
  trial.step(60);const frame=trial.frame();assert.ok(spills.every(f=>f.position[1]<.1&&!f.falling));assert.ok(frame.tombstones.some(t=>t.collection==='falls'));assert.equal(trial.metrics().fuel.initial,total);
  assert.ok(Math.abs(trial.metrics().fuel.error)<1e-9);assert.equal(trial.stats.maxBurnsPerFuelPerTick,1);
});
test('a container above an existing hole sends its finite oil along actual falling paths',()=>{
  const data=oilFixture();data.surfaces=data.surfaces.filter(s=>s.id!=='upper');const trial=createTrial(data,{wind:calmWind,rules:{loss:0}}),store=trial.scene.fuels.get('oil');
  trial.command({type:'heat',position:store.cells[0].position,energy:.4});trial.step();const release=trial.events.find(e=>e.type==='oil-release');assert.ok(release);assert.ok(release.targets.every(t=>t.fall));assert.ok(trial.frame().falls.length>0);
  trial.step(90);assert.ok([...trial.scene.fuels.values()].filter(f=>f.spill).every(f=>f.position[1]<.1));assert.ok(Math.abs(trial.metrics().fuel.error)<1e-9);
});
test('a blocked finite oil store remains full and may retry after a path becomes available',()=>{
  const data=oilFixture(false);data.surfaces=[]; // Replace terrain query only, keeping the real finite store.
  data.surfaces=[floor('reference',10)];const trial=createTrial(data,{wind:calmWind,rules:{loss:0}}),store=trial.scene.fuels.get('oil'),supportAt=trial.scene.index.supportAt;
  trial.scene.index.supportAt=()=>null;trial.command({type:'heat',position:store.cells[0].position,energy:.4});trial.step();
  assert.equal(store.store.reacted,false);assert.equal(store.amount,3);assert.equal(trial.events.some(e=>e.type==='oil-release'),false);
  trial.scene.index.supportAt=supportAt;trial.step(30);assert.equal(store.store.reacted,true);assert.ok(trial.events.some(e=>e.type==='oil-release'));assert.ok(Math.abs(trial.metrics().fuel.error)<1e-9);
});
test('moving a canonical door invalidates newly intersected as well as previously crossed cached paths',()=>{
  const triangles=x=>[[[x,0,0],[x,2,0],[x,2,2]],[[x,0,0],[x,2,2],[x,0,2]]],index=createBoundaryIndex([{id:'leaf',triangles:triangles(1),transmission:0,normal:[1,0,0]}]);let invalidations=0;
  index.watchPath([2.5,1,.5],[3.5,1,.5],()=>invalidations++);assert.equal(index.trace([2.5,1,.5],[3.5,1,.5]).transmission,1);
  index.change('leaf',{solidTriangles:triangles(3),bounds:{min:[3,0,0],max:[3,2,2]}});assert.equal(invalidations,1);assert.equal(index.trace([2.5,1,.5],[3.5,1,.5]).transmission,0);
});
test('a lantern breaks glass then stops at the following masonry in the same tick',()=>{
  const plane=(id,x,kind,material)=>({id,kind,material,normal:[1,0,0],thickness:0,triangles:[[[x,0,0],[x,2,0],[x,2,1]],[[x,0,0],[x,2,1],[x,0,1]]]}),data={version:1,prefabId:'layered-impact',surfaces:[plane('glass',1,'window','glass'),plane('wall',1.05,'wall','masonry')]},trial=createTrial(data);
  trial.command({type:'lantern',from:[.95,1,.25],velocity:[5,0,0]});trial.step();const f=trial.frame().falls[0];assert.ok(f.position[0]<1.05);assert.ok(trial.events.some(e=>e.type==='window-break'));assert.ok(trial.events.some(e=>e.type==='impact'&&e.sourceSurfaceId==='wall'));assert.ok([...trial.scene.index.surfaces.values()].filter(b=>b.sourceSurfaceId==='wall').every(b=>b.intact));
});
test('spent wood becomes passable while the actual inert iron stove component remains',()=>{
  const bounds={min:[.6,0,.6],max:[.9,1,.9]},data={version:1,prefabId:'spent-parts',surfaces:[floor('ground',0)],items:[{id:'chair',position:[.75,0,.75],bounds},{id:'stove',position:[1.5,0,.75],bounds:{min:[1.4,0,.6],max:[1.7,1,.9]}}],furnitureParts:[{id:'wood',itemId:'chair',bounds,material:'timber',fuelClass:'furniture',fuelAmount:1},{id:'iron',itemId:'stove',material:'iron',bounds:{min:[1.4,0,.6],max:[1.7,1,.9]},fuelClass:null,fuelAmount:0}]},trial=createTrial(data,{profiles:{furniture:{threshold:1,delay:0,seconds:.1,energy:10}}}),nav=createNavigation(trial,{radius:.1});
  assert.equal(nav.clear([.4,0,.75],[.75,0,.75]),false);const f=trial.scene.fuels.get('wood');f.lit=true;f.litAt=0;trial.step(4);const frame=trial.frame();
  assert.equal(trial.scene.items.get('chair').intact,false);assert.equal(nav.clear([.4,0,.75],[.75,0,.75]),true);assert.equal(trial.scene.parts.get('iron').intact,true);assert.equal(nav.clear([1.2,0,.75],[1.5,0,.75]),false);assert.ok(frame.parts.some(p=>p.id==='wood'&&!p.intact));
});
test('native worktable follows its own footprint supports, independently of the source group pivot under the stove',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../workbenches/furnished-house/house-data.json',import.meta.url))),id='item/l0/kitchen/work-table';
  for(const removeTable of [true,false]){const trial=createTrial(data),table=trial.scene.items.get(id),supportIds=removeTable?table.supportSurfaceIds:trial.scene.items.get('item/l0/kitchen/stove').supportSurfaceIds;
    assert.ok(table.position[0]<table.bounds.min[0]);for(const b of trial.scene.index.surfaces.values())if(supportIds.includes(b.sourceSurfaceId))trial.scene.index.change(b.id,{intact:false});trial.step();assert.equal(table.falling,removeTable);
    if(removeTable){trial.step(60);const landing=trial.events.find(e=>e.type==='landing'&&e.itemId===id);assert.ok(landing);assert.ok(['plinth','ground'].includes(trial.scene.index.surfaces.get(landing.supportBoundaryId).kind));assert.ok(landing.contactPosition[0]>=table.bounds.min[0]&&landing.contactPosition[0]<=table.bounds.max[0]);assert.ok(table.position[1]<.48);}
  }
});
test('navigation includes the actual sixteen-centimetre wall thickness',()=>{
  const wall=(id,x)=>({id,kind:'wall',material:'timber',normal:[1,0,0],thickness:.16,fuelClass:'partition',fuelAmount:2,triangles:[[[x,0,0],[x,2,0],[x,2,2]],[[x,0,0],[x,2,2],[x,0,2]]]}),trial=createTrial({version:1,prefabId:'native-throat',surfaces:[floor('ground',0),wall('left',0),wall('right',1)]});
  const retained=createNavigation(trial),smallerDiagnostic=createNavigation(trial,{radius:.4});assert.equal(retained.clear([.5,0,.5],[.5,0,1]),false);assert.equal(smallerDiagnostic.clear([.5,0,.5],[.5,0,1]),true);
});
test('cold fuel-free native stove fall has no ignition or smoke and survives JSON serialization',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../workbenches/furnished-house/house-data.json',import.meta.url))),trial=createTrial(data),stove=trial.scene.items.get('item/l0/kitchen/stove');
  for(const b of trial.scene.index.surfaces.values())if(stove.supportSurfaceIds.includes(b.sourceSurfaceId))trial.scene.index.change(b.id,{intact:false});trial.step();const fall=trial.frame().falls.find(f=>f.itemId===stove.id);assert.ok(fall);assert.deepEqual(fall.fuelIds,[]);assert.equal(fall.ignitionTime,null);assert.equal(fall.flame,0);assert.equal(fall.smoke,0);assert.deepEqual(JSON.parse(JSON.stringify(fall)),fall);
});
test('an unburned roof loses its actual bearing, falls with the same finite fuel and stops on the inert support',()=>{
  const column={id:'bearing',kind:'wall',material:'timber',normal:[1,0,0],thickness:.16,fuelClass:'partition',fuelAmount:2,triangles:[[[.5,0,0],[.5,2,0],[.5,2,1]],[[.5,0,0],[.5,2,1],[.5,0,1]]]},roof={...floor('roof',2.06,'timber',4),kind:'roof'},trial=createTrial({version:1,prefabId:'bearing-control',groundY:-.12,surfaces:[floor('stone',0),column,roof]});
  assert.equal(trial.supportGraph.diagnostics().unresolvedInitial,0);const roofFuels=[...trial.scene.fuels.values()].filter(f=>f.sourceSurfaceId==='roof'),initial=roofFuels.reduce((v,f)=>v+f.amount,0);
  for(const b of trial.scene.index.surfaces.values())if(b.sourceSurfaceId==='bearing')trial.scene.index.change(b.id,{intact:false});trial.step();assert.ok(trial.events.some(e=>e.type==='mechanical-support-loss'&&e.sourceSurfaceId==='roof'));assert.ok(roofFuels.every(f=>f.falling&&!f.lit));
  trial.step(90);assert.ok(roofFuels.every(f=>!f.falling&&f.position[1]<.2));assert.equal(roofFuels.reduce((v,f)=>v+f.amount,0),initial);assert.ok(trial.events.length<100);assert.ok(JSON.stringify(trial.snapshot()).length<100000);assert.ok(Math.abs(trial.metrics().fuel.error)<1e-9);
});
test('a vertically falling lantern grazes a wall edge without repeated up-nudges or an event storm',()=>{
  const wall={id:'edge',kind:'wall',material:'masonry',normal:[1,0,0],thickness:0,triangles:[[[0,0,0],[0,2,0],[0,2,1]],[[0,0,0],[0,2,1],[0,0,1]]]},trial=createTrial({version:1,prefabId:'grazing-fall',surfaces:[floor('stone',0),wall]});trial.command({type:'lantern',from:[0,2.2,.25],velocity:[0,0,0]});trial.step(90);
  assert.ok(trial.events.some(e=>e.type==='landing'));assert.ok(trial.events.length<50);assert.equal(trial.frame().falls.length,0);assert.ok(Math.abs(trial.metrics().fuel.error)<1e-9);assert.ok(JSON.stringify(trial.snapshot()).length<100000);
});
test('landed structural rubble survives its flight tombstone and becomes inert ash without new fuel',()=>{
  const column={id:'post',kind:'wall',material:'timber',normal:[1,0,0],thickness:.16,fuelClass:'partition',fuelAmount:2,triangles:[[[.5,0,0],[.5,2,0],[.5,2,1]],[[.5,0,0],[.5,2,1],[.5,0,1]]]},roof={...floor('roof',2.06,'timber',4),kind:'roof'},trial=createTrial({version:1,prefabId:'rubble-control',groundY:-.12,surfaces:[floor('stone',0),column,roof]},{profiles:{frame:{threshold:1.3,delay:3,seconds:.2,energy:10}}});
  const initial=trial.metrics().fuel.initial;trial.frame();for(const b of trial.scene.index.surfaces.values())if(b.sourceSurfaceId==='post')trial.scene.index.change(b.id,{intact:false});trial.step(60);const landed=trial.frame();assert.ok(landed.rubble.length);assert.ok(landed.tombstones.some(t=>t.collection==='falls'));assert.ok(landed.rubble.every(r=>r.thickness===.01&&r.nonBearing&&r.flame===0&&r.floorFootprint.flat().every(p=>p[1]>.0&&p[1]<.02)));
  for(const f of trial.scene.fuels.values())if(f.loose){f.lit=true;f.litAt=trial.worldTime;}trial.step(10);const spent=trial.frame();assert.ok(spent.rubble.every(r=>r.phase==='ash'&&r.flame===0&&r.smoke===0));assert.equal(trial.metrics().fuel.initial,initial);assert.ok(Math.abs(trial.metrics().fuel.error)<1e-9);
});
