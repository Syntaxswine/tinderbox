/** Separate unaccepted trial over the frozen finite V5 All factory/data. */
import {createFluidSurfaceContactReference} from './fluid-contact-surface/index.js';
import {replaceColorLookup,CONTROL_COLOR_LOOKUP,TRIAL_COLOR_LOOKUP} from './fluid-surface-color-transfer.js';
export {prepareFluidSurfaceContactData,fluidSurfaceContactPayloadEvidence,auditFluidSurfaceContactRGBA} from './fluid-contact-surface/index.js';
export function createFluidSurfaceColorTrial(T,options={}){
  const effect=createFluidSurfaceContactReference(T,options);
  try{
    const materials=[];
    effect.root.traverse(node=>{
      if(!node.isMesh)return;
      if(!node.material?.isShaderMaterial||Array.isArray(node.material))throw Error('Color trial encountered an unexpected material');
      materials.push(node.material);
    });
    const expected=effect.diagnostics().geometry?.maxPrisms;
    if(!Number.isInteger(expected)||expected<1||materials.length!==expected||new Set(materials).size!==expected)throw Error('Color trial material count/unique ownership mismatch');
    // Validate every material before touching any. These are this newly created
    // effect's own materials, before first caller use; no clone or state change.
    const fragments=materials.map(material=>replaceColorLookup(material.fragmentShader));
    materials.forEach((material,i)=>{material.fragmentShader=fragments[i];});
    return {...effect,diagnostics(){
      const all=effect.diagnostics();
      return {...all,diagnostic:{...all.diagnostic,variant:'color-only-warm-ramp-trial',scope:'Only first warm-color lookup changed; heat/smoke/ivory/extinction unchanged; no appearance, R or cost acceptance',proposalCommit:'388d6e65b79c1d47612933fab573f7dab59a079c',controlArtistCommit:'df0fd0ddafb37fd4fa729989a6064d8a1436665a',controlManifestSha256:'1cbe16364217f7ce0d576749166be556d8e54c95c028cb27e378bcb9be225759',controlExpression:CONTROL_COLOR_LOOKUP,trialExpression:TRIAL_COLOR_LOOKUP,defaults:{exponent:4,physicalConstants:false}}};
    }};
  }catch(error){
    try{effect.dispose();}catch(cleanupError){throw new AggregateError([error,cleanupError],'Color trial rejected and original-effect cleanup reported an error');}
    throw error;
  }
}
