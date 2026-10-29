import {DRUGS} from './config.js';
import {freePoint,lineClear,distance,clamp} from './geometry.js';
export const PICKUP_DEFAULTS=Object.freeze({radius:.22,maxCount:64});
export function preparePickups(records=[],world,obstacles){
  if(!Array.isArray(records)||records.length>PICKUP_DEFAULTS.maxCount)throw Error('Pickups must be a bounded array');
  return records.map(record=>{
    const pickup={id:record?.id,kind:record?.kind,x:record?.x,y:record?.y,radius:record?.radius??PICKUP_DEFAULTS.radius};
    if(typeof pickup.id!=='string'||! /^[a-z0-9][a-z0-9._:-]{0,95}$/.test(pickup.id)||!DRUGS.includes(pickup.kind)||![pickup.x,pickup.y,pickup.radius].every(Number.isFinite)||pickup.radius<.1||pickup.radius>.5||!freePoint(pickup,pickup.radius,world,obstacles))throw Error('Invalid or obstructed pickup: '+pickup.id);
    return pickup;
  });
}
// Earliest contact along collision-accepted segments. Requested endpoints never
// participate. Line-of-reach prevents collection across an intervening wall.
export function pickupContacts(pickups,path,bodyRadius,obstacles){
  const contacts=[];
  for(const pickup of pickups){
    if(pickup.consumed)continue;
    let travelled=0;
    for(let i=0;i<Math.max(1,path.length-1);i++){
      const a=path[i],b=path[i+1]||a,dx=b.x-a.x,dy=b.y-a.y,length=distance(a,b),radius=bodyRadius+pickup.radius,ox=a.x-pickup.x,oy=a.y-pickup.y;
      let t=0;
      if(ox*ox+oy*oy>radius*radius+1e-10){
        if(!length)continue;
        const projection=ox*dx+oy*dy,discriminant=projection*projection-length*length*(ox*ox+oy*oy-radius*radius);
        if(discriminant<0){travelled+=length;continue;}t=(-projection-Math.sqrt(discriminant))/(length*length);
        if(t<0||t>1){travelled+=length;continue;}
      }
      const point={x:a.x+dx*clamp(t,0,1),y:a.y+dy*clamp(t,0,1)};
      if(lineClear(point,pickup,obstacles)){contacts.push({pickup,point,distance:travelled+t*length});break;}
      travelled+=length;
    }
  }
  return contacts.sort((a,b)=>a.distance-b.distance||(a.pickup.id<b.pickup.id?-1:a.pickup.id>b.pickup.id?1:0));
}
