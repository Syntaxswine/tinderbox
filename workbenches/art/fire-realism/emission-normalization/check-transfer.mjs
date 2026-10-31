/** Independent source/quadrature checks, never native rendering evidence. */
import assert from 'node:assert/strict';
import {makeFluidShaders} from '../../../../assets/art/fire-realism/fluid-contact-surface/shaders.js';
import * as old from '../../../../assets/art/fire-realism/fluid-surface-emission-transfer.js';
import * as n from '../../../../assets/art/fire-realism/fluid-surface-emission-normalization-transfer.js';
assert.equal(n.DERIVED_FLAME_EMISSIVITY,6);
const before='(r/1.)*eaDisplaySource(fire)',after='(6.*r/1.)*eaDisplaySource(fire)';
for(const planes of [3,4,28,128]){const prior=old.emissionAbsorptionFragment(makeFluidShaders(planes).fragmentShader,'smoke-only'),actual=n.normalizedEmissionFragment(prior,planes);assert.equal(actual.replace(after,before),prior);assert.equal(actual.split(after).length,2);for(const bad of ['',prior+' ',prior.replace('value.y/3.','value.y/2.9'),prior+prior,prior.replace('ks+eaFlameExtinctionCoefficient*r','ks+r')])assert.throws(()=>n.normalizedEmissionFragment(bad,planes),/unexpected complete/);}
assert.equal(n.emissionKernelGLSL('derived-six').replace(after,before),old.emissionKernelGLSL('smoke-only'));assert.equal(n.emissionKernelGLSL('preserved-one'),old.emissionKernelGLSL('smoke-only'));assert.equal(n.emissionProbeFragment('derived-six').replace(after,before),old.emissionProbeFragment('smoke-only'));
for(const model of ['derived-six','preserved-one']){assert(Object.isFrozen(n.emissionVariantUniform(model)));assert.equal(n.emissionVariantUniform(model).value,0);assert(n.emissionProbeFragment(model).startsWith(n.emissionKernelGLSL(model)));}assert.throws(()=>n.emissionKernelGLSL('gain12'),/Unknown/);
const input={kind:'derived-six',r:.2,ks:.4,fire:[.04,.01,.004],soot:[.002,.003,.004],length:1,legibility:.7};
const encode=x=>x<=.0031308?12.92*x:Math.pow(x,.41666)*1.055-.055;
for(const ks of [0,1e-12,1e-6,.3,2]){
 const actual=n.homogeneousEmissionReference({...input,ks}),q=ks===0?1:-Math.expm1(-ks)/ks,j=input.fire.map((x,i)=>6*input.r*encode(x)+ks*encode(input.soot[i]));
 assert.deepEqual(actual.j,j);assert.equal(actual.k,ks);assert.equal(actual.A,(1-Math.exp(-ks))*.7);actual.C.forEach((v,i)=>assert(Math.abs(v-.7*q*j[i])<1e-12));
 const prior=n.homogeneousEmissionReference({...input,ks,kind:'preserved-one'});assert.equal(actual.A,prior.A);actual.C.forEach((v,i)=>assert(Math.abs(v-prior.C[i]-5*input.r*encode(input.fire[i])*q*.7)<1e-12));
 for(const steps of [1,2,4,16,64,128]){let C=[0,0,0],T=1;const ds=1/steps;for(let k=0;k<steps;k++){const tau=ks*ds,t=Math.exp(-tau),weight=tau<1e-3?ds*(1-tau/2+tau*tau/6-tau*tau*tau/24):(1-t)/ks;C=C.map((v,i)=>v+T*weight*j[i]);T*=t;}C.forEach((v,i)=>assert(Math.abs(v*.7-actual.C[i])<1e-12));}
 const a=n.homogeneousEmissionReference({...input,r:0,ks}),b=n.homogeneousEmissionReference({...input,r:0,ks,kind:'preserved-one'});assert.deepEqual(a,b);
}
const pure=n.homogeneousEmissionReference({...input,ks:0});assert.equal(pure.A,0);assert(pure.C.every(v=>v>0));
console.log('PASS exact complete-fragment guard; only1r->6r emission term; samek/smoke/palette/OETF/integrator/output; independent closed form, subdivision, alpha0 andF0 CPU controls. No GPU/native claim.');
