import {buildingPoint} from '../content/buildings.js';
import {HOUSING_PLANS} from '../content/housing-plans.js';
import {housingSectionBounds,housingSectionGrid,RUBBLE_BURN_SECONDS} from '../content/housing-sections.js';
import {lineClear} from './geometry.js';

const RANGE=3, NEAR_SQUARED=.65**2, RATE_PER_METRE=1.5;
const coverOptions={ignoreBarrels:false,allowWoodEndpoints:false};
const sameBoxes=(a,b)=>a.length===b.length&&a.every((box,i)=>box===b[i]);

function near(box,point){
  return Math.abs(box.x-point.x)<=RANGE+box.width/2&&Math.abs(box.y-point.y)<=RANGE+box.depth/2;
}

export function createRubbleHeat(field){
  const lots=new Map(),active=[];
  const heat=new Float64Array(field.cells.length),largest=new Float64Array(field.cells.length);
  const donors=new Array(field.cells.length);
  let cover=[];
  function retire(building,metres,index,retiredAt,retainedHeat){
    let lot=lots.get(building.id);
    if(!lot){
      lot={buildingId:building.id,metres,sections:[]};
      lots.set(building.id,lot);
    }
    const section={index,retiredAt,retainedHeat};
    lot.sections.push(section);
    if(retainedHeat<=0)return;
    const plan=HOUSING_PLANS[building.prefabId];
    const bounds=housingSectionBounds(housingSectionGrid(building.prefabId,metres),index);
    const minX=Math.max(0,bounds.minX),maxX=Math.min(plan.width,bounds.maxX);
    const minZ=Math.max(0,bounds.minZ),maxZ=Math.min(plan.depth,bounds.maxZ);
    const point=buildingPoint(building,{x:(minX+maxX)/2,y:(minZ+maxZ)/2});
    const span=Math.sqrt((maxX-minX)*(maxZ-minZ));
    const gain=RATE_PER_METRE*span*retainedHeat;
    const links=[];
    for(const cell of field.candidates(point,RANGE)){
      const distanceSquared=(cell.x-point.x)**2+(cell.y-point.y)**2;
      if(distanceSquared>RANGE**2)continue;
      const col=Math.floor(cell.x/field.size),row=Math.floor(cell.y/field.size);
      links.push({cell,index:row*field.cols+col,rate:gain/Math.max(NEAR_SQUARED,distanceSquared)});
    }
    active.push({id:building.id+'/section:'+index,retiredAt,point,links});
  }
  function transfer(dt,time){
    if(!active.length)return null;
    for(let i=active.length-1;i>=0;i--)if(time-active[i].retiredAt>=RUBBLE_BURN_SECONDS)active.splice(i,1);
    if(!active.length){cover=[];return null;}
    // Shapes are immutable. Opening doors and fragmented houses replace
    // boxes; Ashland and exhausted props update their live flags in place.
    const live=field.obstacles.filter(box=>!box.destroyed&&box.blocksHeat!==false);
    const coverChanged=!sameBoxes(cover,live);
    if(coverChanged)cover=live;
    heat.fill(0);
    for(const source of active){
      if(coverChanged||!source.visible){
        const nearby=cover.filter(box=>near(box,source.point)||box.heatBarriers?.some(part=>near(part,source.point)));
        if(!source.visible||!sameBoxes(source.cover,nearby)){
          source.cover=nearby;
          source.visible=source.links.filter(({cell})=>lineClear(source.point,cell,nearby,coverOptions));
        }
      }
      const remaining=1-(time-source.retiredAt)/RUBBLE_BURN_SECONDS;
      const scale=remaining**1.35*dt;
      for(const {index,rate} of source.visible){
        const amount=rate*scale;
        if(heat[index]===0||amount>largest[index]){
          largest[index]=amount;
          donors[index]=source.id;
        }
        heat[index]+=amount;
      }
    }
    return {heat,donors};
  }
  return {retire,transfer,snapshot:()=>[...lots.values()].map(lot=>({...lot,sections:lot.sections.map(section=>({...section}))}))};
}
