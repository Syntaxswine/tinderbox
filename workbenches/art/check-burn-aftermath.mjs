import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {HOUSING_PLANS} from '../../src/content/housing-plans.js';
import {RUBBLE_BURN_SECONDS, createBurnedHouseRubble} from '../../src/art/burned-house-rubble.js';
import {createGroundField} from '../../src/art/ground-field.js';
import {createStreetFirelight} from '../../src/art/street-firelight.js';

const house = {id:'after-the-fire', prefabId:'ashland-worker', x:10, y:10, quarterTurns:1};
const player = {x:6, y:13};
const world = {width:20, height:20, fireCellSize:.5};
const frame = (time, buildings = [], events = [], generation = 0, cells = []) => ({
  world:{...world,buildings}, clocks:{world:time}, diagnostics:{generation},
  player, events, cells, tick:Math.round(time * 60)
});
const retired = {...house,destroyed:true};
const receipt = {id:1,type:'building-burnout',buildingId:house.id,worldTime:10};
const layer = createBurnedHouseRubble(T);
const lights = createStreetFirelight(T);
assert.deepEqual(layer.update(frame(9,[house]),9),[]);
assert.equal(layer.root.children.length,0);
assert.deepEqual(layer.update(frame(9.5,[house],[receipt]),9.5),[]);
const hot = layer.update(frame(10.5,[retired],[receipt]),10.5);
assert.equal(hot.length,5);
assert(hot.every(site=>site.flame>0 && site.glow>0 && site.smoke>0));
const lot = layer.root.children[0];
assert.equal(lot.rotation.y,-Math.PI/2);
assert.deepEqual(lot.position.toArray(),[10,0,10]);
assert.equal(layer.diagnostics()[0].retiredAt,10);
assert.deepEqual(layer.update(frame(10.5,[retired]),10.5),hot);
assert.equal(layer.root.children[0],lot);
lights.update(frame(10.5),new Map(),10.5,hot);
const selected = lights.diagnostics().lights;
assert(selected.length > 0 && selected.length <= 6);
assert(selected.every(light=>light.kind==='rubble' && light.intensity<=4 && light.reach===3));
const smolder = layer.update(frame(31,[retired]),31);
assert(smolder.every(site=>site.flame===0 && site.glow>0 && site.smoke>0));
assert(smolder.every((site,i)=>site.glow<hot[i].glow && site.smoke<hot[i].smoke));
const end = 10+RUBBLE_BURN_SECONDS;
assert.deepEqual(layer.update(frame(end,[retired]),end),[]);
lights.update(frame(end),new Map(),end,[]);
assert.equal(lights.diagnostics().lights.length,0);
assert.equal(layer.root.children[0],lot);
assert.equal(layer.diagnostics()[0].glowing,false);
const disposals = [];
for(const mesh of lot.children)mesh.geometry.addEventListener('dispose',()=>disposals.push(mesh.name));
lot.children[1].material.addEventListener('dispose',()=>disposals.push('glow material'));
assert.deepEqual(layer.update(frame(0,[house],[],1),0),[]);
assert.equal(disposals.length,3);
assert.equal(layer.root.children.length,0);
assert.deepEqual(layer.update(frame(10,[retired],[],1),10).length,5);
assert.equal(layer.diagnostics()[0].retiredAt,10);
assert.deepEqual(layer.update(frame(10,[retired],[],2),10),[]);
assert.equal(layer.diagnostics()[0].retiredAt,null);
const exactCottage = {...frame(10,[retired],[],3),cottageFire:{buildings:[{id:house.id,retiredAt:9.5}]}};
assert.equal(layer.update(exactCottage,10).length,5);
assert.equal(layer.diagnostics()[0].retiredAt,9.5);

const placements=Object.keys(HOUSING_PLANS).flatMap(prefabId=>[0,1,2,3].map(quarterTurns=>({
  ...retired,id:prefabId+'/'+quarterTurns,prefabId,quarterTurns
})));
assert.deepEqual(layer.update(frame(0,placements,[],4),0),[]);
let largest=0;
for(const [i,root] of layer.root.children.entries()){
  const {width,depth}=HOUSING_PLANS[placements[i].prefabId];
  assert.equal(root.rotation.y,-placements[i].quarterTurns*Math.PI/2);
  const {triangles}=layer.diagnostics()[i];
  largest=Math.max(largest,triangles);
  for(const mesh of root.children){
    const points=mesh.geometry.getAttribute('position');
    for(let j=0;j<points.count;j++){
      const x=points.getX(j), y=points.getY(j), z=points.getZ(j);
      assert(x>=0 && x<=width && z>=0 && z<=depth && y>=0 && y<.85);
    }
  }
}
assert.equal(layer.root.children.length,placements.length);
layer.dispose();
layer.dispose();
assert.equal(layer.root.children.length,0);
lights.dispose();

const grass = {x:.25,y:.25,material:'grass',phase:'cold',surfaceFuel:.08,depositedFuel:0,heat:0};
const dry = {...grass,surfaceFuel:0};
const paver = {...dry,x:.75,material:'paving',phase:'spent'};
const stillGreen = {...grass,x:1.25};
const terrain = createGroundField(T);
const update = (time, cells, generation=0) => {
  terrain.update(frame(time,[],[],generation,cells));
  return terrain.uniforms.field.value.image.data;
};
assert.equal(update(0,[grass])[2],0);
let data=update(1,[{...dry,phase:'spent'},paver,stillGreen]);
assert.equal(data[2],2);
assert(Math.abs(data[6]-.85)<1e-6);
assert.equal(data[10],0);
assert.equal(data[3],0);
data=update(2,[{...dry,phase:'burning',depositedFuel:.015,intensity:.4}]);
assert.equal(data[2],2);
assert.equal(data[3],1);
assert(data[0]>0);
assert.equal(update(3,[dry])[2],2);
assert.equal(update(3,[dry],1)[2],0);
assert.equal(update(4,[{...dry,phase:'spent',initialSurfaceFuel:0}],1)[2]<1.5,true);
assert.equal(update(5,[{...dry,initialSurfaceFuel:.08}],1)[2],2);
terrain.dispose();

console.log(JSON.stringify({passed:true,seconds:RUBBLE_BURN_SECONDS,placements:placements.length,
  largestPileTriangles:largest,hotPockets:hot.length,lightCap:6,grassChannels:'persistent across re-fuel, isolated from live bit',
  lifecycle:'timed, legacy, late mount, reset and exact retirement'},null,2));
