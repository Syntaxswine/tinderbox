
import {Resources,removeTree} from './resources.js';
import {createMaterials} from './materials.js';
import {BEAR_SPEC} from '../reuse/bear.js';
import {loadCharacterKit} from '../reuse/characters.js';
import {createWorld,createActor} from './world.js';
import {createExteriorKit} from './exterior-kit.js';
import {loadCivilianKit} from '../reuse/civilians.js';
import {createGroundField} from './ground-field.js';
import {createFire} from './fire.js';
import {createToolProps} from './tool-props.js';
import {loadNeighborhoodKit,createNeighborhood} from './neighborhood.js';
export const ART_ASSET_ROOT=new URL('../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/',import.meta.url).href;
export {BEAR_SPEC};
const medicineUrl=new URL('../../assets/art/medicine-pickups/index.js',import.meta.url);
export async function createArtScene({THREE:T,scene,renderer,assetBaseUrl=ART_ASSET_ROOT,bearAssetBaseUrl,characterId='bear',signal,world:initialWorld,pickups:initialPickups=[],medicineLoader=()=>import(medicineUrl.href),fireFactory=createFire}={}){
  if(!T?.TextureLoader||!scene?.add)throw new TypeError('createArtScene requires the shared THREE module and a scene.');
  const base=new URL(assetBaseUrl,import.meta.url);if(!base.pathname.endsWith('/'))base.pathname+='/';
  const selected={flame:'effects/painted-fire/flame-atlas-v1.png',smoke:'effects/painted-fire/smoke-atlas-v1.png',
    burst:'effects/painted-fire/tank-burst-atlas-v1.png',materials:'environment/painted-study/material-atlas-v2.png',cargo:'environment/painted-study/cargo-materials-v1.png',kitBrick:'environment/hybrid-surfaces/brick-factory-v1.png',
    kitWood:'environment/hybrid-surfaces/wood-factory-v2.png',kitPlaster:'environment/ground-concrete.png'};
  const pool=new Resources(),loader=new T.TextureLoader(),entries=Object.entries(selected);
  const loaded=await Promise.allSettled(entries.map(([,file])=>loader.loadAsync(new URL(file,base).href)));
  for(const result of loaded)if(result.status==='fulfilled')pool.texture(result.value);
  const failure=loaded.findIndex(result=>result.status==='rejected');
  if(failure!==-1){pool.dispose();throw new Error('Tinderbox art asset failed: '+entries[failure][1],{cause:loaded[failure].reason});}
  if(signal?.aborted){pool.dispose();throw new DOMException('Visit cancelled','AbortError');}
  const assets=Object.fromEntries(entries.map(([name],i)=>{const texture=loaded[i].value;texture.colorSpace=T.SRGBColorSpace;return [name,texture];}));
  let root,world,bear,bearKit,field,fire,toolProps,exterior,civilianKit,housing,housingKit,medicine,keyLight,disposed=false,updates=0,lastSnapshot,footprintRadius=.56;
  const actors=new Map(),muzzlePoint=new T.Vector3();
  try{
    if(renderer)civilianKit=await loadCivilianKit({THREE:T,renderer,assetBaseUrl:base.href});
    if(initialWorld?.buildings?.length)housingKit=await loadNeighborhoodKit(T,{renderer});
    if(signal?.aborted)throw new DOMException('Visit cancelled','AbortError');
    root=new T.Group();root.name='Tinderbox art module';
    const materials=createMaterials(T,pool,assets);
    bearKit=await loadCharacterKit({characterId,THREE:T,renderer,assetBaseUrl:bearAssetBaseUrl,materials,signal});
    if(signal?.aborted)throw new DOMException('Visit cancelled','AbortError');
    world=createWorld(T,materials);bear=bearKit.create();field=createGroundField(T);fire=fireFactory(T,assets,field.uniforms);
    exterior=createExteriorKit(T,materials,assets,renderer);
    toolProps=createToolProps(T,materials);root.add(world.root,field.root,fire.root,bear.root,toolProps.root,exterior.root);
    if(housingKit){housing=createNeighborhood(T,housingKit);root.add(housing.root);}
    if(initialPickups.length){const {createMedicinePickups}=await medicineLoader();if(signal?.aborted)throw new DOMException('Visit cancelled','AbortError');medicine=createMedicinePickups(T,{materials,textures:assets});root.add(medicine.root);}
    if(!scene.children.some(object=>object.isLight)){
    root.add(new T.HemisphereLight(0xe2e4c7,0x5c624d,2.0));
    keyLight=new T.DirectionalLight(0xffe6be,2.4);keyLight.position.set(-4,12,5);keyLight.target.position.set(10,0,8);root.add(keyLight,keyLight.target);
    keyLight.castShadow=true;keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.left=-16;keyLight.shadow.camera.right=16;keyLight.shadow.camera.top=16;keyLight.shadow.camera.bottom=-16;keyLight.shadow.bias=-.00025;keyLight.shadow.normalBias=.025;
    }
    const ringGeo=pool.geometry(new T.RingGeometry(.96,1,40));ringGeo.rotateX(-Math.PI/2);
    const ringMat=pool.material(new T.MeshBasicMaterial({color:0xf0d28a,transparent:true,opacity:.60,depthWrite:false}));
    const ring=new T.Mesh(ringGeo,ringMat);ring.name='Player footprint';ring.position.y=.026;root.add(ring);
    const arrowGeo=pool.geometry(new T.BufferGeometry());arrowGeo.setAttribute('position',new T.Float32BufferAttribute([1.6,.027,0,1.23,.027,-.16,1.23,.027,.16],3));arrowGeo.computeVertexNormals();
    const arrow=new T.Mesh(arrowGeo,pool.material(new T.MeshBasicMaterial({color:0xf0d28a,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false})));root.add(arrow);
    scene.add(root);
    function update(snapshot,timing={}){
      if(disposed)return;
      if(snapshot?.version!==1||!snapshot.player||!snapshot.world)throw new TypeError('Art requires a v1 authoritative snapshot.');
      const {world:map,player}=snapshot;
      if(![player.x,player.y,map.width,map.height,map.fireCellSize].every(Number.isFinite)||map.fireCellSize<=0||map.width<=0||map.height<=0||Math.ceil(map.width/map.fireCellSize)*Math.ceil(map.height/map.fireCellSize)>65536)throw new RangeError('Art grid must be finite, positive, and at most 65536 cells.');
      const playerTime=Number.isFinite(timing.playerTime)?timing.playerTime:snapshot.clocks?.player||0;
      const worldTime=Number.isFinite(timing.worldTime)?timing.worldTime:snapshot.clocks?.world||0;
      medicine?.update(snapshot.pickups||[],{worldTime,paused:snapshot.paused});
      if(map.buildings?.length&&!housing)throw new Error('Catalogue housing was not loaded for this scene');
      world.update({...map,obstacles:(map.obstacles||[]).filter(o=>!o.moduleId&&!o.buildingId)});exterior.update(map);field.update(snapshot);bear.update(player,playerTime,{paused:snapshot.paused});bear.anchors.muzzle.getWorldPosition(muzzlePoint);
      housing?.update(map,{camera:timing.camera,player,muzzle:muzzlePoint,viewport:timing.viewport,trail:snapshot.cells.filter(cell=>cell.depositedFuel>0&&Math.hypot(cell.x-player.x,cell.y-player.y)<2.5).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))});
      fire.update(snapshot,Number.isFinite(timing.fireWorldTime)?timing.fireWorldTime:worldTime,fireFactory===createFire?{muzzle:muzzlePoint,camera:timing.camera}:{muzzle:muzzlePoint,muzzleQuaternion:bear.anchors.muzzle.getWorldQuaternion(new T.Quaternion()),camera:timing.camera,viewport:timing.viewport,firePlayerTime:timing.firePlayerTime,housing:housing?.diagnostics()});const discharge=fire.diagnostics().discharge;bear.setHeldVisible(!discharge.active||discharge.muzzleInsideShape);toolProps.update(snapshot,playerTime,bear.anchors);
      footprintRadius=Number.isFinite(player.radius)&&player.radius>0?player.radius:.56;
      ring.position.set(player.x,.026,player.y);ring.scale.set(footprintRadius,1,footprintRadius);
      arrow.position.set(player.x,0,player.y);arrow.rotation.y=-(player.heading||0);arrow.scale.set(footprintRadius,1,footprintRadius);
      const active=new Set();
      for(const actor of snapshot.actors||[]){
        if(actor.id===player.id)continue;active.add(actor.id);
        const tagged=Object.prototype.hasOwnProperty.call(actor,'species'),key=tagged?'civilian:'+actor.species:'legacy-provisional';
        let record=actors.get(actor.id);
        if(record&&record.key!==key){record.model.dispose();actors.delete(actor.id);record=null;}
        if(!record){
          if(tagged&&!civilianKit)throw new Error('Species-tagged civilians require the borrowed shared renderer');
          const model=tagged?civilianKit.create(actor):createActor(T,materials);record={key,model};actors.set(actor.id,record);root.add(model.root);
        }
        record.model.update(actor,worldTime);
      }
      for(const [id,record]of actors)if(!active.has(id)){record.model.dispose();actors.delete(id);}
      lastSnapshot={tick:snapshot.tick,worldTime,playerTime};updates++;
    }
    function dispose(){
      if(disposed)return;disposed=true;
      for(const record of actors.values())record.model.dispose();actors.clear();
      medicine?.dispose();civilianKit?.dispose();exterior.dispose();housing?.dispose();housingKit?.dispose();
      fire.dispose();toolProps.dispose();field.dispose();bearKit.dispose();world.dispose();keyLight?.shadow.dispose();removeTree(root);pool.dispose();
    }
    return {update,dispose,beforeRender:camera=>fire.beforeRender?.(camera),fireReviewInputs:()=>fire.captureInputs?.(),setFireReviewMode:mode=>fire.setMode?.(mode),sampleBearBounds:()=>bear.sampleBodyBounds(),anchors:Object.freeze({...bear.anchors}),
      diagnostics:()=>({disposed,updates,lastSnapshot,footprintRadius,provisionalBear:false,actors:actors.size,provisionalActors:[...actors.values()].filter(r=>r.key==='legacy-provisional').length,civilianKit:civilianKit?.diagnostics()||null,civilians:civilianKit?.diagnostics()||null,civilianActors:[...actors.entries()].filter(([,r])=>r.key.startsWith('civilian:')).map(([id,r])=>({id,...r.model.diagnostics(),bounds:r.model.bounds})),exterior:exterior.diagnostics(),housing:housing?.diagnostics()||null,medicine:medicine?.diagnostics?.()||null,sharedResources:pool.counts(),world:world.counts(),bear:bear.counts(),bearProtagonist:bear.diagnostics(),bearKit:bearKit.diagnostics(),ground:field.counts(),tools:toolProps.diagnostics(),fire:fire.diagnostics()})};
  }catch(error){
    for(const record of actors.values())record.model.dispose();medicine?.dispose();civilianKit?.dispose();exterior?.dispose();housing?.dispose();housingKit?.dispose();fire?.dispose();toolProps?.dispose();field?.dispose();bear?.dispose();bearKit?.dispose();world?.dispose();keyLight?.shadow.dispose();removeTree(root);pool.dispose();throw error;
  }
}
