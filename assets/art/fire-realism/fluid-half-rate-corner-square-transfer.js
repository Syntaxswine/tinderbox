/** One private source-pinned shader adapter, not a field/channel mutation.
 * The fourth LOCAL sample component is E[F_corner^2], never stored alpha/nativeA.
 * RGB operations and all raw-F smoke/palette/extinction inputs remain frozen.
 */
import {makeFluidShaders} from './fluid-contact-half-rate-diagnostic-02/shaders.js';
import {emissionAbsorptionFragment} from './fluid-contact-half-rate-diagnostic-02/emission-transfer.js';
import {normalizedEmissionFragment} from './fluid-contact-half-rate-diagnostic-02/normalization-transfer.js';
export const FROZEN_R31_FRAGMENT=Object.freeze({maxPlanes:28,bytes:5929,sha256:'e676feb9c86ef4e7dd3f43a24d7f4fc271c2882ad46e5f6f8ba64e23c59fbc02'});
const need=(v,m)=>{if(!v)throw Error(m);};
const once=(s,a,b)=>{need(s.split(a).length===2,'Expected exactly one private adapter term');return s.replace(a,b);};
function frozen(maxPlanes){
 need(maxPlanes===FROZEN_R31_FRAGMENT.maxPlanes,'Only the measured28-plane R31 shader is supported');
 // The complete unchanged normalized R31 generator/guard runs before any edit.
 const out=normalizedEmissionFragment(emissionAbsorptionFragment(makeFluidShaders(maxPlanes).fragmentShader,'smoke-only'),maxPlanes);
 need(out.length===FROZEN_R31_FRAGMENT.bytes,'Frozen R31 fragment extent changed');return out;
}
function edits(base){
 const start=base.indexOf('    vec3 tri(sampler3D data,vec3 p){'),end=base.indexOf('\n    float nativeA',start);
 need(start>=0&&end>start,'Frozen interpolation block required');
 const tri=base.slice(start,end);need(tri.split('.rgb').length===9,'Exact eight original spatial samples required');
 const localTri=once(tri,'vec3 tri(sampler3D data,vec3 p)','vec4 tri(sampler3D data,vec3 p)').replaceAll('.rgb','');
 return [
  ['return texelFetch(data,cell,0);','vec3 fetchedRgb=texelFetch(data,cell,0).rgb;return vec4(fetchedRgb,fetchedRgb.z*fetchedRgb.z);'],
  [tri,localTri],
  ['vec3 value=max(vec3(0.),mix(tri(field0,p),tri(field1,p),temporalMix));','vec4 sampledMoment=max(vec4(0.),mix(tri(field0,p),tri(field1,p),temporalMix));\n        vec3 value=sampledMoment.rgb;'],
  ['float reacting=value.z*reactionGain*sourceA;','float reacting=value.z*reactionGain*sourceA;\n        float emittedReaction=sampledMoment.w*reactionGain*sourceA;'],
  ['reacting*=mix(baseAllowed,1.,contactRelease);','reacting*=mix(baseAllowed,1.,contactRelease);\n        emittedReaction*=mix(baseAllowed,1.,contactRelease);'],
  ['eaEmission(reacting,smokeSigma,warm,soot)','eaEmission(emittedReaction,smokeSigma,warm,soot)']
 ];
}
export function cornerSquareEmissionFragment(fragment,maxPlanes){
 const base=frozen(maxPlanes);need(fragment===base,'Private adapter requires the exact complete normalized R31 fragment');
 let out=fragment;for(const [before,after]of edits(base))out=once(out,before,after);return out;
}
export function recoverCornerSquareFragment(fragment,maxPlanes){
 const base=frozen(maxPlanes);let out=fragment;
 for(const [before,after]of edits(base).reverse())out=once(out,after,before);
 need(out===base,'Inverse private adapter did not recover the complete R31 fragment');return out;
}
