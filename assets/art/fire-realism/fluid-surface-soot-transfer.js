/** One architect-approved optical hypothesis; not a physical calibration. */
export const CONTROL_SOOT_TRANSFER='mix(1.,.18,clamp(value.z*heat,0.,1.))';
export const TRIAL_SOOT_TRANSFER='mix(1.,.18,smoothstep(.05,.35,clamp(value.z,0.,1.)))';
export function replaceSootTransfer(fragment){
  if(typeof fragment!=='string'||fragment.split(CONTROL_SOOT_TRANSFER).length!==2)throw Error('Soot trial requires exactly one frozen control expression per material');
  return fragment.replace(CONTROL_SOOT_TRANSFER,TRIAL_SOOT_TRANSFER);
}
