import test from 'node:test';
import assert from 'node:assert/strict';
import {mapView,mountMap} from '../../src/ui/map.js';
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


// Minimal SVG host for checking the mounted map without a browser process.
function svgElement() {
  const attributes = new Map(), children = [];
  return {
    attributes, children, dataset:{},
    setAttribute:(key,value) => attributes.set(key,value),
    removeAttribute:key => attributes.delete(key),
    append:(...nodes) => children.push(...nodes),
    prepend:node => children.unshift(node),
    replaceChildren:() => { children.length = 0; }
  };
}
function mountedMap(options) {
  const host = svgElement();
  host.ownerDocument = {createElementNS:svgElement};
  const {update} = mountMap(host,options);
  const [svg] = host.children;
  const [terrain,buildings,fire,player] = svg.children;
  return {update,host,svg,terrain,buildings,fire,player};
}
function tracked(record,key) {
  let reads = 0;
  const item = Object.freeze({...record,get [key]() { reads++; return record[key]; }});
  return {item,get reads() { return reads; }};
}
function snapshotForMap(world = {},cells = []) {
  return {version:1,world:{width:30,height:10,fireCellSize:.5,...world},player:{x:5,y:3},cells};
}

test('mounted ground plan skips all frozen layer reads when only the marker and dimensions change',()=>{
  const tile = tracked({x:2.5,y:6.5,size:1,material:'grass'},'x');
  const obstacle = tracked({x:22,y:3,width:4,depth:2},'x');
  const cell = tracked({x:8.25,y:4.25,phase:'burning'},'phase');
  const input = snapshotForMap({tiles:Object.freeze([tile.item]),obstacles:Object.freeze([obstacle.item])},Object.freeze([cell.item]));
  const {update,host,svg,terrain,buildings,fire,player} = mountedMap({label:'Place plan',playerLabel:'Visitor'});
  update(input);
  const [grass] = terrain.children, initialReads = [tile.reads,obstacle.reads,cell.reads];
  assert.ok(initialReads.every(count => count > 0));
  assert.equal(grass.attributes.get('fill'),'#b39352');
  assert.equal(grass.attributes.get('d'),'M2 6h1v1h-1Z');
  assert.equal(buildings.attributes.get('d'),'M20 2h4v2h-4Z');
  assert.equal(fire.attributes.get('d'),'M8 4h0.5v0.5h-0.5Z');

  update(null);
  assert.equal(svg.attributes.get('visibility'),'hidden');
  assert.equal(host.attributes.get('aria-label'),'Place plan loading.');
  update({...input,world:{...input.world,width:100,height:30},player:{x:19,y:3,heading:Math.PI/2}});
  assert.deepEqual([tile.reads,obstacle.reads,cell.reads],initialReads);
  assert.equal(terrain.children[0],grass);
  assert.equal(svg.attributes.has('visibility'),false);
  assert.equal(svg.attributes.get('viewBox'),'0 0 100 30');
  assert.equal(player.attributes.get('transform'),'translate(19 3) rotate(90) scale(4.5)');
  assert.deepEqual(host.dataset,{ready:'true',playerX:'19',playerY:'3',heading:'90',fireCount:'1'});
  assert.equal(host.attributes.get('aria-label'),'Place plan. Visitor at x 19.0, y 3.0. 1 burning cells. Logical x right; y down.');

  const changedObstacle = Object.freeze({...obstacle.item,destroyed:true});
  update({...input,world:{...input.world,obstacles:Object.freeze([changedObstacle])}});
  assert.equal(buildings.attributes.get('d'),'');
  assert.equal(tile.reads,initialReads[0]);
  assert.equal(cell.reads,initialReads[2]);
});

test('frozen cell deltas read changed records and keep fire paths in snapshot order through reset',()=>{
  const first = tracked({x:8.25,y:4.25,phase:'burning'},'phase');
  const third = tracked({x:2.25,y:4.25,phase:'burning'},'x');
  const middle = Object.freeze({x:5.25,y:4.25,phase:'heating'});
  const cells = Object.freeze([first.item,middle,third.item]);
  const snapshot = snapshotForMap({tiles:Object.freeze([Object.freeze({x:.5,y:.5,size:1,material:'paving'})])},cells);
  const {update,host,fire,terrain} = mountedMap();
  update(snapshot);
  const originalReads = [first.reads,third.reads];
  const burning = Object.freeze({...middle,phase:'burning'});
  const ignited = Object.freeze([first.item,burning,third.item]);
  update({...snapshot,cells:ignited});
  assert.deepEqual([first.reads,third.reads],originalReads);
  assert.equal(fire.attributes.get('d'),'M8 4h0.5v0.5h-0.5ZM5 4h0.5v0.5h-0.5ZM2 4h0.5v0.5h-0.5Z');
  assert.equal(host.dataset.fireCount,'3');

  const cooled = Object.freeze({...burning,phase:'burned'});
  update({...snapshot,cells:Object.freeze([first.item,cooled,third.item])});
  assert.deepEqual([first.reads,third.reads],originalReads);
  assert.equal(fire.attributes.get('d'),'M8 4h0.5v0.5h-0.5ZM2 4h0.5v0.5h-0.5Z');
  assert.equal(host.dataset.fireCount,'2');

  const resetCells = Object.freeze([third.item]);
  const reset = snapshotForMap({tiles:Object.freeze([])},resetCells);
  update(reset);
  assert.equal(terrain.children.length,0);
  assert.equal(fire.attributes.get('d'),'M2 4h0.5v0.5h-0.5Z');
  assert.equal(host.dataset.fireCount,'1');
  update({...reset,world:{...reset.world,fireCellSize:1}});
  assert.equal(fire.attributes.get('d'),'M1.75 3.75h1v1h-1Z');
  update({...reset,world:{...reset.world,fireCellSize:0}});
  assert.equal(fire.attributes.get('d'),'');
  assert.equal(host.dataset.fireCount,'0');
});

test('mounted and public map views still project mutable fixtures in place',()=>{
  const tile = {x:.5,y:.5,size:1,material:'paving'};
  const obstacle = {x:2,y:3,width:2,depth:2};
  const cell = {x:4.25,y:2.25,phase:'heating'};
  const snapshot = snapshotForMap({tiles:[tile],obstacles:[obstacle]},[cell]);
  const {update,host,terrain,buildings,fire} = mountedMap();
  update(snapshot);
  tile.x = 2.5;
  obstacle.destroyed = true;
  cell.phase = 'burning';
  update(snapshot);
  assert.equal(terrain.children[0].attributes.get('d'),'M2 0h1v1h-1Z');
  assert.equal(buildings.attributes.get('d'),'');
  assert.equal(fire.attributes.get('d'),'M4 2h0.5v0.5h-0.5Z');
  assert.equal(host.dataset.fireCount,'1');
  assert.match(host.attributes.get('aria-label'),/1 burning cells/);

  const frozen = snapshotForMap({tiles:Object.freeze([Object.freeze({...tile})])},Object.freeze([Object.freeze({...cell})]));
  const view = mapView(frozen);
  view.tiles[0].x = 99;
  view.fire.pop();
  assert.equal(mapView(frozen).tiles[0].x,2);
  assert.equal(mapView(frozen).fire.length,1);
  update(frozen);
  update(snapshot);
  cell.phase = 'cold';
  update(snapshot);
  assert.equal(fire.attributes.get('d'),'');
  assert.equal(host.dataset.fireCount,'0');
  update(frozen);
  assert.equal(fire.attributes.get('d'),'M4 2h0.5v0.5h-0.5Z');
  assert.equal(host.dataset.fireCount,'1');
});


test('mounted ground plan reads in-place edits inside frozen layer lists',()=>{
  const tile = {x:1.5,y:.5,size:1,material:'paving'};
  const obstacle = {x:2.5,y:2.5,width:1,depth:1};
  const first = {id:'a',x:.25,y:.25,phase:'cold'};
  const second = {id:'b',x:.75,y:.25,phase:'cold'};
  const tiles = Object.freeze([Object.freeze({...tile,x:.5,material:'grass'}),tile]);
  const obstacles = Object.freeze([Object.freeze({...obstacle,x:.5}),obstacle]);
  const cells = Object.freeze([Object.freeze({x:1.25,y:.25,phase:'cold'}),first,second]);
  const snapshot = snapshotForMap({width:4,height:4,tiles,obstacles},cells);
  const {update,host,terrain,buildings,fire} = mountedMap();
  update(snapshot);
  assert.equal(host.dataset.fireCount,'0');

  tile.x = 2.5;
  obstacle.destroyed = true;
  first.phase = 'burning';
  update(snapshot);
  assert.deepEqual({
    tile:terrain.children[1].attributes.get('d'),
    buildings:buildings.attributes.get('d'),
    fire:fire.attributes.get('d'),
    count:host.dataset.fireCount
  },{
    tile:'M2 0h1v1h-1Z',
    buildings:'M0 2h1v1h-1Z',
    fire:'M0 0h0.5v0.5h-0.5Z',
    count:'1'
  });

  first.phase = 'spent';
  second.phase = 'burning';
  update({...snapshot});
  assert.equal(fire.attributes.get('d'),'M0.5 0h0.5v0.5h-0.5Z');
  assert.equal(host.dataset.fireCount,'1');
});
