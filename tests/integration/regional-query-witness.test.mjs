import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegionalQueryKernel as create} from '../../src/runtime/regional-effective-query.js';
import {bounds,EPS} from '../../workbenches/furnished-house/geometry.js';
import {sweptCylinderClear as ordinarySweep} from '../../src/runtime/collision.js';
import {boxFixture,boxTriangles,activate} from '../fixtures/regional-query-data.mjs';

function cube(size=1){const input=boxFixture(size),ts=boxTriangles([0,0,0],[size,size,size]),s=input.sources[0];input.nativeInventory=[];s.surfaceTriangles=ts;s.solidTriangles=ts;s.rayRecord.triangles=ts;s.rayRecord.bounds=bounds(ts.flat());return input;}

test('off-centre upper-band capsule matches ordinary clearance in cold and native cubes',()=>{
  for(const native of [false,true]){
    const input=cube(),s=input.sources[0],ts=s.solidTriangles;
    if(native)input.nativeInventory=[{cell:[0,0,0],record:{...s.rayRecord,id:'native-unit',sourceSurfaceId:'native-unit',triangles:ts,solidTriangles:ts,closedShape:true}}];
    const k=create(input);try{
      if(native)activate(k,input);
      const p={x:.5,y:1.01};
      assert.equal(ordinarySweep(p,p,.1,1.0000003,1.0000007,{triangles:ts,closed:true}),true);
      assert.equal(k.sweptCylinderClear(k.view(),p,p,.1,1.0000003,1.0000007),true);
      // The same footprint really intersects the upper faces in this band.
      assert.equal(ordinarySweep(p,p,.1,1-EPS/2,1-EPS/4,{triangles:ts,closed:true}),false);
      assert.equal(k.sweptCylinderClear(k.view(),p,p,.1,1-EPS/2,1-EPS/4),false);
    }finally{k.dispose();}
  }
});

test('outer tolerance samples keep endpoint ownership while real mixed overlap keeps the full radius',()=>{
  const input=cube(2),k=create(input),p={x:.8,y:1.5};try{
    activate(k,input,[[0,1,1]]);
    // Both endpoints belong to complete empty native coverage. Only the
    // radius reaches cold; wholly above the solid it cannot invent parity.
    assert.equal(k.sweptCylinderClear(k.view(),p,p,.4,2.0000003,2.0000007),true);
    // Actual cold interior is still reached beyond that same centre cell.
    assert.equal(k.sweptCylinderClear(k.view(),p,p,.4,2-EPS/2,2-EPS/4),false);
    const cold={x:1.2,y:1.5};
    assert.equal(k.sweptCylinderClear(k.view(),cold,cold,.4,2.0000003,2.0000007),false);
    activate(k,input,[[1,1,1]]);
    assert.equal(k.sweptCylinderClear(k.view(),cold,cold,.4,2.0000003,2.0000007),true);
    assert.equal(k.sweptCylinderClear(k.view(),cold,cold,.4,2-EPS/2,2-EPS/4),true);
  }finally{k.dispose();}
});
