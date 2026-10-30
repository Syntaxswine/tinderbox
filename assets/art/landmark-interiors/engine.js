import {WALL_KIT, wallPanels, wallRunErrors, measureWallRun} from '../../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
export const ENGINE_PIN='90054d07134116a5d9661f8318a76fe68f922aad';
export const NATIVE=Object.freeze({tile:1,wallHeight:2,wallThickness:.16,slab:.12,floorPitch:2.12,doorWidth:1,doorHeight:1.65,doorThickness:.12});
export const levelY=n=>Math.round(n*WALL_KIT.floorSpacing*1e6)/1e6;
export function compilePartitions(runs){
 const tiers=new Map(),panels=[];
 for(const r of runs){const len=measureWallRun(r).length;
  if(Math.abs(len-Math.round(len/2)*2)>1e-6||len<2||len>64)throw Error('Use even-metre native wall runs up to 64 m: '+r.id);
  for(let bottom=r.startLevel;bottom<r.endLevel;){const tier=Math.floor(bottom/5),offset=tier*5,stories=Math.min(r.endLevel-bottom,5-(bottom-offset));
   const native={id:r.id+'-tier-'+tier,a:[r.a[0]+512,r.a[1]+512],b:[r.b[0]+512,r.b[1]+512],z:bottom-offset,stories,material:'wood'};
   if(!tiers.has(tier))tiers.set(tier,{id:'interior-tier-'+tier,levelOffset:offset,translation:[-512,levelY(offset),-512],map:{width:1024,levels:6,wallRuns:{version:1,segments:[]}}});
   tiers.get(tier).map.wallRuns.segments.push(native);
   for(const p of wallPanels(native))panels.push({...p,runId:r.id,level:p.z+offset,center:[p.center[0]-512,p.center[1]+levelY(offset),p.center[2]-512]});
   bottom+=stories;
  }
 }
 for(const tier of tiers.values()){const e=wallRunErrors(tier.map);if(e.length)throw Error(e.join(' '));}
 return{enginePin:ENGINE_PIN,compiler:'Unchanged Nautilus wallPanels / wallRunErrors / measureWallRun',tiers:[...tiers.values()],panels,physicalMaterial:'unassigned; wood is only the geometry-validation token'};
}
