import {createCatalogueStructureArt} from '../../art/source/catalogue-modular/thermal-art.js';
import {catalogueFrameView} from '../../art/source/catalogue-modular/frame-view.js';
import {createCityPropLibrary,CITY_PAINT_URL} from '../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/three.js';
import {paintCityTrim,TRIM_WIDTH,TRIM_HEIGHT} from '../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/trim-paint.js';

export async function createCatalogueModuleArt(T,{renderer,data,instances,signal}={}){
 if(!(renderer instanceof T.WebGLRenderer)||!data||!instances?.length)throw Error('Prepared native Catalogue structures and one host renderer required');
 const root=new T.Group();root.name='Registered Catalogue structures';
 const fadeRay=new T.Raycaster(),fadePoint=new T.Vector3(),fadeHit=new T.Vector3(),fadeNdc=new T.Vector3();let occludingBuildingIds=[];
 const lightSources=new Set(),lightItems=new Set();
 const views=new Map(),lamps=[],ownedTextures=new Set(),finishedMaterials=new Set(),liveBoundaries=new Map(),liveItems=new Map();
 let disposed=false,lastTime=0,lastRevision=-1,lastGeneration=-1,portable,portableLight,library,lanternPhase='spent',lanternOwner=null;
 const nativeId=(id,instance)=>id?.startsWith(instance+'::')?id.slice(instance.length+2):id;
 function lamp(spec,shadow=false){const light=new T.PointLight(spec.color,spec.intensity,spec.reach,2);light.name=spec.id;light.position.fromArray(spec.position);light.castShadow=shadow;if(shadow){light.shadow.mapSize.set(512,512);light.shadow.bias=-.00012;light.shadow.normalBias=.018;light.shadow.camera.near=.05;light.shadow.camera.far=spec.reach;}root.add(light);return light;}
 function finish(art){art.root.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&!finishedMaterials.has(m)){
  finishedMaterials.add(m);if(m.name==='Nautilus city trim'){
   const painted=paintCityTrim(),pixels=new Uint8Array(painted.length),stride=TRIM_WIDTH*4;for(let y=0;y<TRIM_HEIGHT;y++)pixels.set(painted.subarray(y*stride,(y+1)*stride),(TRIM_HEIGHT-y-1)*stride);
   const map=new T.DataTexture(pixels,TRIM_WIDTH,TRIM_HEIGHT,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;ownedTextures.add(map);m.map=map;m.needsUpdate=true;
  }
  if(/Soda glass|Nautilus store glass/.test(m.name)){m.transparent=true;m.opacity=.23;m.depthWrite=false;m.roughness=.25;m.needsUpdate=true;}
  if(m.name==='Nautilus lamp flame'){m.emissive.setHex(0xffb956);m.emissiveIntensity=1.5;}
 }if(o.isMesh&&/Soda glass|Nautilus store glass|Nautilus lamp flame/.test(o.material?.name))o.castShadow=false;});}
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const {art}of views.values())art.dispose();for(const {light}of lamps){light.shadow?.dispose();light.dispose();}portableLight?.shadow?.dispose();portableLight?.dispose();portable?.dispose();library?.dispose();for(const t of ownedTextures)t.dispose();ownedTextures.clear();finishedMaterials.clear();liveBoundaries.clear();liveItems.clear();root.clear();}
 try{
  for(const instance of instances.filter(i=>i.kind!=='terrain'&&i.kind!=='props')){
   signal?.throwIfAborted();if(views.has(instance.id))throw Error('Duplicate registered structure '+instance.id);
   const art=await createCatalogueStructureArt(T,{renderer,data:instance.data,placement:instance});const bounds=new T.Box3();for(const mesh of instance.data.sourceMeshes)bounds.union(new T.Box3(new T.Vector3(...mesh.bounds.min),new T.Vector3(...mesh.bounds.max)));views.set(instance.id,{instance,art,bounds});root.add(art.root);finish(art);
   for(const spec of instance.data.closingTime?.lamps||[]){lamps.push({spec,light:lamp(spec,(spec.nativeId??nativeId(spec.id,instance.id))==='closing/front-pendant:light')});for(const id of spec.sourceSurfaceIds||[])lightSources.add(id);if(spec.itemId)lightItems.add(spec.itemId);}
  }
  const shop=instances.find(i=>i.id==='bell-and-alder');if(!shop?.data.closingTime?.lantern)throw Error('Registered original Bell lantern metadata required');
  const atlas=await new T.TextureLoader().loadAsync(CITY_PAINT_URL);ownedTextures.add(atlas);signal?.throwIfAborted();atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  library=createCityPropLibrary(T,atlas);portable=library.build(shop.data.closingTime.lantern.assetId);portable.root.name=shop.data.closingTime.lantern.id;root.add(portable.root);portable.root.visible=false;
  portableLight=lamp({id:portable.root.name+':light',position:[0,.138,0],color:0xffad69,intensity:4.8,reach:3.4},true);portable.root.add(portableLight);
  function update(frame,view={}){
   if(disposed)throw Error('Catalogue module art disposed');if(frame.catalogueModules?.version!==1)throw Error('Complete authoritative catalogueModules snapshot required');
   if(frame.full||frame.catalogueModules.generation!==lastGeneration||frame.worldTime<lastTime||frame.revision<lastRevision){liveBoundaries.clear();liveItems.clear();}
   for(const b of frame.boundaries||[])if(lightSources.has(b.sourceSurfaceId||b.id))liveBoundaries.set(b.id,{...liveBoundaries.get(b.id),...b});for(const i of frame.items||[])if(lightItems.has(i.id))liveItems.set(i.id,{...liveItems.get(i.id),...i});
   const occluding=new Set(),observer=view.observer;if(view.camera&&observer){view.camera.updateMatrixWorld();const samples=[.05,.85,observer.height??1.67].map(h=>[observer.x,observer.y+h,observer.z]);if(view.muzzle)samples.push([view.muzzle.x,view.muzzle.y,view.muzzle.z]);for(const point of (view.trail||[]).slice(0,20))samples.push([point.x,(point.h??0)+.04,point.z??point.y]);
    for(const sample of samples){fadePoint.fromArray(sample);fadeNdc.copy(fadePoint).project(view.camera);fadeRay.setFromCamera(fadeNdc,view.camera);const distance=fadePoint.clone().sub(fadeRay.ray.origin).dot(fadeRay.ray.direction);for(const [id,record]of views){if(view.mode==='cutaway'&&view.interiorInstanceId===id)continue;if(fadeRay.ray.intersectBox(record.bounds,fadeHit)&&fadeHit.clone().sub(fadeRay.ray.origin).dot(fadeRay.ray.direction)<distance-.05)occluding.add(id);}}
   }occludingBuildingIds=[...occluding];
   for(const [id,{art}]of views){const mode=view.mode==='cutaway'&&view.interiorInstanceId!==id?'exterior':view.mode;art.update(catalogueFrameView(frame,id),{...view,mode,effects:{...view.effects,lighting:false}});finish(art);art.setOcclusion(occluding.has(id));}

   for(const {spec,light}of lamps){const item=liveItems.get(spec.itemId),sources=spec.sourceSurfaceIds||[],rows=[...liveBoundaries.values()].filter(b=>sources.includes(b.sourceSurfaceId||b.id));light.intensity=item?.intact!==false&&(!rows.length||rows.some(b=>b.intact!==false))?spec.intensity:0;}
   const state=frame.catalogueModules.lantern;lanternPhase=state?.phase??state?.state??'spent';lanternOwner=state?.ownerId??null;portable.root.visible=false;
   if(lanternPhase==='placed'&&Array.isArray(state.position)){portable.root.position.fromArray(state.position);portable.root.rotation.set(0,0,0);portable.root.visible=true;}
   else if(lanternPhase==='carried'){
    const actor=(frame.catalogueModules.actors||[]).find(a=>a.id===lanternOwner);if(!actor)throw Error('Carried native lantern lacks its actual host owner pose');
    const a=actor.native??actor,position=actor.position??[a.x,a.elevation??0,a.y],heading=actor.heading??a.heading,radius=actor.radius??a.radius,height=actor.height??a.height;
    if(![...position,heading,radius,height].every(Number.isFinite))throw Error('Incomplete actual host lantern owner pose');
    const c=Math.cos(heading),s=Math.sin(heading),side=radius*.63,back=-.10;portable.root.position.set(position[0]+c*back-s*side,position[1]+height*.58-.50,position[2]+s*back+c*side);portable.root.rotation.set(0,-heading,0);portable.root.visible=true;
   }
   portableLight.intensity=portable.root.visible?4.8:0;lastTime=frame.worldTime;lastRevision=frame.revision;lastGeneration=frame.catalogueModules.generation;
  }
  function diagnostics(){
   const geometries=new Set(),materials=new Set(),textures=new Set(),lights=[];let meshes=0,sourceTriangles=0;
   root.traverse(o=>{if(o.isLight){let visible=true;for(let p=o;p;p=p.parent)if(!p.visible)visible=false;lights.push({name:o.name,type:o.type,intensity:o.intensity,reach:o.distance??null,visible,castShadow:o.castShadow});}if(o.isMesh){meshes++;geometries.add(o.geometry);sourceTriangles+=(o.geometry.index?.count??o.geometry.attributes.position?.count??0)/3*(o.isInstancedMesh?o.count:1);}for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const k of ['map','normalMap','roughnessMap','metalnessMap'])if(m[k])textures.add(m[k]);}});
   const rows=[...views.values()].map(({instance,art})=>({id:instance.id,kind:instance.kind,prefabId:instance.data.prefabId,walkingElevations:instance.data.levels.map(l=>l.floorY),...art.diagnostics()}));
   return {version:1,disposed,occludingBuildingIds:[...occludingBuildingIds],occlusionMethod:'Existing conservative native source bounds and 18% presentation-only fade; active interior retains its cutaway',worldTime:lastTime,revision:lastRevision,generation:lastGeneration,instances:rows,actorsCreated:0,terrainCreated:false,lantern:{id:portable?.root.name,models:disposed?0:1,phase:lanternPhase,ownerId:lanternOwner,position:portable?.root.position.toArray()},resources:{meshes,uniqueGeometries:geometries.size,materials:materials.size,textures:textures.size,sourceTriangles},lights,lightingPolicy:{componentFirePools:0,componentFireLights:0,hostFirePools:1,hostFireLightCapacity:6,hostPowerCap:215,installed:lamps.length,portable:1,note:'Host owns one shared six-light/power215 fire pool over all canonical samples. Component views allocate no fire point lights.'},missingSamples:rows.reduce((n,r)=>n+r.missingSamples,0),limits:['Inherited fixture support/light lifecycle and hip-loop lantern attachment limits remain; no standalone control corrected.','Full-map performance and native posed/equipment acceptance are separate.']};
  }
  return {root,update,diagnostics,dispose,pickAimSurface(ray){let nearest=null;for(const {art}of views.values()){const hit=art.pickAimSurface(ray);if(hit&&(!nearest||hit.distance<nearest.distance))nearest=hit;}return nearest;},inspect(){return Object.fromEntries([...views].map(([id,{art}])=>[id,art.inspect()]));}};
 }catch(error){dispose();throw error;}
}
