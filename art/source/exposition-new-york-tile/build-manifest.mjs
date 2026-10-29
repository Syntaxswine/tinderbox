import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {createNewYorkStateBuildingTile} from '../../../assets/art/exposition-new-york-tile/index.js';
const dir='assets/art/exposition-new-york-tile',sha=b=>createHash('sha256').update(b).digest('hex');
const record=path=>{const b=fs.readFileSync(path);return{path,bytes:b.length,sha256:sha(b)};};
const asset=createNewYorkStateBuildingTile(T);
try{
 const {structuralPieces,seamPieces,floorTiles,...summary}=asset.metadata;
 const compiled={structuralPieces,seamPieces,floorTiles};
 fs.writeFileSync(dir+'/metadata.json',JSON.stringify({...summary,compiledStructure:{wallPieces:structuralPieces.length,perimeterClosures:seamPieces.length,floorTiles:floorTiles.length,sha256:sha(Buffer.from(JSON.stringify(compiled))),records:'Full fragment/tile records are returned by factory.metadata; static metadata keeps the recipe and a checked compilation digest.'}},null,2)+'\n');
 const manifest={assetId:asset.metadata.assetId,version:1,factory:'createNewYorkStateBuildingTile',units:'metres',hostThreeRevisionTested:T.REVISION,
  runtimeFiles:['index.js','plan.js','metadata.json'].map(f=>record(dir+'/'+f)),dependencies:['assets/art/exposition-new-york/forms.js','assets/art/exposition-new-york/native-contract.js'].map(record),
  nativeContract:asset.metadata.nativeContract,nativeReferenceCommit:'30a3b8cae5f36bb0c1df3685b7fba16f701c2083',nativeReferenceFiles:['src/content/asset-scale.js','vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/hybrid-geometry.js'].map(record),
  original:asset.metadata.preservedOriginal,preservationRecord:'art/source/exposition-new-york-tile/preserved-original.json',sourceRecord:'art/source/exposition-new-york/sources.json',
  source:'TB009-R02: McKim, Mead & White, plates43/44, Getty / Internet Archive gri_33125006526145; source image hashes and rights evidence retained in the unchanged original record.',
  sourceStatus:'Derived tile adaptation, not an as-built plan. Historical room subdivisions remain unimplemented.',
  adaptations:[{feature:'main facade',original:47,tiled:48},{feature:'main depth',original:27,tiled:28},{feature:'rear projection',original:32,tiled:34},
   {feature:'rear shoulder half-width',original:13.25,tiled:14},{feature:'rear centre half-width',original:7.25,tiled:8},
   {feature:'main upper floor',original:'No full interior slab authored; facade bands at7.85/8.12/8.43',tiled:8.48},
   {feature:'attic floor',original:'No interior slab authored; facade band at14.22',tiled:14.84},
   {feature:'main roof slab',original:'No full interior slab; low hip at17.72',tiled:16.96},
   {feature:'clerestory roof slab',original:'No floor recipe; hip at21.65',tiled:21.2},
   {feature:'upper terrace',original:24.02,tiled:23.32},{feature:'porch upper deck',original:8.84,tiled:8.48},
   {feature:'tower roof slab',original:'No floor recipe; cap hip at31.59',tiled:31.8}],
  plan:{path:dir+'/plan.js',wallRuns:asset.metadata.tilePlan.runs.length,wallLengths:[...new Set(asset.metadata.tilePlan.runs.map(r=>r.length))].sort((a,b)=>a-b),floorPitch:2.12,floorLevels:[...new Set(asset.metadata.floors.map(f=>f.level))].sort((a,b)=>a-b),tallRooms:asset.metadata.tilePlan.tallRooms,exceptions:asset.metadata.tilePlan.exceptions},
  bounds:asset.metadata.localBounds,diagnostics:asset.diagnostics(),appearanceSlots:asset.metadata.appearanceSlots,
  ownership:{owned:'Geometry, instancing allocations and cloned/default materials; returned dispose() is idempotent.',borrowed:'Host Three namespace, supplied materials and maps/textures. Supplied materials are cloned; originals/maps are never changed or disposed.'},
  previewResources:['vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/ground-concrete.png','assets/art/exposition-skins-v1/roof-slate-v1.png'].map(record),
  integration:asset.metadata.integration};
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({assetId:manifest.assetId,wallRuns:manifest.plan.wallRuns,wallLengths:manifest.plan.wallLengths,floorLevels:manifest.plan.floorLevels,diagnostics:manifest.diagnostics}));
}finally{asset.dispose();}
