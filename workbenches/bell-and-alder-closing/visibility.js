import {boxInterval} from '../../src/simulation/geometry.js';
export function createVisibility(trial){
  const {scene}=trial,material=b=>typeof b.material==='string'?b.material:b.material?.physical||b.material?.id||'';
  function blocked(from,to,{sight=false,ignoreSources=[]}={}){
    const a=[from.x,from.h,from.y],z=[to.x,to.h,to.y],ignore=new Set(ignoreSources);
    for(const hit of scene.index.crossings(a,z)){const b=hit.surface;if(!b.intact||scene.index.pass(b)>=.99||ignore.has(b.sourceSurfaceId)||ignore.has(b.id))continue;
      if(sight&&/glass|air/.test(material(b))){const o=b.openingId&&(scene.data.openings||[]).find(o=>o.id===b.openingId),apron=o?.sightApronHeight;if(!Number.isFinite(apron)||a[1]+(z[1]-a[1])*hit.t> (o.floorY||0)+apron)continue;}
      return true;
    }
    for(const part of scene.parts.values()){const item=scene.items.get(part.itemId);if(!part.intact||!item?.intact||part.solid===false||ignore.has(part.id)||ignore.has(part.itemId))continue;if(sight&&/glass/.test(typeof part.material==='string'?part.material:part.material?.id||''))continue;
      const offset=item.position.map((p,i)=>p-item.initialPosition[i]),lo=part.bounds.min.map((p,i)=>p+offset[i]),hi=part.bounds.max.map((p,i)=>p+offset[i]),box={x:(lo[0]+hi[0])/2,y:(lo[2]+hi[2])/2,width:hi[0]-lo[0],depth:hi[2]-lo[2]},span=boxInterval(from,to,box);if(!span||span[1]<=1e-7||span[0]>=1-1e-7)continue;const y0=from.h+(to.h-from.h)*span[0],y1=from.h+(to.h-from.h)*span[1];if(Math.min(y0,y1)<hi[1]&&Math.max(y0,y1)>lo[1])return true;
    }
    return false;
  }
  return {blocked,visible:(from,to,options)=>!blocked(from,to,{sight:true,...options})};
}
