import {buildingPoint,localHousingFootprints} from '../content/buildings.js';
import {housingSectionAt,housingSectionBounds,housingSectionGrid} from '../content/housing-sections.js';
import {HOUSING_PLANS} from '../content/housing-plans.js';
import {ASSET_SCALE} from '../content/asset-scale.js';
import {STRUCTURE_DECAY_SECONDS} from './config.js';
import {createHousingTopology} from './housing-topology.js';
import {exchangeSurfaceGround, heatBlastSiding, heatSurfaceSite, stepSurfaceFire, surfaceDuration, surfaceFlame, surfaceSample, retainedStructureHeat, structureSmolder} from './surface-fire.js';

const EPS=1e-9;
function toPlan(building,point){
  return buildingPoint({x:0,y:0,quarterTurns:(4-building.quarterTurns)%4},
    {x:point.x-building.x,y:point.y-building.y});
}

// The old coarse movement footprint is a barrier, not a second wood source.
export function prepareHousingFootprints(definition, excluded){
  const ids=new Set(definition.buildings.filter(b=>!excluded.includes(b.id)).map(b=>b.id));
  for(const obstacle of definition.obstacles)if(ids.has(obstacle.buildingId))obstacle.material='masonry';
  for(const building of definition.buildings)if(ids.has(building.id)){
    building.footprints=definition.obstacles.filter(o=>o.buildingId===building.id);
  }
}

export function createHousingFire(group,obstacles,config,wind,retireGround){
  const {building,colliders}=group;
  const grid=housingSectionGrid(building.prefabId);
  const localBoxes=localHousingFootprints(building.prefabId,building.partyWalls);
  const plan=HOUSING_PLANS[building.prefabId],odd=building.quarterTurns%2;
  const {sites,panels,porch,roofSeams}=createHousingTopology(building,plan,localBoxes,config,wind);
  const sections=Array.from({length:grid.cols*grid.rows},(_,index)=>({
    sites:[],bounds:housingSectionBounds(grid,index),view:{index,present:true,firstIgnition:null,retiredAt:null,fire:null,preheat:null}
  }));
  building.sections=sections.map(section=>section.view);
  for(const site of sites)sections[site.section].sites.push(site);
  const present=site=>sections[site.section].view.present;
  const initialArea=sites.reduce((sum,site)=>sum+site.area,0);
  const lowPanels=panels.filter(panel=>panel.level===0);
  for(const panel of lowPanels)panel.section=housingSectionAt(grid,panel.x,panel.z);
  const groundSites=lowPanels.flatMap(panel=>panel.low?[panel.low]:[]);
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
  function step(dt,time,event){
    if(building.destroyed)return;
    stepSurfaceFire(sites,dt,time,present,site=>{
      const section=sections[site.section];
      section.view.firstIgnition??=site.ignitedAt;
      if(site.exposed&&(site.layer==='walls'||site.layer==='roof')&&site.y>(section.vent?.y??-Infinity))section.vent=site;
      event('structure-ignition',{x:site.world.x,y:site.world.z},{buildingId:building.id,siteId:site.publicId,
        part:site.layer==='floor'?'ground':site.layer,height:site.y,worldTime:time,cause:site.ignitionKind,
        parentSiteId:site.ignitionKind==='surface-spread'?`${building.id}/${site.parentId}`:site.parentId,heat:site.heat},site,
        {required:site.fuel.threshold+site.fuel.cooling*dt,incoming:0,independent:site.parentId===null});
    });
    let remainingArea=0,changed=false;
    for(const {sites:owned,view} of sections){
      if(!view.present)continue;
      if(view.firstIgnition!==null&&time+EPS>=view.firstIgnition+STRUCTURE_DECAY_SECONDS){
        view.present=false;view.retiredAt=time;view.fire=view.preheat=null;changed=true;
        retireGround?.(building,grid.metres,view.index,time,retainedStructureHeat(view.firstIgnition,time));
        event('building-section-burnout',building,{buildingId:building.id,section:view.index,worldTime:time,
          ignitionTime:view.firstIgnition,cause:'decay'});
        continue;
      }
      let weight=0,x=0,z=0,peak=0,first=Infinity;
      let hottest=null;
      for(const site of owned){
        if(site.phase==='spent')continue;
        if(site.phase==='cold'){
          remainingArea+=site.area;
          if(site.layer==='walls'&&site.fuel.threshold>0&&site.heat>(hottest?.heat??0))hottest=site;
          continue;
        }
        remainingArea+=site.area*Math.max(0,1-(time-site.ignitedAt)/surfaceDuration(site));
        const intensity=surfaceFlame(site,time);
        weight+=intensity;x+=site.x*intensity;z+=site.z*intensity;peak=Math.max(peak,intensity);
        first=Math.min(first,site.ignitedAt);
      }
      view.fire=weight>0?{x:x/weight,z:z/weight,flame:peak,ignitionTime:first}:null;
      view.preheat=hottest&&!view.fire?{x:hottest.x,z:hottest.z,heatFraction:Math.min(1,hottest.heat/hottest.fuel.threshold)}:null;
    }
    building.burnedFraction=initialArea-remainingArea>EPS?Math.min(1,1-remainingArea/initialArea):0;
    if(changed){
      replaceCollision();
      if(sections.every(section=>!section.view.present)){
        building.destroyed=true;
        event('building-burnout',building,{buildingId:building.id,worldTime:time});
      }
    }
  }

  function strike(box,from,to,amount,kind,{touched,onHeat}={}){
    if(building.destroyed)return null;
    function strikeAt(contact){
      const site=contact?.site;
      if(!site||!present(site)||touched?.has(site))return null;
      const before=site.heat;
      if(!heatSurfaceSite(site,amount,{kind}))return {t:contact.t,result:'no-fuel'};
      onHeat?.(site,before);
      touched?.add(site);
      return contact;
    }
    if(box.role!=='foundation'){
      return strikeAt({site:porch.get(box.role)});
    }
    const a=toPlan(building,from),b=toPlan(building,to);
    let first;
    for(const panel of lowPanels){
      const {nx,nz,low}=panel,offset=ASSET_SCALE.wallThickness/2;
      if(!sections[low?.section??panel.section].view.present)continue;
      const x=panel.x+nx*offset,z=panel.z+nz*offset;
      const start=(a.x-x)*nx+(a.y-z)*nz,end=(b.x-x)*nx+(b.y-z)*nz;
      if(start<=EPS||end>EPS)continue;
      const t=start/(start-end);
      if(first&&t>=first.t)continue;
      const along=(a.x+(b.x-a.x)*t-x)*-nz+(a.y+(b.y-a.y)*t-z)*nx;
      if(Math.abs(along)>panel.length/2+EPS)continue;
      let site=low;
      if(to.h!==undefined){
        const height=from.h+(to.h-from.h)*t-panel.y;
        if(height<0||height>ASSET_SCALE.wallHeight)site=null;
        else if(height>ASSET_SCALE.wallHeight/2)site=panel.high;
      }
      first={site,t};
    }
    return strikeAt(first);
  }
  function heatBlast(origin,blast,cause){
    if(building.destroyed)return;
    for(const {low, length} of lowPanels)if(low&&present(low)){
      heatBlastSiding(low,low.world,plan.style.wall==='brick'?0:length,origin,blast,obstacles,cause);
    }
  }
  function exchangeGround(field,dt,time){
    if(!building.destroyed)for(const site of groundSites)if(present(site)){
      exchangeSurfaceGround(site,site.world,field,obstacles,dt,time,'structure-siding');
    }
  }
  function samples(time){
    if(building.destroyed)return [];
    const current=sites.filter(site=>present(site)&&(site.phase==='burning'||site.phase==='cold'&&site.heat>0)).map(site=>{
      const exposed=site.exposed||!sections[site.section].sites.some(other=>
        other.layer!=='walls'&&other.y>site.y);
      return surfaceSample(building,site,time,exposed);
    });
    for(const {view,vent} of sections)if(view.present&&!view.fire&&vent){
      current.push(structureSmolder(building,vent,time,view.firstIgnition));
    }
    return current;
  }
  return {step,strike,heatBlast,exchangeGround,samples,roof:{building,seams:roofSeams,present}};
}
