// Derived verbatim except the explicit changes below from closing thermal-art.js at
// a0eef339988c24ef5a688396f552b8661764f472 (itself the furnished-house renderer).
// Catalogue native source identity, actual per-source storey origin, and inverse-placement
// floor UV generation; physical patch grid remains data-driven shared world space.
// Thermal rules, effect envelope and legacy M22 files remain unchanged.
import {bounds,normal,triangleArea,polygonTriangles,clip,clipBox,nearestSurface,distanceToBounds,pointInTriangleXZ,unit,sub} from '../furnished-house/geometry.js';
import {createWallShroud} from '../furnished-house/shroud.js';
import {createDebrisView} from '../furnished-house/debris.js';
import {connectSurfaceSamples,surfaceSampleContextKey} from '../furnished-house/presentation.js';
import {normalizeArtEffects,hasBoundedHouseWind,validTriangles,validFootprint,houseEffectBounds,createCameraCuller} from '../furnished-house/visibility.js';
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0)),EPS=1e-6;
const KIND={floor:0,wall:1,attachment:1,fitting:4,'landing-fitting':0,roof:2,door:3,window:3,plinth:5};
export async function createCatalogueStructureArt(T,{renderer,data,placement}={}){
 if(!T?.DataTexture||data?.version!==1||!data.prefabId||!Array.isArray(data.levels)||!data.levels.length||data.levels.some(l=>!Number.isFinite(l.floorY))||!Array.isArray(data.sourceMeshes)||!Array.isArray(data.render?.geometry))throw Error('Expected shared Three and a registered native version-1 structure source');
 function gridPieces(poly,axes=[0,1,2]){
  let result=[poly];for(const axis of axes){const pitch=data.thermalCell[axis],origin=data.gridOrigin[axis],next=[];for(const p of result){const lo=Math.min(...p.map(v=>v[axis])),hi=Math.max(...p.map(v=>v[axis]));if(hi-lo<EPS){next.push(p);continue;}for(let j=Math.floor((lo-origin)/pitch+EPS);j<=Math.floor((hi-origin-EPS)/pitch);j++){let q=clip(p,v=>v[axis]-(origin+j*pitch));q=clip(q,v=>origin+(j+1)*pitch-v[axis]);if(q.length>=3)next.push(q);}}result=next;}return result;
 }
 const root=new T.Group();root.name='Authoritative Catalogue source / '+data.prefabId;
 const firstFloorY=Math.min(...data.levels.map(l=>l.floorY)),pitch=data.module[2];
 function sourcePoint(v){const x=v[0]-(placement?.translation[0]??0),z=v[2]-(placement?.translation[2]??0),q=placement?.quarterTurns??0;return q===1?[-z,v[1],x]:q===2?[-x,v[1],-z]:q===3?[z,v[1],-x]:[x,v[1],z];}
 const floorVertex=(v,n,edge=false)=>{const p=sourcePoint(v),uv=edge?[p[0]+p[2],p[1]]:[p[0],p[2]];return [...v,...n,...uv,...uv];};
 const geometries=new Set(),materials=new Set(),textures=new Set(),effects=[],batches=[],itemGroups=new Map(),doorGroups=new Map(),patches=[],bySource=new Map(),patchByRuntimeId=new Map(),itemStates=new Map(),partStates=new Map(),fallStates=new Map(),boundaryStates=new Map(),openingState=new Map(),mappedMeshes=new Map(),renderCoverage=new Map();
 const surfaces=new Map(data.surfaces.map(s=>[s.id,s])),sourceMeshes=new Map(data.sourceMeshes.map(s=>[s.id,s])),sourceGeometry=new Map(data.render.geometry.map(g=>[g.id,g])),partByMesh=new Map(data.furnitureParts.filter(p=>p.sourceMeshBinding).map(p=>[p.sourceMeshBinding,p])),openingByMesh=new Map(data.openings.flatMap(o=>o.sourceMeshBindings.map(id=>[id,o]))),openingByWall=new Map(data.openings.map(o=>[o.sourceWallBinding,o]));
 let debrisView=null,occluded=false,lastFadeMode=null;const fadeMaterials=new Map(),fadeShadows=new Map();
 let disposed=false,lastRevision=-1,lastTime=-Infinity,mode='exterior',selectedLevel=0,lastFrame=null,missingSamples=0,representedSamples=0,fireSamples=[],retiredPatches=0,charredIntactPatches=0,stateDirty=true,stateTextureInvalidations=0,doorPoseUpdates=0,resetCount=0,revisionCount=0,visibleSampleCount=0,missingSampleDetails=[];
 let effectSettings=normalizeArtEffects(),effectWork=emptyEffectWork(),lightingMode='local';
 function emptyEffectWork(){return {suppliedSources:0,activeSources:0,representedSources:0,preparedSources:0,disabledSources:0,viewCulledSources:0,cameraCulledSources:0,missingSources:0,inactiveSources:0,noCameraSources:0,uncertainCameraSources:0,flameSplats:0,smokeSplats:0,generatedFlameSplats:0,generatedSmokeSplats:0,activeLights:0,channels:Object.fromEntries(['flames','smoke','lighting'].map(k=>[k,{supplied:0,disabled:0,viewCulled:0,cameraCulled:0,prepared:0}])),work:{supportAnchorSources:0,supportAnchorComputations:0,flameEnvelopeSources:0,flameContextSources:0,flameCalls:0,smokeCalls:0,lightClusterCalls:0,buildingAggregateCalls:0,buildingAggregateSources:0}};}
 const viewMode={value:0},viewLevel={value:0},cutY={value:1.3},stateUniform={value:null},stateWidth={value:1},stateHeight={value:1},ownedItemRows=new Map(),ownedPartRows=new Map(),storeGlows=[];
 const ownG=g=>(geometries.add(g),g),ownM=m=>(materials.add(m),m);
 const centre=t=>[0,1,2].map(i=>t.reduce((n,p)=>n+p[i],0)/t.length);
 // Door knobs and trim share the recorded moving opening owner. Retain their
 // measured native depth rather than clipping them to the plain leaf thickness.
 const openingRenderPads=new Map();for(const opening of data.openings.filter(o=>o.kind==='door')){const surface=surfaces.get(opening.surfaceId);if(!surface)continue;const n=unit(surface.normal),anchor=surface.triangles[0][0],plane=n.reduce((sum,v,i)=>sum+v*anchor[i],0);let extent=0;for(const id of opening.sourceMeshBindings){const b=sourceMeshes.get(id)?.bounds;if(!b)continue;for(let c=0;c<8;c++){const point=[0,1,2].map(i=>c&(1<<i)?b.max[i]:b.min[i]);extent=Math.max(extent,Math.abs(n.reduce((sum,v,i)=>sum+v*point[i],0)-plane));}}openingRenderPads.set(opening.surfaceId,extent+1e-6);}
 function patch(spec){
  const clipBounds=bounds(spec.triangles.flat()),surfaceNormal=unit(spec.normal||normal(spec.triangles[0])),anchor=spec.triangles[0][0],plane=surfaceNormal.reduce((sum,v,i)=>sum+v*anchor[i],0);
  // Match each native point to the canonical midplane before partitioning. This
  // retains the full thickness of angled leaves without overlapping padded AABBs.
  const projected=spec.kind!=='attachment'&&!spec.renderNormal;
  const coordinate=(v,axis)=>projected?v[axis]-surfaceNormal[axis]*(surfaceNormal.reduce((sum,n,i)=>sum+n*v[i],0)-plane):v[axis];
  const metrics=[];for(let axis=0;axis<3;axis++){metrics.push(v=>coordinate(v,axis)-clipBounds.min[axis]);metrics.push(v=>clipBounds.max[axis]-coordinate(v,axis));}
  if(projected){const pad=Math.max(.12,(spec.thickness||0)/2+.012,openingRenderPads.get(spec.sourceSurfaceId)||0),depth=v=>surfaceNormal.reduce((sum,n,i)=>sum+n*v[i],0)-plane;const below=spec.kind==='floor'?Math.max(pad,(spec.thickness||0)+.012):pad;metrics.push(v=>pad-depth(v),v=>below+depth(v));}
  const p={...spec,clipBounds,renderMetrics:metrics,index:patches.length,centre:centre(spec.triangles.flat()),bounds:spec.bounds||bounds(spec.triangles.flat())};patches.push(p);
  if(!bySource.has(p.sourceSurfaceId))bySource.set(p.sourceSurfaceId,[]);bySource.get(p.sourceSurfaceId).push(p);return p;
 }
 // Subtract a claimed convex region as it is drawn. Coplanar boundary faces
 // belong to the first matching native patch, so shared grid planes draw once.
 function splitPlane(poly,metric){
  const inside=[],outside=[],values=poly.map(v=>{const d=metric(v);return Math.abs(d)<1e-6?0:d;});if(Math.min(...values)>=0)return {inside:poly,outside:[]};if(Math.max(...values)<=0)return {inside:[],outside:poly};
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],av=values[i],bv=values[(i+1)%poly.length];if(av>=0)inside.push(a);if(av<=0)outside.push(a);if(av*bv<0){const t=av/(av-bv),v=a.map((n,k)=>n+(b[k]-n)*t);inside.push(v);outside.push(v);}}
  return {inside,outside};
 }
 function partition(poly,metrics){
  let inside=poly;const outside=[];for(const metric of metrics){if(inside.length<3)break;const split=splitPlane(inside,metric);if(split.outside.length>=3)outside.push(split.outside);inside=split.inside;}return {inside,outside};
 }
 // Partition only within each actual physical surface. No column mask spans levels.
 for(const s of data.surfaces){
  const axis=s.normal.map(Math.abs).indexOf(Math.max(...s.normal.map(Math.abs))),axes=s.kind==='floor'?[0,2]:s.kind==='roof'||s.kind==='attachment'?[0,1,2]:[0,1,2].filter(i=>i!==axis),groups=new Map();
  for(const t of s.triangles)for(const poly of gridPieces(t,axes)){
   const tris=polygonTriangles(poly).filter(t=>triangleArea(t)>1e-9);if(!tris.length)continue;
   const p=centre(poly),key=axes.map(i=>Math.floor((p[i]-data.gridOrigin[i])/data.thermalCell[i]+EPS)).join(',');
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(...tris);
  }
  for(const [key,triangles]of groups){const b=bounds(triangles.flat());if(s.kind==='floor')b.min[1]-=s.thickness;else if(s.kind!=='attachment')for(let i=0;i<3;i++){b.min[i]-=Math.abs(s.normal[i])*(s.thickness/2+.012);b.max[i]+=Math.abs(s.normal[i])*(s.thickness/2+.012);}
   patch({id:s.id+'#'+key,sourceSurfaceId:s.id,kind:s.kind,level:s.level,material:s.material,presentationKind:s.presentationKind,normal:s.normal,thickness:s.thickness,renderAppearanceIds:s.renderAppearanceIds,renderNormal:s.renderNormal?unit(s.renderNormal):null,triangles,bounds:b});
  }
 }
 for(const item of data.items){const p=patch({id:item.id,sourceSurfaceId:item.id,kind:'item',level:item.level,material:'timber',triangles:[[item.bounds.min,[item.bounds.max[0],item.bounds.min[1],item.bounds.min[2]],item.bounds.max]],bounds:item.bounds});ownedItemRows.set(item.id,p);}
 for(const part of data.furnitureParts){const p=patch({id:part.id,sourceSurfaceId:part.id,kind:'item-part',level:part.level,material:part.material,triangles:[[part.bounds.min,[part.bounds.max[0],part.bounds.min[1],part.bounds.min[2]],part.bounds.max]],bounds:part.bounds});ownedPartRows.set(part.id,{row:p,definition:part});}
 const doorBoundaryValues=new Map(),doorSourceByBoundary=new Map(),dirtyDoors=new Set();
 const maxStateSide=renderer?.capabilities?.maxTextureSize??4096,width=Math.min(maxStateSide,2**Math.ceil(Math.log2(Math.sqrt(Math.max(1,patches.length))))),height=Math.max(1,Math.ceil(patches.length/width));if(height>maxStateSide)throw Error('Registered source exceeds its2D state texture capacity');
  const stateArray=new Float32Array(width*height*4),stateTexture=new T.DataTexture(stateArray,width,height,T.RGBAFormat,T.FloatType);
 stateTexture.minFilter=stateTexture.magFilter=T.NearestFilter;stateTexture.generateMipmaps=false;stateTexture.needsUpdate=true;textures.add(stateTexture);stateUniform.value=stateTexture;stateWidth.value=width;stateHeight.value=height;
 function writeState(index,values){const k=index*4,wasPresent=stateArray[k]>=.5,wasCharred=wasPresent&&stateArray[k+1]>.5;let changed=false;for(let i=0;i<4;i++){const value=Math.fround(values[i]);if(stateArray[k+i]!==value){stateArray[k+i]=value;changed=true;}}if(!changed)return;const present=stateArray[k]>=.5;retiredPatches+=Number(wasPresent)-Number(present);charredIntactPatches+=Number(present&&stateArray[k+1]>.5)-Number(wasCharred);stateDirty=true;}
 function trackDoor(record){const previous=doorSourceByBoundary.get(record.id),next=doorGroups.has(record.sourceSurfaceId)?record.sourceSurfaceId:null;if(previous&&previous!==next){doorBoundaryValues.get(previous)?.delete(record.id);dirtyDoors.add(previous);doorSourceByBoundary.delete(record.id);}if(!next)return;if(!doorBoundaryValues.has(next))doorBoundaryValues.set(next,new Map());const values=doorBoundaryValues.get(next),value=clamp(record.openFraction);if(values.get(record.id)!==value){values.set(record.id,value);dirtyDoors.add(next);}doorSourceByBoundary.set(record.id,next);}
 function resetState(){for(const p of patches){const o=openingState.get(p.sourceSurfaceId),s=surfaces.get(p.sourceSurfaceId);stateArray.set([1,0,o?.initialOpenFraction??s?.initialOpenFraction??0,0],p.index*4);}stateDirty=true;retiredPatches=charredIntactPatches=0;doorBoundaryValues.clear();doorSourceByBoundary.clear();dirtyDoors.clear();for(const id of doorGroups.keys())dirtyDoors.add(id);boundaryStates.clear();itemStates.clear();partStates.clear();fallStates.clear();patchByRuntimeId.clear();resetCount++;}

 for(const o of data.openings)openingState.set(o.surfaceId,o);resetState();
 function decorate(m,depth=false){
  const old=m.onBeforeCompile;m.onBeforeCompile=(shader,r)=>{
   old?.call(m,shader,r);Object.assign(shader.uniforms,{fhState:stateUniform,fhWidth:stateWidth,fhHeight:stateHeight,fhView:viewMode,fhLevel:viewLevel,fhCut:cutY});
   shader.vertexShader='attribute float fhPatch; attribute float fhKind; attribute float fhStorey; attribute float fhGlass; varying vec4 fhStatus; varying vec4 fhInfo; uniform sampler2D fhState; uniform float fhWidth; uniform float fhHeight;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfhStatus=texture2D(fhState,vec2((mod(fhPatch,fhWidth)+.5)/fhWidth,(floor(fhPatch/fhWidth)+.5)/fhHeight)); fhInfo=vec4(fhKind,(fhKind>3.5&&fhKind<4.5)?max(0.,floor((modelMatrix[3].y-FO_PLACEHOLDER+.08)/FP_PLACEHOLDER)):fhStorey,fhGlass,(modelMatrix*vec4(position,1.0)).y);');
   shader.vertexShader=shader.vertexShader.replace('FO_PLACEHOLDER',firstFloorY.toFixed(8)).replace('FP_PLACEHOLDER',pitch.toFixed(8));
   shader.fragmentShader='varying vec4 fhStatus; varying vec4 fhInfo; uniform float fhView; uniform float fhLevel; uniform float fhCut;\n'+shader.fragmentShader;
   const mask='if(fhStatus.r<.5)discard; if(fhInfo.z>.5&&fhStatus.b>.5)discard; if(fhView>.5&&fhView<1.5){if(fhInfo.x>1.5&&fhInfo.x<2.5)discard;if(abs(fhInfo.y-fhLevel)>.1&&fhInfo.x<4.5)discard;if((fhInfo.x>.5&&fhInfo.x<1.5||fhInfo.x>2.5&&fhInfo.x<3.5)&&fhInfo.w>fhCut)discard;}';
   shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() {\n'+mask);
   if(!depth)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.055,.044,.035),fhStatus.g*.88); if(fhView>1.5&&fhInfo.x>.5&&fhInfo.x<3.5)diffuseColor.a*=.20;');
  };m.customProgramCacheKey=()=>(depth?'catalogue-depth-mask-v2:':'catalogue-physical-mask-v2:')+firstFloorY+':'+pitch;return m;
 }
 const appearance=new Map(),loader=new T.TextureLoader();
 try{
  const textureCache=new Map();
  for(const a of data.render.materials){
   let map=null;if(a.texture&&renderer){if(!textureCache.has(a.texture)){const t=await loader.loadAsync(new URL(a.texture,placement?.sourceURL||new URL(placement?.source||'art.js',new URL('../../../workbenches/catalogue-modular/',import.meta.url))).href);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(a.repeat||1);textures.add(t);textureCache.set(a.texture,t);}map=textureCache.get(a.texture);}
   const m=decorate(ownM(new T.MeshStandardMaterial({name:a.name,color:a.color,map,roughness:a.roughness,metalness:a.metalness,side:T.DoubleSide,vertexColors:true,transparent:false})));
   // Original grossUV is captured as uv; metric scale and native window UVs survive.
   appearance.set(a.id,m);
  }
  const floorAppearance=[...appearance.values()].find(m=>m.name==='Oak boards');
  function append(bucket,triangles,patchIndex,kind,level,glass=0,inv=null){
   for(const t of triangles){if(triangleArea(t.map(v=>v.slice(0,3)))<1e-10)continue;for(const v of t){const p=inv?new T.Vector3(v[0],v[1],v[2]).applyMatrix4(inv):new T.Vector3(v[0],v[1],v[2]),n=new T.Vector3(v[3]??0,v[4]??1,v[5]??0);if(inv)n.transformDirection(inv);
    bucket.position.push(p.x,p.y,p.z);bucket.normal.push(n.x,n.y,n.z);bucket.color.push(v[10]??1,v[11]??1,v[12]??1);bucket.uv.push(v[8]??v[6]??v[0],v[9]??v[7]??v[2]);bucket.patch.push(patchIndex);bucket.kind.push(kind);bucket.level.push(level);bucket.glass.push(glass);
   }}
  }
  const pools=new Map();
  function bucket(parent,material,key=''){
   const id=parent.uuid+'/'+material.uuid+'/'+key;if(!pools.has(id))pools.set(id,{parent,material,position:[],normal:[],color:[],uv:[],patch:[],kind:[],level:[],glass:[]});return pools.get(id);
  }
  // Native furniture moves as complete authored items with separate physical parts.
  for(const item of data.items){
   const group=new T.Group();group.name=item.id;group.position.fromArray(item.position);group.quaternion.fromArray(item.quaternion||[0,0,0,1]);group.updateMatrixWorld(true);root.add(group);itemGroups.set(item.id,{group,definition:item,inverse:new T.Matrix4().copy(group.matrixWorld).invert()});
  }
  for(const o of data.openings.filter(o=>o.kind==='door')){
   const group=new T.Group();group.name=o.id;group.position.fromArray(o.pivot);root.add(group);doorGroups.set(o.id,{group,definition:o,inverse:new T.Matrix4().makeTranslation(-o.pivot[0],-o.pivot[1],-o.pivot[2])});dirtyDoors.add(o.id);
  }
  const staticRoot=new T.Group();staticRoot.name='Physical surfaces and local retirement';root.add(staticRoot);
  // Each real floor patch becomes one closed solid. Its top, underside and sides share one row.
  for(const s of data.surfaces.filter(s=>s.kind==='floor'&&!s.supportType))for(const p of bySource.get(s.id)){
   const edges=new Map();for(const t of p.triangles)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],key=[a.join(','),b.join(',')].sort().join('|');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
   const tris=p.triangles.map(t=>t.map(v=>floorVertex(v,[0,1,0])));
   for(const t of p.triangles)tris.push([...t].reverse().map(v=>floorVertex([v[0],v[1]-s.thickness,v[2]],[0,-1,0])));
   for(const [a,b]of edges.values()){const c=[b[0],b[1]-s.thickness,b[2]],d=[a[0],a[1]-s.thickness,a[2]],n=normal([a,b,c]);for(const t of [[a,b,c],[a,c,d]])tris.push(t.map(v=>floorVertex(v,n,true)));}
   append(bucket(staticRoot,floorAppearance),tris,p.index,0,s.level);
  }
  const meshArea=ts=>ts.reduce((sum,t)=>sum+triangleArea((t.vertices||t).map(v=>v.slice(0,3))),0);
  function recordCoverage(mesh,geo,area,mode){const original=meshArea(geo.triangles);renderCoverage.set(mesh.id,{id:mesh.id,name:mesh.name,mode,sourceArea:original,submittedArea:area,ratio:area===null?null:original?area/original:1});}
  const physicalByMesh=new Map();for(const s of data.surfaces)for(const id of s.sourceMeshBindings){if(!physicalByMesh.has(id))physicalByMesh.set(id,[]);physicalByMesh.get(id).push(...bySource.get(s.id));}
  for(const mesh of data.sourceMeshes){
   const geo=sourceGeometry.get(mesh.id);if(!geo)continue;const part=partByMesh.get(mesh.id),opening=openingByMesh.get(mesh.id);
   if(part){recordCoverage(mesh,geo,meshArea(geo.triangles),'item');const item=itemGroups.get(part.itemId),row=ownedPartRows.get(part.id).row;for(const t of geo.triangles)append(bucket(item.group,appearance.get(t.materialId)),[t.vertices],row.index,4,part.level,0,item.inverse);continue;}
   if(opening?.kind==='door'){const door=doorGroups.get(opening.id);let submitted=0;for(const t of geo.triangles){let remaining=[t.vertices];for(const p of bySource.get(opening.surfaceId)){const next=[];for(const poly of remaining){const {inside,outside}=partition(poly,p.renderMetrics),tris=polygonTriangles(inside);submitted+=meshArea(tris);append(bucket(door.group,appearance.get(t.materialId)),tris,p.index,3,opening.level,0,door.inverse);next.push(...outside);}remaining=next;}}recordCoverage(mesh,geo,submitted,'opening');continue;}
   let candidates=physicalByMesh.get(mesh.id);
   if(candidates?.length&&candidates.every(p=>p.kind==='floor'&&!surfaces.get(p.sourceSurfaceId)?.supportType)){
    // The canonical union is rebuilt ONCE above; several captured room meshes
    // may share it. Per-mesh area ratios are not meaningful for that union.
    recordCoverage(mesh,geo,null,'canonical-floor');mappedMeshes.set(mesh.id,true);continue;
   }
   let submitted=0;const glass=/glass/i.test(mesh.name);if(glass&&opening)candidates=bySource.get(opening.surfaceId);
   for(const t of geo.triangles){
    if(!candidates?.length)throw Error('No explicit physical source for '+mesh.id);
    const geometricNormal=normal(t.vertices.map(v=>v.slice(0,3)));
    let remaining=[t.vertices];for(const p of candidates){
     if(p.renderAppearanceIds&&!p.renderAppearanceIds.includes(t.materialId))continue;
     if(p.renderNormal&&p.renderNormal.reduce((sum,v,i)=>sum+v*geometricNormal[i],0)<1-1e-6)continue;
     const next=[];for(const poly of remaining){const {inside,outside}=partition(poly,p.renderMetrics),tris=polygonTriangles(inside);submitted+=meshArea(tris);
      append(bucket(staticRoot,appearance.get(t.materialId)),tris,p.index,KIND[p.presentationKind||p.kind]??1,p.level,glass?1:0);next.push(...outside);
     }remaining=next;

    }
   }
   recordCoverage(mesh,geo,submitted,'physical-clipping');mappedMeshes.set(mesh.id,true);
  }
  // Two recorded stores fill a documented source gap; their contents use one fuel identity each.
  const customAppearance=(name,color,roughness=.9,metalness=0)=>decorate(ownM(new T.MeshStandardMaterial({name,color,roughness,metalness,side:T.DoubleSide})));
  const tin=customAppearance('Period oil tin',0x786443,.72,.45),label=customAppearance('Oil-can painted band',0x8b4f36),binWood=customAppearance('Coal-bin timber',0x66513b),coal=customAppearance('Coal contents',0x25241f,.95);
  coal.emissive.setHex(0xa02705);coal.emissiveIntensity=0;
  function storePrimitive(store,g,material,position,quaternion=null){
   const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,ix=g.index?.array||Array.from({length:p.count},(_,i)=>i),matrix=new T.Matrix4().compose(new T.Vector3(...position),quaternion||new T.Quaternion(),new T.Vector3(1,1,1)),nm=new T.Matrix3().getNormalMatrix(matrix),tris=[];
   for(let i=0;i<ix.length;i+=3)tris.push([0,1,2].map(k=>{const j=ix[i+k],v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(matrix),nn=new T.Vector3().fromBufferAttribute(n,j).applyMatrix3(nm).normalize();return [...v.toArray(),...nn.toArray(),u?.getX(j)||0,u?.getY(j)||0];}));
   append(bucket(itemGroups.get(store.itemId).group,material),tris,ownedPartRows.get(store.kind==='coal'&&material===coal?store.fuelPartId:store.id+'/container').row.index,4,0);g.dispose();
  }
  for(const store of data.stores){
   if(store.kind==='oil'){
    storePrimitive(store,new T.BoxGeometry(.40,.43,.32),tin,[0,.235,0]);storePrimitive(store,new T.BoxGeometry(.40,.02,.32),tin,[0,.01,0]);storePrimitive(store,new T.CylinderGeometry(.055,.055,.06,12),tin,[.10,.48,0]);
    storePrimitive(store,new T.BoxGeometry(.24,.10,.006),label,[0,.25,-.163]);
    for(const x of [-.11,.11])storePrimitive(store,new T.BoxGeometry(.025,.09,.035),tin,[x,.49,0]);
    storePrimitive(store,new T.BoxGeometry(.245,.025,.035),tin,[0,.535,0]);
   }else{
    for(const x of [-.34,.34])storePrimitive(store,new T.BoxGeometry(.04,.50,.62),binWood,[x,.27,0]);
    for(const z of [-.29,.29])storePrimitive(store,new T.BoxGeometry(.64,.50,.04),binWood,[0,.27,z]);
    storePrimitive(store,new T.BoxGeometry(.70,.04,.60),binWood,[0,.02,0]);
    for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)storePrimitive(store,new T.IcosahedronGeometry(.083+(x+z+4)%3*.008,0),coal,[x*.11,.27+((x*z+5)%3)*.035,z*.15]);
    storeGlows.push({itemId:store.itemId,material:coal});
   }
  }
  for(const b of pools.values()){
   if(!b.position.length)continue;
   const g=ownG(new T.BufferGeometry());for(const [name,arr,size]of [['position',b.position,3],['normal',b.normal,3],['color',b.color,3],['uv',b.uv,2],['fhPatch',b.patch,1],['fhKind',b.kind,1],['fhStorey',b.level,1],['fhGlass',b.glass,1]])g.setAttribute(name,new T.Float32BufferAttribute(arr,size));
   g.computeBoundingBox();g.computeBoundingSphere();const mesh=new T.Mesh(g,b.material);mesh.name='Furnished native batch / '+b.material.name;mesh.castShadow=mesh.receiveShadow=true;
   const depth=decorate(ownM(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide})),true);mesh.customDepthMaterial=depth;b.parent.add(mesh);batches.push(mesh);
  }
  // Actual live occupancy uses one instanced debug draw, never an inferred fire state.
  const occGeometry=ownG(new T.BoxGeometry(1,1,1)),occMaterial=ownM(new T.MeshBasicMaterial({color:0x6fbaa8,wireframe:true,transparent:true,opacity:.40,depthWrite:false})),occupancy=new T.InstancedMesh(occGeometry,occMaterial,8192);
  occupancy.count=0;occupancy.frustumCulled=false;occupancy.name='Authoritative thermal occupancy';root.add(occupancy);
  const hasBuildingFloor=data.surfaces.some(s=>s.kind==='floor'),buildingGlow={update(){},diagnostics(){return {delegatedToHost:true,capacity:0,powerCap:0,lights:[]};}},firelight={root:new T.Group(),update(){},diagnostics(){return {delegatedToHost:true,capacity:0,powerCap:0,lights:[]};},dispose(){this.root.removeFromParent();this.root.clear();}};firelight.root.name='Host-owned firelight / no component pool';root.add(firelight.root);
  debrisView=createDebrisView(T,{surfaces,getBoundary:id=>boundaryStates.get(id)});root.add(debrisView.root);const effectMapping=new Map(),radiusCache=new Map();
  function inProjectedTriangle(point,t,axis){
   const axes=[0,1,2].filter(i=>i!==axis),p=[point[axes[0]],point[axes[1]]],q=t.map(v=>[v[axes[0]],0,v[axes[1]]]);return pointInTriangleXZ(p,q);
  }
  function matchPatches(record){
   if(patchByRuntimeId.has(record.id))return patchByRuntimeId.get(record.id);
   const sourceId=record.sourceSurfaceId||record.id,list=bySource.get(sourceId)||[],s=surfaces.get(sourceId);
   if(!record.triangles?.length||!s){patchByRuntimeId.set(record.id,list);return list;}
   const axis=s.normal.map(Math.abs).indexOf(Math.max(...s.normal.map(Math.abs))),bb=bounds(record.triangles.flat());
   if(s.kind==='attachment'){const matched=list.filter(p=>p.centre.every((v,i)=>v>=bb.min[i]-EPS&&v<=bb.max[i]+EPS));patchByRuntimeId.set(record.id,matched);return matched;}
   const axes=[0,1,2].filter(i=>i!==axis);
   const matched=list.filter(p=>axes.every(i=>Math.min(p.bounds.max[i],bb.max[i])-Math.max(p.bounds.min[i],bb.min[i])>EPS)&&p.triangles.some(t=>inProjectedTriangle(centre(t),record.triangles.find(q=>inProjectedTriangle(centre(t),q,axis))||record.triangles[0],axis)));
   patchByRuntimeId.set(record.id,matched);return matched;
  }
  function applyBoundary(record){
   const sourceId=record.sourceSurfaceId||record.id;trackDoor(record);boundaryStates.set(record.id,record);if(!bySource.has(sourceId))return;for(const p of matchPatches(record))writeState(p.index,[record.intact===false?0:1,clamp(record.charFraction),clamp(record.openFraction),clamp(record.heatFraction)]);

  }
  function applyItem(record){
   const id=record.itemId||record.id,entry=itemGroups.get(id),row=ownedItemRows.get(id);if(!entry||!row)return;itemStates.set(id,{...itemStates.get(id),...record});const value=itemStates.get(id),g=entry.group;
   if(value.matrix){g.matrix.fromArray(value.matrix);g.matrix.decompose(g.position,g.quaternion,g.scale);}else{if(value.position)g.position.fromArray(value.position);if(value.quaternion)g.quaternion.fromArray(value.quaternion);}
   if(g.scale.distanceTo(new T.Vector3(1,1,1))>1e-6)throw Error('Authoritative furniture pose must preserve source scale');
   writeState(row.index,[value.intact===false?0:1,clamp(value.charFraction),stateArray[row.index*4+2],clamp(value.heatFraction)]);
   for(const partId of entry.definition.partIds){const p=ownedPartRows.get(partId);if(!p)continue;writeState(p.row.index,[value.intact===false?0:1,clamp(value.charFraction),stateArray[p.row.index*4+2],clamp(value.heatFraction)]);}
   for(const partId of entry.definition.partIds)if(partStates.has(partId))writePart(partStates.get(partId));
   for(const part of record.parts||[])applyPart(part);
  }
  function applyPart(record){const id=record.partId||record.id;partStates.set(id,{...partStates.get(id),...record});writePart(partStates.get(id));}
  function writePart(record){
   const id=record.partId||record.id,entry=ownedPartRows.get(id);if(!entry)return;const k=entry.row.index*4,parent=itemStates.get(entry.definition.itemId);
   const consumed=entry.definition.fuelClass&&record.remainingFraction===0;
   writeState(entry.row.index,[record.intact===false||parent?.intact===false||consumed?0:1,clamp(record.charFraction??parent?.charFraction),stateArray[k+2],clamp(record.heatFraction??parent?.heatFraction)]);
  }
  const pointKey=p=>p.map(v=>Math.round(v*1e6)).join(',');
  function supportAnchor(sample,triangles){
   effectWork.work.supportAnchorSources++;
   if(!triangles?.length)return null;
   const key=sample.id+'/'+sample.x.toFixed(5)+'/'+sample.z.toFixed(5)+'/'+triangles.map(t=>t.map(pointKey).join(';')).join('|');
   if(radiusCache.has(key))return radiusCache.get(key);
   effectWork.work.supportAnchorComputations++;
   const edges=new Map(),seenTriangles=new Set();for(const t of triangles){const triangleKey=t.map(pointKey).sort().join('|');if(seenTriangles.has(triangleKey))continue;seenTriangles.add(triangleKey);for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],k=[pointKey(a),pointKey(b)].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);}}
   const candidates=[[sample.x,sample.z],...triangles.map(t=>[t.reduce((n,p)=>n+p[0],0)/3,t.reduce((n,p)=>n+p[2],0)/3])];
   let best=null;
   for(const p of candidates){if(!triangles.some(t=>pointInTriangleXZ(p,t)))continue;let radius=Infinity;
    for(const [a,b]of edges.values()){const dx=b[0]-a[0],dz=b[2]-a[2],den=dx*dx+dz*dz;if(den<1e-12)continue;const t=clamp(((p[0]-a[0])*dx+(p[1]-a[2])*dz)/den);radius=Math.min(radius,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[2]-t*dz));}
    if(radius>0&&(!best||radius>best.radius))best={x:p[0],z:p[1],radius:Math.max(.001,radius-.001)};
   }
   if(radiusCache.size>=8192)radiusCache.clear();radiusCache.set(key,best);return best;
  }
  // Resolve ownership and current elevation before any expensive support search.
  // The anchor search is shared by smoke/local light to preserve their exact positions.
  function classifySample(sample){
   if(typeof sample?.id!=='string'||![sample.x,sample.y,sample.z,sample.nx,sample.ny,sample.nz,sample.flame,sample.smoke,sample.ignitionTime,sample.area].every(Number.isFinite)||sample.area<=0||Math.hypot(sample.nx,sample.ny,sample.nz)<1e-6)return null;
   const q={...sample,authoritativeY:sample.y,flame:clamp(sample.flame),smoke:clamp(sample.smoke),preheat:sample.preheat===true||sample.flame===0,exposed:sample.exposed!==false};
   const item=itemGroups.get(sample.itemId),activeFall=(sample.fallId&&fallStates.get(sample.fallId))||[...fallStates.values()].find(f=>sample.itemId&&f.itemId===sample.itemId||f.fuelIds?.includes(sample.id));
   if(activeFall){q.part='ground';q.nx=0;q.ny=1;q.nz=0;q.baseRadius=.12;q.fallId=activeFall.id;q.supportOrigin='airborne';q.presentationLevel=Math.max(0,Math.floor((q.y-firstFloorY+.08)/pitch));return q;}
   const landed=debrisView.findFuel(sample.id,sample.rubbleId),landingFootprint=sample.floorFootprint||sample.footprint||landed?.floorFootprint||landed?.triangles;
   if(landed||sample.rubbleId||landingFootprint&&(sample.part==='contents'||sample.part==='rubble'||sample.supportBoundaryId)){
    if(!validFootprint(landingFootprint))return null;
    q.part='ground';q.nx=0;q.ny=1;q.nz=0;q.anchorFootprint=q.supportTriangles=landingFootprint;q.anchorBounds=q.supportBounds=bounds(landingFootprint.flat());q.presentationLevel=Math.max(0,Math.floor((q.y-firstFloorY+.08)/pitch));q.rubbleId=sample.rubbleId||landed?.id;q.supportSurfaceId=sample.supportBoundaryId||landed?.supportBoundaryId;q.originalSourceSurfaceId=sample.originalSourceSurfaceId||sample.sourceSurfaceId;q.sourceSurfaceId=undefined;q.supportOrigin='landed';return q;
   }
   let source=surfaces.get(sample.sourceSurfaceId);if(!source&&sample.sourceSurfaceId)source=boundaryStates.get(sample.sourceSurfaceId);
   if(!source&&!item){
    source=data.surfaces.filter(s=>s.kind==='floor'&&s.bounds.max[1]<=sample.y+.06&&s.bounds.max[1]>=sample.y-.12&&sample.x>=s.bounds.min[0]-EPS&&sample.x<=s.bounds.max[0]+EPS&&sample.z>=s.bounds.min[2]-EPS&&sample.z<=s.bounds.max[2]+EPS&&s.triangles.some(t=>pointInTriangleXZ([sample.x,sample.z],t))).sort((a,b)=>b.bounds.max[1]-a.bounds.max[1])[0];
    if(!source&&sample.floorFootprint)source={id:sample.sourceSurfaceId||'authoritative-loose-support',kind:'floor',level:Math.max(0,Math.floor((sample.y-firstFloorY+.08)/pitch)),triangles:sample.floorFootprint};
   }
   if(!source&&!item)return null;
   if(sample.openingId&&!data.openings.some(o=>o.id===sample.openingId))return null;
   const runtime=boundaryStates.get(sample.boundaryId||sample.id.replace(/^fuel:/,'')),triangles=runtime?.triangles||source?.triangles;
   if(triangles&&(!Array.isArray(triangles)||!triangles.every(t=>Array.isArray(t)&&t.length===3&&t.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))))return null;
   q.supportTriangles=sample.floorFootprint||sample.footprint||triangles;q.supportBounds=triangles?.length?bounds(triangles.flat()):null;
   if(q.supportTriangles!==undefined&&!validTriangles(q.supportTriangles))return null;
   q.presentationLevel=source?.level??item?.definition.level??0;q.wallTopY=data.levels.find(l=>l.index===q.presentationLevel)?.wallTop??q.supportBounds?.max[1];q.surfaceKind=source?.kind;
   if(sample.part==='contents'&&sample.id.endsWith(':embers')){q.part='ground';q.nx=0;q.ny=1;q.nz=0;q.baseRadius=.10;return q;}
   if(source){
    const rows=bySource.get(source.id)||[],live=!rows.length||rows.some(p=>stateArray[p.index*4]>.5);if(!live&&source.kind!=='window')return null;
    if(source.kind==='attachment'){q.part='ground';q.nx=0;q.ny=1;q.nz=0;const b=q.supportBounds;if(!b)return null;q.baseRadius=Math.max(.015,Math.min(.12,(b.max[0]-b.min[0])/2,(b.max[2]-b.min[2])/2));}
    else if(source.kind==='floor'||source.kind==='roof'){
     q.sourceSurfaceId=q.sourceSurfaceId||source.id;q.anchorFootprint=sample.floorFootprint||sample.footprint||source.triangles;if(!validFootprint(q.anchorFootprint))return null;
     q.anchorBounds=bounds(q.anchorFootprint.flat());q.part=source.kind==='floor'?(q.ny<-.5?'ceiling':'ground'):'roof';if(q.part==='ceiling')q.presentationLevel=Math.max(0,source.level-1);
    }else{
     if(!source.triangles?.length||!q.supportBounds)return null;q.part='walls';q.tangentTriangles=source.triangles;
    }
   }else{q.part='ground';const b=item.definition.bounds;q.baseRadius=Math.max(.025,Math.min(b.max[0]-b.min[0],b.max[2]-b.min[2])*.36);q.nx=0;q.ny=1;q.nz=0;}
   return q;
  }
  function resolveSample(q,flameEnvelope){
   if(q.anchorFootprint){
    const r=supportAnchor(q,q.anchorFootprint);if(!r)return null;
    const dx=r.x-q.x,dz=r.z-q.z;q.x=r.x;q.z=r.z;
    if(q.part==='roof'&&Math.abs(q.ny)>.05)q.y+=(-q.nx/q.ny)*dx+(-q.nz/q.ny)*dz;
    if(flameEnvelope){q.supportRadius=q.floorRadius=q.supportOrigin==='landed'?r.radius:Math.min(r.radius,Math.sqrt(Math.max(.001,q.area))*.5);}
   }else if(flameEnvelope&&q.baseRadius){q.supportRadius=q.floorRadius=q.baseRadius;}
   if(flameEnvelope&&q.tangentTriangles){
    const h=Math.hypot(q.nx,q.nz)||1,tx=q.nz/h,tz=-q.nx/h,coords=q.tangentTriangles.flat().map(p=>p[0]*tx+p[2]*tz),at=q.x*tx+q.z*tz;
    q.tangentRadius=Math.max(.01,Math.min(at-Math.min(...coords),Math.max(...coords)-at)-.002);
   }
   return q;
  }
  function flameInView(q){
   if(mode!=='cutaway')return true;
   if(q.surfaceKind==='roof')return false;
   if(q.part==='walls'){q.cutawayTopY=cutY.value;if(q.supportBounds?.min[1]>=cutY.value)return false;}
   const dynamic=q.part==='ground'&&(q.itemId||q.rubbleId||q.supportOrigin==='landed'||q.supportOrigin==='airborne'||q.id.endsWith(':embers'));
   return (dynamic?Math.max(0,Math.floor((q.y-firstFloorY+.08)/pitch)):q.presentationLevel)===selectedLevel;
  }
  function setView(view){
   let next=view.mode||'exterior',level=Number.isInteger(view.level)?view.level:0;
   if(next==='auto'){const o=view.observer;let inside=false;if(o){const l=data.levels.find(l=>o.y>=l.floorY-.25&&o.y<l.floorY+2);if(l&&l.floorTriangles.some(t=>pointInTriangleXZ([o.x,o.z],t))){inside=true;level=l.index;}}next=inside?'cutaway':'exterior';}
   if(!['exterior','cutaway','xray'].includes(next))throw Error('Unknown furnished-house view');
   const changed=mode!==next;mode=next;selectedLevel=level;viewMode.value=next==='cutaway'?1:next==='xray'?2:0;viewLevel.value=level;cutY.value=(data.levels.find(l=>l.index===level)?.floorY??0)+.82;
   if(changed)for(const m of appearance.values()){m.transparent=next==='xray';m.depthWrite=next!=='xray';m.needsUpdate=true;}
   occupancy.visible=next==='xray';
  }
  function update(frame,view={}){
   if(disposed)throw Error('Furnished-house art disposed');
   if(frame?.version!==1||!Number.isFinite(frame.worldTime)||!Number.isFinite(frame.revision))throw Error('Expected authoritative version-1 frame');
   const reset=frame.full&&frame!==lastFrame||frame.revision<lastRevision||frame.worldTime<lastTime;
   if(reset){
    resetState();debrisView.reset();
    for(const [id,entry]of itemGroups){entry.group.position.fromArray(entry.definition.position);entry.group.quaternion.fromArray(entry.definition.quaternion||[0,0,0,1]);entry.group.scale.set(1,1,1);}
   }
   const updatedBoundaryIds=new Set();for(const b of frame.boundaries||[]){applyBoundary(b);updatedBoundaryIds.add(b.id);}for(const b of frame.supports||[])if(!updatedBoundaryIds.has(b.id))applyBoundary(b);
   for(const i of frame.items||[])applyItem(i);for(const p of frame.furnitureParts||frame.parts||[])applyPart(p);
   if(frame.full||frame.completeCollections?.includes('falls')){const currentFalls=new Set((frame.falls||[]).map(f=>f.id));for(const id of fallStates.keys())if(!currentFalls.has(id))fallStates.delete(id);}
   for(const f of frame.falls||[]){
    fallStates.set(f.id,f);if(f.itemId)applyItem({...f,id:f.itemId,itemId:f.itemId,intact:true});
   }
   for(const t of frame.tombstones||[]){const id=typeof t==='string'?t:t.id;if(t.collection==='falls'||!t.collection&&fallStates.has(id)){fallStates.delete(id);}else if((!t.collection||t.collection==='items')&&itemGroups.has(id))applyItem({id,intact:false});else if((!t.collection||t.collection==='boundaries'||t.collection==='supports')&&boundaryStates.has(id))applyBoundary({...boundaryStates.get(id),intact:false,openFraction:1});}
   debrisView.update(frame);
   for(const id of dirtyDoors){const entry=doorGroups.get(id),values=doorBoundaryValues.get(id),fraction=values?.size?[...values.values()].reduce((n,value)=>n+value,0)/values.size:entry.definition.initialOpenFraction;entry.group.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),fraction*entry.definition.maxOpenAngle);doorPoseUpdates++;}dirtyDoors.clear();

   setView(view);debrisView.setView?.(mode,selectedLevel);root.updateMatrixWorld(true);
   missingSamples=0;representedSamples=0;missingSampleDetails=[];fireSamples=[];effectMapping.clear();
   effectSettings=normalizeArtEffects({...view.effects,lighting:false});effectWork=emptyEffectWork();lightingMode=hasBuildingFloor&&view.lightingMode==='building'?'building':'local';
   const camera=view.camera,boundedWind=hasBoundedHouseWind(view),cameraCull=createCameraCuller(T,camera),classified=[],groups=new Map();
   const missing=sample=>{missingSamples++;if(missingSampleDetails.length<24)missingSampleDetails.push({id:sample?.id,sourceSurfaceId:sample?.sourceSurfaceId,originalSourceSurfaceId:sample?.originalSourceSurfaceId,rubbleId:sample?.rubbleId,fallId:sample?.fallId,part:sample?.part,position:[sample?.x,sample?.y,sample?.z],hasFootprint:!!sample?.floorFootprint?.length,reason:'invalid-or-unmapped'});};
   for(const sample of frame.fireSamples||[]){
    effectWork.suppliedSources++;
    if(sample&&[sample.flame,sample.smoke].every(Number.isFinite)&&!(sample.flame>0||sample.smoke>0)){effectWork.inactiveSources++;continue;}
    effectWork.activeSources++;const q=classifySample(sample);if(!q){missing(sample);continue;}
    const active={flames:q.flame>0,smoke:q.smoke>0,lighting:q.flame>0&&q.exposed};
    let disabled=false,viewCulled=false,cameraCulled=false;
    for(const key of ['flames','smoke','lighting'])if(active[key]){effectWork.channels[key].supplied++;if(!effectSettings[key]){effectWork.channels[key].disabled++;disabled=true;}}
    if(disabled)effectWork.disabledSources++;
    q.renderFlames=false;q.renderSmoke=false;q.lightEligible=active.lighting&&effectSettings.lighting;
    if(!camera&&(active.flames&&effectSettings.flames||active.smoke&&effectSettings.smoke))effectWork.noCameraSources++;
    if(camera&&active.flames&&effectSettings.flames){
     if(!flameInView(q)){effectWork.channels.flames.viewCulled++;viewCulled=true;}
     else{q.flameBounds=boundedWind?houseEffectBounds(q,'flames'):null;if(cameraCull(q.flameBounds)){effectWork.channels.flames.cameraCulled++;cameraCulled=true;}else q.renderFlames=true;}
    }
    // A cut-away or off-screen base can have a visible plume. Retain that channel
    // unless its complete independent envelope is outside the camera.
    if(camera&&active.smoke&&effectSettings.smoke){
     q.smokeBounds=boundedWind?houseEffectBounds(q,'smoke'):null;if(cameraCull(q.smokeBounds)){effectWork.channels.smoke.cameraCulled++;cameraCulled=true;}else q.renderSmoke=true;
    }
    if(camera&&((q.renderFlames||q.renderSmoke)&&!cameraCull.known||q.flameBounds===null||q.smokeBounds===null))effectWork.uncertainCameraSources++;
    if(viewCulled)effectWork.viewCulledSources++;if(cameraCulled)effectWork.cameraCulledSources++;
    q.omissions={disabled,viewCulled,cameraCulled,noCamera:!camera};classified.push(q);
    if(effectSettings.flames){const key=surfaceSampleContextKey(q);if(key!==null){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q);}}
   }
   // Retain the complete connected group as preparation context if any member
   // can be seen. Off-screen context supplies the same union, without splats.
   for(const list of groups.values())if(list.some(q=>q.renderFlames))for(const q of list)q.flameContext=true;
   for(const q of classified){
    const envelope=q.renderFlames||q.flameContext,prepare=envelope||q.renderSmoke||q.lightEligible&&lightingMode==='local';
    if(prepare&&!resolveSample(q,envelope)){missing(q);continue;}
    if(prepare)effectWork.preparedSources++;
    if(envelope){effectWork.work.flameEnvelopeSources++;effectWork.channels.flames.prepared++;if(!q.renderFlames)effectWork.work.flameContextSources++;}
    if(q.renderSmoke)effectWork.channels.smoke.prepared++;if(q.lightEligible)effectWork.channels.lighting.prepared++;
    fireSamples.push(q);representedSamples++;
   }
   if(effectSettings.flames)connectSurfaceSamples(fireSamples.filter(q=>q.renderFlames||q.flameContext));
   for(const q of fireSamples)effectMapping.set(q.id,{sourceSurfaceId:q.sourceSurfaceId||null,itemId:q.itemId||null,anchor:[q.x,q.y,q.z],supportOrigin:q.supportOrigin,rubbleId:q.rubbleId,fallId:q.fallId,supportSurfaceId:q.supportSurfaceId,originalSourceSurfaceId:q.originalSourceSurfaceId,presentationLevel:q.presentationLevel,part:q.part,preheat:q.preheat,overlapGroup:q.overlapGroup,overlapSources:q.overlapSources,supportRadius:q.supportRadius||null,tangentRadius:q.tangentRadius||null,flames:q.renderFlames,smoke:q.renderSmoke,lighting:q.lightEligible,flameContext:q.flameContext===true,omissions:q.omissions,flameBounds:q.flameBounds,smokeBounds:q.smokeBounds});
   const visibleSamples=fireSamples.filter(q=>q.renderFlames||q.renderSmoke);
   visibleSampleCount=visibleSamples.length;const count=camera?Math.ceil(visibleSamples.length/80):0;
   while(effects.length<count){const fx=createWallShroud(T,{maxCells:80,profile:'house'});effects.push(fx);root.add(fx.root);}
   for(let i=0;i<effects.length;i++){const fx=effects[i];if(i<count){fx.root.visible=true;fx.update({time:frame.worldTime,cells:visibleSamples.slice(i*80,(i+1)*80),camera,sampleWind:view.sampleWind,effects:effectSettings});}else fx.clear();}
   const observer=view.observer||{x:4,y:0,z:10},lightSamples=effectSettings.lighting?fireSamples.filter(q=>q.lightEligible).map(q=>({...q,part:q.part==='ground'?'floor':q.part,exposed:q.exposed!==false})):[];
   if(effectSettings.lighting){
    if(lightingMode==='building'){
     effectWork.work.buildingAggregateCalls++;effectWork.work.buildingAggregateSources=lightSamples.length;
     buildingGlow.update(firelight.root.children,lightSamples,frame.worldTime);
    }else{
    effectWork.work.lightClusterCalls++;
    firelight.update({cells:[],world:{fireCellSize:.5},player:{x:observer.x,y:observer.z}},new Map([[data.buildingId,lightSamples]]),frame.worldTime,[]);
    // Keep the reference bounded pool inside its native vertical storey.
    for(const light of firelight.root.children)if(light.isPointLight&&light.intensity>0){let nearest=null,distance=Infinity;for(const q of lightSamples){const d=(q.x-light.position.x)**2+(q.z-light.position.z)**2;if(d<distance){distance=d;nearest=q;}}
     const source=nearest&&(surfaces.get(nearest.sourceSurfaceId)||itemGroups.get(nearest.itemId)?.definition),floorY=data.levels.find(l=>l.index===(nearest?.presentationLevel??source?.level))?.floorY;if(floorY!==undefined)light.position.y=Math.max(floorY+.25,Math.min(floorY+1.8,light.position.y));
    }
    }
   }else for(const light of firelight.root.children)if(light.isPointLight)light.intensity=0;
   for(const fx of effects){const stats=fx.stats();for(const key of ['flameSplats','smokeSplats','generatedFlameSplats','generatedSmokeSplats'])effectWork[key]+=stats[key];effectWork.work.flameCalls+=stats.flameCalls;effectWork.work.smokeCalls+=stats.smokeCalls;}
   firelight.root.visible=firelight.root.children.some(l=>l.isPointLight&&l.intensity>0);
   effectWork.activeLights=firelight.root.children.filter(l=>l.isPointLight&&l.intensity>0).length;effectWork.representedSources=representedSamples;effectWork.missingSources=missingSamples;
   for(const entry of storeGlows){const sample=fireSamples.filter(s=>s.itemId===entry.itemId).reduce((n,s)=>Math.max(n,s.glow||0,s.heatFraction||0,s.flame||0),0),state=itemStates.get(entry.itemId);entry.material.emissiveIntensity=Math.max(sample,clamp(state?.heatFraction))*1.75;}
   const occ=mode==='xray'?(frame.occupancy||[]):[],matrix=new T.Matrix4(),color=new T.Color();occupancy.count=Math.min(8192,occ.length);
   for(let i=0;i<occupancy.count;i++){const c=occ[i],b=c.bounds;if(!b)continue;const size=b.max.map((v,k)=>Math.max(.005,v-b.min[k]-.015)),pos=b.min.map((v,k)=>(v+b.max[k])/2);matrix.compose(new T.Vector3(...pos),new T.Quaternion(),new T.Vector3(...size));occupancy.setMatrixAt(i,matrix);color.setRGB(.12+.88*clamp(c.heatFraction),.28+.4*(1-clamp(c.heatFraction)),.22);occupancy.setColorAt(i,color);}
   occupancy.instanceMatrix.needsUpdate=true;if(occupancy.instanceColor)occupancy.instanceColor.needsUpdate=true;
   if(stateDirty){stateTexture.needsUpdate=true;stateTextureInvalidations++;stateDirty=false;}lastRevision=frame.revision;lastTime=frame.worldTime;lastFrame=frame;revisionCount++;
  }
  function diagnostics(){return {disposed,version:1,prefabId:data.prefabId,occluded,opacityScale:occluded?.18:1,worldTime:lastTime,revision:lastRevision,view:mode,level:selectedLevel,sourceSurfaces:data.surfaces.length,physicalPatches:patches.length,charredIntactPatches,stateTextureInvalidations,doorPoseUpdates,coverage:{meshes:renderCoverage.size,underCovered:[...renderCoverage.values()].filter(r=>r.ratio!==null&&r.ratio<.99).length,overCovered:[...renderCoverage.values()].filter(r=>r.ratio!==null&&r.ratio>1.01).length,underCoverageSamples:[...renderCoverage.values()].filter(r=>r.ratio!==null&&r.ratio<.99).slice(0,8),canonicalFloors:[...renderCoverage.values()].filter(r=>r.mode==='canonical-floor').length},stateTextureSize:[width,height],retiredPatches,sourceMeshes:data.sourceMeshes.length,batches:batches.length,items:itemGroups.size,falls:fallStates.size,fallVisuals:debrisView.diagnostics().flights,debris:debrisView.diagnostics(),occupancy:occupancy.count,fireSamples:fireSamples.length,representedSamples,missingSamples,missingSampleDetails,visibleSamples:visibleSampleCount,viewCulledSamples:effectWork.viewCulledSources,cameraCulledSamples:effectWork.cameraCulledSources,effects:{...effectSettings},lightingMode,effectWork:structuredClone(effectWork),emitterBatches:effects.length,fire:effects.map(f=>f.stats()),lightBudget:effectSettings.lighting?(lightingMode==='building'?buildingGlow.diagnostics():{...firelight.diagnostics(),mode:'local'}):{terrainSites:0,surfaceSites:0,candidates:0,capacity:0,powerCap:0,lights:[],disabled:true,delegatedToHost:true},actualLights:firelight.root.children.filter(l=>l.isPointLight&&l.intensity>0).map(l=>({position:l.position.toArray(),intensity:l.intensity,reach:l.distance})),resources:{geometries:geometries.size,materials:materials.size,textures:textures.size},resetCount,revisionCount,rootScale:root.scale.toArray(),stateBindings:bySource.size,dormantPoolHidden:!firelight.root.visible,sharedGridOrigin:[...data.gridOrigin],sharedThermalCell:[...data.thermalCell],firstFloorY,nativeFloorUV:true};}
  function dispose(){
   if(disposed)return;disposed=true;root.removeFromParent();for(const fx of effects)fx.dispose();firelight.dispose();occupancy.dispose();debrisView.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();geometries.clear();materials.clear();textures.clear();root.clear();itemGroups.clear();doorGroups.clear();bySource.clear();itemStates.clear();partStates.clear();ownedPartRows.clear();openingState.clear();mappedMeshes.clear();renderCoverage.clear();boundaryStates.clear();fallStates.clear();patchByRuntimeId.clear();effectMapping.clear();radiusCache.clear();fadeMaterials.clear();fadeShadows.clear();doorBoundaryValues.clear();doorSourceByBoundary.clear();dirtyDoors.clear();patches.length=0;retiredPatches=charredIntactPatches=0;
  }
  // Existing Catalogue presentation-only occlusion contract: source meshes
  // become 18% opaque with no depth writing or cast shadow. Effects/debris and
  // every physical record remain independent of this presentation state.
  function setOcclusion(faded){
   faded=Boolean(faded);if(faded===occluded&&lastFadeMode===mode)return false;for(const mesh of batches){if(!fadeShadows.has(mesh))fadeShadows.set(mesh,mesh.castShadow);for(const material of [mesh.material].flat())if(!fadeMaterials.has(material))fadeMaterials.set(material,{opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});}
   const changed=faded!==occluded||lastFadeMode!==mode;for(const [material,original]of fadeMaterials){material.opacity=original.opacity*(faded?.18:1);material.transparent=faded||mode==='xray'||original.transparent;material.depthWrite=faded||mode==='xray'?false:original.depthWrite;if(changed)material.needsUpdate=true;}
   for(const [mesh,cast]of fadeShadows)mesh.castShadow=!faded&&cast;occluded=faded;lastFadeMode=mode;if(changed&&renderer?.shadowMap)renderer.shadowMap.needsUpdate=true;return changed;
  }
  const picker=new T.Raycaster();
  function pickAimSurface(ray){
   if(disposed||occluded)return null;root.updateMatrixWorld(true);picker.ray.copy(ray);
   for(const hit of picker.intersectObject(root,true)){
    const o=hit.object,g=o.geometry;if(!hit.face||!g?.attributes.fhPatch)continue;
    let visible=true;for(let parent=o;parent;parent=parent.parent)if(!parent.visible)visible=false;if(!visible)continue;
    if(o.material?.visible===false||o.material?.opacity<=1e-6)continue;
    const at=hit.face.a,row=Math.round(g.attributes.fhPatch.getX(at)),p=patches[row];if(!p||stateArray[row*4]<.5)continue;
    if(g.attributes.fhGlass.getX(at)>.5&&stateArray[row*4+2]>.5)continue;
    const kind=g.attributes.fhKind.getX(at),level=kind>3.5&&kind<4.5?Math.max(0,Math.floor((o.matrixWorld.elements[13]-firstFloorY+.08)/pitch)):g.attributes.fhStorey.getX(at);
    if(mode==='cutaway'){
     if(kind>1.5&&kind<2.5)continue;if(Math.abs(level-selectedLevel)>.1&&kind<4.5)continue;
     if((kind>.5&&kind<1.5||kind>2.5&&kind<3.5)&&hit.point.y>cutY.value)continue;
    }
    return {x:hit.point.x,y:hit.point.z,h:hit.point.y,distance:hit.distance,sourceSurfaceId:p.sourceSurfaceId};
   }
   return null;
  }
  return {root,update,diagnostics,dispose,setOcclusion,pickAimSurface,inspect(){return {coverage:[...renderCoverage.values()],patches:patches.map(p=>({id:p.id,sourceSurfaceId:p.sourceSurfaceId,kind:p.kind,level:p.level,present:stateArray[p.index*4]>.5,char:stateArray[p.index*4+1],triangles:p.triangles})),emitters:[...effectMapping].map(([id,v])=>({id,...v})),splats:effects.flatMap(f=>f.inspect?.()||[]),debris:debrisView.inspect()};}};
 }catch(error){debrisView?.dispose();for(const fx of effects)fx.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.clear();throw error;}
}
