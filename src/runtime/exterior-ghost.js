import {WallXray} from '../../vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/dist/tactics/wall-xray.js';
export const GHOST_OPACITY=.14;
const SURFACES=new Set(['structural-wall','perimeter-closure','floor','portal-frame','door-leaf','door-extension','door-hardware','window-glass','custom-dome-shell','dome-glass','lantern-glass','cupola-roof','roof-glass']);
export function createExteriorGhost({THREE:T,root,data,renderer}){
  if(!data)return null;
  const halo=new WallXray();let geometry,material,wire;
  try{
  geometry=new T.InstancedBufferGeometry();material=halo.wireMaterial.clone();
  const prefixes=data.groups.filter(g=>g.kind==='native-wall-run').map(g=>g.id+'/');
  material.uniforms=halo.uniforms;
  material.fragmentShader=material.fragmentShader.replace('if(!xrayActive||xraySelectedLevel>wireLevel)discard;','')
    .replace('float reveal=1.-xraySurfaceOpacity();','float reveal=xrayActive?xraySurfaceOpacity():1.;')
    .replace('.34*reveal',GHOST_OPACITY+'*reveal');
  geometry.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));
  geometry.setAttribute('wallMatrix',new T.InstancedBufferAttribute(new Float32Array(new T.Matrix4().elements),16));
  geometry.setAttribute('wallColor',new T.InstancedBufferAttribute(new Float32Array([.76,.67,.49]),3));
  geometry.setAttribute('wallLevel',new T.InstancedBufferAttribute(new Float32Array([0]),1));geometry.instanceCount=1;geometry.computeBoundingSphere();
  wire=new T.LineSegments(geometry,material);wire.name='Sparse original exterior ghost';wire.raycast=()=>{};wire.userData.noShadow=true;wire.renderOrder=1;wire.visible=false;root.add(wire);
  let closed=false,centre=null;const worldRadius=2.5;
  function releaseMaterial(source){const variants=halo.materials.get(source);if(!variants)return;for(const value of variants.values())value.dispose();halo.materials.delete(source);}
  function surface(part){return SURFACES.has(part.role)||part.id.startsWith('roof/')||/roof|cornice/.test(part.id)||prefixes.some(prefix=>part.id.startsWith(prefix));}
  function decorate(source){
    if(closed)throw new DOMException('Exterior ghost disposed','AbortError');
    const result=halo.material(source),compile=result.onBeforeCompile,key=result.customProgramCacheKey();
    if(result.userData.exteriorHalo)return result;result.userData.exteriorHalo=true;
    // Material.copy clones clipping planes; these variants must follow the
    // streamer's live cutaway plane and the original physical-UV shader hook.
    result.clippingPlanes=source.clippingPlanes;
    result.onBeforeCompile=(shader,host)=>{
      compile.call(result,shader,host);
      shader.vertexShader='varying float ghostWorldY;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 ghostVertex=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          ghostVertex=instanceMatrix*ghostVertex;
        #endif
        ghostWorldY=(modelMatrix*ghostVertex).y;`);
      shader.fragmentShader='varying float ghostWorldY;\n'+shader.fragmentShader.replace('xraySelectedLevel<=xrayThroughLevel','ghostWorldY>xraySelectedLevel+.03');
    };
    result.customProgramCacheKey=()=>key+'-tinderbox-native-height-v1';return result;
  }
  function update(player,{camera,viewport,viewMode='follow'}={}){
    if(closed)return;wire.visible=viewMode==='follow';centre=null;
    const width=viewport?.width,height=viewport?.height;
    if(!camera||!player||![width,height,player.x,player.y,player.elevation,player.height].every(Number.isFinite)||width<=0||height<=0||viewMode!=='follow'){
      halo.setPointer(null,null);halo.update(1,1,1);return;
    }
    const point=new T.Vector3(player.x,player.elevation+player.height*.55,player.y).project(camera),span=camera.top-camera.bottom;
    if(![point.x,point.y,point.z,span].every(Number.isFinite)||span<=0||Math.abs(point.z)>1){halo.setPointer(null,null);halo.update(width,height,1);return;}
    centre={x:(point.x+1)*width/2,y:(1-point.y)*height/2};halo.setPointer(centre.x,centre.y);
    // Retain AFT's five-native-tile diameter and 2/3 feather. Its base zoom is
    // 28*sqrt(2) CSS pixels per tile; Tinderbox supplies its actual camera scale.
    halo.update(width,height,(height/span)/(28*Math.sqrt(2)),renderer.getPixelRatio?.()||1,player.elevation);
  }
  function diagnostics(){return{disposed:closed,visible:wire.visible,segments:data.segments,positionBytes:data.positions.length*4,lineDraws:wire.visible?1:0,haloActive:halo.uniforms.xrayActive.value,centre:centre&&{...centre},radiusPixels:halo.uniforms.xrayRadius.value,outerRadiusPixels:halo.uniforms.xrayOuterRadius.value,worldRadius,materialVariants:[...halo.materials.values()].reduce((n,m)=>n+m.size,0)};}
  return {isHaloSurface:surface,material:decorate,releaseMaterial,update,diagnostics,
    dispose(){if(closed)return;closed=true;wire.removeFromParent();wire.visible=false;geometry.dispose();material.dispose();halo.dispose();}};
  }catch(error){wire?.removeFromParent();geometry?.dispose();material?.dispose();halo.dispose();throw error;}
}
