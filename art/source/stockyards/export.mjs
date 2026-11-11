import fs from 'node:fs';
import {createHash} from 'node:crypto';
const src = 'art/source/stockyards', out = 'assets/art/stockyards';
fs.mkdirSync(out, {recursive:true});
for (const [source, target] of [['kit.js', 'index.js'], ['forms.js', 'forms.js'], ['parts.js', 'parts.js'], ['letters.js', 'letters.js']]) {
  fs.writeFileSync(out + '/' + target, fs.readFileSync(src + '/' + source, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'));
}
fs.copyFileSync('assets/art/ui/typography/besley/OFL.txt',out+'/LETTERING-OFL.txt');
const T = await import('../../../src/runtime/three.js');
const kit = await import('../../../assets/art/stockyards/index.js');
const definitions = [];
for (const id of kit.STOCKYARD_PIECES) {
  const a = kit.createStockyardPiece(T, {id});
  try { definitions.push({id, metadata: a.metadata, diagnostics: a.diagnostics()}); } finally { a.dispose(); }
}
const assemblies = [];
for (const id of kit.STOCKYARD_ASSETS) for (const skin of kit.STOCKYARD_SKINS) for (let q = 0; q < 4; q++) {
  const a = kit.createStockyardAsset(T, {id, skin, quarterTurns:q, bays:id === 'covered-swine-pen' ? 2 : 1, gateAngles:[Math.PI/2,0]});
  try { assemblies.push({id, skin, quarterTurns:q, metadata:a.metadata, diagnostics:a.diagnostics()}); } finally { a.dispose(); }
}
fs.writeFileSync(out + '/kit.json', JSON.stringify({version:1, units:'metres', factory:'createStockyardAsset',
  pieceFactory:'createStockyardPiece', module:'./index.js', nativeProfile:kit.STOCKYARD_PROFILE,
  enginePin:kit.ENGINE_PIN, skins:kit.STOCKYARD_SKINS, pieces:definitions, assemblies}, null, 2) + '\n');
const record = p => {const b=fs.readFileSync(p);return {path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const dependency = 'vendor/nautilus-engine/' + kit.ENGINE_PIN + '/packages/map-core/wall-runs.js';
const manifest = {assetId:'stockyards', version:1, baseCommit:'c855e627bdee963e930644839a60c027a03935de',
  proposalCommit:'812cffa900290a04524aa3bae32676cada0ba9cb', branch:'codex/modular-stockyard-art',
  hostThreeRevisionTested:T.REVISION, enginePin:kit.ENGINE_PIN, nativeProfile:kit.STOCKYARD_PROFILE,
  runtimeFiles:['index.js','forms.js','parts.js','letters.js','kit.json','LETTERING-OFL.txt'].map(p=>record(out+'/'+p)),
  dependencies:[record(dependency)], newDonorImports:[], sourceRecords:['art/source/stockyards/sources.json','art/source/stockyards/measurements.json'],
  lettering:{font:'Besley', sourceManifest:'assets/art/ui/typography/manifest.json', license:'assets/art/ui/typography/besley/OFL.txt',
    sourceSha256:'71f352d8859c787631a0978161d48497a72caa69dcae6996d6712a564df86c1e', adaptation:'Subset outline geometry of used uppercase letters. Original font is unchanged.'},
  geometry:'Original procedural geometry; historical scans are reference only, never runtime textures.',
  ownership:'Host Three, supplied materials and textures are borrowed. Default and cloned materials, all generated geometry and batching buffers are owned. dispose is idempotent; skins and gate angle changes reuse resources.',
  integration:'Candidate art provider. Production placement, gameplay, collisions, gate controls and fire behavior await the owner JPG review and later coder contract.'};
fs.writeFileSync(out + '/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({pieces:definitions.length,assemblies:assemblies.length,three:T.REVISION,stats:assemblies.filter(a=>!a.quarterTurns).map(a=>({id:a.id,skin:a.skin,...a.diagnostics}))},null,2));
