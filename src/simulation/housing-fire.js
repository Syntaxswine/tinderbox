import {buildingPoint,localHousingFootprints} from '../content/buildings.js';
import {housingSectionAt,housingSectionBounds,housingSectionGrid} from '../content/housing-sections.js';
import {HOUSING_PLANS} from '../content/housing-plans.js';

const EPS=1e-9;
function toPlan(building,point){
  return buildingPoint({x:0,y:0,quarterTurns:(4-building.quarterTurns)%4},
    {x:point.x-building.x,y:point.y-building.y});
}

// Use the very same finite ground fuel that powered the original housing.
// Each cell belongs to one local section of its existing footprint.
export function createHousingFire(group,obstacles){
  const {building,colliders,cells,initialSurfaceFuel}=group;
  const grid=housingSectionGrid(building.prefabId);
  const localBoxes=localHousingFootprints(building.prefabId,building.partyWalls);
  const plan=HOUSING_PLANS[building.prefabId],odd=building.quarterTurns%2;
  const sections=Array.from({length:grid.cols*grid.rows},(_,index)=>({
    cells:[],bounds:housingSectionBounds(grid,index),view:{index,present:true,firstIgnition:null,fire:null}
  }));
  building.sections=sections.map(section=>section.view);
  const neighbors=new Set(Object.values(building.partyWalls).filter(Boolean));
  const party=neighbors.size?{id:building.id,neighbors}:null;
  for(const cell of cells){
    const point=toPlan(building,cell);
    sections[housingSectionAt(grid,point.x,point.y)].cells.push({cell,...point});
    if(party)cell.houseParty=party;
  }
  const fragments=new Map();
  for(const section of sections){
    const {minX,maxX,minZ,maxZ}=section.bounds;
    for(const local of localBoxes){
      const x0=Math.max(minX,local.x-local.width/2),x1=Math.min(maxX,local.x+local.width/2);
      const z0=Math.max(minZ,local.y-local.depth/2),z1=Math.min(maxZ,local.y+local.depth/2);
      if(x1-x0<=EPS||z1-z0<=EPS)continue;
      const original=colliders.find(o=>o.role===local.role),id=original.id+':'+section.view.index;
      const center=buildingPoint(building,{x:(x0+x1)/2,y:(z0+z1)/2});
      const barriers=[];
      for(const barrier of original.heatBarriers??[]){
        const left=barrier.id.endsWith('party-left');
        if(left?minX!==-Infinity:maxX!==Infinity)continue;
        const a=Math.max(0,z0),b=Math.min(plan.depth,z1);
        if(b-a<=EPS)continue;
        barriers.push({...barrier,id:barrier.id+':'+section.view.index,
          ...buildingPoint(building,{x:left?0:plan.width,y:(a+b)/2}),
          width:odd?b-a:barrier.width,depth:odd?barrier.depth:b-a});
      }
      const box={...original,...center,id,width:odd?z1-z0:x1-x0,depth:odd?x1-x0:z1-z0,
        catalogueSection:section.view.index,heatBarriers:barriers};
      if(!fragments.has(section.view.index))fragments.set(section.view.index,[]);
      fragments.get(section.view.index).push(box);
    }
  }
  let activeBoxes=colliders;
  function replaceCollision(){
    // Keep the published coarse boxes while intact. Fragment only a house that
    // has actually lost a section, and keep the field's obstacle array alive.
    for(const box of activeBoxes){
      const index=obstacles.indexOf(box);
      if(index>=0)obstacles.splice(index,1);
    }
    activeBoxes=sections.flatMap(({view})=>view.present?fragments.get(view.index)??[]:[]);
    obstacles.push(...activeBoxes);
    building.colliderIds=activeBoxes.map(box=>box.id);
  }
  function step(time,event){
    if(building.destroyed)return;
    let surface=0,changed=false;
    for(const {cells:owned,view} of sections){
      if(!view.present)continue;
      let remaining=0,weight=0,x=0,z=0,peak=0,first=Infinity;
      for(const {cell,x:cx,y:cz} of owned){
        surface+=cell.surfaceFuel;
        remaining+=cell.surfaceFuel+cell.depositedFuel;
        if(cell.phase!=='burning')continue;
        const intensity=cell.intensity;
        weight+=intensity;x+=cx*intensity;z+=cz*intensity;peak=Math.max(peak,intensity);
        first=Math.min(first,cell.ignitedAt);
      }
      if(weight>0){
        view.firstIgnition??=first;
        view.fire={x:x/weight,z:z/weight,flame:peak,ignitionTime:first};
      }else view.fire=null;
      if(view.firstIgnition!==null&&remaining<=EPS){
        view.present=false;changed=true;
        event('building-section-burnout',building,{buildingId:building.id,section:view.index,worldTime:time});
      }
    }
    building.burnedFraction=initialSurfaceFuel-surface>EPS?Math.min(1,1-surface/initialSurfaceFuel):0;
    if(changed){
      replaceCollision();
      if(sections.every(section=>!section.view.present)){
        building.destroyed=true;
        event('building-burnout',building,{buildingId:building.id,worldTime:time});
      }
    }
  }
  return {step};
}
