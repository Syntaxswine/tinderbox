// Calls the unchanged pinned Nautilus generator; large-building offsets are local.
import {WALL_KIT,wallPanels,wallRunErrors,measureWallRun} from '../../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
export const ENGINE_PIN='90054d07134116a5d9661f8318a76fe68f922aad';
export const PROFILE=Object.freeze({worldUnitsPerMetre:1,tile:WALL_KIT.panel,wallHeight:WALL_KIT.height,wallThickness:WALL_KIT.thickness,slab:Math.round((WALL_KIT.floorSpacing-WALL_KIT.height)*1e6)/1e6,floorSpacing:WALL_KIT.floorSpacing,doorWidth:1,doorHeight:1.65,doorThickness:.12});
export const levelY=n=>Math.round(n*PROFILE.floorSpacing*1e6)/1e6;
export function compileNautilusStructure(runs){
 const tiers=new Map(),panels=[];
 for(const run of runs){const len=measureWallRun(run).length;if(Math.abs(len-Math.round(len/2)*2)>1e-6||len>64)throw Error('Use even-metre native wall runs up to64 m: '+run.id);
  for(let bottom=run.startLevel;bottom<run.endLevel;){const band=Math.floor(bottom/WALL_KIT.maxStories),levelOffset=band*WALL_KIT.maxStories,stories=Math.min(run.endLevel-bottom,(band+1)*WALL_KIT.maxStories-bottom),native={id:run.id+'-tier-'+band,a:[run.a[0]+160,run.a[1]+16],b:[run.b[0]+160,run.b[1]+16],z:bottom-levelOffset,stories,material:'concrete'};
   if(!tiers.has(band))tiers.set(band,{id:'horticulture-tier-'+band,levelOffset,translation:[-160,levelY(levelOffset),-16],map:{width:384,levels:6,wallRuns:{version:1,segments:[]}}});
   tiers.get(band).map.wallRuns.segments.push(native);for(const p of wallPanels(native))panels.push({...p,runId:run.id,level:p.z+levelOffset,tier:band,center:[p.center[0]-160,p.center[1]+levelY(levelOffset),p.center[2]-16]});bottom+=stories;
  }
 }
 for(const t of tiers.values()){const errors=wallRunErrors(t.map);if(errors.length)throw Error(errors.join(' '));}
 return {enginePin:ENGINE_PIN,compiler:'Nautilus wallPanels / wallRunErrors',tiers:[...tiers.values()],panels,materialToken:'The concrete token validates source geometry only. Historical structure, collision and simulation materials remain unassigned.',integration:'A large native geometry assembly; validated wall fragments do not register a new whole-building editor provider.'};
}
