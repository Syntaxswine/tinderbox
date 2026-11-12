import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../../src/runtime/three.js';
import {createCharacterRig} from '../../src/reuse/characters.js';
import {createChicagoPatrolRig} from '../../src/reuse/civilians.js';
import {loadStockyardWorkerPaint} from '../../src/art/stockyard-worker-paint.js';
import {createStockyardWorkerSkin,dressStockyardWorker,stockyardWorkerReviewEnabled,stockyardWorkerSkinFor} from '../../src/art/stockyard-worker-skins.js';
const base='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/';
const texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);
const data=JSON.parse(fs.readFileSync(base+'goat-10k-data.json'));
test('worker clothing rejects a dressed patrol and leaves its exact uniform and native skeleton intact',()=>{
 const officer=createChicagoPatrolRig(data),uniform=officer.root.getObjectByName('chicago-1893-city-beat'),bones=officer.worker.skeleton.boneInverses.map(b=>b.toArray());
 try{assert.ok(uniform);assert.throws(()=>createStockyardWorkerSkin(T,officer),/protected police/);assert.equal(officer.root.getObjectByName('chicago-1893-city-beat'),uniform);assert.deepEqual(officer.worker.skeleton.boneInverses.map(b=>b.toArray()),bones);}finally{officer.dispose();}
});
test('disposing a worker presentation restores source clothes and preserves every borrowed native resource',()=>{
 const rig=createCharacterRig('goat',data,{unarmed:true}),source=rig.worker.parts.map(m=>({m,visible:m.visible,geometry:m.geometry,material:m.material}));let nativeDisposals=0,paintDisposals=0;texture.addEventListener('dispose',()=>paintDisposals++);
 for(const s of source)s.geometry.addEventListener('dispose',()=>nativeDisposals++);
 const kit=createStockyardWorkerSkin(T,rig,{skin:'packing-worker',texture});
 assert.equal(source[0].m.visible,false);assert.equal(source[1].m.visible,false);kit.dispose();kit.dispose();
 assert.equal(nativeDisposals,0);assert.equal(paintDisposals,0);for(const s of source){assert.equal(s.m.visible,s.visible);assert.equal(s.m.geometry,s.geometry);assert.equal(s.m.material,s.material);}
 rig.dispose();assert.equal(nativeDisposals,source.length);
});
test('the game-facing dressed-rig wrapper follows the original dispose chain exactly once',()=>{
 const rig=createCharacterRig('goat',data,{unarmed:true}),release=rig.dispose;let releases=0;rig.dispose=()=>{releases++;release();};
 dressStockyardWorker(T,rig,{skin:'yard-hand',texture});const before=rig.diagnostics();assert.equal(before.stockyardWorker.species,'goat');assert.equal(before.stockyardWorker.skin,'yard-hand');
 rig.dispose();rig.dispose();assert.equal(releases,1);assert.equal(rig.diagnostics().stockyardWorker.disposed,true);
});
test('the game review switch is explicit and deterministic while regular rendering stays default-off',()=>{
 assert.equal(stockyardWorkerReviewEnabled(''),false);assert.equal(stockyardWorkerReviewEnabled('?stockyardWorkers=0'),false);assert.equal(stockyardWorkerReviewEnabled('?stockyardWorkers=true'),false);assert.equal(stockyardWorkerReviewEnabled('?stockyardWorkers=1'),true);
 assert.equal(stockyardWorkerSkinFor('neighbor-horse'),'packing-worker');assert.equal(stockyardWorkerSkinFor('neighbor-goat'),'yard-hand');assert.equal(stockyardWorkerSkinFor('stable-id'),stockyardWorkerSkinFor('stable-id'));
});

test('worker art accepts the actual civilian-kit root wrapper without exposing its private worker',()=>{
 const rig=createCharacterRig('goat',data,{unarmed:true}),wrapped={root:rig.root,diagnostics:rig.diagnostics,dispose:rig.dispose};
 const clothing=createStockyardWorkerSkin(T,wrapped,{skin:'yard-hand',texture});
 try{assert.deepEqual(clothing.diagnostics().nativeScale,[1,1,1]);assert.equal(clothing.diagnostics().species,'goat');}finally{clothing.dispose();rig.dispose();}
});

test('shared painted atlas kit owns three textures, tolerates garment retirement and releases once',async()=>{
 const textures=[],kit=await loadStockyardWorkerPaint(T,{loadTexture:async()=>{const t=new T.Texture();textures.push(t);return t;}});let disposed=0;
 for(const t of textures)t.addEventListener('dispose',()=>disposed++);
 assert.equal(kit.diagnostics().textures,3);assert.equal(kit.get('yard-hand').colorSpace,T.SRGBColorSpace);
 const rig=createCharacterRig('goat',data,{unarmed:true}),clothes=createStockyardWorkerSkin(T,rig,{skin:'yard-hand',texture:kit.get('yard-hand')});
 clothes.dispose();assert.equal(disposed,0);rig.dispose();kit.dispose();kit.dispose();assert.equal(disposed,3);assert.throws(()=>kit.get('yard-hand'),/unavailable/);
});
test('a failed or cancelled paint intake releases every successfully loaded atlas',async()=>{
 let disposed=0,count=0;
 const loadTexture=async()=>{count++;if(count===2)throw Error('fixture missing');const t=new T.Texture();t.addEventListener('dispose',()=>disposed++);return t;};
 await assert.rejects(loadStockyardWorkerPaint(T,{loadTexture}),/could not load/);assert.equal(disposed,2);
 const controller=new AbortController();disposed=0;
 await assert.rejects(loadStockyardWorkerPaint(T,{signal:controller.signal,loadTexture:async()=>{const t=new T.Texture();t.addEventListener('dispose',()=>disposed++);controller.abort();return t;}}),{name:'AbortError'});assert.equal(disposed,3);
});
test('painted garment details do not need separate trim meshes or an unpainted fallback',()=>{
 const rig=createCharacterRig('goat',data,{unarmed:true});
 try{
  assert.throws(()=>createStockyardWorkerSkin(T,rig,{skin:'yard-hand'}),/requires its painted texture/);
  for(const skin of ['yard-hand','packing-worker','yard-foreman']){
   const clothing=createStockyardWorkerSkin(T,rig,{skin,texture});
   assert.equal(clothing.diagnostics().paintVersion,2);assert.ok(['braces','waistcoat','details'].every(name=>clothing.pieces[name].children.length===0));
   assert.equal(clothing.diagnostics().resources.geometries,skin==='packing-worker'?4:3);
   assert.throws(()=>createStockyardWorkerSkin(T,rig,{skin:'packing-worker',texture}),/already fitted/);
   clothing.dispose();
  }
 }finally{rig.dispose();}
});
