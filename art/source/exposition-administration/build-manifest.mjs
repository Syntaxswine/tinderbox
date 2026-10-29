import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {createAdministrationBuilding} from '../../../assets/art/exposition-administration/index.js';
const dir='assets/art/exposition-administration',sha=b=>createHash('sha256').update(b).digest('hex'),record=path=>{const b=fs.readFileSync(path);return{path,bytes:b.length,sha256:sha(b)};};
const asset=createAdministrationBuilding(T);
try{
 const {structuralPieces,seamPieces,floorTiles,...summary}=asset.metadata,compiled={structuralPieces,seamPieces,floorTiles};
 fs.writeFileSync(dir+'/metadata.json',JSON.stringify({...summary,compiledStructure:{wallFragments:structuralPieces.length,closureFragments:seamPieces.length,floorFragments:floorTiles.length,sha256:sha(Buffer.from(JSON.stringify(compiled))),records:'Full native panel/cell records are returned by factory.metadata.'}},null,2)+'\n');
 const tiers={kind:'tinderbox-nautilus-building-assembly',version:1,assetId:asset.metadata.assetId,enginePin:asset.metadata.nautilus.enginePin,role:'Candidate whole-building provider data, not an aft-map-v2 or aft-block-v1 save.',profile:asset.metadata.nativeContract,
  tiers:asset.metadata.nautilus.bands,appearanceFactory:'createAdministrationBuilding',factoryModule:'./index.js',floorRecipe:'./plan.js',materialToken:asset.metadata.nautilus.materialToken,
  requires:['Whole-building provider registration / source pin','Consumer capability adapter for floors, openings and custom sculpture'],integration:asset.metadata.integration};
 fs.writeFileSync(dir+'/nautilus-assembly.json',JSON.stringify(tiers,null,2)+'\n');
 const provenance=JSON.parse(fs.readFileSync('art/source/exposition-administration/sources.json')),measurements=JSON.parse(fs.readFileSync('art/source/exposition-administration/measurements.json'));
 const manifest={assetId:asset.metadata.assetId,version:1,factory:'createAdministrationBuilding',branch:'codex/administration-building-art',baseCommit:'b689f5501ab06f54822f2aa724ac77de106e3b71',hostThreeRevisionTested:T.REVISION,units:'metres',
  runtimeFiles:['index.js','engine.js','plan.js','floors.js','stairs.js','metadata.json','nautilus-assembly.json'].map(f=>record(dir+'/'+f)),
  dependencies:['assets/art/exposition-new-york/forms.js','vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js'].map(record),
  engine:{commit:asset.metadata.nautilus.enginePin,implementation:'Actual Nautilus wallPanels, measureWallRun and wallRunErrors; five validated native layer tiers with standard-height offsets.',newDonorImports:[],nativePanels:asset.metadata.nautilus.wallPanels,tierCount:asset.metadata.nautilus.tierCount,editorLimits:'One native map supports six layers. This full landmark remains a separate native building assembly; no unsupported full-map export is claimed.'},
  nativeContract:asset.metadata.nativeContract,sourceRecords:['art/source/exposition-administration/sources.json','art/source/exposition-administration/measurements.json'],sourceIds:provenance.sourceIds,sourceRights:'Original source rights/evidence are recorded separately from existing mixed/unknown donor rights. No new blanket license grant.',
  authored:{bodyWidth:80,bodyDepth:80,crownHeight:76.32,wallRunLengths:[...new Set(asset.metadata.plan.runs.map(r=>Math.round(r.length*1e6)/1e6))].sort((a,b)=>a-b),floorLevels:asset.metadata.floors.map(f=>f.level),pavilionFloorLevels:[1,3,5,7],frontSourceRooms:asset.metadata.plan.rooms.length,spiralStairs:asset.metadata.stairs.length},
  measuredAdaptations:measurements.printedMeasurements,uncertainties:provenance.limitations,physicalMaterial:asset.metadata.physicalMaterial,
  bounds:asset.metadata.localBounds,diagnostics:asset.diagnostics(),appearanceSlots:asset.metadata.appearanceSlots,
  ownership:{owned:'Generated geometry, cloned/default material adapters and instancing allocations. Dispose once using returned idempotent dispose().',borrowed:'Host Three namespace, input materials and all input maps/textures; input materials cloned, originals and texture transforms remain unchanged.'},
  previewResources:['vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/ground-concrete.png','assets/art/exposition-skins-v1/roof-slate-v1.png'].map(record),
  uv:'Native geometry position/normal/UV/index arrays unchanged. Separate grossUV supplies physical metres on planar parts. Dome ribs use tangent width and meridian arclength; turned curved sculpture uses the inherited local/circumference approximations.',
  integration:asset.metadata.integration};
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({asset:manifest.assetId,engine:manifest.engine,authored:manifest.authored,diagnostics:manifest.diagnostics}));
}finally{asset.dispose();}
