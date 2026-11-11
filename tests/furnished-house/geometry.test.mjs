import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoundaryIndex} from '../../workbenches/furnished-house/geometry.js';
const wall=(id,axis,value,material='masonry')=>({id,material,transmission:0,triangles:axis===0?[[[value,0,0],[value,2,0],[value,2,2]],[[value,0,0],[value,2,2],[value,0,2]]]:[[[0,0,value],[2,0,value],[2,2,value]],[[0,0,value],[2,2,value],[0,2,value]]],normal:axis===0?[1,0,0]:[0,0,1]});
test('opposite observers and duplicate insertion retain the same physical face identity',()=>{
  const index=createBoundaryIndex([wall('shared',0,1)]),face=index.surfaces.get('shared');
  assert.equal(index.put(wall('shared',0,1)),face);
  assert.equal(index.trace([.5,1,.5],[1.5,1,.5]).hits[0].surface,face);
  assert.equal(index.trace([1.5,1,.5],[.5,1,.5]).hits[0].surface,face);
  index.change('shared',{intact:false});assert.equal(index.trace([.5,1,.5],[1.5,1,.5]).transmission,1);
});
test('sealed diagonal corner collects every simultaneous boundary instead of the best axis route',()=>{
  const index=createBoundaryIndex([wall('x',0,1),wall('z',2,1)]);
  assert.deepEqual(index.trace([.5,1,.5],[1.5,1,1.5]).hits.map(h=>h.surface.id),['x','z']);
  assert.equal(index.trace([.5,1,.5],[1.5,1,1.5]).transmission,0);
  index.change('x',{openFraction:1});assert.equal(index.trace([.5,1,.5],[1.5,1,1.5]).transmission,0);
});
test('window aperture changes the crossing window, not the adjacent wall',()=>{
  const pane=wall('window',0,1,'glass');pane.transmission=.05;
  const index=createBoundaryIndex([pane]);assert.equal(index.trace([.5,.9,.8],[1.5,1.1,1.2]).transmission,.05);
  index.change('window',{openFraction:1});assert.equal(index.trace([.5,.9,.8],[1.5,1.1,1.2]).transmission,1);
});
