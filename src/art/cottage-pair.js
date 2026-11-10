import {createGrossHouse} from './gross-housing.js';
import {createCottageFirelight} from './cottage-firelight.js';
import {createCottageLowerOpenings} from './cottage-lower-openings.js';
import {COTTAGE_IDS,COTTAGE_ORIGIN} from '../content/cottage-pair.js';
import {COTTAGE_EMBER_LIMIT} from '../simulation/cottage-fire.js';
import {WIDTH,DEPTH,EAVE,RIM,tileIndex} from '../simulation/cottage-topology.js';
import {createHouseTileArt} from '../reuse/ashland/house-tile-art.js';
import {createWallShroud} from '../reuse/ashland/wall-shroud.js';
import {createAirborneEmbers} from '../reuse/ashland/airborne-embers.js';
import {createNightCottageLighting} from '../reuse/ashland/night-cottage-lighting.js';

// Presentation only: the ordinary Catalogue Street visit supplies the camera,
// actual structural mask, sparks and debris. The replay is never instantiated.
export function createCottagePairArt(T,library,buildings,sampleWind,renderer,{sharedFirelight=false,rubbleAfterBurnout=false}={}){
  if(typeof sampleWind!=='function')throw Error('Cottage presentation needs the same wind sampler as gameplay');
  const root=new T.Group(),records=new Map(),ray=new T.Raycaster(),p=new T.Vector3(),ndc=new T.Vector3(),hit=new T.Vector3(),sidingHit=new T.Vector3();
  root.name='Playable Ashland cottage pair';
  let night,outdoorLight,embers,disposed=false;
  const shadow=renderer?.shadowMap,oldShadow=shadow&&{enabled:shadow.enabled,type:shadow.type};
  function dispose(){
    if(disposed)return;disposed=true;
    for(const record of records.values()){
      for(const effect of Object.values(record.fx))effect.dispose();
      record.tiles?.dispose();record.house.dispose();record.root.removeFromParent();
    }
    records.clear();embers?.dispose();outdoorLight?.dispose();night?.dispose();
    if(shadow)Object.assign(shadow,oldShadow);
    root.removeFromParent();root.clear();
  }
  try{
    night=createNightCottageLighting(T);
    if(sharedFirelight)for(const light of night.fireLights.flat())light.removeFromParent();
    night.moon.position.x+=COTTAGE_ORIGIN.x;night.moon.position.z+=COTTAGE_ORIGIN.z;
    night.moon.target.position.x+=COTTAGE_ORIGIN.x;night.moon.target.position.z+=COTTAGE_ORIGIN.z;
    if(shadow){shadow.enabled=true;shadow.type=T.PCFShadowMap;}
    renderer?.setClearColor(night.clearColor);
    root.add(night.root);
    embers=createAirborneEmbers(T,{maxEmbers:COTTAGE_EMBER_LIMIT});root.add(embers.root);
    const pair=COTTAGE_IDS.map(id=>{
      const b=buildings.find(b=>b.id===id);
      if(!b)throw Error('Missing native Ashland cottage '+id);
      return b;
    });
    for(const b of pair){
      const {id}=b;
      const house=createGrossHouse(T,library,b.prefabId,{furnished:false}),group=new T.Group();
      const record={root:group,house,fx:{},materials:new Map(),shadows:new Map(),faded:false,pose:null};
      records.set(id,record);
      house.setView({view:'exterior',showFurniture:false});
      record.lower=createCottageLowerOpenings(T,house);
      record.tiles=createHouseTileArt(T,house.root,{woodTexture:library.textures.oak});
      group.position.set(b.x,0,b.y);group.add(house.root,record.tiles.root);
      root.add(group);group.updateMatrixWorld(true);
      record.bounds=new T.Box3().setFromObject(house.root);
      record.sidingBounds=new T.Box3(new T.Vector3(b.x-RIM,0,b.y-RIM),new T.Vector3(b.x+WIDTH+RIM,EAVE,b.y+DEPTH+RIM));
      house.root.traverse(object=>{
        if(object.isMesh)record.shadows.set(object,object.castShadow);
        for(const material of [object.material].flat().filter(Boolean)){
          if(record.materials.has(material))continue;
          record.materials.set(material,{color:material.color?.clone(),opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});
        }
      });
      for(const [layer,maxCells] of [['walls',52],['roof',42],['upper',42],['lower',42],['debris',2]]){
        record.fx[layer]=createWallShroud(T,{maxCells,profile:'house'});root.add(record.fx[layer].root);
      }
    }
    if(!sharedFirelight){
      outdoorLight=createCottageFirelight(T,pair,night.fireLights);
      root.add(outdoorLight.root);
    }
  }catch(error){dispose();throw error;}
  const char=new T.Color(0x372a23);
  function fades(record,player,camera,gone){
    if(gone||!camera||!player)return false;
    for(const y of [.1,player.height*.6,player.height]){
      p.set(player.x,y,player.y);ndc.copy(p).project(camera);
      ray.setFromCamera(ndc,camera);
      if(ray.ray.intersectBox(record.bounds,hit)&&hit.distanceTo(ray.ray.origin)<p.distanceTo(ray.ray.origin)-.05)return true;
    }
    return false;
  }
  function pickAimSurface(pointerRay){
    let best=null,nearest=Infinity;
    for(const {aimState:state,faded,sidingBounds:box} of records.values()){
      if(!state||state.gone||faded||!pointerRay.intersectBox(box,sidingHit)||sidingHit.y>=EAVE-1e-6)continue;
      if(!state.tiles[tileIndex(sidingHit.x-state.x,sidingHit.z-state.z)].upper)continue;
      const distance=pointerRay.origin.distanceToSquared(sidingHit);
      if(distance>=nearest)continue;
      nearest=distance;
      // The pick supplies a ground-plane aim inside this face. Simulation still
      // owns range, obstruction and the exact heat contact.
      best={x:T.MathUtils.clamp(sidingHit.x,box.min.x+.005,box.max.x-.005),y:T.MathUtils.clamp(sidingHit.z,box.min.z+.005,box.max.z-.005)};
    }
    return best;
  }
  function update(frame,{camera,player,housingShadows=false,preheatSites,structureSites}={}){
    if(disposed)return;
    if(frame?.version!==1)throw Error('Missing authoritative cottage fire frame');
    const lightCells=[];
    let shadowChanged=housingShadows;
    for(const state of frame.buildings){
      const record=records.get(state.id);
      if(!record)throw Error('Unexpected cottage presentation ID');
      record.aimState=state;
      record.house.root.visible=!state.gone;
      record.tiles.root.visible=!rubbleAfterBurnout||!state.gone;
      record.tiles.update(state);
      const {openings,changed}=record.lower.update(state,frame.worldTime,camera);
      record.lowerOpenings=[...openings.values()];
      shadowChanged||=changed;
      const faded=fades(record,player,camera,state.gone);
      const pose=state.tiles.map(t=>Number(t.roof)*4+Number(t.upper)*2+Number(t.lower)).join('')+state.drops.map(d=>d.y).join(',')+faded;
      shadowChanged||=pose!==record.pose;record.pose=pose;
      for(const [material,original] of record.materials){
        if(original.color&&/wood|clapboard|shingle|oak|siding|cedar/i.test(material.name))material.color.copy(original.color).lerp(char,state.char*.71);
        material.opacity=original.opacity*(faded?.18:1);
        material.transparent=faded||original.transparent;
        material.depthWrite=faded?false:original.depthWrite;
        if(faded!==record.faded)material.needsUpdate=true;
      }
      if(faded!==record.faded)for(const [mesh,cast] of record.shadows)mesh.castShadow=!faded&&cast;
      record.faded=faded;
      const layers={walls:[],roof:[],upper:[],lower:[],debris:[]};
      const world=cell=>({...cell,id:state.id+'/'+cell.id,x:state.x+cell.x,z:state.z+cell.z});
      if(preheatSites&&!state.gone&&!faded&&Array.isArray(state.preheat)&&state.preheat.length){
        const ignited=new Set(state.cells.filter(cell=>cell.layer==='walls').map(cell=>cell.id));
        for(const sample of state.preheat){
          if(!sample||![sample.x,sample.z].every(Number.isFinite)||ignited.has(sample.id))continue;
          if(state.tiles[tileIndex(sample.x,sample.z)]?.upper)preheatSites.push(world(sample));
        }
      }
      if(structureSites)for(const site of structureSites.get(state.id)||[]){
        if(site.part==='walls'||site.part==='roof')layers[site.part].push(site);
      }
      // Floor openings and debris still carry cottage tile and vent data in the original frame.
      for(const cell of state.cells)if(cell.flame>0||cell.smoke>0){
        if(structureSites&&(cell.layer==='walls'||cell.layer==='roof'))continue;
        const vent=cell.layer==='lower'?openings.get(cell.tile):null;
        const visible=vent?{...cell,...vent,part:'walls'}:cell;
        layers[cell.layer].push(world(visible));
      }
      for(const drop of state.drops)layers.debris.push(world({...drop,part:'ground',face:'falling fuel',
        y:drop.y+(drop.kind==='crate'?.19:.08),nx:0,ny:1,nz:0}));
      if(outdoorLight)lightCells.push([...layers.walls,...layers.roof,...layers.upper,...layers.lower.map(cell=>({...cell,part:'ground'})),...layers.debris]);
      if(camera)for(const [layer,fx] of Object.entries(record.fx))fx.update({time:frame.worldTime,cells:layers[layer],camera,sampleWind});
    }
    if(outdoorLight){
      night.update({sourceCells:lightCells[0],receiverCells:lightCells[1]});
      outdoorLight.update(lightCells);
    }
    embers.update(frame.embers);
    if(shadowChanged)night.moon.shadow.needsUpdate=true;
  }
  function diagnostics(){
    return {disposed,embers:embers?.stats(),outdoorLight:outdoorLight?.diagnostics(),houses:[...records.entries()].map(([id,r])=>({id,art:r.tiles.diagnostics(),
      fire:Object.fromEntries(Object.entries(r.fx).map(([key,v])=>[key,v.stats()])),faded:r.faded,lowerOpenings:r.lowerOpenings?.map(vent=>({...vent}))??[]}))};
  }
  return {root,update,pickAimSurface,diagnostics,dispose};
}
