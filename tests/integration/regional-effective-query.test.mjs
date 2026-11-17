import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegionalQueryKernel} from '../../src/runtime/regional-effective-query.js';
import {createBoundaryIndex,triangleArea,EPS} from '../../workbenches/furnished-house/geometry.js';
import {sweptCylinderClear,segmentRectangleDistance} from '../../src/runtime/collision.js';
import {boxFixture,boxTriangles,planeFixture,activate,hitValues} from '../fixtures/regional-query-data.mjs';
const ordinary=r=>createBoundaryIndex(r),commit=(k,changes)=>{const v=k.view();return k.prepare({expectedGeneration:v.generation,expectedRevision:v.revision,...changes}).commit();};
const noCompiler={nativeCompilerCalls:0,worldTrials:0,worldSteps:0};

test('wholly cold and wholly native rays and bodies match ordinary controls',()=>{
  const input=boxFixture(),k=createRegionalQueryKernel(input),cold=ordinary([input.sources[0].rayRecord]),native=ordinary(input.nativeInventory.map(n=>n.record));
  try{
    const rays=[[[0,2,2],[5,2,2]],[[2,2,2],[5,2,2]],[[1.2,1.2,1.2],[1.8,1.8,1.8]],[[-1,.1,.1],[5,.1,.1]],[[.1,2,2],[5,2,2]],[[2,5,2],[2,-1,2]],[[.1-EPS/2,2,2],[.1-EPS/2,3,2]],[[.1-2*EPS,2,2],[.1-2*EPS,3,2]]];
    const bodies=[[{x:-1,y:2},{x:5,y:2},.2,1.2,1.8],[{x:2,y:2},{x:2,y:2},.2,1.2,1.8],[{x:5,y:5},{x:6,y:6},.2,1.2,1.8],[{x:2,y:2},{x:2,y:2},.2,4,5]];
    for(const [active,index]of [[false,cold],[true,native]]){if(active)activate(k,input);for(const [a,b]of rays)for(const includeEndpoints of [false,true])assert.deepEqual(hitValues(k.segment(k.view(),a,b,{includeEndpoints})),hitValues(index.crossings(a,b,{includeEndpoints})));for(const [a,b,r,low,high]of bodies){const expected=active?input.nativeInventory.every(n=>sweptCylinderClear(a,b,r,low,high,{triangles:n.record.solidTriangles,closed:n.record.closedShape!==false})):sweptCylinderClear(a,b,r,low,high,{triangles:input.sources[0].solidTriangles,closed:true});assert.equal(k.sweptCylinderClear(k.view(),a,b,r,low,high),expected);}}
  }finally{k.dispose();}
});

test('complete empty native coverage is explicit and full body overlap finds cold interior beyond its centre',()=>{
  const input=boxFixture(),k=createRegionalQueryKernel(input);
  try{
    assert.throws(()=>k.coverage({partId:'box',cells:[[1,1,1]],records:[]}),/complete/);assert.throws(()=>k.coverage({partId:'box',cells:[[0,0,0]],records:[],complete:true}),/Missing/);
    activate(k,input,[[1,1,1]]);const v=k.view(),a={x:1.5,y:1.5};
    assert.equal(k.sweptCylinderClear(v,a,a,.2,1.2,1.8),true);
    assert.equal(k.sweptCylinderClear(v,a,a,.6,1.2,1.8),false,'radius reaches cold closed interior');
    assert.equal(k.sweptCylinderClear(v,a,a,.2,1.2,2.2),false,'height reaches cold closed interior');
    // Independent axis-aligned box oracle: exact capsule/rectangle distance.
    for(const dx of [-.7,-.3,0,.3,.7])for(const radius of [.05,.2,.6]){
      const p={x:1.5+dx,y:1.5};let intersects=false;for(const c of input.cells){if(c.join(',')==='1,1,1')continue;const lo=[Math.max(c[0]-EPS,input.min[0]),Math.max(c[2]-EPS,input.min[2])],hi=[Math.min(c[0]+1-EPS,input.max[0]),Math.min(c[2]+1-EPS,input.max[2])];if(1.2<c[1]+1-EPS&&1.8>=c[1]-EPS&&segmentRectangleDistance([p.x,p.y],[p.x,p.y],lo,hi)<radius-1e-6)intersects=true;}
      assert.equal(k.sweptCylinderClear(v,p,p,radius,1.2,1.8),!intersects);
    }
    activate(k,input,[[3,1,1]]);assert.equal(k.sweptCylinderClear(k.view(),{x:1.3,y:1.5},{x:3.3,y:1.5},.1,1.2,1.8),false,'intermediate cold domain despite both endpoints native');
  }finally{k.dispose();}
});

test('retiring one native record leaves another original face in the same cell',()=>{
  const input=boxFixture(),k=createRegionalQueryKernel(input);
  try{activate(k,input,[[0,0,0]]);const entries=input.nativeInventory.filter(n=>n.cell.join(',')==='0,0,0'),lost=entries.find(n=>n.record.id.startsWith('native/0/0')).record.id,survivor=entries.find(n=>n.record.id.startsWith('native/1/0')).record.id;
    commit(k,{retireRecords:[lost]});const v=k.view();assert.equal(k.segment(v,[-1,.5,.5],[.5,.5,.5]).length,0);const hits=k.segment(v,[.5,-1,.5],[.5,.5,.5]);assert.equal(hits.length,1);assert.equal(hits[0].surface.id,survivor);
    const far=[[-1,2.5,2.5],[1,2.5,2.5]];assert.deepEqual(hitValues(k.segment(v,...far)),hitValues(ordinary([input.sources[0].rayRecord]).crossings(...far)));
    assert.equal(k.sweptCylinderClear(v,{x:-.3,y:.5},{x:.4,y:.5},.1,.3,.7),true);assert.equal(k.sweptCylinderClear(v,{x:.5,y:-.3},{x:.5,y:.4},.1,.3,.7),false);
  }finally{k.dispose();}
});

test('a later coplanar cold interval is found after a nonauthoritative first hit',()=>{
  const input=planeFixture(),k=createRegionalQueryKernel(input);try{activate(k,input,[[0,0,0]]);const a=[.2,.5,.5],b=[3.8,.5,.5],hits=k.segment(k.view(),a,b);assert.deepEqual(hitValues(hits.filter(h=>h.surface.id==='plane@0')),hitValues(ordinary([input.nativeInventory[0].record]).crossings(a,b)));
    // Independent monotone interval oracle, with no triangle re-triangulation:
    // find the first representable parameter in original logical cell 1.
    let lo=0,hi=1;for(let i=0;i<128;i++){const mid=(lo+hi)/2;if(mid===lo||mid===hi)break;if(Math.floor(a[0]+(b[0]-a[0])*mid+EPS)>=1)hi=mid;else lo=mid;}
    const cold=hits.find(h=>h.surface.id==='cold-plane');assert.equal(hits.length,2);assert.equal(cold.t,hi);assert.equal(cold.provenance.ownerId,'owner');const endpoints=k.segment(k.view(),a,b,{includeEndpoints:true});assert.equal(endpoints[0].surface.id,'plane@0');assert.equal(endpoints[0].t,0);
  }finally{k.dispose();}
});

test('body face/corner and vertical tangent bands retain the separate cylinder tolerance',()=>{
  const input=boxFixture(),k=createRegionalQueryKernel(input);try{const cells=input.cells.filter(c=>c[1]===1&&c[0]<3&&c[2]<3&&!(c[0]===2&&c[2]===2));activate(k,input,cells);const a={x:1.5,y:1.5};assert.equal(k.sweptCylinderClear(k.view(),a,a,.7,1.2,1.8),true);assert.equal(k.sweptCylinderClear(k.view(),a,a,.72,1.2,1.8),false);}finally{k.dispose();}
  const second=boxFixture(),n=createRegionalQueryKernel(second);try{activate(n,second,[[1,1,1]]);const a={x:1.5,y:1.5};assert.equal(n.sweptCylinderClear(n.view(),a,a,.5000004,1.2,1.8),true);assert.equal(n.sweptCylinderClear(n.view(),a,a,.5000014,1.2,1.8),false);assert.equal(n.sweptCylinderClear(n.view(),a,a,.2,1.2,2-EPS-EPS/2),true);assert.equal(n.sweptCylinderClear(n.view(),a,a,.2,1.2,2-EPS),false);}finally{n.dispose();}
});

test('raw versus live rays, transmission and inactive cold interiors preserve caller rules',()=>{
  const input=boxFixture();input.sources[0].rayRecord.intact=false;const k=createRegionalQueryKernel(input),index=ordinary([input.sources[0].rayRecord]);try{const a=[-1,2,2],b=[5,2,2];assert.deepEqual(hitValues(k.segment(k.view(),a,b)),hitValues(index.crossings(a,b)));assert.equal(k.trace(k.view(),a,b).transmission,index.trace(a,b).transmission);assert.equal(k.segment(k.view(),a,b,{includeInactive:false}).length,0);assert.equal(k.sweptCylinderClear(k.view(),{x:2,y:2},{x:2,y:2},.2,1.2,1.8),true);}finally{k.dispose();}
});

test('existing sheet ties choose transmission and retirement removes only the named replica',()=>{
  const input=planeFixture(),first=input.nativeInventory[0];first.record.transmission=.7;input.nativeInventory.push({cell:[...first.cell],record:{...first.record,id:'stronger-original-record',transmission:.3}});const k=createRegionalQueryKernel(input);try{activate(k,input,[[0,0,0]]);const a=[.5,1,.5],b=[.5,0,.5],oracle=ordinary([first.record,input.nativeInventory.at(-1).record]);assert.deepEqual(hitValues(k.segment(k.view(),a,b)),hitValues(oracle.crossings(a,b)));assert.equal(k.trace(k.view(),a,b).transmission,.3);commit(k,{retireRecords:['stronger-original-record']});assert.equal(k.trace(k.view(),a,b).transmission,.7);}finally{k.dispose();}
});

test('scoped face channels keep original primitives and create no cell-plane cap or area',()=>{
  const input=boxFixture(),k=createRegionalQueryKernel(input);
  try{activate(k,input,[[1,1,1]]);for(const channel of ['surface','solid']){const pieces=k.faces(k.view(),{channel}),area=pieces.reduce((n,p)=>n+p.polygon.slice(1,-1).reduce((s,_,i)=>s+triangleArea([p.polygon[0],p.polygon[i+1],p.polygon[i+2]]),0),0),original=input.sources[0][channel==='surface'?'surfaceTriangles':'solidTriangles'].reduce((n,t)=>n+triangleArea(t),0);assert.ok(Math.abs(area-original)<=64*Number.EPSILON*Math.max(1,original)*pieces.length);assert.ok(pieces.every(p=>p.cell.join(',')!=='1,1,1'));assert.ok(pieces.every(p=>Number.isInteger(p.primitive)&&p.ownerId==='owner'&&p.partId==='box'));}}
  finally{k.dispose();}
});

test('an original upper-span exterior face survives as query halo under the last original cell',()=>{
  const input=boxFixture(1),ts=boxTriangles([0,0,0],[1,1,1]),spec=input.sources[0];input.nativeInventory=[];spec.surfaceTriangles=ts;spec.solidTriangles=ts;spec.rayRecord.triangles=ts;spec.rayRecord.bounds={min:[0,0,0],max:[1,1,1]};const k=createRegionalQueryKernel(input);
  try{for(const channel of ['surface','solid']){const pieces=k.faces(k.view(),{channel});assert.equal(pieces.reduce((sum,p)=>sum+p.polygon.slice(1,-1).reduce((n,_,i)=>n+triangleArea([p.polygon[0],p.polygon[i+1],p.polygon[i+2]]),0),0),6);assert.ok(pieces.some(p=>p.outerHalo));assert.ok(pieces.every(p=>p.cell.join(',')==='0,0,0'&&p.record===spec.rayRecord));}assert.equal(k.segment(k.view(),[2,.5,.5],[.5,.5,.5])[0].t,2/3);}finally{k.dispose();}
});

test('surface versus solid channels and native closedness remain distinct',()=>{
  const floor=boxFixture(),spec=floor.sources[0];spec.surfaceTriangles=spec.solidTriangles.filter(t=>t.every(v=>v[1]===floor.max[1]));spec.rayRecord.triangles=spec.surfaceTriangles;const k=createRegionalQueryKernel(floor);
  try{assert.ok(k.faces(k.view(),{channel:'surface'}).every(p=>p.polygon.every(v=>v[1]===3.9)));assert.ok(k.faces(k.view(),{channel:'solid'}).some(p=>p.polygon.every(v=>v[1]===.1)));assert.equal(k.segment(k.view(),[.5,-1,.5],[.5,2,.5]).length,0);assert.equal(k.sweptCylinderClear(k.view(),{x:.5,y:.5},{x:.5,y:.5},.1,0,.2),false);}finally{k.dispose();}
  for(const closed of [true,false]){const input=boxFixture(1),ts=boxTriangles([.2,.2,.2],[.8,.8,.8]);input.nativeInventory=[{cell:[0,0,0],record:{...input.nativeInventory[0].record,id:'native-closed',triangles:ts,solidTriangles:ts,closedShape:closed,bounds:{min:[.2,.2,.2],max:[.8,.8,.8]}}}];const native=createRegionalQueryKernel(input);try{activate(native,input);assert.equal(native.sweptCylinderClear(native.view(),{x:.5,y:.5},{x:.5,y:.5},.05,.4,.6),!closed);}finally{native.dispose();}}
});

test('staging is immutable, disjoint, failure-atomic and generation scoped; reset/disposal release references',()=>{
  const input=boxFixture(),k=createRegionalQueryKernel(input),initial=k.view(),token=k.coverage({partId:'box',cells:[[1,1,1]],records:[],complete:true});
  try{
    assert.ok(Object.isFrozen(input.sources[0])&&Object.isFrozen(input.nativeInventory[0].record.triangles[0][0]));assert.throws(()=>{input.nativeInventory[0].record.id='changed';},TypeError);
    assert.throws(()=>k.prepare({expectedGeneration:0,expectedRevision:0,native:[token,token]}),/Overlapping/);assert.equal(k.view(),initial);
    assert.throws(()=>k.prepare({expectedGeneration:0,expectedRevision:0,native:[{...token}]}),/unknown/);assert.equal(k.view(),initial);
    const requested=[token],plan=k.prepare({expectedGeneration:0,expectedRevision:0,native:requested});requested.length=0;assert.equal(k.view(),initial);const published=plan.commit();assert.notEqual(published,initial);assert.throws(()=>plan.commit(),/Stale/);assert.equal(k.view(),published);assert.equal(k.sweptCylinderClear(published,{x:1.5,y:1.5},{x:1.5,y:1.5},.2,1.2,1.8),true);
    assert.throws(()=>k.prepare({expectedGeneration:0,expectedRevision:0}),/Stale/);assert.equal(k.view(),published);assert.throws(()=>commit(k,{retireRecords:['unknown']}),/Unknown/);assert.equal(k.view(),published);
    k.release(initial);assert.throws(()=>k.segment(initial,[0,0,0],[1,1,1]),/stale/);const stalePlan=k.prepare({expectedGeneration:0,expectedRevision:1});k.reset();assert.throws(()=>stalePlan.commit(),/Stale/);assert.throws(()=>k.prepare({expectedGeneration:1,expectedRevision:0,native:[token]}),/Stale/);assert.equal(k.diagnostics().retainedViews,1);assert.equal(k.diagnostics().retainedCoverageReceipts,0);
  }finally{k.dispose();}assert.deepEqual(k.diagnostics(),{productionEnabled:false,generation:2,revision:0,parts:0,nativeRecords:0,retainedViews:0,retainedCoverageReceipts:0,closed:true});assert.throws(()=>k.segment(initial,[0,0,0],[1,1,1]),/disposed/);
});

test('unsupported closed shells, physical overreach and unsafe spans reject admission',()=>{
  const shell=boxFixture();shell.sources[0].solidTriangles=shell.sources[0].solidTriangles.slice(1);assert.throws(()=>createRegionalQueryKernel(shell),/watertight/);
  const over=boxFixture(),r=over.nativeInventory[0].record;r.solidTriangles=r.solidTriangles.map(t=>t.map(p=>[p[0]+2,p[1],p[2]]));r.triangles=r.solidTriangles;r.bounds={min:r.bounds.min.map((v,i)=>v+(i===0?2:0)),max:r.bounds.max.map((v,i)=>v+(i===0?2:0))};assert.throws(()=>createRegionalQueryKernel(over),/halo/);
  const unsafe=boxFixture();unsafe.sources[0].solidTriangles=unsafe.sources[0].solidTriangles.map(t=>t.map(p=>[1e20,p[1],p[2]]));assert.throws(()=>createRegionalQueryKernel(unsafe),/nondegenerate|watertight|Unsafe/);
  console.log(JSON.stringify(noCompiler));
});

test('admission rejects executable accessors and inconsistent physical metadata without freezing rejected inputs',()=>{
  const input=boxFixture();let calls=0;Object.defineProperty(input.sources[0],'surfaceTriangles',{get(){calls++;return [];}});assert.throws(()=>createRegionalQueryKernel(input),/Accessor/);assert.equal(calls,0);assert.equal(Object.isFrozen(input.sources[0]),false);
  const wrong=boxFixture();wrong.nativeInventory[0].record.bounds={min:[9,9,9],max:[10,10,10]};assert.throws(()=>createRegionalQueryKernel(wrong),/bounds/);assert.equal(Object.isFrozen(wrong.nativeInventory[0].record),false);
  const foreign=boxFixture();foreign.nativeInventory[0].record.sourceCarrierId='other-owner';assert.throws(()=>createRegionalQueryKernel(foreign),/ownership/);
  const k=createRegionalQueryKernel(boxFixture());try{const before=k.view();assert.throws(()=>k.sweptCylinderClear(before,{x:Number.MAX_VALUE,y:0},{x:Number.MAX_VALUE,y:0},Number.MAX_VALUE,0,1),/bounds/);assert.throws(()=>k.segment(before,[-Number.MAX_VALUE,0,0],[Number.MAX_VALUE,0,0]),/representable/);assert.equal(k.view(),before);}finally{k.dispose();}
});
