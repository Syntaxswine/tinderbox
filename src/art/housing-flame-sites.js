import {housePlanEdges,pointInRoom} from './gross-housing.js';
import {buildingPoint} from '../content/buildings.js';
import {housingSectionAt,housingSectionBounds,housingSectionGrid} from '../content/housing-sections.js';

export function housingFlameSites(house,building){
  const floor=house.floors[0],grid=housingSectionGrid(building.prefabId);
  const perimeter=[];
  for(const edge of housePlanEdges(house,floor,{partyWalls:false})){
    if(edge.rooms.length!==1)continue;
    const [ax,az]=edge.a,[bx,bz]=edge.b,length=Math.hypot(bx-ax,bz-az);
    let nx=(bz-az)/length,nz=-(bx-ax)/length;
    const mx=(ax+bx)/2,mz=(az+bz)/2;
    if(pointInRoom([mx+nx*.10,mz+nz*.10],floor.rooms.find(room=>room.id===edge.rooms[0]).polygon)){
      nx=-nx;nz=-nz;
    }
    const party=Math.abs(nx)>.99&&(mx===0?building.partyWalls?.left:mx===house.width?building.partyWalls?.right:null);
    const count=Math.ceil(length-1e-8);
    for(let i=0;i<count;i++){
      const t=(i+.5)/count,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      const section=housingSectionAt(grid,x-nx*.12,z-nz*.12);
      perimeter.push({id:edge.id+'/'+i,section,x,z,nx,nz,party,siding:edge.opening!=='door'});
    }
  }
  const bounds=Array.from({length:grid.cols*grid.rows},(_,index)=>housingSectionBounds(grid,index));
  function worldSite(site,building){
    const p=buildingPoint(building,{x:site.x+site.nx*.115,y:site.z+site.nz*.115});
    const normal=buildingPoint({x:0,y:0,quarterTurns:building.quarterTurns},{x:site.nx,y:site.nz});
    return {id:building.id+'/'+site.id,x:p.x,y:house.plinth+.42,z:p.y,nx:normal.x,ny:0,nz:normal.y};
  }
  function flameAt(site,fire,building){
    return {...worldSite(site,building),part:'walls',flame:fire.flame,smoke:fire.flame*.43,ignitionTime:fire.ignitionTime};
  }
  function flamesFor(building,liveNeighbors){
    const flames=[];
    for(const site of perimeter){
      if(site.party&&liveNeighbors.has(site.party))continue;
      const section=building.sections[site.section],fire=section.fire;
      if(section.present&&fire&&Math.hypot(fire.x-site.x,fire.z-site.z)<1.35)flames.push(flameAt(site,fire,building));
    }
    for(const {index,present,fire} of building.sections){
      if(!present||!fire)continue;
      const {minX,maxX,minZ,maxZ}=bounds[index];
      const {x,z}=fire;
      for(const [edge,neighbor,cx,cz,nx,nz] of [
        ['west',index-1,minX,z,-1,0],['east',index+1,maxX,z,1,0],
        ['front',index-grid.cols,x,minZ,0,-1],['rear',index+grid.cols,x,maxZ,0,1]
      ]){
        if(!Number.isFinite(cx+cz)||building.sections[neighbor]?.present!==false||Math.hypot(cx-x,cz-z)>1.05)continue;
        flames.push(flameAt({id:'opened-'+index+'/'+edge,x:cx,z:cz,nx,nz},fire,building));
      }
    }
    return flames;
  }
  flamesFor.appendPreheat=(building,liveNeighbors,out)=>{
    for(const {index,present,preheat,fire} of building.sections){
      if(!present||fire||!preheat||![preheat.x,preheat.z,preheat.heatFraction].every(Number.isFinite)||preheat.heatFraction<=0)continue;
      let nearest,best=1.35**2;
      for(const site of perimeter){
        if(site.section!==index||!site.siding||site.party&&liveNeighbors.has(site.party))continue;
        const distance=(site.x-preheat.x)**2+(site.z-preheat.z)**2;
        if(distance<best){nearest=site;best=distance;}
      }
      if(nearest)out.push({...worldSite(nearest,building),heatFraction:preheat.heatFraction});
    }
  };
  return flamesFor;
}
