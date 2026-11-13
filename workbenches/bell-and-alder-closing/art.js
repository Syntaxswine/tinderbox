import {createClosingVentSmoke} from '../../art/source/bell-and-alder-closing/vent-smoke.js';
import {createClosingStructureArt} from '../../art/source/bell-and-alder-closing/thermal-art.js';
import {loadCharacterKit} from '../../src/reuse/characters.js';
import {loadCivilianKit} from '../../src/reuse/civilians.js';
import {createWitnessReaction} from '../../src/art/witness-reaction.js';
import {createCityPropLibrary,CITY_PAINT_URL} from '../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/three.js';
import {paintCityTrim,TRIM_WIDTH,TRIM_HEIGHT} from '../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/packages/city-props/trim-paint.js';

// State-driven art only. Physics, perception, sounds and the replay clock stay runtime-owned.
export async function createClosingTimeArt(T,{renderer,data,signal}={}){
 if(data?.prefabId!=='bell-and-alder-closing-v1'||!(renderer instanceof T.WebGLRenderer))throw Error('Closing art requires its measured version-1 data and the borrowed shared renderer');
 signal?.throwIfAborted();
 const root=new T.Group();root.name='Bell and Alder / closing time';
 const kits=new Map(),actors=new Map(),ownedTextures=new Set(),lamps=[],liveBoundaries=new Map(),liveItems=new Map();
 let structure,civilians,library,portable,portableLight,reaction,ventSmoke,disposed=false,lastTime=0,lastRevision=-1,lanternPhase='spent',lanternOwner=null,latestActors=[];
 const matSet=new Set();
 function finishMaterials(){
  structure.root.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&!matSet.has(m)){
   matSet.add(m);
   if(m.name==='Nautilus city trim'){
    const painted=paintCityTrim(),pixels=new Uint8Array(painted.length),stride=TRIM_WIDTH*4;
    for(let y=0;y<TRIM_HEIGHT;y++)pixels.set(painted.subarray(y*stride,(y+1)*stride),(TRIM_HEIGHT-y-1)*stride);
    const map=new T.DataTexture(pixels,TRIM_WIDTH,TRIM_HEIGHT,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;ownedTextures.add(map);m.map=map;m.needsUpdate=true;
   }
   if(/Soda glass|Nautilus store glass/.test(m.name)){m.transparent=true;m.opacity=.23;m.depthWrite=false;m.roughness=.25;m.needsUpdate=true;}
   if(m.name==='Nautilus lamp flame'){m.emissive.setHex(0xffb956);m.emissiveIntensity=1.5;}
  }if(o.isMesh&&/Soda glass|Nautilus store glass|Nautilus lamp flame/.test(o.material?.name))o.castShadow=false;});
 }
 function makeLamp(spec,shadow=false){const light=new T.PointLight(spec.color,spec.intensity,spec.reach,2);light.name=spec.id;light.position.fromArray(spec.position);light.castShadow=shadow;if(shadow){light.shadow.mapSize.set(512,512);light.shadow.bias=-.00012;light.shadow.normalBias=.018;light.shadow.camera.near=.05;light.shadow.camera.far=spec.reach;}root.add(light);return light;}
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const a of actors.values())a.model.dispose();actors.clear();for(const k of kits.values())k.dispose();kits.clear();civilians?.dispose();portable?.dispose();library?.dispose();reaction?.dispose();ventSmoke?.dispose();for(const t of ownedTextures)t.dispose();ownedTextures.clear();for(const l of lamps){l.light.shadow?.dispose();l.light.dispose();}portableLight?.shadow?.dispose();portableLight?.dispose();structure?.dispose();root.clear();liveBoundaries.clear();liveItems.clear();matSet.clear();}
 try{
  const loads=await Promise.allSettled([createClosingStructureArt(T,{renderer,data}),loadCivilianKit({THREE:T,renderer}),...['goat','horse','bear'].map(characterId=>loadCharacterKit({characterId,THREE:T,renderer,signal,unarmed:true})),new T.TextureLoader().loadAsync(CITY_PAINT_URL)]);
  if(loads[0].status==='fulfilled'){structure=loads[0].value;root.add(structure.root);}
  if(loads[1].status==='fulfilled')civilians=loads[1].value;
  for(const [i,id]of ['goat','horse','bear'].entries())if(loads[i+2].status==='fulfilled')kits.set(id,loads[i+2].value);
  if(loads[5].status==='fulfilled')ownedTextures.add(loads[5].value);
  const failed=loads.find(r=>r.status==='rejected');if(failed)throw failed.reason;signal?.throwIfAborted();
  finishMaterials();const atlas=loads[5].value;atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  library=createCityPropLibrary(T,atlas);portable=library.build(data.closingTime.lantern.assetId);portable.root.name=data.closingTime.lantern.id;root.add(portable.root);
  portableLight=makeLamp({id:data.closingTime.lantern.id+':light',position:[0,.138,0],color:0xffad69,intensity:4.8,reach:3.4},true);portable.root.add(portableLight);
  for(const spec of data.closingTime.lamps||[])lamps.push({spec,light:makeLamp(spec,spec.id==='closing/front-pendant:light')});
  reaction=createWitnessReaction(T);root.add(reaction.root);ventSmoke=createClosingVentSmoke(T,{data});root.add(ventSmoke.root);
  function update(frame,view={}){
   if(disposed)throw Error('Closing art disposed');if(frame.closingTime?.version!==1)throw Error('Complete closingTime v1 snapshot required on every frame');
   if(frame.full||frame.worldTime<lastTime||frame.revision<lastRevision){liveBoundaries.clear();liveItems.clear();}
   for(const b of frame.boundaries||[])liveBoundaries.set(b.id,{...liveBoundaries.get(b.id),...b});for(const i of frame.items||[])liveItems.set(i.id,{...liveItems.get(i.id),...i});
   structure.update(frame,view);finishMaterials();
   const active=new Set();latestActors=[];
   for(const a of frame.closingTime.actors){
    if(!a.native)throw Error('Missing complete allowlisted native pose for '+a.id);active.add(a.id);
    const key=a.role==='player'?'player:'+a.characterId:a.role==='officer'?'officer':'resident:'+a.characterId;
    let entry=actors.get(a.id);if(entry&&entry.key!==key){entry.model.dispose();actors.delete(a.id);entry=null;}
    if(!entry){const model=a.role==='player'?kits.get(a.characterId)?.create():a.role==='officer'?civilians.createPatrol(a.native):civilians.create(a.native);if(!model)throw Error('Unsupported native character '+a.characterId);entry={model,key};actors.set(a.id,entry);root.add(model.root);}
    entry.model.update(a.native,frame.worldTime,a.witness?.aim);entry.model.root.position.y=a.position[1];entry.model.root.updateMatrixWorld(true);
    if(a.role==='player')entry.model.setHeldVisible(!!a.native.usingTool||a.native.tool==='torch'&&a.native.torch?.lit);
    if(a.role==='officer')reaction.update(a.native,a.witness?.reaction,a.witness?.shot,frame.worldTime);
    // Exterior roof/walls naturally occlude the resident; cutaway only changes presentation.
    latestActors.push({id:a.id,role:a.role,position:a.position,characterId:a.characterId,nativeScale:entry.model.root.scale.toArray(),visible:entry.model.root.visible,...entry.model.diagnostics()});
   }
   for(const [id,a]of actors)if(!active.has(id)){a.model.dispose();actors.delete(id);}
   const state=frame.closingTime.lantern;lanternPhase=state.phase;lanternOwner=state.ownerId;portable.root.visible=state.phase!=='spent';
   if(state.phase==='placed'){portable.root.position.fromArray(state.position);portable.root.rotation.set(0,0,0);}
   else if(state.phase==='carried'){
    const a=frame.closingTime.actors.find(a=>a.id===state.ownerId);if(!a)throw Error('Carried lantern has no actual owner');
    // Same accepted hip/loop attachment as the published shop adapter. Native size is unchanged.
    const c=Math.cos(a.heading),s=Math.sin(a.heading),side=a.radius*.63,back=-.10;
    portable.root.position.set(a.position[0]+c*back-s*side,a.position[1]+a.height*.58-.50,a.position[2]+s*back+c*side);portable.root.rotation.set(0,-a.heading,0);
   }
   portableLight.intensity=state.phase==='spent'?0:4.8;
   for(const {spec,light}of lamps){const item=liveItems.get(spec.itemId),sources=spec.sourceSurfaceIds||[],rows=[...liveBoundaries.values()].filter(b=>sources.includes(b.sourceSurfaceId||b.id));const supported=item?.intact!==false&&(!rows.length||rows.some(b=>b.intact!==false));light.intensity=supported?spec.intensity:0;}
   ventSmoke.update(frame,view);lastRevision=frame.revision;lastTime=frame.worldTime;
  }
  function diagnostics(){
   const geometries=new Set(),materials=new Set(),textures=new Set(),lights=[];let meshes=0,sourceTriangles=0;
   root.traverse(o=>{if(o.isLight)lights.push({name:o.name,type:o.type,intensity:o.intensity,reach:o.distance||null,castShadow:o.castShadow});if(o.isMesh){meshes++;geometries.add(o.geometry);sourceTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])textures.add(m[key]);}});
   return {version:1,prefabId:data.prefabId,disposed,worldTime:lastTime,actors:latestActors,lantern:{id:data.closingTime.lantern.id,phase:lanternPhase,ownerId:lanternOwner,models:disposed?0:1,position:portable?.root.position.toArray(),nativeScale:portable?.root.scale.toArray()},structure:structure.diagnostics(),witness:reaction.diagnostics(),ventSmoke:ventSmoke.diagnostics(),resources:{meshes,uniqueGeometries:geometries.size,materials:materials.size,textures:textures.size,sourceTriangles,characterKits:kits.size},lights,lightingPolicy:'Existing six-light/power215 fire pool plus four installed lamps and one portable lantern; only front pendant and portable point lights cast shadows',wind:'Declared 1.5m/s east ambient; no shop obstacle bake'};
  }
  return {root,update,diagnostics,dispose,inspect:()=>structure.inspect()};
 }catch(error){dispose();throw error;}
}
