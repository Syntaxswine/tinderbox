import {housingSectionGrid} from '../content/housing-sections.js';

// Clip native plan columns in color and in the shadow map. A complementary
// mask exposes only retired columns in the artist's shared rubble geometry.
export function createHousingSectionMask(T,root,prefabId,{metres,glowMaterial}={}){
  const gridShape=housingSectionGrid(prefabId,metres);
  const {cols,rows}=gridShape,stride=glowMaterial?2:1;
  const pixels=new Uint8Array(cols*rows*stride);
  for(let i=0;i<pixels.length;i+=stride)pixels[i]=255;
  const mask=new T.DataTexture(pixels,cols,rows,glowMaterial?T.RGFormat:T.RedFormat);
  mask.needsUpdate=true;
  const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});
  const materials=new Set([depth]);
  root.traverse(object=>{
    if(!object.isMesh)return;
    for(const material of [object.material].flat())materials.add(material);
    if(object.material!==glowMaterial)object.customDepthMaterial=depth;
  });
  const enabled={value:0},grid={value:new T.Vector2(cols,rows)};
  const worldToPlan={value:root.matrixWorld.clone().invert()};
  for(const material of materials){
    const previous=material.onBeforeCompile,program=material.customProgramCacheKey();
    const glow=material===glowMaterial;
    material.onBeforeCompile=function(shader,renderer){
      previous.call(this,shader,renderer);
      Object.assign(shader.uniforms,{houseSectionMask:{value:mask},houseSectionGrid:grid,houseSectionEnabled:enabled,houseWorldToPlan:worldToPlan});
      shader.vertexShader='uniform mat4 houseWorldToPlan; varying vec2 housePlanXZ;\n'+shader.vertexShader.replace('#include <project_vertex>',
        'housePlanXZ = (houseWorldToPlan * modelMatrix * vec4(transformed, 1.0)).xz;\n#include <project_vertex>');
      shader.fragmentShader='uniform sampler2D houseSectionMask; uniform vec2 houseSectionGrid; uniform float houseSectionEnabled; varying vec2 housePlanXZ;\n'+
        shader.fragmentShader.replace('#include <clipping_planes_fragment>',`
          #include <clipping_planes_fragment>
          ${glow?'float sectionGlow = 0.0;':''}
          if (${glow?'true':'houseSectionEnabled > 0.5'}) {
            vec2 section = clamp(floor(housePlanXZ / ${gridShape.metres.toFixed(1)}), vec2(0.0), houseSectionGrid - 1.0);
            vec2 state = texture2D(houseSectionMask, (section + 0.5) / houseSectionGrid).rg;
            if (state.r < 0.5) discard;
            ${glow?'sectionGlow = state.g;':''}
          }
        `);
      if(glow)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\n diffuseColor.a *= sectionGlow;');
    };
    material.customProgramCacheKey=()=>program+'|housing-section-mask:'+gridShape.metres+':'+glow;
    material.needsUpdate=true;
  }
  function update(sections){
    let changed=false,heatChanged=false,holes=0;
    for(const {index,present,glow} of sections){
      const pixel=index*stride,value=present?255:0;
      if(!present)holes++;
      if(pixels[pixel]!==value){
        pixels[pixel]=value;
        changed=true;
      }
      if(glowMaterial){
        const heat=Math.round(255*(glow??0));
        if(pixels[pixel+1]!==heat){
          pixels[pixel+1]=heat;
          heatChanged=true;
        }
      }
    }
    enabled.value=Number(holes>0);
    if(changed||heatChanged)mask.needsUpdate=true;
    return changed;
  }
  return {update,dispose(){depth.dispose();mask.dispose();}};
}
