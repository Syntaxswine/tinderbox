/** One derived normalization, not a calibrated physical or image-fitted gain.
 * Frozen display-referred transport is reused; ONLY flame j changes1r ->6r.
 */
import {makeFluidShaders} from './shaders.js';
import {emissionKernelGLSL as frozenKernel,emissionAbsorptionFragment,
        emissionProbeFragment as frozenProbe,emissionVariantUniform as frozenUniform,
        homogeneousEmissionReference as frozenReference,displaySourceReference,
        configureEmissionBlend} from './emission-transfer.js';
export {configureEmissionBlend};
export const DERIVED_FLAME_EMISSIVITY=6;
const BEFORE='(r/1.)*eaDisplaySource(fire)',AFTER='(6.*r/1.)*eaDisplaySource(fire)';
function derived(source){if(typeof source!=='string'||source.split(BEFORE).length!==2)throw Error('Normalization requires exactly one frozen flame emission term');return source.replace(BEFORE,AFTER);}
export function normalizedEmissionFragment(fragment,maxPlanes){
 const expected=emissionAbsorptionFragment(makeFluidShaders(maxPlanes).fragmentShader,'smoke-only');
 if(fragment!==expected)throw Error('Normalization refuses unexpected complete upstream smoke-only fragment');
 return derived(expected);
}
// These two fixed models exist for the numeric control only, not a factory knob.
const model=kind=>{if(kind!=='derived-six'&&kind!=='preserved-one')throw Error('Unknown fixed normalization probe model');return kind;};
export function emissionKernelGLSL(kind){model(kind);const source=frozenKernel('smoke-only');return kind==='derived-six'?derived(source):source;}
export function emissionProbeFragment(kind){model(kind);const source=frozenProbe('smoke-only');return kind==='derived-six'?derived(source):source;}
export function emissionVariantUniform(kind){model(kind);return frozenUniform('smoke-only');}
// Closed-form double oracle. It is never used in the per-frame factory path.
export function homogeneousEmissionReference(input){
 const {kind,r,ks,fire,soot,length,legibility=1}=input;model(kind);
 if(kind==='preserved-one')return frozenReference({...input,kind:'smoke-only'});
 if([r,ks,length,legibility].some(v=>!Number.isFinite(v)||v<0)||legibility>1)throw Error('Invalid homogeneous normalization input');
 const f=displaySourceReference(fire),s=displaySourceReference(soot),j=f.map((v,i)=>6*r*v+ks*s[i]),k=ks,T=Math.exp(-k*length),q=k===0?length:-Math.expm1(-k*length)/k;
 return {C:j.map(v=>v*q*legibility),A:(1-T)*legibility,j,k,T,q};
}
