import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {createCharacterRig,CHARACTER_SOURCE_COMMITS} from '../../../src/reuse/characters.js';
import {CHARACTER_PROFILES} from '../../../src/content/characters.js';
import {createStockyardWorkerSkin,STOCKYARD_WORKER_SKINS,stockyardWorkerReviewEnabled,stockyardWorkerSkinFor} from '../../../src/art/stockyard-worker-skins.js';
const base='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/';
const files={goat:base+'goat-10k-data.json',horse:base+'horse-10k-data.json',bear:'vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/bear-10k-data.json'};
const texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.needsUpdate=true;
const records=[],groups=[],pass=t=>groups.push(t),v=new T.Vector3();
function visibleBounds(rig){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];let radius=0;rig.root.updateMatrixWorld(true);rig.worker.skeleton.update();const inverse=rig.root.matrixWorld.clone().invert();
 rig.root.traverseVisible(m=>{if(!m.isSkinnedMesh)return;const used=m.geometry.index?new Set(m.geometry.index.array):Array.from({length:m.geometry.attributes.position.count},(_,i)=>i),relative=new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld);
 for(const i of used){m.getVertexPosition(i,v).applyMatrix4(relative);assert.ok(v.toArray().every(Number.isFinite));for(let a=0;a<3;a++){min[a]=Math.min(min[a],v.getComponent(a));max[a]=Math.max(max[a],v.getComponent(a));}radius=Math.max(radius,Math.hypot(v.x,v.z));}
 });return{min,max,radius};}
for(const [species,file]of Object.entries(files))for(const skin of STOCKYARD_WORKER_SKINS){
 const bytes=fs.readFileSync(file),data=JSON.parse(bytes),before=JSON.stringify(data),rig=createCharacterRig(species,data,{unarmed:true}),control=createCharacterRig(species,data,{unarmed:true});
 rig.setHeldVisible(false);control.setHeldVisible(false);
 const source=rig.worker.parts.map(m=>({m,g:m.geometry,mat:m.material,visible:m.visible,hash:createHash('sha256').update(Buffer.from(m.geometry.attributes.position.array.buffer)).digest('hex')}));
 const inverses=rig.worker.skeleton.boneInverses.map(m=>m.toArray()),clothing=createStockyardWorkerSkin(T,rig,{skin,texture});
 try{
  assert.throws(()=>createStockyardWorkerSkin(T,rig,{skin,texture}),/already fitted/);
  const gs=new Set(),ms=new Set();clothing.root.traverse(m=>{if(!m.isMesh)return;assert.ok(m.isSkinnedMesh);assert.equal(m.material.map,texture);assert.equal(m.skeleton,rig.worker.skeleton);assert.deepEqual(m.scale.toArray(),[1,1,1]);assert.equal(m.geometry.attributes.position.count,m.geometry.attributes.skinWeight.count);
   const w=m.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-6);
   gs.add(m.geometry);ms.add(m.material);});
  assert.ok(rig.worker.parts.filter(m=>/skull|horn|ear|beard|mane|tail|hand|hoof|foot/.test(m.name)).every(m=>m.visible));
  assert.deepEqual(rig.worker.skeleton.boneInverses.map(m=>m.toArray()),inverses);
  let height=0,radius=0,minY=Infinity;
  for(const heading of [0,.8,1.54,2.65])for(const travelled of [0,.09,.22,.37,.51,.68,.84,1.14]){
   const state={x:3,y:5,heading,travelled,moving:travelled>0,tool:'matches'};rig.update(state,travelled);control.update(state,travelled);rig.setHeldVisible(false);
   assert.deepEqual(rig.worker.bones.map(b=>b.matrixWorld.toArray()),control.worker.bones.map(b=>b.matrixWorld.toArray()));
   const b=visibleBounds(rig);height=Math.max(height,b.max[1]);radius=Math.max(radius,b.radius);minY=Math.min(minY,b.min[1]);
  }
  assert.deepEqual(rig.worker.root.scale.toArray(),[1,1,1]);
  assert.ok(height<=CHARACTER_PROFILES[species].height+1e-5,JSON.stringify({species,skin,height}));
  assert.ok(radius<=CHARACTER_PROFILES[species].radius+1e-5,JSON.stringify({species,skin,radius}));
  for(const s of source){assert.equal(s.m.geometry,s.g);assert.equal(s.m.material,s.mat);assert.equal(createHash('sha256').update(Buffer.from(s.g.attributes.position.array.buffer)).digest('hex'),s.hash);}
  assert.equal(JSON.stringify(data),before);
  let gd=0,md=0;for(const g of gs)g.addEventListener('dispose',()=>gd++);for(const m of ms)m.addEventListener('dispose',()=>md++);
  const diagnostics=clothing.diagnostics();assert.ok(diagnostics.resources.geometries<=(skin==='packing-worker'?4:3));assert.equal(diagnostics.paintVersion,2);assert.ok(['braces','waistcoat','details'].every(piece=>clothing.pieces[piece].children.length===0));clothing.dispose();clothing.dispose();assert.equal(gd,gs.size);assert.equal(md,ms.size);assert.ok(source.every(s=>s.m.visible===s.visible));assert.equal(clothing.root.parent,null);
  records.push({species,skin,sourceCommit:CHARACTER_SOURCE_COMMITS[species],sourcePath:file,sha256:createHash('sha256').update(bytes).digest('hex'),poses:32,height,radius,minY,diagnostics});
 }finally{clothing.dispose();rig.dispose();control.dispose();}
}
pass('All nine native species/outfit pairs fit the existing player envelopes over 288 idle/walking/heading samples');
pass('Native body vertices/materials, skeleton/bind matrices, gait and input data are unchanged; hands/heads/horns/ears/feet remain visible');
pass('Every garment uses the existing skeleton and normalized weights, owns its copies and restores source visibility on idempotent disposal');
assert.equal(stockyardWorkerReviewEnabled(''),false);assert.equal(stockyardWorkerReviewEnabled('?stockyardWorkers=1'),true);assert.equal(stockyardWorkerReviewEnabled('?stockyardWorkers=true'),false);
assert.equal(stockyardWorkerSkinFor('neighbor-goat'),'yard-hand');assert.equal(stockyardWorkerSkinFor('neighbor-horse'),'packing-worker');
pass('Review mode is explicit and default-off; stable civilian IDs select independent worker looks');
fs.mkdirSync('docs/art/stockyard-workers',{recursive:true});
fs.writeFileSync('docs/art/stockyard-workers/fit-checks.json',JSON.stringify({passed:groups.length,failed:0,groups,records,limits:['Finite native rig/geometry proof; actual game WebGL/JPG review is separate.']},null,2)+String.fromCharCode(10));
texture.dispose();
console.log(JSON.stringify({passed:groups.length,failed:0,pairs:records.length,poses:records.length*32}));
