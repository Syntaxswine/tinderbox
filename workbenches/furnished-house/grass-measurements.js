import {createHash} from 'node:crypto';
import {EPS,dot,sub} from './geometry.js';
import {isGrassId} from './grass-fixture.js';

export const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function createGrassMeasurements(trial,{referenceCellIds}={}){
  const {scene}=trial,owners=new Map(),lineage=new Map(),previous=new Map(),ever=new Map(),ignitionPoses=new Map(),burned={house:0,grass:0},generated={house:0,grass:0},samples=[],events=[];
  const floor=scene.data.levels?.find(l=>l.index===0),floorBounds=floor?.floorTriangles?.flat(),minX=floorBounds?Math.min(...floorBounds.map(p=>p[0])):0,maxX=floorBounds?Math.max(...floorBounds.map(p=>p[0])):10,minZ=floorBounds?Math.min(...floorBounds.map(p=>p[2])):0,maxZ=floorBounds?Math.max(...floorBounds.map(p=>p[2])):10;
  const centre=[(minX+maxX)/2,(minZ+maxZ)/2],groundPlinth=[...scene.index.surfaces.values()].filter(b=>b.kind==='plinth'&&b.bounds.min[1]<=scene.groundY+EPS),plinthTop=Math.max(scene.groundY,...groundPlinth.map(b=>b.bounds.max[1]));
  for(const f of scene.fuels.values()){
    const b=scene.index.surfaces.get(f.boundaryId),grass=isGrassId(f.id),exterior=b?.kind==='wall'&&f.cls==='clapboard',wall=exterior&&b.level===0,facade=wall?(Math.abs(b.normal[0])>=Math.abs(b.normal[2])?(f.position[0]<centre[0]?'west (-X)':'east (+X)'):(f.position[2]<centre[1]?'front (-Z)':'rear (+Z)')):null;
    const group=grass?'grass':b?.kind==='roof'?'roof':exterior?(b.level===0?'ground exterior walls':'upper exterior walls'):b?.supportType==='porch-deck'||b?.supportType==='entry-step'||/porch|entry/i.test(f.sourceSurfaceId||'')?'porch/entry':f.itemId?'contents/finish/stores':b?.level===1?'upper other':'ground other';
    owners.set(f.id,{id:f.id,area:f.area||0,amount:f.initial,grass,cls:f.cls,kind:b?.kind||'contents',level:f.level??b?.level,position:[...f.position],boundaryId:f.boundaryId,sourceSurfaceId:f.sourceSurfaceId,exterior,groundExterior:wall,facade,group});lineage.set(f.id,f.id);previous.set(f.id,f.amount);
  }
  const house=[...owners.values()].filter(o=>!o.grass),originalHouseArea=house.reduce((v,o)=>v+o.area,0),originalGrassArea=[...owners.values()].filter(o=>o.grass).reduce((v,o)=>v+o.area,0),cellIds=referenceCellIds||[...scene.cells.keys()],thresholds={};
  let eventCursor=0,lastTick=-1,firstGrass=null,firstGrassWitness=null;
  function root(id){if(lineage.has(id))return lineage.get(id);const parent=id.replace(/:(?:embers|spill:\d+)$/,'');const value=parent!==id?root(parent):null;lineage.set(id,value);return value;}
  function ignite(owner,time,pose){if(!ever.has(owner.id)){ever.set(owner.id,time);ignitionPoses.set(owner.id,pose);}}
  function observe(){
    if(lastTick===trial.tick)return;lastTick=trial.tick;const tick=trial.tick,dt=trial.rules.step;
    for(const f of scene.fuels.values()){
      const o=owners.get(root(f.id));if(!o)throw Error('Untracked finite fuel '+f.id);const cohort=o.grass?'grass':'house';
      if(f.lastBurnTick===tick){const amount=Math.min(previous.get(f.id)??f.initial,f.initial*dt/scene.profile[f.cls].seconds);burned[cohort]+=amount;generated[cohort]+=amount*scene.profile[f.cls].energy;}
      if(f.litAt!==null&&f.litAt!==undefined)ignite(o,f.litAt,f.falling?'airborne':f.rubbleId?'rubble':f.loose?'loose':'in-place');previous.set(f.id,f.amount);
    }
    for(const e of trial.events.slice(eventCursor)){
      events.push(e);if(e.type==='oil-release'){const o=owners.get(root(e.fuelId));if(o){const c=o.grass?'grass':'house';burned[c]+=e.spentForPulse;generated[c]+=e.spentForPulse*scene.profile.oil.energy;ignite(o,e.time,'finite store pulse');}}
      if(!firstGrass&&e.type==='ignition'&&isGrassId(e.fuelId)){firstGrass=e;firstGrassWitness=witness(e);}
    }
    eventCursor=trial.events.length;
    const fraction=house.filter(o=>ever.has(o.id)).reduce((v,o)=>v+o.area,0)/originalHouseArea;for(const percent of [10,50,90])if(!(percent in thresholds)&&fraction>=percent/100)thresholds[percent]=tick*dt;
  }
  function witness(event){
    const f=scene.fuels.get(event.fuelId),targetCells=new Set(f.cells),coLocated=[],localCandidates=[];
    for(const source of scene.fuels.values()){const o=owners.get(root(source.id));if(!o||o.grass||source.lastBurnTick!==trial.tick)continue;
      if(source.cells.some(c=>targetCells.has(c)))coLocated.push({fuelId:source.id,originalId:o.id,kind:o.kind,cls:source.cls,position:source.position,falling:source.falling,rubbleId:source.rubbleId});
      for(const c of source.cells)for(const l of c.links||[])if(targetCells.has(l.target)&&l.transmission>0)localCandidates.push({fuelId:source.id,originalId:o.id,sourceCell:c.id,targetCell:l.target.id,transmission:l.transmission,barriers:l.hits.map(h=>h.surface.id)});
    }
    const nearbyLandings=trial.events.filter(e=>e.type==='landing'&&Math.hypot(e.contactPosition[0]-event.position[0],e.contactPosition[2]-event.position[2])<1&&event.time-e.time<5).map(e=>({...e,originalIds:e.fuelIds.map(root),burningOriginalIds:e.fuelIds.filter(id=>scene.fuels.get(id)?.lit).map(root)}));
    return {coLocatedBurningHouseFuels:coLocated,eligibleLocalCandidates:localCandidates,nearbyLandings,limitation:'Shared-cell fuel and landing records are observed. Cached eligible local links are candidates, not unique heat attribution; delayed radiation has no per-source attribution in this unchanged kernel.'};
  }
  function stateDigest(){return digest({fuels:house.map(o=>{const f=scene.fuels.get(o.id),b=scene.index.surfaces.get(o.boundaryId);return [o.id,f.amount,f.char,f.litAt,f.spentAt,f.falling,f.position,b?.intact,b?.openFraction];}),cells:cellIds.map(id=>[id,scene.cells.get(id)?.heat??0])});}
  function sample(){
    const current=new Set(),remaining={house:0,grass:0},airborne={house:0,grass:0};for(const f of scene.fuels.values()){const o=owners.get(root(f.id)),c=o.grass?'grass':'house';if(f.lit&&f.amount>EPS)current.add(o.id);(f.falling?airborne:remaining)[c]+=f.amount;}
    const groups={};for(const o of owners.values()){const g=groups[o.group]??={originalArea:0,everIgnitedArea:0,currentBurningArea:0};g.originalArea+=o.area;if(ever.has(o.id))g.everIgnitedArea+=o.area;if(current.has(o.id))g.currentBurningArea+=o.area;}
    const houseEver=house.filter(o=>ever.has(o.id)).reduce((v,o)=>v+o.area,0),houseBurning=house.filter(o=>current.has(o.id)).reduce((v,o)=>v+o.area,0),grassEver=[...owners.values()].filter(o=>o.grass&&ever.has(o.id)).reduce((v,o)=>v+o.area,0);
    const record={tick:trial.tick,worldTime:trial.worldTime,house:{originalArea:originalHouseArea,everIgnitedArea:houseEver,currentBurningArea:houseBurning,everIgnitedFraction:houseEver/originalHouseArea,stateSha256:stateDigest(),burned:burned.house,remaining:remaining.house,airborne:airborne.house},grass:{originalArea:originalGrassArea,everIgnitedArea:grassEver,currentBurningArea:[...owners.values()].filter(o=>o.grass&&current.has(o.id)).reduce((v,o)=>v+o.area,0),burned:burned.grass,remaining:remaining.grass,airborne:airborne.grass},groups,metrics:trial.metrics()};samples.push(record);return record;
  }
  function finish(){
    const walls=house.filter(o=>o.groundExterior),facades={};
    for(const name of [...new Set(walls.map(o=>o.facade))]){const set=walls.filter(o=>o.facade===name),lit=set.filter(o=>ever.has(o.id)),unlit=set.filter(o=>!ever.has(o.id));facades[name]={originalCount:set.length,originalArea:set.reduce((v,o)=>v+o.area,0),ignitedCount:lit.length,ignitedArea:lit.reduce((v,o)=>v+o.area,0),inPlaceIgnitedCount:lit.filter(o=>ignitionPoses.get(o.id)==='in-place').length,first:lit.length?Math.min(...lit.map(o=>ever.get(o.id))):null,last:lit.length?Math.max(...lit.map(o=>ever.get(o.id))):null,unignitedCount:unlit.length,unignitedArea:unlit.reduce((v,o)=>v+o.area,0),unignitedIds:unlit.map(o=>o.id)};}
    const litWalls=walls.filter(o=>ever.has(o.id)),unlitWalls=walls.filter(o=>!ever.has(o.id)),lastAll=unlitWalls.length?null:Math.max(...litWalls.map(o=>ever.get(o.id))),firstKind=kind=>events.find(e=>e.type==='support-failure'&&e.kind===kind),firstAbove=events.find(e=>e.type==='ignition'&&owners.get(root(e.fuelId))?.exterior&&e.position[1]>plinthTop+EPS),aboveAfter=firstGrass?events.find(e=>e.type==='ignition'&&owners.get(root(e.fuelId))?.exterior&&e.position[1]>plinthTop+EPS&&e.time>=firstGrass.time):null;
    return {areaDefinition:'Sum of each original authored finite fuel identity area once, including separately authored finish layers (overlapping physical surfaces), contents and stores; descendants/embers/spills map back to that identity. Grass excluded. This is fuel-surface area, not unique floor/skin area.',originalHouseArea,originalHouseFuel:house.reduce((v,o)=>v+o.amount,0),houseIdentityCount:house.length,thresholds:{10:thresholds[10]??null,50:thresholds[50]??null,90:thresholds[90]??null},firstGrass,firstGrassWitness,plinthTop,firstExteriorAbovePlinth:firstAbove,firstExteriorAbovePlinthAfterGrass:aboveAfter,exteriorSetDefinition:'Original canonical level0 wall patches with clapboard fuel; excludes windows/doors/casings/porch. Covers original identities even after falling; in-place count is separate.',exterior:{originalCount:walls.length,originalArea:walls.reduce((v,o)=>v+o.area,0),lastAllIgnited:lastAll,secondsAfterFirstGrassToAllWalls:firstGrass&&lastAll!==null?lastAll-firstGrass.time:null,unignitedCount:unlitWalls.length,unignitedArea:unlitWalls.reduce((v,o)=>v+o.area,0),facades},firstFloorFailure:firstKind('floor'),firstRoofFailure:firstKind('roof'),firstSupportFailure:events.find(e=>e.type==='support-failure'),oil:events.find(e=>e.type==='oil-release'),coal:events.find(e=>e.type==='ignition'&&e.cls==='coal'),firstPorchEntryIgnition:events.find(e=>e.type==='ignition'&&owners.get(root(e.fuelId))?.group==='porch/entry'),generated,burned,samples,originalIdentities:house,everIgnited:[...ever].map(([id,time])=>({id,time,pose:ignitionPoses.get(id)}))};
  }
  return {observe,sample,finish,referenceCellIds:cellIds,owners,root,get firstGrass(){return firstGrass;},get thresholds(){return {...thresholds};}};
}
