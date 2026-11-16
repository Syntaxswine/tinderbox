import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createGrayboxData} from '../../workbenches/bell-and-alder-closing/graybox-data.js';

test('real shared publication geometry preserves exact native states, frame deltas, falls, spill and door events',()=>{
  const options={rules:{raysPerTick:1,radiantMaxAge:.05},profiles:{frame:{threshold:.4,delay:.05,seconds:.3,energy:1},clapboard:{threshold:.4,delay:.05,seconds:.3,energy:1}}};
  const reference=createTrial(createGrayboxData(),options),shared=createTrial(createGrayboxData(),{...options,executionCache:true});
  try{
    for(const command of [{type:'heat',position:[1,.02,1],energy:1.05,tick:3},{type:'deposit',position:[2,0,2],amount:.1,tick:5},{type:'lantern',from:[2,.2,2],velocity:[0,0,0],tick:6},{type:'opening',id:'entry-left',open:true,tick:8}])for(const trial of [reference,shared])trial.command(command);
    assert.deepEqual(shared.frame({sharePublicationGeometry:true}),reference.frame());
    for(let i=0;i<65;i++){
      reference.step();shared.step();assert.deepEqual(shared.snapshot(),reference.snapshot());
      const current=shared.frame({sharePublicationGeometry:true});assert.deepEqual(current,reference.frame());
      assert.ok(Object.isFrozen(current.fireSamples));assert.ok(current.fireSamples.every(Object.isFrozen));
      assert.ok(current.occupancy.every(r=>Object.isFrozen(r.bounds)&&Object.isFrozen(r.bounds.min)&&Object.isFrozen(r.bounds.max)));
      const mutable=shared.fireSamples();if(mutable[0]){mutable[0].flame=-99;if(mutable[0].floorFootprint)mutable[0].floorFootprint[0][0][0]=-999;}
      assert.deepEqual(shared.fireSamples(),reference.fireSamples());
    }
    assert.ok(shared.events.some(e=>e.type==='fall'));assert.ok(shared.events.some(e=>e.type==='fuel-deposit'));
  }finally{shared.dispose();reference.dispose();}
});

test('static footprints are owned immutable DTOs, reused between ticks and invalidated by actual door geometry revision',()=>{
  const trial=createTrial(createGrayboxData(),{executionCache:true});
  try{
    trial.command({type:'match',position:[1,.02,1],energy:1.05});trial.step(40);
    const first=trial.fireSamples({borrowImmutable:true}),sample=first.find(s=>s.floorFootprint);assert.ok(sample);
    const boundary=trial.scene.index.surfaces.get(sample.boundaryId),source=structuredClone(boundary.triangles);
    assert.notEqual(sample.floorFootprint,boundary.triangles);assert.deepEqual(sample.floorFootprint,boundary.triangles);
    assert.throws(()=>{sample.flame=-1;},{name:'TypeError'});assert.throws(()=>{sample.floorFootprint[0][0][0]=-1;},{name:'TypeError'});
    const publicCopy=trial.fireSamples();publicCopy.find(s=>s.id===sample.id).floorFootprint[0][0][0]=-999;
    assert.deepEqual(boundary.triangles,source);assert.equal(trial.fireSamples({borrowImmutable:true}),first);
    trial.step();const next=trial.fireSamples({borrowImmutable:true}).find(s=>s.id===sample.id);assert.notEqual(next,sample);assert.equal(next.floorFootprint,sample.floorFootprint);
    const revision=trial.scene.index.revision;trial.command({type:'opening',id:'entry-left',open:true});trial.step();
    assert.ok(trial.scene.index.revision>revision);const moved=trial.fireSamples({borrowImmutable:true}).find(s=>s.id===sample.id);
    assert.notEqual(moved.floorFootprint,next.floorFootprint);assert.deepEqual(moved.floorFootprint,source);
  }finally{trial.dispose();}
});

test('reused cell DTO bounds never alias mutable public frame bounds',()=>{
  const trial=createTrial(createGrayboxData(),{executionCache:true});
  try{
    trial.command({type:'match',position:[1,.02,1],energy:1.05});trial.step();
    const a=trial.frame({sharePublicationGeometry:true}).occupancy[0];assert.ok(a);
    const publicBounds=trial.frame().occupancy.find(c=>c.id===a.id).bounds;publicBounds.min[0]=-999;
    assert.notEqual(a.bounds.min[0],-999);trial.step();
    const b=trial.frame({sharePublicationGeometry:true}).occupancy.find(c=>c.id===a.id);assert.equal(b.bounds,a.bounds);
  }finally{trial.dispose();}
});

test('cell bounds reuse invalidates on actual mutable coordinates, origin and pitch without changing public values',()=>{
  const trial=createTrial(createGrayboxData(),{executionCache:true});
  try{
    trial.command({type:'match',position:[1,.02,1],energy:1.05});trial.step();
    const initial=trial.frame({sharePublicationGeometry:true}).occupancy[0],cell=trial.scene.cells.get(initial.id);assert.ok(cell);
    let previous=initial.bounds;
    for(const change of [()=>{cell.c[0]++;},()=>{trial.scene.origin[1]+=.125;},()=>{trial.scene.pitch[2]*=2;}]){
      change();const shared=trial.frame({sharePublicationGeometry:true}).occupancy.find(c=>c.id===initial.id),publicRow=trial.frame().occupancy.find(c=>c.id===initial.id);
      assert.notEqual(shared.bounds,previous);assert.deepEqual(shared.bounds,publicRow.bounds);assert.ok(Object.isFrozen(shared.bounds));
      assert.equal(trial.frame({sharePublicationGeometry:true}).occupancy.find(c=>c.id===initial.id).bounds,shared.bounds);
      previous=shared.bounds;
    }
  }finally{trial.dispose();}
});
