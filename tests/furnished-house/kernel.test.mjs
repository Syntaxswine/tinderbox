import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrial,createClock,calmWind} from '../../workbenches/furnished-house/simulation.js';
import {bearingPiers} from '../../workbenches/furnished-house/fixtures.js';
const floor=(id,y,{fuelAmount=0,material='masonry',fuelClass='frame'}={})=>({id,kind:'floor',level:y>1?1:0,normal:[0,1,0],thickness:.12,material,fuelClass,fuelAmount,triangles:[[[0,y,0],[2,y,0],[2,y,2]],[[0,y,0],[2,y,2],[0,y,2]]]});
function fixture({upper=false,oil=false}={}) {
  const data={version:1,prefabId:'control',buildingId:'control',gridOrigin:[0,0,0],surfaces:[floor('lower',0)],furnitureParts:[],items:[],stores:[]};
  if(upper)data.surfaces.push(floor('upper',2.12,{material:'timber',fuelAmount:4}),...bearingPiers());
  const y=upper?2.12:0,part={id:'contents',itemId:'table',level:upper?1:0,matrix:[1,0,0,0,0,1,0,0,0,0,1,0,.75,y,.75,1],bounds:{min:[.6,y,.6],max:[.9,y+.5,.9]},material:'wood',fuelClass:oil?'oil':'furniture',fuelAmount:1};
  data.furnitureParts.push(part);data.items.push({id:'table',position:[.75,y,.75],bounds:part.bounds});
  if(oil)data.stores.push({id:'oil',kind:'oil',fuelPartId:'contents',amount:1,position:[.75,y,.75]});return data;
}
test('oil store waits for its declared failure threshold, then conserves finite contents and pulse energy',()=>{
  const trial=createTrial(fixture({oil:true}),{wind:calmWind,rules:{loss:0}}),cell=trial.scene.fuels.get('contents').cells[0];
  trial.command({type:'heat',position:cell.position,energy:.7*cell.capacity});trial.step();
  assert.equal(trial.events.some(e=>e.type==='oil-release'),false);assert.equal(trial.scene.fuels.get('contents').amount,1);
  trial.command({type:'heat',position:cell.position,energy:.71*cell.capacity});trial.step();
  const event=trial.events.find(e=>e.type==='oil-release');assert.ok(event);assert.equal(event.threshold,1.4);assert.equal(event.redistributed+event.spentForPulse,1);
  assert.ok(Math.abs(trial.metrics().fuel.error)<1e-10);assert.ok(Math.abs(trial.metrics().heat.error)<1e-10);
});
test('falling lit furniture burns once per tick, retains its identity and lands on the first live support',()=>{
  const trial=createTrial(fixture({upper:true}),{wind:calmWind,rules:{loss:0}}),f=trial.scene.fuels.get('contents');f.lit=true;f.litAt=0;
  for(const b of trial.scene.index.surfaces.values())if(b.sourceSurfaceId==='upper')trial.scene.index.change(b.id,{intact:false});
  trial.step();assert.equal(f.amount,1-1/30/60);assert.equal(f.lastBurnTick,1);
  assert.equal(trial.events.filter(e=>e.type==='fall'&&e.itemId==='table').length,1);
  trial.step(60);assert.ok(trial.events.some(e=>e.type==='landing'&&e.itemId==='table'));assert.ok(f.position[1]<1);
  assert.equal(trial.scene.fuels.get('contents'),f);assert.equal(trial.stats.maxBurnsPerFuelPerTick,1);
  assert.ok(Math.abs(trial.metrics().fuel.error)<1e-9);assert.ok(Math.abs(trial.metrics().heat.error)<1e-9);
});
test('five frame schedules produce the identical fixed-step replay without dropped world time',()=>{
  const schedules=[Array(90).fill(1/30),Array(180).fill(1/60),Array(36).fill(1/12),[.7,.01,.29,1.1,.2,.7],[3]];let expected;
  for(const schedule of schedules){const trial=createTrial(fixture(),{wind:calmWind});trial.command({tick:1,type:'match',position:[.75,.25,.75]});const clock=createClock(trial,{maxSteps:15});clock.setPaused(false);for(const seconds of schedule)clock.advance(seconds);clock.drain();assert.equal(trial.tick,90);assert.equal(clock.diagnostics().droppedSeconds,0);const actual=JSON.stringify(trial.snapshot());if(expected)assert.equal(actual,expected);else expected=actual;}
});
test('five long frame schedules remain identical through structural burnout, physical landing and retained ash',()=>{
  const schedules=[Array(5400).fill(1/30),Array(10800).fill(1/60),Array(2160).fill(1/12),[7,.01,30,80.2,62.79],[180]];let expected;
  for(const schedule of schedules){const trial=createTrial(fixture({upper:true}),{wind:calmWind}),clock=createClock(trial,{maxSteps:15});trial.command({tick:1,type:'match',position:[.75,2.3,.75]});clock.setPaused(false);for(const elapsed of schedule)clock.advance(elapsed);clock.drain();assert.equal(trial.tick,5400);assert.ok(trial.events.some(e=>e.type==='support-failure'));assert.ok(trial.events.some(e=>e.type==='landing'));assert.ok(trial.frame().rubble.length);const actual=JSON.stringify(trial.snapshot());if(expected)assert.equal(actual,expected);else expected=actual;}
});
test('heat and fuel budgets close through an entire burn; adjacent fuel grows from one heat input',()=>{
  const data=fixture();const first=data.furnitureParts[0];data.furnitureParts.push({...first,id:'next',itemId:'next-table',bounds:{min:[1.1,0,.6],max:[1.4,.5,.9]}});data.items.push({id:'next-table',position:[1.25,0,.75],bounds:data.furnitureParts[1].bounds});
  const trial=createTrial(data,{wind:calmWind});trial.command({type:'match',position:[.75,.25,.75]});trial.step(3000);
  assert.ok(trial.events.some(e=>e.type==='ignition'&&e.fuelId==='next'));
  assert.ok(Math.abs(trial.metrics().fuel.error)<1e-8);assert.ok(Math.abs(trial.metrics().heat.error)<1e-8);assert.ok(trial.metrics().heat.generated>0);
});
