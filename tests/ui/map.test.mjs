import test from 'node:test';
import assert from 'node:assert/strict';
import {mapView} from '../../src/ui/map.js';
import {createSimulation} from '../../src/simulation/index.js';
test('ground plan uses exact asymmetric world coordinates, centered footprints and heading',()=>{
  const snapshot={version:1,world:{width:30,height:10,fireCellSize:.5,tiles:[{x:2.5,y:6.5,size:1,material:'grass'}],obstacles:[{x:22,y:3,width:4,depth:2}]},player:{x:25,y:7,heading:Math.PI/2},cells:[{x:8.25,y:4.25,phase:'burning'},{x:9.25,y:4.25,phase:'heating'}]};
  const view=mapView(snapshot);
  assert.deepEqual([view.width,view.height],[30,10]);
  assert.deepEqual(view.player,{x:25,y:7,heading:90});
  assert.deepEqual(view.obstacles,[{x:20,y:2,width:4,height:2}]);
  assert.deepEqual(view.fire,[{x:8,y:4,width:.5,height:.5}]);
  assert.equal(view.tiles[0].x,2);assert.equal(view.tiles[0].y,6);
});
test('ground plan tracks real burning-trail state without mutating simulation snapshots',()=>{
  const sim=createSimulation({scenario:'chase',seed:27});
  try{
    const snapshot=sim.advance(.5),before=JSON.stringify(snapshot),view=mapView(snapshot);
    assert.ok(view.fire.length>0,'The real ignited trail must contain burning cells');
    assert.equal(view.fire.length,snapshot.cells.filter(c=>c.phase==='burning').length);
    assert.equal(view.obstacles.length,snapshot.world.obstacles.length);
    for(let i=0;i<5;i++)mapView(snapshot);
    assert.equal(JSON.stringify(snapshot),before);assert.equal(JSON.stringify(sim.snapshot()),before);
  }finally{sim.dispose();}
});
test('incomplete map data remains loading and missing fire size cannot create invalid geometry',()=>{
  assert.equal(mapView(null),null);assert.equal(mapView({version:1,world:{width:20,height:0},player:{x:0,y:0}}),null);
  const view=mapView({version:1,world:{width:20,height:10},player:{x:2,y:3},cells:[{x:1,y:1,phase:'burning'}]});
  assert.deepEqual(view.fire,[]);assert.equal(view.player.heading,0);
});
