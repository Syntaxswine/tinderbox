import {HOUSING_SECTION_METRES,housingSectionGrid} from '../content/housing-sections.js';

// Clip the same local-plan columns in color and in the night shadow map.
// The native geometry, transforms and texture coordinates are borrowed intact.
export function createHousingSectionMask(T,root,prefabId){
  const {cols,rows}=housingSectionGrid(prefabId);
  const pixels=new Uint8Array(cols*rows).fill(255);
  const mask=new T.DataTexture(pixels,cols,rows,T.RedFormat);
  mask.needsUpdate=true;
  const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});
  const materials=new Set([depth]);
  root.traverse(object=>{
    if(!object.isMesh)return;
    for(const material of [object.material].flat())materials.add(material);
    object.customDepthMaterial=depth;
  });
  const enabled={value:0},grid={value:new T.Vector2(cols,rows)};
  const worldToPlan={value:root.matrixWorld.clone().invert()};
  for(const material of materials){
    const previous=material.onBeforeCompile,program=material.customProgramCacheKey();
    material.onBeforeCompile=function(shader,renderer){
      previous.call(this,shader,renderer);
      Object.assign(shader.uniforms,{houseSectionMask:{value:mask},houseSectionGrid:grid,houseSectionEnabled:enabled,houseWorldToPlan:worldToPlan});
      shader.vertexShader='uniform mat4 houseWorldToPlan; varying vec2 housePlanXZ;\n'+shader.vertexShader.replace('#include <project_vertex>',
        'housePlanXZ = (houseWorldToPlan * modelMatrix * vec4(transformed, 1.0)).xz;\n#include <project_vertex>');
      shader.fragmentShader='uniform sampler2D houseSectionMask; uniform vec2 houseSectionGrid; uniform float houseSectionEnabled; varying vec2 housePlanXZ;\n'+
        shader.fragmentShader.replace('#include <clipping_planes_fragment>',`
          #include <clipping_planes_fragment>
          if (houseSectionEnabled > 0.5) {
            vec2 section = clamp(floor(housePlanXZ / ${HOUSING_SECTION_METRES.toFixed(1)}), vec2(0.0), houseSectionGrid - 1.0);
            if (texture2D(houseSectionMask, (section + 0.5) / houseSectionGrid).r < 0.5) discard;
          }
        `);
    };
    material.customProgramCacheKey=()=>program+'|catalogue-section-mask';
    material.needsUpdate=true;
  }
  function update(sections){
    let changed=false,holes=0;
    for(const {index,present} of sections){
      const value=present?255:0;
      if(!present)holes++;
      if(pixels[index]===value)continue;
      pixels[index]=value;changed=true;
    }
    enabled.value=Number(holes>0);
    if(changed)mask.needsUpdate=true;
    return changed;
  }
  return {update,dispose(){depth.dispose();mask.dispose();}};
}
