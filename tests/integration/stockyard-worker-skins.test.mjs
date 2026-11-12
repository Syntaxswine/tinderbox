import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../../src/runtime/three.js';
import {createCharacterRig} from '../../src/reuse/characters.js';
import {createChicagoPatrolRig} from '../../src/reuse/civilians.js';
import {createStockyardWorkerSkin,dressStockyardWorker,stockyardWorkerReviewEnabled,stockyardWorkerSkinFor} from '../../src/art/stockyard-worker-skins.js';
const base='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/';
const data=JSON.parse(fs.readFileSync(base+'goat-10k-data.json'));
test('worker clothing rejects a dressed patrol and leaves its exact uniform and native skeleton intact',()=>{
 const officer=createChicagoPatrolRig(data),uniform=officer.root.getObjectByName('chicago-1893-city-beat'),bones=officer.worker.skeleton.boneInverses.map(b=>b.toArray());
 try{assert.ok(uniform);assert.throws(()=>createStockyardWorkerSkin(T,officer),/protected police/);assert.equal(officer.root.getObjectByName('chicago-1893-city-beat'),uniform);assert.deepEqual(officer.worker.skeleton.boneInverses.map(b=>b.toArray()),bones);}finally{officer.dispose();}
});
test('disposing a worker presentation restores source clothes and preserves every borrowed native resource',()=>{
 const rig=createCharacterRig('goat',data,{unarmed:true}),source=rig.worker.parts.map(m=>({m,visible:m.visible,geometry:m.geometry,material:m.material}));let nativeDisposals=0;
 for(const s of source)s.geometry.addEventListener('dispose',()=>nativeDisposals++);
 const kit=createStockyardWorkerSkin(T,rig,{skin:'packing-worker'});
 assert.equal(source[0].m.visible,false);assert.equal(source[1].m.visible,false);kit.dispose();kit.dispose();
 assert.equal(nativeDisposals,0);for(const s of source){assert.equal(s.m.visible,s.visible);assert.equal(s.m.geometry,s.geometry);assert.equal(s.m.material,s.material);}
 rig.dispose();assert.equal(nativeDisposals,source.length);
});
test('the game-facing dressed-rig wrapper follows the original dispose chain exactly once',()=>{
 const rig=createCharacterRig('goat',data,{unarmed:true}),release=rig.dispose;let releases=0;rig.dispose=()=>{releases++;release();};
 dressStockyardWorker(T,rig,{skin:'yard-hand'});const before=rig.diagnostics();assert.equal(before.stockyardWorker.species,'goat');assert.equal(before.stockyardWorker.skin,'yard-hand');
 rig.dispose();rig.dispose();assert.equal(releases,1);assert.equal(rig.diagnostics().stockyardWorker.disposed,true);
});
test('the game review switch is explicit and deterministic while regular rendering stays default-off',()=>{
 assert.equal(stockyardWorkerReviewEnabled(''),false);assert.equal(stockyardWorkerReviewEnabled('?stockyardWorkers=0'),false);assert.equal(stockyardWorkerReviewEnabled('?stockyardWorkers=true'),false);assert.equal(stockyardWorkerReviewEnabled('?stockyardWorkers=1'),true);
 assert.equal(stockyardWorkerSkinFor('neighbor-horse'),'packing-worker');assert.equal(stockyardWorkerSkinFor('neighbor-goat'),'yard-hand');assert.equal(stockyardWorkerSkinFor('stable-id'),stockyardWorkerSkinFor('stable-id'));
});

test('worker art accepts the actual civilian-kit root wrapper without exposing its private worker',()=>{
 const rig=createCharacterRig('goat',data,{unarmed:true}),wrapped={root:rig.root,diagnostics:rig.diagnostics,dispose:rig.dispose};
 const clothing=createStockyardWorkerSkin(T,wrapped,{skin:'yard-hand'});
 try{assert.deepEqual(clothing.diagnostics().nativeScale,[1,1,1]);assert.equal(clothing.diagnostics().species,'goat');}finally{clothing.dispose();rig.dispose();}
});
