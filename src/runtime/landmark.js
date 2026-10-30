import {createRuntime,THREE} from './index.js';
import {createExploration,inside} from './navigation.js';
import {createSectionStreamer,fetchJSON} from './sections.js';
import {loadCharacterKit} from '../reuse/characters.js';
import {CHARACTER_PROFILES} from '../content/characters.js';
import {createExteriorGhost} from './exterior-ghost.js';
import {ghostDescriptor,validateExteriorGhost} from './ghost-data.js';
const abortError=()=>new DOMException('Visit cancelled','AbortError');
export async function loadLandmark(placeId,{signal,loadJSON=fetchJSON}={}){
  if(!['new-york','administration','horticulture'].includes(placeId))throw Error('Unknown landmark');
  if(signal?.aborted)throw abortError();
  const url=new URL('../../assets/art/place-scenes/'+placeId+'/index.json',import.meta.url);
  const manifest=await loadJSON(url.href,signal);
  if(signal?.aborted)throw abortError();
  if(manifest.version!==1||manifest.diagnostic||manifest.placeId!==placeId||! /^[a-f0-9]{40}$/.test(manifest.sourceAccess?.commit||''))throw Error('Mismatched or unaccepted place section data');
  const navigation=await loadJSON(new URL(manifest.navigation,url).href,signal);
  if(signal?.aborted)throw abortError();
  if(navigation.version!==1||navigation.placeId!==placeId||!navigation.surfaces?.length||!navigation.occupiedLevels?.length)throw Error('Mismatched or incomplete place navigation data');
  let ghost=null;
  if(manifest.exteriorGhost){
    const descriptor=ghostDescriptor(manifest);
    ghost=await loadJSON(new URL(descriptor.url,url).href,signal);
    if(signal?.aborted)throw abortError();
    await validateExteriorGhost(manifest,ghost);
    if(signal?.aborted)throw abortError();
  }
  return {manifest,navigation,ghost,baseUrl:url.href};
}
function shapeMesh(T,surface,material,own=()=>{}){
  const root=new T.Group();
  for(const polygon of surface.polygons){
    const shape=new T.Shape(polygon.map(p=>new T.Vector2(p[0],-p[1])));
    for(const hole of surface.holes||[])if(inside({x:hole[0][0],y:hole[0][1]},polygon))shape.holes.push(new T.Path(hole.map(p=>new T.Vector2(p[0],-p[1]))));
    const geometry=new T.ShapeGeometry(shape);own(geometry);const mesh=new T.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.y=surface.height;root.add(mesh);
  }return root;
}
export async function createLandmarkScene({THREE:T,scene,renderer,signal,data,characterId='goat',onError=()=>{},bearLoader=loadCharacterKit,loadJSON=fetchJSON}){
  if(signal?.aborted)throw abortError();
  const root=new T.Group(),details=new T.Group(),plan=new T.Group(),terrain=new T.Group(),ownedGeometry=new Set(),ownedMaterials=new Set();
  root.name='Streamed '+data.manifest.placeId;root.add(details,terrain,plan);
  let kit,bear,closed=false,stream,ghost,planLevel=null,updates=0,lastPlayer=null,marker,planMaterial,releasedKit;
  const cleanupErrors=[],previousClipping=renderer.localClippingEnabled;
  const abort=()=>dispose();signal?.addEventListener('abort',abort,{once:true});
  function releaseKit(){if(kit&&kit!==releasedKit){releasedKit=kit;kit.dispose();}}
  function keep(branch){branch.traverse(node=>{if(node.geometry)ownedGeometry.add(node.geometry);if(node.material)ownedMaterials.add(node.material);});return branch;}
  function makePlan(level){
    for(const child of [...plan.children]){child.traverse(node=>{if(node.geometry){node.geometry.dispose();ownedGeometry.delete(node.geometry);}});plan.remove(child);}
    const surfaces=data.navigation.surfaces.filter(s=>!s.terrain&&!s.stairId&&s.level===level);
    for(const surface of surfaces)plan.add(keep(shapeMesh(T,{...surface,height:surface.height+.01},planMaterial,geometry=>ownedGeometry.add(geometry))));
    planLevel=level;
  }
  try{
    scene.add(root);
    const groundMaterial=new T.MeshStandardMaterial({color:0x878365,roughness:1,side:T.DoubleSide});ownedMaterials.add(groundMaterial);
    // Reuse the street's footprint cue; the model itself always keeps scale 1.
    const markerGeometry=new T.RingGeometry(.94,1,40);ownedGeometry.add(markerGeometry);markerGeometry.rotateX(-Math.PI/2);
    const markerMaterial=new T.MeshBasicMaterial({color:0xf0d28a,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide});ownedMaterials.add(markerMaterial);
    marker=new T.Mesh(markerGeometry,markerMaterial);marker.name='Player footprint';root.add(marker);
    for(const surface of data.navigation.surfaces.filter(s=>s.terrain))terrain.add(keep(shapeMesh(T,surface,groundMaterial,geometry=>ownedGeometry.add(geometry))));
    if(data.manifest.water){const w=data.manifest.water,geometry=new T.PlaneGeometry(w.width,w.depth);ownedGeometry.add(geometry);
      const material=new T.MeshStandardMaterial({color:0x49696a,roughness:.5,metalness:.15});ownedMaterials.add(material);
      const mesh=new T.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.set(w.x,w.height,w.y);terrain.add(mesh);}
    planMaterial=new T.MeshStandardMaterial({color:0xd8c7a3,roughness:1,side:T.DoubleSide});ownedMaterials.add(planMaterial);
    ghost=createExteriorGhost({THREE:T,root,data:data.ghost,renderer});
    stream=createSectionStreamer({THREE:T,root:details,manifest:data.manifest,baseUrl:data.baseUrl,signal,loadJSON,onError,presentation:ghost});
    stream.update(data.navigation.spawn);
    const loaded=await Promise.allSettled([bearLoader({characterId,unarmed:true,THREE:T,renderer,signal}).then(value=>{kit=value;if(closed){releaseKit();throw abortError();}return kit;}),stream.settled()]);
    if(loaded[0].status==='fulfilled')kit=loaded[0].value;
    if(closed||signal?.aborted){releaseKit();throw abortError();}
    const failed=loaded.find(result=>result.status==='rejected');if(failed)throw failed.reason;
    bear=kit.create();bear.setHeldVisible(false);root.add(bear.root);renderer.localClippingEnabled=true;plan.visible=false;
  }catch(error){dispose();throw error;}
  function update(snapshot,timing={}){
    if(closed)return;const player=snapshot.player,mode=timing.viewMode||'follow';
    ghost?.update(player,timing);stream.update(player,{viewMode:mode,interior:!!player.interior,portalStates:snapshot.navigation.portalStates});
    const nearbyReady=stream.isReadyAt(player);details.visible=mode==='follow'&&nearbyReady;plan.visible=mode==='overview'||!nearbyReady;
    const occupied=data.navigation.occupiedLevels.filter(level=>level*2.12<=player.elevation+.01).at(-1)??data.navigation.occupiedLevels[0];
    if(plan.visible&&planLevel!==occupied)makePlan(occupied);
    bear.update(player,snapshot.clocks.player,{paused:snapshot.paused});bear.setHeldVisible(false);bear.root.position.y=player.elevation;bear.root.updateMatrixWorld(true);updates++;lastPlayer={...player};
    const markerRadius=plan.visible?Math.max(player.radius,(timing.camera?timing.camera.top-timing.camera.bottom:Math.max(data.navigation.width,data.navigation.height))*6/Math.max(1,timing.viewport?.height||600)):player.radius;
    marker.position.set(player.x,player.elevation+.027,player.y);marker.scale.set(markerRadius,1,markerRadius);
  }
  function dispose(){
    if(closed)return;closed=true;const clean=operation=>{try{operation();}catch(error){cleanupErrors.push(error.message);}};
    clean(()=>signal?.removeEventListener('abort',abort));clean(()=>stream?.dispose());clean(()=>ghost?.dispose());clean(releaseKit);
    for(const geometry of ownedGeometry)clean(()=>geometry.dispose());for(const material of ownedMaterials)clean(()=>material.dispose());ownedGeometry.clear();ownedMaterials.clear();
    clean(()=>{renderer.localClippingEnabled=previousClipping;});clean(()=>root.removeFromParent());clean(()=>root.clear());
  }
  return {update,dispose,isReadyAt:stream.isReadyAt,settled:stream.settled,streamingMetrics:stream.metrics,
    diagnostics:()=>({disposed:closed,updates,lastPlayer,streaming:stream.metrics(),exteriorGhost:ghost?.diagnostics(),characterId,character:bear?.diagnostics(),cleanupErrors:[...cleanupErrors],representation:plan.visible?'native-footprint overview plan':'nearby source geometry sections with sparse exterior ghost'})};
}
export async function createLandmarkRuntime({place,characterId='goat',root,uiRoot,mountUI,signal,onExitToMenu,onError,...options}){
  const data=await loadLandmark(place.id,{signal});if(signal?.aborted)throw abortError();let art;
  const simulation=createExploration({definition:{...data.navigation,body:CHARACTER_PROFILES[characterId],characterId},config:options.config,isSectionReady:point=>!!art?.isReadyAt(point),streamMetrics:()=>art?.streamingMetrics()||{}});
  return createRuntime({root,uiRoot,mountUI,simulation,characterId,signal,onError,...options,
    uiOptions:{mode:'explore',placeTitle:place.title,onExitToMenu},
    createArtScene:async args=>(art=await createLandmarkScene({...args,data,onError}))});
}
