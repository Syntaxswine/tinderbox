import {compileScene} from '../../../../workbenches/furnished-house/scene.js';
import {PREPARATION_LIMITS} from '../../../../tools/prepare-source-support.mjs';
// Copied parts/blueprint/compile/resource/cap/cleanup statements are unchanged.
// Fenced phase wrappers expose one compilation to the proof callback.
export function withNativePair({model,sources,data,selected,portalStates},phase,observe,work){
  const policy=PREPARATION_LIMITS,owners=[...new Set(selected.owners)];
  if(owners.length!==selected.owners.length||owners.length!==2)throw Error('Proof requires the exact ordered pair');
  const {parts,estimate}=phase('source-part-preflight',()=>{
  const parts=owners.flatMap(id=>model.carrierById.get(id).parts.map(n=>model.parts[n]));if(parts.length>policy.parts)throw Error('Selected source exceeds part budget');
  let estimate=0;
  for(const p of parts){const g=model.library?.geometries?.[p.geometry];if(!g?.attributes?.position)throw Error('Preparation needs the pinned native geometry library');estimate+=(g.index?.array.length??g.attributes.position.array.length/g.attributes.position.itemSize)/3;}
  if(estimate>policy.sourceTriangles)throw Error('Selected source exceeds triangle budget');
    return {parts,estimate};
  });
  const {surfaces,openings}=phase('native-blueprint',()=>{
  const bundles=owners.map(id=>sources.sourcesForCarrier(id,portalStates)),surfaces=bundles.flatMap(b=>b.surfaces),openings=bundles.flatMap(b=>b.openings||[]);
  if(surfaces.length>policy.surfaces||surfaces.reduce((n,s)=>n+s.triangles.length,0)>policy.sourceTriangles)throw Error('Selected blueprint exceeds preparation budget');
    return {surfaces,openings};
  });
  observe('blueprint',{parts:parts.length,libraryTriangles:estimate,surfaces:surfaces.length,sourceTriangles:surfaces.reduce((n,s)=>n+s.triangles.length,0),openings:openings.length});
  const scene=phase('native-clipping',()=>{
  const scene=compileScene({...data,surfaces,openings,items:[],furnitureParts:[],stores:[],implicitGround:false,runtimeAdapterVersion:1});
    return scene;
  });
  const resources={selectedOwners:owners,compiledNativeScenes:1,trials:0,worldSteps:0,sourceParts:parts.length,sourceSurfaces:surfaces.length,nativeFragments:scene.index.surfaces.size,localCells:scene.cells.size,localFuels:scene.fuels.size,coldGeometryRetained:false};
  try{
    observe('native-resources',resources);
    phase('native-postflight',()=>{
    if(resources.nativeFragments>policy.fragments||resources.localCells>policy.localCells)throw Error('Selected native fragments exceed preparation budget');
    });
    return work({scene,resources,owners});
  }finally{
    for(const map of [scene.index.surfaces,scene.index.bins,scene.cells,scene.fuels,scene.items,scene.parts,scene.sourceDefinitions])map.clear();
    resources.localCompilerDisposed=true;
    observe('native-cleanup',resources);
  }
}
