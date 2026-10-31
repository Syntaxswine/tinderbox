/** Explicit architect-approved physical rendering clip, not a scalar edit.
 * Positive centres are preserved. Reconstruction can be nonzero below floor;
 * that contribution is deliberately excluded from both mesh and ray support.
 */
export function floorPrism(prism){
  if(!Number.isFinite(prism?.lower)||!Number.isFinite(prism?.upper)||prism.upper<=prism.lower)throw Error('Invalid source slab');
  if(prism.upper<=0)return null;
  return prism.lower<0?{...prism,lower:0}:prism;
}
