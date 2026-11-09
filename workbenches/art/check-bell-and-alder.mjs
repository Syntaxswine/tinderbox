import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as T from '../../src/runtime/three.js';
import {BELL_AND_ALDER as shopLayout} from '../../src/content/bell-and-alder-layout.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {createBellAndAlder} from '../../src/art/bell-and-alder.js';
import {createSimulation} from '../../src/simulation/index.js';
import {inObstacle, sweptDiscClear} from '../../src/simulation/geometry.js';

const pin = '2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74';
const provenance = JSON.parse(readFileSync('vendor/nautilus-engine/' + pin + '/provenance.json'));
const donor = process.argv[2];
for (const file of [...provenance.files, ...provenance.sourceEvidence]) {
  if (donor) {
    const blob = execFileSync('git', ['-C', donor, 'rev-parse', pin + ':' + file.sourcePath], {encoding:'utf8'}).trim();
    assert.equal(blob, file.gitBlob);
  }
  if (!file.installedPath) continue;
  const bytes = readFileSync(file.installedPath);
  assert.equal(bytes.length, file.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
  assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), file.gitBlob);
}

const scenario = {...NEIGHBORHOOD_SCENARIO, player:{x:40,y:18.2}, actors:[]};
const config = {input:{cameraRelative:false}, fire:{damagePerSecond:0}};
const sim = createSimulation({scenario, config, characterId:'bear'});
const first = sim.snapshot(), boxOf = new Map(shopLayout.obstacles.map(o => [o.id, o]));
assert.ok(shopLayout.modules.every(m => m.width === 1 && m.depth === .16 && m.height === 2));
assert.ok(first.world.tiles.some(tile => tile.x === 40.5 && tile.y === 16.5 && tile.material === 'wood'));
const front = first.world.obstacles.filter(o => Math.abs(o.y - 17) <= o.depth / 2 && o.x > 35.5 && o.x < 44.5);
const left = Math.max(...front.filter(o => o.x < 40).map(o => o.x + o.width / 2));
const right = Math.min(...front.filter(o => o.x > 40).map(o => o.x - o.width / 2));
assert.equal(right - left, 2);
assert.equal(first.player.radius, .56);
for (const x of [39.68, 40, 40.32]) {
  assert.ok(sweptDiscClear({x,y:18.2}, {x,y:10.15}, first.player.radius, first.world, first.world.obstacles));
}
assert.ok(!sweptDiscClear({x:38.5,y:18.2}, {x:38.5,y:16}, first.player.radius, first.world, first.world.obstacles));
const walk = (x, y, seconds) => {
  assert.ok(sim.dispatch({type:'move',x,y}));
  for (let i = 0; i < 4; i++) sim.advance(seconds / 4);
  return sim.snapshot().player;
};
const inside = walk(0, -1, .6), outside = walk(0, 1, .6);
assert.ok(inside.y < 13.0 && outside.y > 18.1);
const fuel = new Map(shopLayout.obstacles.filter(o=>o.material==='wood').map(o=>[o.id,
  first.cells.filter(c=>inObstacle(c,o) && c.material==='wood' && c.surfaceFuel>0)]));
assert.ok([...fuel.values()].every(cells=>cells.length>0));

const atlas = new T.Texture();
const namespace = {...T, PointLight: class extends T.PointLight {
  dispose() { this.disposals = (this.disposals ?? 0) + 1; super.dispose(); }
}, TextureLoader: class { async loadAsync(url) {
  assert.match(url, /\/assets\/city-props\/painted-city-materials-v1\.png$/);
  return atlas;
}}};
const art = await createBellAndAlder(namespace);
const scene = new T.Scene();
scene.add(art.root);
art.update(first.world, {player:first.player});
scene.updateMatrixWorld(true);
const geometry = new Set(), materials = new Set(), textures = new Set([atlas]), lamps = [];
for (const object of art.root.children) {
  const box = boxOf.get(object.userData.placementId);
  assert.deepEqual(object.scale.toArray(), [1,1,1]);
  object.traverse(child => {
    if (child.isMesh) {
      geometry.add(child.geometry); materials.add(child.material);
      if (child.material.map) textures.add(child.material.map);
    }
    if (child.isPointLight) lamps.push(child);
  });
  if (!box) continue;
  const actual = new T.Box3().setFromObject(object, true);
  const expected = [box.x-box.width/2,0,box.y-box.depth/2,box.x+box.width/2,box.height,box.y+box.depth/2];
  assert.ok([...actual.min.toArray(), ...actual.max.toArray()].every((value,i)=>Math.abs(value-expected[i])<2e-6), box.id);
}
assert.equal(lamps.length, 2);
const {door, lantern} = shopLayout;
const parlorLamp = lantern.pedestalId;
const lampInfo = () => art.diagnostics().lights.find(l => l.id === parlorLamp);
const standFlame = [lantern.position[0], lantern.position[1] + .138, lantern.position[2]];
assert.equal(lampInfo().objectId, lantern.id);
assert.deepEqual(art.diagnostics().lights.map(l=>l.position), [standFlame,[38.5,1.736,12.5]]);
assert.deepEqual(art.diagnostics().door.leaves, []);
const doorRoot = art.root.getObjectByName(door.id), portable = art.root.getObjectByName(lantern.id);
const portableLight = portable.getObjectByName(lantern.id + ':flame-light');
const {width, depth, height} = door;
const closedLeaves = [
  {id:door.id+':left',x:39.5,y:17,width,depth,height,heading:0},
  {id:door.id+':right',x:40.5,y:17,width,depth,height,heading:0}
];
const openLeaves = [
  {id:door.id+':right',x:41,y:16.5,width:depth,depth:width,height,heading:Math.PI/2},
  {id:door.id+':left',x:39,y:16.5,width:depth,depth:width,height,heading:-Math.PI/2}
];
const withShop = (world, open, state) => ({...world, shop:{
  door:{id:door.id,open,leaves:open?openLeaves:closedLeaves},
  lantern:{id:lantern.id,state,position:state==='placed' ? [...lantern.position] : null}
}});
function verifyLeaves(poses) {
  for (const pose of poses) {
    const leaf = doorRoot.getObjectByName(pose.id);
    assert.equal(leaf.userData.colliderId, pose.id);
    assert.deepEqual(leaf.position.toArray(), [pose.x,0,pose.y]);
    assert.equal(leaf.rotation.y, -pose.heading);
    assert.ok(leaf.children.some(mesh=>mesh.name==='store-glass'&&mesh.material.transparent));
    const bounds = new T.Box3().setFromObject(leaf, true);
    const expected = [pose.x-pose.width/2,0,pose.y-pose.depth/2,pose.x+pose.width/2,height,pose.y+pose.depth/2];
    assert.ok([...bounds.min.toArray(),...bounds.max.toArray()].every((value,i)=>Math.abs(value-expected[i])<2e-6), pose.id);
  }
}
art.update(withShop(first.world,false,'placed'),{player:first.player});
verifyLeaves(closedLeaves);
art.update(withShop(first.world,true,'placed'),{player:first.player});
verifyLeaves(openLeaves);
assert.deepEqual(lampInfo().position, standFlame);
const player = {...first.player, x:40, y:18.5, heading:-Math.PI/2};
art.update(withShop(first.world,true,'carried'),{player});
const carry = art.diagnostics().lantern.position;
assert.ok(carry[0]>player.x+.30 && carry[1]>.4 && carry[1]<.6 && carry[2]>player.y);
assert.equal(portable.rotation.y, -player.heading);
assert.ok(portable.getObjectByName('Lantern leather hanger').visible);
assert.equal(art.root.getObjectByName(lantern.id), portable);
assert.equal(portable.getObjectByName(lantern.id + ':flame-light'), portableLight);
assert.deepEqual(lampInfo().position, [carry[0],carry[1]+.138,carry[2]]);
const moved = {...player, x:42, y:20, heading:0};
art.update(withShop(first.world,true,'carried'),{player:moved});
const movedFlame = lampInfo().position;
assert.ok(movedFlame[0]<moved.x && movedFlame[2]>moved.y+.30);
assert.notDeepEqual(movedFlame, [carry[0],carry[1]+.138,carry[2]]);
assert.equal(art.diagnostics().lights.filter(l=>l.visible).length,2);
const seeded = createSimulation({scenario:{...scenario, ignitions:fuel.get(parlorLamp).map(({x,y})=>({x,y,radius:.035,heat:2.1}))},
  config, characterId:'bear'});
let burnt;
for (let i=0; i<80; i++) {
  const frame=seeded.advance(.25);
  if (frame.events.some(e=>e.type==='obstacle-burnout'&&e.objectId===parlorLamp)) {burnt=frame;break;}
}
assert.ok(burnt && !burnt.world.obstacles.some(o=>o.id===parlorLamp));
assert.ok(burnt.world.obstacles.some(o=>o.id===shopLayout.id+':settee'));
art.update(burnt.world,{player:burnt.player});
assert.equal(art.diagnostics().placements.find(p=>p.id===parlorLamp).visible,false);
assert.equal(art.diagnostics().lights.find(l=>l.id===parlorLamp).visible,false);
art.update(withShop(burnt.world,true,'spent'),{player:moved});
assert.equal(art.diagnostics().lantern.visible,false);
art.update(withShop(burnt.world,true,'carried'),{player:moved});
assert.equal(art.diagnostics().placements.find(p=>p.id===parlorLamp).visible,false);
assert.equal(art.diagnostics().lantern.visible,true);
assert.deepEqual(lampInfo().position, movedFlame);
art.update(withShop(first.world,false,'placed'),{player:first.player});
assert.deepEqual(lampInfo().position, standFlame);
verifyLeaves(closedLeaves);
art.update(first.world);
assert.deepEqual(art.diagnostics().door.leaves, []);
assert.ok(art.diagnostics().lights.every(l=>l.visible));

const counts={geometry:0,materials:0,textures:0};
for(const g of geometry)g.addEventListener('dispose',()=>counts.geometry++);
for(const m of materials)m.addEventListener('dispose',()=>counts.materials++);
for(const t of textures)t.addEventListener('dispose',()=>counts.textures++);
art.dispose();
art.dispose();
assert.deepEqual(counts,{geometry:geometry.size,materials:materials.size,textures:textures.size});
assert.ok(lamps.every(l=>l.parent===null&&l.disposals===1));
assert.equal(art.root.parent,null);
assert.equal(art.root.children.length,0);
const controller = new AbortController(), late = new T.Texture();
let finish, lateDisposals=0;
late.addEventListener('dispose',()=>lateDisposals++);
const pending = createBellAndAlder({...T, TextureLoader:class {loadAsync(){return new Promise(resolve=>{finish=resolve;});}}},
  {signal:controller.signal});
controller.abort();
await assert.rejects(pending, {name:'AbortError'});
finish(late);
await Promise.resolve();
assert.equal(lateDisposals,1);
await assert.rejects(createBellAndAlder(namespace,{signal:controller.signal}),{name:'AbortError'});

sim.dispose();
seeded.dispose();
console.log(JSON.stringify({pass:true, source:pin, copiedFiles:provenance.files.length,
  sourceObjectsRechecked:Boolean(donor), nativeWallModules:shopLayout.modules.length, placedProps:shopLayout.props.length,
  matchedRotatedSolidBounds:boxOf.size, entranceMetres:right-left, nativeBearRadius:first.player.radius,
  insideZ:inside.y, exitedZ:outside.y,
  timberGridCenters:Object.fromEntries([...fuel].map(([id,cells])=>[id,cells.length])),
  parlorStandBurnoutSeconds:burnt.clocks.world, doorPosesVerified:4, sameLanternAndEmitter:true,
  standFlame, carriedFlame:movedFlame, ownedResourcesDisposed:counts, lateAtlasDisposed:lateDisposals},null,2));
