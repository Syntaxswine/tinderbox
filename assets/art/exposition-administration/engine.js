// This adapter calls the preserved Nautilus implementation, not a local remake.
import {WALL_KIT,wallPanels,wallRunErrors,measureWallRun} from '../../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
export {WALL_KIT};
export const ENGINE_PIN='90054d07134116a5d9661f8318a76fe68f922aad';
export const PROFILE=Object.freeze({worldUnitsPerMetre:1,tile:WALL_KIT.panel,wallHeight:WALL_KIT.height,wallThickness:WALL_KIT.thickness,
 slab:Math.round((WALL_KIT.floorSpacing-WALL_KIT.height)*1e6)/1e6,floorSpacing:WALL_KIT.floorSpacing,doorWidth:1,doorHeight:1.65,doorThickness:.12});
export const levelY=n=>Math.round(n*WALL_KIT.floorSpacing*1e6)/1e6;
export function compileNautilusStructure(runs){
 const bands=new Map(),panels=[];
 for(const run of runs){
  const measured=measureWallRun({a:run.a,b:run.b});
  if(Math.abs(measured.length-Math.round(measured.length/2)*2)>1e-6)throw Error('Structural wall runs require even-metre lengths: '+run.id);
  if(measured.length>64)throw Error('Split native wall runs at 64 metres: '+run.id);
  for(let bottom=run.startLevel;bottom<run.endLevel;){
   const band=Math.floor(bottom/WALL_KIT.maxStories),base=band*WALL_KIT.maxStories,count=Math.min(run.endLevel-bottom,(band+1)*WALL_KIT.maxStories-bottom);
   const native={id:run.id+'-tier-'+band,a:[run.a[0]+64,run.a[1]+16],b:[run.b[0]+64,run.b[1]+16],z:bottom-base,stories:count,material:'wood'};
   if(!bands.has(band))bands.set(band,{id:'administration-tier-'+band,levelOffset:base,translation:[-64,levelY(base),-16],map:{width:240,levels:6,wallRuns:{version:1,segments:[]}}});
   bands.get(band).map.wallRuns.segments.push(native);
   for(const p of wallPanels(native))panels.push({...p,runId:run.id,tier:band,level:p.z+base,center:[p.center[0]-64,p.center[1]+levelY(base),p.center[2]-16]});
   bottom+=count;
  }
 }
 for(const band of bands.values()){const errors=wallRunErrors(band.map);if(errors.length)throw Error(errors.join(' '));}
 return {enginePin:ENGINE_PIN,compiler:'Nautilus wallPanels / wallRunErrors',bands:[...bands.values()],panels,
  materialToken:'wood is the required authoring token for these geometry fragments; it is not a game combustion assignment. Runtime physical material remains unassigned.',
  integration:'Whole-building art assembly. These are validated local six-layer wall fragments with standard-level offsets, not one legacy editor map. Catalogue registration and consumer gameplay adapters remain separate.'};
}
