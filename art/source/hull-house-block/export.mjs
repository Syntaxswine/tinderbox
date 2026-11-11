import fs from 'node:fs';
import {createHash} from 'node:crypto';
const src='art/source/hull-house-block',out='assets/art/hull-house-block';
fs.mkdirSync(out,{recursive:true});
for(const file of ['index.js','architecture.js','forms.js','cloth.js','lettering.js','letters.js','plan.js']){
 fs.writeFileSync(out+'/'+file,fs.readFileSync(src+'/'+file,'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'));
}
fs.copyFileSync('assets/art/ui/typography/besley/OFL.txt',out+'/LETTERING-OFL.txt');
const T=await import('../../../src/runtime/three.js'),kit=await import('../../../assets/art/hull-house-block/index.js');
const a=kit.createHullHouseBlock(T);
try{
 fs.writeFileSync(out+'/block.json',JSON.stringify({version:1,units:'metres',factory:'createHullHouseBlock',buildingFactory:'createHullHouseBuilding',module:'./index.js',skins:kit.HULL_SKINS,metadata:a.metadata,diagnostics:a.diagnostics()},null,2)+'\n');
}finally{a.dispose();}
const rec=p=>{const b=fs.readFileSync(p);return {path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const manifest={assetId:kit.HULL_HOUSE_ASSET_ID,version:1,branch:'codex/hull-house-block-art',baseCommit:'c855e627bdee963e930644839a60c027a03935de',
 proposalCommit:'955728b9ed9d196ca523864700a9c74d641dd11d',enginePin:kit.ENGINE_PIN,hostThreeRevisionTested:T.REVISION,
 nativeProfile:kit.BLOCK_PLAN.native,skins:kit.HULL_SKINS,buildingIds:kit.BLOCK_PLAN.buildings.map(d=>d.id),
 runtimeFiles:['index.js','architecture.js','forms.js','cloth.js','lettering.js','letters.js','plan.js','block.json','LETTERING-OFL.txt'].map(p=>rec(out+'/'+p)),
 dependencies:['vendor/nautilus-engine/'+kit.ENGINE_PIN+'/packages/map-core/wall-runs.js','vendor/nautilus-engine/'+kit.ENGINE_PIN+'/packages/window-kit/index.js','vendor/nautilus-engine/'+kit.ENGINE_PIN+'/packages/window-kit/three.js','vendor/nautilus-engine/'+kit.ENGINE_PIN+'/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-materials.js','vendor/nautilus-engine/'+kit.ENGINE_PIN+'/vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/diagonal-roads.js'].map(rec),
 notices:[rec('vendor/nautilus-engine/'+kit.ENGINE_PIN+'/NOTICE.md'),rec('vendor/nautilus-engine/'+kit.ENGINE_PIN+'/source-evidence/window-sculptures.md')],
 trace:rec(src+'/trace.json'),sourceRecords:[rec(src+'/sources.json'),rec(src+'/preserved.json')],selectedIntake:rec(src+'/intake.json'),newDonorRevisions:[],
 lettering:{font:'Besley',sourceManifest:'assets/art/ui/typography/manifest.json',sourceSha256:'71f352d8859c787631a0978161d48497a72caa69dcae6996d6712a564df86c1e',license:out+'/LETTERING-OFL.txt',adaptation:'Subset outline geometry; unchanged original font and raw license.'},
 ownership:'Host Three, supplied materials and textures are borrowed. Geometry, instance buffers, default and cloned materials are owned. dispose is idempotent. Skin switches allocate nothing.',
 evidence:'Original 1895 survey trace based on 1893 fieldwork. Later 1906 insurance scale is an explicit block-level calibration only. Facades, roof forms and levels are inferred.',
 integration:'Art candidate only. No production placement, collision, traversal, gameplay doors or fire wiring. Native closed 1 x 1.65 m doors do not clear the native goat.'};
fs.writeFileSync(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({exported:manifest.runtimeFiles.length,buildings:manifest.buildingIds.length,three:T.REVISION}));
