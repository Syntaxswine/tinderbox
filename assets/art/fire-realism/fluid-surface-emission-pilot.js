/** Two fixed unaccepted display-referred E/A variants over frozen V5 All. */
import {createFluidSurfaceContactReference} from './fluid-contact-surface/index.js';
import {emissionAbsorptionFragment,configureEmissionBlend,emissionVariantUniform} from './fluid-surface-emission-transfer.js';
export {prepareFluidSurfaceContactData,fluidSurfaceContactPayloadEvidence,auditFluidSurfaceContactRGBA} from './fluid-contact-surface/index.js';
export function createFluidSurfaceEmissionPilot(T,options={}){return createFixed(T,options,'smoke-only');}
export function createFluidSurfaceEmissionOpacityControl(T,options={}){return createFixed(T,options,'matched-opacity');}
function createFixed(T,options,kind){
  if(T?.ColorManagement?.workingColorSpace!==T.LinearSRGBColorSpace)throw Error('Pilot requires the pinned linearSRGB working primaries');
  const effect=createFluidSurfaceContactReference(T,options);
  try{
    const materials=[];effect.root.traverse(node=>{if(!node.isMesh)return;if(!node.material?.isShaderMaterial||Array.isArray(node.material))throw Error('Emission pilot encountered an unexpected material');materials.push(node.material);});
    const expected=effect.diagnostics().geometry?.maxPrisms;if(!Number.isInteger(expected)||expected<1||materials.length!==expected||new Set(materials).size!==expected)throw Error('Emission pilot material count/unique ownership mismatch');
    for(const key of ['CustomBlending','OneFactor','OneMinusSrcAlphaFactor','AddEquation'])if(!Number.isInteger(T[key]))throw Error('Explicit shared Three blend constants required');
    const fragments=materials.map(m=>emissionAbsorptionFragment(m.fragmentShader,kind));
    materials.forEach((m,i)=>{m.fragmentShader=fragments[i];m.uniforms.eaFlameExtinctionCoefficient=emissionVariantUniform(kind);configureEmissionBlend(T,m);});
    return {...effect,diagnostics(){const all=effect.diagnostics();return {...all,diagnostic:{...all.diagnostic,variant:'display-emission-'+kind,proposalCommit:'5206d34ac405836e3f9fe970b26760abc74ebf16',controlArtistCommit:'df0fd0ddafb37fd4fa729989a6064d8a1436665a',controlManifestSha256:'1cbe16364217f7ce0d576749166be556d8e54c95c028cb27e378bcb9be225759',sourceReferenceLengthMetres:1,physicalCalibration:false,output:'Display-referred associated C/A; no final gamma or second alpha multiplication; ONE/ONE_MINUS_SRC_ALPHA RGB+alpha',absorption:kind==='smoke-only'?'ks':'ks+6*r',fixedExtinctionCoefficient:kind==='smoke-only'?0:6,identicalPairedShaderCode:true,emission:'r*cFire/1m +ks*cSoot; exact sharedr180 local source OETF',limits:'Existing encoded UNORM target: clipping/rounding/order approximation; no radiometric, quality or cost acceptance',groundChar:'Preexisting stamp transition unchanged; separate coder/source-progress correction required'}};}};
  }catch(error){try{effect.dispose();}catch(cleanupError){throw new AggregateError([error,cleanupError],'Emission pilot rejected and original-effect cleanup reported an error');}throw error;}
}
