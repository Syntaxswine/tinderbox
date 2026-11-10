import {HOUSING_PLANS} from './housing-plans.js';

export const HOUSING_SECTION_METRES=2, RUBBLE_BURN_SECONDS=24;
export function housingSectionGrid(prefabId,metres=HOUSING_SECTION_METRES){
  const {width,depth}=HOUSING_PLANS[prefabId];
  return {cols:Math.ceil(width/metres),rows:Math.ceil(depth/metres),metres};
}
export function housingSectionAt({cols,rows,metres=HOUSING_SECTION_METRES},x,z){
  const column=Math.max(0,Math.min(cols-1,Math.floor(x/metres)));
  const row=Math.max(0,Math.min(rows-1,Math.floor(z/metres)));
  return row*cols+column;
}
export function housingSectionBounds({cols,rows,metres=HOUSING_SECTION_METRES},index){
  const column=index%cols,row=Math.floor(index/cols);
  return {minX:column===0?-Infinity:column*metres,
    maxX:column===cols-1?Infinity:(column+1)*metres,
    minZ:row===0?-Infinity:row*metres,
    maxZ:row===rows-1?Infinity:(row+1)*metres};
}
