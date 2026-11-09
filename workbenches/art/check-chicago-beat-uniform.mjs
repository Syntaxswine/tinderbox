import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../src/runtime/three.js';
import {createCivilianRig} from '../../src/reuse/civilians.js';
import {CIVILIAN_PROFILES} from '../../src/content/exterior-kit.js';
import {CHICAGO_1893_BEAT, createChicago1893BeatUniform} from '../../src/art/chicago-beat-uniform.js';

const pin = CHICAGO_1893_BEAT.nativeSourceCommit;
const base = 'vendor/farmyard-commando/' + pin + '/sites/tactical-animal/dist/aft/';
const modelFile = base + 'tactics/goat-10k-data.json';
const paintFile = base + 'assets/characters/lowpoly-proof/goat-worker-model-paint-v1.png';
const raw = readFileSync(modelFile);
const model = JSON.parse(raw);
const profile = {...CIVILIAN_PROFILES.goat, team:'civilian', appearance:'normal', headgear:'none', equipment:'none'};
const officer = createCivilianRig('goat',model), control = createCivilianRig('goat',model);
const nativeMeshes = officer.worker.parts.map(m=>({mesh:m,geometry:m.geometry,material:m.material,visible:m.visible}));
const nativeSkeleton = officer.worker.skeleton;
const inverse = nativeSkeleton.boneInverses.map(m=>m.toArray());
const kit = createChicago1893BeatUniform(T, officer);
assert.throws(()=>createChicago1893BeatUniform(T,officer),/already wearing/);
assert.throws(()=>createChicago1893BeatUniform(T,{root:new T.Group()}),/native goat/);

const geometry = new Set(), materials = new Set();
kit.root.traverse(mesh=>{
  if (!mesh.isMesh) return;
  assert.ok(mesh.isSkinnedMesh);
  assert.equal(mesh.skeleton,nativeSkeleton);
  assert.deepEqual(mesh.scale.toArray(),[1,1,1]);
  assert.equal(mesh.geometry.attributes.position.count,mesh.geometry.attributes.skinWeight.count);
  const weights=mesh.geometry.attributes.skinWeight;
  for(let i=0;i<weights.count;i++) assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-6);
  geometry.add(mesh.geometry);materials.add(mesh.material);
});
for(const name of CHICAGO_1893_BEAT.pieces){
  assert.ok(kit.pieces[name].children.length>0);
  kit.setPieceVisible(name,false);
  assert.equal(kit.pieces[name].visible,false);
  kit.setPieceVisible(name,true);
}
kit.setPieceVisible('coat',false);
assert.ok(officer.worker.parts[0].visible);
kit.setPieceVisible('coat',true);
assert.equal(officer.worker.parts[0].visible,false);
for(const record of nativeMeshes){
  assert.equal(record.mesh.geometry,record.geometry);
  assert.equal(record.mesh.material,record.material);
}
assert.ok(officer.worker.parts.find(m=>m.name.includes('swept horns')).visible);
assert.ok(officer.worker.parts.filter(m=>m.name.startsWith('forearm and hand')).every(m=>m.visible));
assert.deepEqual(nativeSkeleton.boneInverses.map(m=>m.toArray()),inverse);

const v=new T.Vector3();
function dressedBounds(){
  const box=new T.Box3();let radius=0;
  officer.root.traverseVisible(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const pos=mesh.geometry.attributes.position,idx=mesh.geometry.index;
    const used=idx?new Set(idx.array):Array.from({length:pos.count},(_,i)=>i);
    for(const i of used){
      v.fromBufferAttribute(pos,i);
      mesh.applyBoneTransform(i,v).applyMatrix4(mesh.matrixWorld);
      assert.ok(v.toArray().every(Number.isFinite));
      box.expandByPoint(v);
      radius=Math.max(radius,Math.hypot(v.x-officer.root.position.x,v.z-officer.root.position.z));
    }
  });
  return {min:box.min.toArray(),max:box.max.toArray(),radius};
}
let maximumHeight=0,maximumRadius=0,poseCount=0,neutral;
for(const heading of [0,.8,1.54,2.65]) for(const travelled of [0,.09,.22,.37,.51,.68,.84,1.14]){
  const state={...profile,x:3,y:5,hp:100,heading,travelled,moving:travelled>0};
  officer.update(state,travelled);
  control.update(state,travelled);
  assert.deepEqual(officer.worker.bones.map(b=>b.matrixWorld.toArray()),control.worker.bones.map(b=>b.matrixWorld.toArray()));
  assert.deepEqual(officer.worker.root.scale.toArray(),[1,1,1]);
  assert.deepEqual(officer.bounds,control.bounds);
  assert.equal(officer.worker.weapon.root.visible,false);
  const bounds=dressedBounds();
  if(!neutral)neutral=bounds;
  maximumHeight=Math.max(maximumHeight,bounds.max[1]);
  maximumRadius=Math.max(maximumRadius,bounds.radius);
  poseCount++;
}
assert.ok(maximumHeight<=officer.bounds.height+1e-6, String(maximumHeight));
assert.ok(maximumRadius<=officer.bounds.radius+1e-6, String(maximumRadius));
let geometryDisposals=0,materialDisposals=0;
for(const g of geometry)g.addEventListener('dispose',()=>geometryDisposals++);
for(const m of materials)m.addEventListener('dispose',()=>materialDisposals++);
const detail=kit.diagnostics();
kit.dispose();kit.dispose();
assert.equal(geometryDisposals,geometry.size);
assert.equal(materialDisposals,materials.size);
assert.equal(kit.root.parent,null);
assert.ok(nativeMeshes.every(r=>r.mesh.visible===r.visible));
const restored={...profile,x:3,y:5,hp:100,heading:0,travelled:0,moving:false};
officer.update(restored,0);
control.update(restored,0);
assert.deepEqual(officer.worker.diagnostics(),control.worker.diagnostics());
officer.dispose();control.dispose();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
console.log(JSON.stringify({pass:true,source:pin,model:{path:modelFile,sha256:hash(raw)},paint:{path:paintFile,sha256:hash(readFileSync(paintFile))},
  pieces:CHICAGO_1893_BEAT.pieces,triangles:detail.triangles,poseCount,maximumHeight,maximumRadius,neutral,
  nativeEnvelope:profile.radius,geometryDisposals,materialDisposals},null,2));
