/** Separate unaccepted trial over the frozen finite V5 All factory/data. */
import {createFluidSurfaceContactReference} from './fluid-contact-surface/index.js';
import {replaceSootTransfer,CONTROL_SOOT_TRANSFER,TRIAL_SOOT_TRANSFER} from './fluid-surface-soot-transfer.js';
export {prepareFluidSurfaceContactData,fluidSurfaceContactPayloadEvidence,auditFluidSurfaceContactRGBA} from './fluid-contact-surface/index.js';
export function createFluidSurfaceSootTransferTrial(T,options={}){
  const effect=createFluidSurfaceContactReference(T,options);
  try{
    const materials=[];
    effect.root.traverse(node=>{
      if(!node.isMesh)return;
      if(!node.material?.isShaderMaterial||Array.isArray(node.material))throw Error('Soot trial encountered an unexpected material');
      materials.push(node.material);
    });
    const expected=effect.diagnostics().geometry?.maxPrisms;
    if(!Number.isInteger(expected)||expected<1||materials.length!==expected||new Set(materials).size!==expected)throw Error('Soot trial material count/unique ownership mismatch');
    // Validate every material before touching any. These are this newly created
    // effect's own materials, before first caller use; no clone or state change.
    const fragments=materials.map(material=>replaceSootTransfer(material.fragmentShader));
    materials.forEach((material,i)=>{material.fragmentShader=fragments[i];});
    return {...effect,diagnostics(){
      const all=effect.diagnostics();
      return {...all,diagnostic:{...all.diagnostic,variant:'reaction-conditioned-soot-trial',scope:'Only colocated soot density transfer changed; no appearance, R or cost acceptance',proposalCommit:'ae93f69f9dce8bb29e68af05ec4620eea5b25fa7',controlArtistCommit:'df0fd0ddafb37fd4fa729989a6064d8a1436665a',controlManifestSha256:'1cbe16364217f7ce0d576749166be556d8e54c95c028cb27e378bcb9be225759',controlExpression:CONTROL_SOOT_TRANSFER,trialExpression:TRIAL_SOOT_TRANSFER,defaults:{lowerFlame:.05,upperFlame:.35,physicalConstants:false}}};
    }};
  }catch(error){
    try{effect.dispose();}catch(cleanupError){throw new AggregateError([error,cleanupError],'Soot trial rejected and original-effect cleanup reported an error');}
    throw error;
  }
}
