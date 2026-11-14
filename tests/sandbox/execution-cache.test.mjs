import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createGrayboxData} from '../../workbenches/bell-and-alder-closing/graybox-data.js';

test('cached execution preserves native order, budgets, falls, spills and complete snapshots',()=>{
  const options={rules:{raysPerTick:1,radiantMaxAge:.05},profiles:{frame:{threshold:.4,delay:.05,seconds:.3,energy:1},clapboard:{threshold:.4,delay:.05,seconds:.3,energy:1}}};
  const reference=createTrial(createGrayboxData(),options),cached=createTrial(createGrayboxData(),{...options,executionCache:true});
  try{
    const inputs=[{type:'heat',position:[1,.02,1],energy:1.05,tick:3},{type:'deposit',position:[2,0,2],amount:.1,tick:5},{type:'lantern',from:[2,.2,2],velocity:[0,0,0],tick:6},{type:'opening',id:'entry-left',open:true,tick:8},{type:'heat',position:[1,.1,0],energy:1,tick:10}];
    for(const input of inputs){reference.command(input);cached.command(input);}
    assert.deepEqual(cached.frame(),reference.frame());
    for(let i=0;i<45;i++){
      reference.step();cached.step();
      // Multiple reads must also be detached from the cached authoritative data.
      const metrics=cached.metrics();metrics.fuel.remaining=-1;metrics.stats.ticks=-1;
      assert.deepEqual(cached.snapshot(),reference.snapshot());
      assert.deepEqual(cached.frame(),reference.frame());
      const samples=cached.fireSamples();if(samples[0])samples[0].flame=-1;
      assert.deepEqual(cached.fireSamples(),reference.fireSamples());
    }
    assert.ok(cached.events.some(e=>e.type==='ignition'));
    assert.ok(cached.events.some(e=>e.type==='fuel-deposit'));
    assert.ok(cached.events.some(e=>e.type==='fall'));
    assert.ok(cached.metrics().heat.escaped>0);assert.ok(cached.metrics().stats.rayBuilds>0);
  }finally{cached.dispose();reference.dispose();}
});

test('cached retirement candidates preserve heated glazing break and path invalidation',()=>{
  const make=()=>{const d=createGrayboxData();d.surfaces.push({id:'test-pane',kind:'window',material:'glass',normal:[0,0,1],thickness:.01,triangles:[[[2,0,2],[2.5,0,2],[2.5,1,2]],[[2,0,2],[2.5,1,2],[2,1,2]]]});return d;};
  const a=createTrial(make()),b=createTrial(make(),{executionCache:true});
  try{for(const trial of [a,b])trial.command({type:'heat',position:[2.2,.5,2.01],energy:1});for(let i=0;i<8;i++){a.step();b.step();assert.deepEqual(b.snapshot(),a.snapshot());assert.deepEqual(b.frame(),a.frame());}assert.ok(b.events.some(e=>e.type==='window-break'));}finally{a.dispose();b.dispose();}
});

test('cached cold guards preserve warming, char decay, fading smoke and door invalidation',()=>{
  const a=createTrial(createGrayboxData()),b=createTrial(createGrayboxData(),{executionCache:true});let warmed=false,smoked=false;
  try{
    for(const trial of [a,b]){trial.command({type:'heat',position:[1,.02,1],energy:.35,tick:1});trial.command({type:'opening',id:'entry-left',open:true,tick:20});trial.command({type:'opening',id:'entry-left',open:false,tick:50});}
    for(let i=0;i<180;i++){
      a.step();b.step();const state=b.snapshot();warmed||=state.fuels.some(f=>f.char>0);smoked||=b.fireSamples().some(f=>f.smoke>0);
      assert.deepEqual(state,a.snapshot());assert.deepEqual(b.frame(),a.frame());
    }
    assert.ok(warmed&&smoked);assert.equal(b.metrics().burningCount,0);assert.ok(b.snapshot().fuels.every(f=>f.char===0));assert.equal(b.fireSamples().length,0);
  }finally{a.dispose();b.dispose();}
});
