
import {Resources,removeTree} from './resources.js';
import {createMaterials} from './materials.js';
import {BEAR_SPEC} from '../reuse/bear.js';
import {loadCharacterKit} from '../reuse/characters.js';
import {createWorld,createActor} from './world.js';
import {createExteriorKit} from './exterior-kit.js';
import {loadCivilianKit} from '../reuse/civilians.js';
import {createGroundField} from './ground-field.js';
import {createCellReader,createTrailReader,isImmutableRecordArray} from './cell-publication.js';
import {createBurnedHouseRubble} from './burned-house-rubble.js';
import {createFire} from './fire.js';
import {groupStructureFire} from './structure-fire.js';
import {createStreetFirelight} from './street-firelight.js';
import {createStreetNight} from './street-night.js';
import {createToolProps} from './tool-props.js';
import {createSidingPreheat} from './siding-preheat.js';
import {loadNeighborhoodKit,createNeighborhood} from './neighborhood.js';
import {BELL_AND_ALDER} from '../content/bell-and-alder-layout.js';
import {CHICAGO_PATROL} from '../content/exterior-kit.js';
import {createWitnessReaction} from './witness-reaction.js';
import {dressStockyardWorker,stockyardWorkerReviewEnabled,stockyardWorkerSkinFor} from './stockyard-worker-skins.js';
import {loadStockyardWorkerPaint} from './stockyard-worker-paint.js';
export const ART_ASSET_ROOT=new URL('../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/',import.meta.url).href;
export {BEAR_SPEC};
const medicineUrl=new URL('../../assets/art/medicine-pickups/index.js',import.meta.url);
export async function createArtScene({THREE:T,scene,renderer,assetBaseUrl=ART_ASSET_ROOT,bearAssetBaseUrl,characterId='bear',signal,world:initialWorld,pickups:initialPickups=[],medicineLoader=()=>import(medicineUrl.href),cottageWind,cottageFire,defaultLights,stockyardWorkers=stockyardWorkerReviewEnabled()}={}){
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
  let workerPaint,root,world,bear,bearKit,field,fire,toolProps,exterior,civilianKit,housing,housingKit,medicine,keyLight,cottages,shop,rubble,sidingPreheat,firelight,streetNight,disposed=false,updates=0,lastSnapshot,footprintRadius=.56;
  const cottageIds=new Set(cottageFire?.buildings.map(b=>b.id)??[]);
  const actors=new Map(),muzzlePoint=new T.Vector3();
  const readCells=createCellReader(),nearbyTrail=createTrailReader(readCells);
  let lastObstacles,plainObstacles;
  function groundObstacles(obstacles){
    const immutable=isImmutableRecordArray(obstacles);
    if(immutable&&obstacles===lastObstacles)return plainObstacles;
    plainObstacles=(obstacles||[]).filter(o=>!o.moduleId&&!o.buildingId&&o.shopId!==BELL_AND_ALDER.id);
    lastObstacles=immutable?obstacles:undefined;
    if(immutable)Object.freeze(plainObstacles);
    return plainObstacles;
  }
  let witnessReaction;
  try{
    if(renderer)civilianKit=await loadCivilianKit({THREE:T,renderer,assetBaseUrl:base.href});
    if(initialWorld?.buildings?.length)housingKit=await loadNeighborhoodKit(T,{renderer});
    if(signal?.aborted)throw new DOMException('Visit cancelled','AbortError');
    root=new T.Group();root.name='Tinderbox art module';
    const materials=createMaterials(T,pool,assets);
    if(stockyardWorkers)workerPaint=pool.object(await loadStockyardWorkerPaint(T,{signal}));
    bearKit=await loadCharacterKit({characterId,THREE:T,renderer,assetBaseUrl:bearAssetBaseUrl,materials,signal});
    if(signal?.aborted)throw new DOMException('Visit cancelled','AbortError');
    world=createWorld(T,materials);bear=bearKit.create();if(stockyardWorkers)dressStockyardWorker(T,bear,{skin:'yard-foreman',texture:workerPaint.get('yard-foreman')});field=createGroundField(T,readCells);fire=createFire(T,assets,field.uniforms,readCells);sidingPreheat=createSidingPreheat(T);
    exterior=createExteriorKit(T,materials,assets,renderer);
    toolProps=createToolProps(T,materials);firelight=createStreetFirelight(T,readCells);
    root.add(world.root,field.root,fire.root,bear.root,toolProps.root,exterior.root,sidingPreheat.root,firelight.root);
    if(housingKit){
      housing=createNeighborhood(T,housingKit);rubble=createBurnedHouseRubble(T);
      root.add(housing.root,housing.fireRoot,rubble.root);
    }
    if(cottageFire){
      const {createCottagePairArt}=await import('./cottage-pair.js');
      if(signal?.aborted)throw new DOMException('Visit cancelled','AbortError');
      cottages=createCottagePairArt(T,housingKit,initialWorld.buildings,cottageWind,renderer,{sharedFirelight:true,rubbleAfterBurnout:true});root.add(cottages.root);
    }else if(housing){
      streetNight=createStreetNight(T,scene,renderer,defaultLights);
      if(streetNight)root.add(streetNight.root);
    }
    if(initialWorld?.obstacles?.some(o=>o.shopId===BELL_AND_ALDER.id)){
      const {createBellAndAlder}=await import('./bell-and-alder.js');
      if(signal?.aborted)throw new DOMException('Visit cancelled','AbortError');
      shop=await createBellAndAlder(T,{renderer,signal});
      if(signal?.aborted)throw new DOMException('Visit cancelled','AbortError');
      root.add(shop.root);
    }
    if(initialPickups.length){const {createMedicinePickups}=await medicineLoader();if(signal?.aborted)throw new DOMException('Visit cancelled','AbortError');medicine=createMedicinePickups(T,{materials,textures:assets});root.add(medicine.root);}
    if(!cottages&&!streetNight&&!scene.children.some(object=>object.isLight)){
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
      world.update({...map,obstacles:groundObstacles(map.obstacles)});exterior.update(map);field.update(snapshot);bear.update(player,playerTime,{paused:snapshot.paused});bear.anchors.muzzle.getWorldPosition(muzzlePoint);
      shop?.update(map,{player,camera:timing.camera});
      const standardHousing=cottages?{...map,buildings:map.buildings.filter(b=>!cottageIds.has(b.id))}:map;
      const preheatSites=[],structureSites=groupStructureFire(snapshot.structureFire);
      const rubbleSites=rubble?.update(snapshot,worldTime);
      firelight.update(snapshot,structureSites,worldTime,rubbleSites);
      const housingShadows=housing?.update(standardHousing,{camera:timing.camera,player,muzzle:muzzlePoint,viewport:timing.viewport,worldTime,sampleWind:cottageWind,preheatSites,structureSites,trail:nearbyTrail(snapshot.cells,player)});
      cottages?.update(snapshot.cottageFire,{camera:timing.camera,player,housingShadows,preheatSites,
        structureSites:Array.isArray(snapshot.structureFire)?structureSites:undefined});
      sidingPreheat.update({sites:preheatSites,time:worldTime,camera:timing.camera,player,sampleWind:cottageWind});
      fire.update(snapshot,worldTime,{muzzle:muzzlePoint,camera:timing.camera,rubble:rubbleSites});const discharge=fire.diagnostics().discharge;bear.setHeldVisible(!discharge.active||discharge.muzzleInsideShape);toolProps.update(snapshot,playerTime,bear.anchors);
      footprintRadius=Number.isFinite(player.radius)&&player.radius>0?player.radius:.56;
      ring.position.set(player.x,.026,player.y);ring.scale.set(footprintRadius,1,footprintRadius);
      arrow.position.set(player.x,0,player.y);arrow.rotation.y=-(player.heading||0);arrow.scale.set(footprintRadius,1,footprintRadius);
      const active=new Set(),witness=snapshot.witness;
      for(const actor of snapshot.actors||[]){
        if(actor.id===player.id)continue;active.add(actor.id);
        const patrol=actor.team===CHICAGO_PATROL.team,tagged=Object.hasOwn(actor,'species');
        const key=patrol?'patrol':tagged?'civilian:'+actor.species:'legacy-provisional';
        let record=actors.get(actor.id);
        if(record&&record.key!==key){record.model.dispose();actors.delete(actor.id);record=null;}
        if(!record){
          if((tagged||patrol)&&!civilianKit)throw new Error('Native street actors require the borrowed shared renderer');
          const model=patrol?civilianKit.createPatrol(actor):tagged?civilianKit.create(actor):createActor(T,materials);
          if(stockyardWorkers&&tagged&&!patrol)dressStockyardWorker(T,model,{skin:stockyardWorkerSkinFor(actor.id),texture:workerPaint.get(stockyardWorkerSkinFor(actor.id))});
          record={key,model};actors.set(actor.id,record);root.add(model.root);
        }
        record.model.update(actor,worldTime,actor.id===witness?.actorId?witness.aim:undefined);
      }
      for(const [id,record]of actors)if(!active.has(id)){record.model.dispose();actors.delete(id);}
      if(witness&&(witness.reaction.kind!=='relaxed'||witness.shot)&&!witnessReaction){witnessReaction=createWitnessReaction(T);root.add(witnessReaction.root);}
      witnessReaction?.update(snapshot.actors?.find(actor=>actor.id===witness?.actorId),witness?.reaction,witness?.shot,worldTime);
      lastSnapshot={tick:snapshot.tick,worldTime,playerTime};updates++;
    }
    function dispose(){
      if(disposed)return;disposed=true;
      for(const record of actors.values())record.model.dispose();actors.clear();
      medicine?.dispose();shop?.dispose();witnessReaction?.dispose();civilianKit?.dispose();exterior.dispose();cottages?.dispose();rubble?.dispose();housing?.dispose();housingKit?.dispose();
      sidingPreheat.dispose();fire.dispose();firelight.dispose();streetNight?.dispose();toolProps.dispose();field.dispose();bearKit.dispose();world.dispose();keyLight?.shadow.dispose();removeTree(root);pool.dispose();
    }
    return {update,dispose,pickAimSurface:cottages?.pickAimSurface,sampleBearBounds:()=>bear.sampleBodyBounds(),anchors:Object.freeze({...bear.anchors}),
      diagnostics:()=>({disposed,updates,lastSnapshot,stockyardWorkers,workerPaint:workerPaint?.diagnostics()||null,footprintRadius,provisionalBear:false,actors:actors.size,provisionalActors:[...actors.values()].filter(r=>r.key==='legacy-provisional').length,civilianKit:civilianKit?.diagnostics()||null,civilians:civilianKit?.diagnostics()||null,civilianActors:[...actors.entries()].filter(([,r])=>r.key.startsWith('civilian:')).map(([id,r])=>({id,...r.model.diagnostics(),bounds:r.model.bounds})),
        patrolActors:[...actors.entries()].filter(([,r])=>r.key==='patrol').map(([id,r])=>({id,...r.model.diagnostics(),bounds:r.model.bounds})),
        witness:witnessReaction?.diagnostics()??null,
        exterior:exterior.diagnostics(),housing:housing?.diagnostics()||null,rubble:rubble?.diagnostics()??[],bellAndAlder:shop?.diagnostics()||null,medicine:medicine?.diagnostics?.()||null,sharedResources:pool.counts(),world:world.counts(),bear:bear.counts(),bearProtagonist:bear.diagnostics(),bearKit:bearKit.diagnostics(),ground:field.counts(),tools:toolProps.diagnostics(),fire:fire.diagnostics(),firelight:firelight.diagnostics(),preheat:sidingPreheat.stats(),...(cottages?{cottages:cottages.diagnostics()}:{})})};
  }catch(error){
    for(const record of actors.values())record.model.dispose();medicine?.dispose();shop?.dispose();civilianKit?.dispose();exterior?.dispose();cottages?.dispose();rubble?.dispose();housing?.dispose();housingKit?.dispose();sidingPreheat?.dispose();fire?.dispose();firelight?.dispose();streetNight?.dispose();toolProps?.dispose();field?.dispose();bear?.dispose();bearKit?.dispose();world?.dispose();keyLight?.shadow.dispose();removeTree(root);pool.dispose();throw error;
  }
}
