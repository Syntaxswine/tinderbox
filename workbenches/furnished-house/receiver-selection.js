// Milestone21 diagnostic only: frozen initial no-lawn identities, live transport.
import {digest} from './grass-measurements.js';
import {sub,length} from './geometry.js';

const area=cell=>cell.fuels.reduce((sum,f)=>sum+f.area/Math.max(1,f.cells.length),0);
export function initialRepresentatives(scene){
  const bins=new Map();for(const c of scene.cells.values())if(c.fuels.length){const key=c.position.map(v=>Math.floor(v/2)).join(',');if(!bins.has(key))bins.set(key,[]);bins.get(key).push(c);}
  return [...bins.values()].map(list=>list.sort((a,b)=>a.id.localeCompare(b.id))[0]).map(c=>({id:c.id,position:[...c.position],area:area(c),capacity:c.capacity}));
}
export function chooseReferenceTargets(representatives,position,{range=8,count=24}={}){
  const candidates=representatives.map(target=>({target,distance:length(sub(target.position,position))})).filter(v=>v.distance>.85&&v.distance<=range).sort((a,b)=>a.distance-b.distance||a.target.id.localeCompare(b.target.id));
  return {candidates,chosen:candidates.length<=count?candidates:Array.from({length:count},(_,i)=>candidates[Math.floor(i*candidates.length/count)])};
}
export function createNoLawnReceiverSelection(referenceScene,liveScene){
  const representatives=initialRepresentatives(referenceScene),referenceCells=new Map([...referenceScene.cells].map(([id,c])=>[id,{position:[...c.position],area:area(c),capacity:c.capacity}])),sources=new Map(),rays=new Map(),initialTargets=[];
  for(const r of representatives){const cell=liveScene.cells.get(r.id);if(!cell||cell.position.some((v,i)=>v!==r.position[i]))throw Error('Missing or displaced reference radiation target '+r.id);initialTargets.push({id:r.id,referenceArea:r.area,liveArea:area(cell),referenceCapacity:r.capacity,liveCapacity:cell.capacity});}
  return {
    select({sourceId,position,range,count}){
      const {candidates,chosen}=chooseReferenceTargets(representatives,position,{range,count}),selected=chosen.map(v=>({id:v.target.id,position:[...v.target.position]})),old=sources.get(sourceId);
      if(old&&digest(old.position)!==digest(position))throw Error('Canonical source cell moved '+sourceId);
      sources.set(sourceId,{sourceId,position:[...position],inInitialNoLawnDomain:referenceCells.has(sourceId),calls:(old?.calls||0)+1,candidateCount:candidates.length,candidatesSha256:digest(candidates.map(v=>v.target.id)),selectedCount:selected.length,selectedSha256:digest(selected),selected});
      return selected;
    },
    observeRay({tick,sourceId,targetId,position,area:liveArea,capacity,incidence,weight,transmission}){
      const reference=referenceCells.get(targetId);if(!reference||reference.position.some((v,i)=>v!==position[i]))throw Error('Unexpected live radiation target '+targetId);
      const key=sourceId+'>'+targetId,row=rays.get(key)||{sourceId,targetId,referenceArea:reference.area,referenceCapacity:reference.capacity,firstTick:tick,lastTick:tick,builds:0,liveAreaMin:liveArea,liveAreaMax:liveArea,liveCapacityMin:capacity,liveCapacityMax:capacity,incidenceMin:incidence,incidenceMax:incidence,weightMin:weight,weightMax:weight,transmissionMin:transmission,transmissionMax:transmission};
      row.lastTick=tick;row.builds++;for(const [name,value]of [['liveArea',liveArea],['liveCapacity',capacity],['incidence',incidence],['weight',weight],['transmission',transmission]]){row[name+'Min']=Math.min(row[name+'Min'],value);row[name+'Max']=Math.max(row[name+'Max'],value);}rays.set(key,row);
    },
    snapshot(){const sourceRows=[...sources.values()],rayRows=[...rays.values()];return {mode:'initial-no-lawn-identities/live-lawn-transport',representativeCount:representatives.length,representativesSha256:digest(representatives),representatives,initialTargetResolution:{resolved:initialTargets.length,missing:0,displaced:0,areaDifferences:initialTargets.filter(r=>Math.abs(r.referenceArea-r.liveArea)>1e-12),capacityDifferences:initialTargets.filter(r=>r.referenceCapacity!==r.liveCapacity)},sourceCount:sourceRows.length,newSourceCount:sourceRows.filter(r=>!r.inInitialNoLawnDomain).length,sourcesSha256:digest(sourceRows),sources:sourceRows,rayBuilds:rayRows.reduce((n,r)=>n+r.builds,0),rayPairs:rayRows.length,liveRayAreaDifferences:rayRows.filter(r=>Math.abs(r.referenceArea-r.liveAreaMin)>1e-12||Math.abs(r.referenceArea-r.liveAreaMax)>1e-12),liveRayCapacityDifferences:rayRows.filter(r=>r.referenceCapacity!==r.liveCapacityMin||r.referenceCapacity!==r.liveCapacityMax),rays:rayRows};}
  };
}
