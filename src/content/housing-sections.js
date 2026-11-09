import {HOUSING_PLANS} from './housing-plans.js';

export const HOUSING_SECTION_METRES=2;
export function housingSectionGrid(prefabId){
  const {width,depth}=HOUSING_PLANS[prefabId];
  return {cols:Math.ceil(width/HOUSING_SECTION_METRES),rows:Math.ceil(depth/HOUSING_SECTION_METRES)};
}
export function housingSectionAt({cols,rows},x,z){
  const column=Math.max(0,Math.min(cols-1,Math.floor(x/HOUSING_SECTION_METRES)));
  const row=Math.max(0,Math.min(rows-1,Math.floor(z/HOUSING_SECTION_METRES)));
  return row*cols+column;
}
export function housingSectionBounds({cols,rows},index){
  const column=index%cols,row=Math.floor(index/cols);
  return {minX:column===0?-Infinity:column*HOUSING_SECTION_METRES,
    maxX:column===cols-1?Infinity:(column+1)*HOUSING_SECTION_METRES,
    minZ:row===0?-Infinity:row*HOUSING_SECTION_METRES,
    maxZ:row===rows-1?Infinity:(row+1)*HOUSING_SECTION_METRES};
}
