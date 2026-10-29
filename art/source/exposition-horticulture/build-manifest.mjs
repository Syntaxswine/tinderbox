import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../../../src/runtime/three.js';
import {createHorticultureTerrace} from '../../../assets/art/exposition-horticulture/terrace.js';
import {createHorticulturalBuilding} from '../../../assets/art/exposition-horticulture/index.js';
const dir='assets/art/exposition-horticulture',sha=b=>createHash('sha256').update(b).digest('hex'),record=path=>{const b=fs.readFileSync(path);return{path,bytes:b.length,sha256:sha(b)};};
const asset=createHorticulturalBuilding(T);
try{
 const {structuralPieces,seamPieces,floorTiles,...summary}=asset.metadata,compiled={structuralPieces,seamPieces,floorTiles};
 fs.writeFileSync(dir+'/metadata.json',JSON.stringify({...summary,compiledStructure:{wallFragments:structuralPieces.length,closureFragments:seamPieces.length,floorFragments:floorTiles.length,sha256:sha(Buffer.from(JSON.stringify(compiled))),records:'Full native panel/cell records are returned by factory.metadata.'}},null,2)+'\n');
 const tiers={kind:'tinderbox-nautilus-building-assembly',version:1,assetId:asset.metadata.assetId,enginePin:asset.metadata.nautilus.enginePin,role:'Candidate whole-building provider data, not an aft-map-v2 or aft-block-v1 save.',profile:asset.metadata.nativeContract,
  tiers:asset.metadata.nautilus.tiers,appearanceFactory:'createHorticulturalBuilding',factoryModule:'./index.js',floorRecipe:'./plan.js',materialToken:asset.metadata.nautilus.materialToken,
  requires:['Whole-building provider registration / source pin','Consumer capability adapter for floors, openings and custom sculpture'],integration:asset.metadata.integration};
 fs.writeFileSync(dir+'/nautilus-assembly.json',JSON.stringify(tiers,null,2)+'\n');
 const provenance=JSON.parse(fs.readFileSync('art/source/exposition-horticulture/sources.json')),measurements=JSON.parse(fs.readFileSync('art/source/exposition-horticulture/measurements.json'));
 const terrace=createHorticultureTerrace(T);const terraceRecord={metadata:terrace.metadata,diagnostics:terrace.diagnostics()};terrace.dispose();fs.writeFileSync(dir+'/terrace-assembly.json',JSON.stringify(terraceRecord,null,2)+'\n');
 const manifest={assetId:asset.metadata.assetId,version:1,factory:'createHorticulturalBuilding',branch:'codex/horticultural-building-art',baseCommit:'c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9',hostThreeRevisionTested:T.REVISION,units:'metres',
  runtimeFiles:['index.js','engine.js','plan.js','floors.js','terrace.js','metadata.json','nautilus-assembly.json','terrace-assembly.json'].map(f=>record(dir+'/'+f)),
  dependencies:['assets/art/horticulture-waterfront/index.js','assets/art/exposition-new-york/forms.js','vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js'].map(record),
  engine:{commit:asset.metadata.nautilus.enginePin,implementation:'Actual Nautilus wallPanels, measureWallRun and wallRunErrors; validated native wall fragments with standard-height offsets.',newDonorImports:[],nativePanels:asset.metadata.nautilus.panels,tierCount:asset.metadata.nautilus.tiers.length,editorLimits:'One native map supports six layers. This full landmark remains a separate native building assembly; no unsupported full-map export is claimed.'},
  nativeContract:asset.metadata.nativeContract,sourceRecords:['art/source/exposition-horticulture/sources.json','art/source/exposition-horticulture/measurements.json'],sourceIds:provenance.sourceIds,sourceRights:'Original source rights/evidence are recorded separately from existing mixed/unknown donor rights. No new blanket license grant.',
  authored:{bodyWidth:306,endBodyDepth:76,fullProjection:88,crownHeight:33.92,domeDiameter:56,wallRunLengths:[...new Set(asset.metadata.plan.runs.map(r=>Math.round(r.length*1e6)/1e6))].sort((a,b)=>a-b),floorLevels:asset.metadata.floors.map(f=>f.level),pavilionFloorLevels:[1,3],stairs:asset.metadata.stairs.length,terrace:terraceRecord.diagnostics},
  measuredAdaptations:measurements.printedMeasurements,uncertainties:provenance.limitations,physicalMaterial:asset.metadata.physicalMaterial,
  bounds:asset.metadata.localBounds,diagnostics:asset.diagnostics(),appearanceSlots:asset.metadata.appearanceSlots,
  ownership:{owned:'Generated geometry, cloned/default material adapters and instancing allocations. Dispose once using returned idempotent dispose().',borrowed:'Host Three namespace, input materials and all input maps/textures; input materials cloned, originals and texture transforms remain unchanged.'},
  previewResources:[],
  uv:'Native geometry position/normal/UV/index arrays unchanged. Separate grossUV supplies physical metres on planar parts. Dome ribs use tangent width and meridian arclength; turned curved sculpture uses the inherited local/circumference approximations.',
  integration:asset.metadata.integration};
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({asset:manifest.assetId,engine:manifest.engine,authored:manifest.authored,diagnostics:manifest.diagnostics}));
}finally{asset.dispose();}
