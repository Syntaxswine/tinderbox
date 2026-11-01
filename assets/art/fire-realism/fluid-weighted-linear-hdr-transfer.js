/** Linear-working source transport for the exact common HDR contract.
 * Only the frozen local palette OETF is removed. Final curve/OETF belongs to
 * the common whole-scene presenter; associated emission/blend stay unchanged.
 */
import {makeFluidShaders} from './fluid-contact-weighted-source-diagnostic-01/shaders.js';
import {emissionAbsorptionFragment} from './fluid-contact-weighted-source-diagnostic-01/emission-transfer.js';
import {normalizedEmissionFragment} from './fluid-contact-weighted-source-diagnostic-01/normalization-transfer.js';
export const PRESENTATION_CONTRACT='common-linear-hdr-neutral-v1';
const BEFORE='vec3 eaDisplaySource(vec3 c){return sRGBTransferOETF(vec4(c,1.)).rgb;}',AFTER='vec3 eaDisplaySource(vec3 c){return c;}';
export function requireLinearHdrPresentation(options){
 if(!options||typeof options!=='object'||!Object.hasOwn(options,'presentationContract')||options.presentationContract!==PRESENTATION_CONTRACT)throw Error('Exact common-linear-hdr-neutral-v1 presentation is required; no direct-display fallback');
 return PRESENTATION_CONTRACT;
}
export function linearHdrEmissionFragment(fragment,maxPlanes){
 const expected=normalizedEmissionFragment(emissionAbsorptionFragment(makeFluidShaders(maxPlanes).fragmentShader,'smoke-only'),maxPlanes);
 if(typeof fragment!=='string'||fragment!==expected||fragment.split(BEFORE).length!==2||fragment.includes(AFTER))throw Error('Complete frozen5ad fixed6F smoke-only fragment required');
 const result=fragment.replace(BEFORE,AFTER);
 if(result.split(AFTER).length!==2||result.replace(AFTER,BEFORE)!==expected)throw Error('Linear-source optical inverse failed');
 return result;
}
