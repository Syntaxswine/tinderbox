import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createGrayboxData} from '../../workbenches/bell-and-alder-closing/graybox-data.js';
import {add,sub,mul,dot,bounds} from '../../workbenches/furnished-house/geometry.js';

test('real shared publication geometry preserves exact native states, frame deltas, falls, spill and door events',()=>{
  const options={rules:{raysPerTick:1,radiantMaxAge:.05},profiles:{frame:{threshold:.4,delay:.05,seconds:.3,energy:1},clapboard:{threshold:.4,delay:.05,seconds:.3,energy:1}}};
  const reference=createTrial(createGrayboxData(),options),shared=createTrial(createGrayboxData(),{...options,executionCache:true});
  try{
    for(const command of [{type:'heat',position:[1,.02,1],energy:1.05,tick:3},{type:'deposit',position:[2,0,2],amount:.1,tick:5},{type:'lantern',from:[2,.2,2],velocity:[0,0,0],tick:6},{type:'opening',id:'entry-left',open:true,tick:8}])for(const trial of [reference,shared])trial.command(command);
    assert.deepEqual(shared.frame({sharePublicationGeometry:true}),reference.frame());
    for(let i=0;i<65;i++){
      reference.step();shared.step();assert.deepEqual(shared.snapshot(),reference.snapshot());
      const current=shared.frame({sharePublicationGeometry:true}),expected=reference.frame();assert.deepEqual(current,expected);
      assert.deepEqual(current.fireSamples.map(Object.keys),expected.fireSamples.map(Object.keys),'sample field order stays identical');
      assert.ok(Object.isFrozen(current.fireSamples));assert.ok(current.fireSamples.every(Object.isFrozen));
      assert.ok(current.occupancy.every(r=>Object.isFrozen(r.bounds)&&Object.isFrozen(r.bounds.min)&&Object.isFrozen(r.bounds.max)));
      const before=shared.snapshot(),mutable=shared.fireSamples();assert.notEqual(mutable,current.fireSamples);
      if(mutable[0]){assert.notEqual(mutable[0],current.fireSamples[0]);assert.ok(!Object.isFrozen(mutable[0]));mutable[0].flame=-99;if(mutable[0].floorFootprint)mutable[0].floorFootprint[0][0][0]=-999;}
      assert.deepEqual(shared.snapshot(),before,'mutable copies cannot mutate the native source through reused local rows');
      assert.deepEqual(shared.fireSamples(),reference.fireSamples());
    }
    assert.ok(shared.events.some(e=>e.type==='fall'));assert.ok(shared.events.some(e=>e.type==='fuel-deposit'));
  }finally{shared.dispose();reference.dispose();}
});

test('static footprints are owned immutable DTOs and keep their identity across unrelated door revisions',()=>{
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
    assert.equal(moved.floorFootprint,next.floorFootprint);assert.deepEqual(moved.floorFootprint,source);
  }finally{trial.dispose();}
});

test('active floor, wall, roof, attachment and door supports share owned stable DTOs through native delta/full frames and actual geometry changes',()=>{
  const profiles=Object.fromEntries(['frame','partition','clapboard','door','roof'].map(cls=>[cls,{threshold:.01,delay:0,seconds:180,energy:10}])),data=createGrayboxData();
  data.surfaces.push({...structuredClone(data.surfaces[0]),id:'roof-control',kind:'roof',fuelClass:'roof',supportSurfaceIds:['rear'],triangles:data.surfaces[0].triangles.map(t=>t.map(([x,y,z])=>[x,y+2,z]))});
  data.surfaces.push({...structuredClone(data.surfaces[1]),id:'attachment-control',kind:'attachment'});
  const trial=createTrial(data,{executionCache:true,profiles});
  try{
    const cold=trial.frame({sharePublicationGeometry:true});assert.equal(trial.publicationGeometryDiagnostics().boundaryEntries,0);
    assert.ok(cold.boundaries.every(b=>b.triangles===trial.scene.index.surfaces.get(b.id).triangles));
    const selected=['floor','wall','roof','door','attachment'].map(kind=>[...trial.scene.index.surfaces.values()].find(b=>b.kind===kind&&b.fuelId));assert.ok(selected.every(Boolean));
    for(const b of selected)trial.command({type:'heat',position:trial.scene.fuels.get(b.fuelId).cells[0].position,energy:5});
    trial.step();const first=trial.frame({sharePublicationGeometry:true});trial.step();const second=trial.frame({sharePublicationGeometry:true});assert.equal(second.full,false);
    for(const b of selected){
      const a=first.boundaries.find(r=>r.id===b.id),next=second.boundaries.find(r=>r.id===b.id);assert.ok(a&&next,b.kind);
      assert.notEqual(a.triangles,b.triangles);assert.equal(next.triangles,a.triangles);assert.deepEqual(a.triangles,b.triangles);
      assert.ok(Object.isFrozen(a.triangles)&&Object.isFrozen(a.triangles[0][0]));assert.ok(!Object.isFrozen(b.triangles));
      if(b.kind==='floor')assert.equal(second.fireSamples.find(s=>s.boundaryId===b.id).floorFootprint,a.triangles);
    }
    const floor=selected[0],previous=second.boundaries.find(b=>b.id===floor.id).triangles;
    const same=structuredClone(floor.triangles);trial.scene.index.change(floor.id,{triangles:same});trial.step();
    const unchanged=trial.frame({full:true,sharePublicationGeometry:true});assert.equal(unchanged.boundaries.find(b=>b.id===floor.id).triangles,previous);
    const moved=floor.triangles.map(t=>t.map(([x,y,z])=>[x+.125,y,z]));trial.scene.index.change(floor.id,{triangles:moved,bounds:bounds(moved.flat())});trial.step();
    const changed=trial.frame({full:true,sharePublicationGeometry:true}),row=changed.boundaries.find(b=>b.id===floor.id),sample=changed.fireSamples.find(s=>s.boundaryId===floor.id);
    assert.notEqual(row.triangles,previous);assert.notEqual(row.triangles,moved);assert.deepEqual(row.triangles,moved);assert.equal(sample.floorFootprint,row.triangles);assert.ok(!Object.isFrozen(moved));
    const publicRow=trial.frame({full:true}).boundaries.find(b=>b.id===floor.id);assert.equal(publicRow.triangles,moved,'default boundary geometry API stays unchanged');
    const publicSample=trial.fireSamples().find(s=>s.boundaryId===floor.id);publicSample.floorFootprint[0][0][0]=-999;assert.notEqual(moved[0][0][0],-999);assert.notEqual(row.triangles[0][0][0],-999);
    const active=new Set(changed.fireSamples.map(s=>s.boundaryId).filter(Boolean));assert.ok(trial.publicationGeometryDiagnostics().boundaryEntries<=active.size);assert.ok(active.size<trial.scene.index.surfaces.size);
  }finally{trial.dispose();assert.deepEqual(trial.publicationGeometryDiagnostics(),{boundaryEntries:0,activeBoundaryIds:0});}
});

test('finite native fuel retirement prunes immutable support DTOs instead of retaining cold boundary history',()=>{
  const trial=createTrial({version:1,prefabId:'publication-retirement',surfaces:[{id:'floor',kind:'floor',material:'timber',fuelClass:'frame',fuelAmount:1,normal:[0,1,0],thickness:.12,triangles:[[[0,0,0],[0,0,.4],[.4,0,.4]],[[0,0,0],[.4,0,.4],[.4,0,0]]]}],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]}},{executionCache:true,profiles:{frame:{threshold:.001,delay:0,seconds:.05,energy:.001}}});
  try{
    trial.frame({sharePublicationGeometry:true});trial.command({type:'match',position:[.2,.02,.2]});trial.step();const live=trial.frame({sharePublicationGeometry:true});assert.ok(live.fireSamples.length);assert.ok(trial.publicationGeometryDiagnostics().boundaryEntries>0);
    trial.step(6);const spent=trial.frame({sharePublicationGeometry:true});assert.equal(spent.fireSamples.length,0);assert.deepEqual(trial.publicationGeometryDiagnostics(),{boundaryEntries:0,activeBoundaryIds:0});
  }finally{trial.dispose();}
});

test('smoke-only support activation, inactive geometry changes and reactivation replace retained delta geometry correctly',()=>{
  const trial=createTrial({version:1,prefabId:'publication-reactivation',surfaces:[{id:'floor',kind:'floor',material:'timber',fuelClass:'frame',fuelAmount:1,normal:[0,1,0],thickness:.12,triangles:[[[0,0,0],[0,0,.4],[.4,0,.4]],[[0,0,0],[.4,0,.4],[.4,0,0]]]}],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]}},{executionCache:true,rules:{loss:30},profiles:{frame:{threshold:1,delay:100,seconds:180,energy:10}}});
  try{
    trial.frame({sharePublicationGeometry:true});trial.command({type:'heat',position:[.2,.02,.2],energy:5});trial.step();const active=trial.frame({sharePublicationGeometry:true}),sample=active.fireSamples[0];assert.ok(sample&&sample.flame===0&&sample.smoke>0);
    const b=trial.scene.index.surfaces.get(sample.boundaryId),old=active.boundaries.find(row=>row.id===b.id).triangles,oldValues=structuredClone(old);
    trial.step(4);const inactive=trial.frame({sharePublicationGeometry:true});assert.equal(inactive.fireSamples.length,0);assert.equal(trial.publicationGeometryDiagnostics().boundaryEntries,0);
    const moved=b.triangles.map(t=>t.map(([x,y,z])=>[x+.025,y,z]));trial.scene.index.change(b.id,{triangles:moved,bounds:bounds(moved.flat())});
    const changedWhileCold=trial.frame({full:true,sharePublicationGeometry:true});assert.equal(changedWhileCold.boundaries.find(row=>row.id===b.id).triangles,moved);assert.equal(trial.publicationGeometryDiagnostics().boundaryEntries,0);
    trial.command({type:'heat',position:[.2,.02,.2],energy:5});trial.step();const reactivated=trial.frame({sharePublicationGeometry:true}),current=reactivated.boundaries.find(row=>row.id===b.id).triangles;
    assert.equal(reactivated.full,false);assert.notEqual(current,old);assert.notEqual(current,moved);assert.deepEqual(current,moved);assert.deepEqual(old,oldValues);assert.ok(reactivated.fireSamples.some(s=>s.boundaryId===b.id&&s.floorFootprint===current&&s.flame===0));
  }finally{trial.dispose();}
});

// Independent original vector/map+spread expressions: keep IEEE arithmetic,
// NaN, signed zero, empty maxima and first-on-equal hottest-cell selection.
function originalPose(trial,f){
  const b=f.boundaryId?trial.scene.index.surfaces.get(f.boundaryId):null,c=f.burningCell||f.cells.reduce((a,b)=>a.heat>=b.heat?a:b),side=b&&dot(sub(c.position,f.position),f.normal)<0?-1:1,n=b?mul(f.normal,side):f.normal||[0,1,0];let p=[...f.position];
  if(b){const offset=b.kind==='floor'?(side<0?-(b.thickness||.12):0):side*(b.thickness||0)/2;p=add(p,mul(b.normal,offset));}
  return {x:p[0],y:p[1],z:p[2],nx:n[0],ny:n[1],nz:n[2],heatFraction:Math.max(0,Math.min(1,Math.max(...f.cells.map(c=>c.heat))/trial.rules.maxHeat))};
}
test('scalar publication exactly matches original vector pose and maximum expressions, including IEEE edge cases and ties',()=>{
  const trial=createTrial(createGrayboxData()),b=[...trial.scene.index.surfaces.values()].find(b=>b.kind==='floor'&&b.fuelId),f=trial.scene.fuels.get(b.fuelId),originalCells=f.cells;
  try{
    f.lit=true;f.burningCell=originalCells[0];
    for(const heat of [[],[-0],[-0,0],[0,-0],[NaN,3],[3,NaN,2],[Infinity,-Infinity]]){
      f.cells=heat.map((value,i)=>({heat:value,position:[0,i===0?-1:1,0]}));f.burningCell=heat.length?null:originalCells[0];const expected=originalPose(trial,f),sample=trial.fireSamples().find(s=>s.id===f.id),row=trial.frame({full:true}).boundaries.find(r=>r.id===b.id);
      for(const key of Object.keys(expected))assert.ok(Object.is(sample[key],expected[key]),key);assert.ok(Object.is(row.heatFraction,expected.heatFraction));
    }
    f.cells=[];f.burningCell=null;assert.throws(()=>trial.fireSamples(),{name:'TypeError'});
    const cases=[{p:[-0,-0,-0],n:[0,1,0],c:[0,-1,0],kind:'floor',thickness:0},{p:[1e20,1e-20,-0],n:[1e-20,-1e20,-0],c:[1e20+16384,1,-1],kind:'wall',thickness:.16},{p:[0,0,0],n:[1,1,1],c:[1e20,-1e20,-1e-300],kind:'wall',thickness:0}];
    for(const t of cases){f.position=t.p;f.normal=t.n;f.cells=[{heat:1,position:t.c},{heat:1,position:t.c.map(v=>-v)}];f.burningCell=null;b.kind=t.kind;b.thickness=t.thickness;
      const expected=originalPose(trial,f),sample=trial.fireSamples().find(s=>s.id===f.id);for(const key of Object.keys(expected))assert.ok(Object.is(sample[key],expected[key]),key);
    }
    f.boundaryId=null;f.normal=null;f.position=[-0,-0,-0];const expected=originalPose(trial,f),loose=trial.fireSamples().find(s=>s.id===f.id);for(const key of Object.keys(expected))assert.ok(Object.is(loose[key],expected[key]),key);
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
