/** Fixed display-referred emission/absorption pilot, not calibrated radiometry.
 * Local source OETF is the exact pinned shared Three r180 sRGBTransferOETF.
 * Output C is already associated emitted/scattered RGB; it can be nonzero at A0.
 */
export const EMISSION_MODES=Object.freeze(['smoke-only','matched-opacity']);
export const REFERENCE_LENGTH_METRES=1;
const model=kind=>{if(!EMISSION_MODES.includes(kind))throw Error('Unknown fixed emission/absorption variant');return kind;};
export function emissionKernelGLSL(kind){
  model(kind);
  return `
    vec3 eaDisplaySource(vec3 c){return sRGBTransferOETF(vec4(c,1.)).rgb;}
    vec3 eaEmission(float r,float ks,vec3 fire,vec3 soot){return (r/1.)*eaDisplaySource(fire)+ks*eaDisplaySource(soot);}
    uniform float eaFlameExtinctionCoefficient;
    float eaExtinction(float ks,float r){return ks+eaFlameExtinctionCoefficient*r;}
    vec2 eaSegment(float k,float ds){
      float tau=k*ds,t=exp(-tau);
      // (1-exp(-tau))/tau =1-tau/2+tau^2/6-tau^3/24+O(tau^4).
      // The branch includes k0, retaining finite pure emission q=ds.
      float q=tau<1.e-3?ds*(1.-tau*.5+tau*tau/6.-tau*tau*tau/24.):(1.-t)/k;
      return vec2(t,q);
    }
    void eaAdvance(inout vec3 C,inout float T,vec3 j,float k,float ds){vec2 segment=eaSegment(k,ds);C+=T*segment.y*j;T*=segment.x;}
    vec4 eaAssociated(vec3 C,float T,float legibility){return vec4(legibility*C,legibility*(1.-T));}
  `;
}
const START='float alpha=0.;vec3 emission=vec3(0.);float sourceA=livePatchA();';
const SKIP='float extinction=flameSigma+smokeSigma;if(extinction<=0.)continue;';
const ADVANCE=`vec3 color=(warm*flameSigma+soot*smokeSigma)/extinction;
        float a=1.-exp(-extinction*distanceStep);emission+=(1.-alpha)*a*color;alpha+=(1.-alpha)*a;
        if(alpha>.995)break;`;
const OUTPUT=`float finalAlpha=alpha*legibility;if(finalAlpha<=0.)discard;
      gl_FragColor=vec4(emission/max(alpha,1.e-6),finalAlpha);
      #include <colorspace_fragment>
      gl_FragColor.rgb*=gl_FragColor.a;`;
const MAIN='    void main(){';
export function emissionAbsorptionFragment(fragment,kind){
  model(kind);
  for(const [name,term]of [['start',START],['skip',SKIP],['advance',ADVANCE],['output',OUTPUT],['main',MAIN],['original palette','smoothstep(.20,.82,heat)'],['original smoke','mix(1.,.18,clamp(value.z*heat,0.,1.))']])if(typeof fragment!=='string'||fragment.split(term).length!==2)throw Error('Emission pilot requires exactly one frozen '+name+' block');
  return fragment.replace(MAIN,emissionKernelGLSL(kind)+'\n'+MAIN)
    .replace(START,'float transmittance=1.;vec3 emission=vec3(0.);float sourceA=livePatchA();')
    .replace(SKIP,'// Absorption may be zero while emission is nonzero.')
    .replace(ADVANCE,'eaAdvance(emission,transmittance,eaEmission(reacting,smokeSigma,warm,soot),eaExtinction(smokeSigma,reacting),distanceStep);')
    .replace(OUTPUT,`vec4 associated=eaAssociated(emission,transmittance,legibility);
      if(associated.a==0.&&all(equal(associated.rgb,vec3(0.))))discard;
      gl_FragColor=associated;`);
}
export function emissionVariantUniform(kind){model(kind);return Object.freeze({value:kind==='smoke-only'?0:6});}
export function configureEmissionBlend(T,material){
  for(const key of ['CustomBlending','OneFactor','OneMinusSrcAlphaFactor','AddEquation'])if(!Number.isInteger(T?.[key]))throw Error('Explicit shared Three blend constants required');
  material.blending=T.CustomBlending;material.blendEquation=material.blendEquationAlpha=T.AddEquation;material.blendSrc=material.blendSrcAlpha=T.OneFactor;material.blendDst=material.blendDstAlpha=T.OneMinusSrcAlphaFactor;material.premultipliedAlpha=true;
}
export function emissionProbeFragment(kind){
  return emissionKernelGLSL(kind)+`
    uniform vec3 uFire,uSoot;uniform float uR,uKs,uLength,uLegibility;uniform int uSteps;
    void main(){
      vec3 C=vec3(0.);float T=1.;vec3 j=eaEmission(uR,uKs,uFire,uSoot);float k=eaExtinction(uKs,uR),ds=uLength/float(uSteps);
      for(int i=0;i<128;i++){if(i>=uSteps)break;eaAdvance(C,T,j,k,ds);}
      gl_FragColor=eaAssociated(C,T,uLegibility);
    }
  `;
}
// Independent homogeneous closed form for engineering probes; never per-frame.
export function displaySourceReference(c){if(!Array.isArray(c)||c.length!==3||c.some(v=>!Number.isFinite(v)||v<0))throw Error('Finite nonnegative source color required');return c.map(v=>v<=.0031308?v*12.92:Math.pow(v,.41666)*1.055-.055);}
export function homogeneousEmissionReference({kind,r,ks,fire,soot,length,legibility=1}){
  model(kind);if([r,ks,length,legibility].some(v=>!Number.isFinite(v)||v<0)||legibility>1)throw Error('Invalid homogeneous optical input');
  const f=displaySourceReference(fire),s=displaySourceReference(soot),j=f.map((v,i)=>r*v/REFERENCE_LENGTH_METRES+ks*s[i]),k=ks+(kind==='matched-opacity'?6*r:0),tau=k*length,T=Math.exp(-tau),q=k===0?length:-Math.expm1(-tau)/k;
  return {C:j.map(v=>v*q*legibility),A:(1-T)*legibility,j,k,T,q};
}
