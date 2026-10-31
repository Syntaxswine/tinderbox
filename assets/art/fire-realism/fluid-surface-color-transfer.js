/** One color-only optical hypothesis; exponent4 is not a physical constant. */
export const CONTROL_COLOR_LOOKUP='smoothstep(.20,.82,heat)';
export const TRIAL_COLOR_LOOKUP='pow(heat,4.)';
export function replaceColorLookup(fragment){
  if(typeof fragment!=='string'||fragment.split(CONTROL_COLOR_LOOKUP).length!==2)throw Error('Color trial requires exactly one frozen first-warm lookup per material');
  return fragment.replace(CONTROL_COLOR_LOOKUP,TRIAL_COLOR_LOOKUP);
}
